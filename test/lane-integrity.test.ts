import {execFileSync} from 'node:child_process'
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {afterAll, describe, expect, it} from 'vitest'
import {checkLandingMerge, diffLaneFiles} from '../scripts/lane-integrity.ts'

/**
 * rm-1421: a landing merge may not silently drop a lane file. Pins:
 *  - pure semantics (drop flagged, recorded retirement honored)
 *  - a scratch landing merge that omits a lane file REDDENS the check
 *    (negative verification), and a `retires:` line turns it green
 *  - the historical incident: 91774d8 dropped the rm-678 guard pair that
 *    existed at lane tip 99925c1 (2026-10-11)
 */

const repoRoot = resolve(import.meta.dirname, '..')

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', args, {cwd, encoding: 'utf8'}).trim()
}

const scratch = mkdtempSync(join(tmpdir(), 'lane-integrity-'))
afterAll(() => {
  rmSync(scratch, {recursive: true, force: true})
})

function commitAll(cwd: string, message: string): void {
  git(cwd, 'add', '-A')
  git(cwd, '-c', 'user.email=test@example.com', '-c', 'user.name=test', 'commit', '-m', message, '--allow-empty')
}

describe('diffLaneFiles (pure core)', () => {
  it('identical lists pass', () => {
    expect(diffLaneFiles(['a.txt', 'b.txt'], ['a.txt', 'b.txt'], 'landing merge')).toEqual({
      ok: true,
      dropped: [],
      recordedRemovals: [],
    })
  })

  it('a lane file absent from the merge result is flagged as dropped', () => {
    const result = diffLaneFiles(['a.txt', 'lane-only.txt'], ['a.txt'], 'landing merge')
    expect(result.ok).toBe(false)
    expect(result.dropped).toEqual(['lane-only.txt'])
  })

  it('a `retires:` line in the landing message records the removal instead of flagging it', () => {
    const result = diffLaneFiles(['a.txt', 'lane-only.txt'], ['a.txt'], 'landing merge\n\nretires: lane-only.txt')
    expect(result.ok).toBe(true)
    expect(result.recordedRemovals).toEqual(['lane-only.txt'])
    expect(result.dropped).toEqual([])
  })

  it('only paths the retires line actually names are excused', () => {
    const result = diffLaneFiles(['a.txt', 'x.txt', 'y.txt'], ['a.txt'], 'retires: x.txt')
    expect(result.ok).toBe(false)
    expect(result.dropped).toEqual(['y.txt'])
    expect(result.recordedRemovals).toEqual(['x.txt'])
  })

  it('main-only files added by the landing merge are not drops', () => {
    const result = diffLaneFiles(['lane.txt'], ['lane.txt', 'main-only.txt'], 'landing merge')
    expect(result).toEqual({ok: true, dropped: [], recordedRemovals: []})
  })
})

describe('checkLandingMerge (negative verification on a scratch repository)', () => {
  it('a landing merge that omits a lane file REDDENS the check', () => {
    git(scratch, 'init', '-q', '-b', 'main', '.')
    writeFileSync(join(scratch, 'shared.txt'), 'base\n')
    commitAll(scratch, 'base')

    git(scratch, 'checkout', '-q', '-b', 'lane')
    writeFileSync(join(scratch, 'lane-only.txt'), 'lane work\n')
    commitAll(scratch, 'lane work')
    const laneTip = git(scratch, 'rev-parse', 'HEAD')

    git(scratch, 'checkout', '-q', 'main')
    writeFileSync(join(scratch, 'main-only.txt'), 'main work\n')
    commitAll(scratch, 'main work')

    // A true merge commit whose tree silently omits the lane file — the
    // exact shape of the 91774d8 incident.
    git(scratch, 'merge', '--no-ff', '--no-commit', '-q', 'lane')
    rmSync(join(scratch, 'lane-only.txt'))
    commitAll(scratch, 'landing merge')
    const merge = git(scratch, 'rev-parse', 'HEAD')

    const result = checkLandingMergeIn(scratch, merge, laneTip)
    expect(result.ok).toBe(false)
    expect(result.dropped).toContain('lane-only.txt')
  })

  it('a recorded retirement (`retires:` line) turns the same landing green', () => {
    rmSync(scratch, {recursive: true, force: true})
    const fresh = mkdtempSync(join(tmpdir(), 'lane-integrity-'))
    git(fresh, 'init', '-q', '-b', 'main', '.')
    writeFileSync(join(fresh, 'shared.txt'), 'base\n')
    commitAll(fresh, 'base')
    git(fresh, 'checkout', '-q', '-b', 'lane')
    writeFileSync(join(fresh, 'lane-only.txt'), 'lane work\n')
    commitAll(fresh, 'lane work')
    const laneTip = git(fresh, 'rev-parse', 'HEAD')
    git(fresh, 'checkout', '-q', 'main')
    git(fresh, 'merge', '--no-ff', '--no-commit', '-q', 'lane')
    rmSync(join(fresh, 'lane-only.txt'))
    git(fresh, 'add', '-A')
    git(
      fresh,
      '-c',
      'user.email=test@example.com',
      '-c',
      'user.name=test',
      'commit',
      '-m',
      'landing merge',
      '-m',
      'retires: lane-only.txt',
    )
    const merge = git(fresh, 'rev-parse', 'HEAD')

    const result = checkLandingMergeIn(fresh, merge, laneTip)
    expect(result.ok).toBe(true)
    expect(result.recordedRemovals).toEqual(['lane-only.txt'])
    rmSync(fresh, {recursive: true, force: true})
  })
})

describe('checkLandingMerge (historical regression, this repository)', () => {
  it('landing merge 91774d8 dropped the rm-678 guard pair present at lane tip 99925c1', () => {
    const result = checkLandingMerge(
      '91774d83030490d78f3bfc54821373b04f00f8c2',
      '99925c13e28fe7dc3dc24f12608fec11e3ada1b9',
    )
    expect(result.ok).toBe(false)
    expect(result.dropped).toContain('scripts/roadmap-census.ts')
    expect(result.dropped).toContain('test/roadmap-integrity-guard.test.ts')
  })
})

/**
 * Same as checkLandingMerge but pointed at an arbitrary git directory — the
 * scratch merges above live outside this repository.
 */
function checkLandingMergeIn(cwd: string, merge: string, laneTip: string) {
  const listFiles = (rev: string) =>
    execFileSync('git', ['ls-tree', '-r', '--name-only', rev], {cwd, encoding: 'utf8'})
      .split('\n')
      .filter(Boolean)
  const message = execFileSync('git', ['log', '-1', '--format=%B', merge], {cwd, encoding: 'utf8'})
  return diffLaneFiles(listFiles(laneTip), listFiles(merge), message)
}

describe('CLI exit code', () => {
  it('exit 1 + dropped path on the historical incident', () => {
    let stdout = ''
    let status = 0
    try {
      stdout = execFileSync(
        'node',
        [
          'scripts/lane-integrity.ts',
          '91774d83030490d78f3bfc54821373b04f00f8c2',
          '99925c13e28fe7dc3dc24f12608fec11e3ada1b9',
        ],
        {cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']},
      )
    } catch (error) {
      const failure = error as {stdout?: unknown; status?: number}
      stdout = String(failure.stdout ?? '')
      status = failure.status ?? -1
    }
    expect(status).toBe(1)
    expect(stdout).toContain('scripts/roadmap-census.ts')
  })
})
