import {existsSync, readdirSync, readFileSync} from 'node:fs'
import {join} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

import {census, violations, violationsOf, type RoadmapCensus} from '../scripts/roadmap-census.ts'

// rm-877 (re-derived from rm-678, restored after the 2026-10-15 tip-merge
// drop — the merge 06396b4 -> 3e3664c silently dropped 53 files, including
// this guard and the census script, while the ledger still claimed them).
//
// Re-derivation decisions (deliberate divergence from rm-678):
// - NO hard-pinned def count and NO max-id equality pin — parallel mints
//   legitimately drift both. Instead: floors (defs >= 200, max >= 856) that
//   only a ledger truncation/revert can trip.
// - NO trailing-whitespace / bare-bracket lint proxies — the current
//   renderer emits those (separately tracked lint debt); a guard that fails
//   on them cannot catch the drop class it exists for.
// - NEW: batch-doc gate-record existence check — every repo file path the
//   CURRENT cohort of batch docs claims as delivered must exist at HEAD.
//   This is the exact tripwire the 2026-10-15 drop would have tripped.

const repoRoot = process.cwd()

describe('roadmap census (rm-877)', () => {
  it('ledger census invariants hold against the live tree', () => {
    expect(violations()).toEqual([])
  })

  it('live census shape is sane', () => {
    const live = census()
    expect(live.defs).toBeGreaterThanOrEqual(200)
    expect(live.dups).toBe(0)
    expect(live.max).toBeGreaterThanOrEqual(856)
    expect(live.malformedDefLines).toBe(0)
    expect(live.renderTailPresent).toBe(true)
  })

  it('census parses a synthetic ledger from an explicit path', () => {
    const synthetic = census(join(repoRoot, 'test/fixtures/roadmap-census-synthetic.md'))
    expect(synthetic.defs).toBe(2)
    expect(synthetic.dups).toBe(0)
    expect(synthetic.max).toBe(881)
    expect(synthetic.malformedDefLines).toBe(1)
  })

  const healthy: RoadmapCensus = {
    defs: 245,
    dups: 0,
    max: 880,
    malformedDefLines: 0,
    renderTailPresent: true,
  }

  it('floor tripwire fires on a truncated census (rm-678 corruption class)', () => {
    expect(violationsOf({...healthy, defs: 150})).toContainEqual(
      'defs 150 below floor 200 — ledger truncation (rm-678 corruption class)',
    )
  })

  it('duplicate-id tripwire fires on mint collision', () => {
    expect(violationsOf({...healthy, dups: 2})).toContainEqual(
      '2 duplicate def ids — parallel mints collided (first-landed-wins convention violated)',
    )
  })

  it('max-id monotonic floor fires on a reverted ledger', () => {
    expect(violationsOf({...healthy, max: 700})).toContainEqual(
      'max id rm-700 below monotonic floor rm-856 — ledger reverted or truncated',
    )
  })

  it('malformed def-line tripwire fires on renderer corruption', () => {
    expect(violationsOf({...healthy, malformedDefLines: 3})).toContainEqual(
      '3 malformed def lines — renderer output corrupted (see DEF_LINE shape)',
    )
  })

  it('render-tail tripwire fires when the renderer marker is gone', () => {
    expect(violationsOf({...healthy, renderTailPresent: false})).toContainEqual(
      'render-tail marker absent — ledger not ending in renderer output (hand-edit or truncation)',
    )
  })
})

// ---------------------------------------------------------------------------
// Batch-doc gate-record existence (rm-877 anti-drop tripwire).
//
// Batch docs (docs/prioritization/<date>-...md) record what a batch claims
// to have delivered. The CURRENT cohort = every doc sharing the newest date
// prefix. Every repo-relative file path claimed there must exist at HEAD,
// except the explicitly tolerated entries below (each names its owner —
// prune the entry when the file returns or the claim ages out of the
// cohort).
// ---------------------------------------------------------------------------

const PRIORITIZATION_DIR = join(repoRoot, 'docs/prioritization')

/**
 * Claimed-path token. `(?<!\w)` (not the original `\b`) so the `.github`
 * alternative also matches at line start / after whitespace / after an opening
 * paren or backtick — `\b` before `\.github` required a word char before the
 * dot, so `.github/…` claims escaped the tripwire entirely (review round-4
 * F-R4-5 hardening, 2026-10-17).
 */
const CLAIM_PATH_TOKEN = /(?<!\w)(?:test|src|web|scripts|docs|public|\.github)\/[\w./-]+\.[a-z]+/g

const TOLERATED_MISSING = new Map([
  [
    'test/visual-parity-guard.test.ts',
    'dropped 2026-10-17 by supersession (run 47f9aaefa379 compound SUPERSESSION record, rm-881): the sibling lane\'s test/visual-playwright-image-lockstep.test.ts (f521ec7 lineage, required Main check) is the single source of truth per the single-source rule; the compound doc quotes the dropped path in that record — prune this entry when the claim ages out of the newest cohort',
  ],
  [
    'test/operator-contract-window.test.ts',
    'dropped by the 2026-10-15 tip merge (06396b4 -> 3e3664c); restoration is owned by the 60-file drop-residue item (rm-887 band)',
  ],
  [
    'src/web/sse/manager.ts',
    'upstream tree path quoted for comparison in the gate doc — never a fork deliverable',
  ],
])

function newestCohortDocs(): string[] {
  const names = readdirSync(PRIORITIZATION_DIR).filter(name => name.endsWith('.md'))
  expect(names.length, 'docs/prioritization must not be empty — its absence is itself a drop signal').toBeGreaterThan(0)
  const dateOf = (name: string) => name.slice(0, 10)
  const newest = names.map(dateOf).sort().at(-1) ?? ''
  return names.filter(name => dateOf(name) === newest).map(name => join(PRIORITIZATION_DIR, name))
}

describe('batch-doc gate-record existence (rm-877)', () => {
  it('every file the current cohort of batch docs claims as delivered exists at HEAD', () => {
    const docs = newestCohortDocs()
    const offenders: string[] = []

    for (const doc of docs) {
      const text = readFileSync(doc, 'utf8')
      for (const claimed of new Set(text.match(CLAIM_PATH_TOKEN) ?? [])) {
        if (existsSync(join(repoRoot, claimed))) continue
        if (TOLERATED_MISSING.has(claimed)) continue
        offenders.push(`${claimed} (claimed by ${doc})`)
      }
    }

    expect(
      offenders,
      'Batch-doc gate records claim files that are missing at HEAD — either ' +
      'restore the file or disposition the drop explicitly. ' +
      'Proven mechanism: the 2026-10-15 tip merge (06396b4 -> 3e3664c) dropped 53 files exactly this way.',
    ).toEqual([])
  })

  it('tolerance list stays honest: no tolerated entry silently exists again', () => {
    const stale: string[] = []
    for (const claimed of TOLERATED_MISSING.keys()) {
      if (existsSync(join(repoRoot, claimed))) stale.push(claimed)
    }
    expect(stale, 'Tolerated-missing entries whose files exist again — prune them.').toEqual([])
  })
})
