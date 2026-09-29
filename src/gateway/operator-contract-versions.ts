/**
 * Dashboard-side acceptance set for the vendored operator contract (rm-157).
 *
 * The vendored mirror (`./operator-contract/version.ts`) pins the LATEST
 * contract version this dashboard has absorbed. Older contract versions whose
 * wire shapes the current parsers still accept remain in the known set while
 * deployed gateways roll through them, so a gateway that is one or two
 * contract minors behind does not fail-close the operator view. Any version
 * outside the set — older than the floor, newer than the mirror, or malformed
 * — still fails closed (drift), exactly like the previous single-pin check.
 *
 * Membership is a claim about THIS dashboard's parsing surface: a version is
 * known here only when the mirror has absorbed every wire change that version
 * introduced (see src/gateway/operator-contract/README.md for the per-file
 * vendoring tags). When the mirror is refreshed to a new version, add it here
 * in the same change — test/operator-contract-version-lock.test.ts locks the
 * mirror pin, this set, and the client script's copy together so they cannot
 * drift apart silently.
 */

import {OPERATOR_CONTRACT_VERSION} from './operator-contract/version.ts'

/**
 * Contract versions this dashboard can parse, oldest first. The last entry is
 * always the mirror's pin (asserted by the lock test).
 */
export const KNOWN_OPERATOR_CONTRACT_VERSIONS = ['1.6.0', '1.7.0', '1.8.0'] as const

export type KnownOperatorContractVersion = (typeof KNOWN_OPERATOR_CONTRACT_VERSIONS)[number]

/** The mirror pin — the newest known contract version (last entry of the set). */
export const PINNED_OPERATOR_CONTRACT_VERSION: KnownOperatorContractVersion = OPERATOR_CONTRACT_VERSION

/** Narrow an unknown wire value to a known contract version. */
export function isKnownOperatorContractVersion(value: unknown): value is KnownOperatorContractVersion {
  return (
    typeof value === 'string' &&
    (KNOWN_OPERATOR_CONTRACT_VERSIONS as readonly string[]).includes(value)
  )
}
