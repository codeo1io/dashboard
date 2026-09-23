/**
 * Operator listener channel route integration tests, through buildDashboardApp().
 */
import type {ListenerStore} from '../src/listener/store.ts'
import {Buffer} from 'node:buffer'
import {createHmac} from 'node:crypto'
import {beforeEach, describe, expect, it} from 'vitest'
import {createListenerStore} from '../src/listener/store.ts'
import {deriveAckCsrfToken} from '../src/routes/listener.ts'
import {buildDashboardApp} from '../src/server.ts'
import {SessionManager} from '../src/session.ts'

const TEST_KEY = Buffer.from('testkey-ABCDEFGHIJKLMNOPQRSTUV12', 'utf8') // 32 bytes
const INGEST_KEY = 'shared-ingest-key-for-tests'

function signBody(key: string, timestamp: string, rawBody: string): string {
  const hex = createHmac('sha256', key).update(`${timestamp}.${rawBody}`).digest('hex')
  return `sha256=${hex}`
}

function ingestHeaders(rawBody: string, key: string = INGEST_KEY, timestamp?: number): Record<string, string> {
  const ts = String(timestamp ?? Math.floor(Date.now() / 1000))
  return {
    'content-type': 'application/json',
    'x-listener-timestamp': ts,
    'x-listener-signature': signBody(key, ts, rawBody),
  }
}

const VALID_BODY = JSON.stringify({
  source: 'infra',
  kind: 'deploy-health',
  severity: 'warning',
  title: 'Autoheal restarted gateway',
  body: 'gateway health probe failed 3x; container restarted and recovered.',
  createdAt: '2026-07-11T12:00:00Z',
})

async function buildTestApp(opts: {listenerStore?: ListenerStore; listenerIngestKey?: string | null}) {
  return buildDashboardApp({
    operatorLogin: 'octocat',
    cookieKey: TEST_KEY,
    listenerStore: opts.listenerStore,
    listenerIngestKey: opts.listenerIngestKey,
  })
}

function sessionCookieHeader(): string {
  const sm = new SessionManager(TEST_KEY)
  return `session=${sm.sign('octocat')}`
}

function ackHeaders(now: number = Date.now()): Record<string, string> {
  return {
    cookie: sessionCookieHeader(),
    'x-csrf-token': deriveAckCsrfToken({cookieKey: TEST_KEY, operatorLogin: 'octocat'}, now),
  }
}

describe('operator listener channel routes', () => {
  let store: ListenerStore

  beforeEach(() => {
    store = createListenerStore(':memory:')
  })

  it('POST /api/listener/ingest with a correctly-signed body → 202, id returned; visible via GET', async () => {
    const app = await buildTestApp({listenerStore: store, listenerIngestKey: INGEST_KEY})

    const ingestRes = await app.request('/api/listener/ingest', {
      method: 'POST',
      headers: ingestHeaders(VALID_BODY),
      body: VALID_BODY,
    })
    expect(ingestRes.status).toBe(202)
    const ingestJson = (await ingestRes.json()) as {id: string; receivedAt: string}
    expect(typeof ingestJson.id).toBe('string')
    expect(typeof ingestJson.receivedAt).toBe('string')

    const getRes = await app.request('/api/listener/messages', {
      headers: {cookie: sessionCookieHeader()},
    })
    expect(getRes.status).toBe(200)
    const getJson = (await getRes.json()) as {messages: {id: string}[]; unreadCount: number}
    expect(getJson.messages).toHaveLength(1)
    expect(getJson.messages[0]?.id).toBe(ingestJson.id)
    expect(getJson.unreadCount).toBe(1)
  })

  it('POST /ingest with bad signature → 401', async () => {
    const app = await buildTestApp({listenerStore: store, listenerIngestKey: INGEST_KEY})
    const res = await app.request('/api/listener/ingest', {
      method: 'POST',
      headers: ingestHeaders(VALID_BODY, 'wrong-key'),
      body: VALID_BODY,
    })
    expect(res.status).toBe(401)
    const json = (await res.json()) as {error: string}
    expect(json.error).toBe('unauthorized')
  })

  it('POST /ingest with bad body → 400', async () => {
    const app = await buildTestApp({listenerStore: store, listenerIngestKey: INGEST_KEY})
    const badBody = JSON.stringify({source: 'not-a-valid-source'})
    const res = await app.request('/api/listener/ingest', {
      method: 'POST',
      headers: ingestHeaders(badBody),
      body: badBody,
    })
    expect(res.status).toBe(400)
  })

  it('POST /ingest with malformed JSON → 400', async () => {
    const app = await buildTestApp({listenerStore: store, listenerIngestKey: INGEST_KEY})
    const badBody = '{not json'
    const res = await app.request('/api/listener/ingest', {
      method: 'POST',
      headers: ingestHeaders(badBody),
      body: badBody,
    })
    expect(res.status).toBe(400)
  })

  it('POST /ingest oversized → 413', async () => {
    const app = await buildTestApp({listenerStore: store, listenerIngestKey: INGEST_KEY})
    const hugeBody = JSON.stringify({
      source: 'infra',
      kind: 'deploy-health',
      severity: 'warning',
      title: 'x',
      body: 'x'.repeat(20_000),
      createdAt: '2026-07-11T12:00:00Z',
    })
    const res = await app.request('/api/listener/ingest', {
      method: 'POST',
      headers: ingestHeaders(hugeBody),
      body: hugeBody,
    })
    expect(res.status).toBe(413)
  })

  it('POST /ingest with oversized declared Content-Length → 413 before reading any body bytes', async () => {
    const app = await buildTestApp({listenerStore: store, listenerIngestKey: INGEST_KEY})

    let pulledBytes = 0
    const endless = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulledBytes += 8192
        controller.enqueue(new Uint8Array(8192))
      },
    })

    const req = new Request('http://localhost/api/listener/ingest', {
      method: 'POST',
      headers: {
        ...ingestHeaders('whatever'),
        'content-length': String(1024 * 1024),
      },
      body: endless,
      duplex: 'half',
    })

    const res = await app.request(req)
    expect(res.status).toBe(413)
    // The precheck must reject on the declared length alone: the handler
    // reads nothing. (Hono's request adapter itself probes at most one
    // chunk — 8 KiB here — regardless of the handler, so the assertable
    // invariant is "bounded to a single chunk", never the declared 1 MiB.)
    expect(pulledBytes).toBeLessThanOrEqual(8192)
  })

  it('POST /ingest chunked body over the cap → 413 with the stream cancelled, not drained', async () => {
    const app = await buildTestApp({listenerStore: store, listenerIngestKey: INGEST_KEY})

    let pulledChunks = 0
    const chunk = new Uint8Array(8192) // 8 chunks × 8 KiB = 64 KiB total, cap is 16 KiB
    const oversized = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulledChunks += 1
        controller.enqueue(chunk)
      },
      cancel() {
        /* reader.cancel() after crossing the cap lands here */
      },
    })

    const req = new Request('http://localhost/api/listener/ingest', {
      method: 'POST',
      headers: ingestHeaders('x'),
      body: oversized,
      duplex: 'half',
    })

    const res = await app.request(req)
    expect(res.status).toBe(413)
    // The reader must stop as soon as the running total crosses the cap:
    // 8 KiB + 8 KiB + 8 KiB = 24 KiB pulled, then cancel — never all 8 chunks.
    expect(pulledChunks).toBe(3)
  })

  it('POST /ingest stream body within the cap is decoded and processed normally', async () => {
    const app = await buildTestApp({listenerStore: store, listenerIngestKey: INGEST_KEY})
    const validBody = JSON.stringify({
      source: 'infra',
      kind: 'deploy-health',
      severity: 'warning',
      title: 'streamed',
      body: 'chunked but small',
      createdAt: '2026-07-11T12:00:00Z',
    })
    const encoder = new TextEncoder()
    const mid = Math.floor(validBody.length / 2)
    const chunkA = encoder.encode(validBody.slice(0, mid))
    const chunkB = encoder.encode(validBody.slice(mid))
    const splitBody = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(chunkA)
        controller.enqueue(chunkB)
        controller.close()
      },
    })

    const req = new Request('http://localhost/api/listener/ingest', {
      method: 'POST',
      headers: ingestHeaders(validBody),
      body: splitBody,
      duplex: 'half',
    })

    const res = await app.request(req)
    expect(res.status).toBe(202)
    const json = (await res.json()) as {id: string}
    expect(typeof json.id).toBe('string')
  })

  it('GET /api/listener/messages WITHOUT a session cookie → denied', async () => {
    const app = await buildTestApp({listenerStore: store, listenerIngestKey: INGEST_KEY})
    const res = await app.request('/api/listener/messages')
    expect([401, 302, 303]).toContain(res.status)
  })

  it('GET with a valid session cookie → 200 with messages + unreadCount', async () => {
    const app = await buildTestApp({listenerStore: store, listenerIngestKey: INGEST_KEY})
    const res = await app.request('/api/listener/messages', {
      headers: {cookie: sessionCookieHeader()},
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as {messages: unknown[]; unreadCount: number}
    expect(Array.isArray(json.messages)).toBe(true)
    expect(json.unreadCount).toBe(0)
  })

  it('POST ack with session + CSRF token → 202; ack unknown id → 404', async () => {
    const app = await buildTestApp({listenerStore: store, listenerIngestKey: INGEST_KEY})
    const ingestRes = await app.request('/api/listener/ingest', {
      method: 'POST',
      headers: ingestHeaders(VALID_BODY),
      body: VALID_BODY,
    })
    const {id} = (await ingestRes.json()) as {id: string}

    const ackRes = await app.request(`/api/listener/messages/${id}/ack`, {
      method: 'POST',
      headers: ackHeaders(),
    })
    expect(ackRes.status).toBe(202)

    const notFoundRes = await app.request('/api/listener/messages/does-not-exist/ack', {
      method: 'POST',
      headers: ackHeaders(),
    })
    expect(notFoundRes.status).toBe(404)
  })

  it('POST ack-all with session + CSRF token → 202', async () => {
    const app = await buildTestApp({listenerStore: store, listenerIngestKey: INGEST_KEY})
    await app.request('/api/listener/ingest', {
      method: 'POST',
      headers: ingestHeaders(VALID_BODY),
      body: VALID_BODY,
    })

    const res = await app.request('/api/listener/ack-all', {
      method: 'POST',
      headers: ackHeaders(),
    })
    expect(res.status).toBe(202)
    const json = (await res.json()) as {acked: number}
    expect(json.acked).toBe(1)
  })

  it('POST ack-all WITHOUT a session cookie → denied', async () => {
    const app = await buildTestApp({listenerStore: store, listenerIngestKey: INGEST_KEY})
    const res = await app.request('/api/listener/ack-all', {method: 'POST'})
    expect([401, 302, 303]).toContain(res.status)
  })

  // ---------------------------------------------------------------------------
  // ack CSRF (rm-115) — the session-authenticated mutations require a
  // listener-ack CSRF token fetched from GET /api/listener/csrf.
  // ---------------------------------------------------------------------------

  it('GET /api/listener/csrf with session → 200 + token; without session → denied', async () => {
    const app = await buildTestApp({listenerStore: store, listenerIngestKey: INGEST_KEY})

    const authedRes = await app.request('/api/listener/csrf', {
      headers: {cookie: sessionCookieHeader()},
    })
    expect(authedRes.status).toBe(200)
    const json = (await authedRes.json()) as {csrfToken: string}
    expect(typeof json.csrfToken).toBe('string')
    expect(json.csrfToken.length).toBe(32)
    expect(json.csrfToken).toBe(deriveAckCsrfToken({cookieKey: TEST_KEY, operatorLogin: 'octocat'}))

    const anonRes = await app.request('/api/listener/csrf')
    expect([401, 302, 303]).toContain(anonRes.status)
  })

  it('POST ack with session but NO x-csrf-token header → 403', async () => {
    const app = await buildTestApp({listenerStore: store, listenerIngestKey: INGEST_KEY})
    const res = await app.request('/api/listener/ack-all', {
      method: 'POST',
      headers: {cookie: sessionCookieHeader()},
    })
    expect(res.status).toBe(403)
    const json = (await res.json()) as {error: string}
    expect(json.error).toBe('csrf missing')
  })

  it('POST ack with a WRONG token → 403 (token bound to another operator)', async () => {
    const app = await buildTestApp({listenerStore: store, listenerIngestKey: INGEST_KEY})
    const res = await app.request('/api/listener/ack-all', {
      method: 'POST',
      headers: {
        cookie: sessionCookieHeader(),
        'x-csrf-token': deriveAckCsrfToken({cookieKey: TEST_KEY, operatorLogin: 'someone-else'}),
      },
    })
    expect(res.status).toBe(403)
    const json = (await res.json()) as {error: string}
    expect(json.error).toBe('csrf invalid')
  })

  it('POST ack with a previous-window token → 202 (one window of clock skew)', async () => {
    const app = await buildTestApp({listenerStore: store, listenerIngestKey: INGEST_KEY})
    await app.request('/api/listener/ingest', {
      method: 'POST',
      headers: ingestHeaders(VALID_BODY),
      body: VALID_BODY,
    })

    const res = await app.request('/api/listener/ack-all', {
      method: 'POST',
      headers: ackHeaders(Date.now() - 60 * 60 * 1000),
    })
    expect(res.status).toBe(202)
  })

  it('router built WITHOUT ackCsrf config fails closed: mutations 403, token endpoint 503', async () => {
    // Standalone router (no server.ts wiring) — proves the fail-closed default:
    // CSRF is structural, not an optional feature of the mount site.
    const {buildListenerRouter} = await import('../src/routes/listener.ts')
    const router = buildListenerRouter({store, ingestKey: null, ackCsrf: null})

    const ackRes = await router.request('/ack-all', {method: 'POST'})
    expect(ackRes.status).toBe(403)

    const csrfRes = await router.request('/csrf')
    expect(csrfRes.status).toBe(503)
  })

  it('when no ingest key is configured, POST /api/listener/ingest → 404', async () => {
    const app = await buildTestApp({listenerStore: store, listenerIngestKey: null})
    const res = await app.request('/api/listener/ingest', {
      method: 'POST',
      headers: ingestHeaders(VALID_BODY),
      body: VALID_BODY,
    })
    expect(res.status).toBe(404)
  })

  it('when no listenerStore is provided, the entire channel is not mounted → 404', async () => {
    const app = await buildDashboardApp({
      operatorLogin: 'octocat',
      cookieKey: TEST_KEY,
    })
    const res = await app.request('/api/listener/messages', {
      headers: {cookie: sessionCookieHeader()},
    })
    expect(res.status).toBe(404)
  })
})
