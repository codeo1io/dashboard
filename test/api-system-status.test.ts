import {describe, expect, it} from 'vitest'
import {COLD_START_SNAPSHOT, type AggregatorSnapshot} from '../src/github/aggregator.ts'
import {buildApiRouter, type SystemStatusSignals} from '../src/routes/api.ts'
import {checkRateLimit, rateLimitBudgetSnapshot} from '../src/server.ts'

/** Narrowing helper — the fixture classes always exist; keeps the suite free of non-null assertions. */
function rowFor(snapshot: ReturnType<typeof rateLimitBudgetSnapshot>, cls: string): number {
  const row = snapshot.classes.find(r => r.cls === cls)
  if (row === undefined) throw new Error(`fixture is missing rate-limit class ${cls}`)
  return row.hits
}

function fakeSnapshot(): AggregatorSnapshot {
  return {
    repos: [],
    staleBanner: false,
    driftCount: 2,
    enumerationIncomplete: 1,
    refreshedAt: 1760000000000,
    refreshDurationMs: 8400,
    refreshDegraded: true,
  }
}

function fakeSignals(withStore: boolean): SystemStatusSignals {
  return {
    rateLimit: {
      windowMs: 60000,
      maxKeys: 10000,
      trackedKeys: 3,
      classes: [
        {cls: 'public', max: 60, hits: 12},
        {cls: 'operator', max: 60, hits: 0},
        {cls: 'ingest', max: 60, hits: 4},
      ],
    },
    listenerStore: withStore
      ? {rows: 120, maxRows: 500, maxAgeMs: 2592000000, oldestReceivedAt: '2026-10-01T00:00:00.000Z', unread: 7}
      : null,
  }
}

describe('rm-107: /api/monitoring composed system-status surface', () => {
  it('emits the whitelisted system object when the provider is wired (all four signals)', async () => {
    const router = buildApiRouter(() => fakeSnapshot(), () => fakeSignals(true))
    const res = await router.request('/monitoring')
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    const system = body.system as Record<string, unknown>

    // signal 1 — snapshot freshness (explicit whitelist, trackedRepos derived)
    const snapshot = system.snapshot as Record<string, unknown>
    expect(snapshot.refreshedAt).toBe(1760000000000)
    expect(snapshot.staleBanner).toBe(false)
    expect(snapshot.refreshDegraded).toBe(true)
    expect(snapshot.refreshDurationMs).toBe(8400)
    expect(snapshot.trackedRepos).toBe(0)
    expect(snapshot.driftCount).toBe(2)

    // signal 2 — refresh failures (count + composed degraded bit)
    const failures = system.refreshFailures as Record<string, unknown>
    expect(failures.enumerationIncomplete).toBe(1)
    expect(failures.degraded).toBe(true)

    // signal 3 — rate-limit budget (per-class hits/max + tracked keys)
    const rateLimit = system.rateLimit as Record<string, unknown>
    expect(rateLimit.windowMs).toBe(60000)
    expect(rateLimit.trackedKeys).toBe(3)
    expect(rateLimit.maxKeys).toBe(10000)
    expect(rateLimit.classes).toEqual([
      {cls: 'public', max: 60, hits: 12},
      {cls: 'operator', max: 60, hits: 0},
      {cls: 'ingest', max: 60, hits: 4},
    ])

    // signal 4 — listener store depth/age
    expect(system.listenerStore).toEqual({
      rows: 120,
      maxRows: 500,
      maxAgeMs: 2592000000,
      oldestReceivedAt: '2026-10-01T00:00:00.000Z',
      unread: 7,
    })

    // the DTO's top-level whitelist is unchanged
    expect(Object.keys(body).sort()).toEqual(
      ['driftCount', 'enumerationIncomplete', 'refreshDegraded', 'refreshDurationMs', 'refreshedAt', 'repos', 'staleBanner', 'system'].sort(),
    )
  })

  it('emits listenerStore: null when no store is mounted (channel absent, not errored)', async () => {
    const router = buildApiRouter(() => fakeSnapshot(), () => fakeSignals(false))
    const res = await router.request('/monitoring')
    const body = (await res.json()) as Record<string, unknown>
    expect((body.system as Record<string, unknown>).listenerStore).toBeNull()
  })

  it('omits the system field entirely when no provider is wired (bare-router contract)', async () => {
    const router = buildApiRouter(() => fakeSnapshot())
    const res = await router.request('/monitoring')
    const body = (await res.json()) as Record<string, unknown>
    expect('system' in body).toBe(false)
  })

  it('composes from the cold-start snapshot without a provider wired (no crash, no system field)', async () => {
    const router = buildApiRouter()
    const res = await router.request('/monitoring')
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.staleBanner).toBe(COLD_START_SNAPSHOT.staleBanner)
    expect('system' in body).toBe(false)
  })

  it('keeps /api/status the full-snapshot internal endpoint (shape unchanged, no system injection)', async () => {
    const snap = fakeSnapshot()
    const router = buildApiRouter(() => snap, () => fakeSignals(true))
    const res = await router.request('/status')
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.refreshedAt).toBe(snap.refreshedAt)
    expect(body.enumerationIncomplete).toBe(snap.enumerationIncomplete)
    expect('system' in body).toBe(false)
  })
})

describe('rm-107: rateLimitBudgetSnapshot (module-state budget accessor)', () => {
  it('sums current-window hits per class across tracked keys', () => {
    const t = 1760000000000
    checkRateLimit('10.0.0.1', t, 'public')
    checkRateLimit('10.0.0.1', t, 'public')
    checkRateLimit('10.0.0.2', t, 'operator')
    checkRateLimit('10.0.0.2', t + 1000, 'ingest')

    // read at the fixture clock t so this suite's entries are provably in-window
    const snap = rateLimitBudgetSnapshot(t)
    expect(snap.windowMs).toBeGreaterThan(0)
    expect(snap.maxKeys).toBeGreaterThan(0)
    expect(snap.trackedKeys).toBeGreaterThanOrEqual(2)
    const rowFor = (cls: string): number => {
      const row = snap.classes.find(r => r.cls === cls)
      if (row === undefined) throw new Error(`missing class ${cls}`)
      return row.hits
    }
    expect(snap.classes.find(r => r.cls === 'public')?.max ?? 0).toBeGreaterThan(0)
    // hits at clock t: every key this file created so far used clocks ≤ t+1000,
    // so all are within the current window at t — lower bounds are this
    // suite's own contributions plus the expiry test's if it ran first.
    expect(rowFor('public')).toBeGreaterThanOrEqual(2)
    expect(rowFor('operator')).toBeGreaterThanOrEqual(1)
    expect(rowFor('ingest')).toBeGreaterThanOrEqual(1)
  })

  it('excludes entries whose window has expired (counts are a current-window view)', () => {
    const t = 1760000000000
    checkRateLimit('198.51.100.7', t, 'public')
    checkRateLimit('198.51.100.7', t, 'public')
    checkRateLimit('198.51.100.7', t, 'operator')
    const windowMs = rateLimitBudgetSnapshot(t).windowMs

    // inside the window: this key's public hits count
    const inWindow = rowFor(rateLimitBudgetSnapshot(t + windowMs - 1), 'public')
    expect(inWindow).toBeGreaterThanOrEqual(2)

    // past the window: every key this file created used clocks ≤ t, so at
    // t+windowMs+1 they are ALL expired — operator hits must read exactly 0
    // (the only operator hits in this file came from '10.0.0.2' at t and
    // '198.51.100.7' at t, both out of window).
    const after = rowFor(rateLimitBudgetSnapshot(t + windowMs + 1), 'operator')
    expect(after).toBe(0)
  })
})
