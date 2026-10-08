import {readdirSync, readFileSync} from 'node:fs'
import {join, relative} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

// rm-696 (repository-maintenance cycle 2, run bdc96578): no-math-fence guard.
//
// The katex override in pnpm-workspace.yaml is an OUT-OF-RANGE force
// (micromark-extension-math declares ^0.16.0; the fork forces the
// GHSA-238p-pmpm-9mq7-patched 0.18 line past it). The gateway explicitly
// declined the same force (fro-bot/agent v0.118.1, PR #1724: "KaTeX remains
// at its supported version because the advisory fix is outside the range
// accepted by its consumer"), so the fork's force is load-bearing ONLY
// while nothing in this repo ever evaluates a math AST. This suite pins
// that inertness from three sides, so the first math fence (or the first
// katex import) fails loudly at PR time instead of silently activating a
// render path the override was never exercised against:
//
//   1. tracked markdown contains no math fences ($$ flow) and no inline
//      math text ($x$), scanning OUTSIDE fenced-code/inline-code spans —
//      a fence inside a ``` example is documentation, not math;
//   2. no katex / micromark-extension-math mention exists on any source
//      surface (src/, web/, scripts/, tests, configs, workflows) — the
//      only sanctioned mentions are the recorded decision itself in
//      pnpm-workspace.yaml and dated ledger/docs records;
//   3. the katex floor line stays present in the overrides block (the
//      value itself is owned by the floor's mint, per the
//      override-floors-guard presence-only convention).
//
// Allowlist hook follows the prose-residue-guard convention: an exact
// era-qualified line can be allowlisted below instead of weakening the
// scan, and stale allowlist entries fail so the list stays honest.

const repoRoot = process.cwd()

// Vendor/generated state, dated record trees, the living ledger, the
// recorded decision itself, and this suite's own machinery.
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
const EXCLUDED_DIR_SUFFIXES = ['node_modules', 'dist', 'coverage']
const MENTION_EXCLUDED_FILES = new Set([
  'pnpm-lock.yaml', // generated lockfile (carries the forced resolution)
  'pnpm-workspace.yaml', // the recorded decision, pinned by its own test below
  'ROADMAP.md', // living ledger; items carry dated historical signals
  'test/no-math-fence-guard.test.ts', // guard machinery names its own terms
])
const EXCLUDED_PREFIXES = [
  'docs/solutions/',
  'docs/prioritization/',
  'docs/archive/',
  'docs/ideation/',
  'docs/brainstorms/',
  'web/dist/',
]

// Era-qualified survivor lines (exact trimmed content), prose-residue
// convention. Empty today: keep it that way unless a dated record truly
// must mention the term outside the excluded trees.
const ALLOWED_MENTIONS: Record<string, string[]> = {}

const TERM_PATTERN = /katex|micromark-extension-math/i
const MATH_FLOW_FENCE = /^[ \t]{0,3}\$\$/
const MATH_TEXT = /\$[^\s$`][^$`\n]*[^\s$`]\$/

/** Blank out fenced code blocks, then inline code spans — docs, not math. */
function stripCodeSpans(text: string): string {
  const lines = text.split('\n')
  const kept: string[] = []
  let fenceMark = ''
  for (const line of lines) {
    const open = /^[ \t]*(`{3,}|~{3,})/.exec(line)
    if (fenceMark !== '') {
      if (open && (open[1] ?? '').startsWith(fenceMark)) fenceMark = ''
      kept.push('')
      continue
    }
    if (open) {
      fenceMark = (open[1] ?? '').slice(0, 3)
      kept.push('')
      continue
    }
    kept.push(line)
  }
  return kept.join('\n').replaceAll(/`[^`\n]*`/g, '``')
}

function isMentionExcluded(relPath: string): boolean {
  const segments = relPath.split('/')
  if (segments.some(s => EXCLUDED_DIRS.has(s))) return true
  if (segments.slice(0, -1).some(s => EXCLUDED_DIR_SUFFIXES.includes(s))) return true
  if (MENTION_EXCLUDED_FILES.has(relPath)) return true
  return EXCLUDED_PREFIXES.some(p => relPath.startsWith(p))
}

function isMarkdown(relPath: string): boolean {
  if (isMentionExcluded(relPath)) return false
  return relPath.endsWith('.md')
}

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir, {withFileTypes: true})) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full, files)
    else if (entry.isFile()) files.push(full)
  }
  return files
}

function isTextFile(path: string): boolean {
  const probe = readFileSync(path).subarray(0, 1024)
  return !probe.includes(0)
}

describe('no-math-fence guard (rm-696)', () => {
  it('tracked markdown contains no math fences and no inline math text', () => {
    const offenders: string[] = []
    for (const file of walk(repoRoot)) {
      const rel = relative(repoRoot, file)
      if (!isMarkdown(rel)) continue
      const lines = stripCodeSpans(readFileSync(file, 'utf8')).split('\n')
      for (const [i, line] of lines.entries()) {
        if (MATH_FLOW_FENCE.test(line)) offenders.push(`${rel}:${i + 1}: flow ${line.trim().slice(0, 50)}`)
        else if (MATH_TEXT.test(line)) offenders.push(`${rel}:${i + 1}: text ${line.trim().slice(0, 50)}`)
      }
    }
    expect(
      offenders,
      'Math content found: the katex force is only inert while nothing ' +
      'evaluates math. Either drop the math, or re-decide the override ' +
      '(see the DIVERGENCE RECORD in pnpm-workspace.yaml and rm-696).',
    ).toEqual([])
  })

  it('no katex / micromark-extension-math mention on any source surface', () => {
    const offenders: string[] = []
    for (const file of walk(repoRoot)) {
      const rel = relative(repoRoot, file)
      if (isMentionExcluded(rel)) continue
      if (!isTextFile(file)) continue
      const text = readFileSync(file, 'utf8')
      for (const [i, line] of text.split('\n').entries()) {
        if (!TERM_PATTERN.test(line)) continue
        const allowed = ALLOWED_MENTIONS[rel] ?? []
        if (!allowed.includes(line.trim())) offenders.push(`${rel}:${i + 1}: ${line.trim().slice(0, 60)}`)
      }
    }
    expect(
      offenders,
      'katex/micromark-extension-math mentioned on a source surface: the ' +
      'sanctioned mentions are the pnpm-workspace.yaml decision record and ' +
      'dated docs. Era-qualify + allowlist, or remove the mention.',
    ).toEqual([])
  })

  it('the katex floor line stays present in the overrides block', () => {
    // Presence-only, per the override-floors-guard convention: the floor's
    // VALUE is owned by the item that minted it; this suite only fails if
    // the selector disappears entirely.
    const workspace = readFileSync(join(repoRoot, 'pnpm-workspace.yaml'), 'utf8')
    expect(/^ {2}katex: '>=\d/m.test(workspace), 'katex floor missing from the overrides block').toBe(true)
  })

  it('allowlist stays honest: every allowlisted line still exists verbatim', () => {
    const stale: string[] = []
    for (const [rel, lines] of Object.entries(ALLOWED_MENTIONS)) {
      const present = new Set(readFileSync(join(repoRoot, rel), 'utf8').split('\n').map(l => l.trim()))
      for (const line of lines) if (!present.has(line)) stale.push(`${rel}: ${line}`)
    }
    expect(stale, 'Stale allowlist entries — remove them with their mentions.').toEqual([])
  })

  it('detector red-proof: fixture fences and inline math are flagged, code spans are not', () => {
    const fixture = [
      '# Title',
      '',
      'Proof that',
      '$$',
      'E = mc^2',
      '$$',
      '',
      'and inline $a+b$ math,',
      '',
      '```md',
      '$$ not math: inside a code fence $$',
      '```',
      '',
      'and `$inline$ code span` is not math either.',
      '',
      'Set FOO to $' + '{BAR} in templates.',
    ].join('\n')
    const lines = stripCodeSpans(fixture).split('\n')
    const flow = lines.filter(l => MATH_FLOW_FENCE.test(l)).length
    const text = lines.filter(l => MATH_TEXT.test(l)).length
    expect(flow, 'two flow-fence opens detected (the closer is also an open)').toBe(2)
    expect(text, 'exactly the one inline math pair — code spans and ${} untouched').toBe(1)
    expect(TERM_PATTERN.test("import katex from 'katex'")).toBe(true)
    expect(TERM_PATTERN.test('micromark-extension-math@3.1.0')).toBe(true)
  })
})
