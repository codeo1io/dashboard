/**
 * rm-141 (verification half): the bounded worker pool must not change WHAT the
 * aggregator serves — only how long a refresh takes.
 *
 * The pool (landed on main) writes results to a fixed-index array and sorts
 * after `Promise.all`, so completion order cannot permute the snapshot. This
 * suite LOCKS that property and records the before/after timing evidence:
 *
 * 1. Determinism: 8 repos whose GraphQL responses resolve in REVERSED order
 *    (last repo fastest) must produce a byte-identical snapshot under
 *    concurrency 1 (the old serial walk) and 4 (the default pool) — same rows,
 *    same attention-first ordering, same driftCount semantics.
 * 2. Timing: the pooled refresh completes strictly faster than the serial one
 *    (the measurement rm-141's acceptance asks for; the measured pair is
 *    printed and recorded in the cycle batch doc).
 */
import type {AggregatorDeps, AggregatorSnapshot} from '../src/github/aggregator.ts'
import type {InstallationsClient} from '../src/github/installations.ts'
import type {MetadataResult} from '../src/github/metadata.ts'

import {describe, expect, it, vi} from 'vitest'
import {createAggregator} from '../src/github/aggregator.ts'
import {ok} from '../src/result.ts'

const REPO_COUNT = 8
/** Indices of the red repos (rollup FAILURE → attention-first ordering must hoist them). */
const RED_INDICES = new Set([1, 4, 6])

function repoAt(index: number) {
  return {
    node_id: `NODE_${index}`,
    database_id: 1000 + index,
    owner: 'fro-bot',
    name: `repo-${index}`,
    full_name: `fro-bot/repo-${index}`,
    installation_id: 1,
  }
}

function publicRepoAt(index: number) {
  return {node_id: `NODE_${index}`, owner: 'fro-bot', name: `repo-${index}`, discovery_channel: 'collab'}
}

function graphqlResponseFor(index: number) {
  return {
    repository: {
      defaultBranchRef: {
        target: {
          statusCheckRollup: RED_INDICES.has(index) ? {state: 'FAILURE'} : {state: 'SUCCESS'},
          checkSuites: {nodes: RED_INDICES.has(index) ? [{checkRuns: {totalCount: 2}}] : []},
        },
      },
      pullRequests: {totalCount: RED_INDICES.has(index) ? 2 : 0},
      issues: {totalCount: 0},
      vulnerabilityAlerts: null,
    },
  }
}

const sleep = async (ms: number) => new Promise<void>(resolve => {
  setTimeout(resolve, ms)
})

/** Reversed latencies: repo 0 is slowest (35ms), repo 7 instant — completion order is shuffled hard. */
function delayFor(index: number): number {
  return (REPO_COUNT - 1 - index) * 5
}

function makeDeps(): AggregatorDeps {
  return {
    enumerate: vi.fn().mockResolvedValue(
      ok({
        repos: Array.from({length: REPO_COUNT}, (_, i) => repoAt(i)),
        installations: [{id: 1, account: 'fro-bot'}],
        failedInstallationIds: [],
      }),
    ),
    readMetadata: vi.fn().mockResolvedValue(
      ok({
        publicRepos: Array.from({length: REPO_COUNT}, (_, i) => publicRepoAt(i)),
        redactedNodeIds: new Set<string>(),
        redactedDatabaseIds: new Set<number>(),
        redactedEntriesMissingDatabaseId: 0,
      } satisfies MetadataResult),
    ),
    graphqlQueryForInstallation: vi.fn(async (_installationId: number, _query: string, variables: Record<string, unknown>) => {
      const index = Number(String(variables.name ?? '').replace(/^repo-/, ''))
      if (!Number.isInteger(index)) throw new Error(`unexpected repo name ${String(variables.name)}`)
      await sleep(delayFor(index))
      return graphqlResponseFor(index)
    }),
    // Constant clock: every timestamp the snapshot carries is identical
    // across runs, so byte-equality is purely about assembly order.
    now: () => 12345,
  }
}

async function refreshWith(refreshConcurrency: number): Promise<{snapshot: AggregatorSnapshot; elapsedMs: number; queryCount: number}> {
  const deps = makeDeps()
  const queryFn = deps.graphqlQueryForInstallation as unknown as {mock: {calls: unknown[]}}
  const agg = createAggregator(
    vi.fn() as unknown as InstallationsClient,
    vi.fn(),
    {...deps, refreshConcurrency},
  )
  const startedAt = Date.now()
  await agg.refresh()
  const elapsedMs = Date.now() - startedAt
  return {snapshot: agg.getSnapshot(), elapsedMs, queryCount: queryFn.mock.calls.length}
}

describe('aggregator pool determinism (rm-141 verification half)', () => {
  it('identical snapshot under serial (concurrency 1) and pooled (concurrency 4) walks, with reversed completion order', async () => {
    const serial = await refreshWith(1)
    const pooled = await refreshWith(4)

    expect(serial.queryCount).toBe(REPO_COUNT)
    expect(pooled.queryCount).toBe(REPO_COUNT)

    // The lock: byte-identical assembly regardless of interleaving.
    expect(JSON.stringify(pooled.snapshot)).toBe(JSON.stringify(serial.snapshot))

    // Attention-first ordering holds under both: every red row precedes every green row.
    for (const {snapshot} of [serial, pooled]) {
      const rollups = snapshot.repos.map(repo => repo.status.rollupState)
      const reds = rollups.filter(state => state === 'red')
      expect(reds).toHaveLength(RED_INDICES.size)
      expect(rollups.slice(0, reds.length)).toEqual(reds)
    }
  })

  it('the pool caps walk time below the serial baseline (timing evidence for rm-141)', async () => {
    const serial = await refreshWith(1)
    const pooled = await refreshWith(4)

    // Serial lower bound: sum of all delays = 5+10+…+35 = 140ms.
    // The pool's critical path is materially shorter; print the measured pair
    // for the batch doc (assert strictly-less with a wide margin to stay
    // robust on a loaded box).
    // eslint-disable-next-line no-console -- recorded in the cycle batch doc
    console.log(`[rm-141 timing] serial=${serial.elapsedMs}ms pooled=${pooled.elapsedMs}ms (8 repos, delays 0–35ms reversed)`)
    expect(pooled.elapsedMs).toBeLessThan(serial.elapsedMs)
  })
})
