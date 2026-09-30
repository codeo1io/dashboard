/**
 * serveStatic double-decode regression probe (rm-196 rider, 2026-09-30).
 *
 * hono 4.13.11 + @hono/node-server 2.1.3 fix GHSA-5r4p-p66f-jhc7 (unindexed in
 * the GitHub/OSV advisory databases at fix time — audit-invisible): serveStatic
 * decoded an already-decoded request path, so a crafted path was ROUTED as one
 * path and SERVED as another, skipping middleware mounted on a static prefix.
 * Post-fix contract: a path that still contains `%` after the single decode is
 * REJECTED (opt back in with `allowPercentInPath: true` — this fork does not).
 *
 * This suite exercises every serveStatic mount that resolves a filename from
 * the request path:
 * - the exact static-file route /static/operator-stream.js (public root)
 * - the /static/* catch-all (flag-gated operator UI assets)
 * - the /assets/* router (SPA webDistRoot, fixture-injected temp root)
 *
 * Healthy-path pairs (single-encoded segments must still serve) guard against
 * an over-blocking regression; %25-double-encoded segments must NOT serve.
 */
import type {GitHubOAuthClient} from '../src/auth/oauth.ts'
import {Buffer} from 'node:buffer'
import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import process from 'node:process'
import {afterEach, describe, expect, it} from 'vitest'
import {buildDashboardApp} from '../src/server.ts'
import {SessionManager} from '../src/session.ts'

// ---------------------------------------------------------------------------
// Test helpers (mirrors test/static-assets.test.ts)
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

async function buildTestApp(webDistRoot?: string) {
  return buildDashboardApp({
    operatorLogin: TEST_OPERATOR,
    cookieKey: TEST_KEY,
    oauthClient: makeFakeOAuthClient(),
    fetchUserLogin: async (_token: string) => TEST_OPERATOR,
    getSnapshot: () => ({repos: [], staleBanner: false, driftCount: 0, enumerationIncomplete: null, refreshedAt: null, refreshDurationMs: null, refreshDegraded: false}),
    operatorUiEnabled: true,
    webDistRoot,
  })
}

async function authedGet(app: Awaited<ReturnType<typeof buildTestApp>>, path: string): Promise<Response> {
  const cookie = makeSessionCookie()
  return app.request(path, {headers: {cookie: `session=${cookie}`}})
}

// ---------------------------------------------------------------------------
// Router 1: exact static-file route (/static/operator-stream.js, public root)
// ---------------------------------------------------------------------------

describe('serveStatic double-decode — exact static-file route /static/operator-stream.js', () => {
  it('single-encoded segment still serves: /static/operator%2Dstream.js → 200 (decode-once contract)', async () => {
    const app = await buildTestApp()
    const res = await app.request('/static/operator%2Dstream.js')
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body.length).toBeGreaterThan(0)
  })

  it('double-encoded extension must NOT serve: /static/operator-stream%252ejs → 404', async () => {
    const app = await buildTestApp()
    // Pre-fix (hono ≤4.13.10 / @hono/node-server ≤2.1.2) this request was
    // routed as /static/operator-stream%2ejs but served operator-stream.js —
    // a 200. The fix rejects the % remaining after the single decode.
    const res = await app.request('/static/operator-stream%252ejs')
    expect(res.status).toBe(404)
  })

  it('plain path still serves (no decode interference): /static/operator-stream.js → 200', async () => {
    const app = await buildTestApp()
    const res = await app.request('/static/operator-stream.js')
    expect(res.status).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// Router 2: /static/* catch-all (flag-gated operator UI assets)
// ---------------------------------------------------------------------------

describe('serveStatic double-decode — /static/* catch-all route', () => {
  it('single-encoded segment still serves: /static/oper%61tor.css → 200 CSS', async () => {
    const app = await buildTestApp()
    const res = await app.request('/static/oper%61tor.css')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type') ?? '').toMatch(/text\/css/)
    const body = await res.text()
    expect(body).toContain('box-sizing')
  })

  it('double-encoded extension must NOT serve: /static/operator%252ecss → 404', async () => {
    const app = await buildTestApp()
    const res = await app.request('/static/operator%252ecss')
    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// Router 3: /assets/* (SPA webDistRoot) with a fixture-injected temp root
// ---------------------------------------------------------------------------

describe('serveStatic double-decode — /assets/* router (fixture webDistRoot)', () => {
  let webRoot: string | undefined

  afterEach(async () => {
    if (webRoot !== undefined) await rm(webRoot, {recursive: true, force: true})
    webRoot = undefined
    delete process.env.DASHBOARD_WEB_DIST
  })

  async function buildAppWithFixtureAssets(): Promise<{app: Awaited<ReturnType<typeof buildTestApp>>; root: string}> {
    const root = await mkdtemp(join(tmpdir(), 'serve-static-probe-'))
    webRoot = root
    await mkdir(join(root, 'assets'), {recursive: true})
    // Shell placeholder keeps the missing-index warning out of the run log.
    await writeFile(join(root, 'index.html'), '<!doctype html><title>probe</title>', 'utf8')
    await writeFile(join(root, 'assets', 'probe space.js'), '// probe asset with a literal space\n', 'utf8')
    await writeFile(join(root, 'assets', 'probe%20name.js'), '// probe asset with a literal percent\n', 'utf8')
    const app = await buildTestApp(root)
    return {app, root}
  }

  it('single-encoded space still serves: /assets/probe%20space.js → 200 with exact body', async () => {
    const {app} = await buildAppWithFixtureAssets()
    const res = await app.request('/assets/probe%20space.js')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('// probe asset with a literal space\n')
  })

  it('double-encoded space must NOT serve: /assets/probe%2520space.js → 404', async () => {
    // Pre-fix: routed as /assets/probe%2520space.js, served probe space.js.
    const {app} = await buildAppWithFixtureAssets()
    const res = await app.request('/assets/probe%2520space.js')
    expect(res.status).toBe(404)
  })

  it('literal-percent filenames stay unreachable without allowPercentInPath: /assets/probe%2520name.js → 404', async () => {
    // The secure default of the fix: files whose LITERAL names contain '%' are
    // not servable unless the deployment opts in via allowPercentInPath.
    // This fork serves no such files (vite output is percent-free), so the
    // closed default is the correct posture and is pinned here.
    const {app} = await buildAppWithFixtureAssets()
    const res = await app.request('/assets/probe%2520name.js')
    expect(res.status).toBe(404)
  })

  it('plain asset path still serves: /assets/probe space.js (client-normalized) via encoded form → 200', async () => {
    const {app} = await buildAppWithFixtureAssets()
    const res = await app.request('/assets/probe%20space.js')
    expect(res.status).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// Authenticated request parity — the bypass skipped prefix middleware; the
// closed probe must hold for sessioned requests too.
// ---------------------------------------------------------------------------

describe('serveStatic double-decode — authenticated parity', () => {
  it('authed double-encoded request is also rejected: /static/operator%252ecss → 404 with session', async () => {
    const app = await buildTestApp()
    const res = await authedGet(app, '/static/operator%252ecss')
    expect(res.status).toBe(404)
  })
})
