/**
 * rm-157 contract single-source pins — re-derived 2026-10-16 (run 9d5c156d
 * cycle-4 restore, rm-857) from the LIVE contract shape.
 *
 * The original guard pinned the fork's supported-versions WINDOW (primary
 * 1.6.0 + additive 1.8.0, rm-157's deploy-order independence mechanism).
 * The adoption lineage absorbed upstream's single-pin discipline instead:
 * `src/gateway/operator-contract/version.ts` and the vendored browser
 * module both pin exactly one OPERATOR_CONTRACT_VERSION and reject any
 * other version over the wire. The window mechanism
 * (SUPPORTED_OPERATOR_CONTRACT_VERSIONS) no longer exists on either side,
 * so this guard now pins the single-pin discipline itself:
 * - the primary version the pinned gateway deployment serves (1.9.0),
 * - the browser copy mirrors the server copy exactly (no second copy drifts),
 * - the contract 1.8.0 absorb surface: the two new failure kinds are vendored
 *   AND every OperatorFailureKind has exactly one browser display label.
 */

import {describe, expect, it} from 'vitest'
import {FAILURE_REASON_LABELS, PINNED_CONTRACT_VERSION} from '../public/operator-stream.js'
import {OPERATOR_FAILURE_KINDS} from '../src/gateway/operator-contract/run-status.ts'
import {OPERATOR_CONTRACT_VERSION} from '../src/gateway/operator-contract/version.ts'

describe('rm-157 contract single-source pins', () => {
  it('primary stays 1.9.0 — the version the pinned gateway deployment serves', () => {
    expect(OPERATOR_CONTRACT_VERSION).toBe('1.9.0')
  })

  it('browser primary mirrors OPERATOR_CONTRACT_VERSION — no second copy drifts', () => {
    expect(PINNED_CONTRACT_VERSION).toBe(OPERATOR_CONTRACT_VERSION)
  })

  it('the version is a strict semver string, never negotiated over the wire', () => {
    expect(OPERATOR_CONTRACT_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('contract 1.8.0 absorb: the two new failure kinds are vendored', () => {
    expect(OPERATOR_FAILURE_KINDS.has('checkout-substituted')).toBe(true)
    expect(OPERATOR_FAILURE_KINDS.has('workspace-unavailable')).toBe(true)
  })

  it('every OperatorFailureKind has exactly one browser display label — no kind renders raw', () => {
    expect([...OPERATOR_FAILURE_KINDS].sort()).toEqual(Object.keys(FAILURE_REASON_LABELS).sort())
  })
})
