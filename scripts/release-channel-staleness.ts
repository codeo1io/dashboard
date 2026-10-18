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
 *        [--decision-file PATH] [--json]
 * Tags must be fetched first (`git fetch --tags origin`, or a full checkout
 * with fetch-depth: 0) — the script reads LOCAL refs only, so it performs no
 * authenticated network access of its own.
 *
 * Calver scheme record (rm-1483, 2026-10-17): the third component is the
 * release ORDINAL within the month, not a calendar day — the mint
 * (scripts/compute-release-tag.ts) numbers releases 0,1,2,… onward, so the
 * historical day-shaped subset (≤31, the `D` in the old `YYYY.MM.D` reading)
 * is just the early ladder; upstream's ladder passed 31 releases in a month
 * as early as 2026.08. The parser accepts ordinals 0–999 (three digits max):
 * 999 is the mint's loud-rejection bound, so the historical out-of-range
 * test shape `2026.08.32` now PARSES (ordinal 32). Four-digit ordinals are
 * rejected — the mint cannot emit them (it exits nonzero at 999), so any
 * such tag would have to be hand-made and SHOULD be invisible here.
 */
import {spawnSync} from 'node:child_process'
import {appendFileSync, readFileSync} from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {pathToFileURL} from 'node:url'

export const DEFAULT_THRESHOLD_DAYS = 45

/**
 * Calver tag shape as this repo's release channel mints it: YYYY.MM.ORDINAL
 * with ordinal 0–999, NOT zero-padded (see the scheme record in the header,
 * rm-1483).
 */
const CALVER_TAG = /^(\d{4})\.(\d{1,2})\.(\d{1,3})$/

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
}

/** Parses a calver tag name; ordinal/month compare NUMERICALLY (2026.08.9 > 2026.08.10 lexically-reversed trap). */
export function parseCalverTag(name: string): {year: number; month: number; ordinal: number} | null {
  const match = CALVER_TAG.exec(name)
  if (match === null) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const ordinal = Number(match[3])
  if (month < 1 || month > 12) return null
  // Ordinal 0–999: 0 is a fresh-month first release, 999 is the mint's
  // loud-rejection bound (see the header scheme record, rm-1483).
  if (ordinal > 999) return null
  return {year, month, ordinal}
}

/** Newest calver tag by numeric calver comparison (ignores non-calver tags entirely). */
export function selectNewestCalverTag(tags: readonly CalverTagInfo[]): CalverTagInfo | null {
  let newest: CalverTagInfo | null = null
  let newestKey: {year: number; month: number; ordinal: number} | null = null
  for (const tag of tags) {
    const key = parseCalverTag(tag.name)
    if (key === null) continue
    if (
      newestKey === null ||
      key.year > newestKey.year ||
      (key.year === newestKey.year && key.month > newestKey.month) ||
      (key.year === newestKey.year && key.month === newestKey.month && key.ordinal > newestKey.ordinal)
    ) {
      newest = tag
      newestKey = key
    }
  }
  return newest
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
  tags: readonly CalverTagInfo[]
  thresholdDays: number
  decision: DormancyDecision | null
}): StalenessResult {
  const {nowMs, tags, thresholdDays, decision} = input
  const newest = selectNewestCalverTag(tags)
  if (newest === null) {
    throw new Error(
      'no calver tags readable — this is an extraction error (tags not fetched, or the channel has never tagged), never a healthy verdict (rm-166 lesson)',
    )
  }
  const ageDays = Math.floor((nowMs - newest.dateUnix * 1000) / 86_400_000)
  if (ageDays > thresholdDays && decision?.retired === true) {
    return {status: 'retired', newestTag: newest.name, newestTagDateUnix: newest.dateUnix, ageDays, thresholdDays, decision}
  }
  return {
    status: ageDays > thresholdDays ? 'stale' : 'healthy',
    newestTag: newest.name,
    newestTagDateUnix: newest.dateUnix,
    ageDays,
    thresholdDays,
    decision,
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
    `- Newest calver tag: ${result.newestTag} (tagged ${date}), age ${result.ageDays} days — threshold ${result.thresholdDays} days.`,
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

function gatherLocalTags(): CalverTagInfo[] {
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

  let decisionContent: string | null = null
  try {
    decisionContent = readFileSync(decisionFile, 'utf8')
  } catch {
    decisionContent = null // absent = undecided, by design
  }

  try {
    const decision = parseDormancyDecision(decisionContent)
    const tags = gatherLocalTags()
    const result = evaluateReleaseChannelStaleness({nowMs: Date.now(), tags, thresholdDays, decision})
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
