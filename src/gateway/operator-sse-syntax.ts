/**
 * Shared SSE wire-syntax layer for the operator run stream — the ONE
 * definition site for the record-parsing primitives (rm-114).
 *
 * Two twins consume these primitives:
 * - src/gateway/operator-sse-reader.ts imports this module directly.
 * - public/operator-stream.js embeds a GENERATED, type-stripped copy of this
 *   file between the `SSE-SYNTAX-GENERATED` markers (the browser twin is
 *   served raw from public/ with no build step, so it cannot import TS).
 *   Regenerate with `node scripts/gen-operator-sse-syntax.ts` — never edit the
 *   generated block by hand; any divergence between this file and the embedded
 *   copy fails the gate at test/operator-sse-syntax-divergence.test.ts (runs
 *   under `pnpm test`).
 *
 * Scope: ONLY the WHATWG-syntax layer — CRLF/CR normalization, chunk
 * appending with the pending-CR hold (rm-477), field collection with the
 * multi-`data:` join (rm-484), and the UTF-8 byte-cap accounting unit
 * (rm-114). The per-twin semantic layers (typed frames, allowlists, error
 * shapes) stay in their consumers; the wire-or-fold decision for the twins
 * themselves is tracked separately at rm-253.
 */

/**
 * Hard cap on the incremental SSE stream buffer, in UTF-8 BYTES — not UTF-16
 * code units (string.length undercounts every astral character by half).
 * Guards against unbounded memory growth from a hostile or broken upstream.
 */
export const MAX_SSE_BUFFER_BYTES = 1_000_000

const sseByteEncoder = new TextEncoder()

/**
 * Byte length of `text` in UTF-8 — the unit of the MAX_SSE_BUFFER_BYTES cap.
 * Uses TextEncoder (not .length) so astral characters count as 4 bytes and
 * CJK as 3, matching what actually crosses the wire.
 */
export function sseUtf8ByteLength(text: string): number {
  return sseByteEncoder.encode(text).length
}

/**
 * Normalize CRLF and lone CR line endings to LF.
 * Must be applied before searching for record boundaries ('\n\n').
 */
export function normalizeCrlf(text: string): string {
  // Replace \r\n first (order matters — avoids double-replacing the \r)
  return text.replaceAll('\r\n', '\n').replaceAll('\r', '\n')
}

/**
 * Append one decoded read() chunk to the stream buffer, holding a trailing CR
 * back (rm-477) so a CRLF pair split across chunks cannot forge a phantom
 * record boundary: normalizing a lone trailing CR to LF would terminate its
 * line early, and the LF that opens the NEXT chunk would then read as a blank
 * line. The held CR normalizes together with the following chunk.
 * normalizeCrlf is idempotent on already-normalized text, so re-normalizing
 * the concatenation is safe; only the junction between a held CR and a
 * following LF changes.
 */
export function appendStreamChunk(buffer: string, decoded: string): string {
  let text = buffer + decoded
  let held = ''
  if (text.endsWith('\r')) {
    held = '\r'
    text = text.slice(0, -1)
  }
  return normalizeCrlf(text) + held
}

/** Fields collected from one complete SSE record (syntax layer only). */
export interface SseRecordFields {
  /** Value of the `event:` line, if any (undefined when absent). */
  readonly eventName: string | undefined
  /**
   * All `data:` lines joined with U+000A (WHATWG §9.2.6, rm-484), or
   * undefined when the record carried no `data:` line at all.
   */
  readonly data: string | undefined
}

function stripFieldLeadingSpace(value: string): string {
  return value.startsWith(' ') ? value.slice(1) : value
}

/**
 * Collect the fields of one complete SSE record (the text between two blank
 * lines, trailing terminator included or not — extra blank lines are inert).
 *
 * - comment-only records (e.g. `: heartbeat`) → null — no fields, no frame
 * - each `data:` line contributes its value to the joined payload; per WHATWG
 *   §9.2.6 the parts concatenate with a single U+000A between them, so a JSON
 *   payload split across two `data:` lines reassembles byte-exactly (rm-484 —
 *   the last-wins `data:` overwrite this replaces dropped all but the final
 *   line of a multi-line payload)
 * - after a field name's colon exactly ONE leading space is stripped (spec
 *   field-value semantics); `data:{"x":1}` and `data: {"x":1}` are equivalent
 * - unknown field names (id/retry/…) are ignored — this contract carries no
 *   `id:` fields and sets no retry interval (see rm-220's Last-Event-ID
 *   disposition)
 *
 * Only the syntax layer lives here; validating that `eventName` names a known
 * frame and that `data` parses as a JSON object belongs to each twin's
 * semantic layer.
 */
export function parseSseRecordFields(record: string): SseRecordFields | null {
  const lines = normalizeCrlf(record).split('\n')
  let eventName: string | undefined
  let dataParts: string[] | undefined
  for (const line of lines) {
    if (line.startsWith(':')) continue
    if (line.startsWith('event:')) {
      eventName = stripFieldLeadingSpace(line.slice('event:'.length))
    } else if (line.startsWith('data:')) {
      dataParts = dataParts ?? []
      dataParts.push(stripFieldLeadingSpace(line.slice('data:'.length)))
    }
  }
  if (eventName === undefined && dataParts === undefined) return null
  const data = dataParts === undefined ? undefined : dataParts.join('\n')
  return {eventName, data}
}
