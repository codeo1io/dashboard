#!/usr/bin/env node
// rm-678 no-install census half (repository-maintenance cycle 1, run 9189a4ac):
// a zero-dependency ledger guard that needs no `pnpm install` — bare `node`
// only, so it can run in a no-install CI job or a fresh clone. Mirrors the
// vitest schema half in test/roadmap-integrity-guard.test.ts (same census
// shape; the vitest suite adds the schema assertions and the corruption
// fixture). Born from the 2026-10-05 ledger corruption (assess bc717b84:
// 3d07cf9 served a 197-def ROADMAP with 24 trailing-whitespace lines and bare
// bracket-list residue) that every landed guard passed because none of them
// looked at the ledger itself.

import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'

/** Healthy ledgers hold at least this many defs; the corrupted blob held 197. */
const DEFS_FLOOR = 200

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
  if (c.trailingWs > 0)
    v.push(`${c.trailingWs} trailing-whitespace lines (emptied acceptance prose suspected)`)
  if (c.bareBracketLists > 0)
    v.push(`${c.bareBracketLists} bare bracket-list lines (markdown/no-missing-label-refs class)`)
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
