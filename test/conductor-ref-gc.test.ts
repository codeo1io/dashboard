import {describe, expect, it} from 'vitest'

import {
  buildPlan,
  parseRefLines,
  parseTrackingRefLines,
  renderPlan,
  ToolError,
} from '../scripts/conductor-ref-gc.ts'

const SHA_A = 'a710bd5e67e55abd9e56e2cd48dd798fb823b227' // 40-hex fixture
const SHA_B = '50b5dd41297f8a928914006b8f8c872c4ab3bb14'
const SHA_C = '29cc02f0457b4eb5e203d1f6a02c52ad731ea0f0'

describe('parseRefLines (ls-remote mode)', () => {
  it('parses sha-tab-ref lines into conductor refs, skipping blanks', () => {
    const refs = parseRefLines([`${SHA_A}\trefs/heads/conductor/run-abc`, '', `${SHA_B}\trefs/heads/conductor/run-def`])
    expect(refs).toEqual([
      {sha: SHA_A, ref: 'refs/heads/conductor/run-abc'},
      {sha: SHA_B, ref: 'refs/heads/conductor/run-def'},
    ])
  })

  it('rejects non-conductor refs (repo-identity guard)', () => {
    expect(() => parseRefLines([`${SHA_A}\trefs/heads/main`])).toThrow(ToolError)
  })

  it('rejects malformed lines', () => {
    expect(() => parseRefLines(['nope'])).toThrow(ToolError)
  })
})

describe('parseTrackingRefLines (local tracking mode)', () => {
  it('maps remote-tracking names back to origin branch names', () => {
    const refs = parseTrackingRefLines([`refs/remotes/origin/conductor/run-abc ${SHA_A}`])
    expect(refs).toEqual([{sha: SHA_A, ref: 'refs/heads/conductor/run-abc'}])
  })

  it('rejects non-conductor tracking refs', () => {
    expect(() => parseTrackingRefLines([`refs/remotes/origin/main ${SHA_A}`])).toThrow(ToolError)
  })
})

describe('buildPlan', () => {
  it('splits merged vs live and batches deletion commands at 40 refspecs', () => {
    const refs = Array.from({length: 85}, (_, i) => ({
      ref: `refs/heads/conductor/run-${String(i).padStart(2, '0')}`,
      sha: `${SHA_A.slice(0, 38)}${String(i % 100).padStart(2, '0')}`,
      merged: i < 80,
    }))
    const plan = buildPlan(SHA_C, refs)
    expect(plan.total).toBe(85)
    expect(plan.merged).toBe(80)
    expect(plan.live).toBe(5)
    expect(plan.commands).toHaveLength(2) // 80 deletions / 40 per push
    expect(plan.commands[0]).toContain(':refs/heads/conductor/run-00')
    expect(plan.commands[1]).toContain(':refs/heads/conductor/run-79')
    expect(plan.liveRefs.map(r => r.ref)).toContain('refs/heads/conductor/run-84')
  })

  it('empty census produces no commands', () => {
    const plan = buildPlan(SHA_C, [])
    expect(plan).toMatchObject({total: 0, merged: 0, live: 0, commands: []})
    expect(renderPlan(plan)).toContain('nothing merged to delete')
  })

  it('strips the refs/heads/ prefix into short names', () => {
    const plan = buildPlan(SHA_C, [{ref: 'refs/heads/conductor/run-x', sha: SHA_A, merged: false}])
    expect(plan.liveRefs[0]?.name).toBe('conductor/run-x')
  })
})

describe('renderPlan', () => {
  it('reports anchor, counts, planned refspecs, and the conservative-classification note', () => {
    const plan = buildPlan(SHA_C, [
      {ref: 'refs/heads/conductor/run-merged', sha: SHA_A, merged: true},
      {ref: 'refs/heads/conductor/run-live', sha: SHA_B, merged: false},
    ])
    const text = renderPlan(plan)
    expect(text).toContain(`origin/main ${SHA_C}`)
    expect(text).toContain('never pushes')
    expect(text).toContain('refs/heads/conductor/run-merged')
    expect(text).toContain('git push origin :refs/heads/conductor/run-merged')
    expect(text).toContain('LIVE LANES')
    expect(text).toContain('rebase/squash')
  })
})
