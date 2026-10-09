#!/usr/bin/env node
/**
 * rm-289 — the scheduled-workflow red watch (repository-maintenance cycle:1,
 * run 1930644a996e, 2026-10-09): a GITHUB_TOKEN-only alert route for the
 * scheduled guard layer.
 *
 * Why this exists: scheduled guard failures had no watch path. The canary's
 * only-ever run sat red 3+ days before anyone noticed (2026-09-28), and the
 * 2026-10-07 audit re-confirmed three scheduled reds sitting over 24h with
 * zero notification — rm-179's promised alert route never landed. This
 * script queries each guard workflow's latest watched conclusion via the
 * Actions API and routes the red set through every surface that works on a
 * repository with the Issues feature DISABLED (probed live 2026-10-09,
 * has_issues=false): the tracked issue (opened/updated on red, closed on
 * green, ONE living issue, deduplicated by a red-set signature) whenever
 * issues are enabled, plus the watch run's own red conclusion and the job
 * summary — the same signal ladder upstream-drift.yaml and cve-tripwire.yaml
 * document.
 *
 * Watch semantics (kept deliberately strict, fail-loud):
 *   - watched events are `schedule` and `workflow_dispatch` on the DEFAULT
 *     branch only — push/PR-triggered runs of the same workflow files
 *     (scorecard, codeql) are covered by the PR/landing gates, not this watch;
 *   - green ONLY on conclusion 'success' — failure, timed_out,
 *     startup_failure, cancelled and skipped are all red-family, and a guard
 *     with NO completed run at all is red too (a guard nothing has ever
 *     verified is exactly the invisibility this watch exists to remove);
 *   - any API transport/HTTP error exits 1 with a loud message — the watch
 *     must never report a false green;
 *   - fro-bot.yaml is deliberately NOT watched: it is disabled_manually with
 *     a documented missing-secret reason (AGENTS.md), so its last red would
 *     otherwise alert forever.
 *
 * Dry-run harness: `node scripts/scheduled-workflow-watch.ts --dry-run -`
 * reads a fixture from stdin (or a file path) and executes the SAME decision
 * core against fixture conclusions, printing the exact issue/comment it
 * WOULD post and exiting with the same code — the negative (red) case is
 * provable offline, without manufacturing a live red.
 */
import {appendFileSync, readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'

/** The scheduled guard layer this watch covers (workflows with a cron trigger). */
export interface GuardWorkflow {
  readonly file: string
  readonly name: string
}

/** One guard workflow's latest watched-run state (post event/branch filter). */
export interface GuardState {
  readonly file: string
  readonly name: string
  readonly conclusion: string | null
  readonly event: string | null
  readonly runUrl: string | null
  readonly completedAt: string | null
}

export type PlannedIssueAction =
  | {readonly kind: 'none'; readonly reason: string}
  | {readonly kind: 'open'; readonly title: string; readonly body: string}
  | {readonly kind: 'update'; readonly number: number; readonly comment: string; readonly body: string}
  | {readonly kind: 'close'; readonly number: number; readonly comment: string}

export interface WatchPlan {
  readonly reds: readonly GuardState[]
  readonly greens: readonly GuardState[]
  readonly signature: string
  readonly issueAction: PlannedIssueAction
  readonly exitCode: 0 | 1
  readonly issuesRouteAvailable: boolean
}

export const TRACKING_LABEL = 'scheduled-watch'
export const ISSUE_TITLE = 'Scheduled guard watch: one or more scheduled guard workflows are red'

export const GUARD_WORKFLOWS: readonly GuardWorkflow[] = [
  {file: 'audit.yaml', name: 'Dependency audit'},
  {file: 'base-drift.yaml', name: 'Base image drift check'},
  {file: 'upstream-drift.yaml', name: 'Upstream drift check'},
  {file: 'canary.yaml', name: 'GraphQL canary'},
  {file: 'scorecard.yaml', name: 'Scorecard supply-chain security'},
  {file: 'cve-tripwire.yaml', name: 'CVE tripwire'},
  {file: 'codeql.yaml', name: 'CodeQL'},
]

const API_ROOT = 'https://api.github.com'
const WATCHED_EVENTS = ['schedule', 'workflow_dispatch'] as const

// ---------------------------------------------------------------------------
// Pure decision core (unit-tested; also the dry-run engine)
// ---------------------------------------------------------------------------

/** Strict green: only a succeeded conclusion. No-completed-run counts red. */
export function isRed(state: GuardState): boolean {
  return state.conclusion !== 'success'
}

export function conclusionLabel(state: GuardState): string {
  return state.conclusion ?? 'no completed run found'
}

/** Stable red-set fingerprint — the tracked issue's deduplication marker. */
export function redSignature(states: readonly GuardState[]): string {
  return states
    .filter(isRed)
    .map(state => `${state.file}:${conclusionLabel(state)}`)
    .sort()
    .join(',')
}

function stateRow(state: GuardState): string {
  const run = state.runUrl === null ? '—' : `[run](${state.runUrl})`
  return `| ${state.name} (${state.file}) | ${conclusionLabel(state)} | ${state.event ?? '—'} | ${state.completedAt ?? '—'} | ${run} |`
}

function redTable(reds: readonly GuardState[]): string {
  return ['| workflow | conclusion | event | completed (UTC) | run |', '| --- | --- | --- | --- | --- |', ...reds.map(stateRow)].join('\n')
}

export function issueBody(reds: readonly GuardState[]): string {
  return [
    'The scheduled guard watch (rm-289) found red guard runs at its latest check.',
    '',
    redTable(reds),
    '',
    'Route semantics: green only when the latest watched run (schedule or dispatch on the default branch) succeeded. This issue is the durable tracked surface — it is updated while any guard stays red and closed automatically once every guard is green again. The watch run itself also goes red on this condition; that red run plus this issue are the alert route.',
    '',
    `signature: ${redSignature(reds)}`,
  ].join('\n')
}

export function updateComment(reds: readonly GuardState[]): string {
  return ['Red set changed — updating the tracked watch issue.', '', redTable(reds), '', `signature: ${redSignature(reds)}`].join('\n')
}

export const CLOSE_COMMENT =
  'All watched guard workflows are green at this check — closing the tracked watch issue. It reopens automatically if any guard goes red again.'

export function planWatch(
  states: readonly GuardState[],
  options: {readonly hasIssues: boolean; readonly openIssue: {readonly number: number; readonly body: string} | null},
): WatchPlan {
  const reds = [...states].filter(isRed).sort((a, b) => a.file.localeCompare(b.file))
  const greens = states.filter(state => !isRed(state))
  const signature = redSignature(states)
  let issueAction: PlannedIssueAction
  if (reds.length === 0) {
    issueAction =
      options.openIssue === null
        ? {kind: 'none', reason: 'all guard workflows green and no tracked issue open'}
        : {kind: 'close', number: options.openIssue.number, comment: CLOSE_COMMENT}
  } else if (!options.hasIssues) {
    issueAction = {kind: 'none', reason: 'issues disabled on this repository (has_issues=false) — the red watch run is the alert surface'}
  } else if (options.openIssue === null) {
    issueAction = {kind: 'open', title: ISSUE_TITLE, body: issueBody(reds)}
  } else if (options.openIssue.body.includes(`signature: ${signature}`)) {
    issueAction = {kind: 'none', reason: 'tracked issue already describes exactly this red set (signature match)'}
  } else {
    issueAction = {kind: 'update', number: options.openIssue.number, comment: updateComment(reds), body: issueBody(reds)}
  }
  return {reds, greens, signature, issueAction, exitCode: reds.length === 0 ? 0 : 1, issuesRouteAvailable: options.hasIssues}
}

export function summaryMarkdown(plan: WatchPlan): string {
  const outcome =
    plan.reds.length === 0
      ? `**all ${plan.greens.length} guard workflow(s) green**`
      : `**${plan.reds.length} red / ${plan.greens.length} green** — ${plan.issueAction.kind === 'none' ? plan.issueAction.reason : `issue route: ${plan.issueAction.kind}`}`
  return ['## Scheduled guard watch (rm-289)', '', redTable([...plan.reds, ...plan.greens]), '', outcome].join('\n')
}

// ---------------------------------------------------------------------------
// Live GitHub layer (fetch only, GITHUB_TOKEN, no dependencies)
// ---------------------------------------------------------------------------

function apiHeaders(token: string): Record<string, string> {
  return {
    authorization: `Bearer ${token}`,
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    'user-agent': 'dashboard-scheduled-watch',
  }
}

async function githubJson(
  token: string,
  url: string,
  init?: {readonly method?: string; readonly body?: string},
): Promise<{status: number; body: unknown}> {
  let res: Response
  try {
    res = await fetch(url, {
      method: init?.method ?? 'GET',
      headers: {
        ...apiHeaders(token),
        ...(init?.body === undefined ? {} : {'content-type': 'application/json'}),
      },
      body: init?.body,
    })
  } catch (error) {
    throw new Error(`transport failure calling ${url} — ${error instanceof Error ? error.message : String(error)}`)
  }
  const body: unknown = await res.json().catch(() => null)
  return {status: res.status, body}
}

interface RawRun {
  readonly conclusion: string | null
  readonly event: string
  readonly html_url: string
  readonly created_at: string
  readonly updated_at: string
  readonly head_branch: string | null
}

async function latestRunForEvent(
  token: string,
  repository: string,
  file: string,
  event: (typeof WATCHED_EVENTS)[number],
  defaultBranch: string,
): Promise<RawRun | null> {
  const url = `${API_ROOT}/repos/${repository}/actions/workflows/${file}/runs?event=${event}&status=completed&per_page=1`
  const {status, body} = await githubJson(token, url)
  if (status !== 200) throw new Error(`HTTP ${status} listing ${event} runs for ${file}: ${JSON.stringify(body)}`)
  const runs = ((body as {workflow_runs?: unknown[]} | null)?.workflow_runs ?? []) as RawRun[]
  const newest = runs[0]
  if (newest === undefined) return null
  // Dispatch runs may target a feature branch; only default-branch runs are
  // the guard layer's state. (Scheduled runs are always default-branch.)
  if (event === 'workflow_dispatch' && newest.head_branch !== null && newest.head_branch !== defaultBranch) return null
  return newest
}

async function fetchGuardState(
  token: string,
  repository: string,
  guard: GuardWorkflow,
  defaultBranch: string,
): Promise<GuardState> {
  const perEvent = await Promise.all(
    WATCHED_EVENTS.map(async event => latestRunForEvent(token, repository, guard.file, event, defaultBranch)),
  )
  const candidates = perEvent.filter((run): run is RawRun => run !== null)
  candidates.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  const newest = candidates[0]
  if (newest === undefined) {
    return {file: guard.file, name: guard.name, conclusion: null, event: null, runUrl: null, completedAt: null}
  }
  return {
    file: guard.file,
    name: guard.name,
    conclusion: newest.conclusion,
    event: newest.event,
    runUrl: newest.html_url,
    completedAt: newest.updated_at,
  }
}

async function probeRepository(token: string, repository: string): Promise<{hasIssues: boolean; defaultBranch: string}> {
  const {status, body} = await githubJson(token, `${API_ROOT}/repos/${repository}`)
  if (status !== 200) throw new Error(`HTTP ${status} probing repository settings: ${JSON.stringify(body)}`)
  const repo = body as {has_issues?: unknown; default_branch?: unknown}
  if (typeof repo.default_branch !== 'string') throw new Error('repository probe returned no default_branch')
  return {hasIssues: repo.has_issues === true, defaultBranch: repo.default_branch}
}

async function findOpenIssue(
  token: string,
  repository: string,
): Promise<{number: number; body: string} | null> {
  const url = `${API_ROOT}/repos/${repository}/issues?labels=${TRACKING_LABEL}&state=open&per_page=5`
  const {status, body} = await githubJson(token, url)
  if (status !== 200) throw new Error(`HTTP ${status} listing tracked issues: ${JSON.stringify(body)}`)
  const issues = ((body as {number?: unknown; body?: unknown; pull_request?: unknown}[] | null) ?? []).filter(
    issue => typeof issue.number === 'number' && typeof issue.body === 'string' && issue.pull_request === undefined,
  )
  const first = issues.find(issue => typeof issue.number === 'number')
  if (first === undefined) return null
  return {number: first.number as number, body: first.body as string}
}

async function ensureTrackingLabel(token: string, repository: string): Promise<void> {
  const {status, body} = await githubJson(token, `${API_ROOT}/repos/${repository}/labels`, {
    method: 'POST',
    body: JSON.stringify({name: TRACKING_LABEL, color: 'D93F0B', description: 'scheduled guard watch — red guard runs (rm-289)'}),
  })
  // 201 created; 422 already exists — both fine. Anything else fails loud.
  if (status !== 201 && status !== 422) throw new Error(`HTTP ${status} ensuring label ${TRACKING_LABEL}: ${JSON.stringify(body)}`)
}

async function executeIssueAction(token: string, repository: string, action: PlannedIssueAction): Promise<string> {
  if (action.kind === 'none') return action.reason
  await ensureTrackingLabel(token, repository)
  if (action.kind === 'open') {
    const {status, body} = await githubJson(token, `${API_ROOT}/repos/${repository}/issues`, {
      method: 'POST',
      body: JSON.stringify({title: action.title, body: action.body, labels: [TRACKING_LABEL]}),
    })
    if (status !== 201) throw new Error(`HTTP ${status} opening tracked issue: ${JSON.stringify(body)}`)
    const number = (body as {number?: unknown}).number
    return typeof number === 'number' ? `opened tracked issue #${number}` : 'opened tracked issue (no number in response)'
  }
  if (action.kind === 'update') {
    const commented = await githubJson(token, `${API_ROOT}/repos/${repository}/issues/${action.number}/comments`, {
      method: 'POST',
      body: JSON.stringify({body: action.comment}),
    })
    if (commented.status !== 201)
      throw new Error(`HTTP ${commented.status} commenting on tracked issue #${action.number}: ${JSON.stringify(commented.body)}`)
    const updated = await githubJson(token, `${API_ROOT}/repos/${repository}/issues/${action.number}`, {
      method: 'PATCH',
      body: JSON.stringify({body: action.body}),
    })
    if (updated.status !== 200)
      throw new Error(`HTTP ${updated.status} updating tracked issue #${action.number} body: ${JSON.stringify(updated.body)}`)
    return `commented on + updated tracked issue #${action.number}`
  }
  const commented = await githubJson(token, `${API_ROOT}/repos/${repository}/issues/${action.number}/comments`, {
    method: 'POST',
    body: JSON.stringify({body: action.comment}),
  })
  if (commented.status !== 201)
    throw new Error(`HTTP ${commented.status} commenting on tracked issue #${action.number}: ${JSON.stringify(commented.body)}`)
  const closed = await githubJson(token, `${API_ROOT}/repos/${repository}/issues/${action.number}`, {
    method: 'PATCH',
    body: JSON.stringify({state: 'closed'}),
  })
  if (closed.status !== 200)
    throw new Error(`HTTP ${closed.status} closing tracked issue #${action.number}: ${JSON.stringify(closed.body)}`)
  return `closed tracked issue #${action.number} (all green)`
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function report(plan: WatchPlan): void {
  for (const state of [...plan.reds, ...plan.greens]) {
    const marker = isRed(state) ? 'RED' : 'green'
    console.log(`scheduled-watch: ${state.name} (${state.file}) — ${marker} ${conclusionLabel(state)} (${state.event ?? '—'}, ${state.completedAt ?? '—'})`)
  }
  console.log(`scheduled-watch: ${plan.reds.length} red / ${plan.greens.length} green`)
  console.log(`scheduled-watch: signature ${plan.signature === '' ? '(green)' : plan.signature}`)
}

function writeStepSummary(plan: WatchPlan): void {
  const target = process.env.GITHUB_STEP_SUMMARY
  if (target === undefined || target === '') return
  try {
    appendFileSync(target, `${summaryMarkdown(plan)}\n`)
  } catch (error) {
    // The summary is a convenience surface; a failure to append must not
    // mask the watch verdict itself.
    console.error(`scheduled-watch: could not append job summary — ${error instanceof Error ? error.message : String(error)}`)
  }
}

// ---------------------------------------------------------------------------
// Entrypoints
// ---------------------------------------------------------------------------

function stateFromFixture(guard: GuardWorkflow, raw: unknown): GuardState {
  if (raw === null || raw === undefined) {
    return {file: guard.file, name: guard.name, conclusion: null, event: null, runUrl: null, completedAt: null}
  }
  if (typeof raw !== 'object') throw new Error(`fixture run for ${guard.file} must be an object or null`)
  const entry = raw as {conclusion?: unknown; event?: unknown; runUrl?: unknown; completedAt?: unknown}
  if (entry.conclusion !== undefined && entry.conclusion !== null && typeof entry.conclusion !== 'string')
    throw new Error(`fixture conclusion for ${guard.file} must be a string or null`)
  return {
    file: guard.file,
    name: guard.name,
    conclusion: typeof entry.conclusion === 'string' ? entry.conclusion : null,
    event: typeof entry.event === 'string' ? entry.event : null,
    runUrl: typeof entry.runUrl === 'string' ? entry.runUrl : null,
    completedAt: typeof entry.completedAt === 'string' ? entry.completedAt : null,
  }
}

function statesFromFixture(raw: unknown): GuardState[] {
  if (typeof raw !== 'object' || raw === null) throw new Error('fixture root must be an object')
  const fixture = raw as {repository?: unknown; hasIssues?: unknown; openIssue?: unknown; runs?: unknown}
  if (typeof fixture.runs !== 'object' || fixture.runs === null) throw new Error('fixture must carry a runs object')
  const runs = fixture.runs as Record<string, unknown>
  const known = new Set(GUARD_WORKFLOWS.map(guard => guard.file))
  const unknown = Object.keys(runs).filter(file => !known.has(file))
  if (unknown.length > 0) throw new Error(`fixture carries unknown workflow file(s): ${unknown.join(', ')}`)
  return GUARD_WORKFLOWS.map(guard => stateFromFixture(guard, runs[guard.file]))
}

async function readStdin(): Promise<string> {
  const decoder = new TextDecoder()
  let text = ''
  for await (const chunk of process.stdin) {
    text += decoder.decode(chunk as Uint8Array, {stream: true})
  }
  return text + decoder.decode()
}

async function dryRun(fixtureSource: string): Promise<number> {
  const text = fixtureSource === '-' ? await readStdin() : readFileSync(resolve(process.cwd(), fixtureSource), 'utf8')
  const parsed: unknown = JSON.parse(text)
  const fixture = parsed as {hasIssues?: unknown; openIssue?: unknown}
  if (fixture.hasIssues !== undefined && typeof fixture.hasIssues !== 'boolean')
    throw new Error('fixture hasIssues must be boolean')
  const hasIssues = fixture.hasIssues === true
  let openIssue: {number: number; body: string} | null = null
  if (fixture.openIssue !== null && fixture.openIssue !== undefined) {
    if (typeof fixture.openIssue !== 'object') throw new Error('fixture openIssue must be an object or null')
    const issue = fixture.openIssue as {number?: unknown; body?: unknown}
    if (typeof issue.number !== 'number' || typeof issue.body !== 'string')
      throw new Error('fixture openIssue must carry number (number) and body (string)')
    openIssue = {number: issue.number, body: issue.body}
  }
  const plan = planWatch(statesFromFixture(parsed), {hasIssues, openIssue})
  report(plan)
  switch (plan.issueAction.kind) {
    case 'none':
      console.log(`scheduled-watch: DRY-RUN issue-route-none — ${plan.issueAction.reason}`)
      break
    case 'open':
      console.log(`scheduled-watch: DRY-RUN would-open-issue "${plan.issueAction.title}"`)
      console.log(`scheduled-watch: DRY-RUN issue body:\n${plan.issueAction.body}`)
      break
    case 'update':
      console.log(`scheduled-watch: DRY-RUN would-update-issue #${plan.issueAction.number} (comment + rewritten body)`)
      console.log(`scheduled-watch: DRY-RUN comment:\n${plan.issueAction.comment}`)
      break
    case 'close':
      console.log(`scheduled-watch: DRY-RUN would-close-issue #${plan.issueAction.number} — ${plan.issueAction.comment}`)
      break
  }
  console.log(`scheduled-watch: DRY-RUN EXIT ${plan.exitCode}${plan.exitCode === 1 ? ' — red guard layer (red watch run + tracked issue are the alert route)' : ' — all green'}`)
  writeStepSummary(plan)
  return plan.exitCode
}

async function liveRun(): Promise<number> {
  const token = process.env.GITHUB_TOKEN ?? ''
  if (token === '') {
    console.error('GITHUB_TOKEN is required (actions:read is sufficient for the watch itself)')
    return 1
  }
  const rawRepository = process.env.GITHUB_REPOSITORY ?? ''
  const repositoryMatches = /^([\w.-]+)\/([\w.-]+)$/.exec(rawRepository)
  if (repositoryMatches === null) {
    console.error(`GITHUB_REPOSITORY must be owner/repo, got '${rawRepository}'`)
    return 1
  }
  const repository = repositoryMatches[0]
  console.log(`scheduled-watch: target ${repository} — ${GUARD_WORKFLOWS.length} guard workflow(s)`)
  const probe = await probeRepository(token, repository)
  const states = await Promise.all(GUARD_WORKFLOWS.map(async guard => fetchGuardState(token, repository, guard, probe.defaultBranch)))
  const openIssue = probe.hasIssues ? await findOpenIssue(token, repository) : null
  const plan = planWatch(states, {hasIssues: probe.hasIssues, openIssue})
  report(plan)
  if (!probe.hasIssues) {
    console.log('scheduled-watch: issues disabled on this repository (has_issues=false) — tracked-issue route skipped; the red watch run is the alert surface')
  }
  const outcome = await executeIssueAction(token, repository, plan.issueAction)
  console.log(`scheduled-watch: issue route — ${outcome}`)
  writeStepSummary(plan)
  return plan.exitCode
}

async function main(): Promise<number> {
  const args = process.argv.slice(2)
  if (args.length === 2 && args[0] === '--dry-run') return dryRun(args[1] ?? '-')
  if (args.length === 0) return liveRun()
  console.error('usage: node scripts/scheduled-workflow-watch.ts [--dry-run <fixture.json|->]')
  return 1
}

const invoked = process.argv[1] ?? ''
if (invoked !== '' && resolve(invoked) === resolve(import.meta.filename ?? '')) {
  try {
    process.exitCode = await main()
  } catch (error) {
    console.error(`scheduled-watch: FAILED LOUD — ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  }
}
