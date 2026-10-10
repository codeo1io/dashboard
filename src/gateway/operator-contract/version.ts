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
 * FLIP EXECUTED 2026-10-09 (run 471d3910531e implement, rm-157's deferred
 * half, per this block's standing reservation): the deployed gateway has
 * been durably on 1.8.0 since infra commit faf71414 (2026-10-07T20:11:52Z,
 * marcusrbrown/infra apps/gateway/upstream.json → v0.118.2; agent v0.117.0+
 * serves 1.8.0 — verified at tags v0.114.1/v0.115.1/v0.116.0/v0.117.0/
 * v0.117.5/v0.118.0/v0.118.1/v0.118.3). The primary is now '1.8.0' and
 * '1.6.0' is retired from the window — 1.6.0 frames are a structural subset
 * of the 1.8.0 types, so the flip changes negotiation posture, not parsing.
 * Do not widen without a plan: anything outside the window fails closed by
 * design (drift signal the reader must surface, not absorb).
 */
export const SUPPORTED_OPERATOR_CONTRACT_VERSIONS: readonly string[] = [
  '1.8.0',
]
