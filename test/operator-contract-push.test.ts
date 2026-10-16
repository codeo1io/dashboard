/**
 * Unit tests for the dual-shape push-subscription wire parser (#631 defense).
 *
 * The current gateway returns a `{subscriptions:[...]}` envelope with
 * epoch-millisecond createdAt/updatedAt; older gateways return the flat
 * metadata record (ISO date strings) or an empty object. parsePushSubscriptionListResponse
 * accepts both and normalizes every entry to the canonical ISO-string DTO.
 */
import {describe, expect, it} from 'vitest'
import {
  parsePushSubscriptionListResponse,
  parsePushSubscriptionMetadata,
} from '../src/gateway/operator-contract/push.ts'

const FLAT = {
  endpointHash: 'a'.repeat(64),
  keyVersion: 'v1',
  active: true,
  createdAt: '2026-07-01T10:00:00.000Z',
  updatedAt: '2026-07-01T10:00:00.000Z',
}

describe('parsePushSubscriptionListResponse', () => {
  it('parses the list envelope and normalizes epoch-ms dates to ISO strings', () => {
    const out = parsePushSubscriptionListResponse({
      subscriptions: [
        {
          endpointHash: 'b'.repeat(64),
          keyVersion: 'v2',
          active: false,
          createdAt: 1_767_261_600_000,
          updatedAt: 1_767_261_700_000,
          inactiveReason: 'session-revoked',
        },
      ],
    })
    expect(out).toHaveLength(1)
    expect(out[0]?.createdAt).toBe(new Date(1_767_261_600_000).toISOString())
    expect(out[0]?.updatedAt).toBe(new Date(1_767_261_700_000).toISOString())
    expect(out[0]?.inactiveReason).toBe('session-revoked')
  })

  it('falls back to the flat legacy record (ISO dates pass through)', () => {
    const out = parsePushSubscriptionListResponse(FLAT)
    expect(out).toHaveLength(1)
    expect(out[0]?.endpointHash).toBe(FLAT.endpointHash)
    expect(out[0]?.createdAt).toBe(FLAT.createdAt)
  })

  it('yields an empty list for the legacy empty-object "no subscription" body', () => {
    expect(parsePushSubscriptionListResponse({})).toEqual([])
  })

  it('drops invalid entries instead of failing the whole list', () => {
    const out = parsePushSubscriptionListResponse({
      subscriptions: [
        {endpointHash: 42, keyVersion: 'v1', active: true, createdAt: 'x', updatedAt: 'y'},
        FLAT,
        null,
      ],
    })
    expect(out).toHaveLength(1)
    expect(out[0]?.endpointHash).toBe(FLAT.endpointHash)
  })

  it('drops an unknown inactiveReason but keeps the otherwise-valid entry', () => {
    const out = parsePushSubscriptionListResponse({
      subscriptions: [{...FLAT, active: false, inactiveReason: 'something-new'}],
    })
    expect(out).toHaveLength(1)
    expect(out[0]?.inactiveReason).toBeUndefined()
  })

  it('drops entries whose epoch-ms date is not a finite number', () => {
    const out = parsePushSubscriptionListResponse({
      subscriptions: [{...FLAT, createdAt: Number.NaN}],
    })
    expect(out).toEqual([])
  })

  it('rejects absurd epoch values that overflow Date (RangeError guard)', () => {
    const out = parsePushSubscriptionListResponse({
      subscriptions: [{...FLAT, createdAt: 1e21}],
    })
    expect(out).toEqual([])
  })
})

describe('parsePushSubscriptionMetadata (flat legacy parser, unchanged)', () => {
  it('still accepts the flat record verbatim', () => {
    const out = parsePushSubscriptionMetadata(FLAT)
    expect(out.success).toBe(true)
    if (out.success) expect(out.data.endpointHash).toBe(FLAT.endpointHash)
  })

  it('still rejects non-record input with a fixed error', () => {
    const out = parsePushSubscriptionMetadata('nope')
    expect(out.success).toBe(false)
  })
})
