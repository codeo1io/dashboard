import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchMonitoring, MONITORING_CALL_TIMEOUT_MS } from './monitoring.ts'

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
        // rm-1447: the annotation is optional on the wire — absence parses to null.
        expect(res.data.platformStatus).toBeNull()
      }
    })

    it('rm-1447: parses a present platform-status annotation', async () => {
      const mockData = {
        repos: [],
        staleBanner: false,
        driftCount: 0,
        enumerationIncomplete: null,
        refreshedAt: 1742000000000,
        platformStatus: {
          overall: 'minor',
          overallDescription: 'Investigating Actions run creation delays',
          actions: 'major_outage',
          fetchedAt: 1742000001000,
        },
      }
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(mockData), { status: 200 }))

      const res = await fetchMonitoring()
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.data.platformStatus).toEqual(mockData.platformStatus)
      }
    })

    it('rm-1447: explicit null platformStatus parses to null (fail-open absence)', async () => {
      const mockData = {
        repos: [],
        staleBanner: false,
        driftCount: 0,
        enumerationIncomplete: null,
        refreshedAt: null,
        platformStatus: null,
      }
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(mockData), { status: 200 }))

      const res = await fetchMonitoring()
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.data.platformStatus).toBeNull()
      }
    })

    it('rm-1447: malformed platformStatus fails closed as contract-drift', async () => {
      const mockData = {
        repos: [],
        staleBanner: false,
        driftCount: 0,
        enumerationIncomplete: null,
        refreshedAt: null,
        platformStatus: {overall: 42, actions: 'mostly-fine'},
      }
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(mockData), { status: 200 }))

      const res = await fetchMonitoring()
      expect(res).toEqual({ ok: false, reason: 'contract-drift' })
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

    it('rm-501: bounds the GET with the api-layer default signal when the caller passes none', async () => {
      // Backstop under the view-layer 15s budget: a caller signal still
      // wins, but an un-signaled call must never hang past its budget
      // (mirrors listener.test.ts's rm-1487 twin).
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ bad: 'shape' }), { status: 200 }))
      await fetchMonitoring()
      expect(fetch).toHaveBeenCalledWith('/api/monitoring', expect.objectContaining({ signal: expect.any(AbortSignal) }))
    })

    it('rm-501: the default is AbortSignal.timeout(MONITORING_CALL_TIMEOUT_MS 10s), strictly below the view-layer 15s budget', async () => {
      const fakeSignal = new AbortController().signal
      const timeoutSpy = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(fakeSignal)
      vi.mocked(fetch).mockResolvedValueOnce(new Response('error', { status: 500 }))
      await fetchMonitoring()
      expect(timeoutSpy).toHaveBeenCalledWith(MONITORING_CALL_TIMEOUT_MS)
      expect(vi.mocked(fetch).mock.calls[0]?.[1]?.signal).toBe(fakeSignal)
      expect(MONITORING_CALL_TIMEOUT_MS).toBe(10_000)
    })

    it('rm-501: honors a caller-provided signal over the api-layer default', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('error', { status: 500 }))
      const controller = new AbortController()
      const res = await fetchMonitoring({ abortSignal: controller.signal })
      expect(res).toEqual({ ok: false, reason: 'network' })
      expect(vi.mocked(fetch).mock.calls[0]?.[1]?.signal).toBe(controller.signal)
    })

    it("rm-501: AbortSignal.timeout rejections (TimeoutError) classify 'timeout', not 'network'", async () => {
      // Latent-bug pin (twin of listener.test.ts's rm-1487 case): the
      // pre-rm-501 catch matched only AbortError, so the new default
      // budget's expiry would have been misfiled as a transport fault.
      vi.mocked(fetch).mockRejectedValueOnce(new DOMException('The operation was aborted due to timeout', 'TimeoutError'))
      const res = await fetchMonitoring()
      expect(res).toEqual({ ok: false, reason: 'timeout' })
    })

    it('rm-501: a caller AbortError still classifies as timeout', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'))
      const res = await fetchMonitoring()
      expect(res).toEqual({ ok: false, reason: 'timeout' })
    })
  })
})
