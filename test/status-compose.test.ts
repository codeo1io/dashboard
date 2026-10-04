/**
 * rm-107: system-status composer (src/status/compose.ts) — the /api/monitoring
 * `system` block.
 *
 * Deterministic cases pin the registry lifecycle (register/unregister/reset),
 * the failure-ring caps (8 events, 160-char detail belt), and the
 * process-local honesty of the listener block. Property cases pin the bounds
 * and the counter/age arithmetic against an independent oracle with an
 * injected clock — compose reads time ONCE per call so the derived ages are
 * mutually coherent.
 */
import fc from 'fast-check'
import {beforeEach, describe, expect, it} from 'vitest'
import {createListenerStore} from '../src/listener/store.ts'
import {
  composeSystemStatus,
  recordRateLimitEvent,
  recordRefreshFailure,
  registerListenerStoreStatusSource,
  resetSystemStatusForTests,
  unregisterListenerStoreStatusSource,
} from '../src/status/compose.ts'

const SNAPSHOT_INPUT = {refreshedAt: null, staleBanner: true, refreshDurationMs: null, refreshDegraded: false} as const

beforeEach(() => {
  resetSystemStatusForTests()
})

// ---------------------------------------------------------------------------
// Registry lifecycle
// ---------------------------------------------------------------------------

describe('system-status composer — registry (rm-107)', () => {
  it('listenerStore block is null with nothing registered', () => {
    expect(composeSystemStatus(SNAPSHOT_INPUT).listenerStore).toBe(null)
  })

  it('a registered source is composed live (not snapshotted at registration)', () => {
    let total = 0
    registerListenerStoreStatusSource({stats: () => ({totalMessages: total, unreadCount: 0, prunedTotal: 0, oldestReceivedAt: null})})
    expect(composeSystemStatus(SNAPSHOT_INPUT).listenerStore?.totalMessages).toBe(0)
    total = 7
    expect(composeSystemStatus(SNAPSHOT_INPUT).listenerStore?.totalMessages).toBe(7)
  })

  it('last-registered-wins; unregistering THAT source clears the block (identity match)', () => {
    const first = {stats: () => ({totalMessages: 1, unreadCount: 0, prunedTotal: 0, oldestReceivedAt: null})}
    const second = {stats: () => ({totalMessages: 2, unreadCount: 0, prunedTotal: 0, oldestReceivedAt: null})}
    registerListenerStoreStatusSource(first)
    registerListenerStoreStatusSource(second)
    expect(composeSystemStatus(SNAPSHOT_INPUT).listenerStore?.totalMessages).toBe(2)
    unregisterListenerStoreStatusSource(second)
    expect(composeSystemStatus(SNAPSHOT_INPUT).listenerStore).toBe(null)
  })

  it('a real store self-registers on create and unregisters on close', () => {
    const store = createListenerStore(':memory:')
    store.insert({source: 'infra', kind: 'deploy-health', severity: 'info', title: 'a', body: 'b', links: [], dedupeKey: null, createdAt: new Date().toISOString()})
    const view = composeSystemStatus(SNAPSHOT_INPUT)
    expect(view.listenerStore?.totalMessages).toBe(1)
    expect(view.listenerStore?.unreadCount).toBe(1)
    expect(view.listenerStore?.oldestEventAgeSeconds).not.toBe(null)
    store.close()
    expect(composeSystemStatus(SNAPSHOT_INPUT).listenerStore).toBe(null)
  })
})

// ---------------------------------------------------------------------------
// Failure ring + rate-limit counters
// ---------------------------------------------------------------------------

describe('system-status composer — failure ring (rm-107)', () => {
  it('ring is newest-first and capped at 8 events', () => {
    for (let index = 0; index < 12; index++) {
      recordRefreshFailure('refresh', `failure-${index}`, 1_000 + index)
    }
    const failures = composeSystemStatus(SNAPSHOT_INPUT).lastRefreshFailures
    expect(failures).toHaveLength(8)
    // The OLDEST four are dropped; view order is newest-first.
    expect(failures[0]?.detail).toBe('failure-11')
    expect(failures[7]?.detail).toBe('failure-4')
  })

  it('detail is truncated to 160 chars (second belt over caller sanitization)', () => {
    recordRefreshFailure('metadata', 'x'.repeat(500), 1_000)
    expect(composeSystemStatus(SNAPSHOT_INPUT).lastRefreshFailures[0]?.detail).toHaveLength(160)
  })

  it('rate-limit counters split primary/secondary and carry the LAST event', () => {
    recordRateLimitEvent({secondary: false, retryAfterSeconds: 60, at: 5_000})
    recordRateLimitEvent({secondary: false, retryAfterSeconds: 61, at: 6_000})
    recordRateLimitEvent({secondary: true, retryAfterSeconds: 30, at: 7_000})
    const {rateLimit} = composeSystemStatus(SNAPSHOT_INPUT)
    expect(rateLimit.primaryCount).toBe(2)
    expect(rateLimit.secondaryCount).toBe(1)
    expect(rateLimit.lastEventAt).toBe(7_000)
    expect(rateLimit.lastRetryAfterSeconds).toBe(30)
  })
})

// ---------------------------------------------------------------------------
// Property invariants
// ---------------------------------------------------------------------------

describe('system-status composer — property invariants (rm-107)', () => {
  it('for any recorded sequence: ring bounded at 8, details at 160, view = newest-first insertion order', () => {
    const failureArb = fc.record({
      phase: fc.constantFrom('metadata' as const, 'refresh' as const),
      detail: fc.string({maxLength: 400}),
      at: fc.integer({min: 0, max: 1_000_000}),
    })
    fc.assert(
      fc.property(fc.array(failureArb, {maxLength: 60}), events => {
        resetSystemStatusForTests()
        for (const event of events) recordRefreshFailure(event.phase, event.detail, event.at)
        const failures = composeSystemStatus(SNAPSHOT_INPUT).lastRefreshFailures
        expect(failures.length).toBeLessThanOrEqual(8)
        for (const failure of failures) expect(failure.detail.length).toBeLessThanOrEqual(160)
        // The retained suffix of the insertion order, newest-first.
        const retained = events.slice(Math.max(0, events.length - 8)).reverse()
        expect(failures.map(f => f.at)).toEqual(retained.map(e => e.at))
      }),
      {numRuns: 200},
    )
  })

  it('for any rate-limit event sequence: counters are exact tallies and the tail is the last event', () => {
    const eventArb = fc.record({
      secondary: fc.boolean(),
      retryAfterSeconds: fc.integer({min: 0, max: 3_600}),
      at: fc.integer({min: 0, max: 1_000_000}),
    })
    fc.assert(
      fc.property(fc.array(eventArb, {maxLength: 50}), events => {
        resetSystemStatusForTests()
        for (const event of events) recordRateLimitEvent(event)
        const {rateLimit} = composeSystemStatus(SNAPSHOT_INPUT)
        expect(rateLimit.primaryCount).toBe(events.filter(event => !event.secondary).length)
        expect(rateLimit.secondaryCount).toBe(events.filter(event => event.secondary).length)
        const last = events.at(-1)
        expect(rateLimit.lastEventAt).toBe(last === undefined ? null : last.at)
        expect(rateLimit.lastRetryAfterSeconds).toBe(last === undefined ? null : last.retryAfterSeconds)
      }),
      {numRuns: 200},
    )
  })

  it('with an injected clock: ageMs = clamp0(now − refreshedAt), null when never refreshed; composedAt = that same now', () => {
    fc.assert(
      fc.property(
        fc.option(fc.integer({min: 0, max: 10_000_000}), {nil: undefined}),
        fc.integer({min: 0, max: 10_000_000}),
        (refreshedAt, now) => {
          const view = composeSystemStatus(
            {refreshedAt: refreshedAt ?? null, staleBanner: false, refreshDurationMs: null, refreshDegraded: false},
            {now: () => now},
          )
          expect(view.composedAt).toBe(now)
          if (refreshedAt === undefined) {
            expect(view.snapshot.ageMs).toBe(null)
          } else {
            expect(view.snapshot.ageMs).toBe(Math.max(0, now - refreshedAt))
          }
        },
      ),
      {numRuns: 300},
    )
  })

  it('oldestEventAgeSeconds derives from the oldest ISO timestamp against the same injected now (null on null)', () => {
    const isoArb = fc
      .date({min: new Date(0), max: new Date(4_000_000_000_000), noInvalidDate: true})
      .map(date => new Date(date.getTime()).toISOString())
    fc.assert(
      fc.property(
        fc.option(isoArb, {nil: undefined}),
        fc.integer({min: 0, max: 4_102_444_800_000}),
        (oldestIso, now) => {
          resetSystemStatusForTests()
          registerListenerStoreStatusSource({
            stats: () => ({totalMessages: 3, unreadCount: 1, prunedTotal: 0, oldestReceivedAt: oldestIso ?? null}),
          })
          const block = composeSystemStatus(SNAPSHOT_INPUT, {now: () => now}).listenerStore
          expect(block?.totalMessages).toBe(3)
          expect(block?.unreadCount).toBe(1)
          if (oldestIso === undefined) {
            expect(block?.oldestEventAgeSeconds).toBe(null)
          } else {
            const expected = Math.max(0, Math.round((now - Date.parse(oldestIso)) / 1000))
            expect(block?.oldestEventAgeSeconds).toBe(Number.isNaN(expected) ? null : expected)
          }
        },
      ),
      {numRuns: 300},
    )
  })
})
