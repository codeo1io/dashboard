// rm-860 render-guard (run 8aabd64de4e, repository-maintenance cycle 2):
// the managed-ROADMAP renderer (hermes-roadmap render_markdown) is lossy —
// def-lines are emitted only for open items, closed items are capped at 20,
// the two-value Track enum collapses the taxonomy, and trailing whitespace
// rides the data through emit (root causes: hermes_roadmap/cli.py:215-262,
// models.py:12-16, ingest.py:159-181; durable renderer-side cure owned by
// rm-861). Until that cure lands, this guard makes every future render PROVE
// ledger health from the def lines alone, failing on any NEW debt beyond the
// recorded standing baselines:
//
//   - def count never falls below the floor (237 at origin/main 3e3664c);
//   - zero duplicate def ids;
//   - narrative rm-NNN references never dangle beyond the standing 23;
//   - def blocks carry no trailing whitespace beyond the standing 47 and no
//     bare bracketed label-ref prose beyond the standing 4;
//   - every def line carries a non-empty track, and the taxonomy collapse
//     (renderer Track enum) never gets WORSE than the standing share.
//
// Baselines only move DOWN (debt repaid), never up. New standing debt must be
// a conscious, commented change — not a render side-effect.

import {readFileSync} from 'node:fs'
import {join, resolve} from 'node:path'
import {describe, expect, it} from 'vitest'

const repoRoot = resolve(import.meta.dirname, '..')
const lines = readFileSync(join(repoRoot, 'ROADMAP.md'), 'utf8').split('\n')

// Def lines may carry trailing whitespace (renderer emission) and long status
// narratives after the status token (e.g. 'implemented (restored 2026-10-15
// ...)') — the regex tolerates both so such lines still count as defs, not as
// pruned. Id is capture group 1, track group 2; the status token itself
// is not captured.
const DEF_RE = /^- id: `rm-(\d+)` \| track: (\S+) \| priority: [\d.]+ \| status: \S.*$/

const defIdx = lines.map((l, i) => (DEF_RE.test(l) ? i : -1)).filter(i => i >= 0)

// Standing renderer debt at the 2026-10-15 re-land (rm-857); see header.
const FLOOR_DEFS = 237
const STANDING_DANGLING = new Set([
  '001',
  '002',
  '103',
  '104',
  '105',
  '106',
  '107',
  '108',
  '112',
  '114',
  '115',
  '116',
  '117',
  '118',
  '119',
  '120',
  '123',
  '126',
  '127',
  '129',
  '553',
  '678',
  '13640',
])
const STANDING_TRAILING_WS_IN_DEFS = 47
const STANDING_BRACKET_PROSE_IN_DEFS = 4
// reliability 241 / docs 1 at 242 defs — the renderer already collapsed the
// taxonomy; the guard fires if a render pushes the top share ABOVE this.
const STANDING_TOP_SHARE = 241 / 242

function owningDef(i: number): number | null {
  const at = defIdx.filter(d => d <= i)
  return at.length > 0 ? (at.at(-1) as number) : null
}

describe('rm-860 roadmap render guard', () => {
  it('never renders fewer defs than the floor', () => {
    expect(
      defIdx.length,
      `def count ${defIdx.length} fell below floor ${FLOOR_DEFS} — lossy render suspected`,
    ).toBeGreaterThanOrEqual(FLOOR_DEFS)
  })

  it('carries no duplicate def ids', () => {
    const ids = defIdx.map(i => lines[i]?.match(DEF_RE)?.[1] ?? '')
    const dups = ids.filter((id, n) => id !== '' && ids.indexOf(id) !== n)
    expect(dups, `duplicate def ids: ${[...new Set(dups)].join(', ')}`).toEqual([])
  })

  it('adds no dangling narrative references beyond the standing set', () => {
    const defs = new Set(
      defIdx
        .map(i => lines[i]?.match(DEF_RE))
        .filter((m): m is RegExpMatchArray => m !== undefined)
        .map(m => m[1]),
    )
    const dangling = new Set<string>()
    lines.forEach(l => {
      if (DEF_RE.test(l)) return
      for (const m of l.matchAll(/\brm-(\d+)\b/g)) {
        const id = m[1]
        if (id !== undefined && !defs.has(id)) dangling.add(id)
      }
    })
    const fresh = [...dangling].filter(id => !STANDING_DANGLING.has(id)).sort((a, b) => Number(a) - Number(b))
    expect(fresh, `new dangling refs: rm-${fresh.join(', rm-')}`).toEqual([])
  })

  it('adds no trailing whitespace inside def blocks beyond the standing baseline', () => {
    let bad = 0
    const where: number[] = []
    lines.forEach((l, i) => {
      if (l !== l.trimEnd() && owningDef(i) !== null) {
        bad++
        where.push(i + 1)
      }
    })
    expect(
      bad,
      `trailing whitespace in def blocks ${bad} > standing ${STANDING_TRAILING_WS_IN_DEFS} at lines ${where.slice(0, 8).join(',')}`,
    ).toBeLessThanOrEqual(STANDING_TRAILING_WS_IN_DEFS)
  })

  it('adds no bare bracketed label-ref prose inside def blocks beyond the standing baseline', () => {
    let bad = 0
    const where: number[] = []
    lines.forEach((l, i) => {
      if (owningDef(i) === null) return
      for (const m of l.matchAll(/\[[^\]]*\]/g)) {
        const before = l.slice(Math.max(0, m.index - 1), m.index)
        const after = l.slice(m.index + m[0].length, m.index + m[0].length + 1)
        if (before === '`' || after === '`') continue // code spans are fine
        bad++
        where.push(i + 1)
      }
    })
    expect(
      bad,
      `bare bracket prose in def blocks ${bad} > standing ${STANDING_BRACKET_PROSE_IN_DEFS} at lines ${where.slice(0, 8).join(',')}`,
    ).toBeLessThanOrEqual(STANDING_BRACKET_PROSE_IN_DEFS)
  })

  it('every def line carries a non-empty track and the taxonomy collapse never worsens', () => {
    const tracks = new Map<string, number>()
    for (const i of defIdx) {
      const line = lines[i]
      if (line === undefined) continue
      const track = line.match(DEF_RE)?.[2]
      expect(track, `def line ${i + 1} lost its track value — renderer collapse`).toBeTruthy()
      if (track === undefined) continue
      tracks.set(track, (tracks.get(track) ?? 0) + 1)
    }
    expect(tracks.size, 'taxonomy collapsed to a single track — renderer Track enum loss').toBeGreaterThanOrEqual(2)
    const top = Math.max(...tracks.values())
    expect(
      top / defIdx.length,
      `top track share ${(top / defIdx.length).toFixed(4)} exceeds standing ${STANDING_TOP_SHARE.toFixed(4)}`,
    ).toBeLessThanOrEqual(STANDING_TOP_SHARE + 1e-9)
  })
})
