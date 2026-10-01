#!/usr/bin/env node
// scripts/actions-cache-prune.ts
//
// Prune-by-prefix hygiene for this repository's GitHub Actions cache pool.
//
// Why this exists (rm-278): the 2026-09-30 live census measured 129 active
// caches / 10,715,986,719 bytes against GitHub's documented 10 GB per-repo
// ceiling — eviction-on-save is already in effect, so cache-dependent work
// (lint cures, CodeQL bootstrap) runs in a saturated pool and stale
// lockfile-keyed `node-` caches linger indefinitely.
//
// KEEP-INVARIANT (hard, asserted in-script): caches whose key starts with an
// entry of PROTECTED_PREFIXES are NEVER planned for deletion. `opencode-`
// caches carry the repaired opencode bootstrap database (AGENTS.md: do not
// purge them); deleting them regresses the documented bootstrap-timeout
// pathology. The plan builder fails closed: if a protected key ever reaches
// the deletion set, it throws instead of deleting.
//
// Usage:
//   node scripts/actions-cache-prune.ts                # DRY-RUN (default)
//   node scripts/actions-cache-prune.ts --apply        # actually delete
//   node scripts/actions-cache-prune.ts --older-than-days 14
//   node scripts/actions-cache-prune.ts --prefix node- --prefix codeql-
//   node scripts/actions-cache-prune.ts --repo owner/name --json
//
// Behavior:
//   - Census: GET /repos/{repo}/actions/caches (paginated, 100/page) plus
//     GET /repos/{repo}/actions/cache/usage, via `gh api` (auth inherited).
//   - Plan: caches matching a prune prefix AND older than --older-than-days
//     (default 7) are deleted by cache id — never by key, so a bad prefix can
//     not bulk-delete a protected family. Explicit --prefix flags REPLACE the
//     default targets and repeat (each --prefix adds one).
//   - DRY-RUN prints the projection (count, bytes, projected remaining total)
//     and deletes nothing. --apply deletes per-id and re-censuses after.
//   - Exit codes: 0 = plan produced (dry-run) or apply complete; 1 = usage or
//     API error; 2 = keep-invariant violation (fail closed, deletes nothing).
//
// Environment: none beyond `gh` being authenticated.

import {spawnSync} from 'node:child_process'
import process from 'node:process'
import {pathToFileURL} from 'node:url'

/** A single Actions cache entry as returned by GET /repos/{owner}/{repo}/actions/caches. */
export interface CacheEntry {
  cache_id: number
  key: string
  /** ISO 8601 creation timestamp. */
  created_at: string
  size_in_bytes: number
}

/** The prune plan returned by {@link planPrune}. */
export interface PrunePlan {
  /** Caches selected for deletion (deleted per id, never by key). */
  toDelete: CacheEntry[]
  /** Caches the plan leaves in place (protected, non-target, or too fresh). */
  kept: CacheEntry[]
  /** How many kept caches were kept because a protected prefix matched. */
  protectedKept: number
  /** Sum of toDelete sizes, in bytes. */
  pruneBytes: number
  /** How many target-prefix caches were kept for being at/fresh of the age floor. */
  skippedFresh: number
}

/** Options for {@link planPrune} (all but `caches` optional; see defaults inline). */
export interface PlanPruneOptions {
  caches: readonly CacheEntry[]
  /** Key prefixes to prune; default ['node-', 'codeql-', 'cache-', 'trivy-']. */
  prunePrefixes?: readonly string[]
  /** Extra key prefixes to protect ON TOP of the hard-coded opencode- invariant. */
  protectedPrefixes?: readonly string[]
  /** Minimum age in days to be prunable; default 7. 0 disables the floor. */
  olderThanDays?: number
  /** Clock seam (tests); default () => Date.now(). */
  nowMs?: () => number
}

/** One census row: a key-prefix family and its cache count / total bytes. */
export type CensusRow = [prefix: string, group: {count: number; bytes: number}]

/** Cache key prefixes that must never be deleted (see header). */
const PROTECTED_PREFIXES: readonly string[] = ['opencode-']

/** Hard protection predicate derived from the module constant. */
const hardProtected = (key: string) => PROTECTED_PREFIXES.some(prefix => key.startsWith(prefix))

/** Default prune targets, largest-impact first per the 2026-09-30 census. */
const DEFAULT_PRUNE_PREFIXES = ['node-', 'codeql-', 'cache-', 'trivy-']

/** Prune prefixes whose deletion surface would overlap a protected family. */
export function conflictsWithProtected(prunePrefixes: readonly string[]): string[] {
  return prunePrefixes.filter(prefix => PROTECTED_PREFIXES.some(protectedPrefix => protectedPrefix.startsWith(prefix) || prefix.startsWith(protectedPrefix)))
}

const DEFAULT_REPO = 'codeo1io/dashboard'
const DEFAULT_OLDER_THAN_DAYS = 7
/** GitHub's documented per-repo cache quota. */
const QUOTA_BYTES = 10 * 1024 ** 3

/**
 * Build the prune plan. Pure — no I/O — so tests cover the policy exhaustively.
 *
 * Hard protection: the module constant ALWAYS applies, on top of any
 * caller-supplied list — `opencode-` can not be pruned via arguments.
 */
export function planPrune({caches, prunePrefixes = DEFAULT_PRUNE_PREFIXES, protectedPrefixes = PROTECTED_PREFIXES, olderThanDays = DEFAULT_OLDER_THAN_DAYS, nowMs = () => Date.now()}: PlanPruneOptions): PrunePlan {
  const now = nowMs()
  const cutoff = now - olderThanDays * 24 * 60 * 60 * 1000
  const isProtected = (key: string) => hardProtected(key) || protectedPrefixes.some(prefix => key.startsWith(prefix))
  const isTarget = (key: string) => prunePrefixes.some(prefix => key.startsWith(prefix))

  const toDelete: CacheEntry[] = []
  const kept: CacheEntry[] = []
  let protectedKept = 0
  let skippedFresh = 0

  for (const cache of caches) {
    if (isProtected(cache.key)) {
      protectedKept++
      kept.push(cache)
      continue
    }
    if (!isTarget(cache.key)) {
      kept.push(cache)
      continue
    }
    if (olderThanDays > 0 && Date.parse(cache.created_at) >= cutoff) {
      skippedFresh++
      kept.push(cache)
      continue
    }
    toDelete.push(cache)
  }

  // KEEP-INVARIANT, asserted: a protected key in the deletion set is a policy
  // breach — fail closed rather than delete. Checked against the module
  // constant, so no argument combination can bypass it.
  for (const cache of toDelete) {
    if (hardProtected(cache.key)) {
      throw new Error(`keep-invariant violation: protected cache planned for deletion: ${cache.key}`)
    }
  }

  const pruneBytes = toDelete.reduce((sum, cache) => sum + cache.size_in_bytes, 0)
  return {toDelete, kept, protectedKept, pruneBytes, skippedFresh}
}

/** Group caches by first key segment for census output, largest byte total first. */
export function censusByPrefix(caches: readonly CacheEntry[]): CensusRow[] {
  const groups = new Map<string, {count: number; bytes: number}>()
  for (const cache of caches) {
    const prefix = `${cache.key.split('-', 1)[0] ?? cache.key}-`
    const group = groups.get(prefix) ?? {count: 0, bytes: 0}
    group.count++
    group.bytes += cache.size_in_bytes
    groups.set(prefix, group)
  }
  return [...groups.entries()].sort((a, b) => b[1].bytes - a[1].bytes)
}

/** Run `gh api` and parse the JSON response; throws with stderr on failure. */
function ghApi(repo: string, path: string, method: 'GET' | 'DELETE' = 'GET'): Record<string, unknown> {
  const result = spawnSync('gh', ['api', '--method', method, `/repos/${repo}${path}`], {
    encoding: 'utf8',
    timeout: 30_000,
  })
  if (result.status !== 0) {
    throw new Error(`gh api ${method} /repos/${repo}${path} failed (${result.status}): ${result.stderr?.trim() ?? 'no stderr'}`)
  }
  const body = result.stdout.trim()
  return body === '' ? {} : (JSON.parse(body) as Record<string, unknown>)
}

/** Fetch every cache entry (paginated). */
function listCaches(repo: string): CacheEntry[] {
  const caches: CacheEntry[] = []
  for (let page = 1; page <= 50; page++) {
    const response = ghApi(repo, `/actions/caches?per_page=100&page=${page}`)
    const batch = (response.actions_caches as CacheEntry[] | undefined) ?? []
    caches.push(...batch)
    if (caches.length >= (Number(response.total_count) || 0) || batch.length === 0) break
  }
  return caches
}

/** Read active_caches_size_in_bytes out of a /actions/cache/usage response. */
function usageBytes(usage: Record<string, unknown>): number {
  return Number(usage.active_caches_size_in_bytes ?? 0)
}

function formatBytes(bytes: number): string {
  const gib = bytes / 1024 ** 3
  if (gib >= 1) return `${gib.toFixed(2)} GiB`
  return `${(bytes / 1024 ** 2).toFixed(1)} MiB`
}

/** Parsed command line (see header comment for semantics). */
interface CliOptions {
  apply: boolean
  json: boolean
  repo: string
  olderThanDays: number
  prunePrefixes: string[]
}

/** Read the value that follows a value-taking flag, failing loudly if absent. */
function takeValue(argv: readonly string[], index: number, flag: string): string {
  const value = argv[index]
  if (value === undefined) throw new Error(`${flag} requires a value`)
  return value
}

function parseArgs(argv: readonly string[]): CliOptions {
  const prefixes: string[] = []
  let repo = DEFAULT_REPO
  let olderThanDaysRaw = String(DEFAULT_OLDER_THAN_DAYS)
  let apply = false
  let json = false
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === undefined) continue
    if (arg === '--apply') apply = true
    else if (arg === '--json') json = true
    else if (arg.startsWith('--repo=')) repo = arg.slice('--repo='.length)
    else if (arg === '--repo') repo = takeValue(argv, i + 1, arg)
    else if (arg.startsWith('--older-than-days=')) olderThanDaysRaw = arg.slice('--older-than-days='.length)
    else if (arg === '--older-than-days') olderThanDaysRaw = takeValue(argv, i + 1, arg)
    else if (arg.startsWith('--prefix=')) prefixes.push(arg.slice('--prefix='.length))
    else if (arg === '--prefix') prefixes.push(takeValue(argv, i + 1, arg))
    else throw new Error(`unknown argument: ${arg}`)
    // Value-taking long forms consume their operand.
    if (arg === '--repo' || arg === '--older-than-days' || arg === '--prefix') i++
  }
  const olderThanDays = Number(olderThanDaysRaw)
  if (!Number.isFinite(olderThanDays) || olderThanDays < 0) throw new Error(`--older-than-days must be a non-negative number, got: ${olderThanDaysRaw}`)
  return {apply, json, repo, olderThanDays, prunePrefixes: prefixes.length > 0 ? prefixes : DEFAULT_PRUNE_PREFIXES.slice()}
}

function main(argv: readonly string[]): number {
  let options: CliOptions
  try {
    options = parseArgs(argv)
  } catch (error) {
    process.stderr.write(`actions-cache-prune: ${error instanceof Error ? error.message : String(error)}\n`)
    return 1
  }
  // Refuse to plan anything that would touch protected prefixes even if the
  // caller explicitly passed one as a prune prefix.
  const conflicting = conflictsWithProtected(options.prunePrefixes)
  if (conflicting.length > 0) {
    process.stderr.write(`actions-cache-prune: refusing prune prefixes that overlap protected prefixes ${PROTECTED_PREFIXES.join(', ')}: ${conflicting.join(', ')}\n`)
    return 2
  }

  const usageBefore = ghApi(options.repo, '/actions/cache/usage')
  const caches = listCaches(options.repo)
  const plan = planPrune({caches, prunePrefixes: options.prunePrefixes, olderThanDays: options.olderThanDays})

  const projectedRemaining = usageBytes(usageBefore) - plan.pruneBytes
  if (options.json) {
    process.stdout.write(`${JSON.stringify({repo: options.repo, dryRun: !options.apply, usageBefore, censusCount: caches.length, protectedKept: plan.protectedKept, skippedFresh: plan.skippedFresh, deleteCount: plan.toDelete.length, pruneBytes: plan.pruneBytes, projectedRemainingBytes: projectedRemaining}, null, 2)}\n`)
  } else {
    process.stdout.write(`Actions cache hygiene — ${options.repo} (${options.apply ? 'APPLY' : 'DRY-RUN'})\n`)
    process.stdout.write(`protected prefixes (never deleted): ${PROTECTED_PREFIXES.join(', ')}\n`)
    process.stdout.write(`prune prefixes: ${options.prunePrefixes.join(', ')} | older than ${options.olderThanDays}d\n\n`)
    for (const [prefix, group] of censusByPrefix(caches)) {
      process.stdout.write(`  ${prefix.padEnd(10)} ${String(group.count).padStart(4)} caches  ${formatBytes(group.bytes)}\n`)
    }
    process.stdout.write(`\nplan: delete ${plan.toDelete.length} caches (${formatBytes(plan.pruneBytes)}), keep ${plan.kept.length} (${plan.protectedKept} protected, ${plan.skippedFresh} fresh-skipped)\n`)
    process.stdout.write(`usage now: ${formatBytes(usageBytes(usageBefore))} / ${formatBytes(QUOTA_BYTES)} → projected ${formatBytes(projectedRemaining)}\n`)
    if (!options.apply) process.stdout.write('dry-run: nothing was deleted (pass --apply to prune)\n')
  }

  if (!options.apply) return 0

  for (const cache of plan.toDelete) {
    ghApi(options.repo, `/actions/caches/${cache.cache_id}`, 'DELETE')
  }
  const usageAfter = ghApi(options.repo, '/actions/cache/usage')
  process.stdout.write(`applied: deleted ${plan.toDelete.length} caches; usage after: ${formatBytes(usageBytes(usageAfter))} (${String(usageAfter.active_caches_count ?? '?')} caches)\n`)
  return 0
}

const entryScript = process.argv[1]
const isDirectRun = entryScript !== undefined && import.meta.url === pathToFileURL(entryScript).href
if (isDirectRun) {
  try {
    process.exit(main(process.argv.slice(2)))
  } catch (error) {
    process.stderr.write(`actions-cache-prune: ${error instanceof Error ? error.message : String(error)}\n`)
    process.exit(2)
  }
}
