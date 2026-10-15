/**
 * rm-873 unit tests — the actions-darkness verdict logic, exercised without
 * any network. The probe's live half (gh api reads) is validated by the
 * captured runs in the phase evidence; this suite pins the decision
 * function: grace-window semantics, commit coverage, per-workflow
 * staleness, window saturation, and the reproduction of the live
 * 2026-10-09 outage from the embedded dry-run snapshot.
 */
import {describe, expect, it} from 'vitest'

import {
  computeDarknessVerdict,
  DRY_RUN_SNAPSHOT,
  RUN_CREATION_GRACE_SECONDS,
  type MainlineCommit,
  type WorkflowRunSummary,
} from '../scripts/actions-darkness-watch.ts'

const RUN_LAST = '2026-10-09T01:59:31Z'
const COMMITS: readonly MainlineCommit[] = [
  {sha: 'cccccc', committedAt: '2026-10-15T00:00:00Z', subject: 'third landing'},
  {sha: 'bbbbbb', committedAt: '2026-10-14T00:00:00Z', subject: 'second landing'},
  {sha: 'aaaaaa', committedAt: '2026-10-08T00:00:00Z', subject: 'covered by the last run'},
]

describe('computeDarknessVerdict (rm-873)', () => {
  it('reports dark with every post-run commit uncovered when commits land after the newest run', () => {
    const verdict = computeDarknessVerdict({
      now: '2026-10-16T12:00:00Z',
      runs: [{workflow: 'Main', lastRunAt: RUN_LAST}],
      commits: COMMITS,
    })
    expect(verdict.verdict).toBe('dark')
    expect(verdict.lastRunAt).toBe('2026-10-09T01:59:31.000Z') // normalized ISO form
    expect(verdict.uncoveredCommits.map(commit => commit.sha)).toEqual(['cccccc', 'bbbbbb'])
    expect(verdict.windowSaturated).toBe(false)
    expect(verdict.darkSinceSeconds).toBe(Math.round((Date.parse('2026-10-16T12:00:00Z') - Date.parse(RUN_LAST)) / 1000))
  })

  it('is bright when a run newer than every commit exists', () => {
    const verdict = computeDarknessVerdict({
      now: '2026-10-16T12:00:00Z',
      runs: [{workflow: 'Main', lastRunAt: '2026-10-15T06:00:00Z'}],
      commits: COMMITS,
    })
    expect(verdict.verdict).toBe('bright')
    expect(verdict.uncoveredCommits).toEqual([])
    expect(verdict.reasons.join(' ')).toContain('every fetched commit predates')
  })

  it('forgives a commit inside the run-creation grace window', () => {
    // Commit 10 minutes after the newest run: a run for it may still be
    // being created (default grace 900s) — not uncovered.
    const graceCase = computeDarknessVerdict({
      now: '2026-10-15T01:00:00Z',
      runs: [{workflow: 'Main', lastRunAt: '2026-10-15T00:00:00Z'}],
      commits: [{sha: 'ingrace', committedAt: '2026-10-15T00:10:00Z', subject: 'recent push'}],
    })
    expect(graceCase.verdict).toBe('bright')

    // Same clock, commit 20 minutes after the newest run: past grace, still
    // no run — uncovered, dark.
    const pastGrace = computeDarknessVerdict({
      now: '2026-10-15T01:00:00Z',
      runs: [{workflow: 'Main', lastRunAt: '2026-10-15T00:00:00Z'}],
      commits: [{sha: 'pastgrace', committedAt: '2026-10-15T00:20:00Z', subject: 'stale push'}],
    })
    expect(pastGrace.verdict).toBe('dark')
    expect(pastGrace.graceSeconds).toBe(RUN_CREATION_GRACE_SECONDS)
  })

  it('honors a custom graceSeconds of zero (strict coverage)', () => {
    const verdict = computeDarknessVerdict({
      now: '2026-10-15T01:00:00Z',
      runs: [{workflow: 'Main', lastRunAt: '2026-10-15T00:00:00Z'}],
      commits: [{sha: 'oneSec', committedAt: '2026-10-15T00:00:01Z', subject: 'a second later'}],
      graceSeconds: 0,
    })
    expect(verdict.verdict).toBe('dark')
    expect(verdict.graceSeconds).toBe(0)
  })

  it('treats never-ran workflows as null and darkens on any commit', () => {
    const verdict = computeDarknessVerdict({
      now: '2026-10-16T12:00:00Z',
      runs: [{workflow: 'Main', lastRunAt: null}],
      commits: [{sha: 'first', committedAt: '2026-10-10T00:00:00Z', subject: 'initial commit'}],
    })
    expect(verdict.verdict).toBe('dark')
    expect(verdict.lastRunAt).toBeNull()
    expect(verdict.darkSinceSeconds).toBeNull()
    expect(verdict.reasons.join(' ')).toContain('has ever created a run')
  })

  it('is bright when nothing ever ran and no commits exist (vacuous, stated in reasons)', () => {
    const verdict = computeDarknessVerdict({
      now: '2026-10-16T12:00:00Z',
      runs: [{workflow: 'Main', lastRunAt: null}],
      commits: [],
    })
    expect(verdict.verdict).toBe('bright')
    expect(verdict.reasons.join(' ')).toContain('vacuously bright')
  })

  it('uses the newest run across workflows for coverage and reports each workflow idle time', () => {
    const runs: readonly WorkflowRunSummary[] = [
      {workflow: 'Fro Bot', lastRunAt: '2026-09-18T03:11:51Z'},
      {workflow: 'Main', lastRunAt: RUN_LAST},
      {workflow: 'GraphQL canary', lastRunAt: '2026-10-05T12:21:01Z'},
    ]
    const verdict = computeDarknessVerdict({
      now: '2026-10-16T12:00:00Z',
      runs,
      commits: COMMITS,
    })
    expect(verdict.lastRunAt).toBe('2026-10-09T01:59:31.000Z') // max across workflows, not the first entry
    expect(verdict.uncoveredCommits.map(commit => commit.sha)).toEqual(['cccccc', 'bbbbbb'])
    const byName = new Map(verdict.perWorkflow.map(entry => [entry.workflow, entry]))
    expect(byName.get('Fro Bot')?.lastRunAt).toBe('2026-09-18T03:11:51Z')
    expect(byName.get('GraphQL canary')?.idleSeconds).toBe(
      Math.round((Date.parse('2026-10-16T12:00:00Z') - Date.parse('2026-10-05T12:21:01Z')) / 1000),
    )
  })

  it('flags window saturation when every fetched commit is uncovered (depth is a floor)', () => {
    const saturated = Array.from({length: 30}, (_, index): MainlineCommit => ({
      sha: `sha${index}`,
      committedAt: `2026-10-1${Math.min(5, 0 + index)}T00:00:00Z`,
      subject: `dark landing ${index}`,
    }))
    const verdict = computeDarknessVerdict({
      now: '2026-10-16T12:00:00Z',
      runs: [{workflow: 'Main', lastRunAt: RUN_LAST}],
      commits: saturated,
    })
    expect(verdict.verdict).toBe('dark')
    expect(verdict.windowSaturated).toBe(true)
    expect(verdict.uncoveredCommits).toHaveLength(30)
    expect(verdict.reasons.join(' ')).toContain('outage is at least 30 commits deep')
  })

  it('reproduces the embedded 2026-10-09 outage snapshot as a dark verdict (dry-run parity)', () => {
    const verdict = computeDarknessVerdict({
      now: DRY_RUN_SNAPSHOT.now,
      runs: DRY_RUN_SNAPSHOT.runs,
      commits: DRY_RUN_SNAPSHOT.commits,
    })
    expect(verdict.verdict).toBe('dark')
    expect(verdict.lastRunAt).toBe('2026-10-09T01:59:31.000Z')
    expect(verdict.uncoveredCommits.map(commit => commit.sha)).toEqual([
      '3e3664c',
      '5d5f9be',
      'a385ca5',
      '5530b5e',
      'e895362',
      '0003850',
    ])
    expect(verdict.windowSaturated).toBe(true)
    expect(DRY_RUN_SNAPSHOT.runs).toHaveLength(11)
    expect(DRY_RUN_SNAPSHOT.totalUncoveredDepth).toBeGreaterThan(DRY_RUN_SNAPSHOT.commits.length)
  })
})
