// Operator API contract version — build-time pinned, never negotiated over the wire.
//
// Increment policy:
//   MAJOR — breaking change to a frozen type (field removed, renamed, or type narrowed)
//   MINOR — additive change (new optional field, new type added to the surface)
//   PATCH — documentation or typo correction only; no structural change
//
// This constant is the single source of truth. Downstream consumers (e.g. the dashboard)
// pin this value; no second copy should exist. Human-bumped on breaking changes, like
// STORAGE_VERSION in packages/runtime/src/shared/constants.ts.
//
// Security constraint: the version is BUILD-TIME pinned and is never supplied or
// negotiated over the wire. Any endpoint reading a version header must reject
// unrecognized versions fail-closed.
export const OPERATOR_CONTRACT_VERSION = '1.11.0'

/**
 * Contract versions whose wire these parsers accept (rm-873, extending rm-252's additive
 * acceptance): the whole 1.6.0…1.11.0 series the gateway has served, current pin included.
 * The gate is a version SET, not an exact match, because the deployed gateway lags the pin —
 * an old deployment serving 1.9.0 ready frames and a current one serving 1.11.0 must both
 * pass (the parsers tolerate missing optional fields from older members and drop unknown
 * extras from newer ones). Anything outside the set — a future minor bump or an unrecognized
 * value — still fails closed as contract-drift. When the pin bumps, add the new version to
 * this set; never remove an older member (that is the additive promise).
 */
export const ACCEPTED_OPERATOR_CONTRACT_VERSIONS: ReadonlySet<string> = new Set([
  '1.6.0',
  '1.7.0',
  '1.8.0',
  '1.9.0',
  '1.10.0',
  '1.11.0',
])
