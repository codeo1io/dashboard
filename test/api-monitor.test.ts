import {describe, expect, it} from 'vitest'

import {COLD_START_SNAPSHOT} from '../src/github/aggregator.ts'
import {buildApiRouter, type MonitorProviders} from '../src/routes/api.ts'

const baseSnapshot = {
  ...COLD_START_SNAPSHOT,
  refreshedAt: 1_750_000_000_000,
  refreshDurationMs: 30_000,
  refreshDegraded: false,
  staleBanner: false,
  refreshFailStreak: 0,
}

describe('GET /monitor (rm-107 monitoring-of-monitoring composite, run be59a16e)', () => {
  it('composes rate-limit budget, listener depth/age and refresh lifecycle into one snapshot', async () => {
    const providers: MonitorProviders = {
      getRateLimitStats: () => ({
        limit: 5000,
        remaining: 4310,
        resetAt: 1_750_000_060_000,
        observedAt: 1_749_999_999_000,
        takenEvents: 690,
        secondaryEvents: 2,
      }),
      getListenerStats: () => ({
        unread: 3,
        retained: 40,
        oldestUnreadAgeMs: 120_000,
        retentionMaxRows: 500,
      }),
      getRefreshStats: () => ({
        lastOutcome: 'failed',
        failStreak: 2,
        lastAttemptAt: 1_750_000_001_000,
        lastSuccessAt: 1_749_999_000_000,
        durationMs: 41_000,
        degraded: true,
        staleBanner: true,
        refreshedAt: 1_749_999_000_000,
      }),
    }
    const app = buildApiRouter(() => baseSnapshot, providers)
    const res = await app.request('/monitor')
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
    const body = (await res.json()) as Record<string, unknown>
    expect(body).toMatchObject({
      ok: true,
      health: 'degraded',
      rateLimit: {remaining: 4310, takenEvents: 690, secondaryEvents: 2},
      listener: {unread: 3, retained: 40, retentionMaxRows: 500},
      refresh: {lastOutcome: 'failed', failStreak: 2, degraded: true, staleBanner: true},
    })
  })

  it('degrades each field independently — absent providers render as null while the snapshot alone still answers', async () => {
    const app = buildApiRouter(() => ({...baseSnapshot, staleBanner: true}))
    const res = await app.request('/monitor')
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.rateLimit).toBeNull()
    expect(body.listener).toBeNull()
    expect(body.refresh).toMatchObject({lastOutcome: null, failStreak: 0, staleBanner: true})
    expect(body.health).toBe('stale')
  })

  it('drains the composite when the app-client counter source is exhausted mid-flight', async () => {
    let calls = 0
    const providers: MonitorProviders = {
      getRateLimitStats: () => {
        calls += 1
        if (calls === 1) {
          return {
            limit: 5000,
            remaining: 4999,
            resetAt: 1_750_000_060_000,
            observedAt: 1_749_999_999_000,
            takenEvents: 1,
            secondaryEvents: 0,
          }
        }
        return {
          limit: 5000,
          remaining: 4999,
          resetAt: 1_750_000_060_000,
          observedAt: 1_749_999_999_000,
          takenEvents: 0,
          secondaryEvents: 0,
        }
      },
    }
    const app = buildApiRouter(() => baseSnapshot, providers)
    const first = (await (await app.request('/monitor')).json()) as {rateLimit: {takenEvents: number}}
    const second = (await (await app.request('/monitor')).json()) as {rateLimit: {takenEvents: number}}
    expect(first.rateLimit.takenEvents).toBe(1)
    // rm-107 B1: the route reads live counters, it never caches them across calls.
    expect(second.rateLimit.takenEvents).toBe(0)
  })
})
