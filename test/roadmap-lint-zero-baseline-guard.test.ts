import {spawnSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

/**
 * rm-893: roadmap-renderer no-regression guard.
 *
 * The hermes-autonomy roadmap-sync renderer has stringified arrays and objects
 * into markdown link labels (a 20-element array at ROADMAP.md:19:32 and
 * `[object Object]` at :878:72/:880:167 in the 3e3664c wall) and re-trimmed
 * whitespace into trailing-ws, producing the historical frozen-50 eslint
 * baseline. A one-time managed re-render cured the wall to ZERO errors
 * (verified at 06095e9 via the stdin probe below), but the renderer defect
 * itself is external and unproven fixed — so this guard fails whenever the
 * tree's wall lints WORSE than the wall this tree diverged from.
 *
 * The probe never modifies repository files: eslint reads the wall via stdin
 * with --stdin-filename so file-scoped markdown rules still apply.
 */

const repoRoot = process.cwd()

function eslintErrorCount(wall: string): number {
  const result = spawnSync(
    'pnpm',
    ['exec', 'eslint', '--stdin', '--stdin-filename', 'ROADMAP.md', '-f', 'json'],
    {cwd: repoRoot, input: wall, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024},
  )
  if (result.error) {
    throw result.error
  }
  // eslint exits 1 when the wall has errors — the JSON report is still on stdout.
  // Exit 2 (or a signal) means the probe itself is broken; fail loudly on that.
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(`eslint probe failed with status ${String(result.status)}: ${result.stderr}`)
  }
  const results = JSON.parse(result.stdout) as {errorCount: number}[]
  return results.reduce((sum, file) => sum + file.errorCount, 0)
}

function committedWall(revision: string): string {
  return spawnSync('git', ['show', `${revision}:ROADMAP.md`], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  }).stdout.toString()
}

/**
 * Baseline anchor: the wall at the merge-base with origin/main (the landed
 * truth this tree started from). In a detached validation clone without the
 * origin remote, fall back to HEAD — the committed wall of this very tree,
 * which still catches uncommitted render regressions.
 */
function baselineRevision(): string {
  const result = spawnSync('git', ['merge-base', 'HEAD', 'origin/main'], {cwd: repoRoot, encoding: 'utf8'})
  return result.status === 0 ? result.stdout.trim() : 'HEAD'
}

describe('roadmap lint no-regression guard (rm-893)', () => {
  it(
    'tree ROADMAP.md lints no worse than the wall this tree diverged from',
    () => {
      const baseline = eslintErrorCount(committedWall(baselineRevision()))
      const current = eslintErrorCount(readFileSync('ROADMAP.md', 'utf8'))
      expect(current, `tree wall has ${current} eslint errors vs ${baseline} at the diverged wall`).toBeLessThanOrEqual(baseline)
    },
    240_000,
  )

  it(
    'the probe catches a deliberate bad render (array label, [object Object], trailing whitespace)',
    () => {
      const badRender = [
        '# Roadmap',
        '',
        'Track census: [correctness, reliability, security] and [object Object] follow-up.  ',
        '',
        '- plain ledger line',
        '',
      ].join('\n')
      const cleanRender = ['# Roadmap', '', '- plain ledger line', ''].join('\n')
      expect(eslintErrorCount(badRender)).toBeGreaterThan(eslintErrorCount(cleanRender))
    },
    240_000,
  )
})
