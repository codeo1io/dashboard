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
 * - Content-coverage map (rm-1499): per-SHA classification from both-side
 *   content probes — content-covered-by requires a marker QUORUM (majority,
 *   at least 3) with the covering fork commit and probe markers as evidence;
 *   prose/lockfile lines never qualify as probes; fork-divergent via the
 *   default path disposition and the ABSORB_WINDOW_DISPOSITIONS seam;
 *   absorb-pending (sub-quorum overlap stays pending, never coverage);
 *   unknown (nothing-probeable commits are never classified from their
 *   subject); behind_count stays the raw window even when part of it is
 *   covered, and landing_note_table derives from the same per-commit map
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
  coverage?: {
    raw_count: number
    content_covered_count: number
    not_covered_count: number
    per_commit: {
      sha: string
      subject: string
      classification: string
      fork_commit: string | null
      fork_subject: string | null
      probe_markers: string[]
      probed_marker_count: number
      disposition: string | null
      reason: string
    }[]
  }
  landing_note_table?: string
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
  advanceLines: (lines: string[], subject: string) => void
  forkAdvance: (subject: string, content: string) => void
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

  /**
   * Upstream commit whose added lines are exactly `lines`, written to a code
   * path (app.ts) so they qualify as probe markers — prose paths (.md) are
   * deliberately excluded from probes and would classify as nothing-probeable.
   */
  const advanceLines = (lines: string[], subject: string): void => {
    writeFileSync(join(seedDir, 'app.ts'), `${lines.join('\n')}\n`)
    git(seedDir, ['add', 'app.ts'])
    git(seedDir, ['commit', '-m', subject])
    git(seedDir, ['push', upstreamPath, 'main'])
  }

  /** Fork-side commit: content lands on origin/main (the probe target side). */
  const forkAdvance = (subject: string, content: string): void => {
    writeFileSync(join(workDir, 'FORK_COVERAGE.md'), `${content}\n`)
    git(workDir, ['add', 'FORK_COVERAGE.md'])
    git(workDir, ['-c', 'user.email=test@example.com', '-c', 'user.name=Test', 'commit', '-m', subject])
    git(workDir, ['push', 'origin', 'main'])
  }

  return {root, seedDir, upstreamPath, workDir, advance, advanceLines, forkAdvance}
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

// ---------------------------------------------------------------------------
// Content-coverage map (rm-1499): classification from both-side content
// probes, raw count kept honest, table derived from the same map
// ---------------------------------------------------------------------------

const SHARED_SENTINELS = [
  'export const coverageSentinelOne = distinct probe line one shared verbatim rm-1499',
  'export const coverageSentinelTwo = distinct probe line two shared verbatim rm-1499',
  'export const coverageSentinelThree = distinct probe line three shared verbatim rm-1499',
  'export const coverageSentinelFour = distinct probe line four shared verbatim rm-1499',
  'export const coverageSentinelFive = distinct probe line five shared verbatim rm-1499',
  'export const coverageSentinelSix = distinct probe line six shared verbatim rm-1499',
] as const

describe('absorb-window — content-coverage map', () => {
  it('classifies a content-covered commit with the covering fork commit, while behind_count keeps the raw window', () => {
    git(fixture.workDir, ['remote', 'add', 'autonomy-upstream', fixture.upstreamPath])
    fixture.forkAdvance(
      'feat: native fork re-implementation of the upstream change',
      [...SHARED_SENTINELS].join('\n'),
    )
    fixture.advanceLines([...SHARED_SENTINELS], 'feat: upstream change the fork re-implemented natively')
    fixture.advanceLines(
      ['export const uncoveredUpstreamFeature = deliberately absent from the fork side'],
      'feat: uncovered upstream change',
    )

    const {stdout, exitCode} = runScript(fixture.workDir)
    expect(exitCode).toBe(0)
    const payload = parseWindow(stdout)
    // Raw honesty: the covered SHA still counts in behind_count (gate semantics unchanged).
    expect(payload.behind_count).toBe(2)
    expect(payload.coverage?.raw_count).toBe(2)

    const covered = payload.coverage?.per_commit.find(
      c => c.subject === 'feat: upstream change the fork re-implemented natively',
    )
    expect(covered?.classification).toBe('content-covered-by')
    expect(covered?.probe_markers.length).toBeGreaterThan(0)
    expect(covered?.fork_commit).toMatch(/^[0-9a-f]{40}$/)
    expect(covered?.fork_subject).toBe('feat: native fork re-implementation of the upstream change')
    expect(covered?.reason).toContain('6/6 probe markers already verbatim on refs/remotes/origin/main')
    expect(covered?.reason).toContain('(quorum 3)')

    expect(payload.coverage?.content_covered_count).toBe(1)
    expect(payload.coverage?.not_covered_count).toBe(1)

    const pending = payload.coverage?.per_commit.find(c => c.subject === 'feat: uncovered upstream change')
    expect(pending?.classification).toBe('absorb-pending')
    expect(pending?.reason).toContain('no probe marker matched refs/remotes/origin/main')
  })

  it('treats sub-quorum marker overlap as absorb-pending, never as coverage', () => {
    git(fixture.workDir, ['remote', 'add', 'autonomy-upstream', fixture.upstreamPath])
    // One shared boilerplate line (moved test content) plus five real feature
    // lines the fork does not carry — 1/6 matches the quorum of 3.
    fixture.forkAdvance('chore: fork carries one shared boilerplate line', SHARED_SENTINELS[0] ?? '')
    fixture.advanceLines(
      [
        SHARED_SENTINELS[0] ?? '',
        'export const markdownRendererLineTwo = genuinely new upstream feature content',
        'export const markdownRendererLineThree = genuinely new upstream feature content',
        'export const markdownRendererLineFour = genuinely new upstream feature content',
        'export const markdownRendererLineFive = genuinely new upstream feature content',
        'export const markdownRendererLineSix = genuinely new upstream feature content',
      ],
      'feat: mostly-new upstream change with one shared line',
    )

    const {stdout, exitCode} = runScript(fixture.workDir)
    expect(exitCode).toBe(0)
    const payload = parseWindow(stdout)
    const commit = payload.coverage?.per_commit.find(
      c => c.subject === 'feat: mostly-new upstream change with one shared line',
    )
    expect(commit?.classification).toBe('absorb-pending')
    expect(commit?.reason).toContain('1/6 markers verbatim on refs/remotes/origin/main but below quorum 3')
    expect(commit?.reason).toContain('coincidental overlap is not coverage')
    expect(payload.coverage?.content_covered_count).toBe(0)
  })

  it('classifies a standing never-absorb path disposition (fork-divergent) via the default rules', () => {
    git(fixture.workDir, ['remote', 'add', 'autonomy-upstream', fixture.upstreamPath])
    // Real upstream shape (live tree probe 2026-10-18): the editing
    // capability lives at the repo ROOT — write-operation source, contract,
    // and security-boundary tests under it, nothing under src/. Constructed
    // guard-safely exactly like the classifier's constant.
    const editingRoot = 'wiki-' + 'writer/'
    mkdirSync(join(fixture.seedDir, editingRoot, 'src'), {recursive: true})
    writeFileSync(
      join(fixture.seedDir, editingRoot, 'src/write-operation.ts'),
      'export const applyEdit = 1\n',
    )
    git(fixture.seedDir, ['add', join(editingRoot, 'src/write-operation.ts')])
    git(fixture.seedDir, ['commit', '-m', 'feat: editing capability'])
    git(fixture.seedDir, ['push', fixture.upstreamPath, 'main'])

    const {stdout, exitCode} = runScript(fixture.workDir)
    expect(exitCode).toBe(0)
    const payload = parseWindow(stdout)
    const divergent = payload.coverage?.per_commit.find(c => c.classification === 'fork-divergent')
    expect(divergent?.disposition).toBe('write-capability')
    expect(divergent?.reason).toContain('never-absorb by disposition')
    expect(divergent?.reason).toContain('repository-editing')
    expect(divergent?.reason).toContain('rm-259')
    expect(payload.coverage?.not_covered_count).toBe(1)
  })

  it('classifies the SW-router kill-switch rule by added-line markers', () => {
    git(fixture.workDir, ['remote', 'add', 'autonomy-upstream', fixture.upstreamPath])
    mkdirSync(join(fixture.seedDir, 'web/src'), {recursive: true})
    writeFileSync(
      join(fixture.seedDir, 'web/src/sw.ts'),
      'export const serviceWorkerRouter = 1\n',
    )
    git(fixture.seedDir, ['add', 'web/src/sw.ts'])
    git(fixture.seedDir, ['commit', '-m', 'feat: route requests through the service worker'])
    git(fixture.seedDir, ['push', fixture.upstreamPath, 'main'])

    const {stdout, exitCode} = runScript(fixture.workDir)
    expect(exitCode).toBe(0)
    const payload = parseWindow(stdout)
    const divergent = payload.coverage?.per_commit.find(c => c.classification === 'fork-divergent')
    expect(divergent?.disposition).toBe('sw-router-kill-switch')
    expect(divergent?.reason).toContain('never-absorb by disposition')
    expect(divergent?.reason).toContain('kill-switch')
    expect(payload.coverage?.not_covered_count).toBe(1)
  })

  it('honors the ABSORB_WINDOW_DISPOSITIONS seam for marker-keyed never-absorb rules', () => {
    git(fixture.workDir, ['remote', 'add', 'autonomy-upstream', fixture.upstreamPath])
    fixture.advanceLines(
      ['export const swRouterGuard = encodes the service worker router kill switch phrase'],
      'feat: upstream sw router change',
    )
    const dispositionsPath = join(fixture.root, 'dispositions.json')
    writeFileSync(
      dispositionsPath,
      JSON.stringify({
        fork_divergent: [
          {
            name: 'sw-router',
            reason: 'kill-switch stance: the SW router stays fork-divergent',
            match_markers: ['service worker router kill switch'],
          },
        ],
      }),
    )

    const {stdout, exitCode} = runScript(fixture.workDir, [], {
      ABSORB_WINDOW_DISPOSITIONS: dispositionsPath,
    })
    expect(exitCode).toBe(0)
    const payload = parseWindow(stdout)
    expect(payload.coverage?.per_commit[0]?.classification).toBe('fork-divergent')
    expect(payload.coverage?.per_commit[0]?.disposition).toBe('sw-router')
  })

  it('classifies nothing-probeable commits as unknown, never from their subject', () => {
    git(fixture.workDir, ['remote', 'add', 'autonomy-upstream', fixture.upstreamPath])
    fixture.advanceLines(
      ['export const probeableLine = present so only the empty commit is unknown'],
      'feat: probeable upstream change',
    )
    git(fixture.seedDir, ['commit', '--allow-empty', '-m', 'chore: empty marker-less commit'])
    git(fixture.seedDir, ['push', fixture.upstreamPath, 'main'])

    const {stdout, exitCode} = runScript(fixture.workDir)
    expect(exitCode).toBe(0)
    const payload = parseWindow(stdout)
    const unknown = payload.coverage?.per_commit.find(c => c.classification === 'unknown')
    expect(unknown?.subject).toBe('chore: empty marker-less commit')
    expect(unknown?.reason).toContain('no probeable content')
    expect(unknown?.probed_marker_count).toBe(0)
    // The probeable sibling stays classified from its content, not its subject.
    const pending = payload.coverage?.per_commit.find(c => c.subject === 'feat: probeable upstream change')
    expect(pending?.classification).toBe('absorb-pending')
  })

  it('derives the landing-note table from the same per-commit map (single source, rm-1462)', () => {
    git(fixture.workDir, ['remote', 'add', 'autonomy-upstream', fixture.upstreamPath])
    fixture.forkAdvance(
      'feat: native fork re-implementation of the upstream change',
      [...SHARED_SENTINELS].join('\n'),
    )
    fixture.advanceLines([...SHARED_SENTINELS], 'feat: upstream change the fork re-implemented natively')
    fixture.advanceLines(
      ['export const uncoveredUpstreamFeature = deliberately absent from the fork side'],
      'feat: uncovered upstream change',
    )

    const {stdout, exitCode} = runScript(fixture.workDir)
    expect(exitCode).toBe(0)
    const payload = parseWindow(stdout)
    const rows = (payload.landing_note_table ?? '').split('\n')
    expect(rows[0]).toContain('upstream sha')
    expect(rows[1]).toBe('| --- | --- | --- | --- | --- |')
    expect(rows).toHaveLength(2 + (payload.coverage?.per_commit.length ?? 0))
    for (const commit of payload.coverage?.per_commit ?? []) {
      const row = rows.find(line => line.includes(commit.sha.slice(0, 8)))
      expect(row, `a table row for ${commit.sha.slice(0, 8)}`).toBeDefined()
      expect(row).toContain(commit.classification)
    }
    const coveredRow = rows.find(line => line.includes('content-covered-by'))
    expect(coveredRow).toContain('feat: native fork re-implementation of the upstream change')
  })
})
