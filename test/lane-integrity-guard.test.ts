import {execFileSync} from 'node:child_process'
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import process from 'node:process'

import {describe, expect, it} from 'vitest'

/**
 * Lane-file-loss guard (rm-1020, run 61448784a089).
 *
 * Landing merges must not silently drop files that exist on the lane. The
 * recorded incidents: fc69b9124 ("fold autonomy-lane commits (843d081) into
 * adoption base", 2026-10-10) dropped 85 lane files — workflows, census
 * scripts, guard tests — while reporting success; CI has been dark for days
 * at a time, so only a repo-side guard catches this class.
 *
 * Detection rule (pure tree analysis over merge, parents, merge-base):
 * a file is LANE-LOST iff present@lane-parent ∧ absent@merge-result
 * ∧ ¬(absent@main-parent ∧ present@merge-base). The subtracted term is an
 * intentional deletion made on main between branch and landing — git carries
 * it through the merge (documented limitation: the 91774d8 pair, where main
 * parent 5b00c92 deleted scripts/roadmap-census.ts and
 * test/roadmap-integrity-guard.test.ts before the lane landed, is NOT
 * flaggable by tree analysis alone; rm-1020 records that incident).
 *
 * The core is a pure function; the live-history scan runs over the last
 * LAND_MERGE_WINDOW merge commits of this repository plus a synthetic tmp
 * git repo that reproduces both the loss (-s ours fold) and the clean path.
 */

const LAND_MERGE_WINDOW = 10

/** Historical incidents the window may still contain — each needs a justification. */
const KNOWN_INCIDENTS: Record<string, {subject: string; note: string}> = {
  fc69b9124: {
    subject: 'merge: fold autonomy-lane commits (843d081) into adoption base',
    note: 'rm-1020 recorded incident (2026-10-10): 85 lane files dropped by the fold; this guard was added because of it',
  },
}

export interface LaneFileSets {
  mergeFiles: ReadonlySet<string>
  mainParentFiles: ReadonlySet<string>
  laneParentFiles: ReadonlySet<string>
  mergeBaseFiles: ReadonlySet<string>
}

/** Files present on the lane tip but lost by the landing merge, excluding intentional main-side deletions. */
export function findLaneLostFiles(sets: LaneFileSets): string[] {
  const {mergeFiles, mainParentFiles, laneParentFiles, mergeBaseFiles} = sets
  const lost: string[] = []
  for (const file of laneParentFiles) {
    if (mergeFiles.has(file)) continue
    const intentionalMainDeletion = !mainParentFiles.has(file) && mergeBaseFiles.has(file)
    if (intentionalMainDeletion) continue
    lost.push(file)
  }
  return lost.sort()
}

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', args, {cwd, encoding: 'utf8'}).trim()
}

function trackedFiles(cwd: string, rev: string): Set<string> {
  return new Set(git(cwd, 'ls-tree', '-r', '--name-only', rev).split('\n').filter(Boolean))
}

function laneLostAt(cwd: string, mergeRev: string): string[] {
  const [mainParent = '', laneParent = ''] = git(cwd, 'rev-parse', `${mergeRev}^1`, `${mergeRev}^2`).split(/\s+/)
  const mergeBase = git(cwd, 'merge-base', mainParent, laneParent)
  const mainParentFiles = trackedFiles(cwd, mainParent)
  const laneParentFiles = trackedFiles(cwd, laneParent)
  return findLaneLostFiles({
    mergeFiles: trackedFiles(cwd, mergeRev),
    mainParentFiles,
    laneParentFiles,
    mergeBaseFiles: trackedFiles(cwd, mergeBase),
  })
}

function recentLandMerges(cwd: string, count: number): string[] {
  return git(cwd, 'rev-list', '--merges', '-n', String(count), 'HEAD').split(/\s+/).filter(Boolean)
}

function isKnownIncident(mergeSha: string): boolean {
  return Object.keys(KNOWN_INCIDENTS).some(prefix => mergeSha.startsWith(prefix))
}

function makeSyntheticRepo(): string {
  const cwd = mkdtempSync(join(tmpdir(), 'lane-integrity-guard-'))
  const commit = (msg: string) => git(cwd, 'commit', '--allow-empty', '-am', msg)
  git(cwd, 'init', '-b', 'main')
  git(cwd, 'config', 'user.email', 'guard@example.invalid')
  git(cwd, 'config', 'user.name', 'Lane Guard Test')
  writeFileSync(join(cwd, 'base.ts'), 'export {}\n')
  git(cwd, 'add', '.')
  git(cwd, 'commit', '-m', 'base')
  git(cwd, 'checkout', '-b', 'lane')
  writeFileSync(join(cwd, 'lane-file.ts'), 'export const lane = 1\n')
  git(cwd, 'add', '.')
  commit('lane adds lane-file')
  git(cwd, 'checkout', 'main')
  writeFileSync(join(cwd, 'main-file.ts'), 'export const main = 1\n')
  git(cwd, 'add', '.')
  commit('main adds main-file')
  return cwd
}

describe('lane-file-loss core rule (pure)', () => {
  it('flags a lane-only file dropped by the merge (the fold class)', () => {
    const lost = findLaneLostFiles({
      mergeFiles: new Set(['kept.ts']),
      mainParentFiles: new Set(['kept.ts', 'shared-lane-file.ts']),
      laneParentFiles: new Set(['kept.ts', 'shared-lane-file.ts', 'lane-only.ts']),
      mergeBaseFiles: new Set(['kept.ts']),
    })
    expect(lost).toEqual(['lane-only.ts', 'shared-lane-file.ts'])
  })

  it('does NOT flag an intentional deletion made on main before the landing (the 91774d8 shape)', () => {
    const lost = findLaneLostFiles({
      mergeFiles: new Set(['kept.ts']),
      mainParentFiles: new Set(['kept.ts']), // main deleted census.ts since base
      laneParentFiles: new Set(['kept.ts', 'census.ts']),
      mergeBaseFiles: new Set(['kept.ts', 'census.ts']),
    })
    expect(lost).toEqual([])
  })

  it('clean merge (nothing lost) yields an empty result', () => {
    const files = new Set(['a.ts', 'b.ts'])
    expect(
      findLaneLostFiles({
        mergeFiles: files,
        mainParentFiles: files,
        laneParentFiles: files,
        mergeBaseFiles: new Set(['a.ts']),
      }),
    ).toEqual([])
  })
})

describe('lane-file-loss guard over this repository', () => {
  const repoRoot = process.cwd()

  it(`recent land merges lose no lane files (window: last ${LAND_MERGE_WINDOW} merges)`, () => {
    const failures: string[] = []
    for (const mergeSha of recentLandMerges(repoRoot, LAND_MERGE_WINDOW)) {
      const lost = laneLostAt(repoRoot, mergeSha)
      if (lost.length === 0) continue
      if (isKnownIncident(mergeSha)) continue // recorded + justified above
      failures.push(`${mergeSha.slice(0, 9)} lost ${lost.length} lane files: ${lost.slice(0, 5).join(', ')}`)
    }
    expect(failures).toEqual([])
  })

  it('the detector WOULD have caught the recorded fc69b9124 fold incident (regression proof)', () => {
    // Direct scan, no known-incident shortcut: the fold dropped 85 lane
    // files present on both parents — exactly the class this guard exists
    // for. If this assertion ever fails, the rule has regressed.
    const lost = laneLostAt(repoRoot, 'fc69b9124')
    expect(lost.length).toBeGreaterThanOrEqual(80)
    expect(lost).toContain('scripts/roadmap-census.ts')
    expect(lost).toContain('test/roadmap-integrity-guard.test.ts')
  })

  it('the 91774d8 incident is the documented main-side-deletion limitation (rule excludes it)', () => {
    // Present@lane, absent@merge, but also absent@main-parent and
    // present@merge-base: main deleted them first; tree analysis cannot
    // distinguish this from intentional cleanup. Recorded here so the
    // limitation is tested, not discovered.
    const lost = laneLostAt(repoRoot, '91774d8')
    expect(lost).not.toContain('scripts/roadmap-census.ts')
    expect(lost).not.toContain('test/roadmap-integrity-guard.test.ts')
  })
})

describe('lane-file-loss guard against a synthetic repository (negative verification)', () => {
  it('RED: a fold merge that drops the lane file is detected', () => {
    const cwd = makeSyntheticRepo()
    try {
      git(cwd, 'merge', '-s', 'ours', '--no-edit', 'lane') // records lane, keeps main tree
      const mergeSha = git(cwd, 'rev-parse', 'HEAD').split(/\s+/)[0] ?? ''
      const lost = laneLostAt(cwd, mergeSha)
      expect(lost).toContain('lane-file.ts')
    } finally {
      rmSync(cwd, {recursive: true, force: true})
    }
  })

  it('GREEN: a true merge keeps the lane file and detects nothing', () => {
    const cwd = makeSyntheticRepo()
    try {
      git(cwd, 'merge', '--no-edit', 'lane')
      const mergeSha = git(cwd, 'rev-parse', 'HEAD').split(/\s+/)[0] ?? ''
      expect(laneLostAt(cwd, mergeSha)).toEqual([])
    } finally {
      rmSync(cwd, {recursive: true, force: true})
    }
  })
})
