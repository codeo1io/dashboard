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
export const OPERATOR_CONTRACT_VERSION = '1.9.0'

// Forward-support ladder (rm-1016): the ready frame's contractVersion may be
// any member of this set. The floor is the deployed gateway's own version
// (infra upstream pin, re-verified when rm-252's ladder moves); the rungs
// above it are the two additive gateway minors — push trigger kinds + session
// push health (agent #1787/#1788) and waiting-for-question/approval statuses
// across stream/reconnects/summaries (agent #1825).
//
// The parsers accept these versions ADDITIVELY: the pinned floor above stays the
// deployed gateway's version and moves only when infra's gateway moves (rm-252
// ladder). Every version outside this set still fails closed, exactly as before.
export const ACCEPTED_CONTRACT_VERSIONS = ['1.9.0', '1.10.0', '1.11.0'] as const

export type AcceptedContractVersion = (typeof ACCEPTED_CONTRACT_VERSIONS)[number]

export function isAcceptedContractVersion(version: string): version is AcceptedContractVersion {
  return (ACCEPTED_CONTRACT_VERSIONS as readonly string[]).includes(version)
}
