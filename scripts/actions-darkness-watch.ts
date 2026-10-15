#!/usr/bin/env node
// scripts/actions-darkness-watch.ts
//
// Out-of-band Actions-darkness watchdog (rm-1411, run a79dc20458f1).
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
//   node scripts/actions-darkness-watch.ts
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
//
// Verdict semantics:
//   GREEN   no push/schedule-triggered workflow is both >2 days without a run
//           and owed one (pushed_at newer than its last run).
//   DARK    at least one such workflow exists. Exit code 3.
//   UNKNOWN inputs could not be read (API failure). Exit code 1.
//   GREEN exits 0, matching the estate-tripwire OK/UNKNOWN/DRIFT exit ladder
//   (0/1/3) so operator tooling can treat both probes uniformly.
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

export interface DarknessVerdict {
  verdict: 'GREEN' | 'DARK'
  candidates: number
  darkWorkflows: DarkWorkflow[]
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
}): DarknessVerdict {
  const nowMs = Date.parse(input.now)
  const pushedMs = Date.parse(input.pushedAt)
  const candidates = input.workflows.filter(w => {
    const triggers = input.triggers[w.path] ?? []
    return triggers.some(t => PUSH_SCHEDULE_TRIGGERS.has(t))
  })
  const darkWorkflows: DarkWorkflow[] = []
  for (const workflow of candidates) {
    let latestMs = Number.NEGATIVE_INFINITY
    for (const run of input.runs) {
      if (run.workflowId !== workflow.id) continue
      const createdMs = Date.parse(run.createdAt)
      if (Number.isNaN(createdMs)) continue
      if (createdMs > latestMs) latestMs = createdMs
    }
    if (latestMs === Number.NEGATIVE_INFINITY) {
      // Never ran: dark as soon as anything was ever pushed.
      if (pushedMs > 0) {
        darkWorkflows.push({
          name: workflow.name,
          path: workflow.path,
          lastRun: 'never',
          ageDays: Number.POSITIVE_INFINITY,
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
  }
  return {
    verdict: darkWorkflows.length > 0 ? 'DARK' : 'GREEN',
    candidates: candidates.length,
    darkWorkflows,
  }
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

async function fetchJson<T>(url: string, token: string | undefined): Promise<T> {
  const headers: Record<string, string> = {Accept: 'application/vnd.github+json'}
  if (token !== undefined && token.length > 0) headers.Authorization = `Bearer ${token}`
  const response = await fetch(url, {headers})
  if (!response.ok) {
    throw new Error(`GET ${url} -> HTTP ${response.status}`)
  }
  return (await response.json()) as T
}

async function main(): Promise<number> {
  const repo = process.env.ACTIONS_DARKNESS_REPO ?? 'codeo1io/dashboard'
  const now = process.env.ACTIONS_DARKNESS_NOW ?? new Date().toISOString()
  const token = process.env.ACTIONS_DARKNESS_TOKEN ?? process.env.GITHUB_TOKEN
  try {
    const triggers = readLocalTriggers()
    const [apiWorkflows, apiRuns, repoInfo] = await Promise.all([
      fetchJson<ApiWorkflows>(
        `https://api.github.com/repos/${repo}/actions/workflows?per_page=100`,
        token,
      ),
      fetchJson<ApiRuns>(
        `https://api.github.com/repos/${repo}/actions/runs?per_page=100`,
        token,
      ),
      fetchJson<{pushed_at: string}>(`https://api.github.com/repos/${repo}`, token),
    ])
    const verdict = computeDarkness({
      workflows: apiWorkflows.workflows.map(w => ({id: w.id, path: w.path, name: w.name})),
      runs: apiRuns.workflow_runs.map(r => ({
        workflowId: r.workflow_id,
        createdAt: r.created_at,
      })),
      triggers,
      pushedAt: repoInfo.pushed_at,
      now,
    })
    const pushedAt = repoInfo.pushed_at
    console.log(
      `actions-darkness: verdict=${verdict.verdict} repo=${repo} now=${now} pushed_at=${pushedAt} candidates=${verdict.candidates}`,
    )
    for (const dark of verdict.darkWorkflows) {
      const age = Number.isFinite(dark.ageDays) ? `${dark.ageDays}d` : 'never-ran'
      console.log(`  dark: ${dark.name} (${dark.path}) last_run=${dark.lastRun} age=${age}`)
    }
    return verdict.verdict === 'DARK' ? 3 : 0
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
