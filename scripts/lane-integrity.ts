#!/usr/bin/env node
/**
 * Landing-merge lane-integrity check (rm-1421).
 *
 * History: landing merge 91774d8 (2026-10-11) silently dropped
 * scripts/roadmap-census.ts and test/roadmap-integrity-guard.test.ts, both
 * present at lane tip 99925c1 — main lost a guard test with zero notice. The
 * landing pipeline assembles the integration commit from the candidate
 * delta, not from a literal git merge of the lane, so a lane file can be
 * absent from the result without any conflict to notice. The incident is
 * pinned as a regression in test/lane-integrity.test.ts.
 *
 * Usage (after every landing merge):
 *   node scripts/lane-integrity.ts <merge-sha> <lane-tip-sha>
 * Exit 0 = no lane file was dropped; exit 1 prints each dropped path.
 *
 * A removal is ALLOWED only when it is recorded: either the path is in
 * ALLOWED_LANE_REMOVALS below, or the landing commit message carries a
 * `retires: <path>[, <path>...]` line naming it.
 */
import {execFileSync} from 'node:child_process'
import process from 'node:process'

/** Retired-with-record lane files (empty today; keep entries rare and dated). */
export const ALLOWED_LANE_REMOVALS: ReadonlySet<string> = new Set([])

export interface LaneIntegrityResult {
  readonly ok: boolean
  /** Lane-tip files absent from the merge result with no recorded retirement. */
  readonly dropped: readonly string[]
  /** Lane-tip files absent from the merge result but explicitly recorded. */
  readonly recordedRemovals: readonly string[]
}

const RETIRE_MARKER_RE = /^retires?:\s*/im

/**
 * Pure core: given the tracked file lists of a lane tip and a landing merge
 * (plus the merge's commit message), decide whether the landing dropped any
 * lane file without recording the removal. Kept I/O-free so tests can pin
 * the semantics without git.
 */
export function diffLaneFiles(
  laneFiles: readonly string[],
  mergeFiles: readonly string[],
  landingMessage: string,
): LaneIntegrityResult {
  const mergeSet = new Set(mergeFiles)
  const recorded = new Set(
    landingMessage
      .split('\n')
      .filter(line => RETIRE_MARKER_RE.test(line))
      .flatMap(line => line.replace(RETIRE_MARKER_RE, '').split(/[\s,]+/).filter(Boolean)),
  )

  const dropped: string[] = []
  const recordedRemovals: string[] = []
  for (const file of laneFiles) {
    if (mergeSet.has(file)) continue
    if (recorded.has(file) || ALLOWED_LANE_REMOVALS.has(file)) {
      recordedRemovals.push(file)
    } else {
      dropped.push(file)
    }
  }

  return {ok: dropped.length === 0, dropped, recordedRemovals}
}

function listTrackedFiles(rev: string): string[] {
  return execFileSync('git', ['ls-tree', '-r', '--name-only', rev], {encoding: 'utf8'})
    .split('\n')
    .filter(Boolean)
}

function readCommitMessage(rev: string): string {
  return execFileSync('git', ['log', '-1', '--format=%B', rev], {encoding: 'utf8'})
}

/** Git plumbing over the real repository: check one landing merge against its lane tip. */
export function checkLandingMerge(merge: string, laneTip: string): LaneIntegrityResult {
  return diffLaneFiles(listTrackedFiles(laneTip), listTrackedFiles(merge), readCommitMessage(merge))
}

const invokedDirectly = process.argv[1] !== undefined && process.argv[1].endsWith('lane-integrity.ts')
if (invokedDirectly) {
  const [merge, laneTip] = process.argv.slice(2)
  if (merge === undefined || laneTip === undefined) {
    console.error('usage: node scripts/lane-integrity.ts <merge-sha> <lane-tip-sha>')
    process.exit(2)
  }
  const result = checkLandingMerge(merge, laneTip)
  if (!result.ok) {
    for (const file of result.dropped) {
      console.log(`lane file dropped by ${merge}: ${file}`)
    }
    console.log('If the removal is intentional, record it with a "retires: <path>" line in the landing message.')
    process.exit(1)
  }
  for (const file of result.recordedRemovals) {
    console.log(`recorded lane-file retirement: ${file}`)
  }
  console.log(`lane integrity ok: ${laneTip} fully present in ${merge}`)
}
