#!/usr/bin/env node
// rm-678 no-install census half (repository-maintenance cycle 1, run 9189a4ac),
// re-landed 2026-10-15 as rm-857 (repository-maintenance cycle 1, run
// 3d6aa134904b) after the landing merge 3e3664c modify-vs-delete-dropped it
// while its own batch doc still claimed it as a deliverable: a zero-dependency
// ledger guard that needs no `pnpm install` — bare `node` only, so it can run
// in a no-install CI job or a fresh clone. Mirrors the vitest schema half in
// test/roadmap-integrity-guard.test.ts (same census shape; the vitest suite
// adds the schema assertions and the corruption fixture). Born from the
// 2026-10-05 ledger corruption (assess bc717b84: 3d07cf9 served a 197-def
// ROADMAP with 24 trailing-whitespace lines and bare bracket-list residue)
// that every landed guard passed because none of them looked at the ledger
// itself.
//
// 2026-10-15 adaptation note (rm-857): the main-lineage ledger carries a
// frozen renderer-owned band of 47 trailing-whitespace lines (each an empty
// `- acceptance: ` value) and 1 remaining bare bracket-list line; those are
// known debt, so both rules fire only ABOVE their recorded baselines — they
// are regression tripwires for NEW occurrences, not absolutes. Duplicates and
// the defs floor stay absolute.

import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'

/** Healthy ledgers hold at least this many defs; the corrupted blob held 197. */
const DEFS_FLOOR = 200

/** Known renderer-owned debt at the 2026-10-15 re-land: fires only above. */
export const TRAILING_WS_BASELINE = 47
/** Known renderer-owned debt after rm-862 (ROADMAP.md:19 stays): fires only above. */
export const BARE_BRACKET_BASELINE = 1

const defLine = /^- id: `rm-\d+` \| track: \S+ \| priority: [\d.]+ \| status: /

export function census(content: string) {
  const lines = content.split('\n')
  const ids = lines
    .filter(line => defLine.test(line))
    .map(line => Number(/^- id: `rm-(\d+)`/.exec(line)?.[1] ?? -1))
  const dupIds = ids.filter((id, i) => ids.indexOf(id) !== i)
  const trailingWs = lines.filter(line => line !== line.trimEnd()).length
  const bareBracketLists = lines.filter(line => /^-\s+\['/.test(line)).length
  const statusHistogram = new Map<string, number>()
  for (const line of lines) {
    if (!defLine.test(line)) continue
    const status = line.split('| status: ')[1]?.split(' ')[0] ?? '?'
    statusHistogram.set(status, (statusHistogram.get(status) ?? 0) + 1)
  }
  return {
    defs: ids.length,
    dups: [...new Set(dupIds)],
    max: ids.length ? Math.max(...ids) : 0,
    trailingWs,
    bareBracketLists,
    statusHistogram,
  }
}

export function violations(c: ReturnType<typeof census>): string[] {
  const v: string[] = []
  if (c.dups.length > 0) v.push(`duplicate def ids: ${c.dups.join(', ')}`)
  if (c.defs < DEFS_FLOOR)
    v.push(`defs ${c.defs} below floor ${DEFS_FLOOR} — mass drop suspected`)
  if (c.trailingWs > TRAILING_WS_BASELINE)
    v.push(
      `${c.trailingWs} trailing-whitespace lines above known-debt baseline ${TRAILING_WS_BASELINE} (emptied acceptance prose suspected)`,
    )
  if (c.bareBracketLists > BARE_BRACKET_BASELINE)
    v.push(
      `${c.bareBracketLists} bare bracket-list lines above known-debt baseline ${BARE_BRACKET_BASELINE} (markdown/no-missing-label-refs class)`,
    )
  return v
}

const invoked = process.argv[1] ?? ''
if (invoked !== '' && resolve(invoked) === resolve(import.meta.filename ?? '')) {
  const roadmap = resolve(process.cwd(), 'ROADMAP.md')
  const c = census(readFileSync(roadmap, 'utf8'))
  const hist = [...c.statusHistogram.entries()].map(([k, n]) => `${k}:${n}`).join(' ')
  process.stdout.write(
    `ROADMAP census: defs=${c.defs} dups=${c.dups.length} max=rm-${c.max} statuses ${hist}\n`,
  )
  const v = violations(c)
  if (v.length > 0) {
    for (const problem of v) process.stdout.write(`VIOLATION: ${problem}\n`)
    process.exitCode = 1
  } else {
    process.stdout.write('census healthy\n')
  }
}
