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
              openCodeScanningAlerts: null,
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
              openCodeScanningAlerts: null,
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
              openCodeScanningAlerts: null,
              stale: false,
            },
          },
        ])
      }
    })

    it('rm-117: parses openCodeScanningAlerts (counts + buckets) and passes null through', async () => {
      const mockData = {
        repos: [
          {
            full_name: 'org/with-cs',
            discovery_channel: 'installation',
            status: {
              rollupState: 'green',
              failingChecks: 0,
              failingCheckDetails: [],
              openPrCount: 0,
              openIssueCount: 0,
              openAlertCount: 1,
              openCodeScanningAlerts: {
                openCount: 3,
                severity: {critical: 1, high: 1, medium: 0, low: 0, unrated: 1},
              },
              stale: false,
            },
          },
          {
            full_name: 'org/without-cs',
            discovery_channel: 'installation',
            status: {
              rollupState: 'green',
              failingChecks: 0,
              failingCheckDetails: [],
              openPrCount: 0,
              openIssueCount: 0,
              openAlertCount: null,
              openCodeScanningAlerts: null,
              stale: false,
            },
          },
        ],
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
        expect(res.data.repos[0]?.status.openCodeScanningAlerts).toEqual({
          openCount: 3,
          severity: {critical: 1, high: 1, medium: 0, low: 0, unrated: 1},
        })
        expect(res.data.repos[1]?.status.openCodeScanningAlerts).toBeNull()
      }
    })

    it('rm-117: a malformed code-scanning summary is contract-drift (strict parse fails closed)', async () => {
      const mockData = {
        repos: [
          {
            full_name: 'org/bad-cs',
            discovery_channel: 'installation',
            status: {
              rollupState: 'green',
              failingChecks: 0,
              failingCheckDetails: [],
              openPrCount: 0,
              openIssueCount: 0,
              openAlertCount: null,
              openCodeScanningAlerts: {openCount: 3, severity: {critical: 1}}, // missing buckets
              stale: false,
            },
          },
        ],
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

    it('rm-117: a missing openCodeScanningAlerts field is contract-drift (the server always emits it)', async () => {
      const mockData = {
        repos: [
          {
            full_name: 'org/missing-cs',
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
          },
        ],
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
  })
})
