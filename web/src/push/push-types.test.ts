/**
 * Web-local shape pins for the push DTOs. Mirrors the `validate-dynamic-id`
 * precedent: the web bundle owns its own copy of the contract shapes and pins
 * them here, independent of the vendored `src/gateway/operator-contract/push.ts`
 * (which the server-side conformance test guards). This file does NOT import
 * from `src/` — the web→server boundary guard stays exception-free.
 */
import {describe, expect, it} from 'vitest'
import type {HandoffState, OperatorPushInactiveReason, PushSubscriptionMetadata, VapidKeyResponse} from './push-types.ts'
import {OPERATOR_PUSH_INACTIVE_REASONS, VALID_HANDOFF_STATES} from './push-types.ts'

describe('push-types web-local shape pins', () => {
  it('HandoffState value set is the five derived states', () => {
    const expected: HandoffState[] = ['push_disabled', 'not_subscribed', 'subscribed', 'stale_key', 'inactive']
    expect(VALID_HANDOFF_STATES).toEqual(new Set(expected))
  })

  it('VapidKeyResponse has exactly publicKey + keyVersion', () => {
    const value: VapidKeyResponse = {publicKey: 'a', keyVersion: 'b'}
    expect(Object.keys(value).sort()).toEqual(['keyVersion', 'publicKey'])
  })

  it('PushSubscriptionMetadata required fields are the safe-metadata set (no raw endpoint/keys)', () => {
    const value: PushSubscriptionMetadata = {
      endpointHash: 'a'.repeat(64),
      keyVersion: 'b',
      active: true,
      createdAt: 1_772_924_800_000,
      updatedAt: 1_772_924_800_000,
    }
    expect(Object.keys(value).sort()).toEqual(['active', 'createdAt', 'endpointHash', 'keyVersion', 'updatedAt'])
  })

  it('OperatorPushInactiveReason (rm-693) is the closed four-value gateway ladder', () => {
    const expected: OperatorPushInactiveReason[] = ['unsubscribed', 'dead', 'revoked', 'session-revoked']
    expect([...OPERATOR_PUSH_INACTIVE_REASONS].sort()).toEqual([...expected].sort())
    expect(OPERATOR_PUSH_INACTIVE_REASONS.size).toBe(4)
  })

  it('PushSubscriptionMetadata.inactiveReason, when present, is a ladder member', () => {
    const value: PushSubscriptionMetadata = {
      endpointHash: 'a'.repeat(64),
      keyVersion: 'b',
      active: false,
      createdAt: 1_772_924_800_000,
      updatedAt: 1_772_924_800_000,
      inactiveReason: 'session-revoked',
    }
    expect(OPERATOR_PUSH_INACTIVE_REASONS.has(value.inactiveReason!)).toBe(true)
  })
})
