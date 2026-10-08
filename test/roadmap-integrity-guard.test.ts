// rm-678 vitest schema half (repository-maintenance cycle 1, run 9189a4ac):
// schema assertions over the live ROADMAP ledger plus a red-proof fixture —
// the corrupted 3d07cf9 blob that every landed guard passed MUST fail here.
// Mirrors the no-install census half in scripts/roadmap-census.ts.

import {execFileSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {join, resolve} from 'node:path'
import {describe, expect, it} from 'vitest'
import {census, violations} from '../scripts/roadmap-census.ts'

const repoRoot = resolve(import.meta.dirname, '..')
const roadmap = readFileSync(join(repoRoot, 'ROADMAP.md'), 'utf8')

const STATUS_ENUM = new Set([
  'open',
  'in-progress',
  'candidate',
  'implemented',
  'completed',
  'landed',
  'partially',
  'superseded',
  'declined',
  'blocked-external',
])

const OPEN_STATUSES = new Set(['candidate', 'in-progress', 'blocked-external'])

const defLines = roadmap.split('\n').filter(line => /^- id: `rm-\d+` \| /.test(line))

function blocks(): string[][] {
  const lines = roadmap.split('\n')
  const starts = lines
    .map((line, i) => (/^- id: `rm-\d+` \| /.test(line) ? i : -1))
    .filter(i => i >= 0)
  return starts.map((s, k) => lines.slice(s, k + 1 < starts.length ? starts[k + 1] : s + 80))
}

describe('rm-678 schema half: live ledger', () => {
  it('every def id is unique', () => {
    const live = census(roadmap)
    expect(live.dups, `duplicate ids: ${live.dups.join(', ')}`).toEqual([])
  })

  it('holds the healthy-defs floor (the corrupted blob held 197)', () => {
    const live = census(roadmap)
    expect(live.defs).toBeGreaterThanOrEqual(200)
  })

  it('records the current id ceiling (bump on the next mint)', () => {
    const live = census(roadmap)
    expect(live.max).toBe(681)
  })

  it('status tokens stay inside the ledger vocabulary', () => {
    const unknown = defLines
      .map(line => line.split('| status: ')[1]?.split(' ')[0] ?? 'MISSING')
      .filter(status => !STATUS_ENUM.has(status))
    expect(unknown).toEqual([])
  })

  it('open items carry non-empty acceptance', () => {
    const hollow: string[] = []
    for (const block of blocks()) {
      const head = block[0] ?? ''
      const status = head.split('| status: ')[1]?.split(' ')[0] ?? 'MISSING'
      if (!OPEN_STATUSES.has(status)) continue
      const at = block.indexOf('- acceptance:')
      const inline = block.some(line => /^- acceptance: \S/.test(line))
      const nested =
        at !== -1 && block.slice(at + 1, at + 4).some(line => /^\s+- \S/.test(line))
      if (!inline && !nested) hollow.push(head.slice(0, 60))
    }
    expect(hollow, `open defs with hollow acceptance: ${hollow.join(' ; ')}`).toEqual([])
  })

  it('mirror of the census violations report is empty', () => {
    expect(violations(census(roadmap))).toEqual([])
  })

  it('newest census comment states the true census', () => {
    // "Newest" by DATE, not document position: the restored ledger carries
    // years of extension comments with their own (historically true) census
    // claims at arbitrary positions — 3d07cf9's ancestry has 2026-10-04
    // claims sitting BELOW the 2026-10-06 one. Each census-bearing comment
    // opens with "(YYYY-MM-DD,"; the newest such comment owns the live truth.
    const claiming = [...roadmap.matchAll(/<!--([\s\S]*?)-->/g)]
      .map(m => m[1] ?? '')
      .map(body => ({
        date: /\((\d{4}-\d{2}-\d{2}),/.exec(body)?.[1] ?? '',
        claim: /(\d+) defs \/ (\d+) dups \/ max rm-(\d+)/.exec(body),
      }))
      .filter(c => c.date !== '' && c.claim !== null)
    expect(claiming.length).toBeGreaterThan(0)
    const newest = claiming.reduce((a, b) => (b.date >= a.date ? b : a))
    const live = census(roadmap)
    expect(newest.claim).toBeDefined()
    expect(Number(newest.claim?.[1])).toBe(live.defs)
    expect(Number(newest.claim?.[2])).toBe(live.dups.length)
    expect(Number(newest.claim?.[3])).toBe(live.max)
  })
})

describe('rm-678 schema half: corruption fixture 3d07cf9', () => {
  const fixture = (() => {
    const sha = '3d07cf96a5c0dac4c718da8591ff0913f5383dc9'
    const read = (): string | undefined => {
      try {
        return execFileSync('git', ['show', `${sha}:ROADMAP.md`], {
          cwd: repoRoot,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        })
      } catch {
        return undefined
      }
    }
    const text = read()
    if (text !== undefined) return text
    // Shallow CI checkouts lack the historical blob, which used to silently
    // skip this red-proof half (review 176de71b finding 7 / R6): fetch the
    // commit on demand — GitHub serves arbitrary-SHA fetches — and only skip
    // when even that fails (offline runs keep the old behavior).
    try {
      execFileSync('git', ['fetch', '--depth=1', '--quiet', 'origin', sha], {
        cwd: repoRoot,
        stdio: ['ignore', 'ignore', 'ignore'],
      })
    } catch {
      return undefined
    }
    return read()
  })()

  it.skipIf(fixture === undefined)('flags the corrupted blob the landed guards passed', () => {
    const text = fixture ?? ''
    const bad = census(text)
    const found = violations(bad)
    expect(found.length).toBeGreaterThan(0)
    expect(bad.defs).toBe(197)
    expect(bad.trailingWs).toBeGreaterThan(0)
  })
})
