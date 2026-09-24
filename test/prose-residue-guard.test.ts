import {readdirSync, readFileSync} from 'node:fs'
import {join, relative} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

// rm-164 (cycle-10 batch B2): prose-residue guard, filter-free by mandate.
// The term classes this guards ("self-hosted" as a CURRENT runner claim, and
// any wiki-write machinery reference) have twice survived narrow sweeps — the
// cycle-7 review found 3 stale sites because the sweep was scoped to
// `.github/ AGENTS.md`, and the original wiki-writer residue hid in the
// extension-less Dockerfile (see
// docs/solutions/consistency-greps-avoid-pathspec-miss-2026-09-20.md).
// This guard walks EVERY file from the repo root with NO extension filter
// and NO path filter, then fails on any mention that is not (a) inside a
// declared exclusion or (b) an exact era-qualified allowlisted line.
//
// History that stays must SAY it is history: an allowlisted line mentions the
// workstation-era runner only as a dated/qualified fact. New current-tense
// claims fail here at PR time instead of misdirecting the next reader.

const repoRoot = process.cwd()

// Historical records and generated/vendor state. The dated docs trees quote
// the era by design; ROADMAP.md is a living ledger whose items carry dated
// signals. The two guard suites are excluded because their machinery names
// the very terms they police.
const EXCLUDED_DIRS = new Set([
  '.git',
  'node_modules',
  '.slim',
  '.agents',
  '.conductor',
  'coverage',
  'test-results',
  'playwright-report',
])
const EXCLUDED_FILES = new Set([
  'pnpm-lock.yaml', // generated lockfile
  'ROADMAP.md', // living ledger; items carry dated historical signals
  'test/fork-exclusion-guard.test.ts', // guard machinery names its own terms
  'test/prose-residue-guard.test.ts', // this file
])
const EXCLUDED_DIR_SUFFIXES = ['node_modules', 'dist', 'coverage']
const EXCLUDED_PREFIXES = [
  'docs/solutions/',
  'docs/prioritization/',
  'docs/ideation/',
  'docs/brainstorms/',
  'web/dist/',
]

// Era-qualified survivor lines (exact trimmed content). Each entry must keep
// its dated/retired qualifier; if a line stops being historical, delete the
// entry and the mention together. A stale entry (line no longer present)
// also fails the suite, keeping this list honest in both directions.
const ALLOWED_MENTIONS: Record<string, string[]> = {
  'vitest.config.ts': [
    '// (sized 2026-09 on the then-shared self-hosted runner) while still',
  ],
  'web/vitest.config.ts': [
    '// then-shared self-hosted runner), which produced full-suite timeout',
  ],
  'test/dockerfile-context.test.ts': [
    '// `COPY wiki-writer/package.json` — a directory that does not exist in this',
    '// 2026-09 self-hosted one).',
  ],
  '.github/workflows/main.yaml': [
    "# workstation-era self-hosted runner: Main run 35413084207, 'Unable to locate",
  ],
  '.github/workflows/release.yaml': [
    '# observed 2026-09 on the workstation-era self-hosted runner), so parse the',
  ],
  '.github/workflows/base-drift.yaml': [
    '# — this file was authored under the retired self-hosted-only policy.',
  ],
  '.github/dependabot.yml': [
    '# .github/workflows/renovate.yaml under the self-hosted-runners-only CI',
    "#   the fork's single self-hosted runner — became historical when PR #11/#12",
  ],
  '.github/actions/setup/action.yaml': [
    '# off the single self-hosted runner by PR #11/#12), so nothing persists on',
    '# self-hosted era got for free. It keys on the pnpm-lockfile hash + node',
  ],
}

const TERM_PATTERN = /self[- ]hosted|wiki[-_]writ/i

function isExcluded(relPath: string): boolean {
  const segments = relPath.split('/')
  if (segments.some(s => EXCLUDED_DIRS.has(s))) return true
  if (segments.slice(0, -1).some(s => EXCLUDED_DIR_SUFFIXES.includes(s))) return true
  if (EXCLUDED_FILES.has(relPath)) return true
  if (EXCLUDED_PREFIXES.some(p => relPath.startsWith(p))) return true
  return false
}

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir, {withFileTypes: true})) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full, files)
    } else if (entry.isFile()) {
      files.push(full)
    }
  }
  return files
}

function isTextFile(path: string): boolean {
  const buf = readFileSync(path)
  const probe = buf.subarray(0, 1024)
  return !probe.includes(0)
}

describe('prose-residue guard (rm-164)', () => {
  it('no unqualified self-hosted/wiki-write residue anywhere in the tree', () => {
    const offenders: string[] = []
    for (const file of walk(repoRoot)) {
      const rel = relative(repoRoot, file)
      if (isExcluded(rel)) continue
      if (!isTextFile(file)) continue
      const text = readFileSync(file, 'utf8')
      for (const [i, line] of text.split('\n').entries()) {
        if (!TERM_PATTERN.test(line)) continue
        const allowed = ALLOWED_MENTIONS[rel] ?? []
        if (!allowed.includes(line.trim())) {
          offenders.push(`${rel}:${i + 1}: ${line.trim()}`)
        }
      }
    }
    expect(
      offenders,
      'New prose residue: either era-qualify the mention (and allowlist the ' +
      'exact line) or remove it. See the guard header for the convention.',
    ).toEqual([])
  })

  it('allowlist stays honest: every allowlisted line still exists verbatim', () => {
    const stale: string[] = []
    for (const [rel, lines] of Object.entries(ALLOWED_MENTIONS)) {
      const text = readFileSync(join(repoRoot, rel), 'utf8')
      const present = new Set(text.split('\n').map(l => l.trim()))
      for (const line of lines) {
        if (!present.has(line)) stale.push(`${rel}: ${line}`)
      }
    }
    expect(stale, 'Stale allowlist entries — remove them with their mentions.').toEqual([])
  })
})
