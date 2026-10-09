/**
 * rm-833 — vendored operator-contract vocabulary conformance suite.
 *
 * The vendored README promises the vocabulary sets are exported "so coverage
 * tests can read them at runtime"; this suite is that coverage test. It pins
 * EXACT membership of every exported vocabulary surface. A Set or list that
 * gains or loses a member fails here — that failure is the vendored-drift
 * signal (a contract-version bump that changes vocabulary must update the
 * vendored sets AND this suite together, per the refresh checklist in
 * provenance.ts's header).
 *
 * Pinned surfaces:
 * - provenance.ts: CHECKOUT_OPERATIONS, LAYOUT_REFUSAL_REASONS,
 *   OBSTRUCTION_KINDS, UPDATE_FAILURE_REASONS (Sets), CHECKOUT_REFUSAL_REASONS
 *   (list; also compile-time-pinned by CheckoutRefusalReasonsAreExact).
 * - run-status.ts: OPERATOR_FAILURE_KINDS.
 * - push.ts: VALID_PUSH_HANDOFF_STATES, OPERATOR_PUSH_INACTIVE_REASONS (rm-693).
 */

import {describe, expect, it} from 'vitest'
import {
  CHECKOUT_OPERATIONS,
  CHECKOUT_REFUSAL_REASONS,
  LAYOUT_REFUSAL_REASONS,
  OBSTRUCTION_KINDS,
  UPDATE_FAILURE_REASONS,
} from '../src/gateway/operator-contract/provenance.ts'
import {OPERATOR_PUSH_INACTIVE_REASONS, VALID_PUSH_HANDOFF_STATES} from '../src/gateway/operator-contract/push.ts'
import {OPERATOR_FAILURE_KINDS} from '../src/gateway/operator-contract/run-status.ts'

function pinSet(name: string, actual: ReadonlySet<string>, expected: readonly string[]) {
  it(`${name} pins exact membership (${expected.length} members)`, () => {
    expect([...actual].sort()).toEqual([...expected].sort())
    expect(actual.size).toBe(expected.length)
    for (const member of expected) {
      expect(actual.has(member)).toBe(true)
    }
  })
}

describe('rm-833 vendored vocabulary conformance (provenance)', () => {
  pinSet('CHECKOUT_OPERATIONS', CHECKOUT_OPERATIONS, [
    'none', 'merge', 'rebase', 'am', 'cherry-pick', 'revert', 'bisect',
  ])

  pinSet('LAYOUT_REFUSAL_REASONS', LAYOUT_REFUSAL_REASONS, [
    'core-worktree', 'gitfile', 'symlinked-git-dir', 'symlinked-config',
    'alternates', 'replace-refs', 'grafts', 'shallow', 'partial-clone',
    'linked-worktree', 'unsupported-index-flag', 'bare-repository',
  ])

  pinSet('OBSTRUCTION_KINDS', OBSTRUCTION_KINDS, [
    'exact-conflict', 'prefix-conflict', 'identical-content', 'symlink-ancestor',
  ])

  pinSet('UPDATE_FAILURE_REASONS', UPDATE_FAILURE_REASONS, [
    'aborted', 'inspection-failed', 'fetch-auth-rejected', 'fetch-not-found',
    'fetch-forbidden', 'fetch-rate-limited', 'fetch-unreachable', 'fetch-timeout',
    'fetch-failed', 'remote-moved', 'apply-failed', 'termination-unconfirmed',
  ])

  it('CHECKOUT_REFUSAL_REASONS pins exact membership (list, 13 members)', () => {
    expect([...CHECKOUT_REFUSAL_REASONS]).toEqual([
      'needs-recovery', 'checkout-substituted', 'unsupported-layout',
      'unsupported-config', 'operation-in-progress', 'dirty',
      'submodule-initialized', 'detached', 'non-default-branch', 'diverged',
      'ahead', 'obstructed', 'maintenance-hold',
    ])
  })
})

describe('rm-833 vendored vocabulary conformance (run-status + push)', () => {
  pinSet('OPERATOR_FAILURE_KINDS', OPERATOR_FAILURE_KINDS, [
    'inactivity-timeout', 'max-duration-timeout', 'stream-ended',
    'workspace-unreachable', 'session-error', 'checkout-substituted',
    'workspace-unavailable', 'unknown',
  ])

  pinSet('VALID_PUSH_HANDOFF_STATES', VALID_PUSH_HANDOFF_STATES, [
    'push_disabled', 'not_subscribed', 'subscribed', 'stale_key', 'inactive',
  ])

  pinSet('OPERATOR_PUSH_INACTIVE_REASONS (rm-693)', OPERATOR_PUSH_INACTIVE_REASONS, [
    'unsubscribed', 'dead', 'revoked', 'session-revoked',
  ])
})
