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

    // rm-781 U2 (detailsUrl https-only boundary): the server extraction seam
    // (src/github/aggregator.ts) guarantees detailsUrl is https-or-'' because
    // the value feeds an href sink in Monitoring.tsx. These field-contract
    // tests mirror that guarantee client-side: https and '' parse through;
    // anything else means the server contract drifted and the fetch fails
    // closed — never an unvalidated href.
    const payloadWithDetails = (details: readonly {checkName: string; detailsUrl: string}[]) => ({
      repos: [{
        full_name: 'org/repo',
        discovery_channel: 'collab',
        status: {
          rollupState: 'red',
          failingChecks: details.length,
          failingCheckDetails: details.map(d => ({workflowTitle: null, runAttempt: null, checkName: d.checkName, detailsUrl: d.detailsUrl})),
          openPrCount: 0,
          openIssueCount: 0,
          openAlertCount: null,
          stale: false,
        },
      }],
      refreshDurationMs: 1234,
      refreshDegraded: false,
      staleBanner: false,
      driftCount: 0,
      enumerationIncomplete: null,
      refreshedAt: null,
    })

    it('rm-781 U2: an https detailsUrl survives the parse with the drill-down link intact', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(payloadWithDetails([
        {checkName: 'build', detailsUrl: 'https://github.com/org/repo/actions/runs/1'},
      ])), { status: 200 }))
      const res = await fetchMonitoring()
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.data.repos[0]?.status.failingCheckDetails).toEqual([
          {workflowTitle: null, runAttempt: null, checkName: 'build', detailsUrl: 'https://github.com/org/repo/actions/runs/1'},
        ])
      }
    })

    it("rm-781 U2: the empty string is legal (the server collapses non-https to '') and parses through", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(payloadWithDetails([
        {checkName: 'legacy-status', detailsUrl: ''},
      ])), { status: 200 }))
      const res = await fetchMonitoring()
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.data.repos[0]?.status.failingCheckDetails).toEqual([
          {workflowTitle: null, runAttempt: null, checkName: 'legacy-status', detailsUrl: ''},
        ])
      }
    })

    it.each([
      ['an http URL', 'http://github.com/org/repo/actions/runs/1'],
      ['a javascript: URL', 'javascript:alert(1)'],
      ['about:blank', 'about:blank'],
      ['a scheme-relative URL', '//github.com/org/repo/actions/runs/1'],
    ])('rm-781 U2: %s in detailsUrl → contract-drift (fail closed, never an unvalidated href)', async (_label, detailsUrl) => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(payloadWithDetails([
        {checkName: 'build', detailsUrl},
      ])), { status: 200 }))
      const res = await fetchMonitoring()
      expect(res).toEqual({ ok: false, reason: 'contract-drift' })
    })
  })
})
