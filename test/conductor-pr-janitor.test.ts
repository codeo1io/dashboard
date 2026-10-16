import {describe, expect, it} from 'vitest'
import {
  classifyConductorPr,
  closeCommand,
  ghPrListArgs,
  isConductorPr,
  parseRunStateArgs,
  runIdFromHead,
  triage,
  type PrRecord,
} from '../scripts/conductor-pr-janitor.ts'

function pr(overrides: Partial<PrRecord> = {}): PrRecord {
  return {
    number: 729,
    title: 'Conductor CI validation',
    headRefName: 'conductor/ci-7a0e2163-validation',
    isDraft: true,
    updatedAt: '2026-10-15T12:00:00Z',
    url: 'https://example.invalid/pr/729',
    ...overrides,
  }
}

describe('conductor-pr-janitor policy (rm-1463)', () => {
  it('non-conductor heads are out of scope: keep, never touched', () => {
    const row = classifyConductorPr(
      pr({headRefName: 'renovate/hono-4.x'}),
      'landed',
    )
    expect(row.action).toBe('keep')
    expect(row.reason).toContain('non-conductor head')
  })

  it('conductor head whose run landed: close (residue)', () => {
    const row = classifyConductorPr(pr(), 'landed')
    expect(row.action).toBe('close')
    expect(row.reason).toContain('landed')
  })

  it('conductor head whose run aborted: close (residue)', () => {
    const row = classifyConductorPr(pr(), 'aborted')
    expect(row.action).toBe('close')
    expect(row.runState).toBe('aborted')
  })

  it('conductor head whose run is live: keep (still needed)', () => {
    const row = classifyConductorPr(pr(), 'live')
    expect(row.action).toBe('keep')
    expect(row.reason).toContain('live')
  })

  it('conductor head with unknown run state: report-only', () => {
    const row = classifyConductorPr(pr(), 'unknown')
    expect(row.action).toBe('report')
    expect(row.reason).toContain('report-only')
  })

  it('triage maps every record through the policy and preserves order', () => {
    const rows = triage(
      [
        pr({number: 1, headRefName: 'feature/x'}),
        pr({number: 2}),
        pr({number: 3, headRefName: 'conductor/ci-abc123-live-run'}),
      ],
      record =>
        record.number === 2 ? 'landed' : record.number === 3 ? 'live' : 'unknown',
    )
    expect(rows.map(row => [row.number, row.action])).toEqual([
      [1, 'keep'],
      [2, 'close'],
      [3, 'keep'],
    ])
  })

  it('run id extraction and head detection', () => {
    expect(isConductorPr('conductor/ci-7a0e2163-validation')).toBe(true)
    expect(isConductorPr('conductor/ci-ABCDEF-worktree')).toBe(true)
    expect(isConductorPr('main')).toBe(false)
    expect(runIdFromHead('conductor/ci-7a0e2163-validation')).toBe('7a0e2163')
    expect(runIdFromHead('main')).toBe(null)
  })

  it('run-state arg parsing accepts both documented forms and rejects garbage', () => {
    expect(parseRunStateArgs(['--run-state=7a0e2163=landed', '--run-state=abc123=live'])).toEqual({
      '7a0e2163': 'landed',
      abc123: 'live',
    })
    expect(
      parseRunStateArgs(['--run-state', '7a0e2163=aborted', 'other', '--run-state=abc123=live']),
    ).toEqual({
      '7a0e2163': 'aborted',
      abc123: 'live',
    })
    expect(() => parseRunStateArgs(['--run-state=abc123=nope'])).toThrow(
      /invalid run state/,
    )
    expect(() => parseRunStateArgs(['--run-state=landed'])).toThrow(
      /expected --run-state=/,
    )
    expect(() => parseRunStateArgs(['--run-state'])).toThrow(/invalid --run-state/)
  })

  it('open-PR listing args pin an explicit --limit above the gh 30-PR default', () => {
    expect(ghPrListArgs('codeo1io/dashboard')).toEqual([
      'pr',
      'list',
      '-R',
      'codeo1io/dashboard',
      '--state',
      'open',
      '--limit',
      '200',
      '--json',
      'number,title,headRefName,isDraft,updatedAt,url',
    ])
  })

  it('close commands name the superseding commit (rm-1463 acceptance)', () => {
    const row = classifyConductorPr(pr(), 'aborted')
    const cmd = closeCommand(row, 'codeo1io/dashboard', '3e3664c0688')
    expect(cmd).toContain('gh pr close 729')
    expect(cmd).toContain('--comment')
    expect(cmd).toContain('superseded by 3e3664c0688')
    expect(cmd).toContain('aborted')
  })
})
