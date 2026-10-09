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
export const OPERATOR_CONTRACT_VERSION = '1.6.0'

/**
 * rm-157 supported-versions WINDOW (deploy-order independence for the operator
 * stream): versions whose frames this build parses and dispatches.
 *
 * The primary stays '1.6.0' — the version the currently pinned gateway
 * deployment serves. '1.8.0' is additive-only upstream shape (checkout
 * provenance/preparation optional fields + two new failure kinds, absorbed
 * from upstream PR #573 / a82871d): 1.6.0 frames are a structural subset of
 * the 1.8.0 types, so accepting both is safe. The day the gateway deployment
 * moves to 1.8.0, consumers gated on this window keep working; anything
 * outside the window still fails closed. When the deployed gateway is
 * durably on 1.8.0, flip the primary and retire '1.6.0' from the window in
 * the same change (do not widen without that plan).
 */
export const SUPPORTED_OPERATOR_CONTRACT_VERSIONS: readonly string[] = [
  '1.6.0',
  '1.8.0',
]
