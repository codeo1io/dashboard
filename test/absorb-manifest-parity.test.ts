import {spawnSync} from 'node:child_process'
import {existsSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join} from 'node:path'
import process from 'node:process'
import {afterEach, describe, expect, it} from 'vitest'

interface GuardViolation {
  manifest: string
  package: string
  absorbed: string
  ours: string | null
}

interface GuardPayload {
  head: string
  upstream: string
  absorbed_bump_commits: number
  checked_dependencies: number
  violations: GuardViolation[]
  skipped: {manifest: string; package: string; reason: string}[]
}

function parseGuardOutput(stdout: string): GuardPayload {
  return JSON.parse(stdout) as GuardPayload
}

// rm-1983: post-absorb manifest-parity guard. Fixtures rebuild the recorded
// drop class in miniature — an upstream dependency bump enters the fork's
// ANCESTRY through a merge that keeps the fork's manifest (`git merge -s
// ours`), exactly how 8d867b9b ("@hono/node-server 2.1.5 (#644)") ended up
// an ancestor of HEAD while package.json still said `^2.1.3`.

const GUARD = join(process.cwd(), 'scripts', 'absorb-manifest-parity.ts')

const dirs: string[] = []

afterEach(() => {
  while (dirs.length > 0) {
    const dir = dirs.pop()
    if (dir !== undefined) rmSync(dir, {recursive: true, force: true})
  }
})

function run(args: string[], cwd: string) {
  return spawnSync('node', [GUARD, ...args], {cwd, encoding: 'utf8'})
}

function git(cwd: string, args: string[]) {
  // Commands that create the directory itself (init/clone) run from the
  // parent when the target does not exist yet.
  const useCwd = existsSync(cwd) ? cwd : dirname(cwd)
  const res = spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], {cwd: useCwd, encoding: 'utf8'})
  if (res.status !== 0) throw new Error(`git ${args.join(' ')}: ${res.stderr}`)
  return res.stdout
}

interface Fixture {
  work: string
  upstreamDir: string
}

/** seed → origin bare (fork point) + upstream bare; work clones origin and adds upstream. */
function seedFixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), 'absorb-parity-'))
  dirs.push(root)
  const seed = join(root, 'seed')
  const upstreamBare = join(root, 'upstream.git')
  const originBare = join(root, 'origin.git')
  const work = join(root, 'work')

  const manifest = {
    name: 'fixture-dashboard',
    dependencies: {'left-pad': '^1.0.0'},
  }
  git(seed, ['init', '--initial-branch=main', seed])
  writeFileSync(join(seed, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  git(seed, ['add', '.'])
  git(seed, ['commit', '-m', 'seed: fork-point manifest left-pad ^1.0.0'])
  // One seed parents BOTH bares so the fork shares history with upstream
  // (the real topology: the fork was cloned from upstream before diverging).
  git(upstreamBare, ['clone', '--bare', seed, upstreamBare])
  git(originBare, ['clone', '--bare', seed, originBare])
  git(work, ['clone', originBare, work])
  git(work, ['remote', 'add', 'upstream', upstreamBare])
  git(work, ['fetch', 'upstream'])
  return {work, upstreamDir: join(root, 'upstream-clone')}
}

/** Push an upstream dependency bump (manifest + one code file). */
function pushUpstreamBump(fixture: Fixture, toSpec: string): void {
  const clone = fixture.upstreamDir
  git(clone, ['clone', fixtureDir(fixture), clone])
  const manifest = {
    name: 'fixture-dashboard',
    dependencies: {'left-pad': toSpec},
  }
  writeFileSync(join(clone, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  writeFileSync(join(clone, 'src-fix.txt'), 'code change riding the bump\n')
  git(clone, ['add', '.'])
  git(clone, ['commit', '-m', `chore(deps): left-pad ${toSpec} (#999)`])
  git(clone, ['push', 'origin', 'HEAD:main'])
  // Refresh the work repo's tracking ref — the merge must see the bump.
  git(fixture.work, ['fetch', 'upstream'])
}

function fixtureDir(fixture: Fixture): string {
  // the upstream bare lives at <root>/upstream.git — recover it from git remotes
  const res = spawnSync('git', ['remote', 'get-url', 'upstream'], {cwd: fixture.work, encoding: 'utf8'})
  if (res.status !== 0) throw new Error(res.stderr)
  return res.stdout.trim()
}

describe('scripts/absorb-manifest-parity.ts (rm-1983)', () => {
  it('drop class RED: absorbed bump ancestor with stale manifest → exit 1 + violation', () => {
    const fixture = seedFixture()
    pushUpstreamBump(fixture, '^1.2.0')

    // The absorb: upstream content enters ancestry, the union resolution
    // "loses" the manifest lines — `git merge -s ours` reproduces exactly
    // that end state (ancestry recorded, fork manifest untouched).
    git(fixture.work, ['merge', '-s', 'ours', '--no-ff', 'upstream/main', '-m', 'absorb upstream (dropped manifest)'])

    const res = run(['--upstream', 'upstream', '--no-fetch'], fixture.work)
    expect(res.status).toBe(1)
    const payload = parseGuardOutput(res.stdout)
    expect(payload.violations).toEqual([
      {manifest: 'package.json', package: 'left-pad', absorbed: '^1.2.0', ours: '^1.0.0'},
    ])
    expect(payload.absorbed_bump_commits).toBe(1)
    expect(payload.checked_dependencies).toBe(1)
  })

  it('parity GREEN: absorbed bump actually landed in the manifest → exit 0', () => {
    const fixture = seedFixture()
    pushUpstreamBump(fixture, '^1.2.0')
    git(fixture.work, ['merge', '--no-ff', '--no-edit', 'upstream/main', '-m', 'absorb upstream'])

    const res = run(['--upstream', 'upstream', '--no-fetch'], fixture.work)
    expect(res.status).toBe(0)
    const payload = parseGuardOutput(res.stdout)
    expect(payload.violations).toEqual([])
    expect(payload.checked_dependencies).toBe(1)
  })

  it('open window ignored: upstream bump NOT yet absorbed → exit 0, nothing checked', () => {
    const fixture = seedFixture()
    pushUpstreamBump(fixture, '^1.2.0')
    // no merge — the bump stays in the open absorb window

    const res = run(['--upstream', 'upstream', '--no-fetch'], fixture.work)
    expect(res.status).toBe(0)
    const payload = parseGuardOutput(res.stdout)
    expect(payload.absorbed_bump_commits).toBe(0)
    expect(payload.checked_dependencies).toBe(0)
    expect(payload.violations).toEqual([])
  })

  it('fail-closed: unusable upstream remote → exit 2, never a silent pass', () => {
    const fixture = seedFixture()
    git(fixture.work, ['remote', 'add', 'bogus', '/nonexistent/absorb-parity-remote.git'])
    const res = run(['--upstream', 'bogus'], fixture.work)
    expect(res.status).toBe(2)
    expect(res.stderr).toContain('failed')
  })
})
