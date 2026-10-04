import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchMonitoring } from './monitoring.ts'

// rm-273: this suite pins the fetcher-level classification the views rely on
// (401 => 'unauthenticated' so the UI offers a sign-in affordance, not a
// network-error retry), mirroring listener.test.ts.
describe('monitoring API', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('fetchMonitoring', () => {
    it('returns parsed data on success', async () => {
      const mockData = {
        repos: [],
        staleBanner: false,
        driftCount: 0,
        enumerationIncomplete: null,
        refreshedAt: null,
      }
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(mockData), { status: 200 }))

      const res = await fetchMonitoring()
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.data.repos).toHaveLength(0)
        expect(res.data.staleBanner).toBe(false)
        expect(res.data.driftCount).toBe(0)
      }
    })

    it('rm-273: 401 maps to unauthenticated, not network (session expiry is not a transport failure)', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('unauthorized', { status: 401 }))
      const res = await fetchMonitoring()
      expect(res).toEqual({ ok: false, reason: 'unauthenticated' })
    })

    it('maps non-401 non-ok status to network', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('error', { status: 500 }))
      const res = await fetchMonitoring()
      expect(res).toEqual({ ok: false, reason: 'network' })
    })

    it('rm-515: a followed redirect is session expiry → unauthenticated, not network', async () => {
      // A real Response cannot have `redirected` set manually — emulate the
      // post-redirect shape the browser produces when the session cookie
      // expired and the server bounced the API call to the login page
      // (mirrors listener.test.ts's rm-421b case).
      const redirectedResponse = {
        ok: true,
        redirected: true,
        url: 'http://localhost/auth/login',
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON')
        },
      } as unknown as Response
      vi.mocked(fetch).mockResolvedValueOnce(redirectedResponse)
      const res = await fetchMonitoring()
      expect(res).toEqual({ ok: false, reason: 'unauthenticated' })
    })

    it('maps a transport rejection to network', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new TypeError('fetch failed'))
      const res = await fetchMonitoring()
      expect(res).toEqual({ ok: false, reason: 'network' })
    })

    it('fails closed on a malformed payload as contract-drift', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ bad: 'shape' }), { status: 200 }))
      const res = await fetchMonitoring()
      expect(res).toEqual({ ok: false, reason: 'contract-drift' })
    })

    // rm-107: the system block is OPTIONAL at the wire, STRICT when present.
    const makeSystem = (overrides: Record<string, unknown> = {}) => ({
      composedAt: 1_700_000_000_000,
      snapshot: {refreshedAt: 1_700_000_000_000, ageMs: 5_000, staleBanner: true, refreshDurationMs: 1_200, refreshDegraded: true},
      rateLimit: {primaryCount: 2, secondaryCount: 1, lastEventAt: 1_700_000_000_001, lastRetryAfterSeconds: 60},
      listenerStore: {totalMessages: 3, unreadCount: 1, prunedTotal: 4, oldestEventAgeSeconds: 7200},
      lastRefreshFailures: [{phase: 'refresh', at: 1_700_000_000_002, detail: 'upstream wedged'}],
      ...overrides,
    })

    it('rm-107: parses a well-formed system block through', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({repos: [], staleBanner: false, driftCount: 0, enumerationIncomplete: null, refreshedAt: null, system: makeSystem()}), { status: 200 }),
      )
      const res = await fetchMonitoring()
      expect(res.ok).toBe(true)
      if (!res.ok) return
      expect(res.data.system?.composedAt).toBe(1_700_000_000_000)
      expect(res.data.system?.snapshot.refreshDegraded).toBe(true)
      expect(res.data.system?.snapshot.staleBanner).toBe(true)
      expect(res.data.system?.rateLimit.primaryCount).toBe(2)
      expect(res.data.system?.listenerStore?.oldestEventAgeSeconds).toBe(7200)
      expect(res.data.system?.lastRefreshFailures[0]?.detail).toBe('upstream wedged')
    })

    it('rm-107: an ABSENT system block still parses (older payload tolerated)', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({repos: [], staleBanner: false, driftCount: 0, enumerationIncomplete: null, refreshedAt: null}), { status: 200 }),
      )
      const res = await fetchMonitoring()
      expect(res.ok).toBe(true)
      if (!res.ok) return
      expect(res.data.system).toBeUndefined()
    })

    it('rm-107: listenerStore null (no store in this process) parses as null, not drift', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({repos: [], staleBanner: false, driftCount: 0, enumerationIncomplete: null, refreshedAt: null, system: makeSystem({listenerStore: null})}), { status: 200 }),
      )
      const res = await fetchMonitoring()
      expect(res.ok).toBe(true)
      if (!res.ok) return
      expect(res.data.system?.listenerStore).toBe(null)
    })

    it('rm-107: a MALFORMED system block fails closed as contract-drift — never renders as healthy', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({repos: [], staleBanner: false, driftCount: 0, enumerationIncomplete: null, refreshedAt: null, system: makeSystem({rateLimit: {primaryCount: 'many'}})}), { status: 200 }),
      )
      const res = await fetchMonitoring()
      expect(res).toEqual({ ok: false, reason: 'contract-drift' })
    })

    it('rm-107: a system block whose snapshot sub-shape is wrong fails closed', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({repos: [], staleBanner: false, driftCount: 0, enumerationIncomplete: null, refreshedAt: null, system: makeSystem({snapshot: {refreshedAt: null, ageMs: null}})}), { status: 200 }),
      )
      const res = await fetchMonitoring()
      expect(res).toEqual({ ok: false, reason: 'contract-drift' })
    })
  })
})
