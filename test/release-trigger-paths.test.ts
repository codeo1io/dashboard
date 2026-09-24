import {spawnSync} from 'node:child_process'
import {existsSync, readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

// rm-154 (cycle-9 batch B1): pnpm-workspace.yaml is COPY'd into BOTH Docker
// stages (builder + prod-deps) and now carries build-behavior config
// (allowBuilds, shamefullyHoist, minimumReleaseAge), yet it sat in NEITHER
// release gate — .github/workflows/release.yaml `paths:` nor
// scripts/should-release.ts isHardReleasePath — so build-behavior edits
// changed the shipped image with no release trigger. This guard parses all
// three surfaces as text and pins the invariant: every Dockerfile build-context
// source must be a release-trigger surface in both gates. Sibling of
// test/dockerfile-context.test.ts (rm-132), same parsing style: seconds of
// Node at PR time, no docker build.

const repoRoot = process.cwd()

// ---------------------------------------------------------------------------
// Parsers (text-based; no imports from the script — it executes on import)
// ---------------------------------------------------------------------------

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
    // `--from=` sources come from a previous stage, not the build context.
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

/** Extract the push `paths:` filter entries from release.yaml. */
function parseReleaseYamlPaths(yamlText: string): string[] {
  // Line-based walk of the paths block (entries may interleave `#` comment
  // lines — rm-154 does). The block ends at the first non-indented or
  // non-entry/comment line (e.g. `workflow_dispatch:`).
  const lines = yamlText.split('\n')
  const pathsIndex = lines.indexOf('    paths:')
  if (pathsIndex === -1) return []
  const entries: string[] = []
  for (const line of lines.slice(pathsIndex + 1)) {
    if (!/^ {6}[-#]/.test(line)) break
    const raw = /^ {6}- (.+)$/.exec(line)?.[1]
    if (raw === undefined) continue // comment line
    const cleaned = raw.trim()
    const unquoted = cleaned.length >= 2 && /^['"].*['"]$/.test(cleaned) ? cleaned.slice(1, -1) : cleaned
    if (unquoted !== '') entries.push(unquoted)
  }
  return entries
}

/** Extract the hard-path literals (`filePath === '...'`) from should-release.ts. */
function parseHardPathLiterals(scriptText: string): string[] {
  return [...scriptText.matchAll(/filePath === '([^']+)'/g)].map(m => m[1] ?? '')
}

/** Extract the prefix rules (`filePath.startsWith('...')`) from should-release.ts. */
function parseHardPathPrefixes(scriptText: string): string[] {
  return [...scriptText.matchAll(/filePath\.startsWith\('([^']+)'\)/g)].map(m => m[1] ?? '')
}

// ---------------------------------------------------------------------------
// Coverage predicate
// ---------------------------------------------------------------------------

function escapeRegExp(text: string): string {
  return text.replaceAll(/[.+?^${}()|[\]\\]/g, String.raw`\$&`)
}

/**
 * True when `source` (a Dockerfile build-context token, possibly a dir like
 * `web/`) is covered by a trigger entry (exact literal, `dir/**` glob,
 * wildcard suffix like `tsconfig*.json`, or prefix rule).
 */
function isCovered(source: string, entries: readonly string[], prefixes: readonly string[]): boolean {
  const token = source.endsWith('/') ? source.slice(0, -1) : source
  const coveredByEntry = (entry: string): boolean => {
    if (entry === token) return true
    const dirGlob = /^([^*]+)\/\*\*\*?$/.exec(entry)
    if (dirGlob?.[1] !== undefined) {
      const base = dirGlob[1]
      return token === base || token.startsWith(`${base}/`)
    }
    if (entry.includes('*')) {
      return new RegExp(`^${escapeRegExp(entry).replaceAll('*', '[^/]*')}$`).test(token)
    }
    return false
  }
  if (entries.some(coveredByEntry)) return true
  return prefixes.some(p => {
    const bare = p.endsWith('/') ? p.slice(0, -1) : p
    return token === bare || token.startsWith(p)
  })
}

/** should-release rules 2/3 cover these by field-diff/lockfile logic, not literals. */
const RULE_2_3_COVERED = new Set(['package.json', 'pnpm-lock.yaml'])

// ---------------------------------------------------------------------------
// Guard
// ---------------------------------------------------------------------------

describe('Release-trigger completeness (rm-154)', () => {
  const dockerfilePath = resolve(repoRoot, 'Dockerfile')
  const releaseYamlPath = resolve(repoRoot, '.github/workflows/release.yaml')
  const shouldReleasePath = resolve(repoRoot, 'scripts/should-release.ts')

  const dockerfileText = readFileSync(dockerfilePath, 'utf8')
  const yamlText = readFileSync(releaseYamlPath, 'utf8')
  const scriptText = readFileSync(shouldReleasePath, 'utf8')

  const contextSources = collectContextSources(dockerfileText)
  const yamlPaths = parseReleaseYamlPaths(yamlText)
  const hardLiterals = parseHardPathLiterals(scriptText)
  const hardPrefixes = parseHardPathPrefixes(scriptText)

  it('all three surfaces exist and parse non-vacuously', () => {
    expect(existsSync(dockerfilePath)).toBe(true)
    expect(existsSync(releaseYamlPath)).toBe(true)
    expect(existsSync(shouldReleasePath)).toBe(true)
    // Sanity anchors: a zero-hit parse means the parser broke, not a clean repo.
    expect(contextSources.length).toBeGreaterThan(0)
    expect(contextSources.some(s => s.source === 'package.json')).toBe(true)
    expect(contextSources.some(s => s.source === 'pnpm-workspace.yaml')).toBe(true)
    expect(yamlPaths.length).toBeGreaterThan(0)
    expect(yamlPaths).toContain('Dockerfile')
    expect(yamlPaths).toContain('src/**')
    expect(hardLiterals.length).toBeGreaterThan(0)
    expect(hardLiterals).toContain('Dockerfile')
    expect(hardPrefixes).toContain('src/')
  })

  it('every Dockerfile build-context source is a release.yaml trigger path', () => {
    const uncovered = contextSources.filter(s => !isCovered(s.source, yamlPaths, []))
    expect(
      uncovered.map(s => `${s.instruction} line ${s.line}: ${s.source} is COPY'd into the image but absent from release.yaml paths`),
    ).toEqual([])
  })

  it('every Dockerfile build-context source triggers should-release.ts', () => {
    const effectiveEntries = [...hardLiterals, ...RULE_2_3_COVERED]
    const uncovered = contextSources.filter(s => !isCovered(s.source, effectiveEntries, hardPrefixes))
    expect(
      uncovered.map(s => `${s.instruction} line ${s.line}: ${s.source} is COPY'd into the image but no should-release.ts rule triggers on it`),
    ).toEqual([])
  })

  it('every should-release hard literal is also a release.yaml path (unreachable rules are escapes)', () => {
    // A hard path missing from the workflow filter can never fire: the
    // workflow is not triggered, so the job (and its guard) never runs.
    const unreachable = hardLiterals.filter(literal => !isCovered(literal, yamlPaths, hardPrefixes))
    expect(unreachable).toEqual([])
  })

  it('pnpm-workspace.yaml is pinned in BOTH gates (the rm-154 regression)', () => {
    expect(yamlPaths).toContain('pnpm-workspace.yaml')
    expect(hardLiterals).toContain('pnpm-workspace.yaml')
  })

  it('negative proof: the coverage check actually fails on a regression', () => {
    // Simulate removing pnpm-workspace.yaml from release.yaml paths —
    // the exact pre-cycle-9 state. The check must flag it.
    const regressedPaths = yamlPaths.filter(p => p !== 'pnpm-workspace.yaml')
    expect(isCovered('pnpm-workspace.yaml', regressedPaths, [])).toBe(false)
    // And an arbitrary new COPY source with no trigger entry is flagged too.
    expect(isCovered('rogue-manifest.yaml', yamlPaths, hardPrefixes)).toBe(false)
    // The current (fixed) state covers it in both gates.
    expect(isCovered('pnpm-workspace.yaml', yamlPaths, [])).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Behavioral half (cycle-9 independent_review finding): the text checks above
// pin script/workflow SOURCE, which cannot catch a call-site regression in
// isHardReleasePath (the literal surviving while the branch stops being
// consulted). The script cannot be imported — it executes main() at import
// (top-level parseArgs + process.exit) — so execute it as a child process and
// pin the exit code and message of both branches.
// ---------------------------------------------------------------------------

describe('rm-154 behavior: should-release.ts actually fires on pnpm-workspace.yaml', () => {
  const script = resolve(repoRoot, 'scripts/should-release.ts')

  function runShouldRelease(...changedFiles: string[]) {
    return spawnSync(
      process.execPath,
      [script, '--changed-files', ...changedFiles, '--base-pkg', 'package.json', '--head-pkg', 'package.json'],
      {
        cwd: repoRoot,
        encoding: 'utf8',
      },
    )
  }

  it('exits 0 announcing the hard-release path when pnpm-workspace.yaml changes', () => {
    const result = runShouldRelease('pnpm-workspace.yaml')
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('release: hard-release path changed: pnpm-workspace.yaml')
  })

  it('exits 1 with the skip message for a non-triggering control file', () => {
    const result = runShouldRelease('README.md')
    expect(result.status).toBe(1)
    expect(result.stdout).toContain('skip: no release-triggering files changed')
  })
})
