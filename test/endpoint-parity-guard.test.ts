/**
 * rm-556: README `### Endpoints` ↔ live Hono route-table parity, locked both ways.
 *
 * This is the same guard family as env-docs-guard (rm-214/rm-287) applied to the
 * HTTP surface: docs drift is bidirectional, so the test fails when either side
 * moves alone —
 *
 *   1. a route the server mounts but README does not list (undocumented route),
 *      unless it sits on the explicit allowlist below (deliberately-undocumented
 *      mounts: middleware registrations, hashed asset wildcards, and the
 *      reverse-proxied gateway surface documented in docs/runbooks/gateway-access.md), or
 *   2. a README row naming a route the server no longer mounts (stale row).
 *
 * The three routes that motivated rm-556 (GET /auth/logout-csrf,
 * GET /api/listener/csrf, GET /.well-known/security.txt) shipped undocumented
 * in exactly way (1) — two of them since 2026-06-25 (6dbbffa).
 *
 * Normalization:
 *   - Hono registers `app.use` middleware as method `ALL`; every serveStatic
 *     mount is `ALL` too, so `ALL` is compared as `GET` after the middleware
 *     `/*` registrations are allowlisted away.
 *   - Trailing slashes collapse (`GET /privacy/` == `GET /privacy`); Hono mounts
 *     both spellings for public routes.
 *   - Path parameters keep their `:name` form — README documents them literally
 *     (`POST /api/listener/messages/:id/ack`).
 *   - Duplicate registrations collapse to one (method, path) pair.
 *
 * The comparator runs on explicit inputs, so the red-first proof at the bottom
 * is the same code path the live-direction assertions use: a deliberate fixture
 * route (added but not documented) and a deliberate fixture row (documented but
 * not mounted) are both proven to trip the guard.
 */
import type {GitHubOAuthClient} from '../src/auth/oauth.ts'
import {Buffer} from 'node:buffer'
import {readFileSync} from 'node:fs'
import process from 'node:process'
import {afterAll, beforeAll, describe, expect, it} from 'vitest'
import {createListenerStore} from '../src/listener/store.ts'
import {buildDashboardApp} from '../src/server.ts'

const repoRoot = process.cwd()
const TEST_KEY = Buffer.from('testkey-ABCDEFGHIJKLMNOPQRSTUV12', 'utf8') // 32 bytes
const TEST_OPERATOR = 'octocat'

interface Endpoint {
  method: string
  path: string
}

const asKey = (e: Endpoint): string => `${e.method} ${e.path}`

/**
 * Deliberately-undocumented live routes, each with its reason. Every entry must
 * match at least one live route (asserted below), so the allowlist cannot rot.
 */
const ALLOWLIST: Record<string, string> = {
  'GET /*': 'app.use(\'*\') middleware registrations (secureHeaders, rate limiting, auth) — not endpoints',
  'GET /assets/*': 'hashed SPA asset files served cache-immutable; content-addressed, not operator-facing rows',
  'GET /icon-*': 'PWA icon wildcard (favicon + maskable icons); see the PWA rows',
  'GET /registerSW.js': 'PWA registration helper delivered with the sw.js bundle (see the PWA row)',
  'GET /static/operator-launch.js': 'operator runtime JS for the reverse-proxied gateway surface — docs/runbooks/gateway-access.md',
  'GET /static/operator-run-index.js': 'operator runtime JS for the reverse-proxied gateway surface — docs/runbooks/gateway-access.md',
  'GET /static/operator-stream.js': 'operator runtime JS for the reverse-proxied gateway surface — docs/runbooks/gateway-access.md',
  'GET /static/*': 'flag-gated operator-UI static catch-all (serves public/ — operator.css and any other asset) — docs/runbooks/gateway-access.md',
  'GET /operator': 'reverse-proxied gateway surface (redirects to /) — docs/runbooks/gateway-access.md',
}

/** Extract (method, path) pairs from the README `### Endpoints` list. */
function parseReadmeEndpoints(readme: string): Endpoint[] {
  const sectionMatch = readme.match(/^### Endpoints\n([\s\S]*?)(?=^## )/m)
  if (!sectionMatch) throw new Error('README has no `### Endpoints` section')
  const section = sectionMatch[1] ?? ''
  const out = new Map<string, Endpoint>()
  for (const row of section.matchAll(/^- .+$/gm)) {
    const rowText = row[0]
    for (const token of rowText.matchAll(/`([^`]+)`/g)) {
      const inner = token[1] ?? ''
      // `GET /path` (methodful) — possibly ` · `-separated several per row…
      const methodful = [...inner.matchAll(/\b(GET|POST|PUT|PATCH|DELETE)\s+([^\s`]*)/g)]
        .filter(m => (m[2] ?? '').startsWith('/'))
      if (methodful.length > 0) {
        for (const m of methodful) {
          const method = m[1] ?? ''
          const path = m[2] ?? ''
          out.set(`${method} ${path}`, {method, path})
        }
        continue
      }
      // …or a bare `/path` token, which is GET by convention (the root `/` included).
      const bare = inner.match(/^([^\s`]*)$/)
      const barePath = bare?.[1] ?? ''
      if (barePath !== '' && barePath.startsWith('/')) out.set(`GET ${barePath}`, {method: 'GET', path: barePath})
    }
  }
  return [...out.values()]
}

/** Normalize the live route table: ALL→GET (middleware allowlisted away), strip trailing '/', dedupe. */
function normalizeLiveRoutes(routes: {method: string; path: string}[]): Endpoint[] {
  const out = new Map<string, Endpoint>()
  for (const r of routes) {
    if (r.method !== 'GET' && r.method !== 'POST' && r.method !== 'ALL') continue
    const method = r.method === 'ALL' ? 'GET' : r.method
    const path = r.path.length > 1 && r.path.endsWith('/') ? r.path.slice(0, -1) : r.path
    out.set(`${method} ${path}`, {method, path})
  }
  return [...out.values()]
}

function computeDrift(live: Endpoint[], documented: Endpoint[], allowlist: Record<string, string>) {
  const documentedKeys = new Set(documented.map(asKey))
  const liveKeys = new Set(live.map(asKey))
  const allowKeys = new Set(Object.keys(allowlist))
  const undocumented = live.map(asKey).filter(k => !documentedKeys.has(k) && !allowKeys.has(k)).sort()
  const stale = documented.map(asKey).filter(k => !liveKeys.has(k)).sort()
  return {undocumented, stale}
}

describe('rm-556: README Endpoints ↔ live route table parity (locked both ways)', () => {
  let liveRoutes: Endpoint[]
  let documented: Endpoint[]
  const store = createListenerStore(':memory:')

  beforeAll(async () => {
    const oauthClient: GitHubOAuthClient = {
      createAuthorizationURL: (_state: string) => new URL('https://github.com/login/oauth/authorize'),
      validateAuthorizationCode: async () => ({accessToken: () => 'fake-access-token'}),
    }
    // Production-shaped mount: /auth/* present, listener store + ingest key
    // configured (the listener rows carry that caveat in README), fixture and
    // operator-UI-only surfaces off.
    const app = await buildDashboardApp({
      // (review fix 2026-10-04, attempt bc80a9d0) enable the operator UI so the
      // flag-gated /static/* catch-all (server.ts:1220-1226) is part of the live
      // table this guard locks; env-default false would leave the guard blind in
      // DASHBOARD_OPERATOR_UI deployments. The catch-all itself sits on ALLOWLIST
      // (static mounts are deliberately undocumented per the rm-556 acceptance).
      operatorUiEnabled: true,
      operatorLogin: TEST_OPERATOR,
      cookieKey: TEST_KEY,
      oauthClient,
      fetchUserLogin: async () => TEST_OPERATOR,
      listenerStore: store,
      listenerIngestKey: 'shared-ingest-key-for-tests',
    })
    liveRoutes = normalizeLiveRoutes(app.routes.map(r => ({method: r.method, path: r.path})))
    documented = parseReadmeEndpoints(readFileSync(`${repoRoot}/README.md`, 'utf8'))
  })

  afterAll(() => {
    store.close()
  })

  it('builds a non-empty route table and parses non-empty README rows', () => {
    expect(liveRoutes.length).toBeGreaterThan(10)
    expect(documented.length).toBeGreaterThan(10)
  })

  it('every live route is documented in README or on the explicit allowlist', () => {
    const {undocumented} = computeDrift(liveRoutes, documented, ALLOWLIST)
    expect(
      undocumented,
      'Route(s) mounted by the server but absent from README `### Endpoints` and the test allowlist —\n' +
      'document them (rm-556 class: docs drift) or add them to ALLOWLIST with a reason.',
    ).toEqual([])
  })

  it('every README Endpoints row names a route the server actually mounts', () => {
    const {stale} = computeDrift(liveRoutes, documented, ALLOWLIST)
    expect(
      stale,
      'README `### Endpoints` row(s) naming routes the server no longer mounts —\n' +
      'remove or update the row (rm-556 class: docs drift).',
    ).toEqual([])
  })

  it('every allowlist entry still matches a live route (no allowlist rot)', () => {
    const liveKeys = new Set(liveRoutes.map(asKey))
    const rotted = Object.keys(ALLOWLIST).filter(k => !liveKeys.has(k)).sort()
    expect(
      rotted,
      'ALLOWLIST entries matching no live route — the route was removed/renamed; delete the stale entry.',
    ).toEqual([])
  })

  it('the three rm-556 omissions are now documented (regression pins)', () => {
    const keys = new Set(documented.map(asKey))
    expect(keys.has('GET /auth/logout-csrf')).toBe(true)
    expect(keys.has('GET /api/listener/csrf')).toBe(true)
    expect(keys.has('GET /.well-known/security.txt')).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Red-first proof (committed): the exact drift class rm-556 guards against,
  // fed to the same comparator the live-direction assertions use.
  // -------------------------------------------------------------------------

  it('red-first fixture: a mounted-but-undocumented route is flagged', () => {
    const fixtureLive = [...liveRoutes, {method: 'GET', path: '/api/future-route'}]
    const {undocumented} = computeDrift(fixtureLive, documented, ALLOWLIST)
    expect(undocumented).toContain('GET /api/future-route')
  })

  it('red-first fixture: a documented-but-unmounted row is flagged', () => {
    const fixtureDocs = [...documented, {method: 'GET', path: '/api/ghost-route'}]
    const {stale} = computeDrift(liveRoutes, fixtureDocs, ALLOWLIST)
    expect(stale).toContain('GET /api/ghost-route')
  })

  it('normalization: ALL collapses to GET and trailing slashes are stripped', () => {
    const normalized = normalizeLiveRoutes([
      {method: 'ALL', path: '/manifest.webmanifest'},
      {method: 'ALL', path: '/manifest.webmanifest'},
      {method: 'GET', path: '/privacy/'},
      {method: 'POST', path: '/auth/logout'},
    ])
    expect(normalized).toEqual([
      {method: 'GET', path: '/manifest.webmanifest'},
      {method: 'GET', path: '/privacy'},
      {method: 'POST', path: '/auth/logout'},
    ])
  })
})
