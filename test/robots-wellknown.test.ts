import {Buffer} from 'node:buffer'
import {describe, expect, it} from 'vitest'
import {buildDashboardApp} from '../src/server.ts'
import {SessionManager} from '../src/session.ts'

// ---------------------------------------------------------------------------
// /robots.txt — RFC 9309 robots policy (rm-713)
//
// Mirrors the /.well-known/security.txt posture (rm-245 family): public in
// every deployment mode via the exact-match allowlist, never a prefix match.
// Served inline so the response carries no web/dist dependency. The policy is
// a whole-site Disallow — the dashboard is an authenticated single-operator
// surface with no public indexable content.
// ---------------------------------------------------------------------------

describe('GET /robots.txt — RFC 9309 robots policy (rm-713)', () => {
  const TEST_KEY = Buffer.from('testkey-ABCDEFGHIJKLMNOPQRSTUV12', 'utf8') // 32 bytes
  const TEST_OPERATOR = 'octocat'

  it('returns 200 + text/plain with a whole-site Disallow (unauthenticated)', async () => {
    const app = await buildDashboardApp()
    const res = await app.request('/robots.txt')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/plain')

    const body = await res.text()
    expect(body).toMatch(/^User-agent: \*$/m)
    expect(body).toMatch(/^Disallow: \/$/m)
    // The authenticated surface is not carved into partial allows — one
    // blanket Disallow, nothing else in the policy body.
    expect(body.split('\n').filter(line => line.length > 0)).toEqual(['User-agent: *', 'Disallow: /'])
  })

  it('the trailing-slash variant serves the identical body', async () => {
    const app = await buildDashboardApp()
    const plain = await app.request('/robots.txt')
    const slashed = await app.request('/robots.txt/')
    expect(slashed.status).toBe(200)
    expect(await slashed.text()).toBe(await plain.text())
  })

  it('returns the identical body for an authenticated operator session', async () => {
    const anonApp = await buildDashboardApp()
    const anonRes = await anonApp.request('/robots.txt')
    const anonBody = await anonRes.text()

    const authedApp = await buildDashboardApp({operatorLogin: TEST_OPERATOR, cookieKey: TEST_KEY})
    const sm = new SessionManager(TEST_KEY)
    const cookieValue = sm.sign(TEST_OPERATOR)
    const authedRes = await authedApp.request('/robots.txt', {
      headers: {cookie: `session=${cookieValue}`},
    })
    expect(authedRes.status).toBe(200)
    expect(await authedRes.text()).toBe(anonBody)
  })

  it('a sibling path sharing the prefix is still auth-gated (proves this is not a prefix match)', async () => {
    // No operator configured — the app fails closed: an unrecognized protected
    // path returns 401, not the policy document.
    const app = await buildDashboardApp()
    const res = await app.request('/robots-policy-internal.txt')
    expect(res.status).not.toBe(200)
    expect(res.status).toBe(401)
  })

  it('stays public when the operator-UI and fixture-harness flags are off', async () => {
    const app = await buildDashboardApp({operatorUiEnabled: false, fixtureHarnessEnabled: false})
    const res = await app.request('/robots.txt')
    expect(res.status).toBe(200)
  })

  it('unknown paths keep the 302-to-auth catch-all (the allowlist boundary did not widen)', async () => {
    const app = await buildDashboardApp({operatorLogin: TEST_OPERATOR, cookieKey: TEST_KEY})
    const res = await app.request('/not-a-real-route')
    expect([302, 303]).toContain(res.status)
    expect(res.headers.get('location')).toContain('/auth/login')
  })
})
