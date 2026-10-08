// rm-141 verification half — snapshot-level determinism of the pooled fleet
// refresh (the acceptance clause left open after the pool landed: "the
// determinism check (result assembly must not depend on pool completion
// order — the driftCount lock test and attention-first ordering must hold)"
// plus the before/after refresh-timing measurement, which lives in
// scripts/aggregator-refresh-timing.ts).
//
// What this suite pins that test/aggregator.test.ts's rm-141 pool block does
// not: the SERVED SNAPSHOT must be deep-identical across pool widths and
// across adversarial completion orders, not merely carry per-repo payloads at
// the right rows. Every run drives the real createAggregator cycle — only the
// transport is mocked — with per-repo latencies deliberately INVERTED against
// working-set order (and rotated per round), so a pooled cycle genuinely
// completes repos in a different order than the serial walk. The non-vacuity
// test proves those delays permute a completion-order-coupled assembly, so
// the deep-equality assertions here cannot pass vacuously.
//
// Fixture mirrors buildWorkingSet's real union semantics: publicRepos come
// FIRST (authoritative channel labels); installation-only repos are appended
// AFTER the union and are what driftCount counts; metadata-only repos (in
// publicRepos, absent from the installation channel) carry installation_id
// null and go through the resolver (resolved → queried, rejected → absence
// entry).
import type {AggregatorDeps, AggregatorSnapshot, DashboardRepo, GraphqlQueryForInstallationFn} from '../src/github/aggregator.ts'

import {describe, expect, it, vi} from 'vitest'
import {createAggregator, sortAttentionFirst} from '../src/github/aggregator.ts'
import {ok} from '../src/result.ts'

// Frozen clock: every timing-derived field (fetchedAt, refreshedAt,
// refreshDurationMs, refreshDegraded) collapses to a constant, so snapshots
// from different pool widths are comparable with a single deep toEqual — any
// divergence is structural, not clock noise.
const FROZEN_NOW = 42_000
const frozenNow = (): number => FROZEN_NOW

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

// Pool query order == working-set order: publicRepos entries first (metadata
// channel, matched to install auth or resolved), then installation-only
// (drift) repos in enumeration order. The resolver-rejected repo never enters
// the pool — it becomes an absence entry.
const WORKING_ORDER = [
  'att-red-1', // publicRepos + install match; FAILURE rollup → attention
  'healthy-3', // publicRepos + install match; all zero → healthy
  'issues-only-6', // publicRepos + install match; 3 open issues → NOT attention (classifier boundary)
  'meta-only-7', // metadata-only, resolver succeeds, 1 open alert → attention
  'att-pr-2', // installation-only (drift 1); green but 2 open PRs → attention
  'att-null-4', // installation-only (drift 2); repository:null → fail-visible stale → attention
  'healthy-5', // installation-only (drift 3); all zero → healthy
] as const
const ABSENT_REPO = 'meta-absent-8' // metadata-only, resolver REJECTS → absence entry (stale → attention)
const DRIFT_COUNT = 3

// Served order: pool rows in working-set order, absence rows appended, then a
// STABLE attention-first sort (rm-144) — attention block keeps insertion
// order, healthy block keeps insertion order.
const EXPECTED_SERVED_ORDER = [
  'att-red-1',
  'meta-only-7',
  'att-pr-2',
  'att-null-4',
  'meta-absent-8',
  'healthy-3',
  'issues-only-6',
  'healthy-5',
]

/**
 * Adversarial seeded latency for working-set index i under rotation `round`:
 * the highest index (rotated) is fastest, so any pool width ≥ 2 completes in
 * a different order than the serial walk. Distinct multiples keep the
 * completion order sharp despite setTimeout jitter.
 */
const delayMs = (index: number, round: number): number => 6 * (WORKING_ORDER.length - 1 - ((index + round) % WORKING_ORDER.length)) + 3

interface GraphqlRepoResponse {
  repository: {
    defaultBranchRef: {
      target: {
        statusCheckRollup: {state: string} | null
        checkSuites: {nodes: {checkRuns: {totalCount: number}}[]}
      }
    }
    pullRequests: {totalCount: number}
    issues: {totalCount: number}
    vulnerabilityAlerts: {totalCount: number} | null
  } | null
}

function makeResponse(overrides: {
  rollupState?: string
  failingChecks?: number
  openPrCount?: number
  openIssueCount?: number
  openAlertCount?: number | null
  repositoryNull?: boolean
} = {}): GraphqlRepoResponse {
  if (overrides.repositoryNull) return {repository: null}
  return {
    repository: {
      defaultBranchRef: {
        target: {
          statusCheckRollup: {state: overrides.rollupState ?? 'SUCCESS'},
          checkSuites: {nodes: (overrides.failingChecks ?? 0) > 0 ? [{checkRuns: {totalCount: overrides.failingChecks ?? 0}}] : []},
        },
      },
      pullRequests: {totalCount: overrides.openPrCount ?? 0},
      issues: {totalCount: overrides.openIssueCount ?? 0},
      vulnerabilityAlerts: overrides.openAlertCount != null ? {totalCount: overrides.openAlertCount} : null,
    },
  }
}

const RESPONSES: Record<string, () => GraphqlRepoResponse> = {
  'att-red-1': () => makeResponse({rollupState: 'FAILURE', failingChecks: 2}),
  'healthy-3': () => makeResponse(),
  'issues-only-6': () => makeResponse({openIssueCount: 3}),
  'meta-only-7': () => makeResponse({openAlertCount: 1}),
  'att-pr-2': () => makeResponse({openPrCount: 2}),
  'att-null-4': () => makeResponse({repositoryNull: true}),
  'healthy-5': () => makeResponse(),
}

// Installation channel: the three publicRepos matches PLUS the three
// installation-only drift repos. database_id distinct per repo.
const installRepos = [
  {node_id: 'NODE_ATT_RED_1', database_id: 1001, owner: 'fro-bot', name: 'att-red-1', full_name: 'fro-bot/att-red-1', installation_id: 1},
  {node_id: 'NODE_HEALTHY_3', database_id: 1003, owner: 'fro-bot', name: 'healthy-3', full_name: 'fro-bot/healthy-3', installation_id: 1},
  {node_id: 'NODE_ISSUES_ONLY_6', database_id: 1006, owner: 'fro-bot', name: 'issues-only-6', full_name: 'fro-bot/issues-only-6', installation_id: 1},
  {node_id: 'NODE_ATT_PR_2', database_id: 1002, owner: 'fro-bot', name: 'att-pr-2', full_name: 'fro-bot/att-pr-2', installation_id: 1},
  {node_id: 'NODE_ATT_NULL_4', database_id: 1004, owner: 'fro-bot', name: 'att-null-4', full_name: 'fro-bot/att-null-4', installation_id: 1},
  {node_id: 'NODE_HEALTHY_5', database_id: 1005, owner: 'fro-bot', name: 'healthy-5', full_name: 'fro-bot/healthy-5', installation_id: 1},
]

// metadata/repos.yaml public list — authoritative channel labels; order here
// IS the head of the working-set order. Two metadata-only repos: one
// resolvable, one not.
const metadataPublicRepos = [
  {node_id: 'NODE_ATT_RED_1', owner: 'fro-bot', name: 'att-red-1', discovery_channel: 'metadata'},
  {node_id: 'NODE_HEALTHY_3', owner: 'fro-bot', name: 'healthy-3', discovery_channel: 'metadata'},
  {node_id: 'NODE_ISSUES_ONLY_6', owner: 'fro-bot', name: 'issues-only-6', discovery_channel: 'metadata'},
  {node_id: 'NODE_META_ONLY_7', owner: 'fro-bot', name: 'meta-only-7', discovery_channel: 'metadata'},
  {node_id: 'NODE_META_ABSENT_8', owner: 'fro-bot', name: 'meta-absent-8', discovery_channel: 'metadata'},
]

/** Fake installations client (enumerate/readMetadata are injected directly). */
const fakeInstallationsClient = {
  listInstallations: vi.fn(),
  mintInstallationToken: vi.fn(),
  listInstallationRepos: vi.fn(),
}

/** Fake metadata reader. */
const fakeMetadataReader = vi.fn()

interface CapturedCycle {
  snapshot: AggregatorSnapshot
  completionOrder: string[]
}

/**
 * Drive one full real refresh cycle at the given pool width under rotation
 * `round`, returning a detached copy of the served snapshot plus the actual
 * transport completion order.
 */
async function captureCycle(refreshConcurrency: number, round: number): Promise<CapturedCycle> {
  const completionOrder: string[] = []
  const graphqlQueryForInstallation: GraphqlQueryForInstallationFn = vi.fn().mockImplementation(
    async (_installationId: number, _query: string, variables: Record<string, unknown>) => {
      const name = String(variables.name)
      const index = WORKING_ORDER.indexOf(name as (typeof WORKING_ORDER)[number])
      await sleep(delayMs(index < 0 ? 0 : index, round))
      completionOrder.push(name)
      const build = RESPONSES[name]
      return build === undefined ? makeResponse() : build()
    },
  )
  const resolveInstallationIdForRepo = vi.fn().mockImplementation(async (_owner: string, name: string) => {
    if (name === ABSENT_REPO) throw new Error('no installation for metadata-only repo (deliberate fixture)')
    await sleep(4)
    return 77
  })
  const deps: AggregatorDeps = {
    enumerate: vi.fn().mockResolvedValue(
      ok({repos: installRepos, installations: [{id: 1, account: 'fro-bot'}], failedInstallationIds: []}),
    ),
    readMetadata: vi.fn().mockResolvedValue(
      ok({
        publicRepos: metadataPublicRepos,
        redactedNodeIds: new Set<string>(),
        redactedDatabaseIds: new Set<number>(),
        redactedEntriesMissingDatabaseId: 0,
      }),
    ),
    graphqlQueryForInstallation,
    resolveInstallationIdForRepo,
    now: frozenNow,
    refreshConcurrency,
  }
  const agg = createAggregator(fakeInstallationsClient, fakeMetadataReader, deps)
  await agg.start()
  const snapshot = structuredClone(agg.getSnapshot())
  agg.stop()
  return {snapshot, completionOrder}
}

describe('rm-141 — pooled refresh serves an order-independent snapshot', () => {
  it('is deep-identical to the serial walk at every pool width (adversarial delays)', async () => {
    const serial = await captureCycle(1, 0)
    const pooled = await captureCycle(4, 0)
    const unbounded = await captureCycle(WORKING_ORDER.length, 0)

    // The frozen clock makes even the watchdog fields comparable — a full
    // deep equality with zero field exclusions.
    expect(serial.snapshot.refreshDurationMs).toBe(0)
    expect(pooled.snapshot).toEqual(serial.snapshot)
    expect(unbounded.snapshot).toEqual(serial.snapshot)

    // Non-vacuity for the delay design itself: the serial walk completes in
    // working-set order, the pool does not. If this ever fails, the fixtures
    // have stopped being adversarial and the equality above is vacuous.
    expect(serial.completionOrder).toEqual([...WORKING_ORDER])
    expect(pooled.completionOrder).not.toEqual([...WORKING_ORDER])
  })

  it('holds the driftCount lock (rm-126) across rotated completion orders', async () => {
    // driftCount counts installation-only repos (the three drift fixtures),
    // computed in buildWorkingSet BEFORE the pool exists — pool interleaving
    // must never touch it.
    const serial = await captureCycle(1, 0)
    expect(serial.snapshot.driftCount).toBe(DRIFT_COUNT)
    for (const round of [0, 1, 2, 3, 4]) {
      const pooled = await captureCycle(4, round)
      expect(pooled.snapshot.driftCount).toBe(DRIFT_COUNT)
      expect(pooled.snapshot.staleBanner).toBe(false)
      expect(pooled.snapshot.enumerationIncomplete).toBe(0)
      // Every rotation serves the identical snapshot, not just the same count.
      expect(pooled.snapshot).toEqual(serial.snapshot)
    }
  })

  it('sorts attention-first (rm-144) with a stable within-class order that survives every rotation', async () => {
    const serial = await captureCycle(1, 0)
    expect(serial.snapshot.repos.map(repo => repo.name)).toEqual(EXPECTED_SERVED_ORDER)

    // issues-only-6 pins the classifier boundary: open issues alone do NOT
    // buy a repo the attention block.
    const issuesRow = serial.snapshot.repos.find(repo => repo.name === 'issues-only-6')
    expect(issuesRow?.status.stale).toBe(false)

    // Fail-visible rows (repository:null, resolver failure) sit inside the
    // attention block at stable positions.
    const nullRow = serial.snapshot.repos.find(repo => repo.name === 'att-null-4')
    expect(nullRow?.status.stale).toBe(true)
    expect(nullRow?.status.rollupState).toBe('unknown')
    const absentRow = serial.snapshot.repos.find(repo => repo.name === ABSENT_REPO)
    expect(absentRow?.status.stale).toBe(true)
    expect(absentRow?.status.rollupState).toBe('unknown')
    expect(EXPECTED_SERVED_ORDER.indexOf(ABSENT_REPO)).toBeLessThan(EXPECTED_SERVED_ORDER.indexOf('healthy-3'))

    for (const round of [0, 1, 2, 3, 4]) {
      const pooled = await captureCycle(4, round)
      expect(pooled.snapshot.repos.map(repo => repo.name)).toEqual(EXPECTED_SERVED_ORDER)
    }
  })

  it('is non-vacuous: an assembly coupled to COMPLETION order would permute the served rows', async () => {
    // Red-first proof for this suite. Mirror the pre-rm-141 anti-pattern —
    // assemble rows in transport completion order, then apply the REAL
    // attention-first sort (which is stable, so within-class order is
    // whatever the assembly gave it). Under the same adversarial delays the
    // real pool just survived, this shim serves a DIFFERENT row order: had
    // the production assembly been completion-coupled, the deep-equality
    // assertions above would have failed. The suite cannot pass vacuously.
    const {snapshot, completionOrder} = await captureCycle(4, 0)
    expect(completionOrder).not.toEqual([...WORKING_ORDER])

    const byName = new Map(snapshot.repos.map(repo => [repo.name, repo]))
    const shimRows: DashboardRepo[] = []
    for (const name of completionOrder) {
      const row = byName.get(name)
      if (row !== undefined) shimRows.push(row)
    }
    // The resolver-failure repo is never fetched — the anti-pattern appends
    // its absence row wherever the cycle collected it (last, here).
    const absentRow = byName.get(ABSENT_REPO)
    if (absentRow !== undefined) shimRows.push(absentRow)

    const shimOrder = sortAttentionFirst([...shimRows]).map(repo => repo.name)
    expect(shimOrder).not.toEqual(snapshot.repos.map(repo => repo.name))
  })
})
