import assert from 'node:assert/strict'
import {Buffer} from 'node:buffer'
import {mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import process from 'node:process'
import {afterEach, describe, it} from 'vitest'

/**
 * Fork invariant guard: the dashboard never carries a GitHub write code path.
 * Upstream fro-bot/dashboard ships a write-capable `wiki-writer/` workspace
 * package; a manual upstream absorb must never import it here (ROADMAP rm-125).
 *
 * The guard fails when any `wiki-writer` path or textual reference exists
 * outside the documented-mention allowlist. Scans deliberately use NO
 * file-extension filters — past sweeps missed extension-less files (the
 * Dockerfile hid `COPY wiki-writer/package.json` lines from every
 * extension-filtered grep).
 */

/** Path segments never scanned anywhere in the tree: vendored/external trees, engine state, build output. */
const SKIPPED_SEGMENTS = new Set([
  '.git',
  '.conductor',
  '.slim',
  'node_modules',
  'coverage',
])

/** Repo-relative prefixes additionally skipped (build output under a named path). */
const SKIPPED_PREFIXES = ['web/dist']

/**
 * Paths (relative to repo root, `/`-separated, prefix-matched against both
 * files and directories) where documented MENTIONS of the exclusion are
 * legitimate: the roadmap registry, solution/ideation/prioritization docs,
 * and this guard itself.
 */
const ALLOWED_MENTION_PREFIXES = [
  'docs/',
  'ROADMAP.md',
  'test/wiki-writer-guard.test.ts',
]

const MAX_SCANNED_FILE_BYTES = 2 * 1024 * 1024

function isSkippedDir(relPath: string): boolean {
  for (const segment of relPath.split('/')) {
    if (SKIPPED_SEGMENTS.has(segment)) return true
  }
  for (const skipped of SKIPPED_PREFIXES) {
    if (relPath === skipped || relPath.startsWith(`${skipped}/`)) return true
  }
  return false
}

function mentionsAllowed(relPath: string): boolean {
  for (const allowed of ALLOWED_MENTION_PREFIXES) {
    // Normalize: an allowed prefix may or may not already end in '/'.
    const prefix = allowed.endsWith('/') ? allowed.slice(0, -1) : allowed
    if (relPath === prefix || relPath.startsWith(`${prefix}/`)) return true
  }
  return false
}

/** Walks `root` and returns violations: relPaths that ARE or MENTION wiki-writer outside the allowlist. */
export function findWikiWriterViolations(root: string): string[] {
  const violations: string[] = []
  const walk = (dir: string, relDir: string): void => {
    for (const entry of readdirSync(dir, {withFileTypes: true})) {
      const relPath = relDir === '' ? entry.name : `${relDir}/${entry.name}`
      if (isSkippedDir(relPath)) continue
      const absPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        // A wiki-writer DIRECTORY is a structural violation wherever it lands.
        if (entry.name.includes('wiki-writer')) {
          violations.push(relPath)
          continue
        }
        walk(absPath, relPath)
        continue
      }
      if (!entry.isFile()) continue
      if (mentionsAllowed(relPath)) continue
      if (entry.name.includes('wiki-writer')) {
        violations.push(relPath)
        continue
      }
      const stat = statSync(absPath)
      if (stat.size > MAX_SCANNED_FILE_BYTES) {
        violations.push(`${relPath} (unscanned: size ${stat.size} exceeds cap)`)
        continue
      }
      let contents: string
      try {
        contents = readFileSync(absPath, 'utf8')
      } catch {
        violations.push(`${relPath} (unreadable)`)
        continue
      }
      if (contents.includes('wiki-writer')) violations.push(relPath)
    }
  }
  walk(root, '')
  return violations
}

function repoRoot(): string {
  // Vitest runs with cwd at the repo root; walk up for robustness. Conductor
  // worktrees carry `.git` as a FILE, so never key off its directory-ness.
  let dir = process.cwd()
  for (;;) {
    if (existsSyncFile(path.join(dir, 'package.json')) && existsSyncDir(path.join(dir, 'src')) && existsSyncDir(path.join(dir, 'test'))) {
      return dir
    }
    const parent = path.dirname(dir)
    if (parent === dir) return process.cwd()
    dir = parent
  }
}

function existsSyncDir(p: string): boolean {
  try {
    return statSync(p).isDirectory()
  } catch {
    return false
  }
}

function existsSyncFile(p: string): boolean {
  try {
    return statSync(p).isFile()
  } catch {
    return false
  }
}

const scratchRoots: string[] = []
afterEach(() => {
  for (const root of scratchRoots.splice(0)) rmSync(root, {recursive: true, force: true})
})

describe('wiki-writer exclusion guard (rm-125)', () => {
  it('the repository carries no wiki-writer path or reference outside the allowlist', () => {
    const violations = findWikiWriterViolations(repoRoot())
    assert.deepEqual(
      violations,
      [],
      `fork invariant violated — wiki-writer surface found (never a GitHub write code path):\n${violations.join('\n')}`,
    )
  })

  it('detects a wiki-writer directory landing in the tree (scratch violation)', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'ww-guard-'))
    scratchRoots.push(root)
    writeFileSync(path.join(root, 'package.json'), '{"name":"dashboard"}')
    writeFileSync(path.join(root, 'Dockerfile'), 'FROM node:24-slim\n')
    mkdirSync(path.join(root, 'wiki-writer'), {recursive: true})
    writeFileSync(path.join(root, 'wiki-writer/package.json'), '{"name":"wiki-writer"}')
    const violations = findWikiWriterViolations(root)
    assert.ok(violations.includes('wiki-writer'), `expected the wiki-writer directory flagged, got ${JSON.stringify(violations)}`)
  })

  it('detects textual references in extension-less and ordinary files (no extension filters)', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'ww-guard-'))
    scratchRoots.push(root)
    writeFileSync(path.join(root, 'Dockerfile'), 'COPY wiki-writer/package.json ./\n')
    mkdirSync(path.join(root, 'src'), {recursive: true})
    writeFileSync(path.join(root, 'src/example.ts'), '// see wiki-writer for writes\nexport {}\n')
    mkdirSync(path.join(root, 'docs/solutions'), {recursive: true})
    writeFileSync(path.join(root, 'docs/solutions/note.md'), 'The wiki-writer exclusion is documented here.\n')
    const violations = findWikiWriterViolations(root)
    assert.ok(violations.includes('Dockerfile'), 'extension-less Dockerfile reference must be caught')
    assert.ok(violations.includes('src/example.ts'), 'source reference must be caught')
    assert.ok(!violations.includes('docs/solutions/note.md'), 'documented mention under docs/ is allowed')
  })

  it('flags oversized files it could not scan rather than skipping silently', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'ww-guard-'))
    scratchRoots.push(root)
    const big = path.join(root, 'big-bundle.js')
    const handle = Buffer.alloc(MAX_SCANNED_FILE_BYTES + 1024, 0x20)
    writeFileSync(big, handle)
    const violations = findWikiWriterViolations(root)
    const onlyViolation = violations.length === 1 ? violations[0] : undefined
    assert.ok(onlyViolation !== undefined && onlyViolation.includes('unscanned'), `expected unscanned-cap violation, got ${JSON.stringify(violations)}`)
  })
})
