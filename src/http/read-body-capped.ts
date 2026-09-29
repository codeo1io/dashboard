/**
 * Shared streaming body-cap reader.
 *
 * Reads at most `maxBytes` of the request body, returning null when the cap
 * is exceeded — never buffering an unbounded attacker-controlled stream.
 *
 * Defense in depth against a memory-DoS on unauthenticated body-parse sites:
 * 1. A declared Content-Length above the cap is rejected before a single byte
 *    is read from the wire.
 * 2. An undeclared (chunked) body is read incrementally; the reader is
 *    cancelled as soon as the running total crosses the cap, so at most one
 *    chunk beyond the limit is ever pulled — an unterminated stream cannot
 *    park the handler awaiting EOF.
 *
 * The cap is on wire bytes (UTF-8 octets), matching the previous
 * Buffer.byteLength semantics for well-formed payloads.
 *
 * Extracted from routes/listener.ts (rm-288, run 0a6430c9ba13) so the logout
 * CSRF read in routes/auth.ts shares the exact ingest cap semantics instead
 * of a buffer-first approximation.
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
