/**
 * rm-595 — parity guard for the three manual-sync validateDynamicId copies.
 *
 * validateDynamicId exists in three trees that cannot share a module:
 * - src/gateway/operator-client.ts (server; strip-only native-TS),
 * - web/src/operator/validate-dynamic-id.ts (web SPA; must never import src/ —
 *   the Docker builder stage copies only web/),
 * - public/operator-stream.js (no-build standalone browser bundle; cannot
 *   import from src/ or web/).
 *
 * Until now only the web copy was directly unit-tested, so a tightening (or a
 * loosening) in any one copy silently stranded the others accepting/rejecting
 * different id sets. This suite pins all three against ONE hostile corpus and
 * asserts identical verdicts, plus known-verdict pins so the corpus cannot
 * silently flip all three together.
 *
 * Precedents: web/src/push/push-types.test.ts (the repo's pin-the-copy
 * pattern) and test/operator-runtime.test.ts (cross-tree import of web/src
 * proven). Mutation demo (run in the implementing batch): drift any single
 * copy (e.g. drop the `..` rejection from the public copy) → this suite goes
 * red on that copy only.
 */
import fc from 'fast-check'
import {describe, expect, it} from 'vitest'
import {validateDynamicId as publicValidateDynamicId} from '../public/operator-stream.js'
import {validateDynamicId as serverValidateDynamicId} from '../src/gateway/operator-client.ts'
import {validateDynamicId as webValidateDynamicId} from '../web/src/operator/validate-dynamic-id.ts'

const COPIES: readonly {name: string; validate: (id: string) => boolean}[] = [
  {name: 'server (src/gateway/operator-client.ts)', validate: serverValidateDynamicId},
  {name: 'web (web/src/operator/validate-dynamic-id.ts)', validate: webValidateDynamicId},
  {name: 'public (public/operator-stream.js)', validate: publicValidateDynamicId},
]

/** Corpus members that MUST be rejected by every copy. */
const HOSTILE_IDS: readonly {id: string; why: string}[] = [
  {id: '', why: 'blank'},
  {id: '   ', why: 'whitespace-only'},
  {id: '\t', why: 'whitespace-only (tab)'},
  {id: 'a/b', why: 'literal slash'},
  {id: '/', why: 'bare slash'},
  {id: String.raw`a\b`, why: 'literal backslash'},
  {id: '\\', why: 'bare backslash'},
  {id: 'a%2Fb', why: 'percent-encoded slash (upper)'},
  {id: 'a%2fb', why: 'percent-encoded slash (lower)'},
  {id: '%2F', why: 'bare percent-encoded slash'},
  {id: 'a%5Cb', why: 'percent-encoded backslash (upper)'},
  {id: 'a%5cb', why: 'percent-encoded backslash (lower)'},
  {id: '%00', why: 'percent-encoded NUL'},
  {id: 'a%0Db', why: 'percent-encoded CR (upper)'},
  {id: 'a%0db', why: 'percent-encoded CR (lower)'},
  {id: 'a%0Ab', why: 'percent-encoded LF (upper)'},
  {id: 'a%0ab', why: 'percent-encoded LF (lower)'},
  {id: 'a\u0000b', why: 'literal NUL'},
  {id: 'a\u0001b', why: 'literal control char (0x01)'},
  {id: 'a\u0009b', why: 'literal TAB (control range 0x00-0x1f)'},
  {id: 'a\u001Fb', why: 'literal control char (0x1F edge)'},
  {id: '.', why: 'dot segment'},
  {id: '..', why: 'dot-dot segment (traversal)'},
  {id: '%2e', why: 'decoded dot'},
  {id: '%2e%2e', why: 'decoded dot-dot (traversal after decode)'},
  {id: 'run/..', why: 'traversal segment after literal slash'},
  {id: 'a%2f..%2fb', why: 'encoded separators around dot-dot'},
  {id: '%', why: 'malformed percent-encoding (decodeURIComponent throws)'},
  {id: 'a%zz', why: 'malformed percent-encoding (invalid hex)'},
  {id: '%E0%A4%A', why: 'malformed UTF-8 percent-encoding (truncated sequence)'},
  {id: ' %2F', why: 'encoded slash with leading whitespace'},
  {id: '%252e%252e', why: 'double-encoded dot-dot — still percent-encoded after the single decode (rm-767)'},
]

/** Corpus members that MUST be accepted by every copy (plain dynamic ids). */
const VALID_IDS: readonly string[] = [
  'run-001',
  'req_abc-123',
  'v1.2.3', // dots WITHIN a segment are legal; only `.`/`..` segments are not
  '%41%42', // 'AB' after decode — safe encoded text
  'café-run', // non-ASCII literal (safe: no separators, no controls)
  'a%2Db', // encoded dash — safe
  'x'.repeat(64),
]

describe('validateDynamicId three-copy parity (rm-595)', () => {
  it('every hostile corpus id is rejected by all three copies', () => {
    for (const {id, why} of HOSTILE_IDS) {
      for (const {name, validate} of COPIES) {
        expect(validate(id), `${name} must reject ${JSON.stringify(id)} (${why})`).toBe(false)
      }
    }
  })

  it('every valid corpus id is accepted by all three copies', () => {
    for (const id of VALID_IDS) {
      for (const {name, validate} of COPIES) {
        expect(validate(id), `${name} must accept ${JSON.stringify(id)}`).toBe(true)
      }
    }
  })

  it('cross-copy verdict agreement: all three return the SAME verdict for every corpus member', () => {
    const corpus = [...HOSTILE_IDS.map(h => h.id), ...VALID_IDS]
    for (const id of corpus) {
      const verdicts = COPIES.map(({validate}) => validate(id))
      const agree = verdicts.every(verdict => verdict === verdicts[0])
      expect(agree, `copies diverge on ${JSON.stringify(id)}: ${verdicts.join('/')}`).toBe(true)
    }
  })

  it('cross-copy verdict agreement on generated ids (bounded property)', () => {
    // Generate strings over a hostile-prone alphabet: separators, percent,
    // dots, letters, digits, controls. Agreement (not the verdict itself) is
    // the property — any drift in one copy shows up as disagreement.
    const arbitrary = fc.string({
      minLength: 0,
      maxLength: 12,
      unit: fc.constantFrom(...['/', '\\', '%', '.', 'a', 'B', '9', '2', 'F', 'f', '0', '-', '_', '\u0000', '\n']),
    })
    fc.assert(
      fc.property(arbitrary, id => {
        const verdicts = COPIES.map(({validate}) => validate(id))
        return verdicts.every(verdict => verdict === verdicts[0])
      }),
      {numRuns: 300},
    )
  })

  it('the corpus has teeth: pin a representative verdict per rejection class', () => {
    // Guard against the corpus itself rotting (e.g. an id accidentally edited
    // into the valid list). One known verdict per documented rejection class.
    expect(HOSTILE_IDS).toHaveLength(32)
    expect(VALID_IDS).toHaveLength(7)
    expect(serverValidateDynamicId('run-001')).toBe(true)
    expect(serverValidateDynamicId('..')).toBe(false)
    expect(serverValidateDynamicId('%2e%2e')).toBe(false)
    expect(serverValidateDynamicId('%E0%A4%A')).toBe(false)
  })
})
