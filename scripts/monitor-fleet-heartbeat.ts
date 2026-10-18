#!/usr/bin/env node
// Monitor-fleet heartbeat: judges the six weekly monitor workflows against
// their scheduled cron windows and, on a dead-man verdict (a monitor missing
// DEAD_MAN_CONSECUTIVE_MISSES consecutive windows), posts a signed event
// through the dashboard's listener ingest channel (POST /api/listener/ingest).
//
// Boundary with scripts/actions-darkness-watch.ts (rm-1411): that watch asks
// "did run CREATION stop repo-wide?" with a 48h any-event staleness budget;
// this heartbeat asks "did each WEEKLY monitor miss its scheduled window?"
// with per-monitor window math plus a signed dead-man alert. Separate
// questions, separate verdict ladders, separate scripts — see
// docs/runbooks/actions-darkness-watch.md.
//
// Conductor-side by design: invoked by the maintenance harness, it observes
// Actions runs through the GitHub API but never depends on GitHub Actions
// creating runs — the scheduled-run outage (rm-1437) cannot blind it.
//
// Env:
//   MONITOR_HEARTBEAT_TOKEN | GITHUB_TOKEN  (required) API token for api.github.com
//   MONITOR_HEARTBEAT_REPO                  default 'codeo1io/dashboard'
//   MONITOR_HEARTBEAT_NOW                   ISO timestamp seam (tests/dry runs)
//   LISTENER_INGEST_URL | MONITOR_HEARTBEAT_INGEST_URL   base URL for the
//                                          dead-man POST (e.g. https://host)
//   LISTENER_INGEST_KEY | MONITOR_HEARTBEAT_INGEST_KEY   HMAC key
//
// Exit codes: 0 = no dead-man verdict; 1 = unknown (token missing, API or
// parse failure, alert delivery failure with a dead verdict is still 3);
// 3 = at least one monitor missed 2 consecutive windows.

import {createHmac} from 'node:crypto'
import process from 'node:process'

const DEFAULT_REPO = 'codeo1io/dashboard'
const DEFAULT_API_BASE = 'https://api.github.com'
const API_PAGE_SIZE = 100

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000
/** GitHub cron jitter allowance before an unstarted window counts as missed. */
export const GRACE_MS = 2 * 60 * 60 * 1000
export const DEAD_MAN_CONSECUTIVE_MISSES = 2
export const MAX_WINDOWS_JUDGED = 3
export const DEAD_MAN_KIND = 'monitor-heartbeat'

export interface MonitorSpec {
  readonly workflowPath: string
  readonly name: string
  /** Monday-only weekly cron, `'M H * * 1'` (UTC). */
  readonly cron: string
}

export const MONITORS: readonly MonitorSpec[] = [
  {workflowPath: 'audit.yaml', name: 'audit', cron: '37 3 * * 1'},
  {workflowPath: 'canary.yaml', name: 'canary', cron: '23 5 * * 1'},
  {workflowPath: 'base-drift.yaml', name: 'base-drift', cron: '13 4 * * 1'},
  {workflowPath: 'upstream-drift.yaml', name: 'upstream-drift', cron: '17 5 * * 1'},
  {workflowPath: 'cve-tripwire.yaml', name: 'cve-tripwire', cron: '53 6 * * 1'},
  {workflowPath: 'release-channel.yaml', name: 'release-channel', cron: '23 7 * * 1'},
]

export interface MonitorRun {
  readonly createdAtMs: number
}

export interface WindowJudgement {
  readonly windowStartMs: number
  /** False while `now < start + grace` — the run may still arrive. */
  readonly judged: boolean
  readonly covered: boolean
}

export interface MonitorVerdict {
  readonly monitor: MonitorSpec
  readonly windows: readonly WindowJudgement[]
  readonly consecutiveMisses: number
  readonly deadMan: boolean
  readonly lastRunAtMs: number | null
  readonly pendingWindow: boolean
}

export function parseWeeklyMondayCron(cron: string): {hour: number; minute: number} | null {
  const match = /^(\d{1,2}) (\d{1,2}) \* \* 1$/.exec(cron.trim())
  if (!match) return null
  const minute = Number(match[1])
  const hour = Number(match[2])
  if (hour > 23 || minute > 59) return null
  return {hour, minute}
}

/**
 * The `count` most recent Monday HH:MM UTC instants at or before `nowMs`,
 * oldest first.
 */
export function expectedWindowStarts(
  cron: string,
  nowMs: number,
  count: number = MAX_WINDOWS_JUDGED,
): number[] {
  const parsed = parseWeeklyMondayCron(cron)
  if (!parsed || count <= 0) return []
  const now = new Date(nowMs)
  // Monday 00:00 UTC of the current week (or the week before, when today is
  // Sunday): step back 0..6 days to land on weekday 1 (Monday).
  const weekAnchor = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const dayOfWeek = new Date(weekAnchor).getUTCDay() // 0=Sun .. 6=Sat
  const backDays = (dayOfWeek + 6) % 7 // Mon->0, Tue->1, .. Sun->6
  const monday = weekAnchor - backDays * 24 * 60 * 60 * 1000
  let start = monday + parsed.hour * 3_600_000 + parsed.minute * 60_000
  if (start > nowMs) start -= WEEK_MS
  const starts: number[] = []
  for (let i = 0; i < count; i++) {
    starts.unshift(start - i * WEEK_MS)
  }
  return starts
}

export function judgeMonitor(
  monitor: MonitorSpec,
  runs: readonly MonitorRun[],
  nowMs: number,
  graceMs: number = GRACE_MS,
): MonitorVerdict {
  const starts = expectedWindowStarts(monitor.cron, nowMs, MAX_WINDOWS_JUDGED)
  const windows: WindowJudgement[] = starts.map(start => {
    const judged = nowMs >= start + graceMs
    const covered =
      judged && runs.some(run => run.createdAtMs >= start && run.createdAtMs < start + WEEK_MS)
    return {windowStartMs: start, judged, covered}
  })
  let consecutiveMisses = 0
  for (let i = windows.length - 1; i >= 0; i--) {
    const window = windows[i]
    if (window === undefined) continue
    if (!window.judged) continue
    if (window.covered) break
    consecutiveMisses++
  }
  const lastRunAtMs = runs.length > 0 ? Math.max(...runs.map(run => run.createdAtMs)) : null
  return {
    monitor,
    windows,
    consecutiveMisses,
    deadMan: consecutiveMisses >= DEAD_MAN_CONSECUTIVE_MISSES,
    lastRunAtMs,
    pendingWindow: !windows.at(-1)?.judged,
  }
}

// --- dead-man ingest event ---------------------------------------------------

/** Mirrors src/listener/contract.ts IngestMessage (validated there). */
export interface DeadManMessage {
  readonly source: 'infra'
  readonly kind: typeof DEAD_MAN_KIND
  readonly severity: 'critical'
  readonly title: string
  readonly body: string
  readonly links: readonly {label: string; url: string}[]
  readonly dedupeKey: string
  readonly createdAt: string
}

export function buildDeadManMessage(
  verdicts: readonly MonitorVerdict[],
  repo: string,
  nowMs: number,
): DeadManMessage {
  const dead = verdicts.filter(verdict => verdict.deadMan)
  const lines = dead.map(verdict => {
    const missed = verdict.windows
      .filter(window => window.judged && !window.covered)
      .map(window => new Date(window.windowStartMs).toISOString())
    const lastRun =
      verdict.lastRunAtMs === null ? 'never' : new Date(verdict.lastRunAtMs).toISOString()
    return (
      `- ${verdict.monitor.name} (${verdict.monitor.workflowPath}): missed ${missed.join(', ')}` +
      ` — last run ${lastRun}`
    )
  })
  const oldestMissed = Math.min(
    ...dead.flatMap(verdict =>
      verdict.windows.filter(w => w.judged && !w.covered).map(w => w.windowStartMs),
    ),
  )
  return {
    source: 'infra',
    kind: DEAD_MAN_KIND,
    severity: 'critical',
    title: `Monitor fleet dead-man: ${dead.length} monitor${dead.length === 1 ? '' : 's'} missed ${DEAD_MAN_CONSECUTIVE_MISSES} consecutive weekly windows`,
    body:
      `${lines.join('\n')}\n\nRun-creation darkness is being tracked separately; this alert means the ` +
      `weekly monitor cron windows themselves produced no runs. Checked at ${new Date(nowMs).toISOString()}.`,
    links: [{label: `Actions — ${repo}`, url: `https://github.com/${repo}/actions`}],
    // Collapse repeat posts for the same oldest missed window.
    dedupeKey: `${DEAD_MAN_KIND}:${new Date(oldestMissed).toISOString().slice(0, 10)}`,
    createdAt: new Date(nowMs).toISOString(),
  }
}

export function signIngestPayload(timestampSeconds: number, rawBody: string, key: string): string {
  return `sha256=${createHmac('sha256', key)
    .update(`${timestampSeconds}.${rawBody}`)
    .digest('hex')}`
}

export interface IngestRequestPlan {
  readonly url: string
  readonly method: 'POST'
  readonly headers: Record<string, string>
  readonly body: string
}

export function buildIngestRequest(
  baseUrl: string,
  key: string,
  message: DeadManMessage,
  nowMs: number,
): IngestRequestPlan {
  const body = JSON.stringify(message)
  const timestampSeconds = Math.floor(nowMs / 1000)
  return {
    url: `${baseUrl.replace(/\/+$/, '')}/api/listener/ingest`,
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-listener-timestamp': String(timestampSeconds),
      'x-listener-signature': signIngestPayload(timestampSeconds, body, key),
    },
    body,
  }
}

// --- GitHub API access -------------------------------------------------------

export async function fetchMonitorRuns(
  repo: string,
  workflowPath: string,
  token: string,
  apiBase: string = DEFAULT_API_BASE,
): Promise<readonly MonitorRun[]> {
  const response = await fetch(
    `${apiBase}/repos/${repo}/actions/workflows/${workflowPath}/runs?per_page=${API_PAGE_SIZE}`,
    {headers: {authorization: `Bearer ${token}`, accept: 'application/vnd.github+json'}},
  )
  if (!response.ok) {
    throw new Error(`workflow runs fetch failed: ${response.status} ${workflowPath}`)
  }
  const payload = (await response.json()) as {workflow_runs?: {created_at?: unknown}[]}
  const runs: MonitorRun[] = []
  for (const run of payload.workflow_runs ?? []) {
    if (typeof run.created_at !== 'string') continue
    const createdAtMs = Date.parse(run.created_at)
    if (Number.isFinite(createdAtMs)) runs.push({createdAtMs})
  }
  return runs
}

// --- entrypoint --------------------------------------------------------------

function env(name: string): string | undefined {
  const value = process.env[name]
  if (typeof value !== 'string' || value.trim() === '') return undefined
  return value
}

export async function main(argv: readonly string[]): Promise<number> {
  const asJson = argv.includes('--json')
  const repo = env('MONITOR_HEARTBEAT_REPO') ?? DEFAULT_REPO
  const token = env('MONITOR_HEARTBEAT_TOKEN') ?? env('GITHUB_TOKEN')
  const nowMs = (() => {
    const seam = env('MONITOR_HEARTBEAT_NOW')
    if (seam === undefined) return Date.now()
    const parsed = Date.parse(seam)
    return Number.isFinite(parsed) ? parsed : Date.now()
  })()

  if (token === undefined) {
    console.error('monitor-fleet-heartbeat: MONITOR_HEARTBEAT_TOKEN or GITHUB_TOKEN required')
    return 1
  }

  const verdicts: MonitorVerdict[] = []
  for (const monitor of MONITORS) {
    try {
      const runs = await fetchMonitorRuns(repo, monitor.workflowPath, token)
      verdicts.push(judgeMonitor(monitor, runs, nowMs))
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      console.error(`monitor-fleet-heartbeat: unknown (${monitor.workflowPath}): ${detail}`)
      return 1
    }
  }

  const dead = verdicts.filter(verdict => verdict.deadMan)
  for (const verdict of verdicts) {
    if (verdict.deadMan) {
      const lastRun =
        verdict.lastRunAtMs === null ? 'never' : new Date(verdict.lastRunAtMs).toISOString()
      console.log(`DEAD ${verdict.monitor.name}: ${verdict.consecutiveMisses} missed windows, last run ${lastRun}`)
    } else if (verdict.consecutiveMisses > 0) {
      console.log(`WARN ${verdict.monitor.name}: ${verdict.consecutiveMisses} missed window(s), watching`)
    } else {
      console.log(`OK   ${verdict.monitor.name}`)
    }
  }

  if (dead.length > 0) {
    const baseUrl = env('MONITOR_HEARTBEAT_INGEST_URL') ?? env('LISTENER_INGEST_URL')
    const key = env('MONITOR_HEARTBEAT_INGEST_KEY') ?? env('LISTENER_INGEST_KEY')
    if (baseUrl === undefined || key === undefined) {
      console.error('monitor-fleet-heartbeat: dead-man verdict but LISTENER_INGEST_URL/LISTENER_INGEST_KEY unset — alert not delivered')
      if (asJson) {
        console.log(JSON.stringify({verdict: 'dead', alerted: false, monitors: verdicts.length, dead: dead.map(v => v.monitor.name)}))
      }
      return 3
    }
    const plan = buildIngestRequest(baseUrl, key, buildDeadManMessage(verdicts, repo, nowMs), nowMs)
    const response = await fetch(plan.url, plan)
    if (!response.ok) {
      console.error(`monitor-fleet-heartbeat: dead-man alert failed: ${response.status}`)
      return 1
    }
    console.log(`monitor-fleet-heartbeat: dead-man alert delivered (${response.status})`)
    if (asJson) {
      console.log(JSON.stringify({verdict: 'dead', alerted: true, monitors: verdicts.length, dead: dead.map(v => v.monitor.name)}))
    }
    return 3
  }

  if (asJson) {
    console.log(JSON.stringify({verdict: 'ok', monitors: verdicts.length, dead: []}))
  }
  return 0
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(await main(process.argv.slice(2)))
}
