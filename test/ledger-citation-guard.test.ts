/**
 * rm-1480 — ledger-citation guard. Fails when a tracked file cites an rm-NNNN
 * id that has no definition row in ROADMAP.md (and no Closed-items trace),
 * unless the id carries a documented allowance below.
 *
 * Scope choices (mirrors the 2026-10-16 dangling-citation censuses):
 * - ROADMAP.md itself is the definition surface, not a citer.
 * - docs/prioritization/** and docs/brainstorms/** are dated cycle archives —
 *   their ids are historical records, not load-bearing citations.
 * - This file is excluded from its own scan: its fixture strings intentionally
 *   contain dangling shapes (including a retired phantom) that the extractor
 *   tests must see as raw text, not as citations.
 *
 * Extractor traps the regex must not fall into (each proven live on
 * 2026-10-16):
 * - regex examples like `rm-19[0-9]` in docs/solutions — the token is a
 *   pattern, not an id (rejected via the `[` lookahead);
 * - date-stamped paths like `claim-exact-slash-form-2026-10-09.md` where a
 *   loose `rm-` + digit-run match produced phantom ids (rejected via the `-`
 *   lookahead);
 * - 5-digit phantoms like the retired `rm-13640` ARE matched and DO fail —
 *   that is the guard working, not a false positive.
 */
import {execFileSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {expect, test} from 'vitest'

const GUARD_FILE = 'test/ledger-citation-guard.test.ts'

/**
 * Ids that may be cited without a def row, each with its reason and removal
 * condition. Keep this list short; every entry is auditable debt.
 */
const ALLOWED: Readonly<Record<string, string>> = {
  'rm-1411':
    'sibling-selected watch-repair def row (run 34bc2026 cycle 5) lands with its band — remove this entry once that ROADMAP row exists',
  'rm-714':
    'decision owner lives outside this ledger by documented provenance (unlanded sibling spool, recorded in the rm-252 evidence) — permanent',
  'rm-548': 'archived 2026-09 solution-doc id predating the ledger renumber — de-cite or backfill when that doc is next revised',
  'rm-568': 'archived 2026-09 solution-doc id predating the ledger renumber — de-cite or backfill when that doc is next revised',
  'rm-608': 'archived 2026-09 solution-doc id predating the ledger renumber — de-cite or backfill when that doc is next revised',
}

const TOKEN = /\brm-(\d{2,5})\b(?![[-])/g

function repoRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '..')
}

/** All ids with a definition row (`- id: ...`) anywhere in ROADMAP.md. */
export function defIds(roadmap: string): Set<string> {
  const ids = new Set<string>()
  for (const match of roadmap.matchAll(/^- id: .?rm-(\d{2,5})\b/gm)) {
    ids.add(`rm-${match[1]}`)
  }
  return ids
}

/** Ids named inside the Closed-items appendix — retired but traceable. */
export function closedIds(roadmap: string): Set<string> {
  const ids = new Set<string>()
  const section = /^## Closed items\b.*$/m.exec(roadmap)
  if (section?.index === undefined) return ids
  for (const match of roadmap.slice(section.index).matchAll(/\brm-(\d{2,5})\b(?![[-])/g)) {
    ids.add(`rm-${match[1]}`)
  }
  return ids
}

/** (file, line, id) triples for every citation-shaped token in one text. */
export function citations(text: string): {line: number; id: string}[] {
  const found: {line: number; id: string}[] = []
  const lines = text.split('\n')
  for (const [index, line] of lines.entries()) {
    for (const match of line.matchAll(TOKEN)) {
      found.push({line: index + 1, id: `rm-${match[1]}`})
    }
  }
  return found
}

function scanablePaths(root: string): string[] {
  const tracked = execFileSync('git', ['ls-files'], {cwd: root, encoding: 'utf8'})
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
  return tracked.filter(path => {
    if (path === 'ROADMAP.md' || path === GUARD_FILE) return false
    if (path.startsWith('docs/prioritization/')) return false
    if (path.startsWith('docs/brainstorms/')) return false
    return true
  })
}

function violations(root: string): {file: string; line: number; id: string}[] {
  const roadmap = readFileSync(join(root, 'ROADMAP.md'), 'utf8')
  const known = new Set([...defIds(roadmap), ...closedIds(roadmap)])
  const bad: {file: string; line: number; id: string}[] = []
  for (const path of scanablePaths(root)) {
    const text = readFileSync(join(root, path), 'utf8')
    for (const {line, id} of citations(text)) {
      if (known.has(id)) continue
      if (id in ALLOWED) continue
      bad.push({file: path, line, id})
    }
  }
  return bad
}

test('every cited rm-id resolves to a def row, a Closed-items trace, or a documented allowance', () => {
  const bad = violations(repoRoot())
  expect(
    bad.map(({file, line, id}) => `${file}:${line}: ${id}`),
    'dangling ledger citations found (add a def row, or de-cite, or extend ALLOWED with a reason + removal condition)',
  ).toEqual([])
})

test('extractor: catches a bare dangling id and the retired phantom shape', () => {
  expect(citations('see rm-13640 rider and rm-9999 for context')).toEqual([
    {line: 1, id: 'rm-13640'},
    {line: 1, id: 'rm-9999'},
  ])
})

test('extractor: ignores regex examples and date-stamped paths', () => {
  expect(citations("grep -n 'id: `rm-19[0-9]`' ROADMAP.md")).toEqual([])
  expect(citations('as recorded in rm-2026-10-09 notes')).toEqual([])
  // The rm-19[0-9] shape is a regex example, not a citation, and the
  // date-stamped shape is a filename fragment — both must stay invisible to
  // the guard; the ALLOWED/known sets must never grow to accommodate them.
})
