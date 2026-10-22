#!/usr/bin/env node
// scripts/workflow-fleet-assert.ts
//
// Workflow-fleet state assertion (rm-2141, 2026-10-21, repository-
// maintenance cycle:4 run 18ef6d162e3f439991a7b3c1a729cec0).
//
// The estate's chronic silent-failure class, turned into a red check: this
// script compares the checked-in expected-state manifest
// (.github/workflow-fleet-manifest.yaml) against the LIVE workflow fleet via
// the Actions REST API and exits 1 with an actionable diff when reality
// diverges from the manifest. Divergence classes (from the def):
//   1. state mismatch        — a manifested workflow's live state differs
//                              from its expected_state (active | retired)
//   2. active-without-file   — an active live workflow whose file does not
//                              exist in the tree
//   3. file-without-workflow — an expected-active workflow file with no
//                              live workflow object at all
//   4. run-list staleness    — an active, cron-scheduled workflow whose
//                              newest run is older than its manifested
//                              run_recency_hours horizon (or has none)
//   5. unmanifested          — a live workflow or tree file with no
//                              manifest entry (new workflows must be
//                              manifested; test/workflow-fleet-state-guard
//                              .test.ts pins the in-tree side of this)
//
// Boundary vs scripts/actions-darkness-watch.ts (rm-1411): that script owns
// the OUT-OF-BAND run-creation signal (a run was OWED by a push/schedule
// trigger and never created) and intentionally needs no CI lane; this script
// owns the IN-BAND fleet-truth check (states + scheduled cadence) and runs
// from the audit.yaml fleet-state job. A red run IS the signal — the same
// red-is-the-signal convention as the audit job and base-drift.yaml, since
// issues are disabled on this fork.
//
// GitHub-managed dynamic workflows (paths outside .github/workflows/, e.g.
// dynamic/dependabot/dependabot-updates) are ignored: they are not
// file-backed, are toggled by config rather than workflow files, and have
// no manifest surface.
//
// Usage:
//   node scripts/workflow-fleet-assert.ts
//   bun run scripts/workflow-fleet-assert.ts   # needs node_modules/yaml
//
// Environment:
//   FLEET_ASSERT_REPO       Repository to assert (default: codeo1io/dashboard).
//   FLEET_ASSERT_NOW        Override "now" (ISO-8601). Test seam — production
//                           callers omit this.
//   FLEET_ASSERT_TOKEN      GitHub token for the API reads.
//   GITHUB_TOKEN            Fallback if FLEET_ASSERT_TOKEN is unset (the
//                           audit job passes github.token here).
//   FLEET_ASSERT_MANIFEST   Override manifest file path. Test seam.
//
// Exit codes (0/1 ladder): 0 = fleet matches the manifest, 1 = divergence(s)
// found (the diff is the payload) or inputs could not be read.

import {readFileSync, readdirSync} from 'node:fs'
import {join} from 'node:path'
import process from 'node:process'
import {fileURLToPath} from 'node:url'
import {parse} from 'yaml'

/** One expected-state entry from .github/workflow-fleet-manifest.yaml. */
export interface FleetManifestEntry {
  path: string
  id?: number
  expected_state: 'active' | 'retired'
  run_recency_hours: number | null
  note?: string
}

/** A live workflow as reported by the Actions REST API. */
export interface LiveWorkflow {
  id: number
  path: string
  state: string
}

export type FleetDivergenceKind =
  | 'state-mismatch'
  | 'active-without-file'
  | 'file-without-workflow'
  | 'stale-run-list'
  | 'unmanifested'

export interface FleetDivergence {
  kind: FleetDivergenceKind
  path: string
  detail: string
}

export interface FleetVerdict {
  /** Number of manifest entries asserted. */
  asserted: number
  divergences: FleetDivergence[]
}

const WORKFLOW_DIR_PREFIX = '.github/workflows/'

function repoRoot(): string {
  return fileURLToPath(new URL('..', import.meta.url))
}

/** Parse and validate the manifest. Throws on any malformed entry. */
export function parseManifest(text: string): FleetManifestEntry[] {
  let doc: Record<string, unknown>
  try {
    const parsed: unknown = parse(text)
    if (parsed === null || typeof parsed !== 'object') {
      throw new Error('manifest is empty')
    }
    doc = parsed as Record<string, unknown>
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`manifest is not valid YAML: ${message}`)
  }
  const workflows = doc.workflows
  if (!Array.isArray(workflows) || workflows.length === 0) {
    throw new Error('manifest has no workflows list')
  }
  return workflows.map((raw, index) => {
    if (raw === null || typeof raw !== 'object') {
      throw new Error(`manifest workflows[${index}] is not a mapping`)
    }
    const entry = raw as Record<string, unknown>
    const path = entry.path
    if (typeof path !== 'string' || !path.startsWith(WORKFLOW_DIR_PREFIX)) {
      throw new Error(`manifest workflows[${index}].path must be a .github/workflows/ path`)
    }
    const expectedState = entry.expected_state
    if (expectedState !== 'active' && expectedState !== 'retired') {
      throw new Error(`manifest workflows[${index}] (${path}): expected_state must be 'active' or 'retired'`)
    }
    const horizon = entry.run_recency_hours
    if (horizon !== null && typeof horizon !== 'number') {
      throw new Error(`manifest workflows[${index}] (${path}): run_recency_hours must be a number or null`)
    }
    const id = entry.id
    if (id !== undefined && typeof id !== 'number') {
      throw new Error(`manifest workflows[${index}] (${path}): id must be a number when present`)
    }
    const note = entry.note
    if (note !== undefined && typeof note !== 'string') {
      throw new Error(`manifest workflows[${index}] (${path}): note must be a string when present`)
    }
    return {path, id, expected_state: expectedState, run_recency_hours: horizon, note}
  })
}

/** Read the workflow files present in the tree (paths, not bare names). */
export function readTreeWorkflowFiles(root: string): string[] {
  const dir = join(root, '.github', 'workflows')
  return readdirSync(dir)
    .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
    .map(f => `${WORKFLOW_DIR_PREFIX}${f}`)
    .sort()
}

/**
 * Pure fleet comparison. latestRuns maps a live workflow id to the ISO-8601
 * createdAt of its newest run (absent key/undefined = never ran).
 */
export function computeFleetState(input: {
  entries: FleetManifestEntry[]
  liveWorkflows: LiveWorkflow[]
  treeFiles: string[]
  latestRuns: Record<number, string>
  now: string
}): FleetVerdict {
  const nowMs = Date.parse(input.now)
  const divergences: FleetDivergence[] = []
  const liveByPath = new Map(input.liveWorkflows.map(w => [w.path, w]))
  const treeSet = new Set(input.treeFiles)
  const entryByPath = new Map(input.entries.map(e => [e.path, e]))

  for (const entry of input.entries) {
    const live = liveByPath.get(entry.path)
    const hasFile = treeSet.has(entry.path)
    if (entry.expected_state === 'retired') {
      if (hasFile) {
        divergences.push({
          kind: 'state-mismatch',
          path: entry.path,
          detail: 'manifest expects retired but the tree still carries the file — retire one of the two consciously',
        })
      }
      if (live === undefined) continue // absent: fully retired, as expected
      if (live.state === 'active') {
        divergences.push({
          kind: 'state-mismatch',
          path: entry.path,
          detail: `expected retired but live workflow id ${live.id} is ACTIVE — the ghost runs with no file in the tree`,
        })
      }
      continue
    }
    // expected active
    if (live === undefined) {
      divergences.push({
        kind: 'file-without-workflow',
        path: entry.path,
        detail: 'expected active but no live workflow object exists for this path',
      })
      continue
    }
    if (live.state !== 'active') {
      divergences.push({
        kind: 'state-mismatch',
        path: entry.path,
        detail: `expected active but live state is '${live.state}' (workflow id ${live.id})`,
      })
      continue
    }
    if (!hasFile) {
      divergences.push({
        kind: 'active-without-file',
        path: entry.path,
        detail: `live workflow id ${live.id} is active but no such file exists in the tree`,
      })
      continue
    }
    const horizonHours = entry.run_recency_hours
    if (horizonHours !== null) {
      const latest = input.latestRuns[live.id]
      const horizonMs = horizonHours * 60 * 60 * 1000
      if (latest === undefined) {
        divergences.push({
          kind: 'stale-run-list',
          path: entry.path,
          detail: `scheduled workflow has no runs at all (horizon ${horizonHours}h)`,
        })
      } else {
        const ageMs = nowMs - Date.parse(latest)
        if (Number.isNaN(ageMs)) {
          divergences.push({
            kind: 'stale-run-list',
            path: entry.path,
            detail: `newest run has an unparsable createdAt ('${latest}')`,
          })
        } else if (ageMs > horizonMs) {
          const ageDays = Math.round((ageMs / (24 * 60 * 60 * 1000)) * 10) / 10
          divergences.push({
            kind: 'stale-run-list',
            path: entry.path,
            detail: `newest run ${latest} is ${ageDays}d old, beyond the ${horizonHours}h horizon`,
          })
        }
      }
    }
  }

  // Live workflows nobody manifested (the ghost class when it is not
  // explicitly expected-retired; brand-new GitHub-side surprises otherwise).
  for (const w of input.liveWorkflows) {
    if (entryByPath.has(w.path)) continue
    const fileSide = treeSet.has(w.path) ? 'the tree file is also unmanifested' : 'no file in tree (ghost)'
    divergences.push({
      kind: 'unmanifested',
      path: w.path,
      detail: `live workflow (id ${w.id}, state '${w.state}') has no manifest entry; ${fileSide}`,
    })
  }
  // Tree files nobody manifested and no live workflow vouches for either.
  for (const f of input.treeFiles) {
    if (entryByPath.has(f) || liveByPath.has(f)) continue
    divergences.push({
      kind: 'unmanifested',
      path: f,
      detail: 'workflow file in tree with no manifest entry and no live workflow',
    })
  }

  divergences.sort((a, b) => (a.path === b.path ? a.kind.localeCompare(b.kind) : a.path.localeCompare(b.path)))
  return {asserted: input.entries.length, divergences}
}

interface ApiWorkflows {
  workflows: {id: number; path: string; state: string}[]
}

interface ApiRuns {
  workflow_runs: {created_at: string}[]
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
  const repo = process.env.FLEET_ASSERT_REPO ?? 'codeo1io/dashboard'
  const now = process.env.FLEET_ASSERT_NOW ?? new Date().toISOString()
  const token = process.env.FLEET_ASSERT_TOKEN ?? process.env.GITHUB_TOKEN
  const manifestPath =
    process.env.FLEET_ASSERT_MANIFEST ?? join(repoRoot(), '.github', 'workflow-fleet-manifest.yaml')
  try {
    const entries = parseManifest(readFileSync(manifestPath, 'utf8'))
    const treeFiles = readTreeWorkflowFiles(repoRoot())
    const apiWorkflows = await fetchJson<ApiWorkflows>(
      `https://api.github.com/repos/${repo}/actions/workflows?per_page=100`,
      token,
    )
    // Dynamic (GitHub-managed) workflows live outside .github/workflows/ and
    // have no manifest surface — the file-backed fleet is the assert scope.
    const fileBacked = apiWorkflows.workflows
      .map(w => ({id: w.id, path: w.path, state: w.state}))
      .filter(w => w.path.startsWith(WORKFLOW_DIR_PREFIX))
    const latestRuns: Record<number, string> = {}
    for (const w of fileBacked) {
      const runs = await fetchJson<ApiRuns>(
        `https://api.github.com/repos/${repo}/actions/workflows/${w.id}/runs?per_page=1`,
        token,
      )
      const newest = runs.workflow_runs[0]
      if (newest !== undefined) latestRuns[w.id] = newest.created_at
    }
    const verdict = computeFleetState({entries, liveWorkflows: fileBacked, treeFiles, latestRuns, now})
    if (verdict.divergences.length === 0) {
      console.log(
        `workflow-fleet: fleet matches the manifest (${verdict.asserted} entries asserted, ${fileBacked.length} live file-backed workflows, repo=${repo}, now=${now})`,
      )
      return 0
    }
    console.error(
      `workflow-fleet: ${verdict.divergences.length} divergence(s) vs ${manifestPath} (repo=${repo}, now=${now}) — rm-2141 designed-red: cure the fleet, or update the manifest as a conscious decision:`,
    )
    for (const d of verdict.divergences) {
      console.error(`  [${d.kind}] ${d.path} — ${d.detail}`)
    }
    return 1
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`workflow-fleet: verdict=UNKNOWN repo=${repo} error=${message}`)
    return 1
  }
}

const scriptPath = process.argv[1]
if (scriptPath !== undefined && scriptPath.endsWith('workflow-fleet-assert.ts')) {
  process.exitCode = await main()
}
