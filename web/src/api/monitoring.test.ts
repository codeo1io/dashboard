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
        refreshDurationMs: 1234,
        refreshDegraded: false,
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

    it("rm-107: the rm-156 watchdog pair survives the DTO whitelist (refreshDurationMs null is legal, refreshDegraded passes through)", async () => {
      const mockData = {
        repos: [],
        refreshDurationMs: null,
        refreshDegraded: true,
        staleBanner: true,
        driftCount: 2,
        enumerationIncomplete: 1,
        refreshedAt: 1742000000000,
      }
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(mockData), { status: 200 }))

      const res = await fetchMonitoring()
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.data.refreshDurationMs).toBeNull()
        expect(res.data.refreshDegraded).toBe(true)
      }
    })

    it('rm-107: a payload missing the watchdog pair is contract-drift (the whitelist must not silently hide a degraded walk)', async () => {
      const mockData = {
        repos: [],
        staleBanner: false,
        driftCount: 0,
        enumerationIncomplete: null,
        refreshedAt: null,
      }
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(mockData), { status: 200 }))
      const res = await fetchMonitoring()
      expect(res).toEqual({ ok: false, reason: 'contract-drift' })
    })

    it.each([
      ['refreshDegraded is a string', {refreshDegraded: 'no'}],
      ['refreshDurationMs is a string', {refreshDurationMs: '1234'}],
    ])('rm-107: %s → contract-drift', async (_label, overrides) => {
      const mockData = {
        repos: [],
        refreshDurationMs: 1234,
        refreshDegraded: false,
        staleBanner: false,
        driftCount: 0,
        enumerationIncomplete: null,
        refreshedAt: null,
        ...overrides,
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

    describe('rm-790: malformed-JSON 2xx classification (drift, not network)', () => {
      it('a 200 whose body is not valid JSON → contract-drift', async () => {
        // An intercepting proxy or wrong-route handler answering 200 with an
        // HTML page: res.json() throws and the pre-rm-790 catch blamed the
        // network, routing a contract regression through the retry channel.
        vi.mocked(fetch).mockResolvedValueOnce(
          new Response('<html>interception page</html>', { status: 200, headers: { 'content-type': 'text/html' } }),
        )
        const res = await fetchMonitoring()
        expect(res).toEqual({ ok: false, reason: 'contract-drift' })
      })

      it('a 200 with a valid body still parses (classification regression guard)', async () => {
        const mockData = {
          repos: [],
          refreshDurationMs: 1234,
          refreshDegraded: false,
          staleBanner: false,
          driftCount: 0,
          enumerationIncomplete: null,
          refreshedAt: null,
        }
        vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(mockData), { status: 200 }))
        const res = await fetchMonitoring()
        expect(res.ok).toBe(true)
      })

      it('a client-side abort DURING the body read stays timeout, not drift', async () => {
        // The inner try/catch around res.json() rethrows the caller's
        // AbortError so the outer catch keeps its 'timeout' classification.
        const abortingBody = {
          ok: true,
          redirected: false,
          json: async () => {
            throw new DOMException('Aborted', 'AbortError')
          },
        } as unknown as Response
        vi.mocked(fetch).mockResolvedValueOnce(abortingBody)
        const res = await fetchMonitoring()
        expect(res).toEqual({ ok: false, reason: 'timeout' })
      })
    })

    it('rm-709: a non-https detailsUrl is contract drift (https://-only mirror of the listener link filter)', async () => {
      const mockData = {
        repos: [
          {
            full_name: 'org/repo-a',
            discovery_channel: 'installation',
            status: {
              rollupState: 'red',
              failingChecks: 1,
              failingCheckDetails: [
                { workflowTitle: null, runAttempt: 1, checkName: 'build', detailsUrl: 'javascript:alert(1)' },
              ],
              openPrCount: 0,
              openIssueCount: 0,
              openAlertCount: null,
              stale: false,
            },
          },
        ],
        // rm-107 watchdog pair: part of the server DTO whitelist since the
        // 6277460e U1 landing — the fixture must carry it so the drift below
        // is pinned to the detailsUrl contract, not to a missing field.
        refreshDurationMs: null,
        refreshDegraded: false,
        staleBanner: false,
        driftCount: 0,
        enumerationIncomplete: null,
        refreshedAt: null,
      }
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(mockData), { status: 200 }))

      const res = await fetchMonitoring()
      expect(res).toEqual({ ok: false, reason: 'contract-drift' })
    })

    it("rm-709: keeps the empty detailsUrl as the legal no-link value", async () => {
      const mockData = {
        repos: [
          {
            full_name: 'org/repo-a',
            discovery_channel: 'installation',
            status: {
              rollupState: 'red',
              failingChecks: 1,
              failingCheckDetails: [
                { workflowTitle: null, runAttempt: 1, checkName: 'build', detailsUrl: '' },
              ],
              openPrCount: 0,
              openIssueCount: 0,
              openAlertCount: null,
              stale: false,
            },
          },
        ],
        // rm-107 watchdog pair (see the non-https case above): without it the
        // strict whitelist classifies this legal payload as contract-drift.
        refreshDurationMs: null,
        refreshDegraded: false,
        staleBanner: false,
        driftCount: 0,
        enumerationIncomplete: null,
        refreshedAt: null,
      }
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(mockData), { status: 200 }))

      const res = await fetchMonitoring()
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.data.repos).toEqual([
          {
            fullName: 'org/repo-a',
            discoveryChannel: 'installation',
            status: {
              rollupState: 'red',
              failingChecks: 1,
              failingCheckDetails: [
                { workflowTitle: null, runAttempt: 1, checkName: 'build', detailsUrl: '' },
              ],
              openPrCount: 0,
              openIssueCount: 0,
              openAlertCount: null,
              stale: false,
            },
          },
        ])
      }
    })
  })
})
