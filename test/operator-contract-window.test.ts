/**
 * rm-157 supported-versions window — single-source pins.
 *
 * rm-252 flip (2026-10-09): the deployed gateway (infra faf71414 -> v0.118.2)
 * has durably served 1.8.0 since 2026-10-07, so the primary moved to '1.8.0'
 * and '1.6.0' retired from the window in the same change (the rm-157
 * retirement rule). These tests pin:
 * - the flipped primary and the retired window (no accidental widen/narrow),
 * - the browser client's window and primary mirror the vendored ones,
 * - the contract 1.8.0 absorb surface: the two new failure kinds are vendored
 *   AND every OperatorFailureKind has exactly one browser display label.
 */

import {describe, expect, it} from 'vitest'
import {FAILURE_REASON_LABELS, PINNED_CONTRACT_VERSION, SUPPORTED_CONTRACT_VERSIONS} from '../public/operator-stream.js'
import {OPERATOR_FAILURE_KINDS} from '../src/gateway/operator-contract/run-status.ts'
import {OPERATOR_CONTRACT_VERSION, SUPPORTED_OPERATOR_CONTRACT_VERSIONS} from '../src/gateway/operator-contract/version.ts'

describe('rm-157 supported-versions window (rm-252 flip)', () => {
  it('primary is 1.8.0 — the version the deployed gateway durably serves', () => {
    expect(OPERATOR_CONTRACT_VERSION).toBe('1.8.0')
  })

  it("window is exactly ['1.8.0'] — '1.6.0' retired in the same change", () => {
    expect([...SUPPORTED_OPERATOR_CONTRACT_VERSIONS]).toEqual(['1.8.0'])
    expect(SUPPORTED_OPERATOR_CONTRACT_VERSIONS).not.toContain('1.6.0')
  })

  it('window includes the primary and excludes retired, pre-window, future, and garbage versions', () => {
    expect(SUPPORTED_OPERATOR_CONTRACT_VERSIONS).toContain(OPERATOR_CONTRACT_VERSION)
    expect(SUPPORTED_OPERATOR_CONTRACT_VERSIONS).not.toContain('1.6.0')
    expect(SUPPORTED_OPERATOR_CONTRACT_VERSIONS).not.toContain('1.5.0')
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

  it('rm-864: the retriable and non-retriable workspace-failure labels stay pairwise distinct and encode retryability', () => {
    const retriable = FAILURE_REASON_LABELS['workspace-unreachable']
    const nonRetriable = FAILURE_REASON_LABELS['workspace-unavailable']
    // The vendored contract keeps the kinds apart on retryability
    // (run-status.ts); the browser copy must stay distinct under any future
    // copy edit and must keep carrying the retryability signal.
    expect(retriable).not.toBe(nonRetriable)
    expect(retriable).toMatch(/retry may succeed/i)
    expect(nonRetriable).toMatch(/not retriable/i)
    expect(retriable).not.toMatch(/not retriable/i)
    expect(nonRetriable).not.toMatch(/retry may succeed/i)
  })
})
