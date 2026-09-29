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
//
// rm-252 (2026-09-30): the gate now accepts the SUPPORTED set below instead of
// strict equality against OPERATOR_CONTRACT_VERSION. The deployed gateway fleet
// spans v0.114.1 (1.6.0) through v0.117.0 (1.8.0); 1.7.0 and 1.8.0 are strictly
// additive supersets of 1.6.0 on this fork's consumed surface (optional
// run-status fields + two new failureKind values), so accepting all three is
// safe while still rejecting any unrecognized version fail-closed.
export const OPERATOR_CONTRACT_VERSION = '1.8.0'

/** Versions the contract gate accepts; anything else fails closed. */
export const SUPPORTED_OPERATOR_CONTRACT_VERSIONS: ReadonlySet<string> = new Set([
  '1.6.0',
  '1.7.0',
  '1.8.0',
])
