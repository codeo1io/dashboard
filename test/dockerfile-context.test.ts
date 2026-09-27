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
  const candidates = [path, path.split('/')[0] ?? path]
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

  it('.dockerignore exists in the repo root', () => {
    expect(existsSync(dockerignorePath)).toBe(true)
  })

  it('keeps the minimal security entry set (.git, node_modules, .env*, *.pem, *.key)', () => {
    const {ignores} = parseDockerignore(readFileSync(dockerignorePath, 'utf8'))
    const missing = requiredSecurityEntries.filter(entry => !ignores.includes(entry))
    expect(missing).toEqual([])
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

// rm-225 (cycle-18 U3): the container has a HEALTHCHECK on /api/healthz.
// The guard pins the shape the landing note promises: exactly one directive,
// probed by the node runtime already in the image (node:24-slim has no
// curl/wget and the runtime stage strips package managers — a curl-based
// probe would silently rot or reintroduce packages), honoring DASHBOARD_PORT
// with the server's default 3000, and hitting the public pre-auth endpoint.
describe('Container HEALTHCHECK (rm-225)', () => {
  const text = readFileSync(resolve(repoRoot, 'Dockerfile'), 'utf8')
  // Dockerfile line continuations (`\`) make one logical directive span
  // multiple physical lines — join them before asserting on the probe body.
  const healthchecks = (() => {
    const joined: {text: string; startLine: number}[] = []
    let current: {text: string; startLine: number} | null = null
    text.split('\n').forEach((rawLine, i) => {
      const line = rawLine.trim()
      if (line.startsWith('HEALTHCHECK')) {
        current = {text: line, startLine: i + 1}
      } else if (current !== null) {
        current.text += ` ${line}`
      }
      if (current !== null && !line.endsWith('\\')) {
        joined.push(current)
        current = null
      }
    })
    return joined
  })()

  it('declares exactly one HEALTHCHECK directive', () => {
    expect(healthchecks.map(entry => entry.startLine)).toHaveLength(1)
  })

  it('probes via the node runtime — no new packages (curl/wget absent)', () => {
    const directive = healthchecks[0]?.text ?? ''
    expect(directive).toMatch(/CMD node -e /)
    expect(directive).not.toMatch(/\b(curl|wget|busybox|nc)\b/)
  })

  it('targets the public /api/healthz endpoint on localhost, honoring DASHBOARD_PORT', () => {
    const directive = healthchecks[0]?.text ?? ''
    expect(directive).toContain('/api/healthz')
    expect(directive).toContain('127.0.0.1')
    expect(directive).toContain('DASHBOARD_PORT')
    expect(directive).toContain('3000')
  })

  it('runs as the unprivileged USER — declared after USER node and before CMD', () => {
    const userLine = text.split('\n').findIndex(line => line.trim() === 'USER node') + 1
    const cmdLine = text.split('\n').findIndex(line => line.trim().startsWith('CMD ')) + 1
    const healthLine = healthchecks[0]?.startLine ?? 0
    expect(healthLine).toBeGreaterThan(userLine)
    expect(healthLine).toBeLessThan(cmdLine)
  })
})
