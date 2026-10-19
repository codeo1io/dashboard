#!/usr/bin/env node
/**
 * Derive conductor run-state dispositions for conductor-pr-janitor.ts from
 * ORIGIN-SIDE evidence (rm-2009).
 *
 * The janitor accepts `--run-state <runId>=<landed|aborted|live>` but nothing
 * feeds it today (hand-feeding is the thing rm-2009 exists to remove). The
 * campaign's own engine state (its DB / run dirs) lives on the operator host
 * and is unreachable from a CI runner — and the operator-host conductor DBs
 * carry no runs table at all (verified stale/empty 2026-10-18, rm-2009
 * fleet-data note; re-probed first-hand 2026-10-19: conductor/conductor.db
 * is 4 KiB with no runs table, conductor-74d2adffdc53.sqlite and
 * conductor/hermes-conductor.db are 0 bytes), so even a cron recipe on that
 * host should not trust them. What IS authoritative and reachable everywhere
 * is the repository itself.
 *
 * `landed` is derivable with certainty two ways:
 *   1. a landing merge on origin/main names the run:
 *      `merge: autonomously integrate run <runId>` (32-hex full id)
 *   2. the open PR's head commit is an ancestor of origin/main (content
 *      landed — e.g. via a differently-worded merge or a fast-forward).
 *
 * Everything else is deliberately OMITTED: the janitor then treats the run as
 * unknown -> report-only. `aborted`/`live` are campaign-side facts with no
 * origin-side ground truth, so claiming them would be fabrication; the weekly
 * report surfaces exactly the PRs still needing a human/campaign disposition.
 *
 * Output (stdout):
 *   - a human triage table
 *   - one machine line: `run-state-args: --run-state=<id>=landed ...`
 *     Tokens are strictly `[0-9a-f]{8}` + literal `=landed`, so a workflow
 *     can word-split the captured line into the janitor invocation safely.
 *
 * Exit codes: 0 = derivation ran (even when zero states were derivable);
 *             1 = infrastructure failure (gh/git missing or failing).
 */
import {spawnSync} from 'node:child_process'
import process from 'node:process'
import {runIdFromHead} from './conductor-pr-janitor.ts'

export interface ConductorPrWithOid {
  readonly number: number
  readonly headRefName: string
  readonly headRefOid: string
}

export const DEFAULT_REPO = 'codeo1io/dashboard'

/** Landing-merge subject convention on this fork's main. */
export const LANDING_RUN_PATTERN = /integrate run ([0-9a-f]{8,40})/i

/**
 * Defensive history cap for the subject scan; this repo's history is far
 * smaller — the cap only bounds a runaway on a hypothetical huge clone.
 */
const MAX_SUBJECT_COMMITS = 20_000

export function landedFullRunIds(mergeSubjects: readonly string[]): Set<string> {
  const ids = new Set<string>()
  for (const subject of mergeSubjects) {
    const match = LANDING_RUN_PATTERN.exec(subject)
    if (match) ids.add((match[1] ?? '').toLowerCase())
  }
  return ids
}

/**
 * A run id (short 8-hex or full 32-hex) is landed when any landed full id
 * and it are prefixes of one another.
 */
export function isLandedBySubject(
  runId: string,
  landedIds: ReadonlySet<string>,
): boolean {
  const id = runId.toLowerCase()
  for (const full of landedIds) {
    if (full.startsWith(id) || id.startsWith(full)) return true
  }
  return false
}

export interface UndeterminedPr {
  readonly number: number
  readonly headRefName: string
  readonly runId: string
}

export interface DeriveRunStatesResult {
  /** runId -> 'landed' for every open conductor PR proven landed. */
  readonly landed: ReadonlyMap<string, 'landed'>
  /** Open conductor PRs with no derivable state (janitor: unknown/report-only). */
  readonly unknown: readonly UndeterminedPr[]
}

export function deriveRunStates(
  prs: readonly ConductorPrWithOid[],
  opts: {
    readonly landedIds: ReadonlySet<string>
    readonly isAncestorOfMain: (headRefOid: string) => boolean
  },
): DeriveRunStatesResult {
  const landed = new Map<string, 'landed'>()
  const unknown: UndeterminedPr[] = []
  for (const pr of prs) {
    const runId = runIdFromHead(pr.headRefName)
    if (runId === null) continue // non-conductor PR — out of scope entirely
    if (isLandedBySubject(runId, opts.landedIds) || opts.isAncestorOfMain(pr.headRefOid)) {
      landed.set(runId, 'landed')
    } else {
      unknown.push({number: pr.number, headRefName: pr.headRefName, runId})
    }
  }
  return {landed, unknown}
}

/** The machine-readable janitor argument tail (empty when nothing derived). */
export function renderRunStateArgs(landed: ReadonlyMap<string, unknown>): string {
  return [...landed.keys()].map(id => `--run-state=${id}=landed`).join(' ')
}

function runTool(
  tool: 'gh' | 'git',
  args: readonly string[],
): {ok: true; stdout: string} | {ok: false; status: number; stderr: string} {
  const res = spawnSync(tool, args, {encoding: 'utf8'})
  if (res.error !== undefined) {
    return {ok: false, status: -1, stderr: `${tool}: ${res.error.message}`}
  }
  if (res.status !== 0) {
    return {
      ok: false,
      status: res.status ?? -1,
      stderr: `${tool} ${args.join(' ')} -> rc ${String(res.status)}: ${res.stderr}`,
    }
  }
  return {ok: true, stdout: res.stdout}
}

function usage(): void {
  process.stdout.write(
    'Usage: node scripts/conductor-run-state-derive.ts [--repo owner/name]\n' +
    '  Derives --run-state args for conductor-pr-janitor.ts from origin evidence\n' +
    '  (landing merges + head-ancestry on origin/main). Requires gh + git.\n',
  )
}

function main(): number {
  const argv = process.argv.slice(2)
  const repoFlag = argv.indexOf('--repo')
  const repoValue = repoFlag === -1 ? undefined : argv[repoFlag + 1]
  const repo = repoValue === undefined ? DEFAULT_REPO : repoValue
  if (argv.includes('--help') || argv.includes('-h')) {
    usage()
    return 0
  }

  const prRes = runTool('gh', [
    'pr',
    'list',
    '-R',
    repo,
    '--state',
    'open',
    '--limit',
    '200',
    '--json',
    'number,headRefName,headRefOid',
  ])
  if (!prRes.ok) {
    process.stderr.write(`${prRes.stderr}\n`)
    return 1
  }
  const prs = JSON.parse(prRes.stdout) as ConductorPrWithOid[]

  const subjectsRes = runTool('git', [
    'log',
    '--format=%s',
    `-n`,
    String(MAX_SUBJECT_COMMITS),
    'origin/main',
  ])
  if (!subjectsRes.ok) {
    process.stderr.write(`${subjectsRes.stderr}\n`)
    return 1
  }
  const landedIds = landedFullRunIds(subjectsRes.stdout.split('\n'))

  // Ancestry is only consulted for PRs the subject scan could not settle —
  // each check is a git subprocess, so skip the ones already proven landed.
  const isAncestorOfMain = (oid: string): boolean => {
    const res = runTool('git', ['merge-base', '--is-ancestor', oid, 'origin/main'])
    if (!res.ok) {
      // rc 1 is git's "not an ancestor" answer — the expected negative. Any
      // other status (e.g. 128 missing object/ref) is a real failure: surface
      // it on stderr. Both directions degrade to "not landed" (report-only),
      // never a false `landed`.
      if (res.status !== 1) process.stderr.write(`${res.stderr}\n`)
      return false
    }
    return true
  }

  const {landed, unknown} = deriveRunStates(prs, {landedIds, isAncestorOfMain})

  const lines: string[] = []
  lines.push(`conductor-run-state-derive (repo ${repo})`)
  lines.push('')
  if (landed.size === 0 && unknown.length === 0) {
    lines.push('No open conductor PRs — nothing to derive.')
  }
  if (landed.size > 0) {
    lines.push('Landed (run-state fed to the janitor):')
    for (const runId of landed.keys()) lines.push(`  ${runId}  landed`)
  }
  if (unknown.length > 0) {
    lines.push('')
    lines.push('Undetermined (janitor report-only — needs a human/campaign disposition):')
    for (const pr of unknown) lines.push(`  #${pr.number}  ${pr.headRefName}  (${pr.runId})`)
  }
  lines.push('')
  lines.push(`run-state-args: ${renderRunStateArgs(landed)}`)
  process.stdout.write(`${lines.join('\n')}\n`)
  return 0
}

if (process.argv[1]?.endsWith('conductor-run-state-derive.ts')) {
  process.exit(main())
}
