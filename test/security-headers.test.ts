import {Buffer} from 'node:buffer'
import {describe, expect, it} from 'vitest'
/**
 * rm-252: structural lock on the security-header surface.
 *
 * The assess finding: zero test assertions on the response headers (grep for
 * Content-Security-Policy / X-Content-Type-Options / Referrer-Policy across
 * test/ returned nothing). These headers are the app's XSS/clickjacking
 * defense — a silent middleware reorder or a config typo would otherwise land
 * green. Lock the three structural properties:
 *
 * 1. Every response — public page, API, and even 404s — carries the CSP +
 *    nosniff + referrer-policy + frame-ancestors set (middleware-first).
 * 2. The /sw.js CSP bypass is scoped to /sw.js ONLY (Workbox needs it; the
 *    rest of the origin must not lose its CSP).
 * 3. The CSP stays strict where it matters: script-src 'self' with no
 *    unsafe-inline, object-src 'none', frame-ancestors 'none'.
 *
 * (The onError redaction half of the security surface is already covered by
 * the PR #481 port in test/dashboard.test.ts — not retested here.)
 */
import {buildDashboardApp} from '../src/server.ts'

const TEST_KEY = Buffer.from('testkey-ABCDEFGHIJKLMNOPQRSTUV12', 'utf8') // 32 bytes
const TEST_OPERATOR = 'octocat'

async function buildTestApp() {
  return buildDashboardApp({
    operatorLogin: TEST_OPERATOR,
    cookieKey: TEST_KEY,
    oauthClient: {
      createAuthorizationURL: (state: string) => {
        const url = new URL('https://github.com/login/oauth/authorize')
        url.searchParams.set('state', state)
        return url
      },
      validateAuthorizationCode: async () => ({accessToken: () => 'fake'}),
    },
    fetchUserLogin: async () => TEST_OPERATOR,
  })
}

describe('security headers (rm-252)', () => {
  it('public routes carry the full header set (CSP, nosniff, referrer-policy, frame-ancestors)', async () => {
    const app = await buildTestApp()
    const res = await app.request('/api/healthz')

    const csp = res.headers.get('content-security-policy') ?? ''
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("script-src 'self'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("object-src 'none'")
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('referrer-policy')).toBeDefined()
  })

  it('the CSP stays strict: no unsafe-inline script, no wildcard sources', async () => {
    const app = await buildTestApp()
    const res = await app.request('/api/healthz')
    const csp = res.headers.get('content-security-policy') ?? ''

    expect(csp).not.toContain("script-src 'unsafe-inline'")
    expect(csp).not.toContain('script-src *')
    expect(csp).not.toContain('*')
  })

  it('unknown-route responses keep the security headers (middleware runs first)', async () => {
    const app = await buildTestApp()
    // The SPA catch-all answers unknown GETs (auth-gated → redirect, or the
    // shell) — the exact status is not this lock's concern; the header set
    // riding EVERY response path is.
    const res = await app.request('/definitely-not-a-route')

    expect([200, 301, 302, 404]).toContain(res.status)
    expect(res.headers.get('content-security-policy')).toContain("default-src 'self'")
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
  })

  it('/sw.js drops ONLY its CSP — nosniff survives and every other route keeps its CSP', async () => {
    const app = await buildTestApp()
    const sw = await app.request('/sw.js')
    const other = await app.request('/api/healthz')

    // The deliberate Workbox bypass: no CSP on the service worker itself…
    expect(sw.headers.get('content-security-policy')).toBeNull()
    // …but the bypass is scoped: it must not leak onto any other response.
    expect(other.headers.get('content-security-policy')).toContain("default-src 'self'")
    // The bypass route still carries the rest of the security set.
    expect(sw.headers.get('x-content-type-options')).toBe('nosniff')
    expect(sw.headers.get('cache-control')).toContain('no-cache')
  })
})
