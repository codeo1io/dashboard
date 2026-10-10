/**
 * rm-896: fixture `/api/monitoring` seam tests.
 *
 * Covers:
 * - Seam is mounted only when the full fixture-harness gate is active
 *   (dev/test env + loopback bind + flag); with the flag off the REAL
 *   /api/monitoring router answers (distinguished by staleBanner: the
 *   fixture's mixed shape serves staleBanner:false, the injected harness-off
 *   snapshot also serves staleBanner:false — so the fixture repo names are
 *   the distinguishing signal there).
 * - Default shape 'mixed' serves the deterministic fixture board through the
 *   PRODUCTION toMonitoringDto mapper (exact wire keys, snake_case repo
 *   fields, deterministic epoch anchors — these anchors pin the visual
 *   suite's screenshot determinism).
 * - ?shape=cold-start serves the aggregator's fail-closed no-data DTO
 *   per-request WITHOUT mutating module state.
 * - Anything else in ?shape= is a non-echoing 400.
 * - The seam stays behind the session auth middleware like the real API —
 *   unauthenticated GET is 401, never fixture data.
 * - Harness introspection: GET /monitoring (shape + shape list) and
 *   POST /monitoring/shape (mutates module state — the visual suite's
 *   selector; invalid shape and malformed JSON are non-echoing 400s).
 * - resetFixtureHarnessForTesting() resets the shape to 'mixed'.
 */
import type {GitHubOAuthClient} from '../src/auth/oauth.ts'
import {Buffer} from 'node:buffer'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {FIXTURE_OPERATOR_PREFIX} from '../src/gateway/operator-fixture-routes.ts'
import {FIXTURE_MONITORING_SHAPES} from '../src/routes/monitoring-fixture.ts'
import {resetFixtureHarnessForTesting} from '../src/routes/operator-fixture-harness.ts'
import {buildDashboardApp, resetRateLimitForTesting} from '../src/server.ts'
import {SessionManager} from '../src/session.ts'

const TEST_KEY = Buffer.from('testkey-ABCDEFGHIJKLMNOPQRSTUV12', 'utf8') // 32 bytes
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

interface FixtureAppOpts {
  fixtureHarnessEnabled?: boolean
}

async function buildFixtureTestApp(opts: FixtureAppOpts = {}) {
  return buildDashboardApp({
    operatorLogin: TEST_OPERATOR,
    cookieKey: TEST_KEY,
    oauthClient: makeFakeOAuthClient(),
    fetchUserLogin: async (_token: string) => TEST_OPERATOR,
    getSnapshot: () => ({repos: [], staleBanner: false, driftCount: 0, enumerationIncomplete: null, refreshedAt: null, refreshDurationMs: null, refreshDegraded: false}),
    operatorUiEnabled: false,
    fixtureHarnessEnabled: opts.fixtureHarnessEnabled ?? false,
    fixtureBindHost: '127.0.0.1',
  })
}

// Authenticated GET — proves routes are mounted (vs auth-blocked) by reaching
// the route layer with a valid session cookie.
async function authedGet(app: Awaited<ReturnType<typeof buildFixtureTestApp>>, path: string): Promise<Response> {
  const cookie = makeSessionCookie()
  return app.request(path, {headers: {cookie: `session=${cookie}`}})
}

describe('fixture /api/monitoring seam (rm-896)', () => {
  beforeEach(() => {
    resetRateLimitForTesting()
    resetFixtureHarnessForTesting()
  })

  afterEach(() => {
    resetFixtureHarnessForTesting()
  })

  it("serves the deterministic 'mixed' board by default through the production DTO mapper", async () => {
    const app = await buildFixtureTestApp({fixtureHarnessEnabled: true})

    const res = await authedGet(app, '/api/monitoring')
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toContain('no-store')

    const dto = (await res.json()) as Record<string, unknown>
    // Exact production wire key set — nothing more, nothing less.
    expect(Object.keys(dto).sort()).toEqual([
      'driftCount',
      'enumerationIncomplete',
      'refreshDegraded',
      'refreshDurationMs',
      'refreshedAt',
      'repos',
      'staleBanner',
    ])

    // Deterministic anchors — these pin the visual suite's screenshots.
    expect(dto.staleBanner).toBe(false)
    expect(dto.driftCount).toBe(2)
    expect(dto.enumerationIncomplete).toBe(0)
    expect(dto.refreshedAt).toBe(1_762_252_800_000) // 2025-11-01T00:00:00.000Z
    expect(dto.refreshDurationMs).toBe(4_213)
    expect(dto.refreshDegraded).toBe(false)

    // Attention-first fixture board: red → stale/unknown → green; fixture
    // names only (never a real repository name).
    const repos = dto.repos as Record<string, unknown>[]
    expect(repos.map(r => r.full_name)).toEqual([
      'fixture-org/fixture-ci-red',
      'fixture-org/fixture-stale-walk',
      'fixture-org/fixture-green',
    ])

    const red = repos[0] as Record<string, unknown>
    expect(red.discovery_channel).toBe('collab')
    const redStatus = red.status as Record<string, unknown>
    expect(redStatus.rollupState).toBe('red')
    expect(redStatus.failingChecks).toBe(3)
    expect(redStatus.openPrCount).toBe(1)
    expect(redStatus.openIssueCount).toBe(2)
    expect(redStatus.openAlertCount).toBe(0)
    expect(redStatus.stale).toBe(false)
    const details = redStatus.failingCheckDetails as Record<string, unknown>[]
    expect(details).toHaveLength(2)
    expect(details[0]).toEqual({
      checkName: 'fixture-lint',
      workflowTitle: 'Fixture CI',
      runAttempt: 1,
      detailsUrl: 'https://example.com/fixture/check-runs/lint',
    })

    const stale = repos[1] as Record<string, unknown>
    expect((stale.status as Record<string, unknown>).stale).toBe(true)
    expect((stale.status as Record<string, unknown>).rollupState).toBe('unknown')
  })

  it('?shape=cold-start serves the fail-closed no-data DTO per request, without mutating state', async () => {
    const app = await buildFixtureTestApp({fixtureHarnessEnabled: true})

    const res = await authedGet(app, '/api/monitoring?shape=cold-start')
    expect(res.status).toBe(200)

    const dto = (await res.json()) as Record<string, unknown>
    expect(dto.repos).toEqual([])
    expect(dto.staleBanner).toBe(true)
    expect(dto.driftCount).toBe(0)
    expect(dto.enumerationIncomplete).toBeNull()
    expect(dto.refreshedAt).toBeNull()
    expect(dto.refreshDurationMs).toBeNull()
    expect(dto.refreshDegraded).toBe(false)

    // Module state untouched: a plain GET still serves the default board.
    const later = (await (await authedGet(app, '/api/monitoring')).json()) as Record<string, unknown>
    expect((later.repos as unknown[]).length).toBe(3)
  })

  it('rejects an unknown shape selector with a non-echoing 400', async () => {
    const app = await buildFixtureTestApp({fixtureHarnessEnabled: true})

    const res = await authedGet(app, '/api/monitoring?shape=full')
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({error: 'invalid-shape'})
  })

  it('is behind the session auth middleware like the real /api/monitoring', async () => {
    const app = await buildFixtureTestApp({fixtureHarnessEnabled: true})

    // The local-session auth branch redirects unauthenticated API reads to
    // the login page — the fixture data is never served without a session.
    const res = await app.request('/api/monitoring')
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('is not mounted when the harness gate is off — the real /api/monitoring answers', async () => {
    const app = await buildFixtureTestApp({fixtureHarnessEnabled: false})

    const res = await authedGet(app, '/api/monitoring')
    expect(res.status).toBe(200)
    const dto = (await res.json()) as Record<string, unknown>
    // The real router served the injected snapshot: zero repos, no fixture
    // names, no deterministic anchors.
    expect(dto.repos).toEqual([])
    expect(dto.staleBanner).toBe(false)
    expect(dto.refreshedAt).toBeNull()

    // Harness introspection routes are absent in production mode.
    const introspection = await authedGet(app, `${FIXTURE_OPERATOR_PREFIX}/monitoring`)
    expect(introspection.status).toBe(404)
  })

  it('exposes harness introspection: GET /monitoring and POST /monitoring/shape', async () => {
    const app = await buildFixtureTestApp({fixtureHarnessEnabled: true})
    const cookie = `session=${makeSessionCookie()}`

    const getRes = await app.request(`${FIXTURE_OPERATOR_PREFIX}/monitoring`, {headers: {cookie}})
    expect(getRes.status).toBe(200)
    expect(await getRes.json()).toEqual({shape: 'mixed', shapes: [...FIXTURE_MONITORING_SHAPES]})

    const postRes = await app.request(`${FIXTURE_OPERATOR_PREFIX}/monitoring/shape`, {
      method: 'POST',
      headers: {cookie, 'content-type': 'application/json'},
      body: JSON.stringify({shape: 'cold-start'}),
    })
    expect(postRes.status).toBe(200)
    expect(await postRes.json()).toEqual({shape: 'cold-start', shapes: [...FIXTURE_MONITORING_SHAPES]})

    // The seam now serves the harness-selected shape without a query.
    const dto = (await (await authedGet(app, '/api/monitoring')).json()) as Record<string, unknown>
    expect(dto.repos).toEqual([])
    expect(dto.staleBanner).toBe(true)
  })

  it('POST /monitoring/shape: invalid shape and malformed JSON are non-echoing 400s', async () => {
    const app = await buildFixtureTestApp({fixtureHarnessEnabled: true})
    const cookie = `session=${makeSessionCookie()}`

    const invalidShape = await app.request(`${FIXTURE_OPERATOR_PREFIX}/monitoring/shape`, {
      method: 'POST',
      headers: {cookie, 'content-type': 'application/json'},
      body: JSON.stringify({shape: 'made-up'}),
    })
    expect(invalidShape.status).toBe(400)
    expect(await invalidShape.json()).toEqual({error: 'invalid-shape'})

    const malformed = await app.request(`${FIXTURE_OPERATOR_PREFIX}/monitoring/shape`, {
      method: 'POST',
      headers: {cookie, 'content-type': 'application/json'},
      body: 'not-json',
    })
    expect(malformed.status).toBe(400)
    expect(await malformed.json()).toEqual({error: 'invalid-request'})
  })

  it('resetFixtureHarnessForTesting resets the shape to mixed', async () => {
    const app = await buildFixtureTestApp({fixtureHarnessEnabled: true})

    await app.request(`${FIXTURE_OPERATOR_PREFIX}/monitoring/shape`, {
      method: 'POST',
      headers: {cookie: `session=${makeSessionCookie()}`, 'content-type': 'application/json'},
      body: JSON.stringify({shape: 'cold-start'}),
    })
    resetFixtureHarnessForTesting()

    const dto = (await (await authedGet(app, '/api/monitoring')).json()) as Record<string, unknown>
    expect((dto.repos as unknown[]).length).toBe(3)
  })
})
