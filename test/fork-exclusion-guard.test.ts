import {execSync} from 'node:child_process'
import {existsSync, readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

// rm-131 (cycle-5 batch B4): the 2026-09-20 upstream merge 57c9c6b silently
// erased every exclusion this fork maintains against upstream — Dockerfile COPY
// of the absent wiki-writer workspace, a wiki-writer vitest include, relaxed
// wiki-write wording in all binding docs, an org flip of the metadata data
// branch, a pnpm pin regression, and tracked engine-internal .conductor state
// (see docs/prioritization/2026-09-21-cycle-5-batch.md). Upstream still carries
// all of it, so every future absorb re-risks the same class. This guard makes
// the residue a red test at PR time instead of a red Release after push.
//
// Deliberately NO file-extension filters anywhere in this suite: the original
// residue (COPY wiki-writer/... in the extension-less Dockerfile) was invisible
// to every extension-filtered sweep.

const repoRoot = process.cwd()

// Files whose fork wording must never carry wiki-write machinery references.
// Historical docs under docs/solutions/ may legitimately mention the term when
// describing past exclusion work; they are out of scope here by design.
const EXCLUSION_FILES = [
  'Dockerfile',
  'README.md',
  'AGENTS.md',
  '.github/copilot-instructions.md',
  'vitest.config.ts',
  'pnpm-workspace.yaml',
] as const

// Binding docs must describe THIS fork's metadata source. Upstream's docs say
// fro-bot/.github; the fork reads codeo1io/.github and an org flip is a false
// security claim, not a wording preference.
const BINDING_DOCS = ['README.md', 'AGENTS.md', '.github/copilot-instructions.md'] as const

function read(path: string): string {
  return readFileSync(resolve(repoRoot, path), 'utf8')
}

describe('fork exclusion invariants (rm-131)', () => {
  it.each([...EXCLUSION_FILES])('%s carries no wiki-write machinery references', file => {
    expect(read(file)).not.toMatch(/wiki[-_]writ/i)
  })

  it('the wiki-writer workspace does not exist in the tree', () => {
    expect(existsSync(resolve(repoRoot, 'wiki-writer'))).toBe(false)
  })

  it('renovate workflow stays removed (retired self-hosted-era policy, PR #1)', () => {
    expect(existsSync(resolve(repoRoot, '.github/workflows/renovate.yaml'))).toBe(false)
  })

  it('Dockerfile pins pnpm 11.27.1 in both stages', () => {
    expect(read('Dockerfile').match(/pnpm@11\.27\.1/g)?.length).toBe(2)
  })

  it('package.json packageManager pins pnpm 11.27.1', () => {
    const pkg = JSON.parse(read('package.json')) as {packageManager?: string}
    expect(pkg.packageManager).toBe('pnpm@11.27.1')
  })

  it.each([...BINDING_DOCS])('%s names the codeo1io metadata source, not upstream org', file => {
    const text = read(file)
    expect(text).toMatch(/codeo1io\/\.github/)
    expect(text).not.toMatch(/fro-bot\/\.github/)
  })

  it('the fork clonedeps manifest survives upstream merges (rm-120)', () => {
    expect(existsSync(resolve(repoRoot, '.slim/clonedeps.json'))).toBe(true)
  })

  // rm-131 scope: this assertion targets DURABLE branches (main, real PRs).
  // Conductor's ephemeral validation snapshots (conductor/ci-*) are built
  // from a HEAD that may still track engine breadcrumbs; the builder
  // excludes .conductor from its delta, so the staged untrack cannot ride
  // the snapshot and the assertion would fire on engine machinery, not on
  // a repo decision. Skipping exactly those refs keeps the guard strict
  // where it must never regress.
  const ciRef = process.env.GITHUB_HEAD_REF ?? process.env.GITHUB_REF_NAME ?? ''

  it.skipIf(ciRef.startsWith('conductor/ci-'))(
    'no .conductor/ engine state is tracked in git',
    () => {
      const tracked = execSync('git ls-files .conductor', {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim()
      expect(tracked).toBe('')
    },
  )
})
