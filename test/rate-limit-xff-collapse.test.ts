/**
 * rm-183 / rm-1984 — XFF-collapse detector (quorum-armed, log-once) for the
 * default limiter topology.
 *
 * Unit level (observeXffCollapse): the detector spends its one warning only
 * on a QUORUM of distinct X-Forwarded-For fingerprints — three distinct
 * values at ONE direct address (same-address), or a pair of distinct values
 * at each of TWO direct addresses (cross-address). Adversarial core (rm-1984):
 * one direct client sits at one direct address, so a single address forging
 * two distinct XFF values — the pre-rm-1984 trip wire, burnable by any
 * unauthenticated client — arms nothing; XFF remains client-forgeable end to
 * end (RFC 7239 section 8.1), which is why the warning text and the runbook
 * both demand out-of-band corroboration. Bookkeeping stays bounded (capped
 * per-address fingerprint sets, capped address table, truncated samples);
 * blank XFF values and differences beyond the truncation window never fire.
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

describe('XFF-collapse detector, unit level (rm-183 quorum-armed by rm-1984)', () => {
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

  it('ADVERSARIAL (rm-1984): a single address forging two distinct XFF values never fires — the pre-rm-1984 trip wire is dead', () => {
    // One client, one direct address, TWO forged fingerprints (including
    // sustained oscillation between them): under the pre-rm-1984 detector
    // this burned the once-per-process warning; the quorum leaves it inert.
    expect(observeXffCollapse(PROXY_A, CLIENT_1)).toBeNull()
    expect(observeXffCollapse(PROXY_A, CLIENT_2)).toBeNull()
    expect(observeXffCollapse(PROXY_A, CLIENT_1)).toBeNull()
    expect(observeXffCollapse(PROXY_A, CLIENT_2)).toBeNull()
    expect(observeXffCollapse(PROXY_A, CLIENT_1)).toBeNull()
    expect(xffCollapseTrackedKeys()).toBe(1)
  })

  it('same-address quorum: a THIRD distinct fingerprint at one direct address fires EXACTLY ONCE per process', () => {
    expect(observeXffCollapse(PROXY_A, CLIENT_1)).toBeNull()
    expect(observeXffCollapse(PROXY_A, CLIENT_2)).toBeNull() // pair alone arms nothing
    const detected = observeXffCollapse(PROXY_A, '192.0.2.50')
    expect(detected).not.toBeNull()
    expect(detected?.directAddress).toBe(PROXY_A)
    expect(detected?.firstXff).toBe(CLIENT_1)
    expect(detected?.secondXff).toBe('192.0.2.50')
    expect(detected?.trigger).toBe('same-address')
    // Log-once: EVERYTHING after the first detection is null — same address
    // with further values, other addresses collapsing, repeat observations.
    expect(observeXffCollapse(PROXY_A, '192.0.2.51')).toBeNull()
    expect(observeXffCollapse('10.0.0.8', '192.0.2.52')).toBeNull()
    expect(observeXffCollapse('10.0.0.8', '192.0.2.53')).toBeNull()
    expect(observeXffCollapse('10.0.0.8', '192.0.2.54')).toBeNull()
    expect(observeXffCollapse(PROXY_A, CLIENT_2)).toBeNull()
    expect(xffCollapseTrackedKeys()).toBe(0)
  })

  it('cross-address quorum: a fingerprint PAIR at each of two distinct direct addresses fires; one paired address alone does not', () => {
    // Address one shows a pair — a single client could be sitting there
    // forging exactly this, so it arms nothing.
    expect(observeXffCollapse('10.0.0.1', CLIENT_1)).toBeNull()
    expect(observeXffCollapse('10.0.0.1', CLIENT_2)).toBeNull()
    expect(xffCollapseTrackedKeys()).toBe(1)
    // A SECOND address reaching its own pair is corroboration a single
    // client cannot produce — this fires (rm-1984 cross-address quorum).
    expect(observeXffCollapse('10.0.0.2', '192.0.2.10')).toBeNull()
    const detected = observeXffCollapse('10.0.0.2', '192.0.2.11')
    expect(detected).not.toBeNull()
    expect(detected?.directAddress).toBe('10.0.0.2')
    expect(detected?.firstXff).toBe('192.0.2.10')
    expect(detected?.secondXff).toBe('192.0.2.11')
    expect(detected?.trigger).toBe('cross-address')
    // Log-once: the detector is spent for the process.
    expect(observeXffCollapse('10.0.0.3', '192.0.2.20')).toBeNull()
    expect(observeXffCollapse('10.0.0.3', '192.0.2.21')).toBeNull()
    expect(xffCollapseTrackedKeys()).toBe(0)
  })

  it('an appending chain still fires at the quorum: the forwarded value varies with the real client', () => {
    // Behind an appending proxy the header is `client, proxy, ...` — the
    // full-string fingerprint still differs per client, which is the
    // misconfiguration the detector exists to surface.
    expect(observeXffCollapse(PROXY_A, `${CLIENT_1}, 10.0.0.7`)).toBeNull()
    expect(observeXffCollapse(PROXY_A, `${CLIENT_2}, 10.0.0.7`)).toBeNull()
    expect(observeXffCollapse(PROXY_A, '192.0.2.70, 10.0.0.7')).not.toBeNull()
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

  it('bounded per address: a forged pair oscillating forever arms nothing', () => {
    // A pair at one address sits below the same-address quorum — further
    // repeats and oscillation between the SAME two fingerprints cannot arm
    // anything, so the per-address fingerprint set stays at two samples.
    expect(observeXffCollapse(PROXY_A, CLIENT_1)).toBeNull()
    expect(observeXffCollapse(PROXY_A, CLIENT_2)).toBeNull()
    for (let i = 0; i < 5; i++) {
      expect(observeXffCollapse(PROXY_A, i % 2 === 0 ? CLIENT_1 : CLIENT_2)).toBeNull()
    }
    expect(xffCollapseTrackedKeys()).toBe(1)
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

  it('ADVERSARIAL (rm-1984): default topology, two distinct XFF values → NO warning, requests still allowed', async () => {
    const app = await buildTestApp()
    const first = await app.request('/api/healthz', {headers: {'x-forwarded-for': CLIENT_1}})
    expect(first.status).toBe(200)
    const second = await app.request('/api/healthz', {headers: {'x-forwarded-for': CLIENT_2}})
    expect(second.status).toBe(200)
    // The pre-rm-1984 detector burned its only warning here; the quorum
    // holds the warning back for corroborated evidence.
    expect(collapseWarnings()).toHaveLength(0)
  })

  it('default topology: three distinct XFF values (same-address quorum) → exactly one collapse warning, requests still allowed', async () => {
    const app = await buildTestApp()
    const first = await app.request('/api/healthz', {headers: {'x-forwarded-for': CLIENT_1}})
    expect(first.status).toBe(200)
    const second = await app.request('/api/healthz', {headers: {'x-forwarded-for': CLIENT_2}})
    expect(second.status).toBe(200) // collapse signals misconfiguration, not client fault
    expect(collapseWarnings()).toHaveLength(0)
    const third = await app.request('/api/healthz', {headers: {'x-forwarded-for': '192.0.2.99'}})
    expect(third.status).toBe(200)

    const collapses = collapseWarnings()
    expect(collapses).toHaveLength(1)
    const payload = (collapses[0]?.[1] ?? {}) as {
      directAddress?: string
      firstXff?: string
      secondXff?: string
      trigger?: string
    }
    expect(payload.firstXff).toBe(CLIENT_1)
    expect(payload.secondXff).toBe('192.0.2.99')
    expect(payload.trigger).toBe('same-address')
    // In the test context getConnInfo throws, so the direct address is the
    // shared fallback — still a single shared bucket, which is the point.
    expect(payload.directAddress).toBe('unknown')

    // Log-once at the middleware too: a fourth distinct client re-warns nothing.
    const fourth = await app.request('/api/healthz', {headers: {'x-forwarded-for': '192.0.2.100'}})
    expect(fourth.status).toBe(200)
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
