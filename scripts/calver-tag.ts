/**
 * Shared calver-tag parsing for the release-channel scripts (rm-1468).
 *
 * The fork's release tags are YYYY.MM.PATCH, where PATCH is a per-month
 * counter minted as max(previous)+1 (scripts/compute-release-tag.ts) and is
 * NOT a calendar day: it grows without bound, and foreign upstream tags
 * sharing this namespace have been observed past .43. Parsing therefore
 * validates shape only (4-digit year >= 2000, positive integer month,
 * positive integer patch) with no month/day range checks — '2026.08.32' and
 * '2026.13.1' both parse. Documented-pair consumers:
 *   - scripts/release-channel-staleness.ts — re-exports parseCalverTag for
 *     its verdict and tests;
 *   - scripts/compute-release-tag.ts — slices the PATCH suffix numerically
 *     rather than re-parsing; both agree PATCH is an unbounded integer.
 */
export interface CalverTag {
  year: number
  month: number
  patch: number
}

export const CALVER_TAG_PATTERN = /^(\d{4})\.(\d+)\.(\d+)$/

/** Shape-only calver parse: integers, no digit cap, no month/day range validation (rm-1468). */
export function parseCalverTag(name: string): CalverTag | null {
  const match = CALVER_TAG_PATTERN.exec(name)
  if (match === null) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const patch = Number(match[3])
  if (!Number.isSafeInteger(year) || !Number.isSafeInteger(month) || !Number.isSafeInteger(patch)) return null
  if (year < 2000 || month < 1 || patch < 1) return null
  return {year, month, patch}
}

/** Numeric calver ordering — all components compare as integers, PATCH unbounded. */
export function compareCalverTags(a: CalverTag, b: CalverTag): number {
  if (a.year !== b.year) return a.year - b.year
  if (a.month !== b.month) return a.month - b.month
  return a.patch - b.patch
}
