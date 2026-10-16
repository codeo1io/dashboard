#!/usr/bin/env node
/**
 * rm-742 — stale conductor/* validation-ref sweep (drift repair, dry-run by default).
 *
 * Context: the in-repo validation process (github_ci_validate.py's ephemeral
 * remote-CI route) CREATES `conductor/ci-*` refs and DELETES them in a
 * `finally` on every validation — a full 48-ref stale population was measured
 * on 2026-10-08 (base-drift/full_tests residue). Cleanup-inside-the-route is
 * the NORM; anything still standing is DRIFT (a reaped run, a crashed
 * cleanup), not work in flight. This script enumerates that drift and, only
 * under an explicit --apply, deletes it from origin.
 *
 * Safety posture (this is the ONE script in the batch that can push):
 * - DEFAULT IS DRY-RUN: with no flags it lists and exits 0, touching nothing.
 * - `--apply` is required to delete anything; apply is PUSH-GATED in this
 *   repo's process (the roadmap def defers it to a push-authorized phase —
 *   conductor work orders prohibit push outside the ship gate).
 * - Only refs matching `refs/heads/conductor/ci-*` or
 *   `refs/heads/conductor/ci-base-*` are ever considered (the ephemeral
 *   validation namespaces — nothing else).
 * - `--cutoff-days N` (default 14): only refs whose newest commit is older
 *   than N days are candidates. Validations live <1 day; 14d is a generous
 *   drift window that cannot race an in-flight validation.
 * - `--exclude <glob>` (repeatable): protect named refs/patterns from
 *   deletion even when stale (e.g. `--exclude 'conductor/ci-base-2026-10-*'`).
 * - `--json`: machine-readable output.
 *
 * Dating method: remote refs are fetched into a THROWAWAY local namespace
 * (`refs/conductor-sweep/*`) via a single refspec fetch, dated with
 * `git for-each-ref` committerdate, then the namespace is emptied again —
 * the sweep leaves no local residue and performs no authenticated access
 * beyond the fetch a validation already performs.
 */
import {spawnSync} from 'node:child_process'
import process from 'node:process'
import {pathToFileURL} from 'node:url'

export const SWEEP_NAMESPACES = ['refs/heads/conductor/ci-', 'refs/heads/conductor/ci-base-'] as const
export const TEMP_NAMESPACE = 'refs/conductor-sweep/'
export const DEFAULT_CUTOFF_DAYS = 14

export interface ConductorRef {
  /** Full ref name on origin, e.g. refs/heads/conductor/ci-base-20261001-abcd1234 */
  ref: string
  sha: string
  /** Newest commit date on the ref, unix seconds. */
  committerDateUnix: number
  committerEmail: string
}

export interface SweepCandidate extends ConductorRef {
  ageDays: number
}

/** True when the ref belongs to one of the ephemeral validation namespaces. */
export function isInSweepNamespace(ref: string): boolean {
  return SWEEP_NAMESPACES.some(prefix => ref.startsWith(prefix))
}

/**
 * Selects deletion candidates: in-namespace + older than the cutoff + not
 * excluded. Pure — the fixture tests pin every rule.
 */
export function selectStaleRefs(
  refs: readonly ConductorRef[],
  nowMs: number,
  cutoffDays: number,
  excludes: readonly string[] = [],
): SweepCandidate[] {
  const cutoffMs = cutoffDays * 86_400_000
  const candidates: SweepCandidate[] = []
  for (const ref of refs) {
    if (!isInSweepNamespace(ref.ref)) continue
    const ageDays = Math.floor((nowMs - ref.committerDateUnix * 1000) / 86_400_000)
    // Boundary errs toward NOT deleting: age == cutoff is still within the
    // window (a deletion tool must be strict, not generous).
    if (ref.committerDateUnix * 1000 >= nowMs - cutoffMs) continue
    if (excludes.some(pattern => matchGlob(ref.ref, pattern))) continue
    candidates.push({...ref, ageDays})
  }
  // Oldest first for readable output.
  candidates.sort((a, b) => a.committerDateUnix - b.committerDateUnix)
  return candidates
}

/** Minimal glob: `*` matches any run, `?` one char (fnmatch-lite). */
export function matchGlob(text: string, pattern: string): boolean {
  const escaped = pattern
    .replaceAll(/[.+^${}()|[\]\\]/g, String.raw`\$&`)
    .replaceAll('*', '.*')
    .replaceAll('?', '.')
  return new RegExp(`^${escaped}$`).test(text)
}

function runGit(args: string[], options: {allowFailure?: boolean} = {}): {stdout: string; stderr: string; status: number | null} {
  const result = spawnSync('git', args, {encoding: 'utf8'})
  if (result.status !== 0 && options.allowFailure !== true) {
    throw new Error(`git ${args.join(' ')} failed (rc=${result.status}): ${result.stderr}`)
  }
  return {stdout: result.stdout ?? '', stderr: result.stderr ?? '', status: result.status}
}

/** Parses `git for-each-ref` output lines from the temp namespace. */
export function parseForEachRef(stdout: string): ConductorRef[] {
  const refs: ConductorRef[] = []
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    const parts = trimmed.split(/\s+/)
    const tempRef = parts[0]
    const sha = parts[1] ?? ''
    const dateUnix = Number(parts[2])
    if (
      tempRef === undefined ||
      !tempRef.startsWith(TEMP_NAMESPACE) ||
      !/^[0-9a-f]{40}$/.test(sha) ||
      !Number.isFinite(dateUnix)
    ) {
      continue
    }
    refs.push({
      ref: `refs/heads/${tempRef.slice(TEMP_NAMESPACE.length)}`,
      sha,
      committerDateUnix: dateUnix,
      committerEmail: parts.slice(3).join(' ') || 'unknown',
    })
  }
  return refs
}

function gatherRemoteRefs(): ConductorRef[] {
  // Fetch the two ephemeral namespaces into the throwaway local namespace.
  const refspecs = SWEEP_NAMESPACES.map(ns => `+${ns}*:refs/conductor-sweep/${ns.replace('refs/heads/', '')}*`)
  const fetch = runGit(['fetch', '--quiet', 'origin', ...refspecs], {allowFailure: true})
  // Empty namespaces fetch as an error in older git; tolerate that shape but
  // not real failures.
  if (fetch.status !== 0 && !/couldn't find remote ref|no match|did not match/i.test(fetch.stderr)) {
    throw new Error(`git fetch of conductor namespaces failed: ${fetch.stderr}`)
  }
  try {
    const listing = runGit([
      'for-each-ref',
      'refs/conductor-sweep/',
      '--format=%(refname) %(objectname) %(committerdate:unix) %(committeremail)',
    ])
    return parseForEachRef(listing.stdout)
  } finally {
    // Leave no local residue: empty the throwaway namespace again.
    const listing = runGit(['for-each-ref', 'refs/conductor-sweep/', '--format=%(refname)'], {allowFailure: true})
    for (const ref of listing.stdout.split('\n').map(line => line.trim()).filter(Boolean)) {
      runGit(['update-ref', '-d', ref], {allowFailure: true})
    }
  }
}

function main(): number {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const asJson = args.includes('--json')
  const cutoffFlag = args.indexOf('--cutoff-days')
  const cutoffDays =
    cutoffFlag !== -1 && Number.isFinite(Number(args[cutoffFlag + 1]))
      ? Number(args[cutoffFlag + 1])
      : DEFAULT_CUTOFF_DAYS
  const excludes: string[] = []
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--exclude') {
      const value = args[i + 1]
      if (value !== undefined) excludes.push(value)
      i++
    }
  }

  const refs = gatherRemoteRefs()
  const stale = selectStaleRefs(refs, Date.now(), cutoffDays, excludes)

  if (asJson) {
    process.stdout.write(`${JSON.stringify({totalInNamespace: refs.length, cutoffDays, stale}, null, 2)}\n`)
  } else {
    process.stdout.write(`conductor/* validation refs on origin: ${refs.length} (cutoff ${cutoffDays}d, excludes: [${excludes.join(', ')}])\n`)
    if (stale.length === 0) {
      process.stdout.write('no stale refs — nothing to do\n')
    }
    for (const candidate of stale) {
      const date = new Date(candidate.committerDateUnix * 1000).toISOString().slice(0, 10)
      process.stdout.write(`STALE ${candidate.ref} ${candidate.sha.slice(0, 10)} ${date} age ${candidate.ageDays}d ${candidate.committerEmail}\n`)
    }
    if (!apply) {
      process.stdout.write('dry-run: no deletions performed (pass --apply to delete; apply is push-gated — rm-742)\n')
    }
  }

  if (apply) {
    if (stale.length === 0) return 0
    // Batched delete; a failure of ANY ref aborts before the next batch.
    const deletion = runGit(['push', 'origin', '--delete', ...stale.map(candidate => candidate.ref)])
    if (deletion.status !== 0) {
      process.stderr.write(`::error::sweep delete failed: ${deletion.stderr}\n`)
      return 2
    }
    process.stdout.write(`deleted ${stale.length} stale ref(s) from origin\n`)
  }
  return 0
}

function isMainEntryPoint(metaUrl: string, argv1: string | undefined): boolean {
  if (argv1 === undefined || argv1 === '') return false
  try {
    return pathToFileURL(argv1).href === metaUrl
  } catch {
    return false
  }
}

if (isMainEntryPoint(import.meta.url, process.argv[1])) {
  process.exit(main())
}
