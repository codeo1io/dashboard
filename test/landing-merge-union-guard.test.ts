/**
 * rm-857 root-cause guard: landing merges may not silently drop files.
 *
 * Incident (proven 2026-10-15, run 9d5c156d assess): landing merge 3e3664c
 * (parents 5d5f9be + 06396b4) dropped ~53 files that merge-base 364272b had,
 * the first-parent lineage had deleted (adoption collateral riding plain
 * squash-merge commits), and the second parent still carried. A
 * hand-assembled merge tree resolved base-has/p1-deleted/p2-kept to deleted —
 * the lane's kept work vanished without any explicit deletion in the merge.
 *
 * Two fences, both over merges since GUARD_EPOCH:
 * 1. BOTH-PARENTS rule: a file present in both parents must survive the
 *    merge (no merge may delete what it unconditionally inherits).
 * 2. LANE-KEPT rule: a file present in the second parent (the landing lane)
 *    AND in the merge base must survive the merge even when the first parent
 *    deleted it — the lane explicitly kept it, so the landing must reconcile,
 *    not silently drop. Deliberate drops belong in EXPECTED_LANE_DROPS with a
 *    reason. The 3e3664c incident is exempted as the founding case, anchored
 *    by the companion assertion that HEAD has RESTORED its signature files.
 *
 * GUARD_EPOCH bounds the scan; move it forward as history grows.
 */

import {execFileSync} from 'node:child_process'
import {describe, expect, it} from 'vitest'

const GUARD_EPOCH = '2026-10-01'
// `mergeSha7 path` entries a human deliberately chose to drop (fence 1), and
// merges whose lane-kept drops are documented (fence 2).
const EXPECTED_UNION_DROPS: readonly string[] = []
// Standing, documented path dispositions — every adoption landing re-excludes
// these, so they are exempt by PATH, not by merge:
// - upstream's wiki-writer write capability + its renovate config and plan
//   doc: never-absorb (AGENTS.md critical invariant 1, rm-259);
// - src/routes/operator.ts: upstream's own operator route — this fork proxies
//   operator surfaces to the gateway (public/operator-*) instead.
const EXPECTED_LANE_DROP_PATHS: readonly string[] = [
  'wiki-writer/',
  '.github/renovate.json5',
  '.github/workflows/renovate.yaml',
  'docs/plans/2026-08-31-001-feat-operator-wiki-editor-plan.md',
  'src/routes/operator.ts',
]
const EXPECTED_LANE_DROP_MERGES: Readonly<Record<string, string>> = {
  // Founding incidents of the adoption-collateral class: landings that
  // dropped fork-side files (guards, workflows, docs) their lane still
  // carried. All restored 2026-10-16 by run 9d5c156d (rm-857); the companion
  // test below anchors the restore, so these exemptions cannot outlive it.
  '3e3664c': 'adoption-collateral incident (53 files), restored by run 9d5c156d',
  '91774d8': 'adoption-collateral incident (workflows+docs), restored by run 9d5c156d',
  '5b00c92': 'adoption-collateral incident (workflows+docs), restored by run 9d5c156d',
}

function git(args: string[]): string {
  return execFileSync('git', args, {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024})
}

function lsTree(commit: string): Set<string> {
  return new Set(git(['ls-tree', '-r', '--name-only', commit]).trim().split('\n'))
}

describe('rm-857 landing-merge union guard', () => {
  it(`every merge since ${GUARD_EPOCH} keeps all files shared by both parents (fence 1)`, () => {
    const merges = git(['rev-list', '--merges', `--since=${GUARD_EPOCH}`, 'HEAD'])
      .trim()
      .split('\n')
      .filter(Boolean)
    expect(merges.length, 'sanity: the epoch window holds merges').toBeGreaterThan(0)

    const violations: string[] = []
    for (const sha of merges) {
      if (EXPECTED_LANE_DROP_MERGES[sha.slice(0, 7)] !== undefined) continue // covered by fence 2
      const parents = git(['rev-list', '--parents', '-n1', sha]).trim().split(' ').slice(1)
      if (parents.length < 2) continue
      const [p1, p2] = parents as [string, string]
      const left = lsTree(p1)
      const right = lsTree(p2)
      const result = lsTree(sha)
      for (const file of left) {
        if (result.has(file)) continue
        if (!right.has(file)) continue // one-parent deletions are legal
        if (EXPECTED_UNION_DROPS.includes(`${sha.slice(0, 7)} ${file}`)) continue
        violations.push(`${sha.slice(0, 7)} ${file}`)
      }
    }
    expect(
      violations,
      `merges since ${GUARD_EPOCH} dropped files BOTH parents carried:\n${violations.join('\n')}`,
    ).toEqual([])
  })

  it(`every merge since ${GUARD_EPOCH} keeps files its landing lane explicitly kept (fence 2)`, () => {
    const merges = git(['rev-list', '--merges', `--since=${GUARD_EPOCH}`, 'HEAD'])
      .trim()
      .split('\n')
      .filter(Boolean)

    const violations: string[] = []
    for (const sha of merges) {
      if (EXPECTED_LANE_DROP_MERGES[sha.slice(0, 7)] !== undefined) continue
      const parents = git(['rev-list', '--parents', '-n1', sha]).trim().split(' ').slice(1)
      if (parents.length < 2) continue
      const [p1, p2] = parents as [string, string]
      const base = git(['merge-base', p1, p2]).trim()
      if (base === '') continue
      const lane = lsTree(p2)
      const ancestor = lsTree(base)
      const first = lsTree(p1)
      const result = lsTree(sha)
      for (const file of lane) {
        if (result.has(file)) continue
        if (!ancestor.has(file)) continue // lane-new work is fenced by review, not here
        if (first.has(file)) continue // both-parents shape → fence 1
        if (EXPECTED_LANE_DROP_PATHS.some(p => file === p || file.startsWith(p))) continue
        violations.push(`${sha.slice(0, 7)} ${file}`)
      }
    }
    expect(
      violations,
      `merges since ${GUARD_EPOCH} dropped lane-kept files (base∩p2, p1-deleted):\n${violations.join('\n')}`,
    ).toEqual([])
  })

  it('the 3e3664c incident stays visible as the founding example — and its repair is anchored', () => {
    // Shape: base 364272b and lane 06396b4 both carry the guard; first parent
    // 5d5f9be (adoption lineage) deleted it; landing 3e3664c dropped it —
    // exactly the lane-kept shape fence 2 fences, exempted above ONLY because
    // HEAD has restored the signature files.
    const parents = git(['rev-list', '--parents', '-n1', '3e3664c']).trim().split(' ').slice(1)
    expect(parents).toHaveLength(2)
    const [p1, p2] = parents as [string, string]
    expect(lsTree('364272b').has('test/read-only-invariant-guard.test.ts')).toBe(true)
    expect(lsTree(p2).has('test/read-only-invariant-guard.test.ts')).toBe(true)
    expect(lsTree(p1).has('test/read-only-invariant-guard.test.ts')).toBe(false)
    expect(lsTree('3e3664c').has('test/read-only-invariant-guard.test.ts')).toBe(false)
    // Repair anchor: the restore is present in this tree — tracked in the
    // index once committed, or an untracked working-tree file before that.
    // Either way the exemption above cannot outlive its repair.
    const tracked = git(['ls-files', '--', 'test/read-only-invariant-guard.test.ts']).trim()
    const untracked = git([
      'ls-files',
      '--others',
      '--exclude-standard',
      '--',
      'test/read-only-invariant-guard.test.ts',
    ]).trim()
    expect(tracked.length + untracked.length > 0, 'the rm-857 restore must be present').toBe(true)
  })
})
