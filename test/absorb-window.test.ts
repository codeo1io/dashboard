/**
 * Test suite for scripts/absorb-window.ts
 *
 * Tests build isolated temporary git fixtures (an upstream bare repo, a fork
 * origin bare repo, and a work clone with remotes) and spawn the script with
 * the fixture as the working directory. The real repository's remote state is
 * never part of the fixture.
 *
 * Covers:
 * - Fetch-first happy path: window enumerated oldest-first, release tag named
 * - The recorded undercount class (2026-10-14: 2 recorded vs 4 real): a
 *   cached-ref read after the upstream advanced must REFUSE (exit 2) with the
 *   staleness age, emitting nothing; a fresh fetch reports the true window
 * - Fresh cache (--no-fetch within the ceiling) passes and reports cached truth
 * - Staleness refusal names the origin tracking ref (first arm of the loop)
 * - Missing upstream tracking ref refused
 * - Ref without reflog evidence refused (freshness unestablishable)
 * - Upstream resolution: URL-suffix fallback (remote named `upstream` on a
 *   fro-bot/dashboard path) and the bare-URL FETCH_HEAD posture via the
 *   ABSORB_WINDOW_UPSTREAM_URL seam
 * - Argument validation: bad --max-age-hours, unknown flag
 */

import {execFileSync, spawnSync} from 'node:child_process'
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import process from 'node:process'

import {afterEach, beforeEach, describe, expect, it} from 'vitest'

const SCRIPT = resolve(import.meta.dirname, '../scripts/absorb-window.ts')

interface WindowPayload {
  base: string
  upstream: string
  behind_count: number
  window_commits: {sha: string; subject: string}[]
  latest_release_tag: string | null
  fetch_ts: string
}

/** Typed view of the script's stdout JSON (the repo never handles `any`). */
function parseWindow(stdout: string): WindowPayload {
  return JSON.parse(stdout) as WindowPayload
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

interface Fixture {
  root: string
  seedDir: string
  upstreamPath: string
  workDir: string
  advance: (subject: string, tag?: string) => void
}

function git(cwd: string, args: string[], extraEnv?: Record<string, string>): void {
  // stdio 'ignore': fixture primitives (init/clone/fetch/push) print progress
  // noise on stderr that would otherwise leak into the suite log; failures
  // still throw with the failing command in the stack trace.
  execFileSync('git', args, {cwd, env: {...process.env, ...extraEnv}, stdio: 'ignore'})
}

/**
 * Build the three-repo topology: a seed (where upstream commits are made),
 * a bare upstream remote, a bare origin the fork clones from, and the work
 * clone whose remotes the script resolves.
 */
function makeFixture(upstreamDirName = 'upstream.git'): Fixture {
  const root = mkdtempSync(join(tmpdir(), 'absorb-window-test-'))
  const seedDir = join(root, 'seed')
  // git init cannot create the directory itself: execFileSync chdir's into
  // cwd before git runs, so a not-yet-existing seed dir fails with ENOENT.
  mkdirSync(seedDir, {recursive: true})
  const upstreamPath = join(root, upstreamDirName)
  const originPath = join(root, 'origin.git')
  const workDir = join(root, 'work')

  git(seedDir, ['init', '-b', 'main'])
  git(seedDir, ['config', 'user.email', 'test@example.com'])
  git(seedDir, ['config', 'user.name', 'Test'])
  writeFileSync(join(seedDir, 'README.md'), 'fixture\n')
  git(seedDir, ['add', 'README.md'])
  git(seedDir, ['commit', '-m', 'base commit one'])

  git(seedDir, ['clone', '--bare', '.', upstreamPath])
  git(seedDir, ['clone', '--bare', '.', originPath])
  execFileSync('git', ['clone', originPath, workDir], {cwd: root, stdio: 'ignore'})
  // A plain clone leaves refs/remotes/origin/main with no reflog (and a
  // no-op fetch writes none): delete + re-fetch once so the tracking ref
  // carries the reflog evidence --no-fetch measures staleness from.
  git(workDir, ['update-ref', '-d', 'refs/remotes/origin/main'])
  git(workDir, ['fetch', 'origin', 'main'])

  const advance = (subject: string, tag?: string): void => {
    writeFileSync(join(seedDir, 'README.md'), `${subject}\n`)
    git(seedDir, ['add', 'README.md'])
    git(seedDir, ['commit', '-m', subject])
    if (tag !== undefined) git(seedDir, ['tag', tag])
    git(seedDir, ['push', upstreamPath, 'main'])
    if (tag !== undefined) git(seedDir, ['push', upstreamPath, `refs/tags/${tag}`])
  }

  return {root, seedDir, upstreamPath, workDir, advance}
}

/**
 * Spawn the script in a directory with seam env overrides applied.
 * ABSORB_WINDOW_* seams are stripped from the parent env first so a leaking
 * parent value cannot influence a test that means to omit them.
 *
 * A `null` status is an infrastructure signature, never one of the script's
 * own decisions (see
 * docs/solutions/workflow-issues/guard-spawnsync-null-status-conflation-2026-10-02.md):
 * one retry absorbs transient blips, a persistent failure throws.
 */
function runScript(
  dir: string,
  args: string[] = [],
  extraEnv: Record<string, string | undefined> = {},
): {stdout: string; stderr: string; exitCode: number} {
  const {ABSORB_WINDOW_NOW, ABSORB_WINDOW_UPSTREAM_URL, ...parentEnv} = process.env
  let lastFailure = 'unknown spawn failure'
  for (let attempt = 1; attempt <= 2; attempt++) {
    const result = spawnSync(process.execPath, [SCRIPT, ...args], {
      cwd: dir,
      env: {...parentEnv, ...extraEnv},
      encoding: 'utf8',
      timeout: 60_000,
    })
    if (result.status !== null) {
      return {
        stdout: (result.stdout ?? '').trim(),
        stderr: (result.stderr ?? '').trim(),
        exitCode: result.status,
      }
    }
    lastFailure = `${result.error?.message ?? 'no error object'}; signal=${result.signal ?? 'none'}`
  }
  throw new Error(
    'absorb-window spawn produced no exit status (infrastructure failure, ' +
    `not a script decision): ${lastFailure}`,
  )
}

// ---------------------------------------------------------------------------
// Fixture management
// ---------------------------------------------------------------------------

let fixture: Fixture

beforeEach(() => {
  fixture = makeFixture()
})

afterEach(() => {
  rmSync(fixture.root, {recursive: true, force: true})
})

// ---------------------------------------------------------------------------
// Fetch-first happy path
// ---------------------------------------------------------------------------

describe('absorb-window — fetch-first measurement', () => {
  it('fetches both remotes and emits the window, commits oldest-first, with the release tag', () => {
    git(fixture.workDir, ['remote', 'add', 'autonomy-upstream', fixture.upstreamPath])
    fixture.advance('advance: upstream one', '2026.10.25')

    const {stdout, stderr, exitCode} = runScript(fixture.workDir)
    expect(exitCode).toBe(0)
    expect(stderr).toBe('')

    const payload = parseWindow(stdout)
    expect(payload.behind_count).toBe(1)
    expect(payload.window_commits).toHaveLength(1)
    expect(payload.window_commits[0]?.subject).toBe('advance: upstream one')
    expect(payload.latest_release_tag).toBe('2026.10.25')
    expect(payload.base).toMatch(/^[0-9a-f]{40}$/)
    expect(payload.upstream).toMatch(/^[0-9a-f]{40}$/)
    expect(Date.parse(payload.fetch_ts)).not.toBeNaN()
  })

  it('enumerates multiple window commits oldest-first', () => {
    git(fixture.workDir, ['remote', 'add', 'autonomy-upstream', fixture.upstreamPath])
    fixture.advance('advance: upstream one')
    fixture.advance('advance: upstream two')
    fixture.advance('advance: upstream three')

    const {stdout, exitCode} = runScript(fixture.workDir)
    expect(exitCode).toBe(0)
    const payload = parseWindow(stdout)
    expect(payload.behind_count).toBe(3)
    expect(payload.window_commits.map(c => c.subject)).toEqual([
      'advance: upstream one',
      'advance: upstream two',
      'advance: upstream three',
    ])
  })
})

// ---------------------------------------------------------------------------
// The recorded undercount class: stale cached refs must refuse, never
// silently undercount (2026-10-14: 2 recorded vs 4 real)
// ---------------------------------------------------------------------------

describe('absorb-window — forced-stale refusal', () => {
  it('refuses a --no-fetch read past the ceiling with the age, emitting nothing on stdout', () => {
    git(fixture.workDir, ['remote', 'add', 'autonomy-upstream', fixture.upstreamPath])
    fixture.advance('advance: upstream one', '2026.10.25')

    const fresh = runScript(fixture.workDir)
    expect(fresh.exitCode).toBe(0)
    const fetchedAt = Date.parse(parseWindow(fresh.stdout).fetch_ts)

    // Upstream moves on after the local fetch — the stale-ref undercount setup.
    fixture.advance('advance: upstream two')
    fixture.advance('advance: upstream three', '2026.10.27')

    const stale = runScript(fixture.workDir, ['--no-fetch'], {
      ABSORB_WINDOW_NOW: new Date(fetchedAt + 7 * 3600 * 1000).toISOString(),
    })
    expect(stale.exitCode).toBe(2)
    expect(stale.stdout).toBe('')
    expect(stale.stderr).toContain('stale at 7.0h old')
    expect(stale.stderr).toContain('ceiling 6h')
    expect(stale.stderr).toContain('refs/remotes/origin/main')
  })

  it('a fresh cache passes --no-fetch and reports cached truth (the undercount, visible but bounded)', () => {
    git(fixture.workDir, ['remote', 'add', 'autonomy-upstream', fixture.upstreamPath])
    fixture.advance('advance: upstream one')

    const fresh = runScript(fixture.workDir)
    expect(fresh.exitCode).toBe(0)
    const fetchedAt = Date.parse(parseWindow(fresh.stdout).fetch_ts)

    fixture.advance('advance: upstream two')
    fixture.advance('advance: upstream three')

    const cached = runScript(fixture.workDir, ['--no-fetch'], {
      ABSORB_WINDOW_NOW: new Date(fetchedAt + 3600 * 1000).toISOString(),
    })
    expect(cached.exitCode).toBe(0)
    const payload = parseWindow(cached.stdout)
    // Cached refs still see the window as it was at fetch time (1), which is
    // exactly the shape the refusal exists to bound in time.
    expect(payload.behind_count).toBe(1)
  })

  it('a re-fetch after the upstream advanced reports the true window', () => {
    git(fixture.workDir, ['remote', 'add', 'autonomy-upstream', fixture.upstreamPath])
    fixture.advance('advance: upstream one')

    const first = runScript(fixture.workDir)
    expect(parseWindow(first.stdout).behind_count).toBe(1)

    fixture.advance('advance: upstream two')
    fixture.advance('advance: upstream three', '2026.10.27')

    const second = runScript(fixture.workDir)
    expect(second.exitCode).toBe(0)
    const payload = parseWindow(second.stdout)
    expect(payload.behind_count).toBe(3)
    expect(payload.latest_release_tag).toBe('2026.10.27')
  })
})

// ---------------------------------------------------------------------------
// Refusal grammar: missing refs, missing reflog evidence
// ---------------------------------------------------------------------------

describe('absorb-window — refusal grammar', () => {
  it('refuses --no-fetch when the upstream tracking ref does not exist', () => {
    git(fixture.workDir, ['remote', 'add', 'autonomy-upstream', fixture.upstreamPath])
    const {stdout, stderr, exitCode} = runScript(fixture.workDir, ['--no-fetch'])
    expect(exitCode).toBe(2)
    expect(stdout).toBe('')
    expect(stderr).toContain('refs/remotes/autonomy-upstream/main')
    expect(stderr).toContain('does not exist locally')
  })

  it('refuses --no-fetch when a tracking ref has no fetch reflog evidence', () => {
    git(fixture.workDir, ['remote', 'add', 'autonomy-upstream', fixture.upstreamPath])
    fixture.advance('advance: upstream one')
    // Fetch with reflog creation disabled: the tracking ref materializes but
    // its freshness cannot be established from a reflog that was never written.
    execFileSync(
      'git',
      ['-c', 'core.logallrefupdates=false', 'fetch', 'autonomy-upstream', 'main'],
      {cwd: fixture.workDir},
    )
    const {stdout, stderr, exitCode} = runScript(fixture.workDir, ['--no-fetch'])
    expect(exitCode).toBe(2)
    expect(stdout).toBe('')
    expect(stderr).toContain('refs/remotes/autonomy-upstream/main')
    expect(stderr).toContain('no fetch reflog evidence')
  })
})

// ---------------------------------------------------------------------------
// Upstream resolution: URL fallback and bare-URL FETCH_HEAD posture
// ---------------------------------------------------------------------------

describe('absorb-window — upstream resolution', () => {
  it('resolves a remote by fro-bot/dashboard URL suffix when autonomy-upstream is absent', () => {
    // Remote literally named `upstream` on a path whose tail matches the
    // fro-bot/dashboard URL suffix — the multi-host topology this fallback
    // exists for. Separate fixture (needs the slash-shaped dir name); cleaned
    // up locally so the shared beforeEach fixture is unaffected.
    const urlFixture = makeFixture('fro-bot/dashboard.git')
    try {
      git(urlFixture.workDir, ['remote', 'add', 'upstream', urlFixture.upstreamPath])
      urlFixture.advance('advance: upstream one', '2026.10.25')

      const {stdout, exitCode} = runScript(urlFixture.workDir)
      expect(exitCode).toBe(0)
      const payload = parseWindow(stdout)
      expect(payload.behind_count).toBe(1)
      expect(payload.latest_release_tag).toBe('2026.10.25')
    } finally {
      rmSync(urlFixture.root, {recursive: true, force: true})
    }
  })

  it('fetches the URL directly (FETCH_HEAD posture) when no remote matches, via the URL seam', () => {
    fixture.advance('advance: upstream one', '2026.10.25')
    const {stdout, exitCode} = runScript(fixture.workDir, [], {
      ABSORB_WINDOW_UPSTREAM_URL: fixture.upstreamPath,
    })
    expect(exitCode).toBe(0)
    const payload = parseWindow(stdout)
    expect(payload.behind_count).toBe(1)
    expect(payload.latest_release_tag).toBe('2026.10.25')
  })

  it('refuses --no-fetch when upstream resolved to a bare URL (nothing cached to read)', () => {
    const {stdout, stderr, exitCode} = runScript(fixture.workDir, ['--no-fetch'], {
      ABSORB_WINDOW_UPSTREAM_URL: fixture.upstreamPath,
    })
    expect(exitCode).toBe(1)
    expect(stdout).toBe('')
    expect(stderr).toContain('--no-fetch needs a cached upstream tracking ref')
  })
})

// ---------------------------------------------------------------------------
// Argument validation
// ---------------------------------------------------------------------------

describe('absorb-window — argument validation', () => {
  it('rejects a non-numeric --max-age-hours', () => {
    const {stderr, exitCode} = runScript(fixture.workDir, ['--max-age-hours', 'abc'])
    expect(exitCode).toBe(1)
    expect(stderr).toContain('--max-age-hours expects a non-negative number')
  })

  it('rejects an unknown flag', () => {
    const {stderr, exitCode} = runScript(fixture.workDir, ['--nonsense'])
    expect(exitCode).toBe(1)
    expect(stderr).toContain("unknown argument '--nonsense'")
  })
})
