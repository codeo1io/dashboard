import {mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
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
  // fallback store pnpm creates inside the repo whenever an install runs
  // under an engine-mismatched environment (`.gitignore` documents the
  // mechanism; review F5 2026-10-17 — without this the guard red-flags the
  // store's cached package strings as residue)
  '.pnpm-store',
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
  'docs/plans/',
  'web/dist/',
]

// Era-qualified survivor lines (exact trimmed content). Each entry must keep
// its dated/retired qualifier; if a line stops being historical, delete the
// entry and the mention together. A stale entry (line no longer present)
// also fails the suite, keeping this list honest in both directions.
const ALLOWED_MENTIONS: Record<string, string[]> = {
  'vitest.config.ts': [
    '// (sized 2026-09 on the then-shared self-hosted runner) while still',
    '// The upstream wiki test surface is deliberately NOT included: the fork',
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
    '# install cache below restores the warm-store economics the self-hosted era',
  ],
  '.github/workflows/fro-bot.yaml': [
    'read-only-by-default monitoring dashboard with one isolated wiki-write capability',
    'read-only-by-default monitoring dashboard with one isolated wiki-write capability',
  ],
  'AGENTS.md': [
    'the `wiki-writer/` workspace; #705 (2026.10.66) moved it into the server',
    '`src/github/fro-bot-app-client.ts`, the `@fro.bot/wiki-write-core` npm',
    'PR #498). The upstream wiki-writer tree — and its post-#705/#708',
    "their absence and the manifests' freedom from `@fro.bot/wiki-write-core`).",
  ],
  'eslint.config.ts': [
    '// wiki-writer is excluded from this fork entirely (never-absorb doctrine,',
  ],
}

// Term variants for the retired-tool prose classes (rm-164): separators
// '-', ' ', '_', or none — covers self-hosted / self hosted / self_hosted /
// selfhosted and wiki-writer / wiki_writer / wiki writer / wikiwriter.
// Extended by the cycle-10 review fix (F5) from self[- ]hosted|wiki[-_]writ.
const TERM_PATTERN = /self[- _]?hosted|wiki[- _]?writ/i

function isExcluded(relPath: string): boolean {
  const segments = relPath.split('/')
  if (segments.some(s => EXCLUDED_DIRS.has(s))) return true
  if (segments.slice(0, -1).some(s => EXCLUDED_DIR_SUFFIXES.includes(s))) return true
  if (EXCLUDED_FILES.has(relPath)) return true
  if (EXCLUDED_PREFIXES.some(p => relPath.startsWith(p))) return true
  return false
}

// rm-865 (main) + rm-880 (run a103fa90619e) — merged traversal prune: walk()
// prunes at readdir time instead of enumerating every file under
// node_modules/.slim/dist/coverage and filtering afterwards.
//
// Directory-level exclusion. A directory is pruned only when EVERY file
// beneath it is excluded by `isExcluded`: any segment in EXCLUDED_DIRS, the
// directory's own name in EXCLUDED_DIR_SUFFIXES (everything below a
// `dist`/`node_modules`/`coverage` dir is excluded as a parent suffix), or a
// prefix rule that matches the directory itself once a trailing separator is
// appended (`web/dist/` covers the `web/dist` entry).
// Result: the surviving file set is IDENTICAL to the unpruned walk — but
// excluded subtrees (`.git/`, `node_modules/`, `.slim/`, `web/dist/`) are
// never enumerated, which is what keeps this suite off the cold-suite
// 30s-timeout class (rm-879 deferral proved the timeout cost is real).
// isExcluded() still runs on every collected file (file-level and
// prefix-level exclusions are untouched), so behavior is unchanged for
// every non-excluded path — the guard just never pays to enumerate trees it
// will never read. The rm-865 parity describe below pins the equivalence.
function isExcludedDir(relDir: string): boolean {
  const segments = relDir.split('/')
  if (segments.some(s => EXCLUDED_DIRS.has(s))) return true
  if (segments.some(s => EXCLUDED_DIR_SUFFIXES.includes(s))) return true
  if (EXCLUDED_PREFIXES.some(p => `${relDir}/`.startsWith(p))) return true
  return false
}

export function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir, {withFileTypes: true})) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      // rm-880 traversal prune: skip excluded subtrees BEFORE descending —
      // per-file `isExcluded` stays the authority for surviving files.
      if (isExcludedDir(relative(repoRoot, full))) continue
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

describe('walk() readdir-time prune parity (rm-865)', () => {
  it('walk() output equals a full enumeration filtered by the dir exclusions — excluded trees are never surfaced', () => {
    // Deterministic fixture tree in a temp dir (no reliance on repo state or
    // readdir ordering): kept files at two depths plus one excluded directory
    // per exclusion class, each holding bait files that must never surface.
    const tmp = mkdtempSync(join(tmpdir(), 'rm865-parity-'))
    try {
      const bait = (rel: string) => {
        const full = join(tmp, rel)
        mkdirSync(join(full, '..'), {recursive: true})
        writeFileSync(full, 'bait\n')
      }
      bait('keep-root.txt')
      bait('nested/keep-nested.txt')
      bait('nested/deeper/keep-deep.txt')
      bait('node_modules/pkg/index.js')
      bait('nested/node_modules/pkg/index.js')
      bait('.git/HEAD')
      bait('.slim/clonedeps/repos/x/README')
      bait('nested/dist/bundle.js')
      bait('coverage/lcov.info')

      const walked = walk(tmp)
        .map(f => relative(tmp, f))
        .sort()

      // Independent oracle: naive full enumeration (the pre-rm-865 behavior)
      // filtered afterwards by the same dir-level exclusion semantics that
      // isExcluded() applies to path segments.
      const oracle: string[] = []
      const enumerate = (dir: string) => {
        for (const entry of readdirSync(dir, {withFileTypes: true})) {
          const full = join(dir, entry.name)
          if (entry.isDirectory()) enumerate(full)
          else if (entry.isFile()) oracle.push(relative(tmp, full))
        }
      }
      enumerate(tmp)
      const filtered = oracle
        .filter(rel => {
          const segments = rel.split('/')
          if (segments.some(s => [...EXCLUDED_DIRS].includes(s))) return false
          if (segments.slice(0, -1).some(s => EXCLUDED_DIR_SUFFIXES.includes(s))) return false
          return true
        })
        .sort()

      expect(walked).toEqual(filtered)
      expect(walked).toEqual(['keep-root.txt', 'nested/deeper/keep-deep.txt', 'nested/keep-nested.txt'])
      expect(walked.some(rel => rel.includes('node_modules') || rel.includes('.git/') || rel.includes('.slim') || rel.includes('dist/') || rel.includes('coverage/'))).toBe(false)
    } finally {
      rmSync(tmp, {recursive: true, force: true})
    }
  })
})
