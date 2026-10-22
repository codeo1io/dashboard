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
  // 'web/src/operator/markdown-output.ts' tolerance RETIRED at the 2026.10.48
  // adoption (b48ae13): the file landed tracked (upstream a957b59b #646
  // markdown renderer), so it no longer belongs in the tolerated-missing map —
  // the honesty leg would correctly flag it as a stale entry.
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

// ---------------------------------------------------------------------------
// Deliverable-marker half (rm-857, run 3d6aa134904b) — grafted onto the
// rm-877 guard at integrate conflict case 5e13305c (2026-10-20).
//
// The rm-877 gate-record half above checks the NEWEST cohort of batch docs;
// this half checks the opt-in `## Deliverables` marker convention the
// 3d6aa134904b batch established (its doc is the first carrier): a
// marker-bearing doc declares repo-relative paths in backticked bullets, and
// the guard fails if any declared path is absent at HEAD OR if the newest
// marker-bearing doc's census claim diverges from the live ledger — the exact
// 237-live-vs-247-claimed divergence the 2026-10-09 landing merge (3e3664c)
// hid for six days. Census-claim reads take the LAST match in the doc, so an
// integrate-time Landing-record re-census supersedes the at-mint claim
// without rewriting dated history (first-landed-wins parallel mints
// legitimately grow the ledger past an older doc's claim).
// ---------------------------------------------------------------------------

const DELIVERABLES_HEADING = /^## Deliverables$/m
const CENSUS_CLAIM = /(\d+) defs \/ (\d+) dups \/ max rm-(\d+)/g
// rm-2036: the explicit empty-section record — a marker-bearing doc that
// deliberately declares ZERO deliverable paths (e.g. a docs-only batch)
// writes this bullet instead of going silent, so carrierhood never depends
// on declared-path count alone.
const EMPTY_DELIVERABLES_MARKER = /^- (?:none|no deliverables)\b/im

function deliverablesSection(docText: string): string {
  const after = docText.split(DELIVERABLES_HEADING)[1] ?? ''
  return after.split(/^## /m)[0] ?? ''
}

function deliverablesFrom(docText: string): string[] {
  if (!DELIVERABLES_HEADING.test(docText)) return []
  return [...deliverablesSection(docText).matchAll(/^- `([^`\n]+)`(?: —|:|$)/gm)].map(m => m[1] ?? '')
}

// rm-2036: the heading alone is not a carrier — the section must DECLARE
// something: at least one deliverable bullet, or the explicit
// EMPTY_DELIVERABLES_MARKER record for a deliberately-empty section. A
// heading followed only by prose used to count as a carrier AND feed the
// census-claim leg while declaring nothing (the exact shape a silent
// deliverable-set drop would leave behind); a mid-line prose mention of
// the marker was already excluded by the line anchor and stays excluded
// (the 2026-10-16 compound doc is the live negative).
function isDeliverablesCarrier(docText: string): boolean {
  if (!DELIVERABLES_HEADING.test(docText)) return false
  if (deliverablesFrom(docText).length > 0) return true
  return EMPTY_DELIVERABLES_MARKER.test(deliverablesSection(docText))
}

function missingDeliverables(docText: string): string[] {
  return deliverablesFrom(docText).filter(path => !existsSync(join(repoRoot, path)))
}

describe('batch-doc deliverable marker (rm-857)', () => {
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
    expect(missingDeliverables(fixture)).toEqual(['no/such/file-anywhere.ts'])
  })

  it('a Deliverables heading with a prose-only section is not a carrier (rm-2036)', () => {
    // The 3e3664c drop-survival class: a heading followed by no deliverable
    // bullets used to count as a carrier AND feed the census-claim leg while
    // declaring nothing — a dropped declared-path set would survive exactly
    // this way. The section must declare something (bullets) or explicitly
    // record its emptiness (EMPTY_DELIVERABLES_MARKER).
    const proseOnly = [
      '# batch doc',
      '',
      '## Deliverables',
      '',
      'This batch deliberately declares nothing here; its output is ledger',
      'prose only — a bare heading must not satisfy the carriers leg.',
      '',
      '## Notes',
      '',
      '- `not-a-deliverable.ts` — outside the section, must not parse',
    ].join('\n')
    expect(isDeliverablesCarrier(proseOnly)).toBe(false)
    expect(deliverablesFrom(proseOnly)).toEqual([])
  })

  it('an explicit empty-marker section is a carrier that declares zero deliverables (rm-2036)', () => {
    const emptyMarker = [
      '# batch doc',
      '',
      '## Deliverables',
      '',
      '- none — docs-only batch; its changes ride files other docs declare.',
      '',
      '## Notes',
    ].join('\n')
    expect(isDeliverablesCarrier(emptyMarker)).toBe(true)
    expect(deliverablesFrom(emptyMarker)).toEqual([])
  })

  it('a mid-line prose mention of the marker is not a carrier (rm-2036)', () => {
    // Live negative: the 2026-10-16 compound doc mentions `## Deliverables`
    // mid-line and must stay a non-carrier (line anchor already excluded it;
    // this pins that exclusion against future regex loosening).
    const mention = [
      '# batch doc',
      '',
      'The convention requires a `## Deliverables` section in every batch doc.',
    ].join('\n')
    expect(isDeliverablesCarrier(mention)).toBe(false)
    expect(deliverablesFrom(mention)).toEqual([])
  })

  it('every declared deliverable in every marker-bearing batch doc exists', () => {
    const docs = readdirSync(PRIORITIZATION_DIR)
      .filter(name => name.endsWith('.md'))
      .map(name => ({name, text: readFileSync(join(PRIORITIZATION_DIR, name), 'utf8')}))
    const missing: string[] = []
    let carriers = 0
    for (const doc of docs) {
      if (!isDeliverablesCarrier(doc.text)) continue
      carriers += 1
      for (const path of missingDeliverables(doc.text)) missing.push(`${doc.name}: ${path}`)
    }
    expect(carriers, 'no marker-bearing batch doc — the rm-857 convention lost its carrier').toBeGreaterThan(0)
    expect(
      missing,
      'Marker-bearing batch docs declare deliverables that are missing at HEAD — ' +
      'restore the file or disposition the drop explicitly (the 3e3664c class).',
    ).toEqual([])
  })

  it('the newest marker-bearing batch doc states the true census', () => {
    const carriers = readdirSync(PRIORITIZATION_DIR)
      .filter(name => name.endsWith('.md'))
      .map(name => ({name, text: readFileSync(join(PRIORITIZATION_DIR, name), 'utf8')}))
      .filter(doc => isDeliverablesCarrier(doc.text))
    expect(carriers.length).toBeGreaterThan(0)
    const newest = carriers.reduce((a, b) => (b.name >= a.name ? b : a))
    // Last match wins: an integrate Landing-record re-census supersedes the
    // at-mint claim without rewriting dated history.
    const claims = [...newest.text.matchAll(CENSUS_CLAIM)]
    const claim = claims.at(-1)
    expect(claim, `no census claim in ${newest.name}`).not.toBeUndefined()
    const live = census()
    expect(Number(claim?.[1]), `${newest.name} claims stale defs`).toBe(live.defs)
    expect(Number(claim?.[2]), `${newest.name} claims stale dups`).toBe(live.dups)
    expect(Number(claim?.[3]), `${newest.name} claims stale max id`).toBe(live.max)
  })
})
