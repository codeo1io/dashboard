#!/usr/bin/env node
// scripts/actions-darkness-watch.ts
//
// rm-873 actions-darkness watchdog — a read-only probe that makes the
// "hosted CI is dark" failure state visible from inside the repository.
//
// Origin: 2026-10-16, run 528f458d assess. Every workflow in
// codeo1io/dashboard last created a run at 2026-10-09T01:59:31Z (Fro Bot
// earlier still, 2026-09-18), yet main kept advancing — 57 commits through
// 3e3664c (2026-10-15) landed with zero check-runs of any kind, and nothing
// in-repo could see it: the gate workflows themselves are dark, so the
// outage is invisible exactly when it matters. This script is the local,
// read-only counterweight: it compares the newest workflow-run creation
// timestamp across every workflow against commit timestamps on the default
// branch and renders a verdict.
//
// Verdict model: a commit is UNCOVERED when it is newer than the newest
// workflow-run creation timestamp across all workflows, beyond a grace
// window (GitHub normally creates a run within seconds of a push; 15 min is
// a generous allowance). One or more uncovered commits on the default
// branch => DARK. The max across workflows is exact from live data because
// every workflow's newest run is fetched with per_page=1.
//
// Read-only by construction: gh api GETs only (workflows list, per-workflow
// latest run, default-branch commits, repo metadata). No mutation path
// exists in this script. rm-288 zero-import discipline: node builtins only,
// so the probe runs from a pristine checkout with no install.
//
// Usage:
//   node scripts/actions-darkness-watch.ts [--repo owner/name] [--dry-run] [--json]
//
//   --repo     target repository (default: GH_REPO, else GITHUB_REPOSITORY,
//              else codeo1io/dashboard)
//   --dry-run   no network at all — reproduce the 2026-10-09 outage from the
//              embedded live snapshot below (captured 2026-10-16)
//   --json      machine-readable verdict object on stdout
//
// Exit codes: 0 = bright, 1 = dark, 2 = usage/transport error.

import {spawnSync} from 'node:child_process'
import {realpathSync} from 'node:fs'
import process from 'node:process'
import {fileURLToPath} from 'node:url'

/** How long after a commit a run may still be considered "being created" before the commit counts as uncovered. */
export const RUN_CREATION_GRACE_SECONDS = 900

/** Newest default-branch commits fetched per probe — bounds the report and detects window saturation. */
export const COMMIT_WINDOW = 30

export interface WorkflowRunSummary {
  /** Workflow name as GitHub reports it (stable across renames of the file). */
  readonly workflow: string
  /** ISO-8601 creation timestamp of the workflow's newest run, or null when it has none at all. */
  readonly lastRunAt: string | null
}

export interface MainlineCommit {
  readonly sha: string
  /** ISO-8601 committer date (matches push/landing time; author date can predate a rebase by weeks). */
  readonly committedAt: string
  readonly subject: string
}

export interface WorkflowStaleness {
  readonly workflow: string
  readonly lastRunAt: string | null
  /** Seconds between the newest run and `now`; null when the workflow never ran. */
  readonly idleSeconds: number | null
}

export interface DarknessVerdict {
  readonly verdict: 'dark' | 'bright'
  /** Newest run-creation timestamp across every workflow; null when nothing ever ran. */
  readonly lastRunAt: string | null
  /** Seconds between `lastRunAt` and `now`; null when nothing ever ran. */
  readonly darkSinceSeconds: number | null
  readonly uncoveredCommits: readonly MainlineCommit[]
  readonly perWorkflow: readonly WorkflowStaleness[]
  /** True when every fetched commit is uncovered — the outage is at least COMMIT_WINDOW commits deep. */
  readonly windowSaturated: boolean
  readonly graceSeconds: number
  readonly reasons: readonly string[]
}

export function computeDarknessVerdict(input: {
  readonly now: string
  readonly runs: readonly WorkflowRunSummary[]
  readonly commits: readonly MainlineCommit[]
  readonly graceSeconds?: number
}): DarknessVerdict {
  const graceSeconds = input.graceSeconds ?? RUN_CREATION_GRACE_SECONDS
  const nowMs = Date.parse(input.now)
  const lastRunMs = input.runs.reduce<number | null>((newest, run) => {
    if (run.lastRunAt === null) return newest
    const at = Date.parse(run.lastRunAt)
    return newest === null || at > newest ? at : newest
  }, null)
  const lastRunAt = lastRunMs === null ? null : new Date(lastRunMs).toISOString()
  const darkSinceSeconds = lastRunMs === null ? null : Math.max(0, Math.round((nowMs - lastRunMs) / 1000))

  const uncoveredCommits =
    lastRunMs === null
      ? [...input.commits]
      : input.commits.filter(commit => Date.parse(commit.committedAt) > lastRunMs + graceSeconds * 1000)
  const windowSaturated = input.commits.length > 0 && uncoveredCommits.length === input.commits.length

  const perWorkflow: WorkflowStaleness[] = input.runs.map(run => ({
    workflow: run.workflow,
    lastRunAt: run.lastRunAt,
    idleSeconds:
      run.lastRunAt === null ? null : Math.max(0, Math.round((nowMs - Date.parse(run.lastRunAt)) / 1000)),
  }))

  const reasons: string[] = []
  if (lastRunAt === null && input.commits.length > 0) {
    reasons.push(
      `no workflow in the repository has ever created a run, while ${input.commits.length} commit(s) exist on the default branch`,
    )
  } else if (uncoveredCommits.length > 0 && lastRunAt !== null) {
    reasons.push(
      `${uncoveredCommits.length} commit(s) on the default branch are newer than the newest workflow-run creation (${lastRunAt}) by more than the ${graceSeconds}s grace window`,
    )
  }
  if (windowSaturated) {
    reasons.push(
      `every one of the ${input.commits.length} newest fetched commits is uncovered — the outage is at least ${input.commits.length} commits deep`,
    )
  }
  if (uncoveredCommits.length === 0 && input.commits.length === 0) {
    reasons.push('no commits fetched on the default branch — nothing to cover, verdict is vacuously bright')
  }
  if (uncoveredCommits.length === 0 && input.commits.length > 0) {
    reasons.push(
      `every fetched commit predates the newest workflow-run creation (${lastRunAt}) plus the ${graceSeconds}s grace window`,
    )
  }

  return {
    verdict: uncoveredCommits.length > 0 ? 'dark' : 'bright',
    lastRunAt,
    darkSinceSeconds,
    uncoveredCommits,
    perWorkflow,
    windowSaturated,
    graceSeconds,
    reasons,
  }
}

/**
 * Embedded snapshot of the live 2026-10-09 outage, captured read-only on
 * 2026-10-16 (run 528f458d): all 11 in-repo workflows dark, 57 commits
 * landed since the newest run. The six newest commits are embedded — enough
 * to saturate nothing (verdict depth is honest: 6 of 6 fetched) while the
 * header records the true depth. `--dry-run` turns this into the verdict.
 */
export const DRY_RUN_SNAPSHOT: {
  readonly now: string
  readonly repo: string
  readonly runs: readonly WorkflowRunSummary[]
  readonly commits: readonly MainlineCommit[]
  readonly totalUncoveredDepth: number
} = {
  now: '2026-10-16T12:00:00.000Z',
  repo: 'codeo1io/dashboard',
  runs: [
    {workflow: 'Main', lastRunAt: '2026-10-09T01:59:31Z'},
    {workflow: 'Release', lastRunAt: '2026-10-09T01:51:54Z'},
    {workflow: 'CodeQL', lastRunAt: '2026-10-09T01:59:31Z'},
    {workflow: 'Dependency Review', lastRunAt: '2026-10-09T01:59:31Z'},
    {workflow: 'visual', lastRunAt: '2026-10-09T01:51:54Z'},
    {workflow: 'Scorecard supply-chain security', lastRunAt: '2026-10-09T01:51:54Z'},
    {workflow: 'Base image drift check', lastRunAt: '2026-10-08T02:39:56Z'},
    {workflow: 'GraphQL canary', lastRunAt: '2026-10-05T12:21:01Z'},
    {workflow: 'Upstream drift check', lastRunAt: '2026-10-05T12:15:03Z'},
    {workflow: 'Dependency audit', lastRunAt: '2026-10-05T10:48:22Z'},
    {workflow: 'Fro Bot', lastRunAt: '2026-09-18T03:11:51Z'},
  ],
  commits: [
    {
      sha: '3e3664c',
      committedAt: '2026-10-15T11:58:22Z',
      subject: 'merge: autonomously integrate run d8fdf8b79ad54a68883810c1fc29a2da',
    },
    {
      sha: '5d5f9be',
      committedAt: '2026-10-15T00:31:25Z',
      subject: 'roadmap: managed ROADMAP.md render refresh (hermes-autonomy roadmap-sync)',
    },
    {
      sha: 'a385ca5',
      committedAt: '2026-10-14T17:48:15Z',
      subject: 'Adopt upstream release 2026.10.25 (push-notification text fix #615) (#676)',
    },
    {
      sha: '5530b5e',
      committedAt: '2026-10-13T16:26:47Z',
      subject: 'merge: autonomously integrate run 12cac058aefb488da39213c3551145c4',
    },
    {
      sha: 'e895362',
      committedAt: '2026-10-13T15:17:56Z',
      subject: 'merge: adopt upstream release 2026.10.23 (Actions deps #613 — fro-bot/agent v0.122.0)',
    },
    {
      sha: '0003850',
      committedAt: '2026-10-13T12:37:08Z',
      subject: 'fix: repair gate-red base to green (reconcile origin/main 6acea88 + fork-side fixes)',
    },
  ],
  totalUncoveredDepth: 57,
}

function usage(message: string): never {
  console.error(`usage: node scripts/actions-darkness-watch.ts [--repo owner/name] [--dry-run] [--json]
${message}`)
  process.exit(2)
}

function ghApi(path: string): unknown {
  const res = spawnSync('gh', ['api', path], {encoding: 'utf8'})
  if (res.error !== undefined) {
    console.error(`darkness: gh unavailable — ${res.error.message} (use --dry-run for the offline snapshot)`)
    process.exit(2)
  }
  if (res.status !== 0) {
    console.error(`darkness: gh api ${path} failed (${res.status}): ${(res.stderr ?? '').trim()}`)
    process.exit(2)
  }
  try {
    return JSON.parse(res.stdout) as unknown
  } catch {
    console.error(`darkness: gh api ${path} returned non-JSON output`)
    process.exit(2)
  }
}

function collectLiveInputs(
  repo: string,
): {now: string; runs: WorkflowRunSummary[]; commits: MainlineCommit[]} {
  const repoMeta = ghApi(`repos/${repo}`) as {default_branch?: string}
  const branch = repoMeta.default_branch ?? 'main'

  const workflowsPayload = ghApi(`repos/${repo}/actions/workflows?per_page=100`) as {
    workflows?: {id?: number; name?: string}[]
  }
  const workflows = workflowsPayload.workflows ?? []
  if (workflows.length === 0) {
    console.error(`darkness: repository ${repo} reports no workflows — nothing to watch`)
    process.exit(2)
  }

  const runs: WorkflowRunSummary[] = workflows.map(workflow => {
    const runsPayload = ghApi(`repos/${repo}/actions/workflows/${workflow.id ?? 0}/runs?per_page=1`) as {
      workflow_runs?: {created_at?: string}[]
    }
    const newest = runsPayload.workflow_runs?.[0]?.created_at
    return {workflow: workflow.name ?? `workflow-${workflow.id ?? 0}`, lastRunAt: newest ?? null}
  })

  const commitsPayload = ghApi(`repos/${repo}/commits?sha=${branch}&per_page=${COMMIT_WINDOW}`) as {
    sha?: string
    commit?: {committer?: {date?: string}; message?: string}
  }[]
  const commits: MainlineCommit[] = (Array.isArray(commitsPayload) ? commitsPayload : []).map(entry => ({
    sha: (entry.sha ?? '').slice(0, 7),
    committedAt: entry.commit?.committer?.date ?? '',
    subject: (entry.commit?.message ?? '').split('\n', 1)[0] ?? '',
  }))
  if (commits.some(commit => commit.committedAt === '')) {
    console.error('darkness: a fetched commit lacks a committer date — refusing to guess coverage')
    process.exit(2)
  }

  return {now: new Date().toISOString(), runs, commits}
}

function formatDuration(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86_400)
  const hours = Math.floor((totalSeconds % 86_400) / 3600)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${Math.floor((totalSeconds % 3600) / 60)}m`
  return `${Math.max(0, Math.floor(totalSeconds / 60))}m`
}

function report(repo: string, verdict: DarknessVerdict, json: boolean): void {
  if (json) {
    console.log(JSON.stringify(verdict, null, 2))
    return
  }
  const head =
    verdict.verdict === 'dark'
      ? `darkness: DARK — ${repo}: ${verdict.uncoveredCommits.length} commit(s) on the default branch have no workflow run after them`
      : `darkness: bright — ${repo}: every fetched commit is covered by a newer workflow run`
  console.log(head)
  if (verdict.lastRunAt !== null && verdict.darkSinceSeconds !== null) {
    console.log(
      `  newest run creation: ${verdict.lastRunAt} (${formatDuration(verdict.darkSinceSeconds)} ago; grace ${verdict.graceSeconds}s)`,
    )
  } else {
    console.log('  newest run creation: none — no workflow in the repository has ever run')
  }
  for (const commit of verdict.uncoveredCommits) {
    console.log(`  uncovered: ${commit.sha} ${commit.committedAt} ${commit.subject}`)
  }
  if (verdict.windowSaturated) {
    console.log(`  window saturated: all ${verdict.uncoveredCommits.length} fetched commits are uncovered — depth is a floor`)
  }
  const staleness = verdict.perWorkflow
    .map(entry => `${entry.workflow}=${entry.lastRunAt ?? 'never'}`)
    .join(' | ')
  console.log(`  per-workflow last run: ${staleness}`)
  for (const reason of verdict.reasons) console.log(`  reason: ${reason}`)
}

function main(): void {
  const args = process.argv.slice(2)
  let repo = process.env.GH_REPO ?? process.env.GITHUB_REPOSITORY ?? 'codeo1io/dashboard'
  let dryRun = false
  let json = false
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === undefined) break
    if (arg === '--dry-run') dryRun = true
    else if (arg === '--json') json = true
    else if (arg === '--repo') {
      const value = args[index + 1]
      if (value === undefined || !/^[\w.-]+\/[\w.-]+$/.test(value)) usage('--repo needs an owner/name argument')
      repo = value
      index += 1
    } else usage(`unknown argument: ${arg}`)
  }

  const inputs = dryRun
    ? {now: DRY_RUN_SNAPSHOT.now, runs: DRY_RUN_SNAPSHOT.runs, commits: DRY_RUN_SNAPSHOT.commits}
    : collectLiveInputs(repo)
  const verdict = computeDarknessVerdict(inputs)
  if (dryRun) {
    console.log(
      `darkness: dry-run — reproducing the embedded ${DRY_RUN_SNAPSHOT.repo} snapshot (captured 2026-10-16; true uncovered depth ${DRY_RUN_SNAPSHOT.totalUncoveredDepth} commits)`,
    )
  }
  report(repo, verdict, json)
  process.exit(verdict.verdict === 'dark' ? 1 : 0)
}

// Execute only when invoked directly (`node scripts/actions-darkness-watch.ts`);
// test/actions-darkness-watch.test.ts imports the verdict logic in-process.
const invokedAsScript =
  process.argv[1] !== undefined && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)

if (invokedAsScript) main()
