/**
 * Property-based suite for the operator SSE frame parser (rm-144).
 *
 * parseSseChunk is the security boundary between the gateway's event stream
 * and the client's frame dispatch. These properties pin:
 * - line-ending normalization invariance (LF / CRLF / lone CR),
 * - heartbeat-comment transparency,
 * - wire round-trip fidelity for every named event,
 * - fail-closed behavior with fixed (no-oracle) error strings.
 */
import fc from 'fast-check'
import {describe, expect, it} from 'vitest'
import {OPERATOR_CONTRACT_VERSION} from '../src/gateway/operator-contract/version.ts'
import {parseSseChunk} from '../src/gateway/operator-sse-reader.ts'

// ---------------------------------------------------------------------------
// Generators for valid frames
// ---------------------------------------------------------------------------

const runIdArb = fc.stringMatching(/^[\w-]{6,32}$/)

const readyFrameArb = fc.constant({
  wireEvent: 'ready',
  wireData: {contractVersion: OPERATOR_CONTRACT_VERSION},
  frame: {type: 'ready', data: {contractVersion: OPERATOR_CONTRACT_VERSION}},
})

const statusFrameArb = fc
  .record({
    runId: runIdArb,
    entityRef: fc.stringMatching(/^[\w.\-/]{1,64}$/),
    surface: fc.constantFrom('github', 'discord', 'web'),
    phase: fc.constantFrom('PENDING', 'ACKNOWLEDGED', 'EXECUTING', 'COMPLETED', 'FAILED', 'CANCELLED'),
    status: fc.constantFrom('queued', 'blocked', 'running', 'waiting_for_approval', 'succeeded', 'failed', 'cancelled'),
    startedAt: fc.date({noInvalidDate: true}).map(d => d.toISOString()),
    stale: fc.boolean(),
  })
  .map(data => ({wireEvent: 'status', wireData: data, frame: {type: 'status', data}}))

const resetFrameArb = fc
  .record({
    runId: runIdArb,
    reason: fc.constantFrom('no-snapshot', 'terminal', 'shutdown', 'max-duration', 'writer-error', 'overflow'),
  })
  .map(data => ({wireEvent: 'reset', wireData: data, frame: {type: 'reset', data}}))

const outputFrameArb = fc
  .record({
    runId: runIdArb,
    text: fc.string({maxLength: 200}),
    final: fc.boolean(),
    seq: fc.nat({max: 100000}),
  })
  .map(({seq, ...data}) => ({wireEvent: 'output', wireData: {seq, ...data}, frame: {type: 'output', data: {seq, ...data}}}))

const approvalFrameArb = fc
  .record({
    runId: runIdArb,
    requestID: runIdArb,
    settled: fc.boolean(),
    permission: fc.stringMatching(/^[a-z_]{2,20}$/),
  })
  .map(({settled, permission, ...rest}) => {
    const wireData = settled
      ? {runId: rest.runId, requestID: rest.requestID, settled}
      : {permission, ...rest, settled}
    const data = settled ? {runId: rest.runId, requestID: rest.requestID, settled} : wireData
    return {wireEvent: 'approval', wireData, frame: {type: 'approval', data}}
  })

const frameArb = fc.oneof(readyFrameArb, statusFrameArb, resetFrameArb, outputFrameArb, approvalFrameArb)

type WireFrame = (typeof frameArb extends fc.Arbitrary<infer T> ? T : never)

/** Serialize a frame as an SSE record in the requested line-ending style. */
function serialize(frame: WireFrame, eol: '\n' | '\r\n' | '\r'): string {
  const record = `event: ${frame.wireEvent}${eol}data: ${JSON.stringify(frame.wireData)}${eol}`
  return `${record}${eol}`
}

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe('operator SSE parser properties (rm-144)', () => {
  it('line-ending invariance: LF, CRLF, and lone CR wire forms yield identical frames', () => {
    fc.assert(
      fc.property(fc.array(frameArb, {minLength: 1, maxLength: 20}), frames => {
        const lf = frames.map(f => serialize(f, '\n')).join('')
        const crlf = frames.map(f => serialize(f, '\r\n')).join('')
        const cr = frames.map(f => serialize(f, '\r')).join('')
        const expected = frames.map(f => f.frame)
        expect(parseSseChunk(lf).map(r => (r.success ? r.frame : r.error))).toEqual(expected)
        expect(parseSseChunk(crlf).map(r => (r.success ? r.frame : r.error))).toEqual(expected)
        expect(parseSseChunk(cr).map(r => (r.success ? r.frame : r.error))).toEqual(expected)
      }),
      {numRuns: 100},
    )
  })

  it('heartbeat transparency: comment-only records never produce frames or alter neighbors', () => {
    fc.assert(
      fc.property(fc.array(frameArb, {minLength: 1, maxLength: 10}), frames => {
        const withHeartbeats = frames
          .map(f => `: heartbeat ${'x'}\n${serialize(f, '\n')}`)
          .join('')
        const expected = frames.map(f => f.frame)
        expect(parseSseChunk(withHeartbeats).map(r => (r.success ? r.frame : r.error))).toEqual(expected)
      }),
      {numRuns: 100},
    )
  })

  it('wire round-trip: every valid frame serializes and parses back deep-equal', () => {
    fc.assert(
      fc.property(frameArb, frame => {
        const results = parseSseChunk(serialize(frame, '\n'))
        expect(results).toHaveLength(1)
        const first = results.at(0)
        if (!first) throw new Error('expected exactly one record')
        expect(first.success).toBe(true)
        if (first.success) {
          expect(first.frame).toEqual(frame.frame)
        }
      }),
      {numRuns: 300},
    )
  })

  it('fail-closed no-oracle: corrupted data lines produce fixed errors that never echo the payload', () => {
    fc.assert(
      fc.property(frameArb, fc.stringMatching(/^[A-Z]{8,20}$/), (frame, marker) => {
        const corrupt = `event: ${frame.wireEvent}\ndata: {not json ${marker}\n\n`
        const results = parseSseChunk(corrupt)
        expect(results).toHaveLength(1)
        const first = results.at(0)
        if (!first) throw new Error('expected exactly one record')
        expect(first.success).toBe(false)
        if (first.success) return
        expect(first.error.message).toBe('sse record data is not valid JSON')
        expect(first.error.message).not.toContain(marker)
      }),
      {numRuns: 200},
    )
  })

  it('unknown event names are rejected with a fixed message that never echoes the name', () => {
    fc.assert(
      fc.property(
        fc
          .stringMatching(/^\w{4,16}$/)
          .filter(n => !['ready', 'status', 'reset', 'output', 'approval'].includes(n))
          // The fixed message itself ends in 'name' — names that are substrings
          // of it would false-positive the no-echo assertion.
          .filter(n => !'sse record has unrecognized event name'.includes(n)),
        name => {
          const results = parseSseChunk(`event: ${name}\ndata: {}\n\n`)
          expect(results).toHaveLength(1)
          const first = results.at(0)
          if (!first) throw new Error('expected exactly one record')
          expect(first.success).toBe(false)
          if (first.success) return
          expect(first.error.message).toBe('sse record has unrecognized event name')
          expect(first.error.message).not.toContain(name)
        }),
      {numRuns: 200},
    )
  })

  it('concatenation: parsing N records in one chunk equals parsing them chunk-by-chunk', () => {
    fc.assert(
      fc.property(fc.array(frameArb, {minLength: 2, maxLength: 12}), frames => {
        const whole = frames.map(f => serialize(f, '\n')).join('')
        const wholeFrames = parseSseChunk(whole).map(r => (r.success ? r.frame : r.error))
        // Split the wire text at every record boundary and parse each piece.
        const pieces = frames.map(f => serialize(f, '\n'))
        const pieceFrames = pieces.flatMap(p => parseSseChunk(p).map(r => (r.success ? r.frame : r.error)))
        expect(pieceFrames).toEqual(wholeFrames)
      }),
      {numRuns: 100},
    )
  })
})
