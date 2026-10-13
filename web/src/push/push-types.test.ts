/**
 * Web-local shape pins for the push DTOs. Mirrors the `validate-dynamic-id`
 * precedent: the web bundle owns its own copy of the contract shapes and pins
 * them here, independent of the vendored `src/gateway/operator-contract/push.ts`
 * (which the server-side conformance test guards). This file does NOT import
 * from `src/` — the web→server boundary guard stays exception-free.
 */
import {describe, expect, it} from 'vitest'
import type {HandoffState, PushSubscriptionMetadata, VapidKeyResponse} from './push-types.ts'
import {VALID_HANDOFF_STATES} from './push-types.ts'

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
      createdAt: '2026-07-08T00:00:00.000Z',
      updatedAt: '2026-07-08T00:00:00.000Z',
    }
    expect(Object.keys(value).sort()).toEqual(['active', 'createdAt', 'endpointHash', 'keyVersion', 'updatedAt'])
  })
})

// ---------------------------------------------------------------------------
// rm-1016: operator contract 1.10.0 vocabulary — push trigger kinds (#1787)
// and session push health (#1788), mirrored from the gateway's operator-contract
// push-health.ts (v0.122.1): kinds ['approval','question','run_failed'], health
// statuses ['ready','degraded','unknown'].
// ---------------------------------------------------------------------------

describe('push-types web-local 1.10.0 vocabulary (rm-1016)', () => {
  it('OPERATOR_PUSH_TRIGGER_KINDS is the gateway trigger-kind trio', async () => {
    const {OPERATOR_PUSH_TRIGGER_KINDS} = await import('./push-types.ts')
    expect([...OPERATOR_PUSH_TRIGGER_KINDS]).toEqual(['approval', 'question', 'run_failed'])
  })

  it('OPERATOR_PUSH_HEALTH_STATUSES is the gateway health trio', async () => {
    const {OPERATOR_PUSH_HEALTH_STATUSES} = await import('./push-types.ts')
    expect([...OPERATOR_PUSH_HEALTH_STATUSES]).toEqual(['ready', 'degraded', 'unknown'])
  })

  it('web-local vocabulary stays lockstep with the vendored server contract', async () => {
    const web = await import('./push-types.ts')
    // Dynamic import of the server contract would cross the web→server boundary
    // the header above pins; instead pin the shapes and let the root conformance
    // test hold the server side against the same gateway vocabulary.
    expect([...web.OPERATOR_PUSH_TRIGGER_KINDS]).toEqual(['approval', 'question', 'run_failed'])
    expect([...web.OPERATOR_PUSH_HEALTH_STATUSES]).toEqual(['ready', 'degraded', 'unknown'])
  })
})
