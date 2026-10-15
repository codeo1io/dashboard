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
/**
 * Operator contract versions whose ready frames this dashboard accepts, in
 * ascending order. The first entry is OPERATOR_CONTRACT_VERSION — the floor this
 * dashboard's contract mirror targets. Later entries are forward-compatible
 * gateway rungs whose ADDITIVE fields this dashboard already parses: the
 * push-health session block and exported push trigger kinds, then the
 * waiting-for-approval/question summary overlays and the question push deep
 * link.
 *
 * A ready frame whose contractVersion is outside this list still fails closed
 * into absorbing drift (public/operator-stream.js nextStreamState and
 * src/gateway/operator-sse-reader.ts both enforce the same ladder).
 *
 * Keep in sync with the twin in public/operator-stream.js
 * (ACCEPTED_CONTRACT_VERSIONS) — test/operator-contract-conformance.test.ts
 * guards the pair.
 */
export const ACCEPTED_CONTRACT_VERSIONS = ['1.9.0', '1.10.0', '1.11.0'] as const

/** Floor contract version — the first ladder rung; twin of public/operator-stream.js PINNED_CONTRACT_VERSION. */
export const OPERATOR_CONTRACT_VERSION = '1.9.0'

export type AcceptedOperatorContractVersion = (typeof ACCEPTED_CONTRACT_VERSIONS)[number]
