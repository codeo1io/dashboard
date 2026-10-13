/**
 * Web-local shape pins for the push DTOs. Mirrors the `validate-dynamic-id`
 * precedent: the web bundle owns its own copy of the contract shapes and pins
 * them here, independent of the vendored `src/gateway/operator-contract/push.ts`
 * (which the server-side conformance test guards). This file does NOT import
 * from `src/` — the web→server boundary guard stays exception-free.
 */
import {describe, expect, it} from 'vitest'
import type {HandoffState, PushHealthStatus, PushSubscriptionMetadata, VapidKeyResponse} from './push-types.ts'
import {PUSH_HEALTH_STATUSES, PUSH_TRIGGER_KINDS, VALID_HANDOFF_STATES} from './push-types.ts'

describe('push-types web-local shape pins', () => {
  it('HandoffState value set is the five derived states', () => {
    const expected: HandoffState[] = ['push_disabled', 'not_subscribed', 'subscribed', 'stale_key', 'inactive']
    expect(VALID_HANDOFF_STATES).toEqual(new Set(expected))
  })

  // contract 1.10.0 (agent #1787/#1788): the two new vocabularies are
  // web-local duplicates of the vendored sets — pinned here and equated to
  // the vendored tuples cross-tree by the server conformance test.
  it('PushHealthStatus value set is exactly ready/degraded/unknown (no disabled on the wire)', () => {
    const expected: PushHealthStatus[] = ['ready', 'degraded', 'unknown']
    expect([...PUSH_HEALTH_STATUSES]).toEqual(expected)
    expect(new Set(PUSH_HEALTH_STATUSES).size).toBe(PUSH_HEALTH_STATUSES.length)
  })

  it('PushTriggerKind value set is exactly approval/question/run_failed', () => {
    expect([...PUSH_TRIGGER_KINDS]).toEqual(['approval', 'question', 'run_failed'])
    expect(new Set(PUSH_TRIGGER_KINDS).size).toBe(PUSH_TRIGGER_KINDS.length)
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
      createdAt: '2026-07-08T00:00:00.000Z',
      updatedAt: '2026-07-08T00:00:00.000Z',
    }
    expect(Object.keys(value).sort()).toEqual(['active', 'createdAt', 'endpointHash', 'keyVersion', 'updatedAt'])
  })
})
