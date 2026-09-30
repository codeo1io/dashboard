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
// rm-157 (cycle-18 absorb): 1.7.0 added checkout provenance + workspace
// preparation (operator-actionable failure kinds 'workspace-unavailable',
// 'checkout-substituted' alongside the already-mirrored 'workspace-
// unreachable'); 1.8.0 added remote-freshness 'checked' (freshnessCheckedAt).
// The mirror types in run-status.ts/provenance.ts mark every new field
// absent-tolerant so the deployed gateway still speaking 1.6.0 (v0.114.1)
// keeps type-checking — the dashboard parses both payloads.
export const OPERATOR_CONTRACT_VERSION = '1.8.0'

/**
 * Ready-frame versions this dashboard accepts from the gateway (rm-157, cycle-18).
 *
 * Additive minors parse identically — every post-1.6.0 field is
 * absent-tolerant on this mirror — so every gateway pin the dashboard can
 * face (deployed v0.114.1 still speaking 1.6.0, fork pin v0.117.0 speaking
 * 1.8.0) stays green without a lockstep dashboard deploy. Patch components
 * are structural no-ops per the increment policy and are ignored. A major
 * change or an unknown future minor fails closed exactly as before (drift).
 */
export const OPERATOR_CONTRACT_ACCEPTED_MINOR_VERSIONS: readonly number[] = [6, 7, 8]

/** Gate an untrusted ready-frame version against the accepted range. */
export function isAcceptedContractVersion(version: string): boolean {
  const match = /^(\d+)\.(\d+)\.\d+$/.exec(version)
  if (match === null) return false
  return (
    Number(match[1]) === 1 &&
    OPERATOR_CONTRACT_ACCEPTED_MINOR_VERSIONS.includes(Number(match[2]))
  )
}
