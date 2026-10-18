#!/usr/bin/env node
// scripts/compute-release-tag.ts
//
// Compute the next CalVer release tag in YYYY.MM.PATCH format, or — with
// --current — print the newest FORK-CHANNEL calver tag (rm-1932 footer
// seam: the release version the /api/monitoring DTO serves and the footer
// renders is produced by the SAME channel-scoped newest-calver selection the
// staleness gate measures, imported from release-channel-staleness.ts — the
// selection must never exist twice).
//
// Usage:
//   node scripts/compute-release-tag.ts                          # next-tag mode
//   node scripts/compute-release-tag.ts --current [--base-ref REF] [--upstream-ref REF]
//
// --current mode:
//   - Base ref defaults to HEAD (the build's own commit); override with
//     --base-ref. An unresolvable base/upstream ref is exit 1 (fail closed).
//   - Scope (rm-1932): calver tags merged into the base ref — foreign
//     upstream tags in this repo's namespace are excluded. The wired
//     callers pass tier 1 only, per the recorded fog rm-714 branch-b
//     decision (channel-of-record = the ABSORBED upstream release stream:
//     this fork mints no releases of its own, so the newest reachable
//     absorbed release IS the channel's newest output — see
//     scripts/release-channel-staleness.ts header). Optionally passing
//     --upstream-ref additionally excludes absorbed upstream releases
//     (branch-a "fork-authored channel" capability; a fork release minted
//     exactly at an upstream commit would then be misclassified — safely:
//     toward hiding the version, never toward a wrong one).
//   - Prints the newest reachable calver tag; exits 1 with a stderr note if
//     none exist (callers then simply skip version injection — the footer
//     hides its version element, never renders garbage).
//
// Environment:
//   CALVER_MONTH  Override the target month (format: YYYY.MM).
//                 Defaults to the current UTC month.
//                 Used as a test seam — production callers omit this.
//                 (next-tag mode only)
//
// Behavior:
//   - Scans git tags matching the target month prefix (YYYY.MM.*).
//   - Keeps only tags whose third component is a non-negative integer
//     (i.e. exactly YYYY.MM.N with no further dots or non-numeric chars).
//   - Chooses max(N) + 1 as the next patch; starts at 0 if no valid tags exist.
//   - Validates the final tag against ^[0-9]+\.[0-9]+\.[0-9]+$ before printing.
//   - Exits nonzero if the computed tag does not match the expected format.
//
// Transition-month note:
//   Legacy day-shaped tags (e.g. 2026.06.15) naturally participate as patch
//   candidates because their third component (15) is a valid integer. Nested
//   four-part tags (e.g. 2026.06.15.1) are ignored because their third
//   component after stripping the month prefix contains a dot.

import {spawnSync} from 'node:child_process'
import process from 'node:process'
import {
  gatherLocalTags,
  listReachableTagNames,
  scopeToChannel,
  selectNewestCalverTag,
} from './release-channel-staleness.ts'

// ---------------------------------------------------------------------------
// --current mode (rm-1932 footer seam) — resolved before the next-tag path
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2)

if (argv.includes('--current')) {
  const baseRefFlag = argv.indexOf('--base-ref')
  const baseRef = baseRefFlag === -1 ? 'HEAD' : (argv[baseRefFlag + 1] ?? 'HEAD')
  const upstreamRefFlag = argv.indexOf('--upstream-ref')
  const upstreamRef = upstreamRefFlag === -1 ? null : (argv[upstreamRefFlag + 1] ?? null)

  let baseNames: Set<string>
  let upstreamNames: Set<string> | null
  try {
    baseNames = listReachableTagNames(baseRef)
    upstreamNames = upstreamRef === null ? null : listReachableTagNames(upstreamRef)
  } catch (error) {
    process.stderr.write(
      `ERROR: --current cannot resolve a scoping ref: ${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exit(1)
  }

  const {scoped, foreignExcludedCount, upstreamExcludedCount} = scopeToChannel(
    gatherLocalTags(),
    baseNames,
    upstreamNames,
  )
  const newest = selectNewestCalverTag(scoped)

  if (newest === null) {
    process.stderr.write(
      `NOTE: no fork-channel calver tag from '${baseRef}' (${foreignExcludedCount} foreign + ${upstreamExcludedCount} absorbed-upstream tag(s) excluded) — skipping version injection\n`,
    )
    process.exit(1)
  }

  process.stderr.write(
    `# current release: ${newest.name} (${scoped.length} fork-channel calver tag(s), ${foreignExcludedCount} foreign + ${upstreamExcludedCount} absorbed-upstream excluded)\n`,
  )
  process.stdout.write(`${newest.name}\n`)
  process.exit(0)
}

// ---------------------------------------------------------------------------
// Determine target month
// ---------------------------------------------------------------------------

function currentUtcMonth(): string {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${year}.${month}`
}

const month = process.env.CALVER_MONTH ?? currentUtcMonth()

if (month.length === 0 || !/^\d{4}\.\d{2}$/.test(month)) {
  process.stderr.write(
    `ERROR: invalid month '${month}'; expected YYYY.MM format (e.g. 2026.07)\n`,
  )
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Scan tags and find the numeric maximum patch
// ---------------------------------------------------------------------------

const result = spawnSync('git', ['tag', '-l', `${month}.*`], {
  encoding: 'utf8',
  timeout: 30_000,
  // cwd defaults to process.cwd(), which is the repo root in CI and tests
})

if (result.error !== undefined) {
  process.stderr.write(`ERROR: failed to run git tag: ${result.error.message}\n`)
  process.exit(1)
}

if (result.status !== 0) {
  const statusDesc =
    result.status === null ? `signal ${result.signal}` : `status ${result.status}`
  process.stderr.write(`ERROR: git tag failed with ${statusDesc}\n`)
  if (result.stderr) process.stderr.write(result.stderr)
  process.exit(1)
}

const tags = (result.stdout ?? '').split('\n').filter(line => line.length > 0)

let maxPatch = -1

for (const tag of tags) {
  // Strip the "YYYY.MM." prefix to get the candidate suffix
  const prefix = `${month}.`
  if (!tag.startsWith(prefix)) continue
  const suffix = tag.slice(prefix.length)

  // Accept only pure non-negative integers (no dots, no non-digit chars)
  if (suffix.length === 0 || !/^\d+$/.test(suffix)) continue

  const patch = Number.parseInt(suffix, 10)
  if (patch > maxPatch) {
    maxPatch = patch
  }
}

// ---------------------------------------------------------------------------
// Compute next patch
// ---------------------------------------------------------------------------

const nextPatch = maxPatch < 0 ? 0 : maxPatch + 1
const tag = `${month}.${nextPatch}`

// ---------------------------------------------------------------------------
// Validate output format: must be exactly YYYY.MM.N (three numeric components)
// ---------------------------------------------------------------------------

if (!/^\d+\.\d+\.\d+$/.test(tag)) {
  process.stderr.write(
    `ERROR: computed tag '${tag}' does not match ^[0-9]+\\.[0-9]+\\.[0-9]+$\n`,
  )
  process.exit(1)
}

process.stdout.write(`${tag}\n`)
