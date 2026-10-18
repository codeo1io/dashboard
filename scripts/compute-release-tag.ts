#!/usr/bin/env node
// scripts/compute-release-tag.ts
//
// Compute the next CalVer release tag in YYYY.MM.PATCH format.
//
// Usage:
//   node scripts/compute-release-tag.ts
//
// Environment:
//   CALVER_MONTH  Override the target month (format: YYYY.MM).
//                 Defaults to the current UTC month.
//                 Used as a test seam — production callers omit this.
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
//
// Scheme record (rm-1483, 2026-10-17): the third component is the release
// ORDINAL within the month, 0–999 — one scheme, shared with the staleness
// parser (scripts/release-channel-staleness.ts, CALVER_TAG accepts 1–3
// digits). The ordinal is bounded at 999 by a LOUD rejection here: a month
// that reaches 999 releases is exhausted for this scheme, and minting
// 1000+ would silently fall out of the parser's domain (a four-digit
// ordinal is rejected there BY DESIGN) — an invisible tag is strictly worse
// than a red mint, so this script exits nonzero instead.

import {spawnSync} from 'node:child_process'
import process from 'node:process'

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

// rm-1483: the ordinal bound is part of the scheme — reject loudly instead
// of minting a tag the staleness parser would silently ignore.
const MAX_ORDINAL = 999
if (nextPatch > MAX_ORDINAL) {
  process.stderr.write(
    `ERROR: month ${month} is exhausted — next ordinal ${nextPatch} exceeds the scheme bound 999 (rm-1483); release-channel-staleness would not see a wider ordinal tag. Record a scheme decision (e.g. year rollover) instead of minting.
`,
  )
  process.exit(1)
}

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
