#!/usr/bin/env node
// scripts/actions-darkness-watch.ts
//
// Out-of-band Actions-darkness watchdog (rm-1411, run a79dc20458f1;
// probe-truthfulness hardening rm-1478, run 26b6e1ab).
//
// Detects GitHub Actions run-creation darkness WITHOUT depending on Actions
// itself: queries the Actions REST API for the latest-run timestamps of every
// push/schedule-triggered workflow in this repository and raises ONE tracked
// signal when any of them shows run-creation dark for more than two days while
// the repository's pushed_at is newer than that workflow's last run (i.e. a run
// was owed by a push/schedule trigger and never created).
//
// Boundary (recorded with rm-289): the in-repo red-watch owns workflow-file
// drift; this script owns the out-of-band run-creation signal. It intentionally
// performs no repository writes and needs no CI lane — it is the probe you run
// locally while Actions is dark.
//
// Usage:
//   node scripts/actions-darkness-watch.ts [--dry-run]
//
// Environment:
//   ACTIONS_DARKNESS_REPO   Repository to probe (default: codeo1io/dashboard).
//   ACTIONS_DARKNESS_NOW    Override "now" (ISO-8601). Test seam — production
//                           callers omit this.
//   ACTIONS_DARKNESS_TOKEN  Optional GitHub token for the API reads (falls
//                           back to unauthenticated rate limits).
//   GITHUB_TOKEN            Fallback if ACTIONS_DARKNESS_TOKEN is unset.
//
// Inputs:
//   - Workflow triggers are parsed from the local .github/workflows/*.yaml
//     files (resolved relative to this script's repo root), because a dark
//     workflow has no runs to infer triggers from.
//   - Workflows, their runs, and pushed_at come from the live REST API.
//   - rm-1478: the runs census is PAGINATED (newest-first, per_page=100) with
//     a hard page cap and an all-candidates-seen early exit; the workflows
//     census is paginated with a hard cap that fails the probe if hit. Every
//     outbound fetch carries AbortSignal.timeout(FETCH_TIMEOUT_MS).
//
// Verdict semantics:
//   GREEN   no push/schedule-triggered workflow is both >2 days without a run
//           and owed one (pushed_at newer than its last run).
//   DARK    at least one such workflow exists (a *seen* workflow's latest run
//           is provable even under a capped census — the feed is newest-first,
//           so the first run observed per workflow is its latest). Exit code 3.
//   UNKNOWN inputs could not be read (API failure, workflow-census page cap),
//           or a candidate was never observed in a runs census that hit the
//           page cap without terminating: absence of runs is not evidence
//           when the census is truncated (rm-1478). Exit code 1.
//   GREEN exits 0, matching the estate-tripwire OK/UNKNOWN/DRIFT exit ladder
//   (0/1/3) so operator tooling can treat both probes uniformly.
//
//   --dry-run prints every candidate workflow's current classification and
//   exits 0 on any COMPLETED probe (including DARK verdicts); a failed probe
//   still exits 1.
//
// A run of ANY event kind counts as run-creation activity for its workflow:
// darkness means no runs at all are being created, not that a particular
// trigger misfired. Run counts for workflows that only ever run manually
// (workflow_dispatch & friends) are not considered candidates.

import {readdirSync, readFileSync} from 'node:fs'
import process from 'node:process'
import {fileURLToPath} from 'node:url'
import {parse} from 'yaml'

export const DARKNESS_THRESHOLD_MS = 48 * 60 * 60 * 1000

/** rm-1478 probe-truthfulness knobs. */
export const FETCH_TIMEOUT_MS = 15_000
export const MAX_RUNS_PAGES = 10 // hard cap: 10 x 100 = 1000 runs per census
export const MAX_WORKFLOW_PAGES = 5 // hard cap: 5 x 100 = 500 workflows

export interface WorkflowSummary {
  id: number
  path: string
  name: string
}

export interface RunSummary {
  workflowId: number
  createdAt: string
}

/** workflow path (e.g. '.github/workflows/main.yaml') -> normalized trigger names */
export type TriggerIndex = Record<string, string[]>

export interface DarkWorkflow {
  name: string
  path: string
  lastRun: string | 'never'
  ageDays: number
}

/** rm-1478: a candidate whose absence cannot be trusted as evidence. */
export interface UnknownWorkflow {
  name: string
  path: string
  reason: 'pagination-cap'
}

export type CandidateState = 'GREEN' | 'DARK' | 'UNKNOWN'

/** Per-candidate classification, printed by --dry-run. */
export interface CandidateClassification {
  name: string
  path: string
  state: CandidateState
  lastRun: string | 'never'
  ageDays: number
  detail: string
}

/**
 * rm-1478: whether the runs census provably terminated ('complete') or hit
 * the page cap with candidates still unobserved ('capped').
 */
export type RunsCoverage = 'complete' | 'capped'

export interface RunsCensus {
  runs: RunSummary[]
  coverage: RunsCoverage
}

export interface DarknessVerdict {
  verdict: 'GREEN' | 'DARK' | 'UNKNOWN'
  candidates: number
  darkWorkflows: DarkWorkflow[]
  unknownWorkflows: UnknownWorkflow[]
  candidateClassifications: CandidateClassification[]
}

const PUSH_SCHEDULE_TRIGGERS = new Set(['push', 'schedule'])

/** Normalize a parsed `on:` value (string | string[] | mapping) to trigger names. */
function normalizeOnValue(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string')
  if (value !== null && typeof value === 'object') {
    return Object.keys(value)
  }
  return []
}

/** Parse workflow files' text into a trigger index. */
export function classifyWorkflows(files: Record<string, string>): TriggerIndex {
  const index: TriggerIndex = {}
  for (const [path, text] of Object.entries(files)) {
    let doc: Record<string, unknown>
    try {
      const parsed: unknown = parse(text)
      if (parsed === null || typeof parsed !== 'object') continue
      doc = parsed as Record<string, unknown>
    } catch {
      continue
    }
    // YAML 1.2 keeps `on` a string key; some authors write the legacy boolean
    // form (`true:`), which YAML parses under the boolean's string rendering.
    const onKey = Object.keys(doc).find(k => k === 'on' || k === 'true')
    if (onKey === undefined) continue
    index[path] = normalizeOnValue(doc[onKey])
  }
  return index
}

export function computeDarkness(input: {
  workflows: WorkflowSummary[]
  runs: RunSummary[]
  triggers: TriggerIndex
  pushedAt: string
  now: string
  runsCoverage?: RunsCoverage
}): DarknessVerdict {
  const nowMs = Date.parse(input.now)
  const pushedMs = Date.parse(input.pushedAt)
  const coverage: RunsCoverage = input.runsCoverage ?? 'complete'
  const candidates = input.workflows.filter(w => {
    const triggers = input.triggers[w.path] ?? []
    return triggers.some(t => PUSH_SCHEDULE_TRIGGERS.has(t))
  })
  const latestByWorkflow = new Map<number, number>()
  for (const run of input.runs) {
    const createdMs = Date.parse(run.createdAt)
    if (Number.isNaN(createdMs)) continue
    const known = latestByWorkflow.get(run.workflowId)
    if (known === undefined || createdMs > known) {
      latestByWorkflow.set(run.workflowId, createdMs)
    }
  }
  const darkWorkflows: DarkWorkflow[] = []
  const unknownWorkflows: UnknownWorkflow[] = []
  const candidateClassifications: CandidateClassification[] = []
  for (const workflow of candidates) {
    const latestMs = latestByWorkflow.get(workflow.id)
    if (latestMs === undefined) {
      if (coverage === 'capped') {
        // rm-1478: the census hit its page cap without terminating, so this
        // candidate's newest run (if any) is only known to be older than the
        // capped window — neither "never ran" nor its staleness is provable.
        unknownWorkflows.push({
          name: workflow.name,
          path: workflow.path,
          reason: 'pagination-cap',
        })
        candidateClassifications.push({
          name: workflow.name,
          path: workflow.path,
          state: 'UNKNOWN',
          lastRun: 'never',
          ageDays: Number.POSITIVE_INFINITY,
          detail: 'no runs observed in a census capped at the page limit — cannot distinguish never-ran from truncation',
        })
        continue
      }
      // Never ran: dark as soon as anything was ever pushed.
      if (pushedMs > 0) {
        darkWorkflows.push({
          name: workflow.name,
          path: workflow.path,
          lastRun: 'never',
          ageDays: Number.POSITIVE_INFINITY,
        })
        candidateClassifications.push({
          name: workflow.name,
          path: workflow.path,
          state: 'DARK',
          lastRun: 'never',
          ageDays: Number.POSITIVE_INFINITY,
          detail: 'never ran (verified by a complete census) while the repository has been pushed to',
        })
      } else {
        candidateClassifications.push({
          name: workflow.name,
          path: workflow.path,
          state: 'GREEN',
          lastRun: 'never',
          ageDays: Number.POSITIVE_INFINITY,
          detail: 'never ran but nothing is owed (repository never pushed)',
        })
      }
      continue
    }
    const stale = nowMs - latestMs > DARKNESS_THRESHOLD_MS
    const owed = pushedMs > latestMs
    if (stale && owed) {
      darkWorkflows.push({
        name: workflow.name,
        path: workflow.path,
        lastRun: new Date(latestMs).toISOString(),
        ageDays: Math.round(((nowMs - latestMs) / (24 * 60 * 60 * 1000)) * 10) / 10,
      })
    }
    candidateClassifications.push({
      name: workflow.name,
      path: workflow.path,
      state: stale && owed ? 'DARK' : 'GREEN',
      lastRun: new Date(latestMs).toISOString(),
      ageDays: Math.round(((nowMs - latestMs) / (24 * 60 * 60 * 1000)) * 10) / 10,
      detail:
        stale && owed
          ? 'stale beyond the threshold and owed a run by a newer push'
          : pushedMs > latestMs
            ? 'owed a run by a newer push but under the staleness threshold'
            : 'no push since its last run (nothing owed)',
    })
  }
  const verdict: DarknessVerdict['verdict'] =
    darkWorkflows.length > 0 ? 'DARK' : unknownWorkflows.length > 0 ? 'UNKNOWN' : 'GREEN'
  return {
    verdict,
    candidates: candidates.length,
    darkWorkflows,
    unknownWorkflows,
    candidateClassifications,
  }
}

/**
 * rm-1478: paginate the newest-first runs feed until one of
 *   - a short/empty page (the census provably reached the end),
 *   - every candidate workflow has been observed (latests provably known),
 *   - the hard page cap (coverage 'capped' — unobserved candidates are
 *     unclassifiable: truncation, not evidence of absence).
 * fetchPage may throw (HTTP error / timeout abort); the error propagates and
 * the caller's probe reports UNKNOWN.
 */
export async function collectRuns(
  fetchPage: (page: number) => Promise<RunSummary[]>,
  candidateIds: Set<number>,
  options: {maxPages?: number; perPage?: number} = {},
): Promise<RunsCensus> {
  const maxPages = options.maxPages ?? MAX_RUNS_PAGES
  const perPage = options.perPage ?? 100
  const runs: RunSummary[] = []
  const seen = new Set<number>()
  for (let page = 1; page <= maxPages; page++) {
    const batch = await fetchPage(page)
    runs.push(...batch)
    for (const run of batch) seen.add(run.workflowId)
    const shortPage = batch.length < perPage
    const allCandidatesSeen =
      candidateIds.size > 0 && [...candidateIds].every(id => seen.has(id))
    if (shortPage || allCandidatesSeen) return {runs, coverage: 'complete'}
  }
  // Page cap reached. Candidates that WERE observed still have provable
  // latests (newest-first); only unobserved candidates are unclassifiable.
  const anyUnseen = [...candidateIds].some(id => !seen.has(id))
  return {runs, coverage: anyUnseen ? 'capped' : 'complete'}
}

/**
 * rm-1478: paginate the workflows census until a short page. The candidate set
 * must be complete for verdicts to mean anything, so hitting the cap throws
 * (the probe reports UNKNOWN) rather than silently truncating candidates.
 */
export async function collectWorkflows(
  fetchPage: (page: number) => Promise<WorkflowSummary[]>,
  options: {maxPages?: number; perPage?: number} = {},
): Promise<WorkflowSummary[]> {
  const maxPages = options.maxPages ?? MAX_WORKFLOW_PAGES
  const perPage = options.perPage ?? 100
  const all: WorkflowSummary[] = []
  for (let page = 1; page <= maxPages; page++) {
    const batch = await fetchPage(page)
    all.push(...batch)
    if (batch.length < perPage) return all
  }
  throw new Error(
    `workflow census exceeded the page cap (${maxPages} pages of ${perPage}) without terminating — candidate set may be truncated`,
  )
}

function repoRoot(): string {
  return fileURLToPath(new URL('..', import.meta.url))
}

/** Read local workflow files and parse their trigger classes. */
export function readLocalTriggers(): TriggerIndex {
  const dir = `${repoRoot()}.github/workflows`
  const files: Record<string, string> = {}
  for (const entry of readdirSync(dir)) {
    if (!entry.endsWith('.yaml') && !entry.endsWith('.yml')) continue
    files[entry] = readFileSync(`${dir}/${entry}`, 'utf8')
  }
  const index = classifyWorkflows(files)
  // Index keys are bare filenames; API paths are .github/workflows/<name>.
  const reindexed: TriggerIndex = {}
  for (const [name, triggers] of Object.entries(index)) {
    reindexed[`.github/workflows/${name}`] = triggers
  }
  return reindexed
}

interface ApiWorkflows {
  workflows: {id: number; path: string; name: string}[]
}

interface ApiRuns {
  workflow_runs: {workflow_id: number; created_at: string}[]
}

export async function fetchJson<T>(url: string, token: string | undefined): Promise<T> {
  const headers: Record<string, string> = {Accept: 'application/vnd.github+json'}
  if (token !== undefined && token.length > 0) headers.Authorization = `Bearer ${token}`
  const response = await fetch(url, {headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)})
  if (!response.ok) {
    throw new Error(`GET ${url} -> HTTP ${response.status}`)
  }
  return (await response.json()) as T
}

async function main(): Promise<number> {
  const repo = process.env.ACTIONS_DARKNESS_REPO ?? 'codeo1io/dashboard'
  const now = process.env.ACTIONS_DARKNESS_NOW ?? new Date().toISOString()
  const token = process.env.ACTIONS_DARKNESS_TOKEN ?? process.env.GITHUB_TOKEN
  const dryRun = process.argv.includes('--dry-run')
  try {
    const triggers = readLocalTriggers()
    const [apiWorkflows, repoInfo] = await Promise.all([
      collectWorkflows(async page =>
        fetchJson<ApiWorkflows>(
          `https://api.github.com/repos/${repo}/actions/workflows?per_page=100&page=${page}`,
          token,
        ).then(body => body.workflows),
      ),
      fetchJson<{pushed_at: string}>(`https://api.github.com/repos/${repo}`, token),
    ])
    const candidateIds = new Set(
      apiWorkflows
        .filter(w => (triggers[w.path] ?? []).some(t => PUSH_SCHEDULE_TRIGGERS.has(t)))
        .map(w => w.id),
    )
    const census = await collectRuns(
      async page =>
        fetchJson<ApiRuns>(
          `https://api.github.com/repos/${repo}/actions/runs?per_page=100&page=${page}`,
          token,
        ).then(body => body.workflow_runs.map(r => ({workflowId: r.workflow_id, createdAt: r.created_at}))),
      candidateIds,
    )
    const verdict = computeDarkness({
      workflows: apiWorkflows,
      runs: census.runs,
      triggers,
      pushedAt: repoInfo.pushed_at,
      now,
      runsCoverage: census.coverage,
    })
    const pushedAt = repoInfo.pushed_at
    console.log(
      `actions-darkness: verdict=${verdict.verdict} repo=${repo} now=${now} pushed_at=${pushedAt} candidates=${verdict.candidates} runs_census=${census.coverage}`,
    )
    if (dryRun) {
      for (const c of verdict.candidateClassifications) {
        const age = Number.isFinite(c.ageDays) ? `${c.ageDays}d` : 'never-ran'
        console.log(`  [dry-run] ${c.state} ${c.name} (${c.path}) last_run=${c.lastRun} age=${age} — ${c.detail}`)
      }
      console.log(
        `actions-darkness: [dry-run] probe completed; exiting 0 regardless of verdict (${verdict.verdict})`,
      )
      return 0
    }
    for (const dark of verdict.darkWorkflows) {
      const age = Number.isFinite(dark.ageDays) ? `${dark.ageDays}d` : 'never-ran'
      console.log(`  dark: ${dark.name} (${dark.path}) last_run=${dark.lastRun} age=${age}`)
    }
    for (const unknown of verdict.unknownWorkflows) {
      console.log(
        `  unknown: ${unknown.name} (${unknown.path}) reason=${unknown.reason} — cannot verify never-ran from a truncated census`,
      )
    }
    if (verdict.verdict === 'DARK') return 3
    if (verdict.verdict === 'UNKNOWN') return 1
    return 0
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`actions-darkness: verdict=UNKNOWN repo=${repo} error=${message}`)
    return 1
  }
}

const scriptPath = process.argv[1]
if (scriptPath !== undefined && scriptPath.endsWith('actions-darkness-watch.ts')) {
  process.exitCode = await main()
}
