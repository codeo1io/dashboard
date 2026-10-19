import {describe, expect, it} from 'vitest'
import {
  deriveRunStates,
  isLandedBySubject,
  landedFullRunIds,
  renderRunStateArgs,
  type ConductorPrWithOid,
} from '../scripts/conductor-run-state-derive.ts'

function pr(overrides: Partial<ConductorPrWithOid> = {}): ConductorPrWithOid {
  return {
    number: 929,
    headRefName: 'conductor/ci-21d8b65c-validation',
    headRefOid: '0f1e2d3c4b5a69788796a5b4c3d2e1f001234567',
    ...overrides,
  }
}

const FULL_RUN = '21d8b65c9c38452e823d0c8a00874498'

describe('conductor-run-state-derive (rm-2009)', () => {
  it('landedFullRunIds extracts run ids from landing-merge subjects, case-insensitive', () => {
    const ids = landedFullRunIds([
      `merge: autonomously integrate run ${FULL_RUN}`,
      'Merge: autonomously integrate run ABCDEF0123456789ABCDEF0123456789',
      'some unrelated commit subject',
      'merge: autonomously integrate run 12345678', // short id still captured
    ])
    expect(ids.has(FULL_RUN)).toBe(true)
    expect(ids.has('abcdef0123456789abcdef0123456789')).toBe(true)
    expect(ids.has('12345678')).toBe(true)
    expect(ids.size).toBe(3)
  })

  it('isLandedBySubject matches short-id prefix against full landed ids and vice versa', () => {
    const landed = new Set([FULL_RUN])
    expect(isLandedBySubject('21d8b65c', landed)).toBe(true)
    expect(isLandedBySubject(FULL_RUN, landed)).toBe(true)
    expect(isLandedBySubject('99999999', landed)).toBe(false)
    expect(isLandedBySubject('21d8b65d', landed)).toBe(false) // not a prefix
  })

  it('non-conductor PRs are out of scope entirely (neither landed nor unknown)', () => {
    const {landed, unknown} = deriveRunStates(
      [pr({headRefName: 'renovate/hono-4.x'})],
      {landedIds: new Set(), isAncestorOfMain: () => true}, // would "land" anything
    )
    expect(landed.size).toBe(0)
    expect(unknown).toHaveLength(0)
  })

  it('a run named by a landing merge is landed, without consulting ancestry', () => {
    let ancestryAsked = false
    const {landed, unknown} = deriveRunStates([pr()], {
      landedIds: new Set([FULL_RUN]),
      isAncestorOfMain: () => {
        ancestryAsked = true
        return false
      },
    })
    expect(landed.get('21d8b65c')).toBe('landed')
    expect(unknown).toHaveLength(0)
    expect(ancestryAsked).toBe(false) // subject proof short-circuits the git call
  })

  it('a run whose PR head is an ancestor of main is landed (content-landed without a naming merge)', () => {
    const {landed, unknown} = deriveRunStates([pr()], {
      landedIds: new Set(),
      isAncestorOfMain: oid => oid === '0f1e2d3c4b5a69788796a5b4c3d2e1f001234567',
    })
    expect(landed.get('21d8b65c')).toBe('landed')
    expect(unknown).toHaveLength(0)
  })

  it('undeterminable runs fall through to unknown — never fabricated as aborted/live', () => {
    const rows = [pr({number: 930, headRefName: 'conductor/ci-0a1b2c3d-validation'})]
    const {landed, unknown} = deriveRunStates(rows, {
      landedIds: new Set([FULL_RUN]),
      isAncestorOfMain: () => false,
    })
    expect(landed.size).toBe(0)
    expect(unknown).toEqual([
      {number: 930, headRefName: 'conductor/ci-0a1b2c3d-validation', runId: '0a1b2c3d'},
    ])
  })

  it('renderRunStateArgs emits one --run-state token per landed id; empty when none', () => {
    const landed = new Map<string, 'landed'>([
      ['21d8b65c', 'landed'],
      ['0a1b2c3d', 'landed'],
    ])
    expect(renderRunStateArgs(landed)).toBe(
      '--run-state=21d8b65c=landed --run-state=0a1b2c3d=landed',
    )
    expect(renderRunStateArgs(new Map())).toBe('')
  })
})
