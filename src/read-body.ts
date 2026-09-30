/**
 * Shared bounded request-body reader for body-reading routes.
 *
 * Hoisted at rm-280 (2026-09-30) out of routes/listener.ts so the listener
 * ingest route and the /auth/logout CSRF read enforce ONE bound through ONE
 * code path. The logout route's previous cap (rm-268) checked the body only
 * AFTER `await c.req.text()` had buffered the entire stream — and counted
 * UTF-16 code units (`.length`), not bytes — so chunked, length-less, and
 * lying-header requests could still buy unbounded pre-auth buffering.
 *
 * Reads at most `maxBytes` of the request body, returning null when the cap
 * is exceeded — never buffering an unbounded attacker-controlled stream.
 *
 * Defense in depth against a memory-DoS on unauthenticated routes:
 * 1. A declared Content-Length above the cap is rejected before a single byte
 *    is read from the wire.
 * 2. An undeclared (chunked) body is read incrementally; the reader is
 *    cancelled as soon as the running total crosses the cap, so at most one
 *    chunk beyond the limit is ever pulled.
 *
 * The cap is on wire bytes (UTF-8 octets), matching Buffer.byteLength
 * semantics for well-formed payloads — NOT on decoded-string UTF-16 units.
 */

/**
 * Maximum request-body size (wire bytes) accepted by body-reading routes.
 * One shared constant: ingest and logout both pass exactly this bound.
 */
export const MAX_REQUEST_BODY_BYTES = 16384

/**
 * Minimal shape of ReadableStreamDefaultReader.read() — the DOM global type
 * is not resolvable in this TS lib configuration.
 */
type ChunkResult = {readonly done: true} | {readonly done: false; readonly value: Uint8Array}

export async function readBodyCapped(req: Request, maxBytes: number): Promise<string | null> {
  const contentLength = req.headers.get('content-length')
  if (contentLength !== null) {
    const declared = Number.parseInt(contentLength, 10)
    if (Number.isFinite(declared) && declared > maxBytes) return null
  }

  const body = req.body
  if (body === null) return ''

  const reader = body.getReader()
  const decoder = new TextDecoder()
  let received = 0
  let text = ''
  for (;;) {
    const result = (await reader.read()) as ChunkResult
    if (result.done) break
    const value = result.value
    received += value.byteLength
    if (received > maxBytes) {
      await reader.cancel().catch(() => undefined)
      return null
    }
    text += decoder.decode(value, {stream: true})
  }
  return text + decoder.decode()
}
