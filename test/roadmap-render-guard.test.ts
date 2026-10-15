import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

// rm-100 (repository-maintenance run 796f73cf, batch 'Gates green at HEAD'):
// ROADMAP.md is a bot-managed generated artifact — hermes-autonomy
// roadmap-sync rewrites it via hermes-roadmap's renderer — so eslint.config.ts
// excludes it from the lint surface the same way the generated doc trees are
// excluded. This guard freezes the render censuses that exclusion retires: a
// renderer regression (def-line pruning, duplicate ids, trailing-whitespace
// growth, lost items) still fails a gate, in milliseconds, without invoking
// eslint. Censuses are frozen at the 2026-10-15 HEAD (5d5f9be) values;
// improvements may tighten them, growth may not.
//
// Extraction method (established): def ids come ONLY from def lines — a
// document-wide rm-N sweep false-positives on prose cross-references.

const lines = readFileSync(join(process.cwd(), 'ROADMAP.md'), 'utf8').split('\n')

const DEF_LINE = /^- id: `rm-(\d+)`/
const CLOSED_ROW = /^- `rm-(\d+)`/
const ANY_REF = /rm-(\d+)/g

const defIds = lines
  .map(line => line.match(DEF_LINE))
  .filter(m => m !== null)
  .map(m => `rm-${m[1]}`)

const closedIds = new Set(
  lines
    .map(line => line.match(CLOSED_ROW))
    .filter(m => m !== null)
    .map(m => `rm-${m[1]}`),
)

// Narrative refs: rm-N mentions outside their own def lines. A ref resolves
// when its target has a def line (open item) or a closed row; refs with
// neither are true danglers — the renderer's def-pruning pathology surfaces
// exactly here.
const dangling = new Set<string>()
for (const line of lines) {
  if (DEF_LINE.test(line)) continue
  for (const m of line.matchAll(ANY_REF)) {
    const id = `rm-${m[1]}`
    if (!defIds.includes(id) && !closedIds.has(id)) dangling.add(id)
  }
}

// Frozen 2026-10-15 (HEAD 5d5f9be), RE-FROZEN 2026-10-16 (review-fix 886ec591)
// at the integrate merge base — origin/main 7b4d4256, ROADMAP blob dc749258,
// a wall re-rendered past this branch's base. Every other def-less ref there
// resolves via a Closed items row; these five do not — rm-13640 (main.yaml
// rider self-citation with no item), rm-553 and rm-678 (cross-referenced from
// other items' prose), rm-1410 (landed rm-1450 cites the unlanded
// comment-flip tail), rm-714 (landed rm-740 cites the unlanded dormancy
// decision). Renderer fixes shrink this set; growth is a regression.
const KNOWN_DANGLING = new Set([
  'rm-13640',
  'rm-1410',
  'rm-553',
  'rm-678',
  'rm-714',
])

describe('ROADMAP render census guard (rm-100)', () => {
  it('def-line ids are unique (def-line-only extraction)', () => {
    const dups = defIds.filter((id, i) => defIds.indexOf(id) !== i)
    expect(dups, 'duplicate def ids — the renderer emitted an item twice').toEqual([])
  })

  it('def-line count holds the frozen floor', () => {
    expect(
      defIds.length,
      'def lines fell below the frozen floor — the renderer dropped open items',
    ).toBeGreaterThanOrEqual(235)
  })

  it('trailing-whitespace lines hold the frozen ceiling', () => {
    const trailing = lines.filter(line => /[ \t]+$/.test(line)).length
    expect(
      trailing,
      'trailing-whitespace growth — the render regressed (eslint no longer carries this census)',
    ).toBeLessThanOrEqual(47)
  })

  it('narrative rm-refs introduce no new danglers', () => {
    const novel = [...dangling].filter(id => !KNOWN_DANGLING.has(id))
    expect(
      novel,
      'rm-refs with no def line AND no closed row — items lost by the renderer, or refs to nothing',
    ).toEqual([])
  })
})
