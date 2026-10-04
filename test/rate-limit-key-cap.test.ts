/**
 * rm-286 — admission cap on the rate-limit store's key count
 * (RATE_LIMIT_MAX_KEYS, default 10_000). Re-homed from archived PR #233's U3
 * (preserved byte-exact in docs/archive/pr-233-unlanded-cycle-18-2026-09-30.md
 * — red test at :95-177, server diff at :303-360); this file reuses that test
 * where it still compiles against the current limiter shape.
 *
 * The store is per-path-class keyed on the client address (first XFF hop when
 * the proxy is trusted), so key-churn — e.g. a flood of spoofed first hops —
 * grows rateLimitMap without bound. The cap fails CLOSED: when the store is
 * full even after a stale-window sweep, a new key is denied (429 at the
 * middleware) while existing keys keep their budgets.
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {checkRateLimit, rateLimitStoreSize, resetRateLimitForTesting} from '../src/server.ts'

const CAP = 10_000
const WINDOW_MS = 60_000
const STALE_AGE_MS = WINDOW_MS * 2

const ipForIndex = (i: number): string => `10.0.${Math.floor(i / 250)}.${i % 250}`

describe('rate-limit store key admission cap (rm-286)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetRateLimitForTesting()
  })

  afterEach(() => {
    resetRateLimitForTesting()
  })

  it('never exceeds the cap: unique keys fill exactly to capacity, then fail closed', () => {
    const now = Date.now()
    for (let i = 0; i < CAP; i++) {
      expect(checkRateLimit(ipForIndex(i), now)).toBe(true)
    }
    expect(rateLimitStoreSize()).toBe(CAP)
    // CAP+1th unique key is denied (admission fails closed after the sweep
    // finds nothing stale at the same instant).
    expect(checkRateLimit('192.0.2.1', now)).toBe(false)
    // Still bounded at the cap.
    expect(rateLimitStoreSize()).toBe(CAP)
    // Existing keys are NOT evicted or penalized by the cap.
    expect(checkRateLimit(ipForIndex(1), now)).toBe(true)
    expect(rateLimitStoreSize()).toBe(CAP)
  })

  it('at capacity, a stale-window sweep runs before failing closed — fresh keys are admitted after eviction', () => {
    const now = Date.now()
    for (let i = 0; i < CAP; i++) {
      checkRateLimit(ipForIndex(i), now)
    }
    expect(rateLimitStoreSize()).toBe(CAP)
    const later = now + STALE_AGE_MS + 1
    // Every existing window is stale at `later`: admission's sweep evicts all
    // of them, so the new key is admitted and the store restarts at size 1.
    expect(checkRateLimit('192.0.2.9', later)).toBe(true)
    expect(rateLimitStoreSize()).toBe(1)
  })

  it('a new key whose admission sweeps only SOME stale entries still lands under the cap', () => {
    const now = Date.now()
    // Half the store at `now`, the other half one window later: at `later`
    // only the first half is stale (> STALE_AGE_MS old).
    for (let i = 0; i < CAP / 2; i++) {
      checkRateLimit(ipForIndex(i), now)
    }
    const mid = now + WINDOW_MS + 1
    for (let i = CAP / 2; i < CAP; i++) {
      checkRateLimit(ipForIndex(i), mid)
    }
    expect(rateLimitStoreSize()).toBe(CAP)
    const later = now + STALE_AGE_MS + 1
    // Sweep-on-insert evicts the stale half only; the new key lands the store
    // at CAP/2 + 1 — under the cap, no denial.
    expect(checkRateLimit('192.0.2.10', later)).toBe(true)
    expect(rateLimitStoreSize()).toBe(CAP / 2 + 1)
  })
})
