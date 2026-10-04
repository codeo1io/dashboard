#!/usr/bin/env node
import {appendFileSync} from 'node:fs'
// scripts/guard-watchdog.ts
//
// rm-289: alert route for scheduled-guard failures. The weekly guard
// workflows (audit, base-drift, upstream-drift, canary, scorecard) and the
// weekly CodeQL analyze run are the repository's only tripwires, and a
// conclusion on one of them was previously visible only to someone who
// already went looking — the 2026-09-28 canary failure (run 6823819758)
// sat unobserved for days. This script queries each guard's latest
// COMPLETED run via the Actions API and turns any red conclusion into a
// `::error::` annotation plus a red run (exit 1). Scheduled daily by
// .github/workflows/watchdog.yaml.
//
// Usage:
//   GITHUB_TOKEN=… node scripts/guard-watchdog.ts                  # live: exit 1 on red
//   GITHUB_TOKEN=… GUARD_WATCHDOG_DRY_RUN=1 node scripts/guard-watchdog.ts
//                                                                   # dry-run: report, always exit 0
//
// Exit codes:
//   0 = nothing to alert (or dry-run — report only)
//   1 = at least one red guard conclusion (live mode only)
//   2 = configuration error (missing token)
//
// Zero-import by design (node builtins only; fetch is global): the workflow
// needs a checkout + Node 24 and nothing else — the same pristine-checkout
// robustness class as the canary's registry import
// (docs/solutions/workflow-issues/zero-install-workflow-claim-false-on-import-chain-2026-09-30.md).
// test/guard-watchdog.test.ts imports the pure halves of this module and
// enforces the guard census both ways; the main-module guard below keeps the
// CLI entry from firing under that import.
//
// Channel precedence (docs/runbooks/guard-watchdog.md): the red run + error
// annotation is the authoritative signal. A deduplicated tracking issue is a
// best-effort secondary channel opened by the WORKFLOW (not this script),
// only when a live has_issues probe says issues are enabled — the fork's
// has_issues=false state (probed 2026-10-04) makes an unguarded gh issue
// call a guaranteed red herring (the base-drift rm-123 pattern).
import process from 'node:process'
import {pathToFileURL} from 'node:url'

/**
 * The scheduled guard set this watchdog watches. Kept in lockstep with the
 * workflow tree by test/guard-watchdog.test.ts: every workflow file that
 * carries a `schedule:` trigger must appear here or in
 * EXCLUDED_SCHEDULED_WORKFLOWS below.
 */
export const GUARD_WORKFLOWS: readonly string[] = [
  'audit.yaml',
  'base-drift.yaml',
  'upstream-drift.yaml',
  'canary.yaml',
  'scorecard.yaml',
  'codeql.yaml',
]

/**
 * Scheduled workflows deliberately NOT watched (each must actually carry a
 * schedule trigger, or the census test fails — no silent drift either way):
 * - fro-bot.yaml — disabled_manually on this fork with no FRO_BOT_PAT secret
 *   provisioned, so it never runs and never goes green; watching it would be
 *   a permanent false red.
 * - watchdog.yaml — this workflow. A red watchdog run IS the alert itself;
 *   watching our own alert runs would echo red on every later run forever,
 *   even after the underlying guard condition cleared.
 */
export const EXCLUDED_SCHEDULED_WORKFLOWS: readonly string[] = ['fro-bot.yaml', 'watchdog.yaml']

/**
 * Conclusions that mean a guard run went red. `timed_out` belongs here: a
 * guard that died to its own timeout-minutes is a failed guard, not a
 * non-verdict. `skipped`/`neutral`/`action_required` are treated as
 * non-alerting rather than green — they surface in the report table with
 * their actual conclusion.
 */
export const RED_CONCLUSIONS: readonly string[] = ['failure', 'cancelled', 'startup_failure', 'timed_out']

/** The subset of the Actions workflow-run shape this watchdog reads. */
export interface WorkflowRun {
  readonly id: number
  readonly name: string
  readonly event: string
  readonly status: string
  readonly conclusion: string | null
  readonly created_at: string
  readonly html_url: string
}

function isWorkflowRun(value: unknown): value is WorkflowRun {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as {status?: unknown}).status === 'string' &&
    ((value as {conclusion?: unknown}).conclusion === null ||
      typeof (value as {conclusion?: unknown}).conclusion === 'string')
  )
}

/**
 * The verdict run for one guard: the most recent run that has a real
 * conclusion. The Actions API lists newest-first, and the newest run may
 * legitimately still be in_progress/queued when the watchdog fires (e.g.
 * CodeQL's Wednesday 07:31Z run against a daily watch) — falling through to
 * the newest COMPLETED run keeps the verdict a real conclusion instead of
 * reading a null as green.
 */
export function selectVerdictRun(runs: readonly WorkflowRun[]): WorkflowRun | null {
  return runs.find(run => run.status === 'completed' && run.conclusion !== null) ?? null
}

export type VerdictKind = 'red' | 'green' | 'no-completed-run' | 'no-runs'

/**
 * Classify one guard from its newest runs (newest-first). `no-runs` and
 * `no-completed-run` are explicitly NOT alerts — a guard that has never fired
 * (upstream-drift before its first window) or is mid-run is not evidence of a
 * failure, and turning absence into a red would train the operator to ignore
 * the channel.
 */
export function verdictFor(runs: readonly WorkflowRun[]): VerdictKind {
  if (runs.length === 0) return 'no-runs'
  const run = selectVerdictRun(runs)
  if (!run) return 'no-completed-run'
  return RED_CONCLUSIONS.includes(run.conclusion ?? '') ? 'red' : 'green'
}

async function fetchRuns(repository: string, workflow: string, token: string): Promise<readonly WorkflowRun[]> {
  const response = await fetch(
    `https://api.github.com/repos/${repository}/actions/workflows/${workflow}/runs?per_page=5`,
    {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'x-github-api-version': '2022-11-28',
      },
    },
  )
  if (!response.ok) {
    throw new Error(`Actions API ${response.status} for ${workflow}: ${(await response.text()).slice(0, 200)}`)
  }
  const body: unknown = await response.json()
  const runs = (body as {workflow_runs?: unknown}).workflow_runs
  if (!Array.isArray(runs)) {
    throw new TypeError(`Actions API returned no workflow_runs array for ${workflow}`)
  }
  return runs.filter(isWorkflowRun)
}

interface GuardReport {
  readonly workflow: string
  readonly verdict: VerdictKind | 'unreadable'
  readonly detail: string
}

async function main(): Promise<number> {
  const dryRun = ['1', 'true', 'yes'].includes((process.env.GUARD_WATCHDOG_DRY_RUN ?? '').toLowerCase())
  const token = process.env.GITHUB_TOKEN
  if (token === undefined || token === '') {
    console.error('::error::GITHUB_TOKEN is required (the watchdog is GITHUB_TOKEN-only by design, rm-289)')
    return 2
  }

  // Same GITHUB_REPOSITORY convention as scripts/graphql-canary.ts: in Actions
  // this is always owner/repo; locally a well-formed value may override, junk
  // or absence falls back to the fork default.
  const repositoryMatches = /^([\w.-]+)\/([\w.-]+)$/.exec(process.env.GITHUB_REPOSITORY ?? '')
  const repository = repositoryMatches ? `${repositoryMatches[1]}/${repositoryMatches[2]}` : 'codeo1io/dashboard'

  const reports: GuardReport[] = []
  for (const workflow of GUARD_WORKFLOWS) {
    try {
      const runs = await fetchRuns(repository, workflow, token)
      const verdict = verdictFor(runs)
      if (verdict === 'red' || verdict === 'green') {
        const run = selectVerdictRun(runs)
        reports.push({
          workflow,
          verdict,
          detail:
            `latest completed run ${run?.name} (${run?.event}, ${run?.created_at}) concluded ` +
            `${run?.conclusion ?? 'null'}${run?.html_url === undefined ? '' : ` — ${run.html_url}`}`,
        })
      } else if (verdict === 'no-runs') {
        reports.push({workflow, verdict, detail: 'no runs yet — nothing to watch, not an alert'})
      } else {
        reports.push({workflow, verdict, detail: 'newest runs all still in progress/queued — not an alert'})
      }
    } catch (error) {
      // Fail loud on the tool, never read an unreadable guard as green — the
      // base-drift empty-digest convention (rm-166/rm-178). A renamed or
      // deleted workflow file surfaces here AND in the census test.
      reports.push({
        workflow,
        verdict: 'unreadable',
        detail: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const lines = [
    `## Scheduled guard watchdog (rm-289) — ${dryRun ? 'DRY RUN' : 'live'}`,
    '',
    `Repository: \`${repository}\` · guards: ${GUARD_WORKFLOWS.length} · mode: ${dryRun ? 'dry-run (report only, always exit 0)' : 'live (exit 1 on any red)'}`,
    '',
    '| Guard | Verdict | Detail |',
    '| --- | --- | --- |',
    ...reports.map(
      report => `| \`${report.workflow}\` | ${report.verdict} | ${report.detail.replaceAll('|', String.raw`\|`)} |`,
    ),
  ]
  const text = lines.join('\n')
  console.log(text)
  const stepSummary = process.env.GITHUB_STEP_SUMMARY
  if (stepSummary !== undefined && stepSummary !== '') {
    appendFileSync(stepSummary, `${text}\n`)
  }

  const reds = reports.filter(report => report.verdict === 'red')
  const unreadable = reports.filter(report => report.verdict === 'unreadable')
  for (const report of reds) {
    console.error(`::error::guard ${report.workflow} latest completed run is RED — ${report.detail} (rm-289 scheduled-guard watchdog)`)
  }
  for (const report of unreadable) {
    console.error(`::error::watchdog could not read ${report.workflow}: ${report.detail}`)
  }

  if (reds.length > 0 || unreadable.length > 0) {
    if (dryRun) {
      console.log(`dry-run: would exit 1 (${reds.length} red, ${unreadable.length} unreadable) — reporting only`)
      return 0
    }
    console.log(`verdict: ${reds.length} red, ${unreadable.length} unreadable — exiting 1 (red run is the alert)`)
    return 1
  }
  console.log(`all ${reports.length} guards green — nothing to alert`)
  return 0
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exit(await main())
}
