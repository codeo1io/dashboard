import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { Security, SECURITY_FETCH_TIMEOUT_MS } from './Security.tsx'
import * as securityApi from '../api/security.ts'
import type { SecurityAlert, SecurityData, SecurityRepo } from '../api/security.ts'

vi.mock('../api/security.ts')

/**
 * rm-117: pins the security-posture view — the cured-alert story must be
 * VISIBLE (fleet today: 0 open alerts, 47 lifetime cures). The zero-open
 * state renders an all-clear + the cures ledger, not a bare counter.
 */
function makeAlert(overrides: Partial<SecurityAlert> = {}): SecurityAlert {
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
    ],
    ...overrides
  }
}

function makeRepo(overrides: { fullName?: string; openAlertCount?: number | null; posture?: SecurityRepo['posture'] } = {}): SecurityRepo {
  return {
    fullName: overrides.fullName ?? 'codeo1io/dashboard',
    stale: false,
    openAlertCount: overrides.openAlertCount ?? (overrides.posture === null ? null : 0),
    posture:
      overrides.posture !== undefined
        ? overrides.posture
        : {
            openAlerts: [],
            recentCures: [],
            recentCureCount: 0,
            curesFetchedAt: 1742000000000
          }
  }
}

function makeData(overrides: Partial<SecurityData> = {}): SecurityData {
  return {
    repos: [],
    staleBanner: false,
    refreshedAt: 1742000000000,
    ...overrides
  }
}

describe('Security (rm-117 security-posture view)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(securityApi.fetchSecurity).mockResolvedValue({
      ok: true,
      data: makeData()
    })
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('exports the rm-251 bounded timeout ceiling', () => {
    expect(SECURITY_FETCH_TIMEOUT_MS).toBe(15000)
  })

  it('renders loading state initially', () => {
    vi.mocked(securityApi.fetchSecurity).mockReturnValueOnce(
      new Promise(() => {}) as ReturnType<typeof securityApi.fetchSecurity>
    )
    render(<Security />)
    expect(screen.getByTestId('security-loading')).toBeInTheDocument()
  })

  it('renders the zero-open story: all-clear + the cured ledger, not a bare counter', async () => {
    vi.mocked(securityApi.fetchSecurity).mockResolvedValue({
      ok: true,
      data: makeData({
        repos: [
          makeRepo({
            posture: {
              openAlerts: [],
              recentCures: [makeAlert()],
              recentCureCount: 47,
              curesFetchedAt: 1742000000000
            }
          })
        ]
      })
    })

    render(<Security />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(screen.getByTestId('security-board')).toBeInTheDocument()
    expect(screen.getByTestId('security-no-open')).toBeInTheDocument()
    expect(screen.getByText(/No open Dependabot alerts/i)).toBeInTheDocument()
    expect(screen.getByTestId('security-open-total')).toHaveTextContent('0')
    expect(screen.getByTestId('security-cured-total')).toHaveTextContent('47')
    expect(screen.getByTestId('security-cure-row')).toBeInTheDocument()
    expect(screen.getByText('cured 2026-10-02')).toBeInTheDocument()
  })

  it('renders the advisory link, cure PR, version window, and CWEs on a cure row', async () => {
    vi.mocked(securityApi.fetchSecurity).mockResolvedValue({
      ok: true,
      data: makeData({
        repos: [
          makeRepo({
            posture: {
              openAlerts: [],
              recentCures: [makeAlert()],
              recentCureCount: 1,
              curesFetchedAt: 1742000000000
            }
          })
        ]
      })
    })

    render(<Security />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    const advisory = screen.getByRole('link', { name: 'GHSA-xxxx-yyyy-zzzz' })
    expect(advisory).toHaveAttribute('href', 'https://github.com/advisories/GHSA-xxxx-yyyy-zzzz')
    const curePr = screen.getByRole('link', { name: /cure PR/i })
    expect(curePr).toHaveAttribute('href', 'https://github.com/fro-bot/agent/pull/7')
    expect(screen.getByText('< 1.2.3 → 1.2.3')).toBeInTheDocument()
    expect(screen.getByText('CWE-79')).toBeInTheDocument()
  })

  it('renders open alerts as a severity histogram', async () => {
    vi.mocked(securityApi.fetchSecurity).mockResolvedValue({
      ok: true,
      data: makeData({
        repos: [
          makeRepo({
            openAlertCount: 3,
            posture: {
              openAlerts: [
                makeAlert({ state: 'OPEN', severity: 'CRITICAL', fixedAt: null, epssPercentage: 0.9, epssPercentile: 0.99 }),
                makeAlert({ state: 'OPEN', severity: 'HIGH', fixedAt: null, ghsaId: 'GHSA-second-second' }),
                makeAlert({ state: 'OPEN', severity: 'CRITICAL', fixedAt: null, ghsaId: 'GHSA-third-third', epssPercentage: 0.2 })
              ],
              recentCures: [],
              recentCureCount: 0,
              curesFetchedAt: 1742000000000
            }
          })
        ]
      })
    })

    render(<Security />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(screen.getByTestId('security-severity-histogram')).toBeInTheDocument()
    expect(screen.getByTestId('security-severity-CRITICAL')).toHaveTextContent('2')
    expect(screen.getByTestId('security-severity-HIGH')).toHaveTextContent('1')
    expect(screen.queryByTestId('security-no-open')).not.toBeInTheDocument()
    // EPSS top list: most exploitable first
    const rows = screen.getAllByTestId('security-epss-row')
    expect(rows.length).toBe(3)
    expect(rows[0]).toHaveTextContent('GHSA-xxxx-yyyy-zzzz')
  })

  it('renders the permission-degraded notice for posture:null repos (hidden, not guessed)', async () => {
    vi.mocked(securityApi.fetchSecurity).mockResolvedValue({
      ok: true,
      data: makeData({
        repos: [
          makeRepo({ fullName: 'fro-bot/agent', openAlertCount: null, posture: null }),
          makeRepo({ fullName: 'codeo1io/dashboard' })
        ]
      })
    })

    render(<Security />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    const degraded = screen.getByTestId('security-degraded')
    expect(degraded).toHaveTextContent('fro-bot/agent')
    expect(degraded).toHaveTextContent(/permission unavailable/i)
    expect(screen.getByTestId('security-degraded-count')).toBeInTheDocument()
  })

  it('rm-273: renders the sign-in affordance on session expiry', async () => {
    vi.mocked(securityApi.fetchSecurity).mockResolvedValue({ ok: false, reason: 'unauthenticated' })

    render(<Security />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(screen.getByTestId('security-auth-expired')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/auth/login')
  })

  it('renders the retryable error state for transport failures', async () => {
    vi.mocked(securityApi.fetchSecurity).mockResolvedValue({ ok: false, reason: 'network' })

    render(<Security />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(screen.getByTestId('security-error')).toBeInTheDocument()
    expect(screen.getByTestId('security-error')).toHaveTextContent(/failed to load/i)
  })

  it('shows the stale banner when the snapshot is stale (staleness must be visible)', async () => {
    vi.mocked(securityApi.fetchSecurity).mockResolvedValue({
      ok: true,
      data: makeData({ staleBanner: true, repos: [makeRepo()] })
    })

    render(<Security />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(screen.getByTestId('security-stale-banner')).toBeInTheDocument()
  })

  it('renders the no-cures-yet state without crashing (cold start before the first walk)', async () => {
    vi.mocked(securityApi.fetchSecurity).mockResolvedValue({
      ok: true,
      data: makeData({ repos: [makeRepo({ posture: { openAlerts: [], recentCures: [], recentCureCount: 0, curesFetchedAt: null } })] })
    })

    render(<Security />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(screen.getByTestId('security-no-cures')).toBeInTheDocument()
    expect(screen.queryByTestId('security-cure-repo')).not.toBeInTheDocument()
  })
})
