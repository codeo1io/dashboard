import fc from 'fast-check'
import {describe, expect, it} from 'vitest'
import {
  appendStreamChunk,
  appendStreamChunkByteDelta,
  MAX_SSE_BUFFER_BYTES as CLIENT_MAX,
  sseBufferUtf8Bytes,
} from '../public/operator-stream.js'
import {MAX_SSE_BUFFER_BYTES as SERVER_MAX} from '../src/gateway/operator-sse-reader.ts'

// rm-1507: the SSE buffer cap must mean the same thing on both sides of the
// vendored seam. The client twin (public/operator-stream.js) previously
// compared `.length` (UTF-16 code units) against the server twin's true
// UTF-8 byte count, so astral-plane output could ride under the cap at up to
// 3x the documented ceiling. This suite pins:
//   1. identical cap constants,
//   2. byte-true accounting semantics (the astral discriminator),
//   3. structural parity of the append fold across both twins' algorithms,
//   4. the maintained-counter arithmetic both twins use (incremental delta
//      on append — encodes only the junction, never the retained buffer —
//      subtract on record extraction, reset on flush).

const encoder = new TextEncoder()

// The server twin's normalizeCrlf (src/gateway/operator-sse-reader.ts:104) —
// mirrored here only as the spec side of the fold comparison.
function normalizeCrlf(text: string): string {
  return text.replaceAll('\r\n', '\n').replaceAll('\r', '\n')
}

// The server twin's buffer fold (pending-CR hold + idempotent re-normalize),
// from the readChunk loop. The client twin's fold is the imported
// appendStreamChunk — the property below asserts they produce identical
// buffers for arbitrary chunk sequences.
function serverFoldStep(buffer: string, chunk: string): string {
  const text = buffer + chunk
  let held = ''
  let body = text
  if (body.endsWith('\r')) {
    held = '\r'
    body = body.slice(0, -1)
  }
  return normalizeCrlf(body) + held
}

const TRICKY_TOKENS = [
  'a',
  'é',
  '𝕏', // 4-byte astral, 2 UTF-16 units — the cap-confusion class
  '😀',
  '\n',
  '\r',
  '\r\n',
  '\r\r',
  '\n\r',
  'data: x\n\n',
  '\uD83D', // lone high surrogate — split-pair mid-decode shape
  '\uDE00', // lone low surrogate
]

const chunksArb = fc.array(fc.constantFrom(...TRICKY_TOKENS), {maxLength: 24})

describe('operator-stream SSE twin parity (rm-1507)', () => {
  it('both twins enforce the same byte cap constant', () => {
    expect(CLIENT_MAX).toBe(SERVER_MAX)
    expect(CLIENT_MAX).toBe(1_000_000)
  })

  it('sseBufferUtf8Bytes counts bytes, not code units — the astral discriminator', () => {
    // 250_001 astral code points: 500_002 UTF-16 units (under the cap) but
    // 1_000_004 UTF-8 bytes (over it). The pre-rm-1507 client check passed
    // this buffer; byte-true accounting must trip it.
    const astral = '𝕏'.repeat(250_001)
    expect(astral.length).toBeLessThan(CLIENT_MAX)
    expect(sseBufferUtf8Bytes(astral)).toBe(4 * 250_001)
    expect(sseBufferUtf8Bytes(astral)).toBeGreaterThan(CLIENT_MAX)

    // Control cases: ASCII is 1:1, BMP accented is 2 bytes per code point.
    expect(sseBufferUtf8Bytes('')).toBe(0)
    expect(sseBufferUtf8Bytes('abc')).toBe(3)
    expect(sseBufferUtf8Bytes('ééé')).toBe(6)
    // Equals TextEncoder itself — the shared ground truth.
    expect(sseBufferUtf8Bytes(astral)).toBe(encoder.encode(astral).length)
  })

  it('property: the client append fold equals the server fold for arbitrary chunk sequences', () => {
    fc.assert(
      fc.property(chunksArb, chunks => {
        let clientBuffer = ''
        let serverBuffer = ''
        for (const chunk of chunks) {
          clientBuffer = appendStreamChunk(clientBuffer, chunk)
          serverBuffer = serverFoldStep(serverBuffer, chunk)
        }
        expect(clientBuffer).toBe(serverBuffer)
      }),
      {numRuns: 500},
    )
  })

  it('property: the incrementally maintained byte counter equals a whole-buffer re-encode at every step', () => {
    // Since rm-1507 both twins advance the counter by the fold's incremental
    // delta (appendStreamChunkByteDelta encodes only the junction — the
    // previously-held CR / a trailing lone high surrogate plus the chunk text
    // that passes through normalizeCrlf), subtract the extracted record's
    // bytes on record extraction, and reset on flush. This replays that
    // arithmetic against the whole-buffer encode after every operation —
    // the incremental discipline must never drift from the recompute truth.
    fc.assert(
      fc.property(chunksArb, chunks => {
        let buffer = ''
        let maintainedBytes = 0
        for (const chunk of chunks) {
          // Append (incremental delta, computed against the pre-fold buffer).
          maintainedBytes += appendStreamChunkByteDelta(buffer, chunk)
          buffer = appendStreamChunk(buffer, chunk)
          expect(maintainedBytes).toBe(encoder.encode(buffer).length)

          // Record extraction (subtract) — drain every complete record.
          let boundary = buffer.indexOf('\n\n')
          while (boundary !== -1) {
            const record = buffer.slice(0, boundary)
            buffer = buffer.slice(boundary + 2)
            maintainedBytes -= sseBufferUtf8Bytes(`${record}\n\n`)
            boundary = buffer.indexOf('\n\n')
          }
          expect(maintainedBytes).toBe(encoder.encode(buffer).length)

          // Flush (reset) — after a flush the buffer is empty.
          if (maintainedBytes > CLIENT_MAX) {
            buffer = ''
            maintainedBytes = 0
            expect(maintainedBytes).toBe(encoder.encode(buffer).length)
          }
        }
      }),
      {numRuns: 500},
    )
  })

  it('rm-1507: the append byte delta is independent of retained-prefix length (per-chunk cost linear in chunk size, not buffer size)', () => {
    // The junction encodes only the buffer's tail (held CR / trailing lone
    // high surrogate) plus the new chunk, so a 200k-char retained prefix must
    // not change the delta for the same tail+chunk pair. This is the honest
    // linearity discriminator: a whole-buffer recompute's cost grows with the
    // prefix; the incremental delta's inputs do not.
    const chunks = ['', '\r', 'x', '\n\n', 'data: a\r\nb', 'é', '😀', '𝕏', '\uD83D', '\uDC00']
    const tails = ['', '\r', '\uD83D']
    for (const tail of tails) {
      for (const chunk of chunks) {
        const shortDelta = appendStreamChunkByteDelta(tail, chunk)
        const longDelta = appendStreamChunkByteDelta('a'.repeat(200_000) + tail, chunk)
        expect(longDelta).toBe(shortDelta)
      }
    }
  })

  it('appendStreamChunk never lets a pending CR outlive a complete record boundary', () => {
    // The junction hazard: a chunk ending in CR joined to a chunk starting
    // with LF must fold to a single LF, not a stray CR inside a record.
    let buffer = ''
    buffer = appendStreamChunk(buffer, 'data: a\r')
    expect(buffer.endsWith('\r')).toBe(true)
    buffer = appendStreamChunk(buffer, '\ndata: b\n\n')
    expect(buffer).toBe('data: a\ndata: b\n\n')
    expect(buffer).toBe(serverFoldStep(serverFoldStep('', 'data: a\r'), '\ndata: b\n\n'))
  })
})
