import {spawnSync} from 'node:child_process'
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
// prune the entry when the file returns to the tree (git-tracked again) or
// the claim ages out of the cohort).
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
    'test/operator-contract-window.test.ts',
    'dropped by the 2026-10-15 tip merge (06396b4 -> 3e3664c); restoration is owned by the 60-file drop-residue item (rm-887 band)',
  ],
  [
    'src/web/sse/manager.ts',
    'upstream tree path quoted for comparison in the gate doc — never a fork deliverable',
  ],
  [
    'test/visual-parity-guard.test.ts',
    'recorded DROPPED by the 2026-10-17 cycle:1 batch doc itself (run 47f9aaefa379 supersession record — single-source rule: main adopted the sibling visual-playwright-image-lockstep.test.ts instead, owner rm-881); the run’s branch predated this tripwire, so the cohort claim first became visible at the 40bc52f7 integrate',
  ],
  [
    'web/src/pwa/cache-names.ts',
    'deleted BY the 2026-10-18 cycle:2 batch itself (run f3a4bbb55911, rm-274 acceptance path (a) residue removal — its sole export had no writer and its forward-wiring owner rm-249 was superseded when push landed in the main SW); the doc line 14 records the deletion, so the token is a deletion record, not a deliverable — never returns; prunes when the 2026-10-18 cohort ages out',
  ],
  [
    'web/dist/index.html',
    'build artifact quoted as runtime evidence by the 2026-10-18 cycle:2 batch doc (registerSW.js auto-injection verified in the built bundle) — never tracked (gitignored); exists only transiently after pnpm build:web, so it is absent from a clean checkout by construction and its build-time presence is invisible to the honesty leg (tracked-ness is the staleness test)',
  ],
  [
    'web/src/operator/markdown-output.ts',
    'upstream tree path quoted in the 2026-10-18 cycle:2 batch doc’s rm-1513 next-cycle lead (upstream a957b59b #646 markdown renderer) — the absorb is still a candidate def, not landed; prune this entry when rm-1513 lands the file',
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
    // "Exists again" means the path returned as TREE CONTENT — git-tracked —
    // not merely present on disk: transient untracked build artifacts flap an
    // existence-only check (web/dist/index.html reappears on every `pnpm
    // pretest` build, so this leg would red on every full `pnpm test` run
    // while staying green on a bare targeted run). Tracked-ness is exactly
    // the deliverable-returned signal this leg exists to catch.
    const stale: string[] = []
    for (const claimed of TOLERATED_MISSING.keys()) {
      if (!existsSync(join(repoRoot, claimed))) continue
      const tracked = spawnSync('git', ['ls-files', '--', claimed], {cwd: repoRoot, encoding: 'utf8'})
      if (tracked.status === 0 && tracked.stdout.trim() !== '') stale.push(claimed)
    }
    expect(stale, 'Tolerated-missing entries whose files exist again — prune them.').toEqual([])
  })
})
