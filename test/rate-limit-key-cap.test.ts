import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {checkRateLimit, rateLimitStoreSize, resetRateLimitForTesting} from '../src/server.ts'

/**
 * rm-251: the limiter store must enforce a hard key-count cap. At capacity a
 * NEW key first triggers a stale-window sweep; if the store is still full the
 * request fails closed (429). Existing keys are never evicted by cap pressure.
 *
 * The default cap is 10_000 distinct keys; these tests drive the real default
 * (no env override needed) with unique synthetic addresses.
 */

const CAP = 10_000
const WINDOW_MS = 60_000
const STALE_AGE_MS = 2 * WINDOW_MS

beforeEach(() => {
  resetRateLimitForTesting()
})

afterEach(() => {
  resetRateLimitForTesting()
})

describe('rm-251 rate limiter key-count cap', () => {
  it('the store never exceeds the cap: unique keys fill exactly to capacity, then fail closed', () => {
    const now = 1_000_000
    // Fill the store to capacity with unique clients.
    for (let i = 0; i < CAP; i++) {
      expect(checkRateLimit(`10.0.${Math.floor(i / 250)}.${i % 250}`, now)).toBe(true)
    }
    expect(rateLimitStoreSize()).toBe(CAP)

    // One more UNIQUE key at the same instant: at capacity, nothing stale to
    // evict → fail closed (429), and the store must not grow.
    expect(checkRateLimit('192.0.2.1', now)).toBe(false)
    expect(rateLimitStoreSize()).toBe(CAP)

    // An EXISTING key is unaffected — cap pressure never evicts a live client.
    expect(checkRateLimit('10.0.0.1', now)).toBe(true)
    expect(rateLimitStoreSize()).toBe(CAP)
  })

  it('at capacity, a stale-window sweep runs before failing closed — fresh keys are admitted after eviction', () => {
    const t0 = 1_000_000
    // Fill with keys whose windows are all stale at t0 + STALE_AGE_MS + 1.
    for (let i = 0; i < CAP; i++) {
      expect(checkRateLimit(`10.1.${Math.floor(i / 250)}.${i % 250}`, t0)).toBe(true)
    }
    expect(rateLimitStoreSize()).toBe(CAP)

    const later = t0 + STALE_AGE_MS + 1
    // New key at `later`: admission finds the store full → sweep evicts every
    // stale window (all CAP entries) → the new key is admitted.
    expect(checkRateLimit('192.0.2.9', later)).toBe(true)
    expect(rateLimitStoreSize()).toBe(1)
  })

  it('a new key whose admission sweeps only SOME stale entries still lands under the cap', () => {
    const t0 = 5_000_000
    // Half old (stale), half fresh.
    for (let i = 0; i < CAP / 2; i++) {
      expect(checkRateLimit(`10.2.${Math.floor(i / 250)}.${i % 250}`, t0)).toBe(true)
    }
    const mid = t0 + WINDOW_MS + 1
    for (let i = 0; i < CAP / 2; i++) {
      expect(checkRateLimit(`10.3.${Math.floor(i / 250)}.${i % 250}`, mid)).toBe(true)
    }
    expect(rateLimitStoreSize()).toBe(CAP)

    const later = t0 + STALE_AGE_MS + 1
    // The t0 half is stale now; the mid half is not. Admission sweeps the
    // stale half (5000) and admits the new key → size 5001, well under cap.
    expect(checkRateLimit('192.0.2.10', later)).toBe(true)
    expect(rateLimitStoreSize()).toBe(CAP / 2 + 1)
  })
})
