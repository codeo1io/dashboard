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
import {existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, utimesSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import process from 'node:process'
import {Hono} from 'hono'
import {afterEach, describe, expect, it} from 'vitest'
import {PINNED_CONTRACT_VERSION} from '../public/operator-stream.js'
import {OPERATOR_CONTRACT_VERSION} from '../src/gateway/operator-contract/version.ts'
import {FIXTURE_QUESTION_SCENARIO_ROWS} from '../src/gateway/operator-fixture-sse.ts'
import {buildDashboardApp} from '../src/server.ts'
import {SessionManager} from '../src/session.ts'
import {createPublicStatic} from '../src/static-files.ts'

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
    getSnapshot: () => ({repos: [], staleBanner: false, driftCount: 0, enumerationIncomplete: 0, refreshedAt: null, refreshDurationMs: null, refreshDegraded: false}),
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

// ---------------------------------------------------------------------------
// Static asset serving tests
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// /operator → / redirect
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Flag-off: static route not mounted
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Operator runtime JS assets — always served regardless of operatorUiEnabled
//
// Root / now owns the operator shell. The browser-side runtime modules
// (operator-stream.js, operator-launch.js) must be served unconditionally
// because the SPA shell at / always depends on them — the old operatorUiEnabled
// flag-gate was for the SSR /operator route, not the root app.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// PWA SW asset serving — /sw.js
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// PWA SW asset serving — /registerSW.js
// ---------------------------------------------------------------------------
// NOTE (2026-10-17, run 09ea72cc7eb644818a10fe785e3498e1): the built app DOES
// emit /registerSW.js — vite-plugin-pwa's injected registerSW auto-registration
// script — and web/dist/index.html loads it via the vite-plugin-pwa:register-sw
// script tag (asserted in the PWA SW asset serving block below). Registration
// therefore happens on every page load; the SW it registers is the kill-switch
// (see the Service worker cache boundary banner). The SW update-path decision
// (prompt vs autoUpdate) is tracked separately; these assertions pin the
// current emission truth so any change to it is deliberate.

// ---------------------------------------------------------------------------
// PWA manifest serving — /manifest.webmanifest
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Auth boundary: SW assets are public but protected routes are still gated
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Production build artifact assertions — web/dist must be fixture-free
//
// These tests scan the compiled browser bundle and service-worker output after
// `pnpm build:web`. Fixture imports are dev-gated so Vite removes the module
// request strings from production output. The pretest hook runs build:web before
// vitest, so web/dist is always fresh when these tests run.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Service worker cache boundary — the SW is a kill-switch, not a route table
//
// The registered SW (web/src/sw.ts) is a kill-switch: on activation it deletes
// every cache in caches.keys(), unregisters its own registration, and reloads
// clients. It installs no NavigationRoute and no denylist at all, so
// /__fixture/* paths always pass through to the server and nothing is ever
// precached or runtime-cached. The tests below pin exactly that — and would
// redden if a route table were added without revisiting fixture handling.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// CSP invariant: existing worker-src/manifest-src 'self' already covers SW+manifest
// ---------------------------------------------------------------------------

const DENIED_PERMISSIONS = 'accelerometer=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'

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

describe('/static/* revalidation — a deploy must not leave a stale operator module in the browser', () => {
  const unconditionalModules = [
    '/static/operator-stream.js',
    '/static/operator-launch.js',
    '/static/operator-run-index.js',
  ] as const

  it.each(unconditionalModules)('%s carries Cache-Control: no-cache and keeps Last-Modified (flag off)', async path => {
    const app = await buildTestApp(false)
    const res = await app.request(path)
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-cache')
    expect(res.headers.get('last-modified')).not.toBeNull()
  })

  it.each(unconditionalModules)('%s carries Cache-Control: no-cache with the ?manual=1 query the loader uses', async path => {
    const app = await buildTestApp(true)
    const res = await app.request(`${path}?manual=1`)
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-cache')
    expect(res.headers.get('last-modified')).not.toBeNull()
  })

  it('a flag-gated /static asset (operator.css) carries Cache-Control: no-cache and keeps Last-Modified', async () => {
    const app = await buildTestApp(true)
    const res = await app.request('/static/operator.css')
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-cache')
    expect(res.headers.get('last-modified')).not.toBeNull()
  })

  it('never uses no-store: the browser may keep the file and revalidate it', async () => {
    const app = await buildTestApp(true)
    for (const path of [...unconditionalModules, '/static/operator.css']) {
      const res = await app.request(path)
      expect(res.headers.get('cache-control'), path).not.toContain('no-store')
    }
  })

  it('a missing /static file is still a 404 with no cache header added', async () => {
    const app = await buildTestApp(true)
    const res = await app.request('/static/does-not-exist.js')
    expect(res.status).toBe(404)
    expect(res.headers.get('cache-control')).toBeNull()
  })

  it('a flag-gated /static asset is still not served with the flag off, and gets no cache header', async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/static/operator.css')
    expect(res.status).not.toBe(200)
    expect(res.headers.get('cache-control')).toBeNull()
  })

  it('the auth flow on /static is unchanged: an unauthenticated flag-on request is public (200), and flag-off non-module paths never leak a file', async () => {
    const on = await buildTestApp(true)
    expect((await on.request('/static/operator.css')).status).toBe(200)
    const off = await buildTestApp(false)
    const gated = await off.request('/static/operator.css')
    expect(gated.status).not.toBe(200)
  })
})

describe('/static/* conditional GET — revalidation answers 304 instead of re-sending the file', () => {
  const ETAG_PATTERN = /^"[\w-]{43}"$/
  const paths = ['/static/operator-stream.js', '/static/operator-launch.js', '/static/operator-run-index.js', '/static/operator.css'] as const

  it.each(paths)('GET %s returns 200 with a strong content-based ETag', async path => {
    const app = await buildTestApp(true)
    const res = await app.request(path)
    expect(res.status).toBe(200)
    expect(res.headers.get('etag')).toMatch(ETAG_PATTERN)
    expect(res.headers.get('last-modified')).not.toBeNull()
    expect((await res.text()).length).toBeGreaterThan(0)
  })

  it.each(paths)('GET %s with its own ETag returns 304: no body, no-cache, validators kept', async path => {
    const app = await buildTestApp(true)
    const first = await app.request(path)
    const etag = first.headers.get('etag') ?? ''
    expect(etag).toMatch(ETAG_PATTERN)

    const res = await app.request(path, {headers: {'if-none-match': etag}})

    expect(res.status).toBe(304)
    expect(await res.text()).toBe('')
    expect(res.headers.get('cache-control')).toBe('no-cache')
    expect(res.headers.get('etag')).toBe(etag)
    expect(res.headers.get('last-modified')).toBe(first.headers.get('last-modified'))
  })

  it('a stale or mismatched validator returns 200 with the full body', async () => {
    const app = await buildTestApp(true)
    const first = await app.request('/static/operator-run-index.js')
    const body = await first.text()
    for (const validator of ['"stale"', '"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"', 'garbage', '']) {
      const res = await app.request('/static/operator-run-index.js', {headers: {'if-none-match': validator}})
      expect(res.status, validator).toBe(200)
      expect(await res.text(), validator).toBe(body)
      expect(res.headers.get('cache-control'), validator).toBe('no-cache')
    }
  })

  it('matches the way If-None-Match is defined: weak form, a list, and *', async () => {
    const app = await buildTestApp(true)
    const etag = (await app.request('/static/operator-launch.js')).headers.get('etag') ?? ''
    for (const validator of [`W/${etag}`, `"other", ${etag}`, '*']) {
      const res = await app.request('/static/operator-launch.js', {headers: {'if-none-match': validator}})
      expect(res.status, validator).toBe(304)
    }
  })

  it('a HEAD revalidation returns 304 too', async () => {
    const app = await buildTestApp(true)
    const etag = (await app.request('/static/operator-launch.js')).headers.get('etag') ?? ''
    const res = await app.request('/static/operator-launch.js', {method: 'HEAD', headers: {'if-none-match': etag}})
    expect(res.status).toBe(304)
  })

  it('a ranged request is not turned into a 304', async () => {
    const app = await buildTestApp(true)
    const etag = (await app.request('/static/operator-launch.js')).headers.get('etag') ?? ''
    const res = await app.request('/static/operator-launch.js', {headers: {'if-none-match': etag, range: 'bytes=0-9'}})
    expect(res.status).toBe(206)
  })

  it('works for the unconditional modules with the flag off', async () => {
    const app = await buildTestApp(false)
    const etag = (await app.request('/static/operator-stream.js')).headers.get('etag') ?? ''
    expect(etag).toMatch(ETAG_PATTERN)
    expect((await app.request('/static/operator-stream.js', {headers: {'if-none-match': etag}})).status).toBe(304)
  })

  it('404s and the flag-gated paths are unchanged: no ETag, no cache header, never a 304', async () => {
    const on = await buildTestApp(true)
    const missing = await on.request('/static/does-not-exist.js', {headers: {'if-none-match': '*'}})
    expect(missing.status).toBe(404)
    expect(missing.headers.get('etag')).toBeNull()
    expect(missing.headers.get('cache-control')).toBeNull()

    const off = await buildTestApp(false)
    const gated = await off.request('/static/operator.css', {headers: {'if-none-match': '*'}})
    expect(gated.status).not.toBe(200)
    expect(gated.status).not.toBe(304)
    expect(gated.headers.get('etag')).toBeNull()
  })

  it('does not resolve outside public/: traversal paths are not served and never get a validator', async () => {
    const app = await buildTestApp(true)
    for (const path of ['/static/../package.json', '/static/%2e%2e/package.json', '/static/..%2fpackage.json']) {
      const res = await app.request(path, {headers: {'if-none-match': '*'}})
      expect(res.status, path).not.toBe(200)
      expect(res.status, path).not.toBe(304)
      expect(res.headers.get('etag'), path).toBeNull()
    }
  })
})

describe('/static/* validators follow the content, not the mtime', () => {
  const dirs: string[] = []
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, {recursive: true, force: true})
  })

  function makeRoot(content: string) {
    const root = mkdtempSync(join(tmpdir(), 'static-files-'))
    dirs.push(root)
    mkdirSync(root, {recursive: true})
    const file = join(root, 'mod.js')
    writeFileSync(file, content)
    const publicStatic = createPublicStatic(root)
    const app = new Hono()
    app.use('/static/*', publicStatic.revalidate)
    app.use('/static/*', publicStatic.serve)
    return {app, file}
  }

  it('a same-size file with different content and an OLDER mtime gets a new ETag and no false 304', async () => {
    const {app, file} = makeRoot('export const v = "aaaa"\n')
    const first = await app.request('/static/mod.js')
    const etag1 = first.headers.get('etag') ?? ''
    expect(etag1).not.toBe('')
    expect((await app.request('/static/mod.js', {headers: {'if-none-match': etag1}})).status).toBe(304)

    writeFileSync(file, 'export const v = "bbbb"\n')
    utimesSync(file, new Date(0), new Date(0))

    const afterDeploy = await app.request('/static/mod.js', {headers: {'if-none-match': etag1}})
    expect(afterDeploy.status).toBe(200)
    expect(await afterDeploy.text()).toBe('export const v = "bbbb"\n')
    expect(afterDeploy.headers.get('etag')).not.toBe(etag1)
  })

  it('a same-size file with different content and a NEWER mtime gets a new ETag and no false 304', async () => {
    const {app, file} = makeRoot('export const v = "aaaa"\n')
    const etag1 = (await app.request('/static/mod.js')).headers.get('etag') ?? ''

    writeFileSync(file, 'export const v = "cccc"\n')
    utimesSync(file, new Date(Date.now() + 60_000), new Date(Date.now() + 60_000))

    const res = await app.request('/static/mod.js', {headers: {'if-none-match': etag1}})
    expect(res.status).toBe(200)
    expect(res.headers.get('etag')).not.toBe(etag1)
  })

  it('the same content with a newer mtime keeps its ETag, so the browser still gets a 304', async () => {
    const {app, file} = makeRoot('export const v = "aaaa"\n')
    const etag1 = (await app.request('/static/mod.js')).headers.get('etag') ?? ''

    utimesSync(file, new Date(Date.now() + 60_000), new Date(Date.now() + 60_000))

    expect((await app.request('/static/mod.js', {headers: {'if-none-match': etag1}})).status).toBe(304)
  })

  it('only files under the root are reachable: a traversal path is a 404 with no validator', async () => {
    const {app} = makeRoot('export const v = 1\n')
    const res = await app.request('/static/../mod.js', {headers: {'if-none-match': '*'}})
    expect(res.status).toBe(404)
    expect(res.headers.get('etag')).toBeNull()
  })
})

describe('waiting-summary fixture rows stay out of production artifacts', () => {
  it('no waiting-row, transition-row or missing-run fixture ID reaches web/dist or the shipped browser modules', async () => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const files = [
      'web/dist/sw.js',
      'web/dist/index.html',
      'public/operator-stream.js',
      'public/operator-launch.js',
      'public/operator-run-index.js',
    ]
    for (const file of await fs.readdir('web/dist/assets')) {
      if (file.endsWith('.js') || file.endsWith('.css')) files.push(path.join('web/dist/assets', file))
    }
    for (const file of files) {
      const src = await fs.readFile(file, 'utf8')
      for (const id of ['run-fixture-index-approval-flow', 'run-fixture-index-transition-question', 'run-fixture-missing-001', 'req-fixture-approval-001']) {
        expect(src, `${file} must not contain ${id}`).not.toContain(id)
      }
    }
  })
})

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

describe('PWA SW asset serving — /registerSW.js', () => {
  it('GET /registerSW.js is in the public allowlist (no auth redirect)', async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/registerSW.js')
    expect(res.status).not.toBe(302)
    expect(res.status).not.toBe(401)
  })

  // Emission truth (run 09ea72cc7eb644818a10fe785e3498e1, T2): the built app
  // DOES auto-register — vite-plugin-pwa injects the register-sw script tag
  // into index.html and emits registerSW.js, which registers the kill-switch
  // sw.js on every page load. Pinned here so the update-path decision (prompt
  // vs autoUpdate, tracked separately) must flip these deliberately.
  it('built web/dist/index.html loads the register-sw script tag (emission truth)', async () => {
    const fs = await import('node:fs/promises')
    const html = await fs.readFile('web/dist/index.html', 'utf8')
    expect(html).toContain('id="vite-plugin-pwa:register-sw"')
    expect(html).toContain('src="/registerSW.js"')
  })

  it('built web/dist/registerSW.js registers /sw.js at the root scope', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('web/dist/registerSW.js', 'utf8')
    expect(src).toMatch(/serviceWorker\s*\.\s*register\(\s*'\/sw\.js'/)
    expect(src).toContain("scope: '/'")
  })

  it('built web/dist/sw.js is the kill-switch SW: unregisters, installs no route table', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('web/dist/sw.js', 'utf8')
    expect(src).toContain('unregister()')
    expect(src).not.toContain('NavigationRoute')
  })
})

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

  it('no question or expired-snapshot fixture scenario name, row run ID, or request ID reaches web/dist or the shipped browser modules', async () => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    expect(FIXTURE_QUESTION_SCENARIO_ROWS.length).toBeGreaterThan(0)
    const files = [
      'web/dist/sw.js',
      'web/dist/index.html',
      'public/operator-stream.js',
      'public/operator-launch.js',
      'public/operator-run-index.js',
    ]
    for (const file of await fs.readdir('web/dist/assets')) {
      if (file.endsWith('.js') || file.endsWith('.css')) files.push(path.join('web/dist/assets', file))
    }
    for (const file of files) {
      const src = await fs.readFile(file, 'utf8')
      for (const {scenario} of FIXTURE_QUESTION_SCENARIO_ROWS) {
        expect(src, `${file} must not contain scenario ${scenario}`).not.toContain(scenario)
        expect(src, `${file} must not contain the run ID for ${scenario}`).not.toContain(`run-fixture-index-${scenario.replaceAll('_', '-')}`)
      }
      expect(src, `${file} must not contain a question fixture request ID`).not.toContain('req-fixture-question-')
    }
  })
})

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

  it('built web/dist has no fixture strings in the SW output (kill-switch SW)', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('web/dist/sw.js', 'utf8')
    // The SW is a kill-switch: no NavigationRoute exists in the built sw.js
    // (asserted in the registerSW block), so there is no denylist or allowlist
    // to leak fixture paths into.
    expect(src).not.toContain('fixture')
  })

  it('built web/dist/sw.js unregisters and installs no route table', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('web/dist/sw.js', 'utf8')
    expect(src).toContain('unregister()')
    expect(src).not.toContain('NavigationRoute')
  })
})

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
      getSnapshot: () => ({repos: [], staleBanner: false, driftCount: 0, enumerationIncomplete: 0, refreshedAt: null, refreshDurationMs: null, refreshDegraded: false}),
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
      getSnapshot: () => ({repos: [], staleBanner: false, driftCount: 0, enumerationIncomplete: 0, refreshedAt: null, refreshDurationMs: null, refreshDegraded: false}),
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
      getSnapshot: () => ({repos: [], staleBanner: false, driftCount: 0, enumerationIncomplete: 0, refreshedAt: null, refreshDurationMs: null, refreshDegraded: false}),
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
          getSnapshot: () => ({repos: [], staleBanner: false, driftCount: 0, enumerationIncomplete: 0, refreshedAt: null, refreshDurationMs: null, refreshDegraded: false}),
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
          getSnapshot: () => ({repos: [], staleBanner: false, driftCount: 0, enumerationIncomplete: 0, refreshedAt: null, refreshDurationMs: null, refreshDegraded: false}),
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
          getSnapshot: () => ({repos: [], staleBanner: false, driftCount: 0, enumerationIncomplete: 0, refreshedAt: null, refreshDurationMs: null, refreshDegraded: false}),
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

describe('security — operator-stream.js contract pin and checkout-field boundary', () => {
  it('holds exactly one version literal (the pin), and imports no server code', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('public/operator-stream.js', 'utf8')
    // Strip comments so prose that names a version cannot hide a second pin.
    const code = src.replaceAll(/\/\*[\s\S]*?\*\//g, '').replaceAll(/(^|[^:])\/\/.*$/gm, '$1')
    const literals = code.match(/['"`]\d+\.\d+\.\d+['"`]/g) ?? []
    expect(literals).toHaveLength(1)
    expect(code).toMatch(/export const PINNED_CONTRACT_VERSION = ['"]\d+\.\d+\.\d+['"]/)
    expect(code).not.toMatch(/from\s+['"][^'"]*(?:src\/|\.ts['"])/)
    expect(code).not.toMatch(/\bimport\s*\(/)
  })

  it('the browser pin equals the vendored contract version (every pin moves together)', () => {
    expect(PINNED_CONTRACT_VERSION).toBe(OPERATOR_CONTRACT_VERSION)
  })

  it('renders checkout provenance and preparation through no HTML sink and puts no raw field in a class or CSS variable', async () => {
    const fs = await import('node:fs/promises')
    for (const filePath of ['public/operator-stream.js', 'public/operator-run-index.js']) {
      const src = await fs.readFile(filePath, 'utf8')
      expect(src).not.toMatch(/(?:innerHTML|outerHTML|insertAdjacentHTML)\s*=/)
      expect(src).not.toMatch(/classList\.add\([^)]*checkout(?:Provenance|Preparation)/)
      expect(src).not.toMatch(/className[^;\n]*checkout(?:Provenance|Preparation)/)
      expect(src).not.toMatch(/setProperty\([^)]*checkout(?:Provenance|Preparation)/)
      expect(src).not.toMatch(/dataset\.[A-Za-z]+\s*=[^;\n]*checkout(?:Provenance|Preparation)/)
    }
  })

  it('the run-index module never reads checkout fields (summaries do not carry them)', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('public/operator-run-index.js', 'utf8')
    expect(src).not.toMatch(/checkout(?:Provenance|Preparation)/)
  })
})

describe('checkout detail styling — selector/emitter parity', () => {
  it('styles every checkout detail class emitted by operator-stream.js', async () => {
    const fs = await import('node:fs/promises')
    const [js, css] = await Promise.all([
      fs.readFile('public/operator-stream.js', 'utf8'),
      fs.readFile('web/src/index.css', 'utf8'),
    ])
    const emitted = [...js.matchAll(/\bcheckout-detail(?:__[a-z-]+)?\b/g)]
      .map(match => match[0])
    expect(emitted.length).toBeGreaterThan(0)
    for (const className of emitted) {
      expect(css, `missing CSS rule for .${className}`).toMatch(new RegExp(String.raw`\.${className}(?![\w-])`))
    }
  })
})

describe('security headers — Permissions-Policy deny-by-default (rm-557)', () => {
  it('Permissions-Policy is present with exactly the deny-all directive set (public API)', async () => {
    const app = await buildTestApp(true)
    const res = await app.request('/api/healthz')
    expect(res.status).toBe(200)
    expect(res.headers.get('permissions-policy')).toBe(DENIED_PERMISSIONS)
  })

  it('Permissions-Policy is present on the authenticated SPA shell', async () => {
    const app = await buildTestApp(true)
    const res = await authedGet(app, '/')
    expect(res.headers.get('permissions-policy')).toBe(DENIED_PERMISSIONS)
  })

  it('Permissions-Policy is present on static asset responses (PWA manifest)', async () => {
    const app = await buildTestApp(true)
    const res = await app.request('/manifest.webmanifest')
    expect(res.status).toBe(200)
    expect(res.headers.get('permissions-policy')).toBe(DENIED_PERMISSIONS)
  })

  it('Permissions-Policy is present on redirects too (secureHeaders runs post-next)', async () => {
    const app = await buildTestApp(true)
    // Unauthenticated request to a protected API route → auth redirect; the
    // header must ride along even on non-200 responses.
    const res = await app.request('/api/monitoring')
    expect(res.status).toBe(302)
    expect(res.headers.get('permissions-policy')).toBe(DENIED_PERMISSIONS)
  })

  it('deny list stays representation-safe — no denied feature is used by the client', async () => {
    // Mirror of the src/server.ts deny list (camelCase directive keys). The API
    // names for each denied feature mirror the grep the rm-557 acceptance ran
    // at implementation time — adopting a denied feature trips this before it
    // breaks in production.
    const featureApiPatterns: [string, RegExp][] = [
      ['accelerometer', /DeviceMotionEvent|accelerometer/i],
      ['camera', /getUserMedia|mediaDevices|enumerateDevices/i],
      ['displayCapture', /getDisplayMedia/i],
      ['geolocation', /geolocation/i],
      ['gyroscope', /DeviceOrientationEvent|gyroscope/i],
      ['magnetometer', /magnetometer/i],
      ['microphone', /getUserMedia|mediaDevices|enumerateDevices/i],
      ['payment', /PaymentRequest/i],
      ['usb', /navigator\.usb|requestDevice/i],
    ]
    const fs = await import('node:fs/promises')
    const path = await import('node:path')

    async function collectClientFiles(dir: string): Promise<string[]> {
      const out: string[] = []
      let entries: string[] = []
      try {
        entries = await fs.readdir(dir)
      } catch {
        return out
      }
      for (const entry of entries) {
        const full = path.join(dir, entry)
        const st = await fs.stat(full)
        if (st.isDirectory()) {
          out.push(...(await collectClientFiles(full)))
        } else if (/\.(?:ts|tsx|js)$/.test(entry)) {
          out.push(full)
        }
      }
      return out
    }

    for (const dir of ['web/src', 'public']) {
      const files = await collectClientFiles(path.join(process.cwd(), dir))
      for (const file of files) {
        const text = await fs.readFile(file, 'utf8')
        for (const [feature, pattern] of featureApiPatterns) {
          expect(
            text.match(pattern),
            `${dir} uses a Permissions-Policy-denied feature (${feature}) — remove it from the deny list or stop using it: ${file}`,
          ).toBeNull()
        }
      }
    }
  })
})

describe('operator runtime JS caching policy (rm-478)', () => {
  // rm-478's policy (no-cache + a content-hash ETag + If-None-Match → 304 for the
  // unversioned operator runtime modules) moved into src/static-files.ts with the
  // upstream #619 absorb; the broad conditional-GET coverage lives in the
  // revalidation describe above. These tests keep the flag-independent mount
  // (operatorUiEnabled=false) pinned — the named modules serve with the policy
  // even when the operator UI flag is off.
  it('GET /static/operator-stream.js serves no-cache with a content-hash ETag', async () => {
    const app = await buildTestApp(false) // runtime JS is flag-independent
    const res = await app.request('/static/operator-stream.js')
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-cache')
    const etag = res.headers.get('etag')
    expect(etag).toBeTruthy()
    expect(etag).toMatch(/^"[\w-]{43}"$/)
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
      expect(res.headers.get('etag'), asset).toMatch(/^"[\w-]{43}"$/)
    }
  })
})

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

// ---------------------------------------------------------------------------
// rm-690 — Cache-Control policy for static surfaces
// ---------------------------------------------------------------------------
// Vite content-hashes everything under /assets/* (index-Dy_WXR3M.js style), so
// a given URL's bytes can never change: RFC 8246 (HTTP Immutable Responses)
// and the MDN Cache-Control `immutable` entry make a one-year public lifetime
// sound. Unhashed surfaces (/icon-*, manifest.webmanifest, sw.js,
// /registerSW.js) must revalidate on every load instead. sw.js and
// /registerSW.js already carried a no-cache,no-store policy before rm-690
// (src/server.ts pre-secureHeaders middleware and the registerSW wrapper)
// — those cases pin the pre-existing behavior; the /assets/*, /icon-* and
// manifest cases were RED first (headers absent) and went green with the
// rm-690 middleware.

/** First content-hashed file in web/dist/assets matching Vite's -<hash>.<ext>. */
function firstHashedAsset(): string {
  const dir = resolve(process.cwd(), 'web/dist/assets')
  const files = readdirSync(dir).find(f => /-[\w-]{8}\.[a-z]+$/.test(f))
  if (files === undefined) {
    throw new Error(`no content-hashed asset found in ${dir} — run pnpm build:web`)
  }
  return files
}

describe('rm-690 — Cache-Control policy for static surfaces', () => {
  it('GET /assets/<content-hashed> carries Cache-Control public, max-age=31536000, immutable', async () => {
    const app = await buildTestApp(false)
    const res = await app.request(`/assets/${firstHashedAsset()}`)
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
  })

  it('GET /assets/<missing> 404s WITHOUT the immutable header (errors must never be pinned for a year)', async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/assets/index-doesnotexist.js')
    expect(res.status).toBe(404)
    expect(res.headers.get('cache-control') ?? '').not.toContain('immutable')
  })

  it('GET /icon-<name> carries a no-cache-family policy (unhashed surface revalidates)', async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/icon-192.svg')
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-cache')
  })

  it('GET /manifest.webmanifest carries a no-cache-family policy (unhashed surface revalidates)', async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/manifest.webmanifest')
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-cache')
  })

  it('GET /sw.js keeps its no-cache,no-store policy (pinned pre-rm-690 behavior)', async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/sw.js')
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-cache, no-store, must-revalidate')
  })

  it('GET /registerSW.js keeps its no-cache,no-store policy (pinned pre-rm-690 behavior)', async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/registerSW.js')
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-cache, no-store, must-revalidate')
  })
})
