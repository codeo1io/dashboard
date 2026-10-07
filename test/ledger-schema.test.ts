// rm-678 vitest half — schema + recurrence contract for ROADMAP.md.
//
// The detection half is scripts/check-ledger-census.mjs (no-install, runs in
// the Lockfile Guard workflow family). This suite pins the same contract in
// the repo's own test gate: the live ledger must be green, and the
// 2026-10-06 corrupted render (commit 3d07cf9, byte-copied to
// test/fixtures/roadmap-3d07cf9.md) must be RED — red-first proof in both
// directions, per rm-678's acceptance. Cases run the real CLI as a
// subprocess so the guard's exit-code contract is what is tested.

import {spawnSync} from 'node:child_process'
import {mkdtempSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {describe, expect, it} from 'vitest'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const script = join(root, 'scripts', 'check-ledger-census.mjs')
const roadmap = join(root, 'ROADMAP.md')
const fixture = join(root, 'test', 'fixtures', 'roadmap-3d07cf9.md')

interface Finding {rule: string; line?: number; detail: string}
interface CensusReport {defs: number; comments: number; trailingWs: number; maxId: string; findings: Finding[]}

function runCensus(args: string[]): {status: number | null; report: CensusReport | null; stderr: string} {
  const res = spawnSync('node', [script, ...args], {encoding: 'utf8'})
  let report: CensusReport | null = null
  try {
    report = JSON.parse(res.stdout) as CensusReport
  } catch {
    report = null
  }
  return {status: res.status, report, stderr: res.stderr}
}

const miniLedger = (defs: string[], extra = '') =>
  ['## Open items', '', ...defs, extra, '## Completed items', ''].join('\n')
const def = (id: number) =>
  `- id: \`rm-${id}\` | track: security | priority: 1.0 | status: candidate\n- signals: s\n- acceptance: a\n- evidence: e`

describe('ledger census guard (rm-678)', () => {
  it('live ROADMAP.md passes every shape invariant', () => {
    const r = runCensus(['--roadmap', roadmap])
    expect(r.status).toBe(0)
    expect(r.report?.findings).toEqual([])
  })

  it('live ROADMAP.md passes non-regression against itself', () => {
    const r = runCensus(['--roadmap', roadmap, '--baseline', roadmap])
    expect(r.status).toBe(0)
    expect(r.report?.findings).toEqual([])
  })

  it('census comment claims match the live ledger it ships in', () => {
    const r = runCensus(['--roadmap', roadmap])
    expect(r.report?.maxId).toBe('rm-679')
    expect(r.report?.defs).toBeGreaterThanOrEqual(224)
  })

  it('flags the 2026-10-06 corrupted render (fixture 3d07cf9) red-first', () => {
    const r = runCensus(['--roadmap', fixture, '--baseline', roadmap])
    expect(r.status).toBe(1)
    const rules = new Set((r.report?.findings ?? []).map(f => f.rule))
    expect(rules.has('def-count-drop')).toBe(true)
    expect(rules.has('dropped-def')).toBe(true)
    expect(rules.has('comment-count-drop')).toBe(true)
    expect(rules.has('closed-items-section')).toBe(true)
    expect(rules.has('bracket-list-line')).toBe(true)
    expect(rules.has('trailing-ws')).toBe(true)
    expect(rules.has('status-token')).toBe(true)
  })

  it('a def leaving Open items must carry a dated marker', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ledger-census-'))
    const base = join(dir, 'base.md')
    const moved = join(dir, 'moved.md')
    writeFileSync(base, miniLedger([def(1)]))
    writeFileSync(moved, ['## Open items', '', '## Completed items', '', def(1), ''].join('\n'))
    const red = runCensus(['--roadmap', moved, '--baseline', base])
    expect(red.report?.findings.map(f => f.rule)).toContain('unmoved-closure')
    const dated = join(dir, 'dated.md')
    writeFileSync(dated, [
      '## Open items', '',
      '## Completed items', '',
      def(1),
      '- rider (2026-10-06, run x): completed with dated marker', '',
    ].join('\n'))
    const green = runCensus(['--roadmap', dated, '--baseline', base])
    expect(green.report?.findings.map(f => f.rule)).not.toContain('unmoved-closure')
  })

  it('flags duplicate def ids', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ledger-census-'))
    const p = join(dir, 'dup.md')
    writeFileSync(p, miniLedger([def(1), def(1)]))
    const r = runCensus(['--roadmap', p])
    expect(r.report?.findings.map(f => f.rule)).toContain('duplicate-id')
  })

  it('flags a lying census comment', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ledger-census-'))
    const p = join(dir, 'lie.md')
    writeFileSync(p, miniLedger([def(1)], '<!-- census (2026-10-06, run x): 9 defs / 0 dups / max rm-9. -->'))
    const r = runCensus(['--roadmap', p])
    const rules = r.report?.findings.map(f => f.rule)
    expect(rules).toContain('census-lie')
  })

  it('bracket lists inside backticks are fine; outside backticks are red', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ledger-census-'))
    const p = join(dir, 'brackets.md')
    const blocklisted = `- id: \`rm-1\` | track: security | priority: 1.0 | status: candidate
- signals: uses \`sensitiveRoutes = ['/', '/auth']\` inline — fine
- acceptance: every module in ['.agents/skills/x', 'web/src'] needs one — red outside backticks
- evidence: e `
    writeFileSync(p, miniLedger([blocklisted]))
    const r = runCensus(['--roadmap', p])
    const rules = r.report?.findings.map(f => f.rule)
    expect(rules).toContain('bracket-list-line')
    expect(rules).toContain('trailing-ws')
  })
})
