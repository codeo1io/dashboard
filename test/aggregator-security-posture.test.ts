/**
 * Test suite for the rm-117 security-posture surfaces in
 * src/github/aggregator.ts: the OPEN-alert drill-down (SecurityAlertDetail)
 * and the TTL-gated, cursor-carrying recent-cures walk over the FIXED
 * connection.
 *
 * All tests inject fakes — no network calls, no real timers. The GraphQL
 * fake routes by QUERY TEXT (the walk template vs. the status template) so
 * each surface can be driven independently, exactly like production sees
 * them.
 */

import type {AggregatorDeps, GraphqlQueryForInstallationFn} from '../src/github/aggregator.ts'
import type {EnumerateReposResult} from '../src/github/installations.ts'
import type {MetadataResult} from '../src/github/metadata.ts'
import type {Result} from '../src/result.ts'

import {describe, expect, it, vi} from 'vitest'
import {createAggregator} from '../src/github/aggregator.ts'
import {REPO_RECENT_CURES_QUERY} from '../src/github/query-registry.ts'
import {ok} from '../src/result.ts'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fakeInstallationsClient = {
  listInstallations: vi.fn(),
  mintInstallationToken: vi.fn(),
  listInstallationRepos: vi.fn(),
}

function makeRepo() {
  return {
    node_id: 'NODE_SEC',
    database_id: 4242,
    owner: 'fro-bot',
    name: 'agent',
    full_name: 'fro-bot/agent',
    installation_id: 1,
  }
}

function makeMetadataResult(): MetadataResult {
  return {
    publicRepos: [{node_id: 'NODE_SEC', owner: 'fro-bot', name: 'agent', discovery_channel: 'collab'}],
    redactedNodeIds: new Set<string>(),
    redactedDatabaseIds: new Set<number>(),
    redactedEntriesMissingDatabaseId: 0,
  }
}

function makeEnumerateResult(): Result<EnumerateReposResult, {message: string}> {
  return ok({repos: [makeRepo()], installations: [{id: 1, account: 'fro-bot'}], failedInstallationIds: []})
}

/** One wire-shaped vulnerabilityAlert node. */
function makeAlertNode(overrides: {
  ghsaId?: string
  fixedAt?: string | null
  severity?: string
  manifestPath?: string | null
  epssPercentage?: number | string
  cvssV3Score?: number
  cwe?: string
  updatePrUrl?: string | null
}) {
  return {
    state: 'FIXED',
    createdAt: '2026-09-01T00:00:00Z',
    fixedAt: overrides.fixedAt ?? '2026-10-01T00:00:00Z',
    dismissedAt: null,
    autoDismissedAt: null,
    dismissReason: null,
    dependencyScope: 'RUNTIME',
    vulnerableManifestPath: overrides.manifestPath ?? 'package.json',
    securityVulnerability: {
      firstPatchedVersion: {identifier: '1.2.3'},
      vulnerableVersionRange: '< 1.2.3',
    },
    dependabotUpdate:
      overrides.updatePrUrl === null
        ? null
        : {
            pullRequest: {state: 'MERGED', url: overrides.updatePrUrl ?? 'https://github.com/fro-bot/agent/pull/7'},
          },
    securityAdvisory: {
      ghsaId: overrides.ghsaId ?? 'GHSA-test-test-test',
      cveId: 'CVE-2026-0001',
      severity: overrides.severity ?? 'MODERATE',
      classification: 'GENERAL',
      withdrawnAt: null,
      cvssSeverities: {
        cvssV3: {score: overrides.cvssV3Score ?? 5.9, vectorString: 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N'},
        cvssV4: null,
      },
      epss: {percentage: overrides.epssPercentage ?? 0.005, percentile: 0.42},
      cwes: {nodes: [{cweId: overrides.cwe ?? 'CWE-22'}]},
      identifiers: [
        {type: 'GHSA', value: overrides.ghsaId ?? 'GHSA-test-test-test'},
        {type: 'CVE', value: 'CVE-2026-0001'},
      ],
    },
  }
}

/** Status-shaped response (what the per-refresh fetch returns). */
function makeStatusResponse(overrides: {openAlertNodes?: unknown[]; openAlertCount?: number | null} = {}) {
  return {
    repository: {
      defaultBranchRef: {
        target: {
          statusCheckRollup: {state: 'SUCCESS'},
          checkSuites: {nodes: []},
        },
      },
      pullRequests: {totalCount: 0},
      issues: {totalCount: 0},
      vulnerabilityAlerts:
        overrides.openAlertCount === null
          ? null
          : {totalCount: overrides.openAlertCount ?? 0, nodes: overrides.openAlertNodes ?? []},
    },
  }
}

/** Cures-walk-shaped response page. */
function makeCuresPage(overrides: {totalCount?: number; hasNextPage?: boolean; endCursor?: string | null; nodes?: unknown[]; missing?: boolean} = {}) {
  if (overrides.missing === true) return {repository: null}
  return {
    repository: {
      vulnerabilityAlerts: {
        totalCount: overrides.totalCount ?? 0,
        pageInfo: {hasNextPage: overrides.hasNextPage ?? false, endCursor: overrides.endCursor ?? null},
        nodes: overrides.nodes ?? [],
      },
    },
  }
}

/**
 * GraphQL fake that routes by template text: the walk template gets pages
 * from a queue; anything else is the status response.
 */
function makeRoutingGraphqlFake(curesPages: unknown[] = [], statusResponse: unknown = makeStatusResponse()): {
  fn: GraphqlQueryForInstallationFn
  statusCalls: () => number
  curesCalls: () => {query: string; vars: Record<string, unknown>}[]
} {
  let statusCount = 0
  const curesLog: {query: string; vars: Record<string, unknown>}[] = []
  let page = 0
  const fn = vi.fn(async (_installationId: number, query: string, vars: Record<string, unknown>) => {
    if (query === REPO_RECENT_CURES_QUERY) {
      curesLog.push({query, vars})
      const response = curesPages[Math.min(page, curesPages.length - 1)]
      page += 1
      return response
    }
    statusCount += 1
    return statusResponse
  }) as unknown as GraphqlQueryForInstallationFn
  return {fn, statusCalls: () => statusCount, curesCalls: () => curesLog}
}

function makeDeps(graphql: GraphqlQueryForInstallationFn, overrides: Partial<AggregatorDeps> = {}): AggregatorDeps {
  let t = 1_000_000
  return {
    enumerate: vi.fn().mockResolvedValue(makeEnumerateResult()),
    readMetadata: vi.fn().mockResolvedValue(ok(makeMetadataResult())),
    graphqlQueryForInstallation: graphql,
    now: () => {
      t += 1
      return t
    },
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// OPEN drill-down (rides the per-refresh status fetch)
// ---------------------------------------------------------------------------

describe('aggregator — security posture: OPEN drill-down (rm-117)', () => {
  it('parses alert nodes into the display-safe SecurityAlertDetail projection', async () => {
    const graphql = makeRoutingGraphqlFake([], makeStatusResponse({
      openAlertCount: 2,
      openAlertNodes: [makeAlertNode({ghsaId: 'GHSA-open-1', fixedAt: null, severity: 'HIGH', epssPercentage: 0.61, cvssV3Score: 8.1, cwe: 'CWE-79'})],
    }))
    const agg = createAggregator(fakeInstallationsClient, unusedMetadataReader(), makeDeps(graphql.fn))
    await agg.refresh()
    const posture = agg.getSnapshot().repos[0]?.status.securityPosture
    expect(posture).not.toBeNull()
    const alert = posture?.openAlerts[0]
    expect(alert, 'one parsed node').toBeDefined()
    expect(alert?.severity).toBe('HIGH')
    expect(alert?.ghsaId).toBe('GHSA-open-1')
    expect(alert?.cvssV3Score).toBe(8.1)
    expect(alert?.cvssV3Vector).toBe('CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N')
    expect(alert?.epssPercentage).toBe(0.61)
    expect(alert?.epssPercentile).toBe(0.42)
    expect(alert?.cwes).toEqual(['CWE-79'])
    expect(alert?.identifiers).toEqual([
      {type: 'GHSA', value: 'GHSA-open-1'},
      {type: 'CVE', value: 'CVE-2026-0001'},
    ])
    expect(alert?.manifestPath).toBe('package.json')
    expect(alert?.firstPatchedVersion).toBe('1.2.3')
    expect(alert?.vulnerableVersionRange).toBe('< 1.2.3')
    expect(alert?.updatePrState).toBe('MERGED')
    expect(alert?.updatePrUrl).toBe('https://github.com/fro-bot/agent/pull/7')
    expect(alert?.dependencyScope).toBe('RUNTIME')
  })

  it('tolerates EPSS arriving as a numeric STRING (String-typed schema serializing a number)', async () => {
    const graphql = makeRoutingGraphqlFake([], makeStatusResponse({
      openAlertCount: 1,
      openAlertNodes: [makeAlertNode({epssPercentage: '0.00527'})],
    }))
    const agg = createAggregator(fakeInstallationsClient, unusedMetadataReader(), makeDeps(graphql.fn))
    await agg.refresh()
    expect(agg.getSnapshot().repos[0]?.status.securityPosture?.openAlerts[0]?.epssPercentage).toBe(0.00527)
  })

  it('permission degradation (NO_ALERTS path) yields posture null — never half-populated', async () => {
    const graphql = makeRoutingGraphqlFake([], makeStatusResponse({openAlertCount: null}))
    const agg = createAggregator(fakeInstallationsClient, unusedMetadataReader(), makeDeps(graphql.fn))
    await agg.refresh()
    const status = agg.getSnapshot().repos[0]?.status
    expect(status?.openAlertCount).toBeNull()
    expect(status?.securityPosture).toBeNull()
    // and the cures walk must NOT have been invoked for it
    expect(graphql.curesCalls()).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Recent-cures walk (TTL-gated, cursor-carrying)
// ---------------------------------------------------------------------------

describe('aggregator — security posture: recent-cures walk (rm-117)', () => {
  it('cold start pages to the tail and merges fixedAt-desc into the bounded sample', async () => {
    const graphql = makeRoutingGraphqlFake([
      makeCuresPage({totalCount: 15, hasNextPage: true, endCursor: 'CURSOR-1', nodes: [
        makeAlertNode({ghsaId: 'GHSA-old-1', fixedAt: '2026-08-01T00:00:00Z'}),
        makeAlertNode({ghsaId: 'GHSA-old-2', fixedAt: '2026-08-02T00:00:00Z'}),
      ]}),
      makeCuresPage({totalCount: 15, hasNextPage: true, endCursor: 'CURSOR-2', nodes: [
        makeAlertNode({ghsaId: 'GHSA-new-1', fixedAt: '2026-10-02T21:06:00Z'}),
      ]}),
      makeCuresPage({totalCount: 15, hasNextPage: false, endCursor: 'CURSOR-3', nodes: []}),
    ])
    const agg = createAggregator(fakeInstallationsClient, unusedMetadataReader(), makeDeps(graphql.fn, {curesRefreshMs: 0}))
    await agg.refresh()
    const posture = agg.getSnapshot().repos[0]?.status.securityPosture
    expect(posture).not.toBeNull()
    expect(posture?.recentCureCount).toBe(15)
    expect(posture?.recentCures.map(a => a.ghsaId)).toEqual(['GHSA-new-1', 'GHSA-old-2', 'GHSA-old-1'])
    expect(posture?.curesFetchedAt).not.toBeNull()
    expect(graphql.curesCalls().length).toBe(3)
    // cursor chaining: page 2 must carry page 1's endCursor
    expect(graphql.curesCalls()[1]?.vars.curesAfter).toBe('CURSOR-1')
  })

  it('TTL-gates the walk: a second refresh inside the window makes zero cures calls', async () => {
    const graphql = makeRoutingGraphqlFake([
      makeCuresPage({totalCount: 3, hasNextPage: false, endCursor: 'CURSOR-TAIL', nodes: [makeAlertNode({ghsaId: 'GHSA-a'})]}),
    ])
    // now() advances ~10 units per refresh: gate OPEN on refresh 1 (t ≥ 1_000),
    // gate CLOSED on refresh 2 (delta ~10 < 1_000).
    const agg = createAggregator(fakeInstallationsClient, unusedMetadataReader(), makeDeps(graphql.fn, {curesRefreshMs: 1_000}))
    await agg.refresh()
    expect(graphql.curesCalls().length).toBe(1)
    await agg.refresh()
    // inside the TTL window: no second walk; sample + timestamps preserved
    expect(graphql.curesCalls().length).toBe(1)
    const posture = agg.getSnapshot().repos[0]?.status.securityPosture
    expect(posture?.recentCures.map(a => a.ghsaId)).toEqual(['GHSA-a'])
    expect(posture?.curesFetchedAt).not.toBeNull()
  })

  it('caps the walk at SECURITY_CURES_MAX_PAGES per window and resumes from the carried cursor next window', async () => {
    const pages = Array.from({length: 8}, (_unused, i) =>
      makeCuresPage({totalCount: 40, hasNextPage: true, endCursor: `CURSOR-${i + 1}`, nodes: [makeAlertNode({ghsaId: `GHSA-p${i + 1}`, fixedAt: `2026-09-${String(i + 1).padStart(2, '0')}T00:00:00Z`})]}),
    )
    const graphql = makeRoutingGraphqlFake(pages)
    let t = 1_000_000
    const agg = createAggregator(fakeInstallationsClient, unusedMetadataReader(), makeDeps(graphql.fn, {
      curesRefreshMs: 0,
      now: () => {
        t += 1
        return t
      },
    }))
    await agg.refresh()
    expect(graphql.curesCalls().length, 'page budget: 5 calls in one window').toBe(5)
    expect(graphql.curesCalls()[4]?.vars.curesAfter).toBe('CURSOR-4')
    await agg.refresh()
    expect(graphql.curesCalls().length, 'next window resumes').toBe(10)
    expect(graphql.curesCalls()[5]?.vars.curesAfter, 'resumes from the carried cursor').toBe('CURSOR-5')
    const posture = agg.getSnapshot().repos[0]?.status.securityPosture
    expect(posture?.recentCures.length).toBeLessThanOrEqual(10)
  })

  it('a failed walk keeps the previous sample AND its original curesFetchedAt (staleness stays visible)', async () => {
    let failCures = false
    let t = 1_000_000
    const fn = vi.fn(async (_installationId: number, query: string) => {
      if (query === REPO_RECENT_CURES_QUERY) {
        if (failCures) throw new Error('walk transport failed')
        return makeCuresPage({totalCount: 4, hasNextPage: false, endCursor: 'CURSOR-T', nodes: [makeAlertNode({ghsaId: 'GHSA-kept'})]})
      }
      return makeStatusResponse()
    }) as unknown as GraphqlQueryForInstallationFn
    const deps = makeDeps(fn, {
      curesRefreshMs: 0,
      now: () => {
        t += 100
        return t
      },
    })
    const agg = createAggregator(fakeInstallationsClient, unusedMetadataReader(), deps)
    await agg.refresh()
    const first = agg.getSnapshot().repos[0]?.status.securityPosture
    expect(first?.recentCures.map(a => a.ghsaId)).toEqual(['GHSA-kept'])
    const firstFetchedAt = first?.curesFetchedAt
    expect(firstFetchedAt).not.toBeNull()

    failCures = true
    await agg.refresh() // gate is open (curesRefreshMs: 0) — the walk retries and fails
    const second = agg.getSnapshot().repos[0]?.status.securityPosture
    expect(second?.recentCures.map(a => a.ghsaId), 'sample survives the failed walk').toEqual(['GHSA-kept'])
    expect(second?.curesFetchedAt, 'timestamp NOT silently refreshed').toBe(firstFetchedAt)
  })

  it('resets a carried cursor that outlived the connection (empty tail page + non-zero lifetime count)', async () => {
    const graphql = makeRoutingGraphqlFake([
      // window 1: walk advances, carries CURSOR-STALE
      makeCuresPage({totalCount: 5, hasNextPage: true, endCursor: 'CURSOR-STALE', nodes: [makeAlertNode({ghsaId: 'GHSA-1'})]}),
      makeCuresPage({totalCount: 5, hasNextPage: false, endCursor: 'CURSOR-STALE-2', nodes: [makeAlertNode({ghsaId: 'GHSA-2'})]}),
      // window 2: the connection no longer honors CURSOR-STALE-2 → empty tail page
      makeCuresPage({totalCount: 5, hasNextPage: false, endCursor: null, nodes: []}),
      // window 3: re-anchored from page 1
      makeCuresPage({totalCount: 5, hasNextPage: false, endCursor: 'CURSOR-FRESH', nodes: [makeAlertNode({ghsaId: 'GHSA-3'})]}),
    ])
    let t = 1_000_000
    const agg = createAggregator(fakeInstallationsClient, unusedMetadataReader(), makeDeps(graphql.fn, {
      curesRefreshMs: 0,
      now: () => {
        t += 1
        return t
      },
    }))
    await agg.refresh()
    await agg.refresh()
    await agg.refresh()
    const calls = graphql.curesCalls()
    expect(calls.length).toBe(4)
    expect(calls[2]?.vars.curesAfter, 'window 2 walked from the carried cursor').toBe('CURSOR-STALE-2')
    expect(calls[3]?.vars.curesAfter, 'window 3 re-anchored from page 1 (cursor reset)').toBeUndefined()
    expect(agg.getSnapshot().repos[0]?.status.securityPosture?.recentCures.map(a => a.ghsaId)).toContain('GHSA-3')
  })

  it('bounds the merged display sample at SECURITY_RECENT_CURES_CAP regardless of history length', async () => {
    // 6 pages × 2 nodes = 12 collected → sample must cap at 10, newest-first
    const pages = Array.from({length: 6}, (_unused, i) =>
      makeCuresPage({totalCount: 12, hasNextPage: i < 5, endCursor: `C-${i}`, nodes: [
        makeAlertNode({ghsaId: `GHSA-${String(i * 2).padStart(2, '0')}`, fixedAt: `2026-09-${String(i + 1).padStart(2, '0')}T00:00:00Z`}),
        makeAlertNode({ghsaId: `GHSA-${String(i * 2 + 1).padStart(2, '0')}`, fixedAt: `2026-09-${String(i + 1).padStart(2, '0')}T12:00:00Z`}),
      ]}),
    )
    const graphql = makeRoutingGraphqlFake(pages)
    const agg = createAggregator(fakeInstallationsClient, unusedMetadataReader(), makeDeps(graphql.fn, {curesRefreshMs: 0}))
    await agg.refresh()
    const posture = agg.getSnapshot().repos[0]?.status.securityPosture
    expect(posture?.recentCureCount, 'authoritative lifetime count kept').toBe(12)
    expect(posture?.recentCures.length, 'display sample capped').toBe(10)
    const fixedAts = posture?.recentCures.map(a => a.fixedAt)
    expect(fixedAts, 'newest-first').toEqual(
      [...(fixedAts ?? [])].sort((a, b) => String(b).localeCompare(String(a))),
    )
  })
})

/** Metadata fake matching the harness's unused-reader convention. */
function unusedMetadataReader() {
  return vi.fn()
}
