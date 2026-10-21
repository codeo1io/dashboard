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
// AGENTS.md's read-only invariant block is the sanctioned exception: it
// documents the exclusion policy itself (guarded by its own dedicated test).
const EXCLUSION_FILES = [
  'Dockerfile',
  'README.md',
  '.github/copilot-instructions.md',
  'vitest.config.ts',
  'bunfig.toml',
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

  it('AGENTS.md read-only invariant documents the exclusion but never relaxes it (2026.10.48 wording, re-derived 2026.10.68 for rm-259)', () => {
    const text = read('AGENTS.md')
    // The policy statement must stay absolute.
    expect(text).toMatch(/Never add a write code path/)
    // And the doc must keep declaring the upstream surface EXCLUDED, not absorbed.
    expect(text).toMatch(/wiki-writer.{0,200}EXCLUDED/s)
    // rm-2311 re-derivation: upstream #705 moved the write core into the
    // server (src/wiki, @fro.bot/wiki-write-core) and #708 mirrored it into
    // the web client. The invariant text must name BOTH trees — a doc that
    // still describes only the retired wiki-writer/ workspace under-describes
    // the surface the next absorb must exclude.
    expect(text).toMatch(/src\/wiki\//)
    expect(text).toMatch(/web\/src\/wiki\//)
    expect(text).toMatch(/wiki-write-core/)
  })

  it('the upstream wiki-write surface stays absent post-#705/#708: no server tree, no client surface, no workspace (rm-259 re-derivation)', () => {
    // wiki-writer/ is the pre-#705 workspace (historical guard, kept);
    // src/wiki/** + the #708 web client surface are where the write
    // capability lives NOW. None of them may exist in this fork's tree.
    const absent = [
      'wiki-writer',
      'src/wiki',
      'src/routes/wiki.ts',
      'web/src/wiki',
      'web/src/api/wiki.ts',
      'web/src/views/WikiEditSession.tsx',
      'web/src/views/WikiEditor.tsx',
      'web/src/views/WikiList.tsx',
    ]
    for (const path of absent) {
      expect(existsSync(resolve(repoRoot, path)), `${path} must not exist in this fork`).toBe(false)
    }
  })

  it('no write-capability package rides the manifests (@fro.bot/wiki-write-core absent from package.json and lockfile, rm-259)', () => {
    for (const manifest of ['package.json', 'web/package.json', 'bun.lock']) {
      const path = resolve(repoRoot, manifest)
      if (!existsSync(path)) continue
      expect(read(manifest), `${manifest} must not depend on @fro.bot/wiki-write-core`).not.toContain(
        '@fro.bot/wiki-write-core',
      )
    }
  })

  it('renovate workflow stays removed (retired self-hosted-era policy, PR #1)', () => {
    expect(existsSync(resolve(repoRoot, '.github/workflows/renovate.yaml'))).toBe(false)
  })

  it('.github/renovate.json5 stays absent (rm-136 keep-deleted fork policy; rm-213 guard — the re-injection this catches empirically recurred 2026-09-24..25, cured at 0616de2)', () => {
    expect(existsSync(resolve(repoRoot, '.github/renovate.json5'))).toBe(false)
  })

  it('Dockerfile pins Bun 1.4.3 (toolchain stage) and never reinstates pnpm (2026.10.48 adoption)', () => {
    const dockerfile = read('Dockerfile')
    expect(dockerfile).toMatch(/oven\/bun:1\.4\.3@sha256:/)
    // pnpm must never come back as an install tool. (The runtime-stage prune
    // may still DELETE pnpm/corepack paths inherited from the Node base image.)
    expect(dockerfile).not.toMatch(/pnpm@/)
    expect(dockerfile).not.toMatch(/corepack (enable|prepare)/)
  })

  it('package.json packageManager pins bun@1.4.3 (upstream #648 migration)', () => {
    const pkg = JSON.parse(read('package.json')) as {packageManager?: string}
    expect(pkg.packageManager).toBe('bun@1.4.3')
  })

  it('.gitignore keeps the run-state entries guarded against upstream merges (rm-159 residue)', () => {
    const text = read('.gitignore')
    expect(text).toMatch(/^\.pnpm-store\/$/m)
    expect(text).toMatch(/^\.conductor\/$/m)
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
