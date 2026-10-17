#!/usr/bin/env node
/**
 * rm-740 — release-channel staleness check (operational truth: a silently
 * dead release channel must be LOUD).
 *
 * Background: the fork's durable release channel is half-dead by design
 * today — `actions/secrets` is empty (`total_count=0`), so `HAS_RELEASE_APP`
 * is false and release.yaml skips create-tag / promote-calver /
 * create-GitHub-Release on every push (run 405e9004 assess F1, HIGH). The
 * newest calver tag is 2026.08.9 and nothing alerts on that silence. This
 * script makes the staleness a scheduled red: it reads the repo's OWN tags
 * (public refs, no new secrets — the workflow's default `GITHUB_TOKEN` via
 * actions/checkout is the only credential involved), compares the newest
 * calver tag's age against a stated N-day threshold, and exits:
 *
 *   0  healthy  — newest calver tag within the threshold
 *   0  retired  — a recorded dormancy decision marks the channel
 *                 retired-with-owner (see DECISION_FILE below)
 *   1  stale    — newest calver tag older than the threshold and the channel
 *                 is NOT recorded-retired (red while undecided is BY DESIGN:
 *                 the decision owner rm-714 has not recorded either outcome)
 *   2  extraction error — no tags readable at all (fail loud on the tool,
 *                 never render a verdict from empty evidence — the rm-166
 *                 lesson from the base-drift digest readback)
 *
 * rm-1932 — the verdict is scoped to the FORK CHANNEL's own tags. This
 * repo's refs/tags namespace carries FOREIGN upstream tags (fetched
 * alongside the fork's history; e.g. 2026.10.24-.43 point at upstream
 * commits this fork's main does NOT contain), and — subtler — ABSORBED
 * upstream releases whose commits the fork's main DOES contain (2026.10.23:
 * fro-bot[bot] #613, ancestor of this fork's main AND of upstream main).
 * Plain reachability therefore still reports upstream's cadence as this
 * fork's health. Two-tier scoping, composed in scopeToChannel:
 *   1. keep only calver tags reachable from the base ref (default
 *      origin/main; --base-ref), and
 *   2. exclude tags reachable from --upstream-ref (upstream main) — a
 *      release this fork minted at a pure-upstream commit is misclassified
 *      as upstream's, which skews newest OLDER = a REDDER verdict; the
 *      error direction is deliberately safe (a false healthy is the bug
 *      this exists to kill, a false stale merely demands a look).
 * An unresolvable base or upstream ref is an EXTRACTION ERROR (fail closed
 * — never fall back to the unscoped set). The summary names both exclusion
 * counts. Empty scope after exclusion is NOT an extraction error: it is the
 * true "this fork's channel has never minted a tag of its own" red.
 *
 * rm-1932 — the third calver component is a PER-MONTH RELEASE COUNTER, not a
 * calendar day: upstream cuts >31 releases in a month (live census 2026-10-17:
 * 2026.06.31-.57, 2026.07.32-.43, 2026.08.32-.36, 2026.10.32-.43). The
 * parser accepts any positive integer counter (day-shaped tags 1-31 are the
 * legacy subset and stay valid); 4-part sub-tags (2026.06.15.1) stay ignored.
 * A zero counter is rejected (compute-release-tag may START at .0 but a
 * channel whose only tag were .0 is an extraction-error red, not a healthy).
 *
 * Dormancy decision record: a checked-in JSON file (default
 * docs/runbooks/release-channel-decision.json, override with
 * --decision-file) whose shape is
 *   {"retired": true, "ownerDefId": "rm-714", "recordedAt": "YYYY-MM-DD", "note": "..."}
 * Only `retired: true` with a non-empty `ownerDefId` suppresses the red;
 * `retired: false` is an explicit live-channel statement and the age verdict
 * stands. Absent file = undecided = live. Malformed file = extraction error
 * (a broken decision record must never silently green the check).
 *
 * Usage:
 *   node scripts/release-channel-staleness.ts [--threshold-days N]
 *        [--decision-file PATH] [--base-ref REF] [--json]
 * Tags must be fetched first (`git fetch --tags origin`, or a full checkout
 * with fetch-depth: 0) — the script reads LOCAL refs only, so it performs no
 * authenticated network access of its own.
 */
import {spawnSync} from 'node:child_process'
import {appendFileSync, readFileSync} from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {pathToFileURL} from 'node:url'

export const DEFAULT_THRESHOLD_DAYS = 45

/**
 * Calver release-channel tags: YYYY.MM.C — month zero-padded to 2, C a
 * per-month release counter (legacy day-shaped 1-31 ⊂ counter-form;
 * rm-1932 census: counters up to .57 live in this repo's tag namespace).
 */
const CALVER_TAG = /^(\d{4})\.(\d{1,2})\.(\d+)$/

export interface CalverTagKey {
  year: number
  month: number
  counter: number
}

export interface CalverTagInfo {
  name: string
  dateUnix: number
}

export interface DormancyDecision {
  retired: boolean
  ownerDefId: string
  recordedAt: string
  note?: string
}

export type StalenessStatus = 'healthy' | 'stale' | 'retired'

export interface StalenessResult {
  status: StalenessStatus
  newestTag: string | null
  newestTagDateUnix: number | null
  ageDays: number | null
  thresholdDays: number
  decision: DormancyDecision | null
  /** rm-1932: fork-reachable calver tags the verdict considered. */
  scopedTagCount: number
  /** rm-1932: foreign upstream tags excluded from the verdict. */
  foreignExcludedCount: number
  /** rm-1932 tier 2: absorbed upstream-lineage tags excluded from the verdict. */
  upstreamExcludedCount: number
}

/**
 * Parses a calver tag name into its numeric key. Year is 4 digits, month 1-12,
 * counter ≥ 1 (rm-1932: counter-form, not day-form — .32/.43/.57 are live).
 * Numeric compare across components dodges the 2026.08.9 > 2026.08.10
 * lexical-reversal trap.
 */
export function parseCalverTag(name: string): CalverTagKey | null {
  const match = CALVER_TAG.exec(name)
  if (match === null) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const counter = Number(match[3])
  if (month < 1 || month > 12 || counter < 1) return null
  return {year, month, counter}
}

/** Newest calver tag by numeric calver comparison (ignores non-calver tags entirely). */
export function selectNewestCalverTag(tags: readonly CalverTagInfo[]): CalverTagInfo | null {
  let newest: CalverTagInfo | null = null
  let newestKey: CalverTagKey | null = null
  for (const tag of tags) {
    const key = parseCalverTag(tag.name)
    if (key === null) continue
    if (
      newestKey === null ||
      key.year > newestKey.year ||
      (key.year === newestKey.year && key.month > newestKey.month) ||
      (key.year === newestKey.year && key.month === newestKey.month && key.counter > newestKey.counter)
    ) {
      newest = tag
      newestKey = key
    }
  }
  return newest
}

/**
 * rm-1932: splits the gathered calver tag set into fork-reachable and
 * foreign. Pure (names in, partition out) so the scoping contract is
 * fixture-pinned: `reachableNames` comes from `git tag --merged <base>` at
 * the CLI seam; tags outside it NEVER feed the verdict.
 */
export function scopeCalverTagsToForkReachable(
  tags: readonly CalverTagInfo[],
  reachableNames: ReadonlySet<string>,
): {scoped: CalverTagInfo[]; foreignExcludedCount: number} {
  const scoped: CalverTagInfo[] = []
  let foreignExcludedCount = 0
  for (const tag of tags) {
    if (reachableNames.has(tag.name)) scoped.push(tag)
    else foreignExcludedCount += 1
  }
  return {scoped, foreignExcludedCount}
}

/**
 * Parses the dormancy decision file's contents.
 * - `null` content (file absent) → undecided (`null` decision).
 * - Malformed JSON or wrong shape → THROWS (extraction error class): a broken
 *   decision record must never silently green the channel.
 */
export function parseDormancyDecision(content: string | null): DormancyDecision | null {
  if (content === null) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch (error) {
    throw new TypeError(`dormancy decision file is not valid JSON: ${(error as Error).message}`)
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new TypeError('dormancy decision file must be a JSON object')
  }
  const record = parsed as Record<string, unknown>
  if (typeof record.retired !== 'boolean') {
    throw new TypeError('dormancy decision file: "retired" must be a boolean')
  }
  if (typeof record.ownerDefId !== 'string' || record.ownerDefId.trim() === '') {
    throw new TypeError('dormancy decision file: "ownerDefId" must be a non-empty string')
  }
  if (typeof record.recordedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(record.recordedAt)) {
    throw new TypeError('dormancy decision file: "recordedAt" must be a YYYY-MM-DD string')
  }
  const decision: DormancyDecision = {
    retired: record.retired,
    ownerDefId: record.ownerDefId.trim(),
    recordedAt: record.recordedAt,
  }
  if (typeof record.note === 'string') decision.note = record.note
  return decision
}

/**
 * The verdict. Pure: every input is data (clock, tag list, threshold,
 * decision), so the fixture tests pin each branch exactly.
 */
export function evaluateReleaseChannelStaleness(input: {
  nowMs: number
  /** rm-1932: the SCOPED (fork-reachable) tag set — scope before calling. */
  tags: readonly CalverTagInfo[]
  thresholdDays: number
  decision: DormancyDecision | null
  /** rm-1932: foreign tags excluded upstream of this call (summary fact). */
  foreignExcludedCount?: number
  /** rm-1932 tier 2: absorbed-upstream-lineage tags excluded (summary fact). */
  upstreamExcludedCount?: number
}): StalenessResult {
  const {nowMs, tags, thresholdDays, decision} = input
  const foreignExcludedCount = input.foreignExcludedCount ?? 0
  const upstreamExcludedCount = input.upstreamExcludedCount ?? 0
  const scopedTagCount = tags.filter(tag => parseCalverTag(tag.name) !== null).length
  const newest = selectNewestCalverTag(tags)
  if (newest === null) {
    throw new Error(
      'no fork-reachable calver tags — this is an extraction error (tags not fetched, base/upstream ref wrong, or the channel has never minted a tag of its own), never a healthy verdict (rm-166 lesson)',
    )
  }
  const ageDays = Math.floor((nowMs - newest.dateUnix * 1000) / 86_400_000)
  if (ageDays > thresholdDays && decision?.retired === true) {
    return {
      status: 'retired',
      newestTag: newest.name,
      newestTagDateUnix: newest.dateUnix,
      ageDays,
      thresholdDays,
      decision,
      scopedTagCount,
      foreignExcludedCount,
      upstreamExcludedCount,
    }
  }
  return {
    status: ageDays > thresholdDays ? 'stale' : 'healthy',
    newestTag: newest.name,
    newestTagDateUnix: newest.dateUnix,
    ageDays,
    thresholdDays,
    decision,
    scopedTagCount,
    foreignExcludedCount,
    upstreamExcludedCount,
  }
}

/** Human/step-summary rendering. Names the owning def rm-740 and the decision owner rm-714. */
export function buildSummaryLines(result: StalenessResult): string[] {
  const date =
    result.newestTagDateUnix === null
      ? 'unknown'
      : new Date(result.newestTagDateUnix * 1000).toISOString().slice(0, 10)
  const lines = [
    '## Release channel staleness check (rm-740)',
    `- Newest fork-reachable calver tag: ${result.newestTag} (tagged ${date}), age ${result.ageDays} days — threshold ${result.thresholdDays} days.`,
    `- Verdict scope (rm-1932): ${result.scopedTagCount} fork-channel calver tag(s) considered; ${result.foreignExcludedCount} foreign upstream tag(s) excluded; ${result.upstreamExcludedCount} absorbed-upstream-lineage tag(s) excluded.`,
  ]
  if (result.status === 'healthy') {
    lines.push('- Status: **healthy** — newest release within threshold.')
  } else if (result.status === 'retired') {
    lines.push(
      `- Status: **retired-with-owner** — channel marked retired by \`${result.decision?.ownerDefId}\` (recorded ${result.decision?.recordedAt}); staleness is designed, not broken.`,
    )
  } else {
    lines.push(
      '- Status: **STALE** — the release channel has not tagged within threshold while no dormancy decision is recorded.',
      '- Decision owner: **rm-714** (branch-b dormancy decision) — either record the channel retired-with-owner in `docs/runbooks/release-channel-decision.json` or fix the channel (provision the release App / secrets). Red while undecided is BY DESIGN.',
    )
  }
  return lines
}

export function gatherLocalTags(): CalverTagInfo[] {
  const git = spawnSync('git', ['for-each-ref', 'refs/tags', '--format=%(refname:short) %(creatordate:unix)'], {
    encoding: 'utf8',
  })
  if (git.status !== 0) {
    throw new Error(`git for-each-ref failed (rc=${git.status}): ${git.stderr}`)
  }
  const tags: CalverTagInfo[] = []
  for (const line of git.stdout.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    const parts = trimmed.split(/\s+/)
    const name = parts[0]
    const dateUnix = Number(parts[1])
    if (name === undefined || !Number.isFinite(dateUnix) || dateUnix <= 0) continue
    if (parseCalverTag(name) !== null) tags.push({name, dateUnix})
  }
  return tags
}

/**
 * rm-1932: splits the gathered calver tag set into channel-scoped and
 * excluded. Pure (names in, partition out) so the scoping contract is
 * fixture-pinned: the caller feeds `baseNames` from `git tag --merged
 * <base>` and (optionally) `upstreamNames` from `git tag --merged
 * <upstream-ref>` at the CLI seam; tags outside the channel NEVER feed the
 * verdict. `upstreamNames === null` = no upstream concept configured
 * (tier-1-only scoping; this repo's workflows always pass tier 2).
 */
export function scopeToChannel(
  tags: readonly CalverTagInfo[],
  baseNames: ReadonlySet<string>,
  upstreamNames: ReadonlySet<string> | null,
): {scoped: CalverTagInfo[]; foreignExcludedCount: number; upstreamExcludedCount: number} {
  const candidateNames = new Set(baseNames)
  let upstreamExcludedCount = 0
  if (upstreamNames !== null) {
    for (const name of upstreamNames) {
      if (candidateNames.delete(name)) upstreamExcludedCount += 1
    }
  }
  const {scoped, foreignExcludedCount} = scopeCalverTagsToForkReachable(tags, candidateNames)
  return {scoped, foreignExcludedCount, upstreamExcludedCount}
}

/**
 * rm-1932: names of tags whose commits are ancestors of `ref`
 * (`git tag --merged`). FAILS CLOSED: an unresolvable ref throws (the
 * scoping premise itself is broken — never fall back to the unscoped set,
 * which would resurrect the false-healthy verdict this fix exists to kill).
 */
export function listReachableTagNames(ref: string): Set<string> {
  const resolve = spawnSync('git', ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], {
    encoding: 'utf8',
  })
  if (resolve.status !== 0 || resolve.stdout.trim() === '') {
    throw new Error(
      `ref '${ref}' does not resolve to a commit — cannot scope the verdict to channel tags (fail closed, rm-1932)`,
    )
  }
  const merged = spawnSync('git', ['tag', '--merged', ref], {encoding: 'utf8'})
  if (merged.status !== 0) {
    throw new Error(`git tag --merged '${ref}' failed (rc=${merged.status}): ${merged.stderr}`)
  }
  return new Set(
    merged.stdout
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== ''),
  )
}

function main(): number {
  const args = process.argv.slice(2)
  const thresholdFlag = args.indexOf('--threshold-days')
  const thresholdDays =
    thresholdFlag !== -1 && Number.isFinite(Number(args[thresholdFlag + 1]))
      ? Number(args[thresholdFlag + 1])
      : DEFAULT_THRESHOLD_DAYS
  const decisionFlag = args.indexOf('--decision-file')
  const decisionFile =
    decisionFlag === -1
      ? path.resolve('docs/runbooks/release-channel-decision.json')
      : path.resolve(args[decisionFlag + 1] ?? '')
  const asJson = args.includes('--json')
  const baseRefFlag = args.indexOf('--base-ref')
  const baseRef = baseRefFlag !== -1 ? (args[baseRefFlag + 1] ?? 'origin/main') : 'origin/main'
  const upstreamRefFlag = args.indexOf('--upstream-ref')
  const upstreamRef =
    upstreamRefFlag !== -1 ? (args[upstreamRefFlag + 1] ?? null) : null

  let decisionContent: string | null = null
  try {
    decisionContent = readFileSync(decisionFile, 'utf8')
  } catch {
    decisionContent = null // absent = undecided, by design
  }

  try {
    const decision = parseDormancyDecision(decisionContent)
    const allCalverTags = gatherLocalTags()
    const baseNames = listReachableTagNames(baseRef)
    const upstreamNames = upstreamRef === null ? null : listReachableTagNames(upstreamRef)
    const {scoped, foreignExcludedCount, upstreamExcludedCount} = scopeToChannel(
      allCalverTags,
      baseNames,
      upstreamNames,
    )
    const result = evaluateReleaseChannelStaleness({
      nowMs: Date.now(),
      tags: scoped,
      thresholdDays,
      decision,
      foreignExcludedCount,
      upstreamExcludedCount,
    })
    const summary = buildSummaryLines(result)
    const summaryTarget = process.env.GITHUB_STEP_SUMMARY
    if (summaryTarget !== undefined && summaryTarget !== '') {
      appendFileSync(summaryTarget, `${summary.join('\n')}\n\n`)
    }
    if (asJson) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
    } else {
      for (const line of summary) process.stdout.write(`${line}\n`)
      if (result.status === 'stale') {
        process.stdout.write('exit: 1 (stale) — red while the dormancy decision is undecided is BY DESIGN (rm-740)\n')
      } else {
        process.stdout.write(`exit: 0 (${result.status})\n`)
      }
    }
    return result.status === 'stale' ? 1 : 0
  } catch (error) {
    process.stderr.write(`::error::release-channel staleness EXTRACTION FAILED: ${(error as Error).message}\n`)
    return 2
  }
}

// Entry-point check per the rm-702 comparator pattern (pathToFileURL vs a
// raw string compare — robust to how the runner invoked the file).
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
