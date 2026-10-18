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

    it('rm-1516/rm-1517: parses present security + lifecycle status fields', async () => {
      const mockData = {
        repos: [{
          full_name: 'fro-bot/agent',
          discovery_channel: 'installation',
          status: {
            rollupState: 'red',
            failingChecks: 1,
            failingCheckDetails: [],
            openPrCount: 0,
            openIssueCount: 0,
            openAlertCount: 2,
            openCodeScanningCount: 3,
            pushedAt: '2026-10-17T00:00:00.000Z',
            isArchived: false,
            stale: false,
          },
        }],
        staleBanner: false,
        driftCount: 0,
        enumerationIncomplete: null,
        refreshedAt: 1742000000000,
      }
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(mockData), { status: 200 }))

      const res = await fetchMonitoring()
      expect(res.ok).toBe(true)
      if (res.ok) {
        const status = res.data.repos[0]?.status
        expect(status?.openAlertCount).toBe(2)
        expect(status?.openCodeScanningCount).toBe(3)
        expect(status?.pushedAt).toBe('2026-10-17T00:00:00.000Z')
        expect(status?.isArchived).toBe(false)
      }
    })

    it('rm-1516/rm-1517: absent status fields degrade to null (older server), not contract-drift', async () => {
      const mockData = {
        repos: [{
          full_name: 'fro-bot/agent',
          discovery_channel: 'installation',
          status: {
            rollupState: 'green',
            failingChecks: 0,
            failingCheckDetails: [],
            openPrCount: 0,
            openIssueCount: 0,
            openAlertCount: null,
            stale: false,
          },
        }],
        staleBanner: false,
        driftCount: 0,
        enumerationIncomplete: null,
        refreshedAt: null,
      }
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(mockData), { status: 200 }))

      const res = await fetchMonitoring()
      expect(res.ok).toBe(true)
      if (res.ok) {
        const status = res.data.repos[0]?.status
        expect(status?.openCodeScanningCount).toBeNull()
        expect(status?.pushedAt).toBeNull()
        expect(status?.isArchived).toBeNull()
      }
    })

    it('rm-1516: a malformed security field fails closed as contract-drift (never a wrong value)', async () => {
      const mockData = {
        repos: [{
          full_name: 'fro-bot/agent',
          discovery_channel: 'installation',
          status: {
            rollupState: 'green',
            failingChecks: 0,
            failingCheckDetails: [],
            openPrCount: 0,
            openIssueCount: 0,
            openAlertCount: null,
            openCodeScanningCount: 'many',
            stale: false,
          },
        }],
        staleBanner: false,
        driftCount: 0,
        enumerationIncomplete: null,
        refreshedAt: null,
      }
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(mockData), { status: 200 }))

      const res = await fetchMonitoring()
      expect(res).toEqual({ ok: false, reason: 'contract-drift' })
    })
  })
})
