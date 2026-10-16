// rm-858 landing-gate guard (run 8aabd64de4e, repository-maintenance cycle 2):
// three consecutive landing merges silently dropped fork-authored deliverables
// (modify-vs-delete resolved as delete — scripts/roadmap-census.ts,
// test/roadmap-integrity-guard.test.ts, .github/workflows/cve-tripwire.yaml,
// .github/workflows/lockfile-guard.yaml, docs/runbooks/release.md; 0 hits
// across all 350 first-parent commits of origin/main) while the landed batch
// reports kept citing them as live deliverables. `git log --diff-filter=D` is
// BLIND to merge deletions — the proof was ls-tree of merge^1 / merge^2 /
// result. This guard asserts, on every test run:
//
//   1. CLAIM PRESENCE — every backticked repository path claimed by a
//      post-epoch prioritization report under docs/prioritization/ exists in
//      the tree, unless the report carries a truth annotation recording that
//      the deliverable never reached main, or the path has a recorded
//      successor.
//   2. MERGE PROBE — when HEAD is a merge, no path the landed branch ADDED or
//      MODIFIED is absent from the tree: the exact modify-vs-delete loss
//      class. (Files the branch left untouched that the main side deleted are
//      legitimate merge resolutions — those are policed by claim presence.)
//
// Actions-dark-safe: pure local git + fs, no network, no CI dependency.

import {spawnSync} from 'node:child_process'
import {existsSync, readdirSync, readFileSync} from 'node:fs'
import {join, resolve} from 'node:path'
import {describe, expect, it} from 'vitest'

const repoRoot = resolve(import.meta.dirname, '..')

// Deliverable surface this guard protects. Archival batch reports under
// docs/prioritization/ are exempt (they cross-reference each other; their
// historical loss is tracked with the tooling family at rm-857).
const DELIVERABLE_RE = /^(?:src|test|scripts|web\/src|public|\.github|docs)\/[\w./-]+$/
const CLAIM_RE = /`((?:src|test|scripts|web\/src|public|\.github|docs)\/[\w./-]+)`/g
const UNTRACKED_BY_DESIGN = /^(?:web\/dist|dist|node_modules|\.conductor)(?:\/|$)/

// Reports dated before the guard landed are archival: their claims were
// audited once (2026-10-15, run 8aabd64de4e) and the known-absent families
// were either re-landed in the same batch (rm-857) or truth-annotated.
// Retro-policing the whole archive is out of the guard's scope.
const GUARD_EPOCH = '2026-10-15'

// Paths that are deliberately absent because a successor landed instead.
const RECORDED_SUCCESSORS = new Set(['.github/workflows/base-drift.yaml'])

// Truth-annotated reports may cite never-landed deliverables. The canonical
// annotation (rm-857) opens with a bolded '**Truth annotation' line — match
// THAT, not the 'never reached main' phrase, which line-wraps inside the
// blockquote and would silently fail text.includes().
const TRUTH_MARKER = '**Truth annotation'

function git(args: string[]): {ok: boolean; out: string} {
  const r = spawnSync('git', args, {cwd: repoRoot, encoding: 'utf8'})
  return {ok: r.status === 0, out: (r.stdout ?? '') + (r.stderr ?? '')}
}

function listReports(): string[] {
  return readdirSync(join(repoRoot, 'docs/prioritization'))
    .filter(f => f.endsWith('.md'))
    .map(f => join(repoRoot, 'docs/prioritization', f))
}

function isArchival(reportPath: string): boolean {
  const m = /\d{4}-\d{2}-\d{2}-/.exec(reportPath)
  const date = /\d{4}-\d{2}-\d{2}/.exec(m?.[0] ?? '')
  return date !== null && date[0] < GUARD_EPOCH
}

function extractClaims(text: string): {path: string; line: number}[] {
  // Line-numbered so a failure names the offending doc line + path pair
  // (rm-858 acceptance: a silent drop must be triageable without forensics).
  const claims: {path: string; line: number}[] = []
  text.split('\n').forEach((row, i) => {
    for (const m of row.matchAll(CLAIM_RE)) {
      const v = m[1]
      if (v !== undefined) claims.push({path: v, line: i + 1})
    }
  })
  return claims
}

function deliverable(path: string): boolean {
  return DELIVERABLE_RE.test(path) && !path.startsWith('docs/prioritization/')
}

describe('rm-858 landing-gate guard — claim extraction', () => {
  it('extracts line-numbered deliverable paths and skips archival/untracked ones', () => {
    const sample =
      're-lands `scripts/roadmap-census.ts`, cites `docs/prioritization/2026-10-05-x.md` (archival), builds `web/dist` (untracked), lives in `src/server.ts`'
    const claims = extractClaims(sample).filter(c => deliverable(c.path))
    const paths = claims.map(c => c.path)
    expect(paths).toContain('scripts/roadmap-census.ts')
    expect(paths).toContain('src/server.ts')
    expect(paths.some(p => p.startsWith('docs/prioritization/'))).toBe(false)
    expect(paths.some(p => p.startsWith('web/dist'))).toBe(false)
    expect(claims[0]?.line).toBe(1)
  })
})

describe('rm-858 landing-gate guard — claim presence', () => {
  it('every deliverable claimed by a post-epoch report exists, or is truth-annotated / superseded', () => {
    const violations: string[] = []
    for (const report of listReports()) {
      if (isArchival(report)) continue
      const text = readFileSync(report, 'utf8')
      const annotated = text.includes(TRUTH_MARKER)
      for (const claim of extractClaims(text)) {
        if (!deliverable(claim.path) || UNTRACKED_BY_DESIGN.test(claim.path)) continue
        if (existsSync(join(repoRoot, claim.path))) continue
        if (RECORDED_SUCCESSORS.has(claim.path)) continue
        if (annotated) continue
        violations.push(`${claim.path} (line ${claim.line}) — claimed by ${report.split('/').pop()}`)
      }
    }
    expect(violations, `missing claimed deliverables:\n  ${violations.join('\n  ')}`).toEqual([])
  })
})

describe('rm-858 landing-gate guard — merge probe (modify-vs-delete)', () => {
  it('no branch-authored change is absent from the tree', () => {
    const head = git(['rev-parse', '--verify', 'HEAD'])
    if (!head.ok) return // no repo (defensive)
    const parents = git(['log', '-1', '--format=%P', 'HEAD'])
    const count = parents.out.trim().split(/\s+/).filter(Boolean).length
    if (count < 2) {
      return // not a merge commit — probe is a no-op on linear history
    }
    const base = git(['merge-base', 'HEAD^1', 'HEAD^2'])
    if (!base.ok) {
      // shallow clone or pruned history: the presence check above still runs
      return
    }
    // Files ADDED, COPIED, MODIFIED or RENAMED by the landed branch: a landing
    // that resolves these as delete silently drops the branch's work.
    // (--diff-filter deliberately EXCLUDES deletions: a file the branch itself
    // deleted is absent from the branch tip, so its absence from the merge
    // result is a legitimate resolution, not a modify-vs-delete loss — the
    // acceptance's own probe counts only paths present in the branch tip.)
    const changed = git(['diff', '--name-only', '--diff-filter=ACMR', base.out.trim(), 'HEAD^2'])
    if (!changed.ok) return
    const dropped = changed.out
      .split('\n')
      .filter(Boolean)
      .filter(
        p =>
          deliverable(p) &&
          !UNTRACKED_BY_DESIGN.test(p) &&
          !existsSync(join(repoRoot, p)) &&
          !RECORDED_SUCCESSORS.has(p),
      )
    expect(
      dropped,
      `modify-vs-delete losses (changed on the landed branch, absent from tree):\n  ${dropped.join('\n  ')}`,
    ).toEqual([])
  })
})
