#!/usr/bin/env node
import {spawnSync} from 'node:child_process'
/**
 * rm-1463: fork-own conductor PR-residue janitor.
 *
 * Conductor CI validation PRs (head refs matching conductor/ci-* or
 * conductor/run-*, rm-2128) accumulate
 * on codeo1io/dashboard when their runs land or abort: as of 2026-10-16 eight
 * PRs sat open, including four leaked drafts (#729/#732/#734/#735). This tool
 * triages them without mutating anything by default.
 *
 * Usage:
 *   node scripts/conductor-pr-janitor.ts [--repo owner/name] [--json]
 *        [--run-state <runId>=landed|aborted|live]...
 *        [--superseding-commit <sha>] [--apply] [--execute]
 *
 * Options accept both the `--opt value` and `--opt=value` forms.
 *
 * - Dry run (default): lists open PRs with a triage action per PR. Safe.
 * - --apply: additionally prints the exact `gh pr close` commands it would
 *   run for every `close` row. Still no mutation. When any row would close,
 *   --superseding-commit <sha> is REQUIRED so that every close names the
 *   commit that superseded the residue (rm-1463 acceptance).
 * - --execute: actually runs those commands. Requires --apply; refuses
 *   otherwise. Mutation is deliberately behind two flags.
 *
 * The open-PR listing is fetched with --limit 200: gh pr list silently caps
 * at 30 by default and the residue fleet passed 30-open-PRs scale during the
 * 2026-10-16 cycle. A stderr warning fires when the cap is hit so truncation
 * can never look like a complete sweep.
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

/** rm-2128: conductor heads in EITHER ephemeral namespace, ci- or run-. */
const CONDUCTOR_HEAD_PATTERN = /^conductor\/(?:ci|run)-/i

/** gh pr list caps at 30 results by default; the residue fleet is past that. */
export const OPEN_PR_LIMIT = 200

export function isConductorPr(headRefName: string): boolean {
  return CONDUCTOR_HEAD_PATTERN.test(headRefName)
}

/**
 * Extract the run id from a conductor head ref, e.g. conductor/ci-7a0e2163-foo
 * or conductor/run-3a969e4c6623 (rm-2128) -> '7a0e2163' / '3a969e4c6623'.
 * Returns null for non-conductor heads.
 */
export function runIdFromHead(headRefName: string): string | null {
  const match = /^conductor\/(?:ci|run)-([0-9a-f]+)/i.exec(headRefName)
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
  readonly supersedingCommit: string
  readonly runStates: Readonly<Record<string, ConductorRunState>>
}

export function parseRunStateArgs(
  args: readonly string[],
): Record<string, ConductorRunState> {
  const states: Record<string, ConductorRunState> = {}
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? ''
    let value: string | undefined
    if (arg.startsWith('--run-state=')) {
      value = arg.slice('--run-state='.length)
    } else if (arg === '--run-state') {
      value = args[i + 1]
      if (value === undefined) {
        throw new Error(
          'invalid --run-state (expected --run-state=<runId>=<landed|aborted|live>): missing value',
        )
      }
      i++
    }
    if (value === undefined) continue
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

/** Args after the `gh` binary for the open-PR listing (unit-pinned). */
export function ghPrListArgs(repo: string): string[] {
  return [
    'pr',
    'list',
    '-R',
    repo,
    '--state',
    'open',
    '--limit',
    String(OPEN_PR_LIMIT),
    '--json',
    'number,title,headRefName,isDraft,updatedAt,url',
  ]
}

export function fetchOpenPrs(repo: string): PrRecord[] {
  const result = spawnSync('gh', ghPrListArgs(repo), {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  if (result.status !== 0 || !result.stdout) {
    throw new Error(`gh pr list failed (status ${String(result.status)})`)
  }
  const prs = JSON.parse(result.stdout) as PrRecord[]
  if (prs.length >= OPEN_PR_LIMIT) {
    console.error(
      `warning: open-PR listing hit the --limit ${String(OPEN_PR_LIMIT)} cap — the sweep may be truncated; raise OPEN_PR_LIMIT`,
    )
  }
  return prs
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

/** The gh pr close comment: names the superseding commit (rm-1463 acceptance). */
export function supersededComment(
  row: TriageRow,
  supersedingCommit: string,
): string {
  return `superseded by ${supersedingCommit}: conductor validation PR whose run ${row.runState} (janitor rm-1463)`
}

export function closeCommand(
  row: TriageRow,
  repo: string,
  supersedingCommit: string,
): string {
  return `gh pr close ${String(row.number)} -R ${repo} --comment '${supersededComment(row, supersedingCommit)}'`
}

const SUPERSEDED_SHA_PATTERN = /^[0-9a-f]{7,40}$/i

function main(): number {
  const args = process.argv.slice(2)
  let repo = 'codeo1io/dashboard'
  let json = false
  let apply = false
  let execute = false
  let supersedingCommit = ''
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? ''
    if (arg.startsWith('--repo=')) {
      repo = arg.slice('--repo='.length)
    } else if (arg === '--repo') {
      const value = args[i + 1]
      if (value !== undefined) {
        repo = value
        i++
      }
    } else if (arg === '--json') {
      json = true
    } else if (arg === '--apply') {
      apply = true
    } else if (arg === '--execute') {
      execute = true
    } else if (arg.startsWith('--superseding-commit=')) {
      supersedingCommit = arg.slice('--superseding-commit='.length)
    } else if (arg === '--superseding-commit') {
      const value = args[i + 1]
      if (value !== undefined) {
        supersedingCommit = value
        i++
      }
    }
  }
  if (execute && !apply) {
    console.error('refusing: --execute requires --apply (mutation is behind two flags)')
    return 2
  }
  if (supersedingCommit !== '' && !SUPERSEDED_SHA_PATTERN.test(supersedingCommit)) {
    console.error(
      `refusing: --superseding-commit must be a commit sha (7-40 hex): ${supersedingCommit}`,
    )
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
    if (supersedingCommit === '') {
      console.error(
        'refusing: closing residue requires --superseding-commit=<sha> (rm-1463 acceptance: every close summary names its superseding commit)',
      )
      return 2
    }
    console.log(`\nclose summary (each superseded by ${supersedingCommit}):`)
    for (const row of closeRows) {
      console.log(`  #${String(row.number)} (${row.headRefName}) superseded by ${supersedingCommit}`)
    }
    console.log('\ncommands to close residue (run with --execute to apply):')
    for (const row of closeRows) console.log(`  ${closeCommand(row, repo, supersedingCommit)}`)
    if (execute) {
      for (const row of closeRows) {
        console.log(`executing: ${closeCommand(row, repo, supersedingCommit)}`)
        const result = spawnSync('gh', [
          'pr',
          'close',
          String(row.number),
          '-R',
          repo,
          '--comment',
          supersededComment(row, supersedingCommit),
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
