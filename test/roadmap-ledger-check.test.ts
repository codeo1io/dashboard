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
  '## Completed items',
  '',
  '### Item E',
  '- id: `rm-904` | track: reliability | priority: 5.0 | status: landed at 4362b80',
  '',
].join('\n')

describe('roadmap-ledger-check parser', () => {
  it('parses id/status pairs with line numbers', () => {
    const items = parseRoadmapItems(FIXTURE)
    expect(items.map(item => item.id)).toEqual(['rm-900', 'rm-901', 'rm-902', 'rm-903', 'rm-904'])
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
    expect(pending.map(item => item.id)).toEqual(['rm-900', 'rm-902', 'rm-903'])
  })
})

describe('roadmap-ledger-check checkLedger', () => {
  // The ancestor proof needs a real git repository with history. CI checkouts
  // may be shallow: 4362b80 then does not resolve and the claim is (correctly)
  // left unjudged, so the integration assertions skip rather than lie.
  const repoRoot = process.cwd()
  const ancestorResolves = spawnSync(
    'git',
    ['rev-parse', '--verify', '--quiet', '4362b80^{commit}'],
    {cwd: repoRoot, encoding: 'utf8'},
  ).status === 0
  const hasGit = existsSync('.git')

  it.skipIf(!hasGit || !ancestorResolves)(
    'flags a pending-landing claim whose cited commit is an ancestor of the base',
    () => {
      const report = checkLedger(FIXTURE, {gitDir: repoRoot, base: 'HEAD'})
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
