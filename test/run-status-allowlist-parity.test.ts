import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

import * as operatorRunIndex from '../public/operator-run-index.js'
import * as operatorStream from '../public/operator-stream.js'
import {
  RUN_SUMMARY_STATUSES,
  STREAM_ONLY_RUN_STATUSES,
  STREAM_RUN_STATUSES,
} from '../src/gateway/operator-contract/run-status.ts'

const runStatusDir = new URL('../src/gateway/operator-contract/', import.meta.url)
const publicDir = new URL('../public/', import.meta.url)
const webOperatorDir = new URL('../web/src/operator/', import.meta.url)

function setMembers(values: readonly string[]): string[] {
  return [...new Set(values)].sort()
}

/** Strip block and line comments so comment prose cannot mask (or fake) re-inlined lists. */
function stripComments(text: string): string {
  return text
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/^\s*\/\/.*$/gm, '')
}

const ALL_STATUSES = [
  'queued',
  'blocked',
  'running',
  'waiting_for_approval',
  'waiting_for_question',
  'succeeded',
  'failed',
  'cancelled',
]

/** The vocabulary is single-sourced: these files must not re-inline status literals. */
const NO_INLINE_FILES = [
  {label: 'src/gateway/operator-contract/run-summary.ts', url: new URL('run-summary.ts', runStatusDir)},
  {label: 'web/src/operator/runtime.ts', url: new URL('runtime.ts', webOperatorDir)},
]

/** d.ts type unions that must mirror the canonical sets. */
const TYPE_UNION_FILES = [
  {label: 'public/operator-run-index.d.ts', url: new URL('operator-run-index.d.ts', publicDir), expect: 'summary'},
  {label: 'public/operator-stream.d.ts', url: new URL('operator-stream.d.ts', publicDir), expect: 'summary'},
] as const

function extractTypeUnion(text: string, typeName: string): string[] | undefined {
  const match = text.match(new RegExp(String.raw`export type ${typeName} = ([^\n=]+?)(?:\n|$)`))
  if (!match || match[1] === undefined) return undefined
  return match[1]
    .split('|')
    .map(part => part.trim().replaceAll(/^['"]|['"]$/g, ''))
    .filter(part => part.length > 0)
}

describe('run-status vocabulary single-sourcing (rm-1463)', () => {
  it('canonical module holds the full stream vocabulary exactly once', () => {
    expect(STREAM_RUN_STATUSES).toHaveLength(8)
    expect(new Set(STREAM_RUN_STATUSES).size).toBe(8)
    for (const status of ALL_STATUSES) {
      expect(STREAM_RUN_STATUSES, `STREAM_RUN_STATUSES must contain ${status}`).toContain(status)
    }
  })

  it('summary statuses are exactly the stream vocabulary minus the overlay trio', () => {
    expect(STREAM_ONLY_RUN_STATUSES).toHaveLength(3)
    expect(RUN_SUMMARY_STATUSES).toHaveLength(5)
    const overlay = new Set<string>(STREAM_ONLY_RUN_STATUSES)
    for (const status of RUN_SUMMARY_STATUSES) {
      expect(overlay.has(status), `${status} must not be both summary and overlay`).toBe(false)
      expect(STREAM_RUN_STATUSES).toContain(status)
    }
    expect(setMembers([...RUN_SUMMARY_STATUSES, ...STREAM_ONLY_RUN_STATUSES])).toEqual(
      setMembers(STREAM_RUN_STATUSES),
    )
  })

  it('public/operator-stream.js VALID_STATUSES mirrors the canonical stream list', () => {
    expect(operatorStream.VALID_STATUSES).toBeInstanceOf(Set)
    expect(setMembers([...operatorStream.VALID_STATUSES])).toEqual(setMembers(STREAM_RUN_STATUSES))
  })

  it('public/operator-run-index.js VALID_RUN_SUMMARY_STATUSES mirrors the canonical summary list', () => {
    expect(operatorRunIndex.VALID_RUN_SUMMARY_STATUSES).toBeInstanceOf(Set)
    expect(setMembers([...operatorRunIndex.VALID_RUN_SUMMARY_STATUSES])).toEqual(
      setMembers(RUN_SUMMARY_STATUSES),
    )
  })

  it('run-summary.ts and web runtime derive instead of re-inlining status literals', () => {
    for (const file of NO_INLINE_FILES) {
      const code = stripComments(readFileSync(file.url, 'utf8'))
      for (const status of ALL_STATUSES) {
        expect(
          code.includes(`'${status}'`) || code.includes(`"${status}"`),
          `${file.label} re-inlines status literal '${status}' — derive from run-status.ts instead`,
        ).toBe(false)
      }
    }
    // The derivation imports must be present.
    const runSummary = readFileSync(new URL('run-summary.ts', runStatusDir), 'utf8')
    expect(runSummary).toContain("import {isOperatorFailureKind, RUN_SUMMARY_STATUSES} from './run-status.ts'")
    const runtime = stripComments(readFileSync(new URL('runtime.ts', webOperatorDir), 'utf8'))
    expect(runtime).toContain("VALID_RUN_SUMMARY_STATUSES} from '../../../public/operator-run-index.js'")
  })

  it('d.ts RunSummaryStatus type unions mirror the canonical summary set', () => {
    for (const file of TYPE_UNION_FILES) {
      const text = readFileSync(file.url, 'utf8')
      const union = extractTypeUnion(text, 'RunSummaryStatus')
      expect(union, `${file.label} must declare export type RunSummaryStatus`).toBeDefined()
      expect([...(union ?? [])].sort()).toEqual(setMembers(RUN_SUMMARY_STATUSES))
    }
  })

  it('the intentional skew is preserved: stream accepts the trio, summaries reject it', () => {
    // Behavioral cross-check: the browser stream vocabulary is a strict superset of the
    // server-validated summary vocabulary, and the difference is exactly the overlay trio.
    const stream = new Set<string>([...operatorStream.VALID_STATUSES])
    const summary = new Set<string>([...operatorRunIndex.VALID_RUN_SUMMARY_STATUSES])
    for (const status of STREAM_ONLY_RUN_STATUSES) {
      expect(stream.has(status), `stream vocabulary must accept overlay status ${status}`).toBe(true)
      expect(summary.has(status), `summary vocabulary must reject overlay status ${status}`).toBe(false)
    }
  })
})
