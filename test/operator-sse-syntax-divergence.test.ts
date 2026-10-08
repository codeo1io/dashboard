/**
 * Hard divergence gate for the shared SSE syntax layer (rm-114).
 *
 * src/gateway/operator-sse-syntax.ts is the ONE definition site for the SSE
 * record-parsing primitives. public/operator-stream.js embeds a generated,
 * type-stripped copy of that file between the SSE-SYNTAX-GENERATED markers
 * (served raw from public/ with no build step — it cannot import TS). This
 * gate fails the moment the two halves diverge: a hand edit to either side,
 * or a canonical change that was not regenerated into the twin, cannot pass
 * `pnpm test`.
 */
import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'
import {
  appendStreamChunk as twinAppendStreamChunk,
  sseUtf8ByteLength as twinByteLength,
  MAX_SSE_BUFFER_BYTES as twinMaxBytes,
  normalizeCrlf as twinNormalizeCrlf,
  parseSseRecordFields as twinParseFields,
} from '../public/operator-stream.js'
import {
  BEGIN_MARKER,
  END_MARKER,
  generateOperatorSseSyntaxBlock,
} from '../scripts/gen-operator-sse-syntax.ts'
import {
  appendStreamChunk as canonicalAppendStreamChunk,
  sseUtf8ByteLength as canonicalByteLength,
  MAX_SSE_BUFFER_BYTES as canonicalMaxBytes,
  normalizeCrlf as canonicalNormalizeCrlf,
  parseSseRecordFields as canonicalParseFields,
} from '../src/gateway/operator-sse-syntax.ts'

const readRepoFile = (path: string): string => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

// Corpus shared by the parity assertions below — deliberately includes the
// shapes that historically broke the twins: CRLF/CR-only wire framing,
// chunk-split CRLF pairs (rm-477), multi-`data:` records (rm-484), astral
// characters (UTF-8 byte accounting), and comment-only heartbeats.
const records = [
  'event: ready\ndata: {"contractVersion":"1.6.0"}',
  'event: ready\r\ndata: {"contractVersion":"1.6.0"}\r',
  ': heartbeat',
  ':',
  'event: output\ndata: {"a":1,"b":\ndata: 2}',
  'event: output\ndata:{"x":1}', // no mandatory space
  'data: {"a":1}',
  'event: status\ndata: {\ndata: "half one"\ndata: "half two"}',
  'id: 42\nretry: 100\nevent: ready\ndata: {}', // unknown fields ignored (rm-220)
  'event: output\ndata: 🦆🦆🦆 astral bytes',
  '',
]

const chunkPairs: readonly (readonly [string, string])[] = [
  ['', 'event: ready\ndata: {"contractVersion":"1.6.0"}\n\n'],
  ['event: ready\ndata: {"contractVersion":"1.6.0"}\n', '\nevent: status'],
  ['event: output\r', '\ndata: 1\n\n'], // CRLF pair split across chunks (rm-477)
  ['event: output\r', '\ndata: 1\r\n\r'], // CRLF pair split + CR-only terminators
  ['\r', ''],
  ['🦆🦆', '🦆 trailing'],
]

describe('SSE syntax layer — single definition site (rm-114)', () => {
  it('the embedded block in public/operator-stream.js is byte-identical to the generated canonical source', () => {
    const twin = readRepoFile('public/operator-stream.js')
    const begin = twin.indexOf(BEGIN_MARKER)
    const end = twin.indexOf(END_MARKER)
    expect(begin, 'BEGIN marker present').toBeGreaterThan(-1)
    expect(end, 'END marker present').toBeGreaterThan(begin)
    // Exactly one marker pair — a duplicated block would double-declare.
    expect(twin.indexOf(BEGIN_MARKER, begin + 1)).toBe(-1)
    expect(twin.indexOf(END_MARKER, end + 1)).toBe(-1)
    const embedded = `${twin.slice(begin, end + END_MARKER.length)}\n`
    expect(embedded).toBe(generateOperatorSseSyntaxBlock())
  })

  it('the server reader consumes the canonical module and carries no local copy', () => {
    const reader = readRepoFile('src/gateway/operator-sse-reader.ts')
    expect(reader).toContain("from './operator-sse-syntax.ts'")
    // A re-introduced local definition is the exact regression rm-114 closes.
    expect(reader).not.toMatch(/export const MAX_SSE_BUFFER_BYTES/)
    expect(reader).not.toMatch(/function normalizeCrlf\(/)
    expect(reader).not.toMatch(/function appendStreamChunk\(/)
    expect(reader).not.toMatch(/function sseUtf8ByteLength\(/)
  })

  it('no twin carries a last-wins data: overwrite (rm-484 single-join)', () => {
    const reader = readRepoFile('src/gateway/operator-sse-reader.ts')
    const twin = readRepoFile('public/operator-stream.js')
    for (const source of [reader, twin]) {
      expect(source).not.toMatch(/^\s*dataLine = /m)
    }
  })

  it('canonical and twin agree on every syntax-layer primitive (loaded from both modules)', () => {
    expect(twinMaxBytes).toBe(canonicalMaxBytes)
    for (const record of records) {
      expect(JSON.stringify(twinParseFields(record))).toBe(JSON.stringify(canonicalParseFields(record)))
      expect(twinNormalizeCrlf(record)).toBe(canonicalNormalizeCrlf(record))
      expect(twinByteLength(record)).toBe(canonicalByteLength(record))
    }
    for (const [buffer, chunk] of chunkPairs) {
      expect(twinAppendStreamChunk(buffer, chunk)).toBe(canonicalAppendStreamChunk(buffer, chunk))
    }
  })
})
