import {execFileSync, spawnSync} from 'node:child_process'
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import process from 'node:process'

import {describe, expect, it} from 'vitest'

const HERE = import.meta.dirname
const SCRIPT = join(HERE, '..', 'scripts', 'absorb-verify.ts')

interface FixturePkg {
  name: string
  dependencies: Record<string, string>
}

interface Fixture {
  root: string
  seedDir: string
  upstreamDir: string
  workDir: string
  writeWorkPackage: (pkg: FixturePkg) => void
  writeWorkLockfile: (entries: {name: string; specifier: string; version: string}[]) => void
  advance: (subject: string, mutate: (pkg: FixturePkg) => void, options?: {syncLockfile?: boolean}) => void
  advanceLockfile: (subject: string, entries: {name: string; specifier: string; version: string}[]) => void
}

function git(dir: string, args: string[]): void {
  execFileSync(
    'git',
    ['-c', 'user.email=fixture@example.invalid', '-c', 'user.name=Fixture', ...args],
    {cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']},
  )
}

function lockfileText(entries: {name: string; specifier: string; version: string}[]): string {
  const lines = ["lockfileVersion: '9.0'", 'importers:', '  .:', '    dependencies:']
  for (const entry of entries) {
    lines.push(`      '${entry.name}':`)
    lines.push(`        specifier: ${entry.specifier}`)
    lines.push(`        version: ${entry.version}`)
  }
  return `${lines.join('\n')}\n`
}

function seedPackage(pkg: FixturePkg): string {
  return `${JSON.stringify(pkg, null, 2)}\n`
}

function buildFixture(basePkg: FixturePkg): Fixture {
  const root = mkdtempSync(join(tmpdir(), 'absorb-verify-'))
  const seedDir = join(root, 'seed')
  const upstreamDir = join(root, 'upstream.git')
  const workDir = join(root, 'work')
  mkdirSync(seedDir)
  writeFileSync(join(seedDir, 'package.json'), seedPackage(basePkg))
  // Seed the lockfile too: our side is verified from the working tree, so a
  // fixture without pnpm-lock.yaml would fail closed before any check runs.
  writeFileSync(
    join(seedDir, 'pnpm-lock.yaml'),
    lockfileText(
      Object.entries(basePkg.dependencies).map(([name, specifier]) => ({
        name,
        specifier,
        version: specifier.replace(/^[~^>=<\s]+/, ''),
      })),
    ),
  )
  git(seedDir, ['init', '--quiet', '--initial-branch=main'])
  git(seedDir, ['add', '.'])
  git(seedDir, ['commit', '--quiet', '-m', 'seed'])
  execFileSync('git', ['clone', '--bare', '--quiet', seedDir, upstreamDir], {encoding: 'utf8'})
  execFileSync('git', ['clone', '--quiet', seedDir, workDir], {encoding: 'utf8'})
  git(workDir, ['remote', 'add', 'autonomy-upstream', upstreamDir])
  git(workDir, ['fetch', '--quiet', 'autonomy-upstream'])

  const readSeedPackage = (): FixturePkg =>
    JSON.parse(execFileSync('cat', [join(seedDir, 'package.json')], {encoding: 'utf8'})) as FixturePkg

  const lockEntries = new Map<string, {name: string; specifier: string; version: string}>(
    Object.entries(basePkg.dependencies).map(([name, specifier]) => [
      name,
      {name, specifier, version: specifier.replace(/^[~^>=<\s]+/, '')},
    ]),
  )

  return {
    root,
    seedDir,
    upstreamDir,
    workDir,
    writeWorkPackage(pkg: FixturePkg): void {
      writeFileSync(join(workDir, 'package.json'), seedPackage(pkg))
    },
    writeWorkLockfile(entries: {name: string; specifier: string; version: string}[]): void {
      writeFileSync(join(workDir, 'pnpm-lock.yaml'), lockfileText(entries))
    },
    advance(subject: string, mutate: (pkg: FixturePkg) => void, options?: {syncLockfile?: boolean}): void {
      const pkg = readSeedPackage()
      mutate(pkg)
      writeFileSync(join(seedDir, 'package.json'), seedPackage(pkg))
      const files = ['package.json']
      // A real bump moves manifest and lockfile together; the syncLockfile
      // opt-out exists to fixture upstream manifest-only commits.
      if (options?.syncLockfile !== false) {
        for (const [name, specifier] of Object.entries(pkg.dependencies)) {
          lockEntries.set(name, {name, specifier, version: specifier.replace(/^[~^>=<\s]+/, '')})
        }
        writeFileSync(join(seedDir, 'pnpm-lock.yaml'), lockfileText([...lockEntries.values()]))
        files.push('pnpm-lock.yaml')
      }
      git(seedDir, ['add', ...files])
      git(seedDir, ['commit', '--quiet', '-m', subject])
      git(seedDir, ['push', '--quiet', upstreamDir, 'main'])
      git(workDir, ['fetch', '--quiet', 'autonomy-upstream'])
    },
    advanceLockfile(subject: string, entries: {name: string; specifier: string; version: string}[]): void {
      writeFileSync(join(seedDir, 'pnpm-lock.yaml'), lockfileText(entries))
      git(seedDir, ['add', 'pnpm-lock.yaml'])
      git(seedDir, ['commit', '--quiet', '-m', subject])
      git(seedDir, ['push', '--quiet', upstreamDir, 'main'])
      git(workDir, ['fetch', '--quiet', 'autonomy-upstream'])
    },
  }
}

interface RunResult {
  status: number | null
  stdout: string
  stderr: string
}

function runScript(args: string[], cwd: string): RunResult {
  // spawnSync occasionally surfaces transient fs pressure (EAGAIN) in CI;
  // absorb-window.test.ts retries the same way.
  for (let attempt = 0; ; attempt++) {
    const result = spawnSync(process.execPath, [SCRIPT, ...args], {
      cwd,
      encoding: 'utf8',
      timeout: 120_000,
    })
    const code = result.error === undefined ? undefined : (result.error as NodeJS.ErrnoException).code
    if (code !== 'EAGAIN' || attempt === 2) {
      return {
        status: result.status,
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? '',
      }
    }
  }
}

const HONO = '@hono/node-server'

function basePkg(): FixturePkg {
  return {name: 'fixture', dependencies: {[HONO]: '^2.1.3'}}
}

describe('absorb-verify — window dependency parity (rm-1972)', () => {
  it('catches the lockfile-only bump whose manifest specifier never moved (the PR #644 exact shape)', () => {
    const fixture = buildFixture({name: 'fixture', dependencies: {[HONO]: '^2.0.0'}})
    try {
      fixture.writeWorkLockfile([{name: HONO, specifier: '^2.0.0', version: '2.1.3'}])
      fixture.advanceLockfile('deps: bump @hono/node-server from 2.1.3 to 2.1.5 (#644)', [
        {name: HONO, specifier: '^2.0.0', version: '2.1.5'},
      ])
      const result = runScript(['--upstream', 'refs/remotes/autonomy-upstream/main'], fixture.workDir)
      expect(result.status).toBe(4)
      const payload = JSON.parse(result.stdout) as {checks: {name: string; verdict: string}[]}
      expect(payload.checks.find(check => check.name === HONO)?.verdict).toBe('RESOLUTION_DROP')
    } finally {
      rmSync(fixture.root, {recursive: true, force: true})
    }
  })

  it('passes the lockfile-only bump once the resolution is cured (manifest deliberately broader)', () => {
    const fixture = buildFixture({name: 'fixture', dependencies: {[HONO]: '^2.0.0'}})
    try {
      fixture.advanceLockfile('deps: bump @hono/node-server from 2.1.3 to 2.1.5 (#644)', [
        {name: HONO, specifier: '^2.0.0', version: '2.1.5'},
      ])
      fixture.writeWorkLockfile([{name: HONO, specifier: '^2.0.0', version: '2.1.5'}])
      const result = runScript(['--upstream', 'refs/remotes/autonomy-upstream/main'], fixture.workDir)
      expect(result.status).toBe(0)
      expect((JSON.parse(result.stdout) as {ok: boolean}).ok).toBe(true)
    } finally {
      rmSync(fixture.root, {recursive: true, force: true})
    }
  })

  it('flags the dropped lockfile resolution (the recorded 8d867b9b shape)', () => {
    const fixture = buildFixture(basePkg())
    try {
      fixture.advance('bump @hono/node-server to 2.1.5 (#644)', pkg => {
        pkg.dependencies[HONO] = '^2.1.5'
      })
      const result = runScript(['--upstream', 'refs/remotes/autonomy-upstream/main'], fixture.workDir)
      expect(result.status).toBe(4)
      const payload = JSON.parse(result.stdout) as {checks: {verdict: string}[]; probe_lines: string[]}
      expect(payload.checks[0]?.verdict).toBe('RESOLUTION_DROP')
      expect(payload.probe_lines[0]?.includes('#644')).toBe(true)
    } finally {
      rmSync(fixture.root, {recursive: true, force: true})
    }
  })

  it('passes a cured window (manifest and lockfile both moved)', () => {
    const fixture = buildFixture(basePkg())
    try {
      fixture.advance('bump @hono/node-server to 2.1.5 (#644)', pkg => {
        pkg.dependencies[HONO] = '^2.1.5'
      })
      fixture.writeWorkPackage({name: 'fixture', dependencies: {[HONO]: '^2.1.5'}})
      fixture.writeWorkLockfile([{name: HONO, specifier: '^2.1.5', version: '2.1.5'}])
      const result = runScript(['--upstream', 'refs/remotes/autonomy-upstream/main'], fixture.workDir)
      expect(result.status).toBe(0)
      const payload = JSON.parse(result.stdout) as {ok: boolean; checks: {verdict: string}[]}
      expect(payload.ok).toBe(true)
      expect(payload.checks[0]?.verdict).toBe('OK')
    } finally {
      rmSync(fixture.root, {recursive: true, force: true})
    }
  })

  it('flags an upstream-added dependency missing from ours', () => {
    const fixture = buildFixture(basePkg())
    try {
      fixture.advance('render run output as Markdown (#646)', pkg => {
        pkg.dependencies['markdown-it'] = '^15.0.3'
      })
      const result = runScript(['--upstream', 'refs/remotes/autonomy-upstream/main'], fixture.workDir)
      expect(result.status).toBe(4)
      const payload = JSON.parse(result.stdout) as {checks: {name: string; verdict: string}[]}
      expect(payload.checks.find(check => check.name === 'markdown-it')?.verdict).toBe('MISSING')
    } finally {
      rmSync(fixture.root, {recursive: true, force: true})
    }
  })

  it('flags manifest specifier drift when the lockfile already resolves the target', () => {
    const fixture = buildFixture(basePkg())
    try {
      fixture.advance('bump @hono/node-server to 2.1.5 (#644)', pkg => {
        pkg.dependencies[HONO] = '^2.1.5'
      })
      fixture.writeWorkLockfile([{name: HONO, specifier: '^2.1.3', version: '2.1.5'}])
      const result = runScript(['--upstream', 'refs/remotes/autonomy-upstream/main'], fixture.workDir)
      expect(result.status).toBe(4)
      const payload = JSON.parse(result.stdout) as {checks: {verdict: string}[]}
      expect(payload.checks[0]?.verdict).toBe('SPECIFIER_DRIFT')
    } finally {
      rmSync(fixture.root, {recursive: true, force: true})
    }
  })

  it('flags a manifest entry with no lockfile resolution as not installed', () => {
    const fixture = buildFixture(basePkg())
    try {
      fixture.advance(
        'render run output as Markdown (#646)',
        pkg => {
          pkg.dependencies['markdown-it'] = '^15.0.3'
        },
        {syncLockfile: false},
      )
      fixture.writeWorkPackage({
        name: 'fixture',
        dependencies: {[HONO]: '^2.1.3', 'markdown-it': '^15.0.3'},
      })
      const result = runScript(['--upstream', 'refs/remotes/autonomy-upstream/main'], fixture.workDir)
      expect(result.status).toBe(4)
      const payload = JSON.parse(result.stdout) as {checks: {name: string; verdict: string}[]}
      expect(payload.checks.find(check => check.name === 'markdown-it')?.verdict).toBe('NOT_INSTALLED')
    } finally {
      rmSync(fixture.root, {recursive: true, force: true})
    }
  })

  it('passes an empty window as a true clean result', () => {
    const fixture = buildFixture(basePkg())
    try {
      const result = runScript(['--upstream', 'refs/remotes/autonomy-upstream/main'], fixture.workDir)
      expect(result.status).toBe(0)
      const payload = JSON.parse(result.stdout) as {ok: boolean; checks: unknown[]}
      expect(payload.checks.length).toBe(0)
      expect(payload.ok).toBe(true)
    } finally {
      rmSync(fixture.root, {recursive: true, force: true})
    }
  })

  it('verifies a committed ref with --ours-ref (post-landing evidence)', () => {
    const fixture = buildFixture(basePkg())
    try {
      fixture.advance('bump @hono/node-server to 2.1.5 (#644)', pkg => {
        pkg.dependencies[HONO] = '^2.1.5'
      })
      fixture.writeWorkPackage({name: 'fixture', dependencies: {[HONO]: '^2.1.5'}})
      fixture.writeWorkLockfile([{name: HONO, specifier: '^2.1.5', version: '2.1.5'}])
      git(fixture.workDir, ['add', 'package.json', 'pnpm-lock.yaml'])
      git(fixture.workDir, ['commit', '--quiet', '-m', 'cure: absorb #644'])
      const result = runScript(
        ['--upstream', 'refs/remotes/autonomy-upstream/main', '--ours-ref', 'HEAD'],
        fixture.workDir,
      )
      expect(result.status).toBe(0)
      const payload = JSON.parse(result.stdout) as {ok: boolean; window: {ours: string}}
      expect(payload.ok).toBe(true)
      expect(payload.window.ours.startsWith('ref:')).toBe(true)
    } finally {
      rmSync(fixture.root, {recursive: true, force: true})
    }
  })

  it('attributes each dependency to its own bump commit', () => {
    const fixture = buildFixture(basePkg())
    try {
      fixture.advance('bump @hono/node-server to 2.1.5 (#644)', pkg => {
        pkg.dependencies[HONO] = '^2.1.5'
      })
      fixture.advance('react 19.3.1 (#647)', pkg => {
        pkg.dependencies.react = '^19.3.1'
      })
      const result = runScript(['--upstream', 'refs/remotes/autonomy-upstream/main'], fixture.workDir)
      expect(result.status).toBe(4)
      const payload = JSON.parse(result.stdout) as {
        dep_bump_commits: {subject: string}[]
        checks: {name: string; bump_commit: string}[]
      }
      expect(payload.dep_bump_commits.length).toBe(2)
      expect(
        payload.checks.find(check => check.name === 'react')?.bump_commit.includes('#647'),
      ).toBe(true)
    } finally {
      rmSync(fixture.root, {recursive: true, force: true})
    }
  })

  it('fails closed when our working-tree lockfile is unreadable', () => {
    const fixture = buildFixture(basePkg())
    try {
      fixture.advance('bump @hono/node-server to 2.1.5 (#644)', pkg => {
        pkg.dependencies[HONO] = '^2.1.5'
      })
      rmSync(join(fixture.workDir, 'pnpm-lock.yaml'))
      const result = runScript(['--upstream', 'refs/remotes/autonomy-upstream/main'], fixture.workDir)
      expect(result.status).toBe(3)
    } finally {
      rmSync(fixture.root, {recursive: true, force: true})
    }
  })

  it('fails closed when the upstream ref cannot be resolved', () => {
    const fixture = buildFixture(basePkg())
    try {
      const result = runScript(
        ['--upstream', 'refs/remotes/autonomy-upstream/does-not-exist'],
        fixture.workDir,
      )
      expect(result.status).toBe(3)
    } finally {
      rmSync(fixture.root, {recursive: true, force: true})
    }
  })

  it('exits 1 on usage errors', () => {
    const fixture = buildFixture(basePkg())
    try {
      const missing = runScript([], fixture.workDir)
      expect(missing.status).toBe(1)
      const unknown = runScript(['--bogus'], fixture.workDir)
      expect(unknown.status).toBe(1)
    } finally {
      rmSync(fixture.root, {recursive: true, force: true})
    }
  })
})
