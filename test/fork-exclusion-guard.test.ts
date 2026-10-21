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

  it('AGENTS.md read-only invariant documents the exclusion but never relaxes it (re-derived rm-2310 after upstream #705 relocated the write surface)', () => {
    const text = read('AGENTS.md')
    // The policy statement must stay absolute.
    expect(text).toMatch(/Never add a write code path/)
    // And the doc must keep declaring the upstream write surface EXCLUDED,
    // not absorbed — wherever upstream relocates it. rm-2310 re-derived this
    // from the wiki-writer/-era form (/wiki-writer.{0,200}EXCLUDED/s) after
    // upstream #705 deleted wiki-writer/ and moved the capability into the
    // main server; the disposition must name that relocated surface.
    expect(text).toMatch(/wiki[- _]?writ.{0,400}EXCLUDED/s)
    expect(text).toMatch(/src\/wiki\//)
    expect(text).toMatch(/src\/routes\/wiki\.ts/)
    expect(text).toMatch(/wiki-write-core/)
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

// rm-2310 (2026-10-22, cycle:3 run 56ce64e9): upstream release 2026.10.66
// (merge #705) DELETED wiki-writer/ and relocated the wiki-write capability
// into the main server — a src/wiki/ tree, src/routes/wiki.ts routes, an
// app-client write client under src/github/, and an @fro.bot/wiki-write-core
// dependency (run research; the absorb window is rm-252). The wiki-writer/-era
// assertions above stay — upstream tags across the rm-252 window still carry
// that shape, and a merge can land anywhere in the window — but they are no
// longer the whole guard: a straight merge from the current upstream tip
// passes them while tracking the relocated write surface. Proven red-first
// at implementation: a staged src/wiki path, a staged @fro.bot/wiki-write-core
// manifest entry, a wiki-write lockfile line, and a wiki-write reference
// inside src/github each turned this suite red before the clean tree came
// back green.

const WIKI_WRITE_TERM = /wiki[- _]?writ/i

function trackedFiles(): string[] {
  return execSync('git ls-files', {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  })
    .split('\n')
    .filter(Boolean)
}

describe('relocated write-surface exclusion (rm-2310)', () => {
  it('no wiki-named path is tracked anywhere in the repo', () => {
    const wikiPaths = trackedFiles().filter(path =>
      path.split('/').some(segment => /^wiki/i.test(segment)),
    )
    expect(
      wikiPaths,
      'wiki-named tracked paths — a write-capability surface re-entered the tree',
    ).toEqual([])
  })

  it('src/github (app-client surface) carries no wiki-write machinery references', () => {
    const offenders = trackedFiles()
      .filter(path => path.startsWith('src/github/'))
      .flatMap(path =>
        read(path)
          .split('\n')
          .map((line, i) => (WIKI_WRITE_TERM.test(line) ? `${path}:${i + 1}` : ''))
          .filter(Boolean),
      )
    expect(offenders, 'wiki-write references inside src/github').toEqual([])
  })

  it('no wiki-write package rides the manifest or the lockfile', () => {
    for (const file of ['package.json', 'bun.lock']) {
      expect(read(file), `${file} references a wiki-write package`).not.toMatch(WIKI_WRITE_TERM)
    }
  })
})
