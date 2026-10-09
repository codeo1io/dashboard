/**
 * rm-741 — Retry-After on every limiter 429 (client-facing rate-limit truth).
 * Locks two properties:
 * 1. UNIT: the seconds-to-window-reset computation is the integer ceiling of
 *    the shared fixed window's remaining time, clamped to at least 1 — so a
 *    client can never be told to retry in 0 or negative seconds, and never
 *    more than the full window.
 * 2. MIDDLEWARE: the 429 emitted by the shared limiter (src/server.ts, the
 *    single rate-limit middleware site) carries a Retry-After header for EACH
 *    of the three budget classes (public / operator / ingest), as an integer
 *    string within [1, RATE_LIMIT_WINDOW_MS / 1000].
 *
 * Companion to rate-limit-class.test.ts (rm-129 class isolation) and
 * rate-limit-config.test.ts (env overrides). The unit half pins the exact
 * arithmetic because the middleware half cannot observe sub-second timing
 * deterministically.
 */
import {Buffer} from 'node:buffer'
import {afterEach, describe, expect, it} from 'vitest'
import {
  buildDashboardApp,
  checkRateLimit,
  rateLimitRetryAfterSeconds,
  resetRateLimitForTesting,
} from '../src/server.ts'

const TEST_KEY = Buffer.from('testkey-ABCDEFGHIJKLMNOPQRSTUV12', 'utf8') // 32 bytes

async function buildTestApp() {
  return buildDashboardApp({
    operatorLogin: 'octocat',
    cookieKey: TEST_KEY,
  })
}

afterEach(() => {
  resetRateLimitForTesting()
})

/** Asserts the Retry-After contract on a 429 response and returns its value. */
function expectRetryAfterContract(response: Response): number {
  const raw = response.headers.get('retry-after')
  expect(raw, '429 responses from the shared limiter must carry Retry-After (rm-741)').not.toBeNull()
  expect(raw).toMatch(/^\d+$/) // integer seconds — never fractional
  const value = Number(raw)
  expect(value).toBeGreaterThanOrEqual(1)
  expect(value).toBeLessThanOrEqual(60) // RATE_LIMIT_WINDOW_MS default 60_000ms
  return value
}

describe('rm-741 unit: integer ceil-seconds to fixed-window reset', () => {
  it('fresh window reports the full window (60s)', () => {
    const ip = 'retry-after-unit-fresh'
    const t0 = 1_700_000_000_000
    expect(checkRateLimit(ip, t0, 'public')).toBe(true) // creates the window entry
    expect(rateLimitRetryAfterSeconds(ip, t0)).toBe(60)
  })

  it('partial remaining time rounds UP to the next whole second', () => {
    const ip = 'retry-after-unit-ceil'
    const t0 = 1_700_000_000_000
    checkRateLimit(ip, t0, 'operator')
    // 500ms remaining → 1s (ceil of 0.5)
    expect(rateLimitRetryAfterSeconds(ip, t0 + 59_500)).toBe(1)
    // 59_999ms remaining → 60s (ceil of 59.999)
    expect(rateLimitRetryAfterSeconds(ip, t0 + 1)).toBe(60)
  })

  it('at or past the window edge the answer is clamped to 1s, never 0 or negative', () => {
    const ip = 'retry-after-unit-clamp'
    const t0 = 1_700_000_000_000
    checkRateLimit(ip, t0, 'ingest')
    expect(rateLimitRetryAfterSeconds(ip, t0 + 60_000)).toBe(1) // exactly expired
    expect(rateLimitRetryAfterSeconds(ip, t0 + 61_000)).toBe(1) // swept-but-present stale edge
  })

  it('a key with no window entry (rm-286 capacity fail-closed denial) answers the minimal 1s', () => {
    expect(rateLimitRetryAfterSeconds('never-seen-key', 1_700_000_000_000)).toBe(1)
  })
})

describe('rm-741 middleware: every class 429 carries Retry-After', () => {
  it('public class: 61st /auth/login 429s with an integer Retry-After in [1, 60]', async () => {
    const app = await buildTestApp()
    for (let i = 0; i < 60; i++) {
      const res = await app.request('/auth/login')
      expect(res.status).not.toBe(429)
    }
    const blocked = await app.request('/auth/login')
    expect(blocked.status).toBe(429)
    expectRetryAfterContract(blocked)
  })

  it('operator class: 61st /api/status 429s with an integer Retry-After in [1, 60]', async () => {
    const app = await buildTestApp()
    for (let i = 0; i < 60; i++) {
      const res = await app.request('/api/status')
      expect(res.status).not.toBe(429) // 302 auth redirect, but limiter-counted
    }
    const blocked = await app.request('/api/status')
    expect(blocked.status).toBe(429)
    expectRetryAfterContract(blocked)
  })

  it('ingest class: 61st /api/listener/ingest 429s with an integer Retry-After in [1, 60]', async () => {
    const app = await buildTestApp()
    for (let i = 0; i < 60; i++) {
      const res = await app.request('/api/listener/ingest', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({events: []}),
      })
      expect(res.status).not.toBe(429) // 401 HMAC failure, but limiter-counted
    }
    const blocked = await app.request('/api/listener/ingest', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({events: []}),
    })
    expect(blocked.status).toBe(429)
    expectRetryAfterContract(blocked)
  })

  it('repeated denials within the same window never exceed the full window or drop below 1s', async () => {
    const app = await buildTestApp()
    for (let i = 0; i < 60; i++) await app.request('/auth/login')
    const first = await app.request('/auth/login')
    expectRetryAfterContract(first)
    const second = await app.request('/auth/login')
    const value = expectRetryAfterContract(second)
    // Same window: the answer is the full-window bound while the flood is
    // instantaneous (sub-second elapsed), i.e. exactly 60.
    expect(value).toBe(60)
  })
})
