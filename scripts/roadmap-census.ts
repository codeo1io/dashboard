/**
 * Roadmap ledger census (re-derived rm-877, restored after the 2026-10-15
 * tip-merge drop; original rm-678).
 *
 * Counts def lines (`- id: \`rm-N\` | track | priority | status`), duplicate
 * def ids, and the maximum minted id. Re-derived per the rm-877 selection:
 * NO hard-pinned def count or max-id equality — parallel mints legitimately
 * drift both. The tripwires live in `violations()` (and the vitest guard in
 * test/roadmap-integrity-guard.test.ts): uniqueness, floors, render-tail
 * integrity, and def-line shape — all read from the tree itself.
 *
 * Dropped from the rm-678 violations set: trailing-whitespace and bare
 * bracket-list lint proxies. The current renderer emits those (known,
 * separately-tracked lint debt); a census that fails on them cannot serve
 * as a tripwire for the drop class it exists to catch.
 *
 * Runnable standalone (`node scripts/roadmap-census.ts`) and imported by
 * test/roadmap-integrity-guard.test.ts.
 */

import {readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import process from 'node:process'
import {fileURLToPath} from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
export const ROADMAP_PATH = join(repoRoot, 'ROADMAP.md')

/** Same def-line shape as the render format: `- id: `rm-N` | track: t | priority: p | status: s`. */
const DEF_LINE = /^- id: `rm-(\d+)` \| track: ([a-z-]+) \| priority: (\d+(?:\.\d+)?) \| status: (.+)$/

/**
 * Historical corruption threshold (rm-678): a 2026-09 renderer regression
 * truncated the ledger to 197 defs while the tree still carried its
 * consumers. Anything below 200 means the ledger lost whole sections.
 */
const DEFS_FLOOR = 200

/**
 * Monotonic max-id floor (rm-877): the in-tree maximum BEFORE this batch's
 * ledger extension (rm-856). Mints only grow the max; a lower value means
 * the ledger was truncated or reverted. Deliberately NOT an equality pin —
 * sibling spool families (rm-881+) land above it.
 */
const MAX_ID_FLOOR = 856

/** The renderer stamps this marker at the tail; its absence means hand-edited or truncated output. */
const RENDER_TAIL_MARKER = '<!-- managed by hermes-roadmap render; do not edit by hand -->'

export interface RoadmapCensus {
  defs: number
  dups: number
  max: number
  malformedDefLines: number
  renderTailPresent: boolean
}

export function census(roadmapPath: string = ROADMAP_PATH): RoadmapCensus {
  const text = readFileSync(roadmapPath, 'utf8')
  const ids: number[] = []
  let malformedDefLines = 0

  for (const line of text.split('\n')) {
    if (!line.startsWith('- id: ')) continue
    const match = DEF_LINE.exec(line)
    if (match === null) {
      malformedDefLines += 1
      continue
    }
    ids.push(Number(match[1]))
  }

  const unique = new Set(ids)
  const lines = text.split('\n')
  let lastNonEmpty = ''
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const trimmed = (lines[i] ?? '').trim()
    if (trimmed !== '') {
      lastNonEmpty = trimmed
      break
    }
  }

  return {
    defs: ids.length,
    dups: ids.length - unique.size,
    max: ids.length === 0 ? 0 : Math.max(...ids),
    malformedDefLines,
    renderTailPresent: lastNonEmpty === RENDER_TAIL_MARKER,
  }
}

/** Structured ledger invariants for a census result — empty array means healthy. */
export function violationsOf(live: RoadmapCensus): string[] {
  const found: string[] = []

  if (live.defs < DEFS_FLOOR) {
    found.push(`defs ${live.defs} below floor ${DEFS_FLOOR} — ledger truncation (rm-678 corruption class)`)
  }
  if (live.dups > 0) {
    found.push(`${live.dups} duplicate def ids — parallel mints collided (first-landed-wins convention violated)`)
  }
  if (live.max < MAX_ID_FLOOR) {
    found.push(`max id rm-${live.max} below monotonic floor rm-${MAX_ID_FLOOR} — ledger reverted or truncated`)
  }
  if (live.malformedDefLines > 0) {
    found.push(`${live.malformedDefLines} malformed def lines — renderer output corrupted (see DEF_LINE shape)`)
  }
  if (!live.renderTailPresent) {
    found.push('render-tail marker absent — ledger not ending in renderer output (hand-edit or truncation)')
  }

  return found
}

/** Ledger invariants for the live tree — empty array means healthy. */
export function violations(): string[] {
  return violationsOf(census())
}

if (process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`) {
  const live = census()
  process.stdout.write(`${live.defs} defs / ${live.dups} dups / max rm-${live.max}\n`)
  for (const violation of violations()) {
    process.stdout.write(`VIOLATION: ${violation}\n`)
  }
}
