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
export const OPERATOR_CONTRACT_VERSION = '1.8.0'

/**
 * rm-157 supported-versions WINDOW (deploy-order independence for the operator
 * stream): versions whose frames this build parses and dispatches.
 *
 * rm-252 flip (2026-10-09): the deployed gateway (infra faf71414 -> v0.118.2)
 * has durably served 1.8.0 since 2026-10-07T20:11:52Z — no rollback in infra
 * history since, and every agent release v0.117.5 through v0.118.3 pins
 * OPERATOR_CONTRACT_VERSION '1.8.0' — so the primary moved to '1.8.0' and
 * '1.6.0' retired from the window in the same change. A pre-1.8.0 gateway now
 * fails closed to drift — intended, per the retirement rule below.
 *
 * 1.8.0 is additive-only shape over 1.6.0 (checkout provenance/preparation
 * optional fields + two new failure kinds, absorbed from upstream PR #573 /
 * a82871d), so deployed-gateway frames remain a structural subset of what
 * this build parses. Do not widen without a retirement plan: a stale entry
 * lets a dead gateway keep speaking and hides operational drift.
 */
export const SUPPORTED_OPERATOR_CONTRACT_VERSIONS: readonly string[] = [
  '1.8.0',
]
