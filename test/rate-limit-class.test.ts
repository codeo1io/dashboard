/**
 * rm-129 — path-class rate-limit budgets + trusted-proxy re-key.
 * Locks two properties:
 * 1. Class isolation: a flood exhausting one path class (public / operator /
 *    ingest) leaves the other classes' budgets untouched — the operator
 *    surface cannot be starved by flooding the pre-auth surface (assess F1).
 * 2. X-Forwarded-For is IGNORED unless the trusted-proxy opt-in is enabled;
 *    when enabled, the limiter keys on the FIRST XFF hop (proxy-reported
 *    client), so different clients get independent buckets.
 *
 * Companion to the legacy-bucket tests in auth.test.ts ("FIX 3" / "FIX P1+P2"),
 * which pin the unclassified checkRateLimit semantics this implementation
 * preserves (bare calls count against every class budget).
 */
import {Buffer} from 'node:buffer'
import {afterEach, describe, expect, it} from 'vitest'
import {buildDashboardApp, checkRateLimit, classifyRateLimitPath, resetRateLimitForTesting} from '../src/server.ts'

const TEST_KEY = Buffer.from('testkey-ABCDEFGHIJKLMNOPQRSTUV12', 'utf8') // 32 bytes

async function buildTestApp(rateLimitTrustedProxy?: boolean) {
  return buildDashboardApp({
    operatorLogin: 'octocat',
    cookieKey: TEST_KEY,
    ...(rateLimitTrustedProxy === undefined ? {} : {rateLimitTrustedProxy}),
  })
}

afterEach(() => {
  resetRateLimitForTesting()
})

describe('classifyRateLimitPath', () => {
  it('maps the sensitive surface onto the three budget classes', () => {
    expect(classifyRateLimitPath('/')).toBe('public')
    expect(classifyRateLimitPath('/api/healthz')).toBe('public')
    expect(classifyRateLimitPath('/auth/login')).toBe('public')
    expect(classifyRateLimitPath('/auth/callback')).toBe('public')
    expect(classifyRateLimitPath('/api/listener/ingest')).toBe('ingest')
    expect(classifyRateLimitPath('/operator')).toBe('operator')
    expect(classifyRateLimitPath('/operator/runs')).toBe('operator')
    expect(classifyRateLimitPath('/api/status')).toBe('operator')
    expect(classifyRateLimitPath('/api/listener/messages')).toBe('operator')
  })
})

describe('rm-129: per-class budget isolation (checkRateLimit unit)', () => {
  it('exhausting one class does not consume another class budget', () => {
    const ip = 'isolate-unit-ip'
    const now = Date.now()
    for (let i = 0; i < 60; i++) {
      expect(checkRateLimit(ip, now, 'public')).toBe(true)
    }
    expect(checkRateLimit(ip, now, 'public')).toBe(false) // public exhausted
    expect(checkRateLimit(ip, now, 'operator')).toBe(true) // operator untouched
    expect(checkRateLimit(ip, now, 'ingest')).toBe(true) // ingest untouched
  })

  it('window expiry resets every class counter', () => {
    const ip = 'isolate-reset-ip'
    const now = Date.now()
    for (let i = 0; i < 60; i++) checkRateLimit(ip, now, 'public')
    expect(checkRateLimit(ip, now, 'public')).toBe(false)
    expect(checkRateLimit(ip, now + 60_001, 'public')).toBe(true)
  })
})

describe('rm-129: flood on public cannot starve the operator surface (middleware)', () => {
  it('61st public request 429s while the operator API stays available', async () => {
    const app = await buildTestApp()
    // Flood the public pre-auth surface (test context: remote address is
    // 'unknown' for every request — exactly the shared-egress scenario).
    for (let i = 0; i < 60; i++) {
      const res = await app.request('/auth/login')
      expect(res.status).not.toBe(429)
    }
    expect((await app.request('/auth/login')).status).toBe(429)

    // Operator class: /api/status is auth-gated (302 login redirect) but NOT
    // rate-limited — the limiter must not add a 429 on top of the exhausted
    // public budget.
    const operatorRes = await app.request('/api/status')
    expect(operatorRes.status).not.toBe(429)
    expect(operatorRes.status).toBe(302)
  })

  it('flood on the ingest route does not starve the operator or public classes', async () => {
    const app = await buildTestApp()
    // /api/listener/ingest is HMAC-gated: requests fail auth (401) but every
    // attempt still consumes the ingest budget.
    for (let i = 0; i < 60; i++) {
      const res = await app.request('/api/listener/ingest', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({events: []}),
      })
      expect(res.status).not.toBe(429)
    }
    expect(
      (
        await app.request('/api/listener/ingest', {
          method: 'POST',
          headers: {'content-type': 'application/json'},
          body: JSON.stringify({events: []}),
        })
      ).status,
    ).toBe(429)

    // Both other classes still have their full budgets.
    expect((await app.request('/api/status')).status).toBe(302) // operator auth redirect, not 429
    expect((await app.request('/auth/login')).status).not.toBe(429) // public, not exhausted
  })

  it('flood on the operator API does not starve the public or ingest classes', async () => {
    const app = await buildTestApp()
    for (let i = 0; i < 60; i++) {
      await app.request('/api/status') // 401 each, counts against operator
    }
    expect((await app.request('/api/status')).status).toBe(429)

    expect((await app.request('/auth/login')).status).not.toBe(429)
    const ingestRes = await app.request('/api/listener/ingest', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({events: []}),
    })
    expect(ingestRes.status).not.toBe(429)
  })
})

describe('rm-129: X-Forwarded-For handling', () => {
  it('XFF is ignored by default — spoofed hops share the real remote-address bucket', async () => {
    const app = await buildTestApp() // trusted proxy OFF
    // 60 public requests all claiming a different XFF client. If the limiter
    // keyed on XFF, none of these would share a bucket and none would 429.
    for (let i = 0; i < 60; i++) {
      const res = await app.request('/auth/login', {headers: {'x-forwarded-for': `10.0.0.${i}`}})
      expect(res.status).not.toBe(429)
    }
    // A 61st request WITHOUT any XFF still shares the 'unknown' bucket → 429.
    // Proves the default keys on the remote address, not the spoofable header.
    expect((await app.request('/auth/login')).status).toBe(429)
  })

  it('trusted mode: first XFF hop is the key — distinct clients get distinct buckets', async () => {
    const app = await buildTestApp(true)
    for (let i = 0; i < 60; i++) {
      const res = await app.request('/auth/login', {headers: {'x-forwarded-for': '9.9.9.9, 10.0.0.1'}})
      expect(res.status).not.toBe(429)
    }
    // Same first hop (later hops differ — proxy-added) → still exhausted.
    expect(
      (await app.request('/auth/login', {headers: {'x-forwarded-for': '9.9.9.9, 10.0.0.2'}})).status,
    ).toBe(429)
    // Different first hop → independent bucket.
    expect(
      (await app.request('/auth/login', {headers: {'x-forwarded-for': '8.8.8.8, 10.0.0.1'}})).status,
    ).not.toBe(429)
  })

  it('trusted mode: absent/blank XFF falls back to the remote address', async () => {
    const app = await buildTestApp(true)
    for (let i = 0; i < 60; i++) {
      await app.request('/auth/login')
    }
    expect((await app.request('/auth/login')).status).toBe(429) // remote-address fallback bucket
  })
})
