/**
 * Integration tests for GET /api/security (rm-117) — the BFF aggregation
 * endpoint backing the SPA security-posture view.
 *
 * Contract under test:
 * - Unauthenticated GET is denied (redirect to login or 401) — same auth
 *   posture as /api/monitoring.
 * - Cache-Control: no-store on every response.
 * - The DTO is a strict whitelist: internal fields (node_id, owner, name,
 *   discovery_channel, fetchedAt, CI/rollup fields, failing-check details)
 *   NEVER appear even when populated server-side.
 * - Permission-degraded repos surface posture:null + openAlertCount:null —
 *   the view's degraded notice has a machine-checkable signal.
 * - Empty snapshot → valid JSON with empty repos array.
 */
import type {GitHubOAuthClient} from '../src/auth/oauth.ts'
import type {AggregatorSnapshot, DashboardRepo, SecurityAlertDetail} from '../src/github/aggregator.ts'

import {Buffer} from 'node:buffer'

import {describe, expect, it} from 'vitest'
import {buildDashboardApp} from '../src/server.ts'
import {SessionManager} from '../src/session.ts'

const TEST_KEY = Buffer.from('testkey-ABCDEFGHIJKLMNOPQRSTUV12', 'utf8') // 32 bytes, mixed
const TEST_OPERATOR = 'octocat'

function makeFakeOAuthClient(): GitHubOAuthClient {
  return {
    createAuthorizationURL: (state: string, _scopes: string[]) =>
      new URL(`https://github.com/login/oauth/authorize?state=${state}`),
    validateAuthorizationCode: async (_code: string) => ({
      accessToken: () => 'fake-access-token',
    }),
  }
}

function makeSessionCookie(login: string = TEST_OPERATOR): string {
  const sm = new SessionManager(TEST_KEY)
  return sm.sign(login)
}

function makeAlertDetail(overrides: Partial<SecurityAlertDetail> = {}): SecurityAlertDetail {
  return {
    state: 'FIXED',
    createdAt: '2026-09-01T00:00:00Z',
    fixedAt: '2026-10-02T21:06:00Z',
    dismissedAt: null,
    autoDismissedAt: null,
    dismissReason: null,
    dependencyScope: 'RUNTIME',
    manifestPath: 'package.json',
    firstPatchedVersion: '1.2.3',
    vulnerableVersionRange: '< 1.2.3',
    updatePrState: 'MERGED',
    updatePrUrl: 'https://github.com/fro-bot/agent/pull/7',
    severity: 'HIGH',
    classification: 'GENERAL',
    withdrawnAt: null,
    ghsaId: 'GHSA-xxxx-yyyy-zzzz',
    cveId: 'CVE-2026-1234',
    cvssV3Score: 8.1,
    cvssV3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    cvssV4Score: null,
    cvssV4Vector: null,
    epssPercentage: 0.61,
    epssPercentile: 0.95,
    cwes: ['CWE-79'],
    identifiers: [
      {type: 'GHSA', value: 'GHSA-xxxx-yyyy-zzzz'},
      {type: 'CVE', value: 'CVE-2026-1234'},
    ],
    ...overrides,
  }
}

function makeRepo(overrides: {
  full_name?: string
  node_id?: string
  posture?: readonly SecurityAlertDetail[] | null
  openAlertCount?: number | null
} = {}): DashboardRepo {
  const cures = overrides.posture ?? []
  const posture =
    overrides.posture === null || overrides.posture === undefined
      ? null
      : {
          openAlerts: [],
          recentCures: cures,
          recentCureCount: cures.length,
          curesFetchedAt: 1_700_000_000_000,
        }
  return {
    node_id: overrides.node_id ?? 'NODE_R=SENSITIVE1',
    owner: 'fro-bot',
    name: 'agent',
    full_name: overrides.full_name ?? 'fro-bot/agent',
    discovery_channel: 'collab',
    status: {
      rollupState: 'green',
      failingChecks: 0,
      failingCheckDetails: [],
      openPrCount: 3,
      openIssueCount: 5,
      openAlertCount: overrides.openAlertCount ?? (overrides.posture === null ? null : 0),
      securityPosture: posture,
      stale: false,
      fetchedAt: 1_700_000_000_000,
    },
  }
}

function makeSnapshot(overrides: Partial<AggregatorSnapshot> = {}): AggregatorSnapshot {
  return {
    repos: [],
    staleBanner: false,
    driftCount: 0,
    enumerationIncomplete: null,
    refreshedAt: 1_700_000_000_000,
    refreshDurationMs: 100,
    refreshDegraded: false,
    ...overrides,
  }
}

async function buildTestApp(snapshot: AggregatorSnapshot) {
  return buildDashboardApp({
    operatorLogin: TEST_OPERATOR,
    cookieKey: TEST_KEY,
    oauthClient: makeFakeOAuthClient(),
    fetchUserLogin: async (_token: string) => TEST_OPERATOR,
    getSnapshot: () => snapshot,
  })
}

async function authedGet(app: Awaited<ReturnType<typeof buildTestApp>>, path: string): Promise<Response> {
  const cookie = makeSessionCookie()
  return app.request(path, {headers: {cookie: `session=${cookie}`}})
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

describe('GET /api/security — auth', () => {
  it('unauthenticated request is denied (redirect or 401)', async () => {
    const app = await buildTestApp(makeSnapshot())
    const res = await app.request('/api/security')
    expect([302, 303, 401]).toContain(res.status)
  })

  it('invalid session cookie is denied', async () => {
    const app = await buildTestApp(makeSnapshot())
    const res = await app.request('/api/security', {headers: {cookie: 'session=bad.garbage'}})
    expect([302, 303, 401]).toContain(res.status)
  })
})

// ---------------------------------------------------------------------------
// Contract: cache header + shape + whitelist
// ---------------------------------------------------------------------------

describe('GET /api/security — contract', () => {
  it('returns Cache-Control: no-store', async () => {
    const app = await buildTestApp(makeSnapshot())
    const res = await authedGet(app, '/api/security')
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
  })

  it('returns the posture fields the view parses', async () => {
    const repo = makeRepo({posture: [makeAlertDetail()]})
    const app = await buildTestApp(makeSnapshot({repos: [repo]}))
    const res = await authedGet(app, '/api/security')
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body.staleBanner).toBe(false)
    expect(body.refreshedAt).toBe(1_700_000_000_000)
    const repos = body.repos as Record<string, unknown>[]
    expect(repos.length).toBe(1)
    expect(repos[0]?.full_name).toBe('fro-bot/agent')
    const posture = repos[0]?.posture as Record<string, unknown>
    expect(posture.recentCureCount).toBe(1)
    expect(posture.curesFetchedAt).toBe(1_700_000_000_000)
    const cure = (posture.recentCures as Record<string, unknown>[])[0]
    expect(cure?.severity).toBe('HIGH')
    expect(cure?.ghsaId).toBe('GHSA-xxxx-yyyy-zzzz')
    expect(cure?.advisoryUrl).toBe('https://github.com/advisories/GHSA-xxxx-yyyy-zzzz')
    expect(cure?.cvssV3Score).toBe(8.1)
    expect(cure?.epssPercentage).toBe(0.61)
    expect(cure?.cwes).toEqual(['CWE-79'])
    expect(cure?.manifestPath).toBe('package.json')
    expect(cure?.updatePrState).toBe('MERGED')
    expect(cure?.updatePrUrl).toBe('https://github.com/fro-bot/agent/pull/7')
  })

  it('advisoryUrl is derived server-side: GHSA wins, NVD covers cve-only, null when unidentified', async () => {
    const repo = makeRepo({
      posture: [
        makeAlertDetail({ghsaId: 'GHSA-a', cveId: 'CVE-1'}),
        makeAlertDetail({ghsaId: null, cveId: 'CVE-2'}),
        makeAlertDetail({ghsaId: null, cveId: null}),
      ],
    })
    const app = await buildTestApp(makeSnapshot({repos: [repo]}))
    const res = await authedGet(app, '/api/security')
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    const repos = body.repos as Record<string, unknown>[]
    const posture = repos[0]?.posture as Record<string, unknown>
    const alerts = [...(posture.openAlerts as Record<string, unknown>[]), ...(posture.recentCures as Record<string, unknown>[])]
    expect(alerts[0]?.advisoryUrl).toBe('https://github.com/advisories/GHSA-a')
    expect(alerts[1]?.advisoryUrl).toBe('https://nvd.nist.gov/vuln/detail/CVE-2')
    expect(alerts[2]?.advisoryUrl).toBeNull()
  })

  it('NEVER emits internal fields even when populated server-side (strict whitelist)', async () => {
    const repo = makeRepo({node_id: 'NODE_SECRET_1', posture: [makeAlertDetail()]})
    const app = await buildTestApp(makeSnapshot({repos: [repo]}))
    const res = await authedGet(app, '/api/security')
    expect(res.status).toBe(200)
    const raw = await res.text()
    // Internal aggregator fields must not ride this DTO
    expect(raw).not.toContain('NODE_SECRET_1')
    expect(raw).not.toContain('"node_id"')
    expect(raw).not.toContain('"owner"')
    expect(raw).not.toContain('"discovery_channel"')
    expect(raw).not.toContain('"fetchedAt"')
    expect(raw).not.toContain('"rollupState"')
    expect(raw).not.toContain('"failingCheckDetails"')
    // Monitoring-only DTO members must not leak either
    expect(raw).not.toContain('"openPrCount"')
    expect(raw).not.toContain('"openIssueCount"')
    expect(raw).not.toContain('"driftCount"')
    expect(raw).not.toContain('"discoveryChannel"')
  })

  it('permission-degraded repo surfaces posture:null + openAlertCount:null', async () => {
    const repo = makeRepo({posture: null})
    const app = await buildTestApp(makeSnapshot({repos: [repo]}))
    const res = await authedGet(app, '/api/security')
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    const repos = body.repos as Record<string, unknown>[]
    expect(repos[0]?.openAlertCount).toBeNull()
    expect(repos[0]?.posture).toBeNull()
  })

  it('empty snapshot returns valid JSON with empty repos', async () => {
    const app = await buildTestApp(makeSnapshot())
    const res = await authedGet(app, '/api/security')
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body.repos).toEqual([])
  })

  it('stale banner propagates (staleness must be visible, never swallowed)', async () => {
    const app = await buildTestApp(makeSnapshot({staleBanner: true}))
    const res = await authedGet(app, '/api/security')
    const body = await res.json() as Record<string, unknown>
    expect(body.staleBanner).toBe(true)
  })
})
