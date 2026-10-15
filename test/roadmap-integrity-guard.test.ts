import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

/**
 * rm-1412: ledger-integrity guard for the ROADMAP.md definition wall.
 *
 * The candidate-era guard + `scripts/roadmap-census.ts` were retired at the
 * 2026-10-11 managed-render adoption landing (recorded in the ROADMAP graft
 * comment), and since then every maintenance band re-derives the census by
 * hand (235 defs / 0 duplicates / max id re-verified per run). This guard
 * rebuilds the invariant as a CI-checked test so the hand-census is no longer
 * the only thing standing between a mis-pasted def block and a silently
 * corrupted ledger that every run's reconciliation trusts:
 *
 * - def ids must be unique fleet-wide (a duplicate `rm-N` makes mint/claim
 *   bookkeeping ambiguous across the whole band fleet);
 * - every `- id:` line must match the canonical def-line shape
 *   (`- id: \`rm-N\` | track: T | priority: P | status: S …`);
 * - track and status first-tokens must stay inside the pinned vocabularies —
 *   extend those sets DELIBERATELY (with the ledger convention updated in the
 *   same change), never silently.
 *
 * Vocabularies pinned from the wall at a385ca5 (2026-10-15): tracks
 * correctness / operator-experience / reliability / security; statuses
 * candidate / implemented / in_progress.
 */
const repoRoot = process.cwd()

const DEF_LINE_PATTERN =
  /^- id: `rm-(?<id>\d+)` \| track: (?<track>[a-z-]+) \| priority: (?<priority>\d+(?:\.\d+)?) \| status: (?<status>[a-z_-]+)/

const TRACKS = new Set(['correctness', 'operator-experience', 'reliability', 'security'])
const STATUSES = new Set(['candidate', 'implemented', 'in_progress'])
const MIN_DEFS = 200

interface DefLine {
  line: number
  id: string
  track: string
  priority: string
  status: string
}

interface ParsedWall {
  defs: DefLine[]
  malformed: {line: number; text: string}[]
}

function parseWall(): ParsedWall {
  const lines = readFileSync(resolve(repoRoot, 'ROADMAP.md'), 'utf8').split('\n')
  const defs: DefLine[] = []
  const malformed: {line: number; text: string}[] = []

  lines.forEach((text, index) => {
    if (!text.startsWith('- id: ')) return
    const match = DEF_LINE_PATTERN.exec(text)
    const groups = match?.groups
    if (match === null || groups === undefined) {
      malformed.push({line: index + 1, text})
      return
    }
    defs.push({
      line: index + 1,
      id: groups.id ?? '',
      track: groups.track ?? '',
      priority: groups.priority ?? '',
      status: groups.status ?? '',
    })
  })

  return {defs, malformed}
}

describe('ROADMAP.md ledger-integrity guard (rm-1412)', () => {
  it('every `- id:` line matches the canonical def-line shape (id | track | priority | status)', () => {
    const {malformed} = parseWall()
    expect(
      malformed.map(entry => `ROADMAP.md:${entry.line}: ${entry.text.slice(0, 120)}`),
      'Def line(s) do not match `- id: `rm-N` | track: T | priority: P | status: S …` — ' +
      'a malformed def corrupts census/mint bookkeeping across the band fleet (rm-1412).',
    ).toEqual([])
  })

  it('def ids are unique across the ledger', () => {
    const {defs} = parseWall()
    const seen = new Map<string, number>()
    for (const def of defs) seen.set(def.id, (seen.get(def.id) ?? 0) + 1)
    const duplicates = [...seen.entries()]
      .filter(([, count]) => count > 1)
      .map(([id, count]) => `rm-${id} appears ${count} times`)
    expect(duplicates, 'Duplicate def ids make fleet mint/claim reconciliation ambiguous (rm-1412).').toEqual([])
  })

  it('track vocabulary stays within the pinned set', () => {
    const {defs} = parseWall()
    const offenders = defs
      .filter(def => !TRACKS.has(def.track))
      .map(def => `ROADMAP.md:${def.line}: track '${def.track}' (rm-${def.id})`)
    expect(
      offenders,
      'Unknown track token — extend TRACKS deliberately with the ledger convention, never silently (rm-1412).',
    ).toEqual([])
  })

  it('status vocabulary stays within the pinned set (first token; trailing annotations allowed)', () => {
    const {defs} = parseWall()
    const offenders = defs
      .filter(def => !STATUSES.has(def.status))
      .map(def => `ROADMAP.md:${def.line}: status '${def.status}' (rm-${def.id})`)
    expect(
      offenders,
      'Unknown status token — extend STATUSES deliberately with the ledger convention, never silently (rm-1412).',
    ).toEqual([])
  })

  it('ledger carries a meaningful census floor', () => {
    const {defs} = parseWall()
    expect(
      defs.length,
      'Def count collapsed below the floor — the wall lost history or the def-line shape drifted (rm-1412).',
    ).toBeGreaterThanOrEqual(MIN_DEFS)
  })
})
