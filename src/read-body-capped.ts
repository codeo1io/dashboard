/**
 * rm-309: the shared streaming cap for request-body reads on size-capped
 * routes, extracted verbatim from the listener ingest path (rm-274) so every
 * capped route consumes ONE primitive instead of re-deriving a
 * declared-length-only check: the Content-Length header is only a fast-path
 * precheck, the read itself is chunk-bounded and the reader is cancelled on
 * overrun — absent-CL (chunked transfer), understated-CL, and
 * never-terminating bodies all hit the same bound and can never buy unbounded
 * buffering ahead of a small-field parse.
 *
 * Returns the decoded body (empty string for a null body), or null when the
 * body is over the cap (declared or observed) — callers map null to their
 * route's 413.
 */
export async function readBodyCapped(request: Request, maxBytes: number): Promise<string | null> {
  const declaredLengthHeader = request.headers.get('content-length')
  if (declaredLengthHeader !== null) {
    const declaredLength = Number(declaredLengthHeader)
    if (!Number.isFinite(declaredLength) || declaredLength > maxBytes) return null
  }

  if (request.body === null) return ''

  const reader = request.body.getReader()
  const decoder = new TextDecoder()
  let received = 0
  let body = ''
  for (;;) {
    const chunk: ChunkResult = await reader.read()
    if (chunk.done) break
    received += chunk.value.byteLength
    if (received > maxBytes) {
      void reader.cancel().catch(() => {})
      return null
    }
    body += decoder.decode(chunk.value, {stream: true})
  }
  body += decoder.decode()
  return body
}

interface ChunkResult {
  done: boolean
  value?: Uint8Array
}
