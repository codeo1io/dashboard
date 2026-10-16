#!/usr/bin/env node
import {spawnSync} from 'node:child_process'
/**
 * rm-1463: fork-own conductor PR-residue janitor.
 *
 * Conductor CI validation PRs (head refs matching conductor/ci-*) accumulate
 * on codeo1io/dashboard when their runs land or abort: as of 2026-10-16 eight
 * PRs sat open, including four leaked drafts (#729/#732/#734/#735). This tool
 * triages them without mutating anything by default.
 *
 * Usage:
 *   node scripts/conductor-pr-janitor.ts [--repo owner/name] [--json]
 *        [--run-state <runId>=landed|aborted|live]...
 *        [--apply] [--execute]
 *
 * - Dry run (default): lists open PRs with a triage action per PR. Safe.
 * - --apply: additionally prints the exact `gh pr close` commands it would
 *   run for every `close` row. Still no mutation.
 * - --execute: actually runs those commands. Requires --apply; refuses
 *   otherwise. Mutation is deliberately behind two flags.
 *
 * Policy (classifyConductorPr):
 *   non-conductor head                    -> keep   (out of scope, never touched)
 *   conductor head, run landed or aborted -> close
 *   conductor head, run live              -> keep
 *   conductor head, run state unknown     -> report (report-only; needs the
 *                                             run's disposition resolved by a
 *                                             human/campaign before closing)
 *
 * Run states come from --run-state <runId>=<state> (repeatable); any conductor
 * PR whose run id has no explicit state resolves to unknown, i.e. report-only.
 * That keeps the default behavior read-only-safe.
 */
import process from 'node:process'

export type ConductorRunState = 'landed' | 'aborted' | 'live' | 'unknown'
export type TriageAction = 'close' | 'keep' | 'report'

export interface PrRecord {
  readonly number: number
  readonly title: string
  readonly headRefName: string
  readonly isDraft: boolean
  readonly updatedAt: string
  readonly url: string
}

export interface TriageRow {
  readonly number: number
  readonly headRefName: string
  readonly runState: ConductorRunState
  readonly action: TriageAction
  readonly reason: string
}

const CONDUCTOR_HEAD_PATTERN = /^conductor\/ci-/i

export function isConductorPr(headRefName: string): boolean {
  return CONDUCTOR_HEAD_PATTERN.test(headRefName)
}

/**
 * Extract the run id from a conductor head ref, e.g. conductor/ci-7a0e2163-foo
 * -> '7a0e2163'. Returns null for non-conductor heads.
 */
export function runIdFromHead(headRefName: string): string | null {
  const match = /^conductor\/ci-([0-9a-f]+)/i.exec(headRefName)
  const runId = match?.[1]
  return runId === undefined ? null : runId
}

export function classifyConductorPr(
  pr: PrRecord,
  runState: ConductorRunState,
): TriageRow {
  if (!isConductorPr(pr.headRefName)) {
    return {
      number: pr.number,
      headRefName: pr.headRefName,
      runState,
      action: 'keep',
      reason: 'non-conductor head — out of scope, never touched',
    }
  }
  if (runState === 'landed' || runState === 'aborted') {
    return {
      number: pr.number,
      headRefName: pr.headRefName,
      runState,
      action: 'close',
      reason: `conductor validation PR whose run ${runState} — superseded, residue`,
    }
  }
  if (runState === 'live') {
    return {
      number: pr.number,
      headRefName: pr.headRefName,
      runState,
      action: 'keep',
      reason: 'conductor validation PR whose run is live — still needed',
    }
  }
  return {
    number: pr.number,
    headRefName: pr.headRefName,
    runState: 'unknown',
    action: 'report',
    reason: 'run state unresolved — report-only until disposition is recorded',
  }
}

export function triage(
  prs: readonly PrRecord[],
  runStateFor: (pr: PrRecord) => ConductorRunState,
): TriageRow[] {
  return prs.map(pr => classifyConductorPr(pr, runStateFor(pr)))
}

export interface CliOptions {
  readonly repo: string
  readonly json: boolean
  readonly apply: boolean
  readonly execute: boolean
  readonly runStates: Readonly<Record<string, ConductorRunState>>
}

export function parseRunStateArgs(
  args: readonly string[],
): Record<string, ConductorRunState> {
  const states: Record<string, ConductorRunState> = {}
  for (const arg of args) {
    if (!arg.startsWith('--run-state=')) continue
    const value = arg.slice('--run-state='.length)
    const eq = value.indexOf('=')
    if (eq <= 0) {
      throw new Error(
        `invalid --run-state (expected --run-state=<runId>=<landed|aborted|live>): ${value}`,
      )
    }
    const runId = value.slice(0, eq)
    const state = value.slice(eq + 1)
    if (state !== 'landed' && state !== 'aborted' && state !== 'live') {
      throw new Error(`invalid run state ${state} for run ${runId}`)
    }
    states[runId] = state
  }
  return states
}

export function fetchOpenPrs(repo: string): PrRecord[] {
  const result = spawnSync(
    'gh',
    [
      'pr',
      'list',
      '-R',
      repo,
      '--state',
      'open',
      '--json',
      'number,title,headRefName,isDraft,updatedAt,url',
    ],
    {encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit']},
  )
  if (result.status !== 0 || !result.stdout) {
    throw new Error(`gh pr list failed (status ${String(result.status)})`)
  }
  return JSON.parse(result.stdout) as PrRecord[]
}

function renderTable(rows: readonly TriageRow[]): string {
  const lines = rows.map(
    row =>
      `#${String(row.number).padStart(4)}  ${row.action.padEnd(6)}  ${row.runState.padEnd(7)}  ${row.headRefName}\n        ${row.reason}`,
  )
  const summary = {
    close: rows.filter(r => r.action === 'close').length,
    keep: rows.filter(r => r.action === 'keep').length,
    report: rows.filter(r => r.action === 'report').length,
  }
  return [...lines, `summary: close=${String(summary.close)} keep=${String(summary.keep)} report=${String(summary.report)}`].join('\n')
}

function closeCommand(row: TriageRow, repo: string): string {
  return `gh pr close ${String(row.number)} -R ${repo} --comment 'superseded: conductor validation PR whose run ${row.runState} (janitor rm-1463)'`
}

function main(): number {
  const args = process.argv.slice(2)
  let repo = 'codeo1io/dashboard'
  let json = false
  let apply = false
  let execute = false
  for (const arg of args) {
    if (arg.startsWith('--repo=')) repo = arg.slice('--repo='.length)
    else if (arg === '--json') json = true
    else if (arg === '--apply') apply = true
    else if (arg === '--execute') execute = true
  }
  if (execute && !apply) {
    console.error('refusing: --execute requires --apply (mutation is behind two flags)')
    return 2
  }
  const runStates = parseRunStateArgs(args)
  const prs = fetchOpenPrs(repo)
  const rows = triage(prs, pr => {
    const runId = runIdFromHead(pr.headRefName)
    return runId !== null && runStates[runId] !== undefined
      ? runStates[runId]
      : 'unknown'
  })
  if (json) {
    console.log(JSON.stringify(rows, null, 2))
  } else {
    console.log(renderTable(rows))
  }
  const closeRows = rows.filter(row => row.action === 'close')
  if (apply && closeRows.length > 0) {
    console.log('\ncommands to close residue (run with --execute to apply):')
    for (const row of closeRows) console.log(`  ${closeCommand(row, repo)}`)
    if (execute) {
      for (const row of closeRows) {
        console.log(`executing: ${closeCommand(row, repo)}`)
        const result = spawnSync('gh', [
          'pr',
          'close',
          String(row.number),
          '-R',
          repo,
          '--comment',
          `superseded: conductor validation PR whose run ${row.runState} (janitor rm-1463)`,
        ])
        if (result.status !== 0) {
          console.error(`close failed for #${String(row.number)}`)
          return 1
        }
      }
    }
  }
  return 0
}

if (process.argv[1] !== undefined && process.argv[1].endsWith('conductor-pr-janitor.ts')) {
  process.exit(main())
}
