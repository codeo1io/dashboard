/**
 * rm-129 review-fix (F2b/F6/F7) — the rate limiter's env config surface.
 *
 * Pins the env contract actually implemented (house convention): valid
 * overrides are honored; INVALID values fall back to the default budget
 * (envIntOrDefault — the acceptance's "fail-fast" wording was deliberately
 * NOT adopted, recorded on the rm-129 ROADMAP line); and
 * RATE_LIMIT_TRUSTED_PROXY enables first-hop XFF keying only on
 * {1,true,yes} case-insensitive, with the first-hop key capped at 64 chars
 * (bounded keyspace — rotating overlong tokens cannot grow rateLimitMap
 * without bound inside the window).
 *
 * Env-derived constants are read at module scope, so each case re-imports a
 * fresh module instance (vi.resetModules + dynamic import) with the env set.
 */
import type {buildDashboardApp} from '../src/server.ts'
import {Buffer} from 'node:buffer'
import process from 'node:process'
import {afterEach, describe, expect, it, vi} from 'vitest'

const TEST_KEY = Buffer.from('testkey-ABCDEFGHIJKLMNOPQRSTUV12', 'utf8') // 32 bytes

type DashboardApp = Awaited<ReturnType<typeof buildDashboardApp>>

const ENV_KEYS = [
  'RATE_LIMIT_MAX_PUBLIC',
  'RATE_LIMIT_MAX_OPERATOR',
  'RATE_LIMIT_MAX_INGEST',
  'RATE_LIMIT_TRUSTED_PROXY',
] as const

async function importFreshServer() {
  vi.resetModules()
  return import('../src/server.ts')
}

/** One request to the public class (/api/healthz), optionally with an XFF. */
async function hit(app: DashboardApp, xff?: string): Promise<number> {
  const headers = xff === undefined ? {} : {'x-forwarded-for': xff}
  const res = await app.request('/api/healthz', {headers})
  return res.status
}

afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key]
})

describe('rate-limit env config surface (rm-129 review fix)', () => {
  it('valid override: RATE_LIMIT_MAX_PUBLIC=3 throttles the 4th public request', async () => {
    process.env.RATE_LIMIT_MAX_PUBLIC = '3'
    const {buildDashboardApp, resetRateLimitForTesting} = await importFreshServer()
    const app = await buildDashboardApp({operatorLogin: 'octocat', cookieKey: TEST_KEY})
    expect(await hit(app)).not.toBe(429)
    expect(await hit(app)).not.toBe(429)
    expect(await hit(app)).not.toBe(429)
    expect(await hit(app)).toBe(429)
    resetRateLimitForTesting()
  })

  it('invalid values fall back to the default budget (house env convention)', async () => {
    for (const bad of ['abc', '0', '-5', '   ', '12abc', '3.5']) {
      process.env.RATE_LIMIT_MAX_PUBLIC = bad
      const {buildDashboardApp, resetRateLimitForTesting} = await importFreshServer()
      const app = await buildDashboardApp({operatorLogin: 'octocat', cookieKey: TEST_KEY})
      // Whole-string integer semantics (rm-180): partial prefixes like '12abc'
      // or '3.5' must NOT parse as 12/3 — they fall back like every other
      // invalid value. Default budget is 60/min: a burst of 10 never throttles.
      for (let i = 0; i < 10; i++) {
        expect(await hit(app)).not.toBe(429)
      }
      resetRateLimitForTesting()
      delete process.env.RATE_LIMIT_MAX_PUBLIC
    }
  })

  it('RATE_LIMIT_TRUSTED_PROXY enables XFF keying on {1,true,yes} case-insensitive', async () => {
    process.env.RATE_LIMIT_MAX_PUBLIC = '2'
    process.env.RATE_LIMIT_TRUSTED_PROXY = 'YES'
    const {buildDashboardApp, resetRateLimitForTesting} = await importFreshServer()
    const app = await buildDashboardApp({operatorLogin: 'octocat', cookieKey: TEST_KEY})
    expect(await hit(app, '9.9.9.9')).not.toBe(429)
    expect(await hit(app, '9.9.9.9')).not.toBe(429)
    expect(await hit(app, '9.9.9.9')).toBe(429) // that client's budget exhausted
    expect(await hit(app, '8.8.8.8')).not.toBe(429) // different client, fresh bucket
    resetRateLimitForTesting()
  })

  it('any other value (or unset) leaves XFF ignored — spoof-safe default', async () => {
    process.env.RATE_LIMIT_MAX_PUBLIC = '2'
    process.env.RATE_LIMIT_TRUSTED_PROXY = 'maybe'
    const {buildDashboardApp, resetRateLimitForTesting} = await importFreshServer()
    const app = await buildDashboardApp({operatorLogin: 'octocat', cookieKey: TEST_KEY})
    expect(await hit(app, '9.9.9.9')).not.toBe(429)
    expect(await hit(app, '9.9.9.9')).not.toBe(429)
    // Still the SAME direct-address bucket regardless of the spoofed XFF.
    expect(await hit(app, '8.8.8.8')).toBe(429)
    resetRateLimitForTesting()
  })

  it('trusted-proxy keys are capped at 64 chars: overlong tokens collapse to one bucket', async () => {
    process.env.RATE_LIMIT_MAX_PUBLIC = '2'
    process.env.RATE_LIMIT_TRUSTED_PROXY = '1'
    const {buildDashboardApp, resetRateLimitForTesting} = await importFreshServer()
    const app = await buildDashboardApp({operatorLogin: 'octocat', cookieKey: TEST_KEY})
    const long1 = 'a'.repeat(200)
    const long2 = 'a'.repeat(300) // same 64-char prefix → same capped key
    const within = 'a'.repeat(63).concat('b') // differs inside the cap → distinct key
    expect(await hit(app, long1)).not.toBe(429)
    expect(await hit(app, long1)).not.toBe(429)
    expect(await hit(app, long2)).toBe(429)
    expect(await hit(app, within)).not.toBe(429)
    resetRateLimitForTesting()
  })
})
