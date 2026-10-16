// rm-678 vitest schema half (repository-maintenance cycle 1, run 9189a4ac),
// re-landed 2026-10-15 as rm-857 (repository-maintenance cycle 1, run
// 3d6aa134904b, implement 5cad71b9): schema assertions over the live ROADMAP
// ledger plus a red-proof fixture — the corrupted 3d07cf9 blob that every
// landed guard passed MUST fail here. Mirrors the no-install census half in
// scripts/roadmap-census.ts.
//
// The re-land is adapted, not verbatim: this file's batch-lineage original
// died at the 2026-10-09 landing merge 3e3664c (modify-vs-delete resolved as
// DELETE while the batch doc still claimed it as a deliverable — the exact
// silent-drop class the new deliverable-presence half below exists to catch).
// Adaptations, all documented in place: the status vocabulary gains the
// main-lineage `in_progress` spelling; the hollow-acceptance rule becomes a
// tripwire above the 47-def renderer-owned frozen band; and the census-comment
// test (the main lineage's rendered ledger carries no ingest-side HTML
// comments) is replaced by the deliverable-presence + batch-doc census-claim
// checks.

import {execFileSync} from 'node:child_process'
import {existsSync, readdirSync, readFileSync} from 'node:fs'
import {join, resolve} from 'node:path'
import {describe, expect, it} from 'vitest'
import {census, violations} from '../scripts/roadmap-census.ts'

const repoRoot = resolve(import.meta.dirname, '..')
const roadmap = readFileSync(join(repoRoot, 'ROADMAP.md'), 'utf8')

// Union of the two lineage vocabularies: the batch lineage used hyphenated
// tokens, the main lineage's rendered ledger uses `in_progress` (underscore).
const STATUS_ENUM = new Set([
  'open',
  'in-progress',
  'in_progress',
  'candidate',
  'implemented',
  'completed',
  'landed',
  'partially',
  'superseded',
  'declined',
  'blocked-external',
])

const OPEN_STATUSES = new Set([
  'candidate',
  'in-progress',
  'in_progress',
  'blocked-external',
])

/** Renderer-owned frozen band of empty `- acceptance: ` values (2026-10-15). */
const HOLLOW_BASELINE = 47

const defLines = roadmap.split('\n').filter(line => /^- id: `rm-\d+` \| /.test(line))

function batchDocs(): {name: string; text: string}[] {
  const dir = join(repoRoot, 'docs', 'prioritization')
  return readdirSync(dir)
    .filter(name => name.endsWith('.md'))
    .map(name => ({name, text: readFileSync(join(dir, name), 'utf8')}))
}

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
    // 2026-10-15 re-land pin (rm-857, run 3d6aa134904b): the main-lineage
    // ledger held 237 defs / max rm-856 at HEAD 3e3664c (first re-probe
    // after the landing merge), and this cycle's roadmap phase minted
    // rm-857..rm-864 above it — union census 245 defs / 0 dups / max
    // rm-864. Historical provenance this pin inherits: the guard itself
    // was batch-side 06396b4's deliverable (its at-write pin was 803 over
    // a 247-def postimage) that landing 3e3664c modify-vs-delete-DROPPED
    // while the batch doc claimed census 247 — the ledger it guarded then
    // sat at 237 for six days with no guard on main noticing. Pin 864 is
    // re-derived from the live tree, not inherited.
    expect(live.max).toBe(864)
  })

  it('status tokens stay inside the ledger vocabulary', () => {
    const unknown = defLines
      .map(line => line.split('| status: ')[1]?.split(' ')[0] ?? 'MISSING')
      .filter(status => !STATUS_ENUM.has(status))
    expect(unknown).toEqual([])
  })

  it('open items carry non-empty acceptance (tripwire above the frozen band)', () => {
    // The main-lineage rendered ledger carries HOLLOW_BASELINE empty
    // acceptance values — renderer-owned known debt, frozen at the 48-error
    // lint band. The rule fires only ABOVE that band so a NEW hollow def
    // (the 3d07cf9 emptying signature) is red while the known debt is not.
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
    expect(
      hollow.length,
      `open defs with hollow acceptance (${hollow.length}, baseline ${HOLLOW_BASELINE}): ${hollow.join(' ; ')}`,
    ).toBeLessThanOrEqual(HOLLOW_BASELINE)
  })

  it('mirror of the census violations report is empty', () => {
    expect(violations(census(roadmap))).toEqual([])
  })
})

describe('rm-857 deliverable-presence half', () => {
  // Historical batch docs declare deliverables in prose (the 2026-10-09
  // d8fdf8b79ad5 doc claimed this very file while its landing deleted it),
  // which no parser can verify. This half therefore defines a machine-
  // checkable opt-in marker: a `## Deliverables` section whose bullets list
  // repo-relative paths in backticks. Every marker-bearing doc is checked —
  // a declared-but-absent file fails the suite.
  const DELIVERABLES_HEADING = /^## Deliverables$/m

  function deliverablesFrom(docText: string): string[] {
    if (!DELIVERABLES_HEADING.test(docText)) return []
    const after = docText.split(DELIVERABLES_HEADING)[1] ?? ''
    const section = after.split(/^## /m)[0] ?? ''
    return [...section.matchAll(/^- `([^`\n]+)`(?: —|:|$)/gm)].map(m => m[1] ?? '')
  }

  function missingDeliverables(docText: string): string[] {
    return deliverablesFrom(docText).filter(path => !existsSync(join(repoRoot, path)))
  }

  it('parses deliverable bullets (fixture red-proof of the parser half)', () => {
    const fixture = [
      '# batch doc',
      '',
      '## Deliverables',
      '',
      '- `scripts/roadmap-census.ts` — the census half',
      '- `test/roadmap-integrity-guard.test.ts` — the schema half',
      '- `no/such/file-anywhere.ts` — deliberately absent',
      '',
      '## Notes',
      '',
      '- `not-a-deliverable.ts` — outside the section, must be ignored',
    ].join('\n')
    expect(deliverablesFrom(fixture)).toEqual([
      'scripts/roadmap-census.ts',
      'test/roadmap-integrity-guard.test.ts',
      'no/such/file-anywhere.ts',
    ])
    const missing = missingDeliverables(fixture)
    expect(missing).toEqual(['no/such/file-anywhere.ts'])
  })

  it('every declared deliverable in every marker-bearing batch doc exists', () => {
    const missing: string[] = []
    let carriers = 0
    for (const doc of batchDocs()) {
      if (!DELIVERABLES_HEADING.test(doc.text)) continue
      carriers += 1
      for (const path of missingDeliverables(doc.text)) missing.push(`${doc.name}: ${path}`)
    }
    expect(carriers).toBeGreaterThan(0)
    expect(missing).toEqual([])
  })

  it('the newest marker-bearing batch doc states the true census', () => {
    const carriers = batchDocs().filter(doc => DELIVERABLES_HEADING.test(doc.text))
    expect(carriers.length).toBeGreaterThan(0)
    const newest = carriers.reduce((a, b) => (b.name >= a.name ? b : a))
    const claim = /(\d+) defs \/ (\d+) dups \/ max rm-(\d+)/.exec(newest.text)
    expect(claim, `no census claim in ${newest.name}`).not.toBeNull()
    const live = census(roadmap)
    expect(Number(claim?.[1])).toBe(live.defs)
    expect(Number(claim?.[2])).toBe(live.dups.length)
    expect(Number(claim?.[3])).toBe(live.max)
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
