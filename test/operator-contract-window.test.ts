/**
 * rm-157 supported-versions window — single-source pins.
 *
 * The window is the deploy-order independence mechanism for the operator
 * stream: the primary version is what the pinned gateway deployment serves.
 * Flip executed 2026-10-09 (rm-157's deferred half): the gateway moved to
 * 1.8.0 (infra faf71414, 2026-10-07T20:11:52Z, v0.118.2) and '1.6.0' was
 * retired from the window in the same change. These tests pin:
 * - the primary and the window contents (no accidental widen/narrow),
 * - the browser client's window and primary mirror the vendored ones,
 * - the contract 1.8.0 absorb surface: the two new failure kinds are vendored
 *   AND every OperatorFailureKind has exactly one browser display label.
 */

import {describe, expect, it} from 'vitest'
import {FAILURE_REASON_LABELS, PINNED_CONTRACT_VERSION, SUPPORTED_CONTRACT_VERSIONS} from '../public/operator-stream.js'
import {OPERATOR_FAILURE_KINDS} from '../src/gateway/operator-contract/run-status.ts'
import {OPERATOR_CONTRACT_VERSION, SUPPORTED_OPERATOR_CONTRACT_VERSIONS} from '../src/gateway/operator-contract/version.ts'

describe('rm-157 supported-versions window', () => {
  it('primary is 1.8.0 — the version the pinned gateway deployment serves since infra faf71414 (2026-10-07)', () => {
    expect(OPERATOR_CONTRACT_VERSION).toBe('1.8.0')
  })

  it('window is exactly the primary alone, in order (1.6.0 retired by the 2026-10-09 flip)', () => {
    expect([...SUPPORTED_OPERATOR_CONTRACT_VERSIONS]).toEqual(['1.8.0'])
  })

  it('window includes the primary and excludes pre-window, future, and garbage versions', () => {
    expect(SUPPORTED_OPERATOR_CONTRACT_VERSIONS).toContain(OPERATOR_CONTRACT_VERSION)
    expect(SUPPORTED_OPERATOR_CONTRACT_VERSIONS).not.toContain('1.5.0')
    expect(SUPPORTED_OPERATOR_CONTRACT_VERSIONS).not.toContain('1.6.0')
    expect(SUPPORTED_OPERATOR_CONTRACT_VERSIONS).not.toContain('1.9.0')
    expect(SUPPORTED_OPERATOR_CONTRACT_VERSIONS).not.toContain('')
  })

  it('browser window mirrors the vendored window and browser primary mirrors OPERATOR_CONTRACT_VERSION', () => {
    expect(SUPPORTED_CONTRACT_VERSIONS).toEqual([...SUPPORTED_OPERATOR_CONTRACT_VERSIONS])
    expect(PINNED_CONTRACT_VERSION).toBe(OPERATOR_CONTRACT_VERSION)
  })

  it('contract 1.8.0 absorb: the two new failure kinds are vendored', () => {
    expect(OPERATOR_FAILURE_KINDS.has('checkout-substituted')).toBe(true)
    expect(OPERATOR_FAILURE_KINDS.has('workspace-unavailable')).toBe(true)
  })

  it('every OperatorFailureKind has exactly one browser display label — no kind renders raw', () => {
    expect([...OPERATOR_FAILURE_KINDS].sort()).toEqual(Object.keys(FAILURE_REASON_LABELS).sort())
  })
})
