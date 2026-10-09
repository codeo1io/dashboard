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

// rm-769 citation-integrity half: ids cited anywhere in the ledger that have
// no def line. Recorded phantoms carry their traced origin here — adding a
// new entry REQUIRES a first-hand origin trace (git log --all -S'<id>') in
// the comment; historical prose stays verbatim.
export const PHANTOM_ALLOWLIST = new Set([
  // rm-13640: cited at 9 ROADMAP sites + .github/workflows/main.yaml:33 but no
  // def exists anywhere in any lineage ledger; the id rode in on
  // conductor-salvage / ephemeral cloud-CI commits (3135ebf, run f9854748,
  // 2026-09-29 timeout bump) — landed equivalents: rm-279/rm-284/rm-486.
  'rm-13640',
])

// Citation scan: `rm-<digits>` NOT preceded by a letter/digit/hyphen — keeps
// hyphenated prose like "container-form-2026-09-19.md" from matching.
const citedId = /(?<![a-z0-9-])rm-\d+\b/g

/**
 * Classify every id citation in the ledger text: `phantom` = recorded and
 * origin-traced; `foreign` = cited but never defined here (early-ledger ids
 * retired with their defs, render-dropped ids, and other conductor lineages'
 * unlanded ids cross-referenced in riders/merge comments — reported, not
 * violating: the set legitimately differs per tree, so a hard pin would be
 * red on any merge base). `defined` = def-line ids for reference.
 */
export function danglingCitations(content: string): {
  phantom: string[]
  foreign: string[]
  defined: number
} {
  const defined = new Set(
    content
      .split('\n')
      .map(line => line.match(/^- id: `(rm-\d+)`/)?.[1])
      .filter(id => id !== undefined),
  )
  const cited = [...new Set(content.match(citedId) ?? [])]
  return {
    phantom: [...PHANTOM_ALLOWLIST].filter(id => cited.includes(id)),
    foreign: cited
      .filter(id => !defined.has(id) && !PHANTOM_ALLOWLIST.has(id))
      .sort((a, b) => Number(a.slice(3)) - Number(b.slice(3))),
    defined: defined.size,
  }
}

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
  const text = readFileSync(roadmap, 'utf8')
  const c = census(text)
  const dc = danglingCitations(text)
  const hist = [...c.statusHistogram.entries()].map(([k, n]) => `${k}:${n}`).join(' ')
  process.stdout.write(
    `ROADMAP census: defs=${c.defs} dups=${c.dups.length} max=rm-${c.max} statuses ${hist}\n` +
    `citations: ${dc.foreign.length} foreign (early-ledger/render-dropped/other-lineage — reported), ` +
    `${dc.phantom.length} recorded phantom (${dc.phantom.join(', ') || 'none'})\n`,
  )
  const v = violations(c)
  if (v.length > 0) {
    for (const problem of v) process.stdout.write(`VIOLATION: ${problem}\n`)
    process.exitCode = 1
  } else {
    process.stdout.write('census healthy\n')
  }
}
