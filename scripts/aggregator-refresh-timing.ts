// rm-141 acceptance half: the before/after refresh-timing measurement.
// The bounded-concurrency pool is already landed (AGGREGATOR_REFRESH_CONCURRENCY
// = 4); this script measures what it bought versus the serial walk it replaced
// on a deterministic synthetic fleet — same aggregator, same transport mock,
// only the pool width differs.
//
// Run (Node 24 native TS, no flags beyond type stripping, no install beyond
// the repo's own devDependencies):
//   node --experimental-strip-types scripts/aggregator-refresh-timing.ts
//
// The fleet is mocked at the graphqlQueryForInstallation seam with a fixed
// per-repo latency, so the numbers isolate pool scheduling from network
// variance. Results are recorded in the cycle batch doc
// (docs/prioritization/2026-10-08-repository-maintenance-cycle-1-run-b28b41da.md),
// not asserted anywhere — this is a measurement tool, not a gate: it always
// exits 0.
import type {AggregatorDeps, GraphqlQueryForInstallationFn} from '../src/github/aggregator.ts'
import type {InstallationsClient} from '../src/github/installations.ts'
import type {MetadataReader} from '../src/github/metadata.ts'

import {createAggregator} from '../src/github/aggregator.ts'
import {ok} from '../src/result.ts'

const FLEET_SIZE = 48
const PER_REPO_LATENCY_MS = 25
const ITERATIONS = 7
const POOL_WIDTHS = [1, 4] // 1 = the pre-pool serial walk, 4 = the landed default

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const upper = sorted[mid] ?? 0
  return sorted.length % 2 === 1 ? upper : (upper + (sorted[mid - 1] ?? upper)) / 2
}

const fleetRepos = Array.from({length: FLEET_SIZE}, (_, index) => ({
  node_id: `NODE_TIMING_${index}`,
  database_id: 2000 + index,
  owner: 'fro-bot',
  name: `timing-repo-${index}`,
  full_name: `fro-bot/timing-repo-${index}`,
  installation_id: 1,
}))

/** Never called — enumerate/readMetadata are injected directly; the timing
 * harness only needs structurally valid placeholders for the real seams. */
const unusedInstallationsClient: InstallationsClient = {
  listInstallations: async () => [],
  mintInstallationToken: async () => ({token: 'unused', expiresAt: null}),
  listInstallationRepos: async () => [],
}
const unusedMetadataReader: MetadataReader = async () => {
  throw new Error('metadata reader unused in the timing harness')
}

async function measureRefreshDurationMs(refreshConcurrency: number): Promise<number | null> {
  const graphqlQueryForInstallation: GraphqlQueryForInstallationFn = async () => {
    await sleep(PER_REPO_LATENCY_MS)
    return {repository: null}
  }
  const deps: AggregatorDeps = {
    enumerate: async () =>
      ok({repos: fleetRepos, installations: [{id: 1, account: 'fro-bot'}], failedInstallationIds: []}),
    readMetadata: async () =>
      ok({publicRepos: [], redactedNodeIds: new Set<string>(), redactedDatabaseIds: new Set<number>(), redactedEntriesMissingDatabaseId: 0}),
    graphqlQueryForInstallation,
    now: () => Date.now(),
    refreshConcurrency,
  }
  const agg = createAggregator(unusedInstallationsClient, unusedMetadataReader, deps)
  await agg.start()
  const duration = agg.getSnapshot().refreshDurationMs
  agg.stop()
  return duration
}

const results = new Map<number, {median: number; min: number; max: number; samples: number[]}>()
for (const width of POOL_WIDTHS) {
  const samples: number[] = []
  for (let iteration = 0; iteration < ITERATIONS; iteration++) {
    const duration = await measureRefreshDurationMs(width)
    if (duration !== null) samples.push(duration)
  }
  if (samples.length === 0) {
    console.error(`concurrency=${width}: no completed samples`)
    continue
  }
  results.set(width, {median: median(samples), min: Math.min(...samples), max: Math.max(...samples), samples})
}

console.log(`aggregator refresh timing — mocked transport (fleet=${FLEET_SIZE}, per-repo latency=${PER_REPO_LATENCY_MS}ms, iterations=${ITERATIONS})`)
for (const width of POOL_WIDTHS) {
  const r = results.get(width)
  if (r === undefined) continue
  const label = width === 1 ? 'pre-pool serial walk' : 'rm-141 landed default'
  console.log(`  refreshConcurrency=${width} (${label}): median=${r.median.toFixed(0)}ms  min=${r.min.toFixed(0)}ms  max=${r.max.toFixed(0)}ms`)
}
const serial = results.get(1)
const pooled = results.get(4)
if (serial !== undefined && pooled !== undefined && pooled.median > 0) {
  console.log(`  speedup (serial median / pooled median): ${(serial.median / pooled.median).toFixed(2)}x`)
}
console.log(`  ideal lower bound: serial ~=${FLEET_SIZE * PER_REPO_LATENCY_MS}ms, pooled(4) ~=${Math.ceil(FLEET_SIZE / 4) * PER_REPO_LATENCY_MS}ms`)
