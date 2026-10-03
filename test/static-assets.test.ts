/**
 * Tests for security headers, CSP, and static asset serving.
 *
 * Covers:
 * - CSP header present on responses with script-src 'self' and no 'unsafe-inline'
 * - GET /static/operator.css → 200 with CSS body + correct content-type, no auth required
 * - When operatorUiEnabled=false: /static/operator.css is not served
 * - PWA SW assets: /sw.js + /registerSW.js served with correct MIME + no-cache, public pre-auth
 * - PWA manifest: /manifest.webmanifest served as application/manifest+json, public pre-auth
 * - CSP on /sw.js: no page CSP applied (workers don't inherit page CSP)
 */
import type {GitHubOAuthClient} from '../src/auth/oauth.ts'
import {Buffer} from 'node:buffer'
import {existsSync, readdirSync, statSync} from 'node:fs'
import {join, resolve} from 'node:path'
import process from 'node:process'
import {gunzipSync} from 'node:zlib'
import {afterEach, describe, expect, it} from 'vitest'
import {FIXTURE_OPERATOR_PREFIX} from '../src/gateway/operator-fixture-routes.ts'
import {FIXTURE_SCENARIO_NAMES} from '../src/gateway/operator-fixture-sse.ts'
import {buildDashboardApp} from '../src/server.ts'
import {SessionManager} from '../src/session.ts'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

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

async function buildTestApp(operatorUiEnabled: boolean) {
  return buildDashboardApp({
    operatorLogin: TEST_OPERATOR,
    cookieKey: TEST_KEY,
    oauthClient: makeFakeOAuthClient(),
    fetchUserLogin: async (_token: string) => TEST_OPERATOR,
    getSnapshot: () => ({repos: [], staleBanner: false, driftCount: 0, enumerationIncomplete: null, refreshedAt: null, refreshDurationMs: null, refreshDegraded: false}),
    operatorUiEnabled,
  })
}

async function authedGet(app: Awaited<ReturnType<typeof buildTestApp>>, path: string): Promise<Response> {
  const cookie = makeSessionCookie()
  return app.request(path, {headers: {cookie: `session=${cookie}`}})
}

// ---------------------------------------------------------------------------
// CSP header tests
// ---------------------------------------------------------------------------

describe('security headers — CSP', () => {
  it('CSP header is present on a normal response', async () => {
    const app = await buildTestApp(true)
    const res = await app.request('/api/healthz')
    expect(res.status).toBe(200)
    const csp = res.headers.get('content-security-policy')
    expect(csp).not.toBeNull()
  })

  it("CSP contains script-src 'self'", async () => {
    const app = await buildTestApp(true)
    const res = await app.request('/api/healthz')
    const csp = res.headers.get('content-security-policy')
    expect(csp).toContain("script-src 'self'")
  })

  it("CSP keeps script-src strict — 'self' with no 'unsafe-inline'", async () => {
    const app = await buildTestApp(true)
    const res = await app.request('/api/healthz')
    const csp = res.headers.get('content-security-policy') ?? ''
    const scriptSrc = csp.split(';').map(d => d.trim()).find(d => d.startsWith('script-src')) ?? ''
    expect(scriptSrc).toBe("script-src 'self'")
    expect(scriptSrc).not.toContain("'unsafe-inline'")
  })

  it("CSP allows inline styles (style-src has 'unsafe-inline' for SSR style attributes)", async () => {
    const app = await buildTestApp(true)
    const res = await app.request('/api/healthz')
    const csp = res.headers.get('content-security-policy') ?? ''
    const styleSrc = csp.split(';').map(d => d.trim()).find(d => d.startsWith('style-src')) ?? ''
    expect(styleSrc).toContain("'unsafe-inline'")
  })

  it("CSP contains default-src 'self'", async () => {
    const app = await buildTestApp(true)
    const res = await app.request('/api/healthz')
    const csp = res.headers.get('content-security-policy')
    expect(csp).toContain("default-src 'self'")
  })

  it("CSP contains frame-ancestors 'none'", async () => {
    const app = await buildTestApp(true)
    const res = await app.request('/api/healthz')
    const csp = res.headers.get('content-security-policy')
    expect(csp).toContain("frame-ancestors 'none'")
  })

  it("CSP contains connect-src 'self' (restricts XHR/fetch/WebSocket origins)", async () => {
    const app = await buildTestApp(true)
    const res = await app.request('/api/healthz')
    const csp = res.headers.get('content-security-policy') ?? ''
    expect(csp).toContain("connect-src 'self'")
  })

  it("CSP contains form-action 'self' (prevents form submission to external origins)", async () => {
    const app = await buildTestApp(true)
    const res = await app.request('/api/healthz')
    const csp = res.headers.get('content-security-policy') ?? ''
    expect(csp).toContain("form-action 'self'")
  })

  it('CSP is present on error responses too (applies to all routes)', async () => {
    const app = await buildTestApp(false)
    // An unauthenticated request to a protected route gets denied
    const res = await app.request('/not-a-real-route')
    const csp = res.headers.get('content-security-policy')
    expect(csp).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Static asset serving tests
// ---------------------------------------------------------------------------

describe('static asset serving — /static/operator.css', () => {
  it('GET /static/operator.css returns 200 when operatorUiEnabled=true', async () => {
    const app = await buildTestApp(true)
    const res = await app.request('/static/operator.css')
    expect(res.status).toBe(200)
  })

  it('GET /static/operator.css returns CSS content-type', async () => {
    const app = await buildTestApp(true)
    const res = await app.request('/static/operator.css')
    expect(res.status).toBe(200)
    const contentType = res.headers.get('content-type') ?? ''
    expect(contentType).toMatch(/text\/css/)
  })

  it('GET /static/operator.css returns non-empty CSS body', async () => {
    const app = await buildTestApp(true)
    const res = await app.request('/static/operator.css')
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body.length).toBeGreaterThan(0)
    expect(body).toContain('box-sizing')
  })

  it('GET /static/operator.css is reachable WITHOUT an auth session (public path)', async () => {
    const app = await buildTestApp(true)
    const res = await app.request('/static/operator.css')
    expect(res.status).toBe(200)
    expect(res.status).not.toBe(302)
    expect(res.status).not.toBe(303)
  })

  it('GET /static/operator.css is NOT served when operatorUiEnabled=false', async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/static/operator.css')
    expect(res.status).not.toBe(200)
  })

  it('GET /static/nonexistent.txt returns 404 (not a catch-all)', async () => {
    const app = await buildTestApp(true)
    const res = await app.request('/static/nonexistent.txt')
    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// rm-478 — explicit caching policy for the unversioned operator runtime JS
// ---------------------------------------------------------------------------

describe('operator runtime JS caching policy (rm-478)', () => {
  it('GET /static/operator-stream.js serves no-cache with a content-hash ETag', async () => {
    const app = await buildTestApp(false) // runtime JS is flag-independent
    const res = await app.request('/static/operator-stream.js')
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-cache')
    const etag = res.headers.get('etag')
    expect(etag).toBeTruthy()
    expect(etag).toMatch(/^"[0-9a-f]{32}"$/)
  })

  it('the ETag is deterministic across apps (content hash, not instance state)', async () => {
    const appA = await buildTestApp(false)
    const appB = await buildTestApp(false)
    const resA = await appA.request('/static/operator-stream.js')
    const resB = await appB.request('/static/operator-stream.js')
    expect(resA.headers.get('etag')).toBe(resB.headers.get('etag'))
  })

  it('a matching If-None-Match short-circuits the transfer with 304', async () => {
    const app = await buildTestApp(false)
    const first = await app.request('/static/operator-stream.js')
    const etag = first.headers.get('etag') ?? ''
    const revalidated = await app.request('/static/operator-stream.js', {headers: {'If-None-Match': etag}})
    expect(revalidated.status).toBe(304)
    expect(revalidated.headers.get('etag')).toBe(etag)
    expect(revalidated.headers.get('cache-control')).toBe('no-cache')
    await expect(revalidated.text()).resolves.toBe('')
  })

  it('a non-matching If-None-Match still serves the full asset (200)', async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/static/operator-stream.js', {headers: {'If-None-Match': '"stale"'}})
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-cache')
    expect((await res.text()).length).toBeGreaterThan(0)
  })

  it('operator-launch.js and operator-run-index.js carry the same policy', async () => {
    const app = await buildTestApp(false)
    for (const asset of ['/static/operator-launch.js', '/static/operator-run-index.js']) {
      const res = await app.request(asset)
      expect(res.status, asset).toBe(200)
      expect(res.headers.get('cache-control'), asset).toBe('no-cache')
      expect(res.headers.get('etag'), asset).toMatch(/^"[0-9a-f]{32}"$/)
    }
  })
})

// ---------------------------------------------------------------------------
// rm-553 — serving-path compression (gzip at the serving seams)
//
// compress() is mounted ONLY at the serving seams (/, /assets/*, /icon-*,
// /static/*) so SSE and API surfaces are excluded BY CONSTRUCTION. These tests
// pin: gzip + Vary on a representative hashed asset, byte-exact round trip,
// identity pass-through, rm-478's strong-ETag/304 loop preserved under gzip,
// and the ABSENCE of Content-Encoding on the SSE route and API responses.
// Cache-Control on /assets is deliberately NOT asserted — sibling rm-555
// (immutable caching) owns that header; compression assertions stay
// cache-control-agnostic so they survive either landing order.
// ---------------------------------------------------------------------------

describe('rm-553 — serving-path compression', () => {
  /** Pick a hashed /assets JS entry large enough to clear the 1024-byte threshold. */
  function pickHashedAsset(): string | null {
    const dir = 'web/dist/assets'
    if (!existsSync(dir)) return null
    const entries = readdirSync(dir)
      .filter(f => f.endsWith('.js'))
      .filter(f => statSync(join(dir, f)).size >= 1024)
      .sort((a, b) => statSync(join(dir, b)).size - statSync(join(dir, a)).size)
    return entries[0] ? `/assets/${entries[0]}` : null
  }

  it('hashed /assets entry with Accept-Encoding: gzip → 200 + Content-Encoding: gzip + Vary: Accept-Encoding', async () => {
    const asset = pickHashedAsset()
    if (asset === null) return // no dist bundle in this environment
    const app = await buildTestApp(true)
    const res = await app.request(asset, {headers: {'accept-encoding': 'gzip'}})
    expect(res.status).toBe(200)
    expect(res.headers.get('content-encoding')).toBe('gzip')
    expect(res.headers.get('vary')).toContain('Accept-Encoding')
  })

  it('hashed /assets entry with Accept-Encoding: identity → no Content-Encoding, Vary present', async () => {
    const asset = pickHashedAsset()
    if (asset === null) return
    const app = await buildTestApp(true)
    const res = await app.request(asset, {headers: {'accept-encoding': 'identity'}})
    expect(res.status).toBe(200)
    expect(res.headers.get('content-encoding')).toBeNull()
    expect(res.headers.get('vary')).toContain('Accept-Encoding')
  })

  it('the gzip representation of a hashed /assets entry is byte-exact gunzip(identity)', async () => {
    const asset = pickHashedAsset()
    if (asset === null) return
    const app = await buildTestApp(true)
    const gzipped = await app.request(asset, {headers: {'accept-encoding': 'gzip'}})
    const identity = await app.request(asset, {headers: {'accept-encoding': 'identity'}})
    expect(gzipped.status).toBe(200)
    expect(identity.status).toBe(200)
    const decoded = gunzipSync(Buffer.from(await gzipped.arrayBuffer()))
    expect(decoded.equals(Buffer.from(await identity.arrayBuffer()))).toBe(true)
  })

  it('the 320KB icon SVGs negotiate gzip (same SPA asset seam as /assets)', async () => {
    const app = await buildTestApp(true)
    const res = await app.request('/icon-192.svg', {headers: {'accept-encoding': 'gzip'}})
    expect(res.status).toBe(200)
    expect(res.headers.get('content-encoding')).toBe('gzip')
    expect(res.headers.get('vary')).toContain('Accept-Encoding')
    expect((await res.arrayBuffer()).byteLength).toBeGreaterThan(0)
  })

  it('authenticated / (injected shell) with gzip → compressed + Vary, payload intact after decode', async () => {
    const app = await buildDashboardApp({
      operatorLogin: TEST_OPERATOR,
      cookieKey: TEST_KEY,
      oauthClient: makeFakeOAuthClient(),
      fetchUserLogin: async (_token: string) => TEST_OPERATOR,
      getSnapshot: () => ({repos: [], staleBanner: false, driftCount: 0, enumerationIncomplete: null, refreshedAt: null, refreshDurationMs: null, refreshDegraded: false}),
      operatorUiEnabled: false,
      pushNotificationsEnabled: true,
    })
    const res = await app.request('/', {
      headers: {cookie: `session=${makeSessionCookie()}`, 'accept-encoding': 'gzip'},
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-encoding')).toBe('gzip')
    expect(res.headers.get('vary')).toContain('Accept-Encoding')
    expect(gunzipSync(Buffer.from(await res.arrayBuffer())).toString('utf8')).toContain('<div id="root">')
  })

  it('/static/operator-stream.js with gzip → Content-Encoding: gzip + Vary + STRONG etag (rm-478 basis preserved)', async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/static/operator-stream.js', {headers: {'accept-encoding': 'gzip'}})
    expect(res.status).toBe(200)
    expect(res.headers.get('content-encoding')).toBe('gzip')
    expect(res.headers.get('vary')).toContain('Accept-Encoding')
    // rm-478: the strong (non-W/) content-hash ETag must survive compression —
    // a W/ form would break the byte-exact If-None-Match compare below.
    const etag = res.headers.get('etag')
    expect(etag).toMatch(/^"[0-9a-f]{32}"$/)
    expect(etag?.startsWith('W/')).toBe(false)
  })

  it('the gzip and identity representations of /static/operator-stream.js share the same strong ETag', async () => {
    const app = await buildTestApp(false)
    const gz = await app.request('/static/operator-stream.js', {headers: {'accept-encoding': 'gzip'}})
    const id = await app.request('/static/operator-stream.js', {headers: {'accept-encoding': 'identity'}})
    expect(gz.headers.get('etag')).toBe(id.headers.get('etag'))
    expect(gz.headers.get('etag')).toMatch(/^"[0-9a-f]{32}"$/)
  })

  it('gzip client revalidation: If-None-Match on a compressed path → 304, strong ETag, NO Content-Encoding', async () => {
    const app = await buildTestApp(false)
    const first = await app.request('/static/operator-stream.js', {headers: {'accept-encoding': 'gzip'}})
    const etag = first.headers.get('etag') ?? ''
    expect(etag).toMatch(/^"[0-9a-f]{32}"$/) // the client caches the STRONG form
    const revalidated = await app.request('/static/operator-stream.js', {
      headers: {'accept-encoding': 'gzip', 'If-None-Match': etag},
    })
    expect(revalidated.status).toBe(304)
    expect(revalidated.headers.get('etag')).toBe(etag)
    expect(revalidated.headers.get('content-encoding')).toBeNull()
    await expect(revalidated.text()).resolves.toBe('')
  })

  it('decoded /static/operator-stream.js gzip body is byte-identical to the identity body', async () => {
    const app = await buildTestApp(false)
    const gz = await app.request('/static/operator-stream.js', {headers: {'accept-encoding': 'gzip'}})
    const id = await app.request('/static/operator-stream.js', {headers: {'accept-encoding': 'identity'}})
    const decoded = gunzipSync(Buffer.from(await gz.arrayBuffer()))
    expect(decoded.equals(Buffer.from(await id.arrayBuffer()))).toBe(true)
  })

  it('a HEAD request to a compressed seam carries no Content-Encoding (bodyless)', async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/static/operator-stream.js', {method: 'HEAD', headers: {'accept-encoding': 'gzip'}})
    expect(res.status).toBe(200)
    expect(res.headers.get('content-encoding')).toBeNull()
  })

  it('API JSON route (/api/healthz) carries no Content-Encoding — no global compress (rm-553)', async () => {
    const app = await buildTestApp(true)
    const res = await app.request('/api/healthz', {headers: {'accept-encoding': 'gzip'}})
    expect(res.status).toBe(200)
    expect(res.headers.get('content-encoding')).toBeNull()
  })

  it('SSE fixture stream carries no Content-Encoding even with Accept-Encoding: gzip (mount-point exclusion)', async () => {
    const app = await buildDashboardApp({
      operatorLogin: TEST_OPERATOR,
      cookieKey: TEST_KEY,
      oauthClient: makeFakeOAuthClient(),
      fetchUserLogin: async (_token: string) => TEST_OPERATOR,
      getSnapshot: () => ({repos: [], staleBanner: false, driftCount: 0, enumerationIncomplete: null, refreshedAt: null, refreshDurationMs: null, refreshDegraded: false}),
      operatorUiEnabled: false,
      fixtureHarnessEnabled: true,
      fixtureBindHost: '127.0.0.1',
    })
    const sessionRes = await app.request(`${FIXTURE_OPERATOR_PREFIX}/session`)
    const {fixtureSessionId} = await sessionRes.json() as {fixtureSessionId: string}
    const launchRes = await app.request(`${FIXTURE_OPERATOR_PREFIX}/runs`, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        scenario: FIXTURE_SCENARIO_NAMES.success,
        idempotencyKey: 'fixture-idem-key-rm553-sse-001',
        fixtureSessionId,
        csrfToken: 'fixture-csrf-placeholder',
        repo: 'fixture-org/fixture-repo',
        prompt: '[Fixture prompt]',
      }),
    })
    expect(launchRes.status).toBe(200)
    const {runId} = await launchRes.json() as {runId: string}
    const streamRes = await app.request(
      `${FIXTURE_OPERATOR_PREFIX}/runs/${runId}/stream?fixtureSessionId=${fixtureSessionId}`,
      {headers: {'accept-encoding': 'gzip'}},
    )
    expect(streamRes.status).toBe(200)
    expect(streamRes.headers.get('content-type') ?? '').toMatch(/text\/event-stream/)
    expect(streamRes.headers.get('content-encoding')).toBeNull()
    const body = await streamRes.text()
    expect(body).toContain('event:')
  })
})

// ---------------------------------------------------------------------------
// /operator → / redirect
// ---------------------------------------------------------------------------

describe('/operator → / redirect', () => {
  it('GET /operator redirects to / (302) when operatorUiEnabled=true', async () => {
    const app = await buildTestApp(true)
    const res = await authedGet(app, '/operator')
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/')
  })

  it('GET /operator redirects to / (302) when operatorUiEnabled=false', async () => {
    const app = await buildTestApp(false)
    const res = await authedGet(app, '/operator')
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/')
  })

  it('GET /operator redirect response body does not contain monitoring or mock skeleton copy', async () => {
    const app = await buildTestApp(true)
    const res = await authedGet(app, '/operator')
    expect(res.status).toBe(302)
    const body = await res.text()
    expect(body.toLowerCase()).not.toContain('monitoring')
    expect(body).not.toContain('Gateway Operator Controls')
  })
})

// ---------------------------------------------------------------------------
// Flag-off: static route not mounted
// ---------------------------------------------------------------------------

describe('static route absent when operator UI disabled', () => {
  it('GET /static/operator.css is not served when flag is off', async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/static/operator.css')
    expect(res.status).not.toBe(200)
  })

  it('existing public routes still work when flag is off', async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/api/healthz')
    expect(res.status).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// Operator runtime JS assets — always served regardless of operatorUiEnabled
//
// Root / now owns the operator shell. The browser-side runtime modules
// (operator-stream.js, operator-launch.js) must be served unconditionally
// because the SPA shell at / always depends on them — the old operatorUiEnabled
// flag-gate was for the SSR /operator route, not the root app.
// ---------------------------------------------------------------------------

describe('operator runtime JS assets — served regardless of operatorUiEnabled flag', () => {
  it('GET /static/operator-stream.js returns 200 when operatorUiEnabled=false', async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/static/operator-stream.js')
    expect(res.status).toBe(200)
  })

  it('GET /static/operator-stream.js?manual=1 returns 200 when operatorUiEnabled=false', async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/static/operator-stream.js?manual=1')
    expect(res.status).toBe(200)
  })

  it('GET /static/operator-launch.js returns 200 when operatorUiEnabled=false', async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/static/operator-launch.js')
    expect(res.status).toBe(200)
  })

  it('GET /static/operator-launch.js?manual=1 returns 200 when operatorUiEnabled=false', async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/static/operator-launch.js?manual=1')
    expect(res.status).toBe(200)
  })

  it('GET /static/operator-stream.js returns 200 when operatorUiEnabled=true', async () => {
    const app = await buildTestApp(true)
    const res = await app.request('/static/operator-stream.js')
    expect(res.status).toBe(200)
  })

  it('GET /static/operator-launch.js returns 200 when operatorUiEnabled=true', async () => {
    const app = await buildTestApp(true)
    const res = await app.request('/static/operator-launch.js')
    expect(res.status).toBe(200)
  })

  it('GET /static/operator-stream.js is reachable WITHOUT an auth session (public path)', async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/static/operator-stream.js')
    expect(res.status).toBe(200)
    expect(res.status).not.toBe(302)
    expect(res.status).not.toBe(401)
  })

  it('GET /static/operator-launch.js is reachable WITHOUT an auth session (public path)', async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/static/operator-launch.js')
    expect(res.status).toBe(200)
    expect(res.status).not.toBe(302)
    expect(res.status).not.toBe(401)
  })

  it('GET /static/nonexistent.js is not served (not a catch-all for unknown paths)', async () => {
    // When operatorUiEnabled=false the /static/* catch-all is not mounted.
    // Unknown /static/* paths are not served as 200 — they get a redirect or 404.
    const app = await buildTestApp(false)
    const res = await app.request('/static/nonexistent.js')
    expect(res.status).not.toBe(200)
  })

  it('GET /static/nonexistent.js returns 404 when operatorUiEnabled=true (not a catch-all)', async () => {
    // When the /static/* catch-all IS mounted, missing files return 404.
    const app = await buildTestApp(true)
    const res = await app.request('/static/nonexistent.js')
    expect(res.status).toBe(404)
  })

  it('GET /static/operator-stream.js returns a JavaScript Content-Type', async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/static/operator-stream.js')
    expect(res.status).toBe(200)
    const ct = res.headers.get('content-type') ?? ''
    expect(ct).toMatch(/(?:text|application)\/javascript/)
  })

  it('GET /static/operator-launch.js returns a JavaScript Content-Type', async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/static/operator-launch.js')
    expect(res.status).toBe(200)
    const ct = res.headers.get('content-type') ?? ''
    expect(ct).toMatch(/(?:text|application)\/javascript/)
  })

  it('GET /static/operator-run-index.js returns 200 when operatorUiEnabled=false', async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/static/operator-run-index.js')
    expect(res.status).toBe(200)
  })

  it('GET /static/operator-run-index.js?manual=1 returns 200 when operatorUiEnabled=false', async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/static/operator-run-index.js?manual=1')
    expect(res.status).toBe(200)
  })

  it('GET /static/operator-run-index.js returns 200 when operatorUiEnabled=true', async () => {
    const app = await buildTestApp(true)
    const res = await app.request('/static/operator-run-index.js')
    expect(res.status).toBe(200)
  })

  it('GET /static/operator-run-index.js is reachable WITHOUT an auth session (public path)', async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/static/operator-run-index.js')
    expect(res.status).toBe(200)
    expect(res.status).not.toBe(302)
    expect(res.status).not.toBe(401)
  })

  it('GET /static/operator-run-index.js returns a JavaScript Content-Type', async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/static/operator-run-index.js')
    expect(res.status).toBe(200)
    const ct = res.headers.get('content-type') ?? ''
    expect(ct).toMatch(/(?:text|application)\/javascript/)
  })
})

// ---------------------------------------------------------------------------
// PWA SW asset serving — /sw.js
// ---------------------------------------------------------------------------

describe('PWA SW asset serving — /sw.js', () => {
  it('GET /sw.js returns 200', async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/sw.js')
    expect(res.status).toBe(200)
  })

  it('GET /sw.js returns a JavaScript Content-Type (wrong type blocks SW registration)', async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/sw.js')
    expect(res.status).toBe(200)
    const ct = res.headers.get('content-type') ?? ''
    expect(ct).toMatch(/(?:text|application)\/javascript/)
  })

  it('GET /sw.js returns Cache-Control no-store so SW updates are detected', async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/sw.js')
    expect(res.status).toBe(200)
    const cc = res.headers.get('cache-control') ?? ''
    expect(cc).toContain('no-store')
  })

  it('GET /sw.js is reachable WITHOUT an auth session (public path)', async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/sw.js')
    expect(res.status).toBe(200)
    expect(res.status).not.toBe(302)
    expect(res.status).not.toBe(401)
  })

  it('GET /sw.js does NOT carry the page CSP (workers do not inherit page CSP)', async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/sw.js')
    expect(res.status).toBe(200)
    const csp = res.headers.get('content-security-policy')
    expect(csp).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// PWA SW asset serving — /registerSW.js
// ---------------------------------------------------------------------------
// NOTE: vite-plugin-pwa only emits registerSW.js when using auto-register mode.
// Since the app uses useRegisterSW() in a component (ReloadPrompt), the
// registration code is bundled into the main JS chunk and registerSW.js is NOT
// emitted. The route remains in isPublicPath for forward-compatibility.

describe('PWA SW asset serving — /registerSW.js', () => {
  it('GET /registerSW.js is in the public allowlist (no auth redirect)', async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/registerSW.js')
    expect(res.status).not.toBe(302)
    expect(res.status).not.toBe(401)
  })
})

// ---------------------------------------------------------------------------
// PWA manifest serving — /manifest.webmanifest
// ---------------------------------------------------------------------------

describe('PWA manifest serving — /manifest.webmanifest', () => {
  it('GET /manifest.webmanifest returns 200', async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/manifest.webmanifest')
    expect(res.status).toBe(200)
  })

  it('GET /manifest.webmanifest returns Content-Type application/manifest+json (PWA installability)', async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/manifest.webmanifest')
    expect(res.status).toBe(200)
    const ct = res.headers.get('content-type') ?? ''
    expect(ct).toMatch(/application\/manifest\+json/)
  })

  it('GET /manifest.webmanifest is reachable WITHOUT an auth session (public path)', async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/manifest.webmanifest')
    expect(res.status).toBe(200)
    expect(res.status).not.toBe(302)
    expect(res.status).not.toBe(401)
  })
})

// ---------------------------------------------------------------------------
// Auth boundary: SW assets are public but protected routes are still gated
// ---------------------------------------------------------------------------

describe('auth boundary — SW assets public, protected routes still gated', () => {
  it('/sw.js is public but / (the SPA shell) still requires auth', async () => {
    const app = await buildTestApp(false)
    // SW is public
    const swRes = await app.request('/sw.js')
    expect(swRes.status).toBe(200)
    // / requires auth — no session → redirect or deny
    const rootRes = await app.request('/')
    expect(rootRes.status).not.toBe(200)
  })

  it('/registerSW.js path is public (no auth redirect) but /api/monitoring still requires auth', async () => {
    const app = await buildTestApp(false)
    const swRes = await app.request('/registerSW.js')
    expect(swRes.status).not.toBe(302)
    expect(swRes.status).not.toBe(401)
    const apiRes = await app.request('/api/monitoring')
    expect(apiRes.status).not.toBe(200)
  })
})

describe('production static JS assets — no fixture strings', () => {
  it('operator-stream.js source does not contain /__fixture string', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('public/operator-stream.js', 'utf8')
    expect(src).not.toContain('/__fixture')
  })

  it('operator-launch.js source does not contain /__fixture string', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('public/operator-launch.js', 'utf8')
    expect(src).not.toContain('/__fixture')
  })

  it('operator-run-index.js source does not contain /__fixture string', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('public/operator-run-index.js', 'utf8')
    expect(src).not.toContain('/__fixture')
  })

  it('operator-stream.js source does not contain fixture-mode flag strings', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('public/operator-stream.js', 'utf8')
    expect(src).not.toContain('fixtureMode')
    expect(src).not.toContain('fixture-runtime-loader')
  })

  it('operator-launch.js source does not contain fixture-mode flag strings', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('public/operator-launch.js', 'utf8')
    expect(src).not.toContain('fixtureMode')
    expect(src).not.toContain('fixture-runtime-loader')
  })

  it('operator-run-index.js source does not contain fixture-mode flag strings', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('public/operator-run-index.js', 'utf8')
    expect(src).not.toContain('fixtureMode')
    expect(src).not.toContain('fixture-runtime-loader')
  })

  it('operator-stream.js default endpoint base is /operator (not fixture prefix)', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('public/operator-stream.js', 'utf8')
    // The default endpoint base must be /operator, not /__fixture/operator
    // The file may contain /operator as part of paths like /operator/session/csrf
    expect(src).toContain('/operator')
    expect(src).not.toContain('/__fixture/operator')
  })

  it('operator-launch.js default endpoint base is /operator (not fixture prefix)', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('public/operator-launch.js', 'utf8')
    expect(src).toContain('/operator')
    expect(src).not.toContain('/__fixture/operator')
  })

  it('operator-run-index.js default endpoint base is /operator (not fixture prefix)', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('public/operator-run-index.js', 'utf8')
    expect(src).toContain('/operator')
    expect(src).not.toContain('/__fixture/operator')
  })
})

// ---------------------------------------------------------------------------
// Production build artifact assertions — web/dist must be fixture-free
//
// These tests scan the compiled browser bundle and service-worker output after
// `pnpm build:web`. Fixture imports are dev-gated so Vite removes the module
// request strings from production output. The pretest hook runs build:web before
// vitest, so web/dist is always fresh when these tests run.
// ---------------------------------------------------------------------------

describe('production build artifacts — no fixture strings in web/dist JS', () => {
  it('web/dist/sw.js does not contain /__fixture route string', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('web/dist/sw.js', 'utf8')
    expect(src).not.toContain('/__fixture')
  })

  it('web/dist/sw.js does not contain fixture-runtime-loader import path', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('web/dist/sw.js', 'utf8')
    expect(src).not.toContain('fixture-runtime-loader')
  })

  it('web/dist/index.html does not contain /__fixture string', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('web/dist/index.html', 'utf8')
    expect(src).not.toContain('/__fixture')
  })

  it('web/dist JS bundle does not contain /__fixture route string', async () => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const assetsDir = 'web/dist/assets'
    const entries = await fs.readdir(assetsDir)
    const jsFiles = entries.filter(f => f.endsWith('.js'))
    for (const file of jsFiles) {
      const src = await fs.readFile(path.join(assetsDir, file), 'utf8')
      expect(src, `${file} must not contain /__fixture`).not.toContain('/__fixture')
    }
  })

  it('web/dist JS bundle does not contain fixture-runtime-loader import path', async () => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const assetsDir = 'web/dist/assets'
    const entries = await fs.readdir(assetsDir)
    const jsFiles = entries.filter(f => f.endsWith('.js'))
    for (const file of jsFiles) {
      const src = await fs.readFile(path.join(assetsDir, file), 'utf8')
      expect(src, `${file} must not contain fixture-runtime-loader`).not.toContain('fixture-runtime-loader')
    }
  })

  it('web/dist JS bundle does not contain push fixture literals', async () => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const assetsDir = 'web/dist/assets'
    const entries = await fs.readdir(assetsDir)
    const jsFiles = entries.filter(f => f.endsWith('.js'))
    const forbidden = ['endpoint-fixture-', '/__fixture/operator/push', 'FIXTURE_VAPID_PUBLIC_KEY', 'MOCK_SYNTHETIC_PUSH']
    for (const file of jsFiles) {
      const src = await fs.readFile(path.join(assetsDir, file), 'utf8')
      for (const literal of forbidden) {
        expect(src, `${file} must not contain ${literal}`).not.toContain(literal)
      }
    }
  })

  it('web/dist/index.html does not contain push fixture literals', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('web/dist/index.html', 'utf8')
    for (const literal of ['endpoint-fixture-', '/__fixture/operator/push', 'FIXTURE_VAPID_PUBLIC_KEY', 'MOCK_SYNTHETIC_PUSH']) {
      expect(src, `index.html must not contain ${literal}`).not.toContain(literal)
    }
  })
})

// ---------------------------------------------------------------------------
// Service worker cache boundary — fixture routes are not intercepted
//
// The SW uses a deny-by-default NavigationRoute with an explicit denylist.
// /__fixture/* paths are not in the SW route table, so they naturally pass
// through to the server. These tests prove the SW source does not add fixture
// route handling and does not precache or runtime-cache fixture paths.
// ---------------------------------------------------------------------------

describe('service worker cache boundary — fixture routes not intercepted', () => {
  it('web/dist/sw.js does not register a route for /__fixture paths', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('web/dist/sw.js', 'utf8')
    expect(src).not.toContain('/__fixture')
  })

  it('web/src/sw.ts source does not contain /__fixture route registration', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('web/src/sw.ts', 'utf8')
    expect(src).not.toContain('/__fixture')
  })

  it('web/dist/sw.js NavigationRoute denylist does not include fixture prefix', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('web/dist/sw.js', 'utf8')
    // The denylist patterns are /^\/auth/, /^\/operator\/auth/, /^\/api/
    // /__fixture must not appear in any denylist or allowlist pattern
    expect(src).not.toContain('fixture')
  })
})

// ---------------------------------------------------------------------------
// DASHBOARD_WEB_DIST static root override
//
// The server must read DASHBOARD_WEB_DIST (defaulting to ./web/dist) and use it
// for all SPA static asset routes: /, /assets/*, /icon-*, /manifest.webmanifest,
// /sw.js, /registerSW.js, and the missing-index warning.
//
// Tests here verify:
// 1. Default root is ./web/dist (production unchanged).
// 2. DASHBOARD_WEB_DIST env var is forwarded to the app config.
// 3. package.json dev:fixture script sets DASHBOARD_WEB_DIST=./web/dist-fixture.
// ---------------------------------------------------------------------------

describe('DASHBOARD_WEB_DIST — static root override', () => {
  const ORIGINAL_WEB_DIST = process.env.DASHBOARD_WEB_DIST

  afterEach(() => {
    if (ORIGINAL_WEB_DIST === undefined) {
      delete process.env.DASHBOARD_WEB_DIST
    } else {
      process.env.DASHBOARD_WEB_DIST = ORIGINAL_WEB_DIST
    }
  })

  it('default webDistRoot is ./web/dist when DASHBOARD_WEB_DIST is unset', async () => {
    delete process.env.DASHBOARD_WEB_DIST
    // The app builds without error using the default root (web/dist exists from pretest build:web)
    const app = await buildDashboardApp({
      operatorLogin: TEST_OPERATOR,
      cookieKey: TEST_KEY,
      oauthClient: makeFakeOAuthClient(),
      fetchUserLogin: async (_token: string) => TEST_OPERATOR,
      getSnapshot: () => ({repos: [], staleBanner: false, driftCount: 0, enumerationIncomplete: null, refreshedAt: null, refreshDurationMs: null, refreshDegraded: false}),
    })
    // /sw.js is served from web/dist — 200 confirms the default root is correct
    const res = await app.request('/sw.js')
    expect(res.status).toBe(200)
  })

  it('injected webDistRoot=./web/dist-fixture serves assets from dist-fixture', async () => {
    // web/dist-fixture is built by pnpm build:web:fixture; skip if not present
    const fs = await import('node:fs')
    if (!fs.existsSync('./web/dist-fixture')) {
      return
    }
    const app = await buildDashboardApp({
      operatorLogin: TEST_OPERATOR,
      cookieKey: TEST_KEY,
      oauthClient: makeFakeOAuthClient(),
      fetchUserLogin: async (_token: string) => TEST_OPERATOR,
      getSnapshot: () => ({repos: [], staleBanner: false, driftCount: 0, enumerationIncomplete: null, refreshedAt: null, refreshDurationMs: null, refreshDegraded: false}),
      webDistRoot: './web/dist-fixture',
    })
    const res = await app.request('/sw.js')
    expect(res.status).toBe(200)
  })

  it('DASHBOARD_WEB_DIST env var is used as the static root when set', async () => {
    process.env.DASHBOARD_WEB_DIST = './web/dist'
    const app = await buildDashboardApp({
      operatorLogin: TEST_OPERATOR,
      cookieKey: TEST_KEY,
      oauthClient: makeFakeOAuthClient(),
      fetchUserLogin: async (_token: string) => TEST_OPERATOR,
      getSnapshot: () => ({repos: [], staleBanner: false, driftCount: 0, enumerationIncomplete: null, refreshedAt: null, refreshDurationMs: null, refreshDegraded: false}),
      // No webDistRoot injected — reads from env
    })
    const res = await app.request('/sw.js')
    expect(res.status).toBe(200)
  })
})

describe('DASHBOARD_WEB_DIST — production guard: dist-fixture must not be used in production', () => {
  it('buildDashboardApp throws when webDistRoot is ./web/dist-fixture and NODE_ENV=production', async () => {
    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    try {
      await expect(
        buildDashboardApp({
          operatorLogin: TEST_OPERATOR,
          cookieKey: TEST_KEY,
          oauthClient: makeFakeOAuthClient(),
          fetchUserLogin: async (_token: string) => TEST_OPERATOR,
          getSnapshot: () => ({repos: [], staleBanner: false, driftCount: 0, enumerationIncomplete: null, refreshedAt: null, refreshDurationMs: null, refreshDegraded: false}),
          webDistRoot: './web/dist-fixture',
        }),
      ).rejects.toThrow(/dist-fixture.*production|production.*dist-fixture/i)
    } finally {
      process.env.NODE_ENV = originalNodeEnv
    }
  })

  it('buildDashboardApp does NOT throw when webDistRoot is ./web/dist-fixture and NODE_ENV=development', async () => {
    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    try {
      await expect(
        buildDashboardApp({
          operatorLogin: TEST_OPERATOR,
          cookieKey: TEST_KEY,
          oauthClient: makeFakeOAuthClient(),
          fetchUserLogin: async (_token: string) => TEST_OPERATOR,
          getSnapshot: () => ({repos: [], staleBanner: false, driftCount: 0, enumerationIncomplete: null, refreshedAt: null, refreshDurationMs: null, refreshDegraded: false}),
          webDistRoot: './web/dist-fixture',
        }),
      ).resolves.toBeDefined()
    } finally {
      process.env.NODE_ENV = originalNodeEnv
    }
  })

  it('buildDashboardApp does NOT throw when webDistRoot is ./web/dist (production-safe root)', async () => {
    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    try {
      await expect(
        buildDashboardApp({
          operatorLogin: TEST_OPERATOR,
          cookieKey: TEST_KEY,
          oauthClient: makeFakeOAuthClient(),
          fetchUserLogin: async (_token: string) => TEST_OPERATOR,
          getSnapshot: () => ({repos: [], staleBanner: false, driftCount: 0, enumerationIncomplete: null, refreshedAt: null, refreshDurationMs: null, refreshDegraded: false}),
          webDistRoot: './web/dist',
        }),
      ).resolves.toBeDefined()
    } finally {
      process.env.NODE_ENV = originalNodeEnv
    }
  })
})

describe('dev:fixture script — package.json content', () => {
  it('dev:fixture script sets DASHBOARD_WEB_DIST=./web/dist-fixture', async () => {
    const fs = await import('node:fs/promises')
    const pkg = JSON.parse(await fs.readFile('package.json', 'utf8')) as {scripts: Record<string, string>}
    const script = pkg.scripts['dev:fixture'] ?? ''
    expect(script).toContain('DASHBOARD_WEB_DIST=./web/dist-fixture')
  })

  it('dev:fixture script chains build:web:fixture before starting the server', async () => {
    const fs = await import('node:fs/promises')
    const pkg = JSON.parse(await fs.readFile('package.json', 'utf8')) as {scripts: Record<string, string>}
    const script = pkg.scripts['dev:fixture'] ?? ''
    expect(script).toContain('build:web:fixture')
  })

  it('dev:fixture script sets DASHBOARD_HOST=127.0.0.1 (loopback safety)', async () => {
    const fs = await import('node:fs/promises')
    const pkg = JSON.parse(await fs.readFile('package.json', 'utf8')) as {scripts: Record<string, string>}
    const script = pkg.scripts['dev:fixture'] ?? ''
    expect(script).toContain('DASHBOARD_HOST=127.0.0.1')
  })

  it('dev:fixture script enables the dashboard fixture harness flag', async () => {
    const fs = await import('node:fs/promises')
    const pkg = JSON.parse(await fs.readFile('package.json', 'utf8')) as {scripts: Record<string, string>}
    const script = pkg.scripts['dev:fixture'] ?? ''
    expect(script).toContain('DASHBOARD_FIXTURE_HARNESS_ENABLED=true')
  })

  it('dev:fixture script enables dashboard dev autologin', async () => {
    const fs = await import('node:fs/promises')
    const pkg = JSON.parse(await fs.readFile('package.json', 'utf8')) as {scripts: Record<string, string>}
    const script = pkg.scripts['dev:fixture'] ?? ''
    expect(script).toContain('DASHBOARD_DEV_AUTOLOGIN=true')
  })

  it('dev:fixture script does not use stale fixture/autologin env aliases', async () => {
    const fs = await import('node:fs/promises')
    const pkg = JSON.parse(await fs.readFile('package.json', 'utf8')) as {scripts: Record<string, string>}
    const script = pkg.scripts['dev:fixture'] ?? ''
    expect(script).not.toContain('FIXTURE_HARNESS=true')
    expect(script).not.toContain('DEV_AUTO_LOGIN=true')
  })

  it('dev:fixture script sets NODE_ENV=development (fixture guard requires explicit development or test)', async () => {
    const fs = await import('node:fs/promises')
    const pkg = JSON.parse(await fs.readFile('package.json', 'utf8')) as {scripts: Record<string, string>}
    const script = pkg.scripts['dev:fixture'] ?? ''
    expect(script).toContain('NODE_ENV=development')
  })
})

// ---------------------------------------------------------------------------
// CSP invariant: existing worker-src/manifest-src 'self' already covers SW+manifest
// ---------------------------------------------------------------------------

describe('CSP invariant — worker-src and manifest-src already cover SW+manifest', () => {
  it("CSP on a normal response contains worker-src 'self' (covers SW registration)", async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/api/healthz')
    const csp = res.headers.get('content-security-policy') ?? ''
    expect(csp).toContain("worker-src 'self'")
  })

  it("CSP on a normal response contains manifest-src 'self' (covers manifest fetch)", async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/api/healthz')
    const csp = res.headers.get('content-security-policy') ?? ''
    expect(csp).toContain("manifest-src 'self'")
  })
})

describe('security — raw failure reason codes security invariants', () => {
  it('production static files do not contain dynamic CSS classes or custom properties derived from raw reason codes', async () => {
    const fs = await import('node:fs/promises')
    const files = [
      'public/operator-stream.js',
      'public/operator-run-index.js',
    ]
    for (const filePath of files) {
      const src = await fs.readFile(filePath, 'utf8')
      // Ensure no raw codes are interpolated into classList.add, className, or CSS variables
      expect(src).not.toMatch(/classList\.add\([^)]*failureKind/)
      expect(src).not.toMatch(/className[^;\n]*failureKind/)
      expect(src).not.toMatch(/setProperty\([^)]*failureKind/)
    }
  })
})

// ---------------------------------------------------------------------------
// rm-498 — serveStatic double-decode middleware bypass (fixed adapter pair)
// ---------------------------------------------------------------------------

describe('rm-498 — serveStatic double-decode bypass (GHSA-rmxm-3fg6-px4f / GHSA-5r4p-p66f-jhc7)', () => {
  // The 2026-09-29 coordinated fixes (@hono/node-server v2.1.3 GHSA-rmxm-3fg6-px4f,
  // hono v4.13.11 GHSA-5r4p-p66f-jhc7) closed a serveStatic double-decode
  // bypass: the adapter served a path derived from an ADDITIONAL percent-decode
  // of the already-decoded request path, so an encoded traversal could reach
  // files outside the static root while the auth middleware matched the
  // encoded form. The fixed adapter rejects paths whose decode differs from
  // what the router saw (and any path still containing '%' after decoding,
  // unless allowPercentInPath is set — we keep that unset).
  //
  // Sentinel: the repo-root Dockerfile (first line 'FROM node:24-slim') — a
  // file that exists OUTSIDE the static roots and must never be servable
  // through /static/* or /assets/*.

  it('single-encoded traversal /static/%2e%2e/Dockerfile is not served (rm-498)', async () => {
    const app = await buildTestApp(true)
    const res = await app.request('/static/%2e%2e/Dockerfile')
    expect(res.status).not.toBe(200)
    expect(await res.text()).not.toContain('FROM node:24-slim')
  })

  it('double-encoded traversal /static/%252e%252e/Dockerfile is rejected, not re-decoded (rm-498)', async () => {
    // The sharpest discriminator: one decode pass leaves literal '%' in the
    // path, which the fixed serveStatic rejects outright. A double-decoding
    // adapter would decode TWICE and serve the repo-root Dockerfile.
    const app = await buildTestApp(true)
    const res = await app.request('/static/%252e%252e/Dockerfile')
    expect(res.status).not.toBe(200)
    expect(await res.text()).not.toContain('FROM node:24-slim')
  })

  it('double-encoded traversal against /assets/* (webDistRoot) is never served either (rm-498)', async () => {
    // With web/dist built (pretest/full_tests) this pins the dist-root mount;
    // without it the 404 is trivially correct — full_tests carries the
    // dist-present proof.
    const app = await buildTestApp(true)
    const res = await app.request('/assets/%252e%252e/Dockerfile')
    expect(res.status).not.toBe(200)
    expect(await res.text()).not.toContain('FROM node:24-slim')
  })

  it('encoded traversal stays unauthenticated-safe: same denials without a session cookie (rm-498)', async () => {
    const app = await buildTestApp(true)
    for (const path of ['/static/%2e%2e/Dockerfile', '/static/%252e%252e/Dockerfile']) {
      const res = await app.request(path)
      expect(res.status).not.toBe(200)
      expect(await res.text()).not.toContain('FROM node:24-slim')
    }
  })
})

describe('rm-498 — % rejection compatibility (allowPercentInPath stays unset)', () => {
  it('no served filename under public/ or web/dist contains a literal %', () => {
    // The fixed serveStatic rejects any path that still contains '%' after
    // decoding unless allowPercentInPath is set; this fork keeps that option
    // unset, so the served asset trees must never need a %-encoded filename.
    // Pinned as a tree property so a future asset cannot silently break
    // serving for every consumer.
    // Served trees are walked via the static node:fs/node:path imports above.
    const repoRoot = process.cwd()

    const offenders: string[] = []
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        if (entry.includes('%')) offenders.push(join(dir, entry))
        const full = join(dir, entry)
        if (statSync(full).isDirectory()) walk(full)
      }
    }
    walk(resolve(repoRoot, 'public'))
    const dist = resolve(repoRoot, 'web/dist')
    if (existsSync(dist)) walk(dist)
    expect(offenders).toEqual([])
  })
})
