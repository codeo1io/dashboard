/**
 * Regression probe: serveStatic percent double-decode path confusion
 * (rm-196 security pair rider, run 4334b758 — the hono 4.13.11 +
 * @hono/node-server 2.1.3 pair).
 *
 * The underlying advisory (GHSA-5r4p-p66f-jhc7) is UNINDEXED — the GitHub
 * advisory API returns 404 for it — so it draws zero rows in `pnpm audit`
 * and this suite is its only standing gate.
 *
 * Mechanism (differential proven live, run 4334b758 implement 5ca92d92:
 * A/B probe in spool scratch, 2026-10-01): Hono's router carries the RAW,
 * still-encoded path, while @hono/node-server 2.1.1's serveStatic resolved
 * filenames with ONE full percent-decode pass — and a single decode never
 * rescans its decoded output. A request for a `%2520`-encoded name therefore
 * decoded onto a LITERAL-percent filename: the request was routed as one
 * path and served as another file (`probe%2520name.js` → 200 + the file
 * literally named `probe%20name.js` on 4.13.9/2.1.1; 404 on 4.13.11/2.1.3).
 * The 2.1.3 fix rejects any path that still contains `%` after decoding,
 * closing the class; a clean single-encoded path (a real space via `%20`)
 * still resolves exactly once.
 *
 * Covers all three filename-bearing serveStatic mounts in src/server.ts:
 * - the exact `/static/operator-stream.js` route (public root)
 * - the `/static/*` catch-all (public root, operatorUiEnabled-gated)
 * - the `/assets/*` mount over an injected mkdtemp webDistRoot fixture
 */
import type {GitHubOAuthClient} from '../src/auth/oauth.ts'
import {Buffer} from 'node:buffer'
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterAll, beforeAll, describe, expect, it} from 'vitest'
import {buildDashboardApp} from '../src/server.ts'

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

async function buildTestApp(operatorUiEnabled: boolean, webDistRoot?: string) {
  return buildDashboardApp({
    operatorLogin: TEST_OPERATOR,
    cookieKey: TEST_KEY,
    oauthClient: makeFakeOAuthClient(),
    fetchUserLogin: async (_token: string) => TEST_OPERATOR,
    getSnapshot: () => ({
      repos: [],
      staleBanner: false,
      driftCount: 0,
      enumerationIncomplete: null,
      refreshedAt: null,
      refreshDurationMs: null,
      refreshDegraded: false,
    }),
    operatorUiEnabled,
    ...(webDistRoot === undefined ? {} : {webDistRoot}),
  })
}

// ---------------------------------------------------------------------------
// Fixture: a webDistRoot whose asset directory carries BOTH a real-space
// filename and a literal-percent filename, so the two decode outcomes are
// distinguishable by body. Bodies are deliberately distinct so a served
// status alone cannot fake a pass.
// ---------------------------------------------------------------------------

const SPACE_BODY = 'space-name-ok'
const PERCENT_BODY = 'percent-name-LEAK'
let fixtureRoot = ''

beforeAll(() => {
  fixtureRoot = mkdtempSync(join(tmpdir(), 'serve-static-decode-'))
  mkdirSync(join(fixtureRoot, 'assets'), {recursive: true})
  writeFileSync(join(fixtureRoot, 'index.html'), '<!doctype html><html></html>')
  // Real space in the filename — reachable via ONE percent decode (`%20`).
  writeFileSync(join(fixtureRoot, 'assets', 'probe name.js'), SPACE_BODY)
  // Literal percent in the filename — reachable ONLY via the double-decode
  // bypass; the fixed middleware must never resolve a request onto it.
  writeFileSync(join(fixtureRoot, 'assets', 'probe%20name.js'), PERCENT_BODY)
  writeFileSync(join(fixtureRoot, 'assets', 'plain.js'), 'plain-ok')
})

afterAll(() => {
  if (fixtureRoot !== '') rmSync(fixtureRoot, {recursive: true, force: true})
})

// ---------------------------------------------------------------------------
// /assets/* mount (injected webDistRoot fixture) — the differentiating mount
// ---------------------------------------------------------------------------

describe('serveStatic decode semantics — /assets/* over a fixture webDistRoot', () => {
  it('serves a clean asset name unchanged (no behavioral change for clean paths)', async () => {
    const app = await buildTestApp(true, fixtureRoot)
    const res = await app.request('/assets/plain.js')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('plain-ok')
  })

  it('a single-encoded space decodes EXACTLY once and serves the space-named file', async () => {
    const app = await buildTestApp(true, fixtureRoot)
    const res = await app.request('/assets/probe%20name.js')
    expect(res.status).toBe(200)
    // Both the vulnerable and fixed pairs resolve this correctly — one full
    // decode pass maps the request onto the real-space filename. The
    // regression is strictly the double-encoded case below.
    expect(await res.text()).toBe(SPACE_BODY)
  })

  it('a double-encoded name never serves the literal-percent file (the bypass, closed)', async () => {
    const app = await buildTestApp(true, fixtureRoot)
    const res = await app.request('/assets/probe%2520name.js')
    // The fixed middleware rejects paths still containing `%` after decoding;
    // the vulnerable pair returned 200 + PERCENT_BODY here (routed as one
    // path, served as another).
    expect(res.status).not.toBe(200)
    const body = await res.text()
    expect(body).not.toContain(PERCENT_BODY)
  })

  it('a double-encoded name for a file that does not exist in ANY encoding is rejected', async () => {
    const app = await buildTestApp(true, fixtureRoot)
    const res = await app.request('/assets/probe%2520missing.js')
    expect(res.status).not.toBe(200)
  })
})

// ---------------------------------------------------------------------------
// Exact-route mount: /static/operator-stream.js (public root)
// ---------------------------------------------------------------------------

describe('serveStatic decode semantics — exact /static/operator-stream.js route', () => {
  it('serves the module 200 with JavaScript content-type, no auth session needed', async () => {
    const app = await buildTestApp(true)
    const res = await app.request('/static/operator-stream.js')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type') ?? '').toMatch(/javascript/)
  })

  it('a %25-encoded variant of the exact-route name never serves the module', async () => {
    const app = await buildTestApp(true)
    const res = await app.request('/static/operator%252Dstream.js')
    // The router carries the raw path, so the exact route does not match and
    // the catch-all must not resolve the double-encoded name onto anything.
    expect(res.status).not.toBe(200)
  })
})

// ---------------------------------------------------------------------------
// Catch-all mount: /static/* (public root, operatorUiEnabled-gated)
// ---------------------------------------------------------------------------

describe('serveStatic decode semantics — /static/* catch-all', () => {
  it('serves operator.css 200 with CSS content-type (baseline non-breakage)', async () => {
    const app = await buildTestApp(true)
    const res = await app.request('/static/operator.css')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type') ?? '').toMatch(/text\/css/)
  })

  it('rejects double-encoded asset names under the catch-all', async () => {
    const app = await buildTestApp(true)
    const res = await app.request('/static/probe%2520name.js')
    expect(res.status).not.toBe(200)
  })

  it('stays flag-gated: operatorUiEnabled=false does not serve catch-all assets', async () => {
    const app = await buildTestApp(false)
    const res = await app.request('/static/operator.css')
    expect(res.status).not.toBe(200)
  })
})
