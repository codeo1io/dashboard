#!/usr/bin/env node
// scripts/absorb-window.ts
//
// Measure the fork's absorb window against upstream fro-bot/dashboard with
// a fetch-first, fail-closed posture (rm-856 fetch-first arm, 2026-10-15).
//
// Usage:
//   node scripts/absorb-window.ts [--no-fetch] [--max-age-hours N]
//
// Output (stdout, one JSON object):
//   {
//     "base": "<origin/main sha>",
//     "upstream": "<upstream main sha>",
//     "behind_count": <int>,
//     "window_commits": [{"sha": "...", "subject": "..."}],  // oldest first
//     "latest_release_tag": "YYYY.MM.N" | null,
//     "fetch_ts": "<ISO-8601 timestamp of the data>"
//   }
//
// Flags / environment (test seams):
//   --no-fetch          Read cached tracking refs instead of fetching.
//                       REFUSES (exit 2) when either tracking ref is
//                       missing, has no fetch reflog evidence, or its
//                       reflog age exceeds --max-age-hours — the age is
//                       printed, never silently degraded.
//   --max-age-hours N   Staleness ceiling for --no-fetch mode (default 6).
//   ABSORB_WINDOW_NOW   ISO-8601 override for "now" (staleness math and
//                       fetch_ts). Test seam — production callers omit it.
//   ABSORB_WINDOW_UPSTREAM_URL
//                       URL fallback used only when no remote named
//                       `autonomy-upstream` exists and no remote URL
//                       points at fro-bot/dashboard. Test seam —
//                       production callers omit it (defaults to the
//                       canonical upstream URL).
//
// Upstream remote resolution order:
//   1. a remote literally named `autonomy-upstream`
//   2. the first remote whose fetch URL points at fro-bot/dashboard
//      (host-agnostic suffix match, so `upstream` on other hosts resolves)
//   3. the canonical URL fetched directly (FETCH_HEAD posture, the same
//      topology note .github/workflows/upstream-drift.yaml documents for
//      fresh Actions checkouts)
//
// Fail-closed rationale (the recorded 2026-10-14 trap): a phase read the
// window from stale tracking refs and recorded 2 commits when the real
// window was 4. This script never degrades silently — a failed fetch is a
// hard error, and cached refs past the ceiling are refused with their age.

import {spawnSync} from 'node:child_process'
import process from 'node:process'

const CANONICAL_UPSTREAM_URL = 'https://github.com/fro-bot/dashboard.git'
const ORIGIN_REF = 'refs/remotes/origin/main'
const CALVER_TAG = /^\d{4}\.\d{2}\.\d+$/

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

interface Options {
  noFetch: boolean
  maxAgeHours: number
}

function parseArgs(argv: string[]): Options {
  const opts: Options = {noFetch: false, maxAgeHours: 6}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--no-fetch') {
      opts.noFetch = true
    } else if (arg === '--max-age-hours') {
      const value = argv[i + 1]
      const parsed = Number.parseFloat(value ?? '')
      if (!Number.isFinite(parsed) || parsed < 0) {
        process.stderr.write(`ERROR: --max-age-hours expects a non-negative number, got '${value}'\n`)
        process.exit(1)
      }
      opts.maxAgeHours = parsed
      i++
    } else {
      process.stderr.write(`ERROR: unknown argument '${arg}'\n`)
      process.exit(1)
    }
  }
  return opts
}

const options = parseArgs(process.argv.slice(2))

// ---------------------------------------------------------------------------
// Git plumbing
// ---------------------------------------------------------------------------

interface GitResult {
  status: number | null
  stdout: string
  stderr: string
  error?: Error
}

function runGit(args: string[]): GitResult {
  const result = spawnSync('git', args, {
    encoding: 'utf8',
    timeout: 60_000,
    // cwd defaults to process.cwd(): the repo root under CI, a fixture
    // repo in tests (same convention as scripts/compute-release-tag.ts)
  })
  return {
    status: result.status,
    stdout: (result.stdout ?? '').trim(),
    stderr: (result.stderr ?? '').trim(),
    error: result.error,
  }
}

function die(message: string, code = 1): never {
  process.stderr.write(`ERROR: ${message}\n`)
  process.exit(code)
}

// ---------------------------------------------------------------------------
// Upstream remote resolution (name, then URL match, then URL fallback)
// ---------------------------------------------------------------------------

interface UpstreamTarget {
  kind: 'remote'
  name: string
}

interface UpstreamUrlTarget {
  kind: 'url'
  url: string
}

type UpstreamRefSource = UpstreamTarget | UpstreamUrlTarget

function resolveUpstream(): UpstreamRefSource {
  const remotes = runGit(['remote', '-v'])
  if (remotes.status !== 0) die(`git remote -v failed: ${remotes.stderr}`)

  const fetchUrls = new Map<string, string>()
  for (const line of remotes.stdout.split('\n')) {
    const match = /^(\S+)\s+(\S+)\s+\(fetch\)$/.exec(line)
    if (match && match[1] !== undefined && match[2] !== undefined) {
      fetchUrls.set(match[1], match[2])
    }
  }

  if (fetchUrls.has('autonomy-upstream')) return {kind: 'remote', name: 'autonomy-upstream'}

  for (const [name, url] of fetchUrls) {
    const normalized = url.toLowerCase().replace(/\.git$/, '').replaceAll(':', '/')
    if (normalized.endsWith('/fro-bot/dashboard')) return {kind: 'remote', name}
  }

  return {kind: 'url', url: process.env.ABSORB_WINDOW_UPSTREAM_URL ?? CANONICAL_UPSTREAM_URL}
}

const upstreamSource = resolveUpstream()

// ---------------------------------------------------------------------------
// Clock seam
// ---------------------------------------------------------------------------

function resolveNow(): number {
  const override = process.env.ABSORB_WINDOW_NOW
  if (override === undefined) return Date.now()
  const parsed = Date.parse(override)
  if (Number.isNaN(parsed)) die(`ABSORB_WINDOW_NOW is not a valid ISO-8601 timestamp: '${override}'`)
  return parsed
}

const nowMs = resolveNow()

// ---------------------------------------------------------------------------
// Ref resolution + staleness refusal (--no-fetch)
// ---------------------------------------------------------------------------

const upstreamRef =
  upstreamSource.kind === 'remote' ? `refs/remotes/${upstreamSource.name}/main` : 'FETCH_HEAD'

/** Reflog timestamp (seconds) of the last update to a tracking ref, or null when absent. */
function reflogTimestampSeconds(ref: string): number | null {
  const result = runGit(['reflog', 'show', '-1', '--date=unix', ref])
  if (result.status !== 0 || result.stdout.length === 0) return null
  const match = /@\{(\d+)\}/.exec(result.stdout)
  return match === null || match[1] === undefined ? null : Number.parseInt(match[1], 10)
}

if (options.noFetch) {
  if (upstreamSource.kind === 'url') {
    die(
      `--no-fetch needs a cached upstream tracking ref, but upstream resolved to a bare URL ` +
      `(${upstreamSource.url}); configure an 'autonomy-upstream' remote (or any remote ` +
      `pointing at fro-bot/dashboard) first`,
    )
  }
  for (const [label, ref] of [
    ['origin', ORIGIN_REF],
    ['upstream', upstreamRef],
  ] as const) {
    const resolve = runGit(['rev-parse', '--verify', '--quiet', ref])
    if (resolve.status !== 0) {
      die(`--no-fetch refused: ${label} tracking ref ${ref} does not exist locally`, 2)
    }
    const fetchedAt = reflogTimestampSeconds(ref)
    if (fetchedAt === null) {
      die(
        `--no-fetch refused: ${label} tracking ref ${ref} exists but has no fetch reflog ` +
        `evidence — its freshness cannot be established`,
        2,
      )
    }
    const ageHours = (nowMs / 1000 - fetchedAt) / 3600
    if (ageHours > options.maxAgeHours) {
      die(
        `--no-fetch refused: ${label} tracking ref ${ref} is stale at ` +
        `${ageHours.toFixed(1)}h old (ceiling ${options.maxAgeHours}h) — re-run without ` +
        `--no-fetch to fetch first; a stale ref can undercount the window`,
        2,
      )
    }
    if (ageHours < -1) {
      die(
        `--no-fetch refused: ${label} tracking ref ${ref} has a reflog timestamp in the ` +
        `future (${ageHours.toFixed(1)}h relative to now) — clock skew`,
        2,
      )
    }
  }
}

// ---------------------------------------------------------------------------
// Fetch-first measurement
// ---------------------------------------------------------------------------

if (!options.noFetch) {
  const originFetch = runGit(['fetch', 'origin', 'main'])
  if (originFetch.status !== 0) die(`fetching origin failed (no degraded output): ${originFetch.stderr}`)

  if (upstreamSource.kind === 'remote') {
    const upstreamFetch = runGit(['fetch', upstreamSource.name, 'main'])
    if (upstreamFetch.status !== 0) {
      die(`fetching remote '${upstreamSource.name}' failed (no degraded output): ${upstreamFetch.stderr}`)
    }
  } else {
    const urlFetch = runGit(['fetch', upstreamSource.url, 'main'])
    if (urlFetch.status !== 0) {
      die(`fetching ${upstreamSource.url} failed (no degraded output): ${urlFetch.stderr}`)
    }
  }
}

const baseSha = runGit(['rev-parse', '--verify', ORIGIN_REF])
if (baseSha.status !== 0) die(`resolving ${ORIGIN_REF} failed: ${baseSha.stderr}`)

const upstreamSha =
  upstreamSource.kind === 'remote'
    ? runGit(['rev-parse', '--verify', upstreamRef])
    : runGit(['rev-parse', '--verify', 'FETCH_HEAD'])
if (upstreamSha.status !== 0) {
  die(`resolving upstream head (${upstreamRef}) failed: ${upstreamSha.stderr}`)
}

// In URL mode the upstream side is FETCH_HEAD; in no-fetch mode the tracking
// ref was just verified fresh; both resolve above.

const behind = runGit(['rev-list', '--count', `${baseSha.stdout}..${upstreamSha.stdout}`])
if (behind.status !== 0) die(`counting the window failed: ${behind.stderr}`)

const windowLog = runGit(['log', '--reverse', '--format=%H%x1f%s', `${baseSha.stdout}..${upstreamSha.stdout}`])
if (windowLog.status !== 0) die(`enumerating window commits failed: ${windowLog.stderr}`)

const windowCommits = windowLog.stdout
  .split('\n')
  .filter(line => line.length > 0)
  .map(line => {
    const [sha, subject] = line.split('\x1F')
    return {sha, subject: subject ?? ''}
  })

// ---------------------------------------------------------------------------
// Latest upstream release tag (git-only: ls-remote over the same target)
// ---------------------------------------------------------------------------

const tagTarget = upstreamSource.kind === 'remote' ? upstreamSource.name : upstreamSource.url
const lsRemote = runGit(['ls-remote', '--tags', tagTarget])
if (lsRemote.status !== 0) die(`listing upstream tags failed: ${lsRemote.stderr}`)

let latestReleaseTag: string | null = null
for (const line of lsRemote.stdout.split('\n')) {
  const match = /^[0-9a-f]+\s+refs\/tags\/(.+)$/.exec(line)
  if (match === null || match[1] === undefined) continue
  const tag = match[1]
  if (tag.endsWith('^{}')) continue // peeled duplicate of an annotated tag
  if (!CALVER_TAG.test(tag)) continue
  if (latestReleaseTag === null || compareCalVer(tag, latestReleaseTag) > 0) {
    latestReleaseTag = tag
  }
}

function compareCalVer(a: string, b: string): number {
  // Destructuring defaults: a malformed tag compares as 0 in missing slots
  // rather than widening to undefined under noUncheckedIndexedAccess.
  const [ay = 0, am = 0, ap = 0] = a.split('.').map(part => Number.parseInt(part, 10))
  const [by = 0, bm = 0, bp = 0] = b.split('.').map(part => Number.parseInt(part, 10))
  if (ay !== by) return ay - by
  if (am !== bm) return am - bm
  return ap - bp
}

// ---------------------------------------------------------------------------
// Emit
// ---------------------------------------------------------------------------

const fetchTs =
  options.noFetch && upstreamSource.kind === 'remote'
    ? new Date((reflogTimestampSeconds(upstreamRef) ?? nowMs / 1000) * 1000).toISOString()
    : new Date(nowMs).toISOString()

process.stdout.write(
  `${JSON.stringify(
    {
      base: baseSha.stdout,
      upstream: upstreamSha.stdout,
      behind_count: Number.parseInt(behind.stdout, 10),
      window_commits: windowCommits,
      latest_release_tag: latestReleaseTag,
      fetch_ts: fetchTs,
    },
    null,
    2,
  )}\n`,
)
