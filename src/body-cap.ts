/**
 * Shared request-body cap: reads at most `maxBytes` of the request body,
 * returning null when the cap is exceeded — never buffering an unbounded
 * attacker-controlled stream.
 *
 * Defense in depth against a memory-DoS on body-reading routes (worst on the
 * public pre-auth ones, which sit outside the rate limiter by design, rm-275):
 * 1. A declared Content-Length above the cap is rejected before a single byte
 *    is read from the wire.
 * 2. The body is then read incrementally and the reader is cancelled as soon
 *    as the running total crosses the cap, so at most one chunk beyond the
 *    limit is ever pulled. The declared length is never trusted on its own:
 *    a lying or absent (chunked) content-length cannot buy more than one
 *    chunk past the cap.
 *
 * The cap is on wire bytes (UTF-8 octets), matching the previous
 * Buffer.byteLength semantics for well-formed payloads.
 *
 * Extracted from src/routes/listener.ts by rm-312 so /auth/logout reads bodies
 * through the SAME streaming primitive as listener ingest (the prior logout
 * shape pre-checked only the declared content-length and then buffered the
 * whole body with `await c.req.text()` — free for Transfer-Encoding: chunked
 * requests, which carry no content-length header at all).
 */

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
