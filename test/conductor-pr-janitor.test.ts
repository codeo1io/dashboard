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

describe('conductor-pr-janitor run- namespace (rm-2004)', () => {
  const runPr = (overrides: Partial<PrRecord> = {}): PrRecord =>
    pr({
      number: 860,
      title: 'maintenance: cycle-1 ledger truth (run 528f458d)',
      headRefName: 'conductor/run-528f458d245a',
      isDraft: false,
      ...overrides,
    })

  it('run- heads are conductor PRs and yield their run id (live fleet shape)', () => {
    expect(isConductorPr('conductor/run-528f458d245a')).toBe(true)
    expect(isConductorPr('conductor/run-3a969e4c6623')).toBe(true)
    expect(runIdFromHead('conductor/run-528f458d245a')).toBe('528f458d245a')
    expect(runIdFromHead('conductor/run-3a969e4c6623')).toBe('3a969e4c6623')
    // The lone visual namespace is excluded by the recorded rm-2004 decision.
    expect(isConductorPr('conductor/visual-capture-9698b395')).toBe(false)
    expect(runIdFromHead('conductor/visual-capture-9698b395')).toBe(null)
    // ci- keeps working unchanged.
    expect(isConductorPr('conductor/ci-7a0e2163-validation')).toBe(true)
    expect(runIdFromHead('conductor/ci-7a0e2163-validation')).toBe('7a0e2163')
  })

  it('landed-run PR: close, with the superseding commit named in the close command', () => {
    const row = classifyConductorPr(runPr(), 'landed')
    expect(row.action).toBe('close')
    expect(row.reason).toContain('landed')
    const cmd = closeCommand(row, 'codeo1io/dashboard', 'debde800e1f')
    expect(cmd).toContain('gh pr close 860')
    expect(cmd).toContain('superseded by debde800e1f')
  })

  it('live-run PR: keep (still needed)', () => {
    const row = classifyConductorPr(runPr(), 'live')
    expect(row.action).toBe('keep')
    expect(row.reason).toContain('live')
  })

  it('run-head PR with unknown run state: report-only', () => {
    const row = classifyConductorPr(runPr(), 'unknown')
    expect(row.action).toBe('report')
    expect(row.reason).toContain('report-only')
  })

  it('triage covers a mixed live-fleet shape: run residue, fresh ci draft, non-conductor', () => {
    const rows = triage(
      [
        runPr({number: 860}),
        runPr({number: 798, headRefName: 'conductor/run-1108172d68c2'}),
        pr({number: 983, headRefName: 'conductor/ci-c5c35adecc09', isDraft: true}),
        pr({number: 521, headRefName: 'feature/unrelated'}),
      ],
      record => {
        if (record.number === 860) return 'landed'
        if (record.number === 798) return 'aborted'
        if (record.number === 983) return 'live'
        return 'unknown'
      },
    )
    expect(rows.map(row => [row.number, row.action])).toEqual([
      [860, 'close'],
      [798, 'close'],
      [983, 'keep'],
      [521, 'keep'],
    ])
  })
})
