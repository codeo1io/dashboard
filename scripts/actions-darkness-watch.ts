#!/usr/bin/env node
// Detects GitHub Actions run-creation darkness WITHOUT depending on Actions
// itself: queries the Actions REST API for the latest-run timestamps of every
// push/schedule-triggered workflow in this repository (per-workflow reads) and
// raises ONE tracked signal when any lane is beyond its cadence-aware
// threshold without a run, or when the main head commit is newer than a
// candidate lane's last run (a push was owed but no run followed — the usual
// trigger misfire). Run counts for workflows that only ever run manually
// (workflow_dispatch & friends) are not considered candidates.
//
// Verdict semantics:
//   GREEN   no push/schedule-triggered workflow is beyond its lane threshold
//           without a run, and no push-owed lane exists (main-head commit
//           newer than its last run).
//   DARK    at least one such workflow exists. Exit code 3.
//   UNKNOWN a candidate lane's run timestamps — or a clock input (the now
//           override / main-head commit date) — are present but unparseable
//           (fail closed: never silently green). Exit code 4.
//   API failures also surface as UNKNOWN with exit code 1.
//   GREEN exits 0. The ladder 0/1/3/4 extends the estate-tripwire
//   OK/UNKNOWN/DRIFT exit ladder (0/1/3) so operator tooling can treat both
//   probes uniformly.
//
// Lane thresholds (rm-1411 repair): a lane whose cron schedules are known is
// dark when it has no run newer than max(48h, longest cron gap over a
// daily-repeating grid + 12h grace) — cadence-owed, no push needed. Lanes
// without known crons keep the conservative rule: dark only when both >48h
// stale AND a push was owed (main-head commit newer than the last run).
//
// Latest-run reads are PER WORKFLOW (.../actions/workflows/<id>/runs?
// per_page=1), so a busy lane can never push another lane's true last run
// out of the fetch window the way a repo-wide page did. Reads carry a 15s
// timeout.

import {readdirSync, readFileSync} from 'node:fs'
import process from 'node:process'
import {fileURLToPath} from 'node:url'
import {parse} from 'yaml'

export const DARKNESS_THRESHOLD_MS = 48 * 60 * 60 * 1000

/** Grace added on top of a lane's longest cron gap before it reads dark. */
export const SCHEDULE_GRACE_MS = 12 * 60 * 60 * 1000

/** Fallback for unparseable crons: assume at-least-weekly cadence. */
const WEEK_FALLBACK_MS = 7 * 24 * 60 * 60 * 1000

const MINUTES_PER_DAY = 24 * 60

/** Longest gap between fires of the cron union over a repeating day grid. */
export function maxCronGapMs(crons: string[]): number {
  const minutes = new Set<number>()
  let parseable = false
  for (const raw of crons) {
    const fields = raw.trim().split(/\s+/)
    if (fields.length !== 5) continue
    const [minute, hour, dom, month, dow] = fields as [string, string, string, string, string]
    // Only the widely used subset: minute/hour may be *, n, */n, lists, or
    // ranges; dom/month/dow must be * (otherwise fall back to weekly).
    if (dom !== '*' || month !== '*' || dow !== '*') continue
    const expand = (spec: string, max: number): number[] | null => {
      if (spec === '*') return Array.from({length: max + 1}, (_, i) => i)
      const values: number[] = []
      for (const part of spec.split(',')) {
        const stepMatch = /^\*\/(\d+)$/.exec(part)
        const rangeMatch = /^(\d+)-(\d+)$/.exec(part)
        if (stepMatch) {
          const step = Number(stepMatch[1])
          if (step < 1) return null
          for (let i = 0; i <= max; i += step) values.push(i)
        } else if (rangeMatch) {
          const lo = Number(rangeMatch[1])
          const hi = Number(rangeMatch[2])
          if (lo > hi || hi > max) return null
          for (let i = lo; i <= hi; i++) values.push(i)
        } else if (/^\d+$/.test(part)) {
          const v = Number(part)
          if (v > max) return null
          values.push(v)
        } else {
          return null
        }
      }
      return values
    }
    const minutesList = expand(minute, 59)
    const hoursList = expand(hour, 23)
    if (minutesList === null || hoursList === null) continue
    parseable = true
    for (const h of hoursList) {
      for (const m of minutesList) {
        minutes.add(h * 60 + m)
      }
    }
  }
  if (!parseable || minutes.size === 0) return WEEK_FALLBACK_MS
  const sorted = [...minutes].sort((a, b) => a - b)
  let maxGap = 0
  for (let i = 1; i < sorted.length; i++) {
    maxGap = Math.max(maxGap, (sorted.at(i) ?? 0) - (sorted.at(i - 1) ?? 0))
  }
  // dom/month/dow are restricted to * (daily repetition), so the grid wraps
  // at minute-of-day boundaries.
  maxGap = Math.max(maxGap, (sorted.at(0) ?? 0) + MINUTES_PER_DAY - (sorted.at(-1) ?? 0))
  return maxGap * 60 * 1000
}

/** Darkness threshold for one lane: cron-derived when schedules are known. */
export function laneThresholdMs(
  path: string,
  schedules: Record<string, string[]> | undefined,
): number {
  const crons = schedules?.[path]
  if (crons === undefined || crons.length === 0) return DARKNESS_THRESHOLD_MS
  return Math.max(DARKNESS_THRESHOLD_MS, maxCronGapMs(crons) + SCHEDULE_GRACE_MS)
}

export interface WorkflowSummary {
  id: number
  path: string
  name: string
}

export interface RunSummary {
  workflowId: number
  createdAt: string
}

export interface DarkWorkflow {
  name: string
  path: string
  lastRun: string
  ageDays: number
  /** Lane threshold actually applied (days); present on cron-derived darks. */
  thresholdDays?: number
}

export interface DarknessVerdict {
  verdict: 'GREEN' | 'DARK' | 'UNKNOWN'
  candidates: number
  darkWorkflows: DarkWorkflow[]
  /** Lanes whose run timestamps exist but are unparseable (fail closed). */
  unknownWorkflows: DarkWorkflow[]
}

export type TriggerIndex = Record<string, string[]>

const PUSH_SCHEDULE_TRIGGERS = new Set(['push', 'schedule'])

function normalizeOnValue(on: unknown): string[] {
  if (typeof on === 'string') return [on]
  if (Array.isArray(on)) return on.filter(t => typeof t === 'string')
  if (typeof on === 'object' && on !== null) return Object.keys(on)
  return []
}

/** Local workflow file map (name -> text) -> trigger index by file name. */
export function classifyWorkflows(files: Record<string, string>): TriggerIndex {
  const index: TriggerIndex = {}
  for (const [path, text] of Object.entries(files)) {
    let doc: unknown
    try {
      doc = parse(text)
    } catch {
      continue
    }
    if (doc === null || typeof doc !== 'object') continue
    const record = doc as Record<string, unknown>
    const onKey = Object.keys(record).find(k => k === 'on' || k === 'true')
    if (onKey === undefined) continue
    index[path] = normalizeOnValue(record[onKey])
  }
  return index
}

/** Cron schedules per workflow file name, parsed from workflow texts. */
export function extractSchedules(files: Record<string, string>): Record<string, string[]> {
  const schedules: Record<string, string[]> = {}
  for (const [name, text] of Object.entries(files)) {
    let doc: unknown
    try {
      doc = parse(text)
    } catch {
      continue
    }
    if (doc === null || typeof doc !== 'object') continue
    const record = doc as Record<string, unknown>
    const onKey = Object.keys(record).find(k => k === 'on' || k === 'true')
    if (onKey === undefined) continue
    const raw = record[onKey]
    const schedule =
      raw !== null && typeof raw === 'object' && !Array.isArray(raw)
        ? (raw as Record<string, unknown>).schedule
        : undefined
    if (!Array.isArray(schedule)) continue
    const crons: string[] = []
    for (const entry of schedule) {
      if (typeof entry === 'object' && entry !== null) {
        const cron = (entry as Record<string, unknown>).cron
        if (typeof cron === 'string') crons.push(cron)
      }
    }
    if (crons.length > 0) schedules[name] = crons
  }
  return schedules
}

export function computeDarkness(input: {
  workflows: WorkflowSummary[]
  runs: RunSummary[]
  triggers: TriggerIndex
  pushedAt: string
  now: string
  schedules?: Record<string, string[]>
}): DarknessVerdict {
  const nowMs = Date.parse(input.now)
  const pushedMs = Date.parse(input.pushedAt)
  const candidates = input.workflows.filter(w => {
    const triggers = input.triggers[w.path] ?? []
    return triggers.some(t => PUSH_SCHEDULE_TRIGGERS.has(t))
  })
  // Unparseable clock inputs (a bad ACTIONS_DARKNESS_NOW override, or a
  // malformed main-head commit date) fail closed exactly like unparseable
  // run timestamps: NaN reads false in every comparison below, which would
  // otherwise surface as a silent GREEN (rm-1411 fail-closed rule).
  const clockUnknowns: DarkWorkflow[] = []
  if (!Number.isFinite(nowMs)) {
    clockUnknowns.push({
      name: 'now',
      path: 'clock',
      lastRun: 'unparseable',
      ageDays: Number.NaN,
    })
  }
  if (!Number.isFinite(pushedMs)) {
    clockUnknowns.push({
      name: 'pushed_at',
      path: 'clock',
      lastRun: 'unparseable',
      ageDays: Number.NaN,
    })
  }
  if (clockUnknowns.length > 0) {
    return {
      verdict: 'UNKNOWN',
      candidates: candidates.length,
      darkWorkflows: [],
      unknownWorkflows: clockUnknowns,
    }
  }
  const darkWorkflows: DarkWorkflow[] = []
  const unknownWorkflows: DarkWorkflow[] = []
  for (const workflow of candidates) {
    let latestMs = Number.NEGATIVE_INFINITY
    let sawRun = false
    for (const run of input.runs) {
      if (run.workflowId !== workflow.id) continue
      sawRun = true
      const createdMs = Date.parse(run.createdAt)
      if (Number.isNaN(createdMs)) continue
      if (createdMs > latestMs) latestMs = createdMs
    }
    if (sawRun && latestMs === Number.NEGATIVE_INFINITY) {
      // Runs exist but every timestamp is unparseable: the lane state is
      // UNKNOWN, never silently green (rm-1411 fail-closed rule).
      unknownWorkflows.push({
        name: workflow.name,
        path: workflow.path,
        lastRun: 'unparseable',
        ageDays: Number.NaN,
      })
      continue
    }
    const crons = input.schedules?.[workflow.path]
    const cadenceKnown = crons !== undefined && crons.length > 0
    const thresholdMs = laneThresholdMs(workflow.path, input.schedules)
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
    const stale = nowMs - latestMs > thresholdMs
    const owed = pushedMs > latestMs
    // Cron-known lanes owe runs by cadence alone; unknown-cadence lanes keep
    // the conservative stale-AND-owed rule.
    const dark = cadenceKnown ? stale || owed : stale && owed
    if (dark) {
      darkWorkflows.push({
        name: workflow.name,
        path: workflow.path,
        lastRun: new Date(latestMs).toISOString(),
        ageDays: Math.round(((nowMs - latestMs) / (24 * 60 * 60 * 1000)) * 10) / 10,
        ...(cadenceKnown
          ? {thresholdDays: Math.round((thresholdMs / (24 * 60 * 60 * 1000)) * 10) / 10}
          : {}),
      })
    }
  }
  const verdict =
    darkWorkflows.length > 0 ? 'DARK' : unknownWorkflows.length > 0 ? 'UNKNOWN' : 'GREEN'
  return {
    verdict,
    candidates: candidates.length,
    darkWorkflows,
    unknownWorkflows,
  }
}

function repoRoot(): string {
  const here = fileURLToPath(new URL('.', import.meta.url))
  return `${here.split('/scripts/')[0]}/`
}

function readLocalWorkflowFiles(): Record<string, string> {
  const dir = `${repoRoot()}.github/workflows`
  const files: Record<string, string> = {}
  for (const entry of readdirSync(dir)) {
    if (!entry.endsWith('.yaml') && !entry.endsWith('.yml')) continue
    files[entry] = readFileSync(`${dir}/${entry}`, 'utf8')
  }
  return files
}

export function readLocalTriggers(): TriggerIndex {
  const index = classifyWorkflows(readLocalWorkflowFiles())
  const reindexed: TriggerIndex = {}
  for (const [name, triggers] of Object.entries(index)) {
    reindexed[`.github/workflows/${name}`] = triggers
  }
  return reindexed
}

export function readLocalSchedules(): Record<string, string[]> {
  const schedules = extractSchedules(readLocalWorkflowFiles())
  const reindexed: Record<string, string[]> = {}
  for (const [name, crons] of Object.entries(schedules)) {
    reindexed[`.github/workflows/${name}`] = crons
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
  const response = await fetch(url, {headers, signal: AbortSignal.timeout(15_000)})
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
    const schedules = readLocalSchedules()
    const apiWorkflows = await fetchJson<ApiWorkflows>(
      `https://api.github.com/repos/${repo}/actions/workflows?per_page=100`,
      token,
    )
    const candidates = apiWorkflows.workflows.filter(w =>
      (triggers[w.path] ?? []).some(t => PUSH_SCHEDULE_TRIGGERS.has(t)),
    )
    // Per-lane latest-run reads: a busy lane can no longer push another
    // lane's true last run out of a shared fetch window. The owed proxy is
    // the main head commit date (branch-filtered), not repo-wide pushed_at.
    const [laneRuns, mainHead] = await Promise.all([
      Promise.all(
        candidates.map(async w => {
          const r = await fetchJson<ApiRuns>(
            `https://api.github.com/repos/${repo}/actions/workflows/${w.id}/runs?per_page=1`,
            token,
          )
          return r.workflow_runs.map(run => ({workflowId: w.id, createdAt: run.created_at}))
        }),
      ),
      fetchJson<{commit: {committer?: {date?: string}; author?: {date?: string}}}[]>(
        `https://api.github.com/repos/${repo}/commits?sha=main&per_page=1`,
        token,
      ),
    ])
    const runs = laneRuns.flat()
    const head = mainHead[0]?.commit
    const pushedAt = head?.committer?.date ?? head?.author?.date ?? '1970-01-01T00:00:00Z'
    const verdict = computeDarkness({
      workflows: apiWorkflows.workflows.map(w => ({id: w.id, path: w.path, name: w.name})),
      runs,
      triggers,
      pushedAt,
      now,
      schedules,
    })
    console.log(
      `actions-darkness: verdict=${verdict.verdict} repo=${repo} now=${now} main_head=${pushedAt} candidates=${verdict.candidates}`,
    )
    for (const dark of verdict.darkWorkflows) {
      const age = Number.isFinite(dark.ageDays) ? `${dark.ageDays}d` : 'never-ran'
      const threshold = dark.thresholdDays === undefined ? '' : ` threshold=${dark.thresholdDays}d`
      console.log(`  dark: ${dark.name} (${dark.path}) last_run=${dark.lastRun} age=${age}${threshold}`)
    }
    for (const unknown of verdict.unknownWorkflows) {
      console.log(`  unknown: ${unknown.name} (${unknown.path}) last_run=${unknown.lastRun}`)
    }
    if (verdict.verdict === 'DARK') return 3
    if (verdict.verdict === 'UNKNOWN') return 4
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
