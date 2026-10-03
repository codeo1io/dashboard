import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchSecurity } from './security.ts'

/**
 * rm-117: pins the /api/security fetcher contract the view relies on —
 * 401 => 'unauthenticated' (sign-in affordance, not a retry), malformed
 * payloads fail closed as contract-drift, and the posture null-markers
 * (permission degradation) survive parsing.
 */
describe('security API', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function makeAlert(): Record<string, unknown> {
    return {
      state: 'FIXED',
      createdAt: '2026-09-01T00:00:00Z',
      fixedAt: '2026-10-02T21:06:00Z',
      dismissedAt: null,
      autoDismissedAt: null,
      dismissReason: null,
      dependencyScope: 'RUNTIME',
      manifestPath: 'package.json',
      firstPatchedVersion: '1.2.3',
      vulnerableVersionRange: '< 1.2.3',
      updatePrState: 'MERGED',
      updatePrUrl: 'https://github.com/fro-bot/agent/pull/7',
      severity: 'HIGH',
      classification: 'GENERAL',
      withdrawnAt: null,
      ghsaId: 'GHSA-xxxx-yyyy-zzzz',
      cveId: 'CVE-2026-1234',
      cvssV3Score: 8.1,
      cvssV3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
      cvssV4Score: null,
      cvssV4Vector: null,
      epssPercentage: 0.61,
      epssPercentile: 0.95,
      cwes: ['CWE-79'],
      identifiers: [
        { type: 'GHSA', value: 'GHSA-xxxx-yyyy-zzzz' },
        { type: 'CVE', value: 'CVE-2026-1234' }
      ]
    }
  }

  // Wire-shape fixture (the /api/security JSON body), NOT the parsed client
  // type — kept structurally loose so wire names (full_name) type-check.
  function makeData(): Record<string, unknown> {
    return {
      repos: [
        {
          full_name: 'fro-bot/agent',
          stale: false,
          openAlertCount: 0,
          posture: {
            openAlerts: [] as unknown[],
            recentCures: [] as unknown[],
            recentCureCount: 1,
            curesFetchedAt: 1742000000000
          }
        }
      ],
      staleBanner: false,
      refreshedAt: 1742000000000
    }
  }

  describe('fetchSecurity', () => {
    it('returns parsed data on success (full alert projection round-trips)', async () => {
      const data = makeData()
      ;(data.repos as Record<string, unknown>[])[0]!.posture = {openAlerts: [], recentCures: [makeAlert()], recentCureCount: 1, curesFetchedAt: 1742000000000}
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(data), { status: 200 }))

      const res = await fetchSecurity()
      expect(res.ok).toBe(true)
      if (res.ok) {
        const alert = res.data.repos[0]?.posture?.recentCures[0]
        expect(alert?.severity).toBe('HIGH')
        expect(alert?.cvssV3Score).toBe(8.1)
        expect(alert?.cwes).toEqual(['CWE-79'])
        expect(alert?.updatePrState).toBe('MERGED')
      }
    })

    it('parses a permission-degraded repo as posture:null (the degraded notice has a signal)', async () => {
      const data = makeData()
      ;(data.repos as Record<string, unknown>[])[0] = { full_name: 'fro-bot/agent', stale: false, openAlertCount: null, posture: null }
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(data), { status: 200 }))
      const res = await fetchSecurity()
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.data.repos[0]?.posture).toBeNull()
        expect(res.data.repos[0]?.openAlertCount).toBeNull()
      }
    })

    it('rm-273: 401 maps to unauthenticated, not network', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('unauthorized', { status: 401 }))
      const res = await fetchSecurity()
      expect(res).toEqual({ ok: false, reason: 'unauthenticated' })
    })

    it('maps non-401 non-ok status to network', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('error', { status: 500 }))
      const res = await fetchSecurity()
      expect(res).toEqual({ ok: false, reason: 'network' })
    })

    it('maps a transport rejection to network', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new TypeError('fetch failed'))
      const res = await fetchSecurity()
      expect(res).toEqual({ ok: false, reason: 'network' })
    })

    it('maps an AbortError to timeout', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new DOMException('The operation was aborted.', 'AbortError'))
      const res = await fetchSecurity()
      expect(res).toEqual({ ok: false, reason: 'timeout' })
    })

    it('fails closed on a malformed top-level payload as contract-drift', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ bad: 'shape' }), { status: 200 }))
      const res = await fetchSecurity()
      expect(res).toEqual({ ok: false, reason: 'contract-drift' })
    })

    it('fails closed on a malformed alert field as contract-drift (never a silently-null column)', async () => {
      const data = makeData()
      const badAlert = makeAlert()
      badAlert.severity = 42 // number where a string|null belongs
      ;(data.repos as Record<string, unknown>[])[0]!.posture = {openAlerts: [], recentCures: [badAlert], recentCureCount: 1, curesFetchedAt: 1742000000000}
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(data), { status: 200 }))
      const res = await fetchSecurity()
      expect(res).toEqual({ ok: false, reason: 'contract-drift' })
    })

    it('fails closed when cwes is not an array of strings', async () => {
      const data = makeData()
      const badAlert = makeAlert()
      badAlert.cwes = ['CWE-79', 22]
      ;(data.repos as Record<string, unknown>[])[0]!.posture = {openAlerts: [], recentCures: [badAlert], recentCureCount: 1, curesFetchedAt: 1742000000000}
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(data), { status: 200 }))
      const res = await fetchSecurity()
      expect(res).toEqual({ ok: false, reason: 'contract-drift' })
    })

    it('fails closed when the posture object shape is malformed', async () => {
      const data = makeData() as unknown as Record<string, unknown>
      const repos = data.repos as { posture: Record<string, unknown> }[]
      repos[0]!.posture = { openAlerts: 'nope', recentCures: [], recentCureCount: 1, curesFetchedAt: 1 }
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(data), { status: 200 }))
      const res = await fetchSecurity()
      expect(res).toEqual({ ok: false, reason: 'contract-drift' })
    })
  })
})
