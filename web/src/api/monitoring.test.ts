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
        // rm-1467: the maintenance list is a later rider on the annotation;
        // older servers omit it and that parses to the empty list.
        expect(res.data.platformStatus).toEqual({...mockData.platformStatus, maintenances: []})
      }
    })

    // rm-1467: upcoming/underway platform maintenance windows ride the DTO.
    // The parse is strict per-window (malformed window = drift, not silent
    // drop) and fail-open only at the annotation level, matching rm-1447.
    describe('rm-1467 maintenance windows', () => {
      it('parses present windows, preserving order and both statuses', async () => {
        const mockData = {
          repos: [],
          staleBanner: false,
          driftCount: 0,
          enumerationIncomplete: null,
          refreshedAt: 1742000000000,
          platformStatus: {
            overall: 'none',
            overallDescription: 'All Systems Operational',
            actions: 'operational',
            maintenances: [
              {name: 'Actions maintenance', status: 'scheduled', scheduledFor: '2026-10-20T14:00:00Z', scheduledUntil: '2026-10-20T16:00:00Z'},
              {name: 'API maintenance', status: 'in_progress', scheduledFor: '2026-10-17T04:00:00Z', scheduledUntil: '2026-10-17T06:00:00Z'},
            ],
            fetchedAt: 1742000001000,
          },
        }
        vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(mockData), { status: 200 }))

        const res = await fetchMonitoring()
        expect(res.ok).toBe(true)
        if (res.ok) {
          expect(res.data.platformStatus?.maintenances).toEqual(mockData.platformStatus.maintenances)
        }
      })

      it('a malformed window entry fails closed as contract-drift (no silent drop)', async () => {
        const mockData = {
          repos: [],
          staleBanner: false,
          driftCount: 0,
          enumerationIncomplete: null,
          refreshedAt: 1742000000000,
          platformStatus: {
            overall: 'none',
            overallDescription: '',
            actions: 'operational',
            maintenances: [{name: 'bad window', status: 'whenever', scheduledFor: 'x', scheduledUntil: 'y'}],
            fetchedAt: 1742000001000,
          },
        }
        vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(mockData), { status: 200 }))

        const res = await fetchMonitoring()
        expect(res).toEqual({ ok: false, reason: 'contract-drift' })
      })

      it('a non-array maintenances value is contract-drift', async () => {
        const mockData = {
          repos: [],
          staleBanner: false,
          driftCount: 0,
          enumerationIncomplete: null,
          refreshedAt: 1742000000000,
          platformStatus: {
            overall: 'none',
            overallDescription: '',
            actions: 'operational',
            maintenances: {name: 'not a list'},
            fetchedAt: 1742000001000,
          },
        }
        vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(mockData), { status: 200 }))

        const res = await fetchMonitoring()
        expect(res).toEqual({ ok: false, reason: 'contract-drift' })
      })
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
  })
})
