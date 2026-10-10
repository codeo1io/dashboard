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
import {createHmac} from 'node:crypto'
import {afterEach, describe, expect, it} from 'vitest'
import {createListenerStore} from '../src/listener/store.ts'
import {
  buildDashboardApp,
  checkRateLimit,
  classifyRateLimitPath,
  rateLimitStoreSize,
  resetRateLimitForTesting,
} from '../src/server.ts'

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
  it('rm-269 divergence pin: static assets classify as operator but the middleware never asks', () => {
    // classifyRateLimitPath would fold /assets/*, /static/*, /privacy, /sw.js
    // into the operator class via its fallback — but the server.ts middleware
    // applies budgets only to its sensitive set, so these paths never reach
    // this classifier. Pinned here so the divergence is a recorded decision,
    // not an accident — the truth docstring lives at rm-262 in server.ts
    // (this pin is the convergent rm-269 survivor riding that item).
    for (const path of ['/assets/app.js', '/static/operator-stream.js', '/privacy', '/sw.js']) {
      expect(classifyRateLimitPath(path)).toBe('operator')
    }
  })
  it('maps the sensitive surface onto the three budget classes', () => {
    expect(classifyRateLimitPath('/')).toBe('public')
    expect(classifyRateLimitPath('/api/healthz')).toBe('public')
    expect(classifyRateLimitPath('/auth/login')).toBe('public')
    expect(classifyRateLimitPath('/auth/callback')).toBe('public')
    // rm-500: the logout pair is now INSIDE the sensitive gate, so this
    // /auth/ → public branch is finally reachable for it (previously the
    // gate filtered the pair out before classification ever ran).
    expect(classifyRateLimitPath('/auth/logout')).toBe('public')
    expect(classifyRateLimitPath('/auth/logout-csrf')).toBe('public')
    expect(classifyRateLimitPath('/api/listener/ingest')).toBe('ingest')
    expect(classifyRateLimitPath('/operator')).toBe('operator')
    expect(classifyRateLimitPath('/operator/runs')).toBe('operator')
    expect(classifyRateLimitPath('/api/status')).toBe('operator')
    expect(classifyRateLimitPath('/api/listener/messages')).toBe('operator')
  })
})

describe('rm-500: the logout pair is budget-gated in the public class', () => {
  // POST /auth/logout runs a bounded body read and GET /auth/logout-csrf
  // mints an HMAC token, both pre-auth; leaving them outside the sensitive
  // gate (rm-275's narration) handed an unauthenticated client an
  // unthrottled CPU/log vector. The recorded decision (see the gate comment
  // in src/server.ts and README's RATE_LIMIT_MAX_PUBLIC row) classifies the
  // pair into the PUBLIC budget.
  afterEach(() => {
    resetRateLimitForTesting()
  })

  it('the 61st POST /auth/logout inside the window 429s', async () => {
    const app = await buildTestApp()
    for (let i = 0; i < 60; i++) {
      const res = await app.request('/auth/logout', {
        method: 'POST',
        headers: {'content-type': 'application/x-www-form-urlencoded'},
        body: 'csrf_token=x',
      })
      // No valid CSRF token → 403 at the handler, but the limiter counted it.
      expect(res.status).toBe(403)
    }
    const blocked = await app.request('/auth/logout', {
      method: 'POST',
      headers: {'content-type': 'application/x-www-form-urlencoded'},
      body: 'csrf_token=x',
    })
    expect(blocked.status).toBe(429)
  })

  it('the 61st GET /auth/logout-csrf inside the window 429s (session-less hammering is capped)', async () => {
    const app = await buildTestApp()
    for (let i = 0; i < 60; i++) {
      const res = await app.request('/auth/logout-csrf')
      // Session-less → auth middleware denies, but the limiter counted it.
      expect([401, 302, 303]).toContain(res.status)
    }
    expect((await app.request('/auth/logout-csrf')).status).toBe(429)
  })

  it('the pair consumes the PUBLIC budget, not the operator budget (class isolation holds)', async () => {
    const app = await buildTestApp()
    for (let i = 0; i < 60; i++) {
      await app.request('/auth/logout', {
        method: 'POST',
        headers: {'content-type': 'application/x-www-form-urlencoded'},
        body: 'csrf_token=x',
      })
    }
    expect((await app.request('/auth/logout', {
      method: 'POST',
      headers: {'content-type': 'application/x-www-form-urlencoded'},
      body: 'csrf_token=x',
    })).status).toBe(429)
    // The operator class budget is untouched by the flood: /api/status
    // denies session-less callers (401/302/303), never 429.
    expect([401, 302, 303]).toContain((await app.request('/api/status')).status)
  })
})

describe('rm-262: static/asset paths are deliberately unthrottled', () => {
  it('static assets never hit the limiter and consume no operator budget', async () => {
    const app = await buildTestApp()
    // (a) A bulk of static requests is never limited, whatever the path shape
    // (these may 404 in the test fixture — the point is they never 429).
    for (const path of ['/static/operator-stream.js', '/assets/app.css', '/privacy']) {
      for (let i = 0; i < 12; i++) {
        const response = await app.request(path)
        expect(response.status).not.toBe(429)
      }
    }
    // (b) Measure how many operator-class calls (/api/status, session-less →
    // 401 but limiter-counted) fit in the budget AFTER the static bulk.
    const measureOperatorBudget = async () => {
      let calls = 0
      for (; calls < 120; calls++) {
        if ((await app.request('/api/status')).status === 429) return calls
      }
      throw new Error('operator budget never tripped within 120 calls')
    }
    const budgetAfterStaticBulk = await measureOperatorBudget()
    expect(budgetAfterStaticBulk).toBeGreaterThan(0)
    // (c) Re-measure on cleared budgets with NO static traffic first: if the
    // static bulk had consumed any operator budget, (b) would be strictly
    // smaller than (c).
    resetRateLimitForTesting()
    const cleanBudget = await measureOperatorBudget()
    expect(budgetAfterStaticBulk).toBe(cleanBudget)
    // (d) Static paths stay exempt even while the operator budget is
    // exhausted (the (c) flood just drained it).
    expect((await app.request('/static/operator-stream.js')).status).not.toBe(429)
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

  it('rm-904: an unauthenticated ingest flood never throttles — other classes stay independent', async () => {
    const app = await buildTestApp()
    // /api/listener/ingest is HMAC-gated. Pre-rm-904 every attempt consumed
    // the ingest budget BEFORE verification, so an unsigned flood exhausted
    // the budget and 429'd at the 61st request — letting a flood evict the
    // legitimate producer. rm-904 exempts ingest-class ADMISSIONS from
    // pre-verification counting entirely (the count happens only after the
    // route's HMAC verification succeeds, via deps.ingestRateLimit in
    // buildListenerRouter), so an unauthenticated flood is answered by the
    // auth gate itself (401 with a store mounted; 404 here because
    // buildTestApp mounts no listenerStore), never by the limiter:
    for (let i = 0; i < 72; i++) {
      const res = await app.request('/api/listener/ingest', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({events: []}),
      })
      expect(res.status).not.toBe(429)
    }

    // The flood consumed nothing: both other classes keep their full budgets.
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

function rm904GarbageSignatureHeaders(): Record<string, string> {
  return {
    'content-type': 'application/json',
    'x-listener-timestamp': String(Math.floor(Date.now() / 1000)),
    'x-listener-signature': 'sha256=deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
  }
}

describe('rm-904: ingest auth-before-ratelimit — auth-failed admissions are budget-exempt', () => {
  const INGEST_KEY = 'rm904-ingest-key-for-tests'
  const VALID_BODY = JSON.stringify({
    source: 'infra',
    kind: 'deploy-health',
    severity: 'warning',
    title: 'rm-904 flood probe',
    body: 'unsigned flood + verified producer regression for the ingest budget.',
    createdAt: '2026-10-10T12:00:00Z',
  })

  function signedHeaders(rawBody: string, timestamp = Math.floor(Date.now() / 1000)): Record<string, string> {
    const ts = String(timestamp)
    return {
      'content-type': 'application/json',
      'x-listener-timestamp': ts,
      'x-listener-signature': `sha256=${createHmac('sha256', INGEST_KEY).update(`${ts}.${rawBody}`).digest('hex')}`,
    }
  }

  async function buildIngestApp() {
    return buildDashboardApp({
      operatorLogin: 'octocat',
      cookieKey: TEST_KEY,
      listenerStore: createListenerStore(':memory:'),
      listenerIngestKey: INGEST_KEY,
    })
  }

  it('an unsigned/expired flood never 429s and never touches the rate-limit store (rm-286 cap unpressured)', async () => {
    const app = await buildIngestApp()
    for (let i = 0; i < 72; i++) {
      // Alternate bad-signature and expired-timestamp rejections — both are
      // auth failures and must stay exempt from budget consumption.
      const headers = i % 2 === 0 ? rm904GarbageSignatureHeaders() : signedHeaders(VALID_BODY, Math.floor(Date.now() / 1000) - 600)
      const res = await app.request('/api/listener/ingest', {method: 'POST', headers, body: VALID_BODY})
      expect(res.status).toBe(401)
    }
    expect(rateLimitStoreSize()).toBe(0)
  })

  it('the verified producer is unaffected by an unsigned flood from the same client', async () => {
    const app = await buildIngestApp()
    for (let i = 0; i < 72; i++) {
      const res = await app.request('/api/listener/ingest', {
        method: 'POST',
        headers: rm904GarbageSignatureHeaders(),
        body: VALID_BODY,
      })
      expect(res.status).toBe(401)
    }
    const res = await app.request('/api/listener/ingest', {
      method: 'POST',
      headers: signedHeaders(VALID_BODY),
      body: VALID_BODY,
    })
    expect(res.status).toBe(202)
  })

  it('verified floods still consume the ingest budget: the 61st verified request 429s', async () => {
    const app = await buildIngestApp()
    for (let i = 0; i < 60; i++) {
      const res = await app.request('/api/listener/ingest', {
        method: 'POST',
        headers: signedHeaders(VALID_BODY),
        body: VALID_BODY,
      })
      expect(res.status).toBe(202)
    }
    const res = await app.request('/api/listener/ingest', {
      method: 'POST',
      headers: signedHeaders(VALID_BODY),
      body: VALID_BODY,
    })
    expect(res.status).toBe(429)
    expect(await res.text()).toBe('Too Many Requests')
    expect(rateLimitStoreSize()).toBe(1)
  })

  it('an unsigned ingest flood leaves the public class budget untouched', async () => {
    const app = await buildIngestApp()
    for (let i = 0; i < 72; i++) {
      const res = await app.request('/api/listener/ingest', {
        method: 'POST',
        headers: rm904GarbageSignatureHeaders(),
        body: VALID_BODY,
      })
      expect(res.status).toBe(401)
    }
    // Public-class admission behaves normally after the flood (auth shape,
    // not a 429) — the flood consumed nothing.
    expect((await app.request('/auth/login')).status).not.toBe(429)
  })
})
