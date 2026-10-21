import {spawnSync} from 'node:child_process'
import {existsSync} from 'node:fs'
import process from 'node:process'
import {describe, expect, it} from 'vitest'
import {
  checkLedger,
  extractLandingRefs,
  isPendingLanding,
  parseRoadmapItems,
} from '../scripts/roadmap-ledger-check.ts'

const FIXTURE = [
  '# Roadmap',
  '',
  '## Open items',
  '',
  '### Item A',
  '- id: `rm-900` | track: reliability | priority: 1.0 | status: implemented (pending landing of 4362b80)',
  '',
  '### Item B',
  '- id: `rm-901` | track: security | priority: 2.0 | status: candidate (thinking)',
  '',
  '### Item C',
  '- id: `rm-902` | track: reliability | priority: 3.0 | status: implemented 2026-09-24; run 98c2417507c949dcba0250e0bf1afff5 pending landing of upstream deadbee0',
  '',
  '### Item D',
  '- id: `rm-903` | track: reliability | priority: 4.0 | status: implemented (pending landing of PR #10, no sha cited)',
  '',
  '### Item D2',
  '- id: `rm-906` | track: security | priority: 4.5 | status: blocked-external on the license decision (review 2026-10)',
  '',
  '## Completed items',
  '',
  '### Item E',
  '- id: `rm-904` | track: reliability | priority: 5.0 | status: landed at 4362b80',
  '',
].join('\n')

describe('roadmap-ledger-check parser', () => {
  it('parses id/status pairs with line numbers', () => {
    const items = parseRoadmapItems(FIXTURE)
    expect(items.map(item => item.id)).toEqual(['rm-900', 'rm-901', 'rm-902', 'rm-903', 'rm-906', 'rm-904'])
    expect(items[0]?.line).toBe(6)
    expect(items[0]?.status).toBe('implemented (pending landing of 4362b80)')
  })

  it('extracts hex landing refs but not short or non-hex tokens', () => {
    expect(extractLandingRefs('pending landing of 4362b80 and 57a182b')).toEqual(['4362b80', '57a182b'])
    // 32-hex conductor attempt ids match the shape but never resolve as commits.
    expect(extractLandingRefs('run 98c2417507c949dcba0250e0bf1afff5 pending')).toEqual([
      '98c2417507c949dcba0250e0bf1afff5',
    ])
    expect(extractLandingRefs('v26 lts 2026-10-28, pnpm 12.6.0, #113')).toEqual([])
  })

  it('classifies pending-landing statuses only', () => {
    const items = parseRoadmapItems(FIXTURE)
    const pending = items.filter(item => isPendingLanding(item.status))
    // blocked statuses are not pending-landing claims — the blocked variant stays excluded
    expect(pending.map(item => item.id)).toEqual(['rm-900', 'rm-902', 'rm-903'])
    expect(items.find(item => item.id === 'rm-906')?.status).toMatch(/^blocked-external/)
  })
})

describe('roadmap-ledger-check checkLedger', () => {
  // The ancestor proof needs a real git repository with history. CI checkouts
  // may be shallow: 4362b80 then does not resolve and the claim is (correctly)
  // left unjudged, so the integration assertions skip rather than lie.
  // Integration worktrees add a second limit: the repo object store holds
  // 4362b80 (it resolves) while the truncated/grafted base chain never
  // reaches it, so `merge-base --is-ancestor 4362b80 HEAD` is false. That is
  // exactly the fail-open contract — infrastructure limits never fabricate a
  // stale verdict — so the first integration test asserts whichever truth
  // THIS checkout can prove (stale in a full-history checkout, unjudged-but-
  // cleared in a truncated one) instead of assuming resolve ⇒ ancestor.
  const repoRoot = process.cwd()
  const resolvable = spawnSync(
    'git',
    ['rev-parse', '--verify', '--quiet', '4362b80^{commit}'],
    {cwd: repoRoot, encoding: 'utf8'},
  ).status === 0
  const isAncestor = resolvable && spawnSync(
    'git',
    ['merge-base', '--is-ancestor', '4362b80', 'HEAD'],
    {cwd: repoRoot, encoding: 'utf8'},
  ).status === 0
  const hasGit = existsSync('.git')

  it.skipIf(!hasGit || !resolvable)(
    'flags a pending-landing claim whose cited commit is an ancestor of the base',
    () => {
      const report = checkLedger(FIXTURE, {gitDir: repoRoot, base: 'HEAD'})
      if (!isAncestor) {
        // Truncated checkout: the ref resolves but is unreachable from HEAD —
        // checked-and-cleared, never stale. This branch IS the fail-open
        // contract under an infrastructure limit, so it is asserted, not
        // skipped (a fabricated stale verdict would be the bug).
        expect(report.stale).toEqual([])
        expect(report.unknownRefs).not.toContain('4362b80')
        expect(report.checkedRefs).toBeGreaterThanOrEqual(1)
        expect(report.unknownRefs).toContain('98c2417507c949dcba0250e0bf1afff5')
        return
      }
      expect(report.stale.map(claim => claim.id).sort()).toEqual(['rm-900'])
      const claim = report.stale[0]
      expect(claim?.ref).toBe('4362b80')
      expect(claim?.sha).toMatch(/^[0-9a-f]{40}$/)
      // The 32-hex attempt id must land in unknownRefs, never stale.
      expect(report.unknownRefs).toContain('98c2417507c949dcba0250e0bf1afff5')
    },
  )

  it.skipIf(!hasGit)('leaves claims unjudged when refs do not resolve', () => {
    const fixture = [
      // all-zero sha: never a resolvable object, so the claim stays unjudged.
      '- id: `rm-905` | track: reliability | priority: 6.0 | status: implemented (pending landing of 0000000000000000000000000000000000000000)',
    ].join('\n')
    const report = checkLedger(fixture, {gitDir: repoRoot, base: 'HEAD'})
    expect(report.stale).toEqual([])
    expect(report.unknownRefs).toContain('0000000000000000000000000000000000000000')
  })
})
