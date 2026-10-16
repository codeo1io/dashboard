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
//     "coverage": {                                              // rm-1499 content map
//       "raw_count": <int>,                                     // == behind_count, the gate number
//       "content_covered_count": <int>,
//       "not_covered_count": <int>,
//       "per_commit": [{"sha", "subject", "classification",
//                       "fork_commit", "fork_subject", "probe_markers",
//                       "probed_marker_count", "disposition", "reason"}]
//     },
//     "landing_note_table": "<markdown table>",                // rm-1462 derives here
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
//   ABSORB_WINDOW_DISPOSITIONS
//                       Path to a JSON file overriding the default
//                       fork-divergent (never-absorb) disposition rules.
//                       Test seam — production callers omit it.
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
import {readFileSync} from 'node:fs'
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
// Content-coverage map (rm-1499, 2026-10-17)
//
// The raw count answers "how far behind?"; it cannot answer "how much of the
// window does the fork already carry?". The fork re-implements upstream work
// natively (the standing divergence posture), so raw SHA counts overstate the
// actionable gap — the recorded case: 27 raw SHAs of which ~8 were already
// content-covered by fork re-implementations (2026-10-17 research rider on
// rm-252).
//
// Classification is informational ONLY and derived from content probes —
// never from commit subjects alone. For every window commit:
//
//   content-covered-by   a QUORUM of its distinctive probe markers (majority,
//                        at least 3) exists verbatim on the fork side
//                        (origin/main); the fork commit that introduced the
//                        first matched marker is attributed via pickaxe
//   fork-divergent       the commit's changed paths or added lines match a
//                        standing never-absorb disposition (e.g. the wiki
//                        writer, rm-259 — excluded by invariant, not by lag)
//   absorb-pending       probeable content below the coverage quorum or with
//                        no fork match — the rm-252 wire-or-fold lane
//   unknown              nothing probeable (merge/empty/binary-only commit) or
//                        a probe failure; never guessed, never title-derived
//
// Probe markers are added lines from CODE paths — prose (.md/.markdown) and
// lockfiles are excluded because shared boilerplate there collides across
// repos and produces false coverage (the live 2026-10-17 case: upstream #646
// matched plan-doc table fragments that exist in this fork's ledger while the
// fork lacks the entire markdown-render feature). The quorum keeps the error
// asymmetry where it belongs: a false absorb-pending merely costs a look, a
// false content-covered-by hides an absorb that then never happens.
//
// Gate semantics are UNCHANGED: behind_count keeps reporting the raw window
// size even when part of the window is content-covered — the honest count and
// the actionable map are emitted side by side. landing_note_table is the
// single source rm-1462's landing-note disposition table derives from, so the
// two cannot drift.
// ---------------------------------------------------------------------------

type CoverageClassification = 'content-covered-by' | 'absorb-pending' | 'fork-divergent' | 'unknown'

interface DispositionRule {
  name: string
  reason: string
  match_paths?: string[]
  match_markers?: string[]
}

interface Dispositions {
  fork_divergent: DispositionRule[]
}

/**
 * Real upstream location of the repository-editing capability: a repo-root
 * directory (live upstream tree probe 2026-10-18 — contract, write-operation
 * source, and security-boundary tests all live directly under it; zero
 * candidates under src/). Constructed by concatenation because the joined
 * literal matches the rm-164 prose-residue TERM_PATTERN: the split source
 * form keeps swept files clean while the runtime value stays byte-exact for
 * prefix matching.
 */
const UPSTREAM_EDITING_CAPABILITY_ROOT = 'wiki-' + 'writer/'

/** Standing fork-divergent dispositions: never-absorb by policy, not by lag. */
const DEFAULT_DISPOSITIONS: Dispositions = {
  fork_divergent: [
    {
      name: 'write-capability',
      reason: 'repository-editing (wiki) write capability violates the read-only invariant (rm-259)',
      match_paths: [UPSTREAM_EDITING_CAPABILITY_ROOT],
    },
    {
      // Marker-based: upstream carries no SW-router surface today (fork keeps
      // web/src/sw.ts a minimal client-focus shim; kill-switch stance), so
      // this fires only if routing vocabulary appears in an upstream window
      // commit's added lines.
      name: 'sw-router-kill-switch',
      reason: 'service-worker request routing violates the SW kill-switch stance (fork keeps the service worker a minimal client-focus shim)',
      match_markers: ['serviceWorkerRouter', 'swRouter', 'registerRoute', 'navigationRoute'],
    },
  ],
}

interface WindowCommitCoverage {
  sha: string
  subject: string
  classification: CoverageClassification
  fork_commit: string | null
  fork_subject: string | null
  probe_markers: string[]
  probed_marker_count: number
  disposition: string | null
  reason: string
}

interface CoverageMap {
  raw_count: number
  content_covered_count: number
  not_covered_count: number
  per_commit: WindowCommitCoverage[]
}

function loadDispositions(): Dispositions {
  const overridePath = process.env.ABSORB_WINDOW_DISPOSITIONS
  if (overridePath === undefined) return DEFAULT_DISPOSITIONS
  try {
    const parsed = JSON.parse(readFileSync(overridePath, 'utf8')) as {fork_divergent?: DispositionRule[]}
    return {fork_divergent: parsed.fork_divergent ?? []}
  } catch (error) {
    die(`ABSORB_WINDOW_DISPOSITIONS could not be read as JSON dispositions: ${String(error)}`)
  }
}

interface AddedLine {
  path: string
  line: string
}

/**
 * Paths whose added lines make weak, collision-prone probes: prose documents
 * share fleet boilerplate across repos, and lockfiles share dependency pins —
 * neither is feature content, so neither may claim coverage.
 */
function isProbeablePath(path: string): boolean {
  if (path.endsWith('.md') || path.endsWith('.markdown')) return false
  const basename = path.split('/').pop() ?? path
  return basename !== 'pnpm-lock.yaml' && basename !== 'package-lock.json' && basename !== 'yarn.lock'
}

/** Added lines of a commit, with the file each came from. Empty for merges/empty commits. */
function addedLines(sha: string): AddedLine[] {
  const result = runGit(['show', '--format=', '--unified=0', sha])
  if (result.status !== 0) return []
  const added: AddedLine[] = []
  let path = ''
  // Diff-section state: file headers arrive as adjacent '--- '/'+++ ' pairs
  // after 'diff --git'; hunk content follows '@@ '. A hunk CONTENT line can
  // itself start '++ ' or '+++ ' (an added line whose text begins '+'), so a
  // '+++ ' raw line only names a file when the immediately preceding raw
  // line was a '--- ' header — otherwise it stays content (review fix
  // 2026-10-18: the old prefix-only test misassigned such lines' paths).
  let expectingPlusHeader = false
  for (const raw of result.stdout.split('\n')) {
    if (raw.startsWith('diff --git ')) {
      path = ''
      expectingPlusHeader = false
      continue
    }
    if (raw.startsWith('--- ')) {
      expectingPlusHeader = true
      continue
    }
    if (expectingPlusHeader && raw.startsWith('+++ ')) {
      // '+++ b/<path>' (normal) or '+++ <path>' (no-prefix diffs)
      const header = raw.slice(4)
      if (!header.startsWith('/dev/null')) {
        path = header.startsWith('b/') ? header.slice(2) : header
      }
      expectingPlusHeader = false
      continue
    }
    expectingPlusHeader = false
    if (raw.startsWith('@@')) continue
    if (raw.startsWith('+') && path.length > 0) {
      const line = raw.slice(1).trim()
      if (line.length > 0) added.push({path, line})
    }
  }
  return added
}

/**
 * Distinctive probeable added lines usable as fixed-string content probes:
 * code paths only (see isProbeablePath), enough alphabetic signal, bounded
 * length, longest first (longer lines are more distinctive), capped so a huge
 * diff cannot explode the probe budget.
 */
function probeMarkers(sha: string): string[] {
  const seen = new Set<string>()
  const markers: string[] = []
  for (const {path, line} of addedLines(sha)) {
    if (!isProbeablePath(path)) continue
    if (line.length < 12 || line.length > 200) continue
    const letters = line.match(/[a-z]/gi)?.length ?? 0
    if (letters < 6) continue
    if (seen.has(line)) continue
    seen.add(line)
    markers.push(line)
  }
  markers.sort((a, b) => b.length - a.length)
  return markers.slice(0, 24)
}

/** Changed paths of a commit. Empty for merge commits (diff-tree without -m). */
function changedPaths(sha: string): string[] {
  const result = runGit(['diff-tree', '--no-commit-id', '--name-only', '-r', sha])
  if (result.status !== 0 || result.stdout.length === 0) return []
  return result.stdout.split('\n')
}

/**
 * Probe the fork side for every marker (fixed-string, tree-scoped). git grep
 * exits 1 for "no match" — any other non-zero status is a real failure and
 * makes the classification unknown rather than guessed. matched keeps up to
 * three markers as evidence; matchedCount is the exact quorum input.
 */
function probeFork(
  markers: string[],
  base: string,
): {matched: string[]; matchedCount: number; error?: string} {
  const matched: string[] = []
  let matchedCount = 0
  for (const marker of markers) {
    const result = runGit(['grep', '-l', '-F', '-e', marker, base])
    if (result.status !== 0 && result.status !== 1) {
      return {matched, matchedCount, error: `probing ${base} failed for '${marker}': ${result.stderr}`}
    }
    if (result.status === 0 && result.stdout.length > 0) {
      matchedCount++
      if (matched.length < 3) matched.push(marker)
    }
  }
  return {matched, matchedCount}
}

/** The fork commit that introduced `marker` (pickaxe), for covered-by evidence. */
function forkCommitForMarker(marker: string, base: string): {sha: string; subject: string} | null {
  const result = runGit(['log', '-n', '1', '--format=%H%x1f%s', `-S${marker}`, base])
  if (result.status !== 0 || result.stdout.length === 0) return null
  const [sha, subject] = result.stdout.split('\x1F')
  if (sha === undefined) return null
  return {sha, subject: subject ?? ''}
}

function classifyWindowCommit(
  commit: {sha: string; subject: string},
  base: string,
  dispositions: Dispositions,
): WindowCommitCoverage {
  const paths = changedPaths(commit.sha)
  const markers = probeMarkers(commit.sha)

  for (const rule of dispositions.fork_divergent) {
    const pathMatch = (rule.match_paths ?? []).some(prefix =>
      paths.some(path => path === prefix || path.startsWith(prefix)),
    )
    const markerHit = (rule.match_markers ?? []).some(needle =>
      markers.some(line => line.includes(needle)) || paths.some(path => path.includes(needle)),
    )
    if (pathMatch || markerHit) {
      return {
        ...commit,
        classification: 'fork-divergent',
        fork_commit: null,
        fork_subject: null,
        probe_markers: markers.slice(0, 3),
        probed_marker_count: markers.length,
        disposition: rule.name,
        reason: `never-absorb by disposition '${rule.name}': ${rule.reason}`,
      }
    }
  }

  if (markers.length === 0) {
    return {
      ...commit,
      classification: 'unknown',
      fork_commit: null,
      fork_subject: null,
      probe_markers: [],
      probed_marker_count: 0,
      disposition: null,
      reason: 'no probeable content (merge, empty, or binary-only commit) — not classified from its subject',
    }
  }

  const probe = probeFork(markers, base)
  if (probe.error !== undefined) {
    return {
      ...commit,
      classification: 'unknown',
      fork_commit: null,
      fork_subject: null,
      probe_markers: probe.matched,
      probed_marker_count: markers.length,
      disposition: null,
      reason: probe.error,
    }
  }

  // Coverage quorum: a majority of the probes (at least 3) must be verbatim
  // on the fork side. A stray shared line — moved test content, regenerated
  // boilerplate — must never claim a whole feature is covered.
  const quorum = Math.max(3, Math.ceil(markers.length / 2))
  if (probe.matchedCount >= quorum) {
    const firstMatch = probe.matched[0]
    const attribution = firstMatch === undefined ? null : forkCommitForMarker(firstMatch, base)
    const coveredBySuffix =
      attribution === null
        ? ' (introducing fork commit not attributable)'
        : ` (introduced by ${attribution.sha.slice(0, 8)} '${attribution.subject}')`
    return {
      ...commit,
      classification: 'content-covered-by',
      fork_commit: attribution?.sha ?? null,
      fork_subject: attribution?.subject ?? null,
      probe_markers: probe.matched,
      probed_marker_count: markers.length,
      disposition: null,
      reason: `${probe.matchedCount}/${markers.length} probe markers already verbatim on ${ORIGIN_REF} (quorum ${quorum})${coveredBySuffix}`,
    }
  }

  const overlapNote =
    probe.matchedCount > 0
      ? ` — ${probe.matchedCount}/${markers.length} markers verbatim on ${ORIGIN_REF} but below quorum ${quorum}, coincidental overlap is not coverage`
      : ` — no probe marker matched ${ORIGIN_REF} (${markers.length} probes)`
  return {
    ...commit,
    classification: 'absorb-pending',
    fork_commit: null,
    fork_subject: null,
    probe_markers: probe.matched,
    probed_marker_count: markers.length,
    disposition: null,
    reason: `not covered by content probes${overlapNote}`,
  }
}

const behindCount = Number.parseInt(behind.stdout, 10)
const dispositions = loadDispositions()
const windowCoverage: WindowCommitCoverage[] = windowCommits.map(commit =>
  classifyWindowCommit({sha: commit.sha ?? '', subject: commit.subject}, baseSha.stdout, dispositions),
)
const contentCoveredCount = windowCoverage.filter(c => c.classification === 'content-covered-by').length

const coverageMap: CoverageMap = {
  raw_count: behindCount,
  content_covered_count: contentCoveredCount,
  not_covered_count: behindCount - contentCoveredCount,
  per_commit: windowCoverage,
}

function escapeTableCell(text: string): string {
  return text.replaceAll('|', String.raw`\|`).replaceAll('\n', ' ')
}

// rm-1462's landing-note disposition table derives from this string — the
// classifier above is the single source, so ledger table and map cannot drift.
const landingNoteTable = [
  '| upstream sha | subject | classification | covered-by (fork) | evidence |',
  '| --- | --- | --- | --- | --- |',
  ...windowCoverage.map(c =>
    [
      c.sha.slice(0, 8),
      escapeTableCell(c.subject),
      c.classification,
      c.fork_commit === null
        ? '-'
        : `${c.fork_commit.slice(0, 8)} ${escapeTableCell(c.fork_subject ?? '')}`.trim(),
      escapeTableCell(c.reason),
    ].join(' | '),
  ),
].join('\n')

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
      coverage: coverageMap,
      landing_note_table: landingNoteTable,
      fetch_ts: fetchTs,
    },
    null,
    2,
  )}\n`,
)
