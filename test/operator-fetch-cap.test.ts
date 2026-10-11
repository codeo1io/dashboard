/**
 * rm-903: size-capped JSON reading for the operator pages' fetch sites.
 *
 * public/operator-fetch-cap.js is the browser twin of the server-side response
 * cap (src/gateway/operator-client.ts readBodyTextWithCap /
 * MAX_SSE_BUFFER_BYTES). This suite pins:
 *  - cap parity across the browser helper, the browser SSE reader, and the
 *    server SSE reader (three-way, so no twin can drift);
 *  - the two fences: declared content-length and incremental measured bytes
 *    (a lying small header must still trip);
 *  - fail-closed side effects: the body stream is cancelled when either fence
 *    trips, and over-cap NEVER parses as a truncated success;
 *  - under-cap behavior identical to response.json(), including SyntaxError
 *    propagation for malformed JSON;
 *  - integration: the real rewired sites (buildApprovalClient,
 *    fetchRunIndex, buildLaunchClient) surface an over-cap body through their
 *    existing typed failure paths — network/protocol/unavailable, never a
 *    half-parsed value.
 */
import {afterEach, describe, expect, it, vi} from 'vitest'
import {
  JsonBodyTooLargeError,
  MAX_BROWSER_JSON_BYTES,
  readJsonWithCap,
} from '../public/operator-fetch-cap.js'
import {MAX_SSE_BUFFER_BYTES as STREAM_CAP} from '../public/operator-stream.js'
import {MAX_SSE_BUFFER_BYTES as SERVER_CAP} from '../src/gateway/operator-sse-reader.ts'

const encoder = new TextEncoder()

function makeJsonBody(payload: unknown, chunkSize = 64): ReadableStream<Uint8Array> {
  const bytes = encoder.encode(JSON.stringify(payload))
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < bytes.length; i += chunkSize) {
        controller.enqueue(bytes.subarray(i, Math.min(i + chunkSize, bytes.length)))
      }
      controller.close()
    },
  })
}

interface CancelTracked {
  body: ReadableStream<Uint8Array>
  cancelled: () => boolean
}

/** A stream whose cancel() is observable — proves the fences tear the body down. */
function makeTrackedBody(chunks: Uint8Array[], closeAfter = true): CancelTracked {
  let cancelled = false
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk)
      if (closeAfter) controller.close()
    },
    cancel() {
      cancelled = true
    },
  })
  return {body, cancelled: () => cancelled}
}

function makeResponse(body: ReadableStream<Uint8Array> | null, headers: Record<string, string> = {}) {
  return {
    ok: true,
    status: 200,
    headers: {get: (name: string) => headers[name.toLowerCase()] ?? null},
    body,
    json: async () => {
      throw new Error('json() must not be called when a readable body is present')
    },
    text: async () => '',
  } as unknown as Response
}

describe('rm-903: cap parity across browser helper and SSE-reader twins', () => {
  it('browser JSON cap === browser SSE-reader cap === server SSE-reader cap', () => {
    expect(MAX_BROWSER_JSON_BYTES).toBe(STREAM_CAP)
    expect(STREAM_CAP).toBe(SERVER_CAP)
  })
})

describe('rm-903: readJsonWithCap fences', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('under-cap JSON parses identically to response.json()', async () => {
    const payload = {approvals: [{runId: 'run-001', requestID: 'req-001', permission: 'shell'}]}
    await expect(readJsonWithCap(makeResponse(makeJsonBody(payload, 7)))).resolves.toEqual(payload)
  })

  it('declared content-length over the cap throws before reading the body and cancels it', async () => {
    const {body, cancelled} = makeTrackedBody([encoder.encode('{"never":"read"}')])
    const response = makeResponse(body, {'content-length': String(MAX_BROWSER_JSON_BYTES + 1)})
    await expect(readJsonWithCap(response)).rejects.toBeInstanceOf(JsonBodyTooLargeError)
    expect(cancelled()).toBe(true)
  })

  it('a lying small content-length still trips the incremental fence mid-read', async () => {
    // Declared 10 bytes, actual > cap: the header must not be trusted.
    const filler = 'x'.repeat(MAX_BROWSER_JSON_BYTES + 10)
    const {body, cancelled} = makeTrackedBody([encoder.encode(filler)], false)
    const response = makeResponse(body, {'content-length': '10'})
    await expect(readJsonWithCap(response)).rejects.toBeInstanceOf(JsonBodyTooLargeError)
    expect(cancelled()).toBe(true)
  })

  it('the incremental fence trips exactly over the cap boundary (astral chars counted in bytes)', async () => {
    // '𝕏' is 4 UTF-8 bytes but 2 UTF-16 units — a UTF-16-counting implementation
    // would need cap/2+ chars to trip; the byte-true fence trips at cap/4.
    const unit = '𝕏'
    // (cap/4 − 64) units + the {"padding":"…"} wrapper stays under the cap;
    // (cap/4 + 8) units is over even with the wrapper's head start.
    const underCap = unit.repeat(MAX_BROWSER_JSON_BYTES / 4 - 64)
    await expect(readJsonWithCap(makeResponse(makeJsonBody({padding: underCap})))).resolves.toHaveProperty(
      'padding',
      underCap,
    )
    const overCap = unit.repeat(MAX_BROWSER_JSON_BYTES / 4 + 8)
    const {body, cancelled} = makeTrackedBody([encoder.encode(`{"padding":"${overCap}"}`)], false)
    await expect(readJsonWithCap(makeResponse(body))).rejects.toBeInstanceOf(JsonBodyTooLargeError)
    expect(cancelled()).toBe(true)
  })

  it('a cap honored at exactly the boundary passes; one byte over fails', async () => {
    const text = `"${'a'.repeat(MAX_BROWSER_JSON_BYTES - 2)}"` // valid JSON string of exactly cap bytes
    const ok = makeResponse(makeJsonBodyRaw(text))
    await expect(readJsonWithCap(ok)).resolves.toBe(text.slice(1, -1))
    const {body, cancelled} = makeTrackedBody([encoder.encode(`"${'a'.repeat(MAX_BROWSER_JSON_BYTES - 1)}"`)], false)
    await expect(readJsonWithCap(makeResponse(body))).rejects.toBeInstanceOf(JsonBodyTooLargeError)
    expect(cancelled()).toBe(true)
  })

  it('malformed under-cap JSON propagates SyntaxError (not the cap error)', async () => {
    await expect(readJsonWithCap(makeResponse(makeJsonBodyRaw('{"broken":')))).rejects.toThrow(SyntaxError)
  })

  it('a response without a readable body falls back to response.json()', async () => {
    const response = {
      ok: true,
      status: 200,
      headers: {get: () => null},
      body: null,
      json: async () => ({fell: 'back'}),
    } as unknown as Response
    await expect(readJsonWithCap(response)).resolves.toEqual({fell: 'back'})
  })
})

function makeJsonBodyRaw(text: string, chunkSize = 65536): ReadableStream<Uint8Array> {
  const bytes = encoder.encode(text)
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < bytes.length; i += chunkSize) {
        controller.enqueue(bytes.subarray(i, Math.min(i + chunkSize, bytes.length)))
      }
      controller.close()
    },
  })
}

/** Stubs a global fetch returning an over-cap JSON body (with optional headers). */
function stubOverCapFetch(headers: Record<string, string> = {}) {
  const {body, cancelled} = makeTrackedBody(
    [encoder.encode(`{"runs":[{"runId":"${'x'.repeat(MAX_BROWSER_JSON_BYTES)}"}]}`)],
    false,
  )
  vi.stubGlobal('fetch', vi.fn(async () => makeResponse(body, headers)))
  return {cancelled}
}

describe('rm-903: integration — rewired sites fail closed on an over-cap body', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('buildApprovalClient().listRunApprovals → network-class failure (truncated reconcile is not success)', async () => {
    const {buildApprovalClient} = await import('../public/operator-stream.js')
    const {cancelled} = stubOverCapFetch()
    const client = buildApprovalClient()
    const result = await client.listRunApprovals('run-001')
    expect(result).toMatchObject({success: false, error: {kind: 'network'}})
    expect(cancelled()).toBe(true)
  })

  it('buildApprovalClient().refreshCsrf → network-class failure', async () => {
    const {buildApprovalClient} = await import('../public/operator-stream.js')
    stubOverCapFetch()
    const client = buildApprovalClient()
    const result = await client.refreshCsrf()
    expect(result).toMatchObject({success: false, error: {kind: 'network'}})
  })

  it('fetchRunIndex → unavailable (never a truncated listing)', async () => {
    const {fetchRunIndex} = await import('../public/operator-run-index.js')
    stubOverCapFetch()
    const result = await fetchRunIndex()
    expect(result.kind).toBe('unavailable')
  })

  it('buildLaunchClient().listRepos → network-class failure', async () => {
    const {buildLaunchClient} = await import('../public/operator-launch.js')
    stubOverCapFetch()
    const client = buildLaunchClient()
    const result = await client.listRepos()
    expect(result).toMatchObject({success: false, error: {kind: 'network'}})
  })
})
