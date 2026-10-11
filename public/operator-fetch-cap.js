/**
 * Size-capped JSON reading for the operator pages' fetch sites (rm-903).
 *
 * Browser twin of the server-side response cap in
 * src/gateway/operator-client.ts (readBodyTextWithCap, MAX_SSE_BUFFER_BYTES):
 * every bare `await res.json()` on an untrusted gateway body used to be an
 * unbounded buffered parse — a wedged or hostile upstream (or a
 * man-in-the-middle on a misconfigured reverse proxy) could pin the operator
 * tab's memory/CPU with an endless body. readJsonWithCap reads at most
 * MAX_BROWSER_JSON_BYTES and throws a typed error the calling site's existing
 * catch maps to its typed failure path (network/protocol), so an over-cap
 * body behaves exactly like an unparseable one — fail closed, never success.
 *
 * Deliberately STATELESS: operator-stream.js, operator-run-index.js, and
 * operator-launch.js each load as separate dynamic-import instances (the
 * runtime seam loads operator-stream.js with `?manual=1`), so no module with
 * singleton state may be shared across them — a pure helper is the safe
 * common denominator. No module-level mutable state, no DOM, no globals.
 *
 * Valid plain ES module: runs in the browser as-is and is directly importable
 * by Vitest (Node 24 ESM). The pages import it via a relative specifier so the
 * same import resolves both as /static/operator-fetch-cap.js (served by
 * src/server.ts) and on disk from public/ in Node.
 */

/**
 * Byte cap for a single JSON response body on the operator surface. Must equal
 * MAX_SSE_BUFFER_BYTES (1,000,000 bytes) in both operator-stream.js and
 * src/gateway/operator-sse-reader.ts — pinned by test/operator-fetch-cap.test.ts
 * so the browser/server twins cannot drift.
 */
export const MAX_BROWSER_JSON_BYTES = 1_000_000

/** Typed error thrown when a response body exceeds the cap. */
export class JsonBodyTooLargeError extends Error {
  /**
   * @param {number} capBytes the cap that was exceeded
   */
  constructor(capBytes) {
    super(`operator JSON response exceeded ${capBytes} bytes`)
    this.name = 'JsonBodyTooLargeError'
    this.capBytes = capBytes
  }
}

/**
 * Read a JSON response body with a hard byte cap and parse it.
 *
 * Two fences, mirroring the server twin:
 *  1. declared size — a `content-length` already over the cap aborts before
 *     any body is read (honest headers only; the incremental fence below
 *     catches lying or absent ones), cancelling the body stream;
 *  2. incremental read — the stream is read chunk-by-chunk with an exact
 *     running byte count (fetch body chunks are bytes, so `byteLength` is
 *     exact with no UTF-16 ambiguity); crossing the cap cancels the stream
 *     and throws JsonBodyTooLargeError.
 *
 * Over-cap throws; the caller's existing catch handles it like any other
 * body failure. Under-cap behavior is identical to `response.json()`
 * (including propagating a SyntaxError for malformed JSON).
 *
 * Responses without a readable body (synthetic test stubs) fall back to
 * `response.json()` after the declared-size fence.
 *
 * @param {Response} response the fetch response to read
 * @param {number} [capBytes]
 * @returns {Promise<unknown>} parsed JSON value
 */
export async function readJsonWithCap(response, capBytes = MAX_BROWSER_JSON_BYTES) {
  // Fence 1: declared size. An absent/invalid header is simply not trusted —
  // fence 2 owns the guarantee.
  const declared = response.headers?.get?.('content-length')
  if (declared !== null && declared !== undefined && declared !== '') {
    const declaredBytes = Number(declared)
    if (Number.isFinite(declaredBytes) && declaredBytes > capBytes) {
      await response.body?.cancel?.().catch(() => {})
      throw new JsonBodyTooLargeError(capBytes)
    }
  }

  if (response.body === null || response.body === undefined || typeof response.body.getReader !== 'function') {
    return response.json()
  }

  // Fence 2: incremental read with an exact byte count.
  const reader = response.body.getReader()
  /** @type {Uint8Array[]} */
  const chunks = []
  let totalBytes = 0
  for (;;) {
    const {done, value} = await reader.read()
    if (done) break
    totalBytes += value.byteLength
    if (totalBytes > capBytes) {
      await reader.cancel().catch(() => {})
      throw new JsonBodyTooLargeError(capBytes)
    }
    chunks.push(value)
  }

  const merged = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return JSON.parse(new TextDecoder().decode(merged))
}
