/**
 * rm-642: devAutoLogin operator-visible truth, server side.
 *
 * Two observable contracts:
 *  1. Served SPA shell carries `<meta name="dev-auto-login" content="true">`
 *     exactly when devAutoLogin resolved active (same injected-config-meta
 *     pattern as push-enabled) — the SPA's persistent DevAuthMarker reads it.
 *  2. The boot banner tells the truth about what the bypass will do:
 *     - operator configured → "auth is bypassed" (the real Arctic auto-sign);
 *     - NO operator → fail-closed 401 outranks the bypass (never claim bypass);
 *     - gateway mode → the Arctic bypass is inert.
 */
import {Buffer} from 'node:buffer'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {logger} from '../src/logger.ts'
import {buildDashboardApp} from '../src/server.ts'
import {SessionManager} from '../src/session.ts'

const TEST_KEY = Buffer.from('testkey-ABCDEFGHIJKLMNOPQRSTUV12', 'utf8') // 32 bytes

const warningSpy = vi.spyOn(logger, 'warning')

afterEach(() => {
  warningSpy.mockClear()
})

describe('rm-642: dev-auto-login meta injection', () => {
  it("devAutoLogin boot serves '/' with the dev-auto-login meta (and no push meta when push is off)", async () => {
    const app = await buildDashboardApp({
      operatorLogin: 'octocat',
      cookieKey: TEST_KEY,
      devAutoLogin: true,
    })
    // devAutoLogin mints the session on the request itself.
    const res = await app.request('/')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('<meta name="dev-auto-login" content="true">')
    expect(html).not.toContain('push-enabled')
  })

  it("devAutoLogin OFF + push ON serves '/' with the push meta but NO dev-auto-login meta", async () => {
    const app = await buildDashboardApp({
      operatorLogin: 'octocat',
      cookieKey: TEST_KEY,
      pushNotificationsEnabled: true,
    })
    // No bypass here — authenticate the old-fashioned way (signed session
    // cookie, the auth.test.ts pattern).
    const sessionCookie = new SessionManager(TEST_KEY).sign('octocat')
    const res = await app.request('/', {headers: {cookie: `session=${sessionCookie}`}})
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('<meta name="push-enabled" content="true">')
    expect(html).not.toContain('dev-auto-login')
  })
})

describe('rm-642: truth-first boot banner', () => {
  it('operator configured → the banner claims the bypass (as before)', async () => {
    await buildDashboardApp({
      operatorLogin: 'octocat',
      cookieKey: TEST_KEY,
      devAutoLogin: true,
    })
    const messages = warningSpy.mock.calls.map(call => call[0])
    expect(messages).toContain('DEV AUTO-LOGIN ENABLED — auth is bypassed; never use in production')
  })

  it('NO operator configured → the banner states the fail-closed truth, never claims bypass', async () => {
    await buildDashboardApp({
      cookieKey: TEST_KEY,
      devAutoLogin: true,
    })
    const messages = warningSpy.mock.calls.map(call => call[0])
    expect(messages).toContain(
      'DEV AUTO-LOGIN enabled but NO OPERATOR configured — Arctic fail-closed 401 outranks the bypass; protected routes will 401',
    )
    expect(messages).not.toContain('DEV AUTO-LOGIN ENABLED — auth is bypassed; never use in production')
  })

  it('gateway mode → the banner states the bypass is inert', async () => {
    await buildDashboardApp({
      cookieKey: TEST_KEY,
      devAutoLogin: true,
      gatewayOperatorSessionEnabled: true,
      gatewayProxyAcknowledged: true, // rm-127: gateway mode refuses to start without the same-origin-proxy ack
    })
    const messages = warningSpy.mock.calls.map(call => call[0])
    expect(messages).toContain(
      'DEV AUTO-LOGIN requested but gateway operator-session mode is active — the Arctic bypass is inert; gateway session auth applies',
    )
    expect(messages).not.toContain('DEV AUTO-LOGIN ENABLED — auth is bypassed; never use in production')
  })
})
