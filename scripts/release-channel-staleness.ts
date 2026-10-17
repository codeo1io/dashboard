#!/usr/bin/env node
/**
 * rm-740 — release-channel staleness check (operational truth: a silently
 * dead release channel must be LOUD). Repaired by rm-1465 (2026-10-16):
 * the check originally measured the WRONG signal with a mis-parsing
 * reader — see the two blocks below.
 *
 * PRIMARY SIGNAL (verdict-driving, rm-1465): the GitHub Releases lane.
 * `actions/secrets` is empty (`total_count=0`), so `HAS_RELEASE_APP` is
 * false and release.yaml has never created a GitHub Release (releases list
 * empty, releases/latest 404 — re-probed 2026-10-16). This script probes
 * `gh api repos/:owner/:repo/releases/latest`: a 404 is channel ABSENCE
 * (stale by design until the dormancy decision or the App is provisioned);
 * a present latest release is aged against the threshold. No new secrets:
 * in CI the workflow exports the default GITHUB_TOKEN (contents: read) via
 * GH_TOKEN; locally the operator's gh auth serves.
 *
 * SECONDARY SIGNAL (labeled, non-verdict): the calver TAG stream. It can
 * no longer drive the verdict because the tag namespace is polluted: origin
 * maxes at 2026.10.25, which is FOREIGN-BORN (its commit 2c25f9b9 is absent
 * from fork HEAD history; it rode to fork origin in the October adoption
 * sync), and local refs additionally carry upstream-born 2026.10.32-.42.
 * The old header's "newest calver tag is 2026.08.9" premise was equally
 * false on 2026-10-16 (origin truth: 2026.10.25 foreign; fork-own
 * frontier: 2026.08.15-era). The tag age is reported as a labeled
 * secondary datum only.
 *
 * PARSER TRUTH (rm-1465): scripts/compute-release-tag.ts defines the
 * scheme as YYYY.MM.PATCH where PATCH = max(N)+1 — an UNBOUNDED counter,
 * not a zero-padded day. The original parser capped the third component
 * at two digits and rejected any value >31 as "day out of range",
 * silently discarding 11 real tags (2026.10.32-.42) present in this very
 * worktree. The third component now parses as an unbounded integer.
 *
 * Exits:
 *   0  healthy  — latest GitHub Release within the threshold
 *   0  retired  — a recorded dormancy decision marks the channel
 *                 retired-with-owner (see DECISION_FILE below)
 *   1  stale    — no GitHub Release exists at all (dead release-App lane),
 *                 or the latest one is older than the threshold, and the
 *                 channel is NOT recorded-retired (red while undecided is
 *                 BY DESIGN: the decision owner rm-714 has not recorded
 *                 either outcome)
 *   2  extraction error — tags unreadable, or the gh api releases probe
 *                 failed for a non-404 reason (fail loud on the tool,
 *                 never render a verdict from empty evidence — the rm-166
 *                 lesson from the base-drift digest readback)
 *
 * Dormancy decision record: a checked-in JSON file (default
 * docs/runbooks/release-channel-decision.json, override with
 * --decision-file) whose shape is
 *   {"retired": true, "ownerDefId": "rm-714", "recordedAt": "YYYY-MM-DD", "note": "..."}
 * Only `retired: true` with a non-empty `ownerDefId` suppresses the red;
 * `retired: false` is an explicit live-channel statement and the verdict
 * stands. Absent file = undecided = live. Malformed file = extraction error
 * (a broken decision record must never silently green the check).
 *
 * Usage:
 *   node scripts/release-channel-staleness.ts [--threshold-days N]
 *        [--decision-file PATH] [--json]
 * Tags must be fetched first (`git fetch --tags origin`, or a full checkout
 * with fetch-depth: 0) — the SECONDARY signal reads LOCAL refs only; the
 * PRIMARY signal is one `gh api` call against the releases endpoint.
 */
import {spawnSync} from 'node:child_process'
import {appendFileSync, readFileSync} from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {pathToFileURL} from 'node:url'

export const DEFAULT_THRESHOLD_DAYS = 45

/**
 * Calver tags as this repo's release channel mints them: YYYY.MM.PATCH —
 * PATCH is an unbounded max(N)+1 counter (compute-release-tag.ts), NOT a
 * day-of-month (rm-1465).
 */
const CALVER_TAG = /^(\d{4})\.(\d{1,2})\.(\d+)$/

export interface CalverTagInfo {
  name: string
  dateUnix: number
}

export interface LatestRelease {
  tagName: string
  publishedAtUnix: number
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
  /** PRIMARY signal state: null = the releases lane is absent (no GitHub Release exists). */
  latestRelease: LatestRelease | null
  /** Age of the latest release in days; null when the lane is absent. */
  releaseAgeDays: number | null
  /** SECONDARY, non-verdict datum: newest calver tag in the local ref set (namespace is foreign-polluted). */
  newestTag: string | null
  newestTagDateUnix: number | null
  ageDays: number | null
  thresholdDays: number
  decision: DormancyDecision | null
}

/** Parses a calver tag name; components compare NUMERICALLY; PATCH is an unbounded counter (rm-1465). */
export function parseCalverTag(name: string): {year: number; month: number; patch: number} | null {
  const match = CALVER_TAG.exec(name)
  if (match === null) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const patch = Number(match[3])
  if (month < 1 || month > 12 || patch < 1 || !Number.isSafeInteger(patch)) return null
  return {year, month, patch}
}

/** Newest calver tag by numeric calver comparison (ignores non-calver tags entirely). */
export function selectNewestCalverTag(tags: readonly CalverTagInfo[]): CalverTagInfo | null {
  let newest: CalverTagInfo | null = null
  let newestKey: {year: number; month: number; patch: number} | null = null
  for (const tag of tags) {
    const key = parseCalverTag(tag.name)
    if (key === null) continue
    if (
      newestKey === null ||
      key.year > newestKey.year ||
      (key.year === newestKey.year && key.month > newestKey.month) ||
      (key.year === newestKey.year && key.month === newestKey.month && key.patch > newestKey.patch)
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
 * The verdict. Pure: every input is data (clock, releases state, tag list,
 * threshold, decision), so the fixture tests pin each branch exactly.
 *
 * rm-1465: the GitHub Releases lane is the PRIMARY signal (absence = red by
 * design until the dormancy decision is recorded); the newest calver tag is
 * a labeled SECONDARY datum and never drives the verdict.
 */
export function evaluateReleaseChannelStaleness(input: {
  nowMs: number
  latestRelease: LatestRelease | null
  tags: readonly CalverTagInfo[]
  thresholdDays: number
  decision: DormancyDecision | null
}): StalenessResult {
  const {nowMs, latestRelease, tags, thresholdDays, decision} = input
  const newest = selectNewestCalverTag(tags)
  if (newest === null) {
    throw new Error(
      'no calver tags readable — this is an extraction error (tags not fetched, or the channel has never tagged), never a healthy verdict (rm-166 lesson)',
    )
  }
  const tagAgeDays = Math.floor((nowMs - newest.dateUnix * 1000) / 86_400_000)
  const secondary = {newestTag: newest.name, newestTagDateUnix: newest.dateUnix, ageDays: tagAgeDays}
  if (latestRelease === null) {
    // Absent releases lane: red unless recorded-retired. Absence has no age.
    if (decision?.retired === true) {
      return {status: 'retired', latestRelease: null, releaseAgeDays: null, ...secondary, thresholdDays, decision}
    }
    return {status: 'stale', latestRelease: null, releaseAgeDays: null, ...secondary, thresholdDays, decision}
  }
  const releaseAgeDays = Math.floor((nowMs - latestRelease.publishedAtUnix * 1000) / 86_400_000)
  if (releaseAgeDays > thresholdDays && decision?.retired === true) {
    return {status: 'retired', latestRelease, releaseAgeDays, ...secondary, thresholdDays, decision}
  }
  return {
    status: releaseAgeDays > thresholdDays ? 'stale' : 'healthy',
    latestRelease,
    releaseAgeDays,
    ...secondary,
    thresholdDays,
    decision,
  }
}

/** Human/step-summary rendering. Names the owning defs rm-740/rm-1465 and the decision owner rm-714. */
export function buildSummaryLines(result: StalenessResult): string[] {
  const tagDate =
    result.newestTagDateUnix === null
      ? 'unknown'
      : new Date(result.newestTagDateUnix * 1000).toISOString().slice(0, 10)
  const lines = [
    '## Release channel staleness check (rm-740, signal repaired rm-1465)',
    `- PRIMARY — GitHub Releases lane: ${
      result.latestRelease === null
        ? 'ABSENT (releases/latest 404 — the release App lane has never shipped; HAS_RELEASE_APP false while repo secrets are empty)'
        : `latest \`${result.latestRelease.tagName}\` (published ${new Date(result.latestRelease.publishedAtUnix * 1000).toISOString().slice(0, 10)}), age ${result.releaseAgeDays} days — threshold ${result.thresholdDays} days`
    }.`,
    `- SECONDARY (non-verdict): newest calver tag ${result.newestTag} (tagged ${tagDate}), age ${result.ageDays} days — the tag namespace is foreign-polluted and never drives the verdict (rm-1465).`,
  ]
  if (result.status === 'healthy') {
    lines.push('- Status: **healthy** — latest GitHub Release within threshold.')
  } else if (result.status === 'retired') {
    lines.push(
      `- Status: **retired-with-owner** — channel marked retired by \`${result.decision?.ownerDefId}\` (recorded ${result.decision?.recordedAt}); staleness is designed, not broken.`,
    )
  } else {
    lines.push(
      result.latestRelease === null
        ? '- Status: **STALE** — the GitHub Releases lane is ABSENT: release.yaml skips create-release while `HAS_RELEASE_APP` is false (repo secrets empty), so no release can ever appear.'
        : '- Status: **STALE** — the latest GitHub Release is older than the threshold.',
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

/** Resolves owner/repo from GITHUB_REPOSITORY (CI) or the origin remote URL (local). */
function resolveRepositorySlug(): string {
  const fromEnv = process.env.GITHUB_REPOSITORY
  if (fromEnv !== undefined && fromEnv !== '' && fromEnv.includes('/')) return fromEnv
  const remote = spawnSync('git', ['remote', 'get-url', 'origin'], {encoding: 'utf8'})
  const url = remote.status === 0 ? remote.stdout.trim() : ''
  const match = /[:/]([^/:]+\/[^/]+?)(?:\.git)?$/.exec(url)
  if (match === null) {
    throw new Error(`cannot resolve owner/repo for the releases probe (GITHUB_REPOSITORY unset, origin=${url || 'unreadable'})`)
  }
  return match[1] ?? ''
}

/**
 * PRIMARY-signal probe: `gh api repos/:owner/:repo/releases/latest`.
 * - HTTP 404 / "Not Found" → null (the lane is ABSENT — data, not an error).
 * - Any other failure → THROWS (extraction error class).
 */
export function probeLatestRelease(slug: string): LatestRelease | null {
  const gh = spawnSync(
    'gh',
    ['api', `repos/${slug}/releases/latest`, '--jq', '{tag_name: .tag_name, published_at: .published_at}'],
    {encoding: 'utf8'},
  )
  if (gh.status === 0) {
    let parsed: {tag_name?: unknown; published_at?: unknown}
    try {
      parsed = JSON.parse(gh.stdout) as {tag_name?: unknown; published_at?: unknown}
    } catch (error) {
      throw new Error(`gh api releases/latest returned unparseable output: ${(error as Error).message}`)
    }
    const tagName = typeof parsed.tag_name === 'string' ? parsed.tag_name : ''
    const publishedAt = typeof parsed.published_at === 'string' ? parsed.published_at : ''
    const publishedAtUnix = Math.floor(new Date(publishedAt).getTime() / 1000)
    if (tagName === '' || !Number.isFinite(publishedAtUnix) || publishedAtUnix <= 0) {
      throw new Error(`gh api releases/latest returned incomplete data (tag_name=${tagName}, published_at=${publishedAt})`)
    }
    return {tagName, publishedAtUnix}
  }
  if (/Not Found|HTTP 404/.test(gh.stderr)) return null
  throw new Error(`gh api repos/${slug}/releases/latest failed (rc=${gh.status}): ${gh.stderr.trim()}`)
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
    const latestRelease = probeLatestRelease(resolveRepositorySlug())
    const result = evaluateReleaseChannelStaleness({nowMs: Date.now(), latestRelease, tags, thresholdDays, decision})
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
        process.stdout.write('exit: 1 (stale) — red while the dormancy decision is undecided is BY DESIGN (rm-740/rm-1465)\n')
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
