/**
 * Vendored operator-stream contract window guard (rm-157, invariant guard).
 *
 * public/operator-stream.js is a VENDORED copy of the gateway operator
 * stream client — it must stay pinned to the server's declared
 * OPERATOR_CONTRACT_VERSION and its failure-kind allowlist must cover the
 * server's kinds, because the vendored copy handles kinds the dashboard
 * itself never sends but a gateway of the pinned contract CAN send
 * (checkout-substituted, workspace-unavailable). If the two drift, the
 * dashboard silently mangles — or drops — operator failure reasons.
 *
 * Restored 2026-10-16 (run 1a261b63, rm-887) after the 3e3664c integrate
 * merge dropped the test. RE-DERIVED against the tree at restore time: the
 * 06396b4-era file pinned OPERATOR_CONTRACT_VERSION '1.6.0' and a
 * SUPPORTED_OPERATOR_CONTRACT_VERSIONS window ['1.6.0', '1.8.0']. At HEAD
 * the contract is '1.9.0' and the supported-window mechanism no longer
 * exists (version.ts exports the primary version only, and
 * operator-stream.js carries PINNED_CONTRACT_VERSION). The window exports
 * live in src/gateway/operator-contract/* and public/operator-stream.js —
 * surfaces owned by the in-flight operator-contract catch-up batch — so this
 * restore deliberately does NOT re-add them; it pins the surviving invariants
 * (pinned-equality + kind bijection + kind absorption) at current truth. When
 * the window mechanism returns, extend this file with the window assertions
 * again.
 */
import {describe, expect, it} from 'vitest'
import {FAILURE_REASON_LABELS, PINNED_CONTRACT_VERSION} from '../public/operator-stream.js'
import {OPERATOR_FAILURE_KINDS} from '../src/gateway/operator-contract/run-status.ts'
import {OPERATOR_CONTRACT_VERSION} from '../src/gateway/operator-contract/version.ts'

describe('vendored operator-stream contract window (rm-157, restored+re-derived)', () => {
  it('server declares the expected contract version', () => {
    // Re-derived 2026-10-16: fork contract '1.9.0' (deployed gateway speaks
    // 1.9.0; upstream 1.11 absorb is dependency-blocked per rm-252 rider).
    expect(OPERATOR_CONTRACT_VERSION).toBe('1.9.0')
  })

  it('vendored operator-stream.js is pinned to the declared contract version', () => {
    // The vendored copy must mirror the server's declared version exactly —
    // no window tolerance at HEAD: the pinned-equality check is the whole
    // guard while the supported-window mechanism is absent.
    expect(PINNED_CONTRACT_VERSION).toBe(OPERATOR_CONTRACT_VERSION)
    expect(PINNED_CONTRACT_VERSION).toBe('1.9.0')
  })

  it('vendored kinds absorb every server failure kind (single-source bijection)', () => {
    // FAILURE_REASON_LABELS keys must be exactly OPERATOR_FAILURE_KINDS — the
    // vendored copy is the operator-facing rendering surface, so a server kind
    // without a vendored label (or vice versa) is a drift bug. Includes the
    // kinds the dashboard itself never sends but a pinned gateway CAN.
    const labelKinds = Object.keys(FAILURE_REASON_LABELS)
    expect(OPERATOR_FAILURE_KINDS.size).toBeGreaterThan(0)
    expect(labelKinds.length).toBe(OPERATOR_FAILURE_KINDS.size)
    for (const kind of OPERATOR_FAILURE_KINDS) {
      expect(
        labelKinds,
        `vendored operator-stream.js must label server kind '${kind}'`,
      ).toContain(kind)
    }
    for (const kind of labelKinds) {
      expect(
        OPERATOR_FAILURE_KINDS,
        `vendored label '${kind}' must exist in the server allowlist`,
      ).toContain(kind)
    }
  })

  it('kinds the dashboard never sends but a pinned gateway CAN send are absorbed', () => {
    // checkout-substituted and workspace-unavailable are gateway-emitted kinds
    // beyond the dashboard's own failure set — the vendored allowlist must
    // carry them or those failures render as raw/unlabeled on the operator UI.
    for (const kind of ['checkout-substituted', 'workspace-unavailable', 'unknown'] as const) {
      expect(OPERATOR_FAILURE_KINDS.has(kind), `server allowlist must include '${kind}'`).toBe(true)
      expect(
        kind in FAILURE_REASON_LABELS,
        `vendored labels must include '${kind}'`,
      ).toBe(true)
    }
  })
})
