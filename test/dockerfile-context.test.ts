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

// rm-186 (cycle-13 batch B3): .gitignore guards .env/*.pem/*.key against
// COMMITS, but `docker build` reads the working tree directly — without a
// .dockerignore, a stray local secret (or the 394MB host node_modules tree)
// rides the build-context transfer. This gate pins both halves: the secret
// patterns exist, and no Dockerfile COPY/ADD context source is accidentally
// ignored (the failure mode a .dockerignore bug actually ships as).
function dockerignorePatterns(text: string): string[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line !== '' && !line.startsWith('#'))
}

function patternToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .replaceAll(/[.+^${}()|[\]\\]/g, String.raw`\$&`)
    .replaceAll('*', '[^/]*')
  if (pattern.startsWith('**/')) {
    return new RegExp(`(^|/)${escaped.slice(3)}$`)
  }
  // A bare name matches the entry and everything under it (directory semantics)
  return new RegExp(`^${escaped}(/.*)?$`)
}

describe('Docker build context guard (.dockerignore, rm-186)', () => {
  const dockerignorePath = resolve(repoRoot, '.dockerignore')

  it('.dockerignore exists at the repo root', () => {
    expect(existsSync(dockerignorePath)).toBe(true)
  })

  it('excludes the secret families .gitignore covers — context transfer is guarded too', () => {
    const patterns = dockerignorePatterns(readFileSync(dockerignorePath, 'utf8'))
    for (const secret of ['.env', '.env.*', '*.pem', '*.key']) {
      expect(patterns, `secret pattern ${secret} must be dockerignored`).toContain(secret)
    }
  })

  it('no COPY/ADD build-context source is excluded by .dockerignore', () => {
    const patterns = dockerignorePatterns(readFileSync(dockerignorePath, 'utf8'))
    const regexes = patterns.map(patternToRegExp)
    const sources = collectContextSources(readFileSync(resolve(repoRoot, 'Dockerfile'), 'utf8'))
    const ignored = sources.filter(entry => regexes.some(re => re.test(entry.source)))
    expect(
      ignored.map(entry => `${entry.instruction} line ${entry.line}: ${entry.source}`),
      'Dockerfile COPY sources must not be dockerignored (the image build would fail)',
    ).toEqual([])
  })

  it('excludes the host dependency tree — context transfer stays small', () => {
    const patterns = dockerignorePatterns(readFileSync(dockerignorePath, 'utf8'))
    expect(patterns.some(p => p === 'node_modules' || p === '**/node_modules')).toBe(true)
  })
})
