import {existsSync, readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

// rm-132 (cycle-5 batch B5): Main never builds the Docker image and Release is
// main-push-only, so a Dockerfile referencing a missing build-context path
// merges green and breaks Release on push (2026-09-20: PR #7 merged with every
// Main gate green, then Release failed at builder step 5/8 on
// `COPY wiki-writer/package.json` — a directory that does not exist in this
// fork). This gate parses COPY/ADD sources at PR time instead: seconds of Node,
// no docker build, friendly to a single serialized CI runner (originally the
// 2026-09 self-hosted one).

const repoRoot = process.cwd()

interface CopySource {
  instruction: string
  line: number
  source: string
}

function collectContextSources(dockerfileText: string): CopySource[] {
  const sources: CopySource[] = []
  const lines = dockerfileText.split('\n')
  for (const [i, line] of lines.entries()) {
    const raw = line.trim()
    if (raw.startsWith('#') || raw === '') continue
    const match = /^(COPY|ADD)\b(.*)$/.exec(raw)
    if (!match) continue
    const instruction = match[1] ?? ''
    const rest = match[2] ?? ''
    // Strip flags. `--from=` sources come from a previous stage, not the build
    // context, so they are out of scope for tree validation.
    const fromStage = /--from[= ]/.test(rest)
    const args = rest
      .split(/\s+/)
      .filter(token => token !== '')
      .filter(token => !token.startsWith('--'))
    if (fromStage || args.length < 2) continue
    // Last argument is the destination; everything before it is a source.
    for (const source of args.slice(0, -1)) {
      sources.push({instruction, line: i + 1, source})
    }
  }
  return sources
}

// rm-186 (cycle-13 batch B1): the context seal. docker transfers the whole
// repo root when no .dockerignore exists, so every Release build shipped .git,
// node_modules, and any locally-present .env/.pem/.key to the daemon — invisible
// to CI because the Dockerfile's selective COPYs keep the IMAGE clean. The gate
// below pins the seal's presence and its minimal security entry set, and
// cross-checks that no Dockerfile context source is excluded (the
// `COPY web/` + build-in-image + `--from=builder` shape must stay copyable).
// NOTE: the matcher implements the subset of pattern shapes this file uses
// (literal paths, `*` wildcards, `!` negations) — it is a regression guard, not
// a dockerignore spec implementation.

function parseDockerignore(text: string): {ignores: string[]; negations: string[]} {
  const ignores: string[] = []
  const negations: string[] = []
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (line === '' || line.startsWith('#')) continue
    if (line.startsWith('!')) {
      negations.push(line.slice(1))
    } else {
      ignores.push(line)
    }
  }
  return {ignores, negations}
}

function patternToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .replaceAll(/[.+^${}()|[\]?\\]/g, String.raw`\$&`)
    .replaceAll('*', '[^/]*')
  return new RegExp(`^${escaped}$`)
}

function isExcludedBy(path: string, {ignores, negations}: {ignores: string[]; negations: string[]}): boolean {
  // dockerignore semantics: a pattern with no '/' matches at ANY path level
  // (so unanchored `node_modules` also excludes `web/node_modules`, and
  // `test-results` also excludes `web/test-results`). Test the full path, the
  // first segment, and every individual component. rm-197: the nested case is
  // now asserted, not just assumed.
  const segments = path.split('/')
  const candidates = [path, segments[0] ?? path, ...segments]
  for (const candidate of candidates) {
    for (const pattern of ignores) {
      if (!patternToRegExp(pattern).test(candidate)) continue
      const unignored = negations.some(negation => patternToRegExp(negation).test(candidate))
      if (!unignored) return true
    }
  }
  return false
}

describe('Dockerfile build-context validity (rm-132)', () => {
  const dockerfilePath = resolve(repoRoot, 'Dockerfile')

  it('exists in the repo root', () => {
    expect(existsSync(dockerfilePath)).toBe(true)
  })

  it('every COPY/ADD source from the build context exists in the tree', () => {
    const text = readFileSync(dockerfilePath, 'utf8')
    const sources = collectContextSources(text)
    // Sanity: the Dockerfile always copies manifests and web/src trees, so a
    // zero-source parse means the parser broke, not that the file is clean.
    expect(sources.length).toBeGreaterThan(0)
    const missing = sources.filter(
      entry => !entry.source.includes('*') && !existsSync(resolve(repoRoot, entry.source)),
    )
    expect(
      missing.map(entry => `${entry.instruction} line ${entry.line}: ${entry.source}`),
    ).toEqual([])
  })
})

describe('Docker build-context seal (rm-186)', () => {
  const dockerignorePath = resolve(repoRoot, '.dockerignore')
  const requiredSecurityEntries = ['.git', 'node_modules', '.env*', '*.pem', '*.key']
  // rm-197: locally generated test-runner/pnpm artifacts must never reach the
  // build context. Unanchored entries so nested copies (web/…) match too.
  const requiredArtifactEntries = ['test-results', 'playwright-report', '.pnpm-store']

  it('.dockerignore exists in the repo root', () => {
    expect(existsSync(dockerignorePath)).toBe(true)
  })

  it('keeps the minimal security entry set (.git, node_modules, .env*, *.pem, *.key)', () => {
    const {ignores} = parseDockerignore(readFileSync(dockerignorePath, 'utf8'))
    const missing = requiredSecurityEntries.filter(entry => !ignores.includes(entry))
    expect(missing).toEqual([])
  })

  it('keeps the test-runner artifact entry set (test-results, playwright-report, .pnpm-store) — rm-197', () => {
    const {ignores} = parseDockerignore(readFileSync(dockerignorePath, 'utf8'))
    const missing = requiredArtifactEntries.filter(entry => !ignores.includes(entry))
    expect(missing).toEqual([])
  })

  it('artifact entries actually seal nested copies (web/test-results is excluded) — rm-197', () => {
    const seal = parseDockerignore(readFileSync(dockerignorePath, 'utf8'))
    for (const entry of requiredArtifactEntries) {
      expect(isExcludedBy(entry, seal), `root ${entry}/ must be excluded`).toBe(true)
      expect(isExcludedBy(`web/${entry}`, seal), `nested web/${entry}/ must be excluded (unanchored pattern)`).toBe(true)
    }
  })

  it('never excludes a Dockerfile COPY/ADD source from the build context', () => {
    const seal = parseDockerignore(readFileSync(dockerignorePath, 'utf8'))
    const sources = collectContextSources(readFileSync(resolve(repoRoot, 'Dockerfile'), 'utf8'))
    expect(sources.length).toBeGreaterThan(0)
    const excluded = sources.filter(entry => isExcludedBy(entry.source, seal))
    expect(
      excluded.map(entry => `${entry.instruction} line ${entry.line}: ${entry.source}`),
    ).toEqual([])
  })
})
