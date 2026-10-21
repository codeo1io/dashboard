import type {GatewayClientError, OperatorClient, SessionDto} from '../src/gateway/operator-client.ts'
import type {ListenerStore} from '../src/listener/store.ts'
import type {Result} from '../src/result.ts'
import {Buffer} from 'node:buffer'
import {createHmac} from 'node:crypto'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createListenerStore} from '../src/listener/store.ts'
import {err, ok} from '../src/result.ts'
import {deriveAckCsrfToken} from '../src/routes/listener.ts'
import {buildDashboardApp, resetRateLimitForTesting} from '../src/server.ts'

/**
 * rm-2061: combined-mode boot integration suite.
 *
 * The coverage gap this closes: the four test files that exercise the
 * gateway-operator session branch (gateway-auth, gateway-auth-session-cache,
 * operator-route-redirect, operator-ui) never construct a listenerStore, and
 * the listener suites (listener-routes, listener-store, listener-contract)
 * never enable the gateway branch — so the boot that production actually
 * runs (gateway-operator session ENABLED and the listener ingest channel LIVE
 * on the same app) had zero coupled coverage. This suite mounts exactly that
 * boot through buildDashboardApp() with an injected fake OperatorClient (no
 * network) and pins the three couplings that only exist when both halves are
 * composed:
 *
 *  1. ingest → store → operator read: an HMAC-signed webhook written through
 *     src/listener/store.ts surfaces through the gateway-session-protected
 *     read path, with the session-cookie semantics the isolated suites pin
 *     (no/invalid cookie → gateway login redirect, never the Arctic flow).
 *  2. rate-limit classes at the combined boot: operator-window requests
 *     classify into the OPERATOR budget (429 after the per-class max) while
 *     the ingest and public budgets stay independent in the same window.
 *  3. ack CSRF across a store write: the ack-CSRF token (bound to
 *     cookieKey + resolved operatorLogin via the server.ts ackCsrf ternary)
 *     survives a listener-store write in the same session, and fails closed
 *     (503/403) when the combined boot cannot supply the config.
 *
 * Each leg ships a severed-boot control: with the coupling switched off
 * (gateway flag / operatorLogin), the same assertions observe the
 * un-composed behavior — proving this suite covers the composition, not a
 * unit already pinned elsewhere.
 */
const TEST_KEY = Buffer.from('testkey-ABCDEFGHIJKLMNOPQRSTUV12', 'utf8') // 32 bytes
const TEST_OPERATOR = 'octocat'
const INGEST_KEY = 'combined-mode-ingest-key'

const GATEWAY_COOKIE = 'gateway_session=combined-mode-boot-suite'
const FUTURE_EXPIRES_AT = Date.now() + 60 * 60 * 1000

const VALID_SESSION: SessionDto = {
  operatorId: 12345,
  login: TEST_OPERATOR,
  expiresAt: FUTURE_EXPIRES_AT,
}

// ---------------------------------------------------------------------------
// Fake OperatorClient (pattern of test/gateway-auth.test.ts)
// ---------------------------------------------------------------------------

function makeFakeOperatorClient(
  getCurrentSessionImpl: () => Promise<Result<SessionDto, GatewayClientError>>,
): {client: OperatorClient; getCurrentSessionSpy: ReturnType<typeof vi.fn>} {
  const getCurrentSessionSpy = vi.fn(getCurrentSessionImpl)
  const client: OperatorClient = {
    getCurrentSession: getCurrentSessionSpy,
    refreshCsrf: () => {
      throw new Error('refreshCsrf must not be called in auth middleware')
    },
    launchRun: () => {
      throw new Error('launchRun must not be called in this suite')
    },
    getRunSnapshot: () => {
      throw new Error('getRunSnapshot must not be called in this suite')
    },
    connectRunStream: () => {
      throw new Error('connectRunStream must not be called in this suite')
    },
    listRepos: () => {
      throw new Error('listRepos must not be called in this suite')
    },
    listRunApprovals: () => {
      throw new Error('listRunApprovals must not be called in this suite')
    },
    decideRunApproval: () => {
      throw new Error('decideRunApproval must not be called in this suite')
    },
    getVapidKey: () => {
      throw new Error('getVapidKey must not be called in this suite')
    },
    getPushSubscriptionMetadata: () => {
      throw new Error('getPushSubscriptionMetadata must not be called in this suite')
    },
    subscribePush: () => {
      throw new Error('subscribePush must not be called in this suite')
    },
    unsubscribePush: () => {
      throw new Error('unsubscribePush must not be called in this suite')
    },
  }
  return {client, getCurrentSessionSpy}
}

// ---------------------------------------------------------------------------
// Combined-boot builder + ingest helpers
// ---------------------------------------------------------------------------

interface CombinedBootOverrides {
  /** Omit the key to keep the default operator login; pass undefined explicitly to sever it. */
  readonly operatorLogin?: string
  /** Defaults to a fresh in-memory store. */
  readonly listenerStore?: ListenerStore
  /** Defaults to true (the combined boot under test). Set false to sever the gateway coupling. */
  readonly gatewayOperatorSessionEnabled?: boolean
}

async function buildCombinedApp(overrides: CombinedBootOverrides = {}) {
  const {client} = makeFakeOperatorClient(async () => ok(VALID_SESSION))
  const hasLoginOverride = 'operatorLogin' in overrides
  return buildDashboardApp({
    operatorLogin: hasLoginOverride ? overrides.operatorLogin : TEST_OPERATOR,
    cookieKey: TEST_KEY,
    gatewayOperatorSessionEnabled: overrides.gatewayOperatorSessionEnabled ?? true,
    gatewayProxyAcknowledged: true,
    gatewayOperatorOrigin: 'https://gateway.example.test',
    operatorClient: client,
    listenerStore: overrides.listenerStore ?? createListenerStore(':memory:'),
    listenerIngestKey: INGEST_KEY,
  })
}

function signBody(key: string, timestamp: string, rawBody: string): string {
  const hex = createHmac('sha256', key).update(`${timestamp}.${rawBody}`).digest('hex')
  return `sha256=${hex}`
}

function ingestInit(rawBody: string, key: string = INGEST_KEY): RequestInit {
  const ts = String(Math.floor(Date.now() / 1000))
  return {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-listener-timestamp': ts,
      'x-listener-signature': signBody(key, ts, rawBody),
    },
    body: rawBody,
  }
}

const VALID_BODY = JSON.stringify({
  source: 'infra',
  kind: 'deploy-health',
  severity: 'warning',
  title: 'Combined-mode boot coupled ingest',
  body: 'gateway session live and listener ingest live on the same app.',
  createdAt: '2026-10-19T12:00:00Z',
})

beforeEach(() => {
  resetRateLimitForTesting()
})

afterEach(() => {
  resetRateLimitForTesting()
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// Leg 1 — ingest → store → gateway-session-protected read
// ---------------------------------------------------------------------------

describe('combined-mode boot: ingest surfaces through the gateway-session read path (rm-2061)', () => {
  it('an HMAC-signed webhook lands in the store and is served to a valid gateway session', async () => {
    const app = await buildCombinedApp()

    const ingestRes = await app.request('/api/listener/ingest', ingestInit(VALID_BODY))
    expect(ingestRes.status).toBe(202)
    const ingested = (await ingestRes.json()) as {id: string; receivedAt: string}
    expect(ingested.id).toBeTruthy()
    expect(ingested.receivedAt).toBeTruthy()

    // The read path carries the gateway session-cookie semantics the isolated
    // suites pin: no cookie → gateway login redirect (never the Arctic flow).
    const anonRes = await app.request('/api/listener/messages')
    expect(anonRes.status).toBe(302)
    expect(anonRes.headers.get('location')).toBe('/operator/auth/github/start?return_to=/operator')

    // With the gateway session cookie, the SAME store's content is served.
    const readRes = await app.request('/api/listener/messages', {headers: {cookie: GATEWAY_COOKIE}})
    expect(readRes.status).toBe(200)
    expect(readRes.headers.get('cache-control')).toBe('no-store')
    const feed = (await readRes.json()) as {
      messages: readonly {readonly id: string; readonly title: string}[]
      unreadCount: number
      prunedCount: number
    }
    expect(feed.messages).toHaveLength(1)
    expect(feed.messages[0]?.id).toBe(ingested.id)
    expect(feed.messages[0]?.title).toBe('Combined-mode boot coupled ingest')
    expect(feed.unreadCount).toBe(1)
  })

  it('an invalid gateway session is denied on the read path while ingest stays public-before-session', async () => {
    // Fail-closed fake: the gateway rejects the cookie.
    const {client} = makeFakeOperatorClient(async () => err({kind: 'http', status: 401}))
    const app = await buildDashboardApp({
      operatorLogin: TEST_OPERATOR,
      cookieKey: TEST_KEY,
      gatewayOperatorSessionEnabled: true,
      gatewayProxyAcknowledged: true,
      gatewayOperatorOrigin: 'https://gateway.example.test',
      operatorClient: client,
      listenerStore: createListenerStore(':memory:'),
      listenerIngestKey: INGEST_KEY,
    })

    const readRes = await app.request('/api/listener/messages', {headers: {cookie: GATEWAY_COOKIE}})
    expect(readRes.status).toBe(302)
    expect(readRes.headers.get('location')).toBe('/operator/auth/github/start?return_to=/operator')

    // Ingest needs no session at all — only the HMAC pair.
    const ingestRes = await app.request('/api/listener/ingest', ingestInit(VALID_BODY))
    expect(ingestRes.status).toBe(202)
  })

  it('severed control: with the gateway flag off, the read path no longer carries gateway session-cookie semantics', async () => {
    const store = createListenerStore(':memory:')
    const app = await buildCombinedApp({
      gatewayOperatorSessionEnabled: false,
      listenerStore: store,
    })

    const ingestRes = await app.request('/api/listener/ingest', ingestInit(VALID_BODY))
    expect(ingestRes.status).toBe(202)
    expect(store.list({unreadOnly: true}).messages).toHaveLength(1)

    // Severed: the gateway cookie is meaningless on the Arctic branch — the
    // same request that returned 200 above now redirects to the Arctic login.
    const readRes = await app.request('/api/listener/messages', {headers: {cookie: GATEWAY_COOKIE}})
    expect(readRes.status).toBe(302)
    expect(readRes.headers.get('location')).toBe('/auth/login')
  })
})

// ---------------------------------------------------------------------------
// Leg 2 — operator rate-limit class at the combined boot
// ---------------------------------------------------------------------------

describe('combined-mode boot: operator-window requests hit the operator rate-limit class (rm-2061)', () => {
  it('the messages read 429s after the per-class max while ingest and public budgets stay independent', async () => {
    const app = await buildCombinedApp()

    // Flood the operator class through a session-authenticated read (default
    // budget: 60 requests per window — see RATE_LIMIT_MAX_PER_CLASS).
    for (let i = 0; i < 60; i++) {
      const res = await app.request('/api/listener/messages', {headers: {cookie: GATEWAY_COOKIE}})
      expect(res.status, `request ${i + 1} should be within budget`).toBe(200)
    }

    const denied = await app.request('/api/listener/messages', {headers: {cookie: GATEWAY_COOKIE}})
    expect(denied.status).toBe(429)
    expect(await denied.text()).toBe('Too Many Requests')
    const retryAfter = Number.parseInt(denied.headers.get('retry-after') ?? '', 10)
    expect(Number.isSafeInteger(retryAfter)).toBe(true)
    expect(retryAfter).toBeGreaterThanOrEqual(1)

    // Same window, same client key: the INGEST class budget is untouched.
    const ingestRes = await app.request('/api/listener/ingest', ingestInit(VALID_BODY))
    expect(ingestRes.status).toBe(202)

    // And the PUBLIC class budget is untouched too.
    const healthRes = await app.request('/api/healthz')
    expect(healthRes.status).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// Leg 3 — ack CSRF across a listener-store write
// ---------------------------------------------------------------------------

describe('combined-mode boot: the ack-CSRF token survives a listener-store write (rm-2061)', () => {
  it('token fetched through the gateway session acks a message written in the same session', async () => {
    const app = await buildCombinedApp()

    const ingestRes = await app.request('/api/listener/ingest', ingestInit(VALID_BODY))
    expect(ingestRes.status).toBe(202)
    const {id} = (await ingestRes.json()) as {id: string}

    const csrfRes = await app.request('/api/listener/csrf', {headers: {cookie: GATEWAY_COOKIE}})
    expect(csrfRes.status).toBe(200)
    expect(csrfRes.headers.get('cache-control')).toBe('no-store')
    const {csrfToken} = (await csrfRes.json()) as {csrfToken: string}
    // The token is bound to cookieKey + the RESOLVED operator login, exactly
    // as the ackCsrf ternary in buildDashboardApp wires it.
    expect(csrfToken).toBe(deriveAckCsrfToken({cookieKey: TEST_KEY, operatorLogin: TEST_OPERATOR}))

    const ackRes = await app.request(`/api/listener/messages/${id}/ack`, {
      method: 'POST',
      headers: {cookie: GATEWAY_COOKIE, 'x-csrf-token': csrfToken},
    })
    expect(ackRes.status).toBe(202)
    const acked = (await ackRes.json()) as {id: string; readAt: string}
    expect(acked.id).toBe(id)
    expect(acked.readAt).toBeTruthy()
  })

  it('a token fetched BEFORE the write still acks after it — a store write does not rotate the token', async () => {
    const app = await buildCombinedApp()

    const csrfRes = await app.request('/api/listener/csrf', {headers: {cookie: GATEWAY_COOKIE}})
    const {csrfToken} = (await csrfRes.json()) as {csrfToken: string}

    // The listener-store write happens after the token fetch.
    const ingestRes = await app.request('/api/listener/ingest', ingestInit(VALID_BODY))
    expect(ingestRes.status).toBe(202)
    const {id} = (await ingestRes.json()) as {id: string}

    const ackRes = await app.request(`/api/listener/messages/${id}/ack`, {
      method: 'POST',
      headers: {cookie: GATEWAY_COOKIE, 'x-csrf-token': csrfToken},
    })
    expect(ackRes.status).toBe(202)
  })

  it('ack rejects a garbage token with 403 csrf invalid, and a valid token on an unknown id with 404', async () => {
    const app = await buildCombinedApp()

    const ingestRes = await app.request('/api/listener/ingest', ingestInit(VALID_BODY))
    expect(ingestRes.status).toBe(202)
    const {id} = (await ingestRes.json()) as {id: string}

    const badTokenRes = await app.request(`/api/listener/messages/${id}/ack`, {
      method: 'POST',
      headers: {cookie: GATEWAY_COOKIE, 'x-csrf-token': 'deadbeef'.repeat(4)},
    })
    expect(badTokenRes.status).toBe(403)
    expect(((await badTokenRes.json()) as {error: string}).error).toBe('csrf invalid')

    const goodToken = deriveAckCsrfToken({cookieKey: TEST_KEY, operatorLogin: TEST_OPERATOR})
    const unknownRes = await app.request('/api/listener/messages/no-such-id/ack', {
      method: 'POST',
      headers: {cookie: GATEWAY_COOKIE, 'x-csrf-token': goodToken},
    })
    expect(unknownRes.status).toBe(404)
  })

  it('severed control: without an operator login the combined boot fails closed — csrf 503, ack 403', async () => {
    const app = await buildCombinedApp({operatorLogin: undefined})

    const csrfRes = await app.request('/api/listener/csrf', {headers: {cookie: GATEWAY_COOKIE}})
    expect(csrfRes.status).toBe(503)
    expect(((await csrfRes.json()) as {error: string}).error).toBe('csrf unavailable')

    const ackRes = await app.request('/api/listener/messages/whatever/ack', {
      method: 'POST',
      headers: {cookie: GATEWAY_COOKIE, 'x-csrf-token': 'any-token'},
    })
    expect(ackRes.status).toBe(403)
    expect(((await ackRes.json()) as {error: string}).error).toBe('csrf unavailable')
  })
})
