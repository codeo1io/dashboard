/**
 * rm-183 — XFF-collapse detector (log-once) for the default limiter topology.
 *
 * Unit level (observeXffCollapse): the detector fires exactly ONCE per process
 * on the first observation of two distinct X-Forwarded-For fingerprints against
 * the same direct address; its bookkeeping is bounded (one sample per tracked
 * address, capped address table, truncated fingerprints); blank XFF values and
 * XFF differences beyond the sample truncation window never fire it.
 *
 * Middleware level: the detector is wired ONLY into the default
 * (rateLimitTrustedProxy=off) path of the limiter middleware, never into
 * trusted-proxy keying; the warning is a log-once `logger.warning` that does
 * not reject the request (collapse is a misconfiguration signal, not a client
 * fault).
 */
import type {GitHubOAuthClient} from '../src/auth/oauth.ts'
import type {LogContext} from '../src/logger.ts'
import {Buffer} from 'node:buffer'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {logger} from '../src/logger.ts'
import {
  buildDashboardApp,
  observeXffCollapse,
  resetRateLimitForTesting,
  resetXffCollapseForTesting,
  xffCollapseTrackedKeys,
} from '../src/server.ts'

const PROXY_A = '10.0.0.7'
const CLIENT_1 = '203.0.113.9'
const CLIENT_2 = '198.51.100.7'

describe('XFF-collapse detector, unit level (rm-183)', () => {
  beforeEach(() => {
    resetXffCollapseForTesting()
  })

  afterEach(() => {
    resetXffCollapseForTesting()
  })

  it('a single client behind the proxy (constant XFF) never fires', () => {
    for (let i = 0; i < 5; i++) {
      expect(observeXffCollapse(PROXY_A, CLIENT_1)).toBeNull()
    }
    expect(xffCollapseTrackedKeys()).toBe(1)
  })

  it('two distinct XFF values at one direct address fire EXACTLY ONCE per process', () => {
    expect(observeXffCollapse(PROXY_A, CLIENT_1)).toBeNull()
    const detected = observeXffCollapse(PROXY_A, CLIENT_2)
    expect(detected).not.toBeNull()
    expect(detected?.directAddress).toBe(PROXY_A)
    expect(detected?.firstXff).toBe(CLIENT_1)
    expect(detected?.secondXff).toBe(CLIENT_2)
    // Log-once: EVERYTHING after the first detection is null — same address
    // with further values, other addresses collapsing, repeat observations.
    expect(observeXffCollapse(PROXY_A, '192.0.2.50')).toBeNull()
    expect(observeXffCollapse('10.0.0.8', '192.0.2.51')).toBeNull()
    expect(observeXffCollapse('10.0.0.8', '192.0.2.52')).toBeNull()
    expect(observeXffCollapse(PROXY_A, CLIENT_2)).toBeNull()
    expect(xffCollapseTrackedKeys()).toBe(0)
  })

  it('distinct direct addresses each keep their own first sample — no cross-address firing', () => {
    expect(observeXffCollapse('10.0.0.1', CLIENT_1)).toBeNull()
    expect(observeXffCollapse('10.0.0.2', CLIENT_2)).toBeNull()
    expect(observeXffCollapse('10.0.0.3', '192.0.2.10')).toBeNull()
    expect(xffCollapseTrackedKeys()).toBe(3)
    // Each address still only collapses on ITS OWN second distinct value.
    expect(observeXffCollapse('10.0.0.2', CLIENT_1)).not.toBeNull()
    expect(observeXffCollapse('10.0.0.1', CLIENT_2)).toBeNull()
  })

  it('an appending chain still fires: the forwarded value varies with the real client', () => {
    // Behind an appending proxy the header is `client, proxy, ...` — the
    // full-string fingerprint still differs per client, which is the
    // misconfiguration the detector exists to surface.
    expect(observeXffCollapse(PROXY_A, `${CLIENT_1}, 10.0.0.7`)).toBeNull()
    expect(observeXffCollapse(PROXY_A, `${CLIENT_2}, 10.0.0.7`)).not.toBeNull()
  })

  it('blank/whitespace-only XFF never fires and never tracks', () => {
    expect(observeXffCollapse(PROXY_A, '')).toBeNull()
    expect(observeXffCollapse(PROXY_A, '   ')).toBeNull()
    expect(xffCollapseTrackedKeys()).toBe(0)
  })

  it('fingerprints are truncated — differences beyond the sample window are not a collapse signal', () => {
    const long1 = `${CLIENT_1},${'10.0.0.'.repeat(30)}1`
    const long2 = `${CLIENT_1},${'10.0.0.'.repeat(30)}2`
    expect(observeXffCollapse(PROXY_A, long1)).toBeNull()
    // Differ only past the truncation window → same fingerprint → no fire.
    expect(observeXffCollapse(PROXY_A, long2)).toBeNull()
  })

  it('the tracked-address table is bounded — untracked addresses cannot fire the detector', () => {
    // Fill the address table (cap-agnostic: stop when tracking stops growing).
    let previous = -1
    let i = 0
    while (xffCollapseTrackedKeys() !== previous && i < 10_000) {
      previous = xffCollapseTrackedKeys()
      observeXffCollapse(`10.1.${Math.floor(i / 250)}.${i % 250}`, '192.0.2.1')
      i++
    }
    expect(i).toBeLessThan(10_000)
    const cappedAt = xffCollapseTrackedKeys()
    // One more distinct address with two distinct XFF values: untracked, so
    // the detector stays silent (bounded memory beats completeness).
    const beyond = `10.9.${Math.floor(i / 250)}.${i % 250}`
    expect(observeXffCollapse(beyond, CLIENT_1)).toBeNull()
    expect(observeXffCollapse(beyond, CLIENT_2)).toBeNull()
    expect(xffCollapseTrackedKeys()).toBe(cappedAt)
  })
})

// ---------------------------------------------------------------------------
// Middleware level — default vs trusted-proxy topology
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

async function buildTestApp(overrides: Record<string, unknown> = {}) {
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
    ...overrides,
  })
}

describe('XFF-collapse detector, middleware wiring (rm-183)', () => {
  // Capturing stand-in for logger.warning — typed records, no spy typing
  // gymnastics over the Logger interface's readonly members.
  const warningCalls: [string, LogContext | undefined][] = []
  const realWarning = logger.warning

  beforeEach(() => {
    resetXffCollapseForTesting()
    resetRateLimitForTesting()
    warningCalls.length = 0
    ;(logger as unknown as {warning: typeof logger.warning}).warning = (message, context) => {
      warningCalls.push([message, context])
    }
  })

  afterEach(() => {
    resetXffCollapseForTesting()
    resetRateLimitForTesting()
    ;(logger as unknown as {warning: typeof logger.warning}).warning = realWarning
  })

  /** Recorded rows that carry the rm-183 collapse warning. */
  const collapseWarnings = (): [string, LogContext | undefined][] =>
    warningCalls.filter(([message]) => message.includes('Rate limiter client collapse'))

  it('default topology: two distinct XFF values → exactly one collapse warning, requests still allowed', async () => {
    const app = await buildTestApp()
    const first = await app.request('/api/healthz', {headers: {'x-forwarded-for': CLIENT_1}})
    expect(first.status).toBe(200)
    const second = await app.request('/api/healthz', {headers: {'x-forwarded-for': CLIENT_2}})
    expect(second.status).toBe(200) // collapse signals misconfiguration, not client fault

    const collapses = collapseWarnings()
    expect(collapses).toHaveLength(1)
    const payload = (collapses[0]?.[1] ?? {}) as {directAddress?: string; firstXff?: string; secondXff?: string}
    expect(payload.firstXff).toBe(CLIENT_1)
    expect(payload.secondXff).toBe(CLIENT_2)
    // In the test context getConnInfo throws, so the direct address is the
    // shared fallback — still a single shared bucket, which is the point.
    expect(payload.directAddress).toBe('unknown')

    // Log-once at the middleware too: a third distinct client re-warns nothing.
    const third = await app.request('/api/healthz', {headers: {'x-forwarded-for': '192.0.2.99'}})
    expect(third.status).toBe(200)
    expect(collapseWarnings()).toHaveLength(1)
  })

  it('default topology without XFF: no detector activity at all', async () => {
    const app = await buildTestApp()
    await app.request('/api/healthz')
    await app.request('/api/healthz')
    expect(collapseWarnings()).toHaveLength(0)
  })

  it('trusted-proxy topology: XFF is the KEY, so the detector never runs', async () => {
    const app = await buildTestApp({rateLimitTrustedProxy: true})
    await app.request('/api/healthz', {headers: {'x-forwarded-for': CLIENT_1}})
    await app.request('/api/healthz', {headers: {'x-forwarded-for': CLIENT_2}})
    expect(collapseWarnings()).toHaveLength(0)
    // And unit-level state stayed untouched by the trusted requests.
    expect(xffCollapseTrackedKeys()).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// rm-1979 — runbook truth pin: prose cannot drift from the detector
// ---------------------------------------------------------------------------
// docs/runbooks/gateway-access.md once claimed "one client alone cannot fire
// (or verify) the detector" — false in the default topology, where the
// fingerprint reads the client-suppliable X-Forwarded-For header (the
// middleware test above proves it fires from ONE client). The runbook now
// carries the spoofing caveat plus the recorded hardening decision; this
// guard pins BOTH sides of the claim so prose and code cannot drift apart.

describe('rm-1979 — runbook XFF truth pin', () => {
  const runbook = readFileSync(resolve(process.cwd(), 'docs/runbooks/gateway-access.md'), 'utf8')

  it('behavioral side: ONE client sending two XFF values fires the warning (default topology)', async () => {
    resetXffCollapseForTesting()
    resetRateLimitForTesting()
    const warningCalls: [string, LogContext | undefined][] = []
    const realWarning = logger.warning
    ;(logger as unknown as {warning: typeof logger.warning}).warning = (message, context) => {
      warningCalls.push([message, context])
    }
    try {
      const app = await buildTestApp()
      const first = await app.request('/api/healthz', {headers: {'x-forwarded-for': CLIENT_1}})
      expect(first.status).toBe(200)
      const second = await app.request('/api/healthz', {headers: {'x-forwarded-for': CLIENT_2}})
      expect(second.status).toBe(200) // one client, two spoofed header values

      const collapses = warningCalls.filter(([message]) => message.includes('Rate limiter client collapse'))
      expect(collapses).toHaveLength(1)
    } finally {
      ;(logger as unknown as {warning: typeof logger.warning}).warning = realWarning
      resetXffCollapseForTesting()
      resetRateLimitForTesting()
    }
  })

  it('prose side: the spoofing caveat is present and the false single-source claim is gone', () => {
    expect(runbook).toMatch(/Spoofing caveat \(rm-1979\)/)
    expect(runbook).toMatch(/misconfiguration OR spoofing/)
    expect(runbook).toMatch(/RATE_LIMIT_TRUSTED_PROXY=1/)
    // The rm-183-era false claim, verbatim — its return is the drift this guard exists to catch.
    expect(runbook, 'the runbook must not claim a lone client cannot fire the detector').not.toMatch(
      /one client alone cannot fire/,
    )
    expect(runbook).not.toMatch(/a single source can never produce two distinct forwarded values/)
  })

  it('the hardening decision is recorded beside the caveat (accepted as bounded log noise)', () => {
    expect(runbook).toMatch(/Hardening decision \(rm-1979\)/)
    expect(runbook).toMatch(/bounded log noise/)
  })
})
