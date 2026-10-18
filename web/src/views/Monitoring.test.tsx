import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { Monitoring, MONITORING_FETCH_TIMEOUT_MS } from './Monitoring.tsx'
import * as monitoringApi from '../api/monitoring.ts'
import type { MonitoringData, MonitoringRepo, MonitoringRepoStatus } from '../api/monitoring.ts'

vi.mock('../api/monitoring.ts')

function makeRepo(
  overrides: { fullName?: string; discoveryChannel?: string; status?: Partial<MonitoringRepoStatus> } = {}
): MonitoringRepo {
  return {
    // rm-1967/rm-1968 tests: honor the fullName/discoveryChannel overrides the
    // signature already declared (the body previously hardcoded both).
    fullName: overrides.fullName ?? 'fro-bot/agent',
    discoveryChannel: overrides.discoveryChannel ?? 'installation',
    status: {
      rollupState: 'red',
      failingChecks: 1,
      failingCheckDetails: [
        {
          workflowTitle: 'CI · main',
          runAttempt: 2,
          checkName: 'build',
          detailsUrl: 'https://github.com/fro-bot/agent/actions/runs/42'
        }
      ],
      openPrCount: 0,
      openIssueCount: 0,
      openAlertCount: null,
      // rm-1968: lifecycle defaults — hidden + active; new tests override to
      // exercise the dormancy render and archived muting.
      pushedAt: null,
      isArchived: false,
      stale: false,
      ...overrides.status
    }
  }
}

function makeData(overrides: Partial<MonitoringData> = {}): MonitoringData {
  return {
    repos: [],
    staleBanner: false,
    driftCount: 0,
    enumerationIncomplete: null,
    // rm-1968: repos excluded from the per-repo query loop this cycle
    // because archived (0 = none / legacy payload).
    archivedExcludedCount: 0,
    refreshedAt: 1742000000000,
    platformStatus: null,
    ...overrides
  }
}

describe('Monitoring (rm-192 red-repo drill-down)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValue({
      ok: true,
      data: makeData()
    })
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders loading state initially', () => {
    vi.mocked(monitoringApi.fetchMonitoring).mockReturnValueOnce(
      new Promise(() => {}) as ReturnType<typeof monitoringApi.fetchMonitoring>
    )
    render(<Monitoring />)
    expect(screen.getByTestId('monitoring-loading')).toBeInTheDocument()
  })

  it('renders the all-clear board when no repo is failing', async () => {
    vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
      ok: true,
      data: makeData({
        repos: [
          makeRepo({fullName: 'fro-bot/agent', status: {rollupState: 'green', failingChecks: 0, failingCheckDetails: []}})
        ]
      })
    })

    render(<Monitoring />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(screen.getByTestId('monitoring-board')).toBeInTheDocument()
    expect(screen.getByTestId('monitoring-all-clear')).toBeInTheDocument()
    expect(screen.queryByTestId('monitoring-red-repo')).not.toBeInTheDocument()
    expect(screen.getByText('1 tracked repository', {exact: false})).toBeInTheDocument()
  })

  it('renders a red repo with check name link, workflow title, and run attempt', async () => {
    vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
      ok: true,
      data: makeData({repos: [makeRepo()]})
    })

    render(<Monitoring />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(screen.getByTestId('monitoring-red-repo')).toBeInTheDocument()
    const link = screen.getByRole('link', {name: 'build ↗'})
    expect(link).toHaveAttribute('href', 'https://github.com/fro-bot/agent/actions/runs/42')
    expect(screen.getByText(/CI · main \(attempt 2\)/)).toBeInTheDocument()
    expect(screen.getByText('1 failing check')).toBeInTheDocument()
    // RedRepoCard markup is pinned — the drill-down contract for rm-192.
    expect(screen.getByTestId('monitoring-check-details').innerHTML).toMatchInlineSnapshot(
      `"<li><a href="https://github.com/fro-bot/agent/actions/runs/42" target="_blank" rel="noopener noreferrer" class="listener-link">build ↗</a><span style="color: var(--color-text-muted);"> · CI · main (attempt 2)</span></li>"`
    )
  })

  it('renders the count-only fallback when details are unavailable', async () => {
    vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
      ok: true,
      data: makeData({
        repos: [makeRepo({status: {failingChecks: 3, failingCheckDetails: []}})]
      })
    })

    render(<Monitoring />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(screen.getByTestId('monitoring-count-only')).toHaveTextContent(
      '3 failed check runs — run titles unavailable (count-only view).'
    )
    expect(screen.queryByTestId('monitoring-check-details')).not.toBeInTheDocument()
  })

  it('renders the capped-details line when failingChecks exceeds the 25-item drill-down', async () => {
    const details = Array.from({length: 25}, (_, i) => ({
      workflowTitle: 'CI',
      runAttempt: 1,
      checkName: `check-${i}`,
      detailsUrl: ''
    }))
    vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
      ok: true,
      data: makeData({
        repos: [makeRepo({status: {failingChecks: 30, failingCheckDetails: details}})]
      })
    })

    render(<Monitoring />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(screen.getByTestId('monitoring-details-capped')).toHaveTextContent('+5 more (drill-down capped)')
    expect(screen.getAllByRole('listitem')).toHaveLength(26) // 25 details + capped line
  })

  it('renders the stale banner when the snapshot is stale', async () => {
    vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
      ok: true,
      data: makeData({staleBanner: true})
    })

    render(<Monitoring />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(screen.getByTestId('monitoring-stale-banner')).toHaveTextContent('Data is stale')
  })

  // rm-1447: the platform banner makes an Actions outage VISIBLE on the fleet
  // view — "cannot register" and "passing" look identical in the rollups, so
  // the platform's own verdict rides the DTO as an annotation.
  describe('rm-1447 platform banner', () => {
    it('renders when the Actions component is degraded, with the operator-facing consequence', async () => {
      vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
        ok: true,
        data: makeData({platformStatus: {
          overall: 'minor',
          overallDescription: 'Investigating Actions run creation delays',
          actions: 'major_outage',
          fetchedAt: 1742000000000,
        }})
      })

      render(<Monitoring />)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10)
      })

      const banner = screen.getByTestId('monitoring-platform-banner')
      expect(banner).toBeInTheDocument()
      expect(banner).toHaveTextContent('major outage')
      expect(banner).toHaveTextContent('failing to register')
      expect(banner).toHaveTextContent('Investigating Actions run creation delays')
      expect(banner).toHaveAttribute('role', 'status')
      // Distinct from the stale-data banner (annotation, not degradation).
      expect(screen.queryByTestId('monitoring-stale-banner')).not.toBeInTheDocument()
    })

    it('falls back to the overall incident when the Actions component itself is unreadable', async () => {
      vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
        ok: true,
        data: makeData({platformStatus: {
          overall: 'critical',
          overallDescription: '',
          actions: null,
          fetchedAt: 1742000000000,
        }})
      })

      render(<Monitoring />)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10)
      })

      expect(screen.getByTestId('monitoring-platform-banner')).toHaveTextContent('critical platform incident')
    })

    it('does not render when the platform reports Actions operational', async () => {
      vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
        ok: true,
        data: makeData({platformStatus: {
          overall: 'none',
          overallDescription: 'All Systems Operational',
          actions: 'operational',
          fetchedAt: 1742000000000,
        }})
      })

      render(<Monitoring />)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10)
      })

      expect(screen.queryByTestId('monitoring-platform-banner')).not.toBeInTheDocument()
      expect(screen.getByTestId('monitoring-board')).toBeInTheDocument()
    })

    it('does not render when the annotation is absent (fail-open absence is silence, not an error)', async () => {
      vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
        ok: true,
        data: makeData()
      })

      render(<Monitoring />)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10)
      })

      expect(screen.queryByTestId('monitoring-platform-banner')).not.toBeInTheDocument()
      expect(screen.getByTestId('monitoring-board')).toBeInTheDocument()
    })

    it('coexists with the stale banner when both conditions hold', async () => {
      vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
        ok: true,
        data: makeData({
          staleBanner: true,
          platformStatus: {
            overall: 'minor',
            overallDescription: '',
            actions: 'partial_outage',
            fetchedAt: 1742000000000,
          },
        })
      })

      render(<Monitoring />)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10)
      })

      expect(screen.getByTestId('monitoring-platform-banner')).toBeInTheDocument()
      expect(screen.getByTestId('monitoring-stale-banner')).toBeInTheDocument()
    })
  })

  it('renders the error state on contract drift', async () => {
    vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
      ok: false,
      reason: 'contract-drift'
    })

    render(<Monitoring />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(screen.getByTestId('monitoring-error')).toBeInTheDocument()
    expect(screen.getByText(/contract-drift/)).toBeInTheDocument()
  })

  it('rm-273: renders the auth-expired affordance on 401 instead of the network error', async () => {
    vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
      ok: false,
      reason: 'unauthenticated'
    })

    render(<Monitoring />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(screen.getByTestId('monitoring-auth-expired')).toBeInTheDocument()
    expect(screen.getByText(/Session expired/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/auth/login')
    // The network-error retry copy must NOT be shown for session expiry.
    expect(screen.queryByTestId('monitoring-error')).not.toBeInTheDocument()
  })

  // rm-251 regressions: the pre-hook inline poll wedged permanently on one
  // hung response (no timeout race, no abort, latch released only on the
  // settled path). The shared useBoundedPoll hook restores the rm-155 shape.
  describe('rm-251 poll hygiene', () => {
    it('releases the poll latch when a fetch hangs past the timeout, then polls again', async () => {
      vi.mocked(monitoringApi.fetchMonitoring).mockImplementation(
        () => new Promise(() => {}) as ReturnType<typeof monitoringApi.fetchMonitoring>
      )
      vi.mocked(monitoringApi.fetchMonitoring).mockClear()

      const { unmount } = render(<Monitoring />)

      // Initial poll starts and hangs.
      await act(async () => { await vi.advanceTimersByTimeAsync(10) })
      expect(vi.mocked(monitoringApi.fetchMonitoring).mock.calls.length).toBe(1)

      // Timeout fires: the race settles with the timeout result, the latch is
      // released, and the error view appears ("Will retry").
      await act(async () => { await vi.advanceTimersByTimeAsync(MONITORING_FETCH_TIMEOUT_MS) })
      expect(screen.getByTestId('monitoring-error')).toBeInTheDocument()

      // No fetch retry before the next interval tick.
      vi.mocked(monitoringApi.fetchMonitoring).mockClear()
      expect(vi.mocked(monitoringApi.fetchMonitoring).mock.calls.length).toBe(0)

      // Next 60s interval tick: the latch is free, so the poll fires again.
      await act(async () => { await vi.advanceTimersByTimeAsync(60000) })
      expect(vi.mocked(monitoringApi.fetchMonitoring).mock.calls.length).toBe(1)

      unmount()
    })

    it('aborts the in-flight fetch when the view unmounts', async () => {
      let capturedSignal: AbortSignal | undefined
      vi.mocked(monitoringApi.fetchMonitoring).mockImplementation((req) => {
        capturedSignal = req?.abortSignal
        return new Promise(() => {}) as ReturnType<typeof monitoringApi.fetchMonitoring>
      })

      const { unmount } = render(<Monitoring />)
      await act(async () => { await vi.advanceTimersByTimeAsync(10) })
      expect(capturedSignal).toBeDefined()
      expect(capturedSignal!.aborted).toBe(false)

      unmount()
      expect(capturedSignal!.aborted).toBe(true)
    })
  })
})

// ---------------------------------------------------------------------------
// rm-1967 (openAlertCount render) + rm-1968 (archived muting, dormancy line)
// ---------------------------------------------------------------------------

describe('Monitoring — rm-1967/rm-1968 lifecycle render', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('rm-1967: renders the Dependabot alert count for a repo with open alerts', async () => {
    vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
      ok: true,
      data: makeData({
        repos: [
          makeRepo({
            fullName: 'fro-bot/vulnerable',
            status: {rollupState: 'red', failingChecks: 2, failingCheckDetails: [], openAlertCount: 7},
          }),
        ],
      }),
    })

    render(<Monitoring />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    const chip = screen.getByTestId('repo-alert-count')
    expect(chip).toBeInTheDocument()
    expect(chip).toHaveTextContent('7 Dependabot alerts')
    expect(chip.getAttribute('aria-label')).toBe('Open Dependabot alerts: 7')
  })

  it('rm-1967: singularizes one alert and renders nothing for zero (never a fake zero)', async () => {
    vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
      ok: true,
      data: makeData({
        repos: [
          makeRepo({
            fullName: 'fro-bot/one-alert',
            status: {rollupState: 'red', failingChecks: 1, failingCheckDetails: [], openAlertCount: 1},
          }),
          makeRepo({
            fullName: 'fro-bot/clean',
            status: {rollupState: 'green', failingChecks: 0, failingCheckDetails: [], openAlertCount: 0},
          }),
        ],
      }),
    })

    render(<Monitoring />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(screen.getByTestId('repo-alert-count')).toHaveTextContent('1 Dependabot alert')
    // The clean repo has a KNOWN zero — no chip (zero is the absence of signal).
    expect(screen.queryAllByTestId('repo-alert-count')).toHaveLength(1)
  })

  it('rm-1967: renders nothing when openAlertCount is null (security_events grant absent)', async () => {
    vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
      ok: true,
      data: makeData({
        repos: [
          makeRepo({
            fullName: 'fro-bot/no-grant',
            status: {rollupState: 'red', failingChecks: 1, failingCheckDetails: [], openAlertCount: null},
          }),
        ],
      }),
    })

    render(<Monitoring />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(screen.queryByTestId('repo-alert-count')).not.toBeInTheDocument()
  })

  it('rm-1968: mutes an archived repo out of the red list and into the archived section', async () => {
    vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
      ok: true,
      data: makeData({
        repos: [
          makeRepo({
            fullName: 'fro-bot/legacy',
            status: {rollupState: 'red', failingChecks: 5, failingCheckDetails: [], isArchived: true, pushedAt: '2024-03-01T00:00:00.000Z'},
          }),
          makeRepo({
            fullName: 'fro-bot/active-red',
            status: {rollupState: 'red', failingChecks: 1, failingCheckDetails: []},
          }),
        ],
      }),
    })

    render(<Monitoring />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    // The archived repo keeps its frozen red facts at GitHub forever — it must
    // NOT be red-carded here. (Scoped to the red card: the repo name DOES
    // appear document-wide, in the muted archived section below.)
    const redCards = screen.queryAllByTestId('monitoring-red-repo')
    expect(redCards).toHaveLength(1)
    expect(redCards[0]).toHaveTextContent('fro-bot/active-red')
    expect(redCards[0]).not.toHaveTextContent('fro-bot/legacy')
    // It lives in the muted archived section instead.
    expect(screen.getByTestId('monitoring-archived')).toBeInTheDocument()
    expect(screen.getAllByTestId('monitoring-archived-repo')).toHaveLength(1)
    expect(screen.getAllByTestId('monitoring-archived-repo')[0]).toHaveTextContent('fro-bot/legacy')
    // The archived exclusion is observable in the footer.
    expect(screen.getByTestId('monitoring-archived-count')).toHaveTextContent('1 archived')
  })

  it('rm-1968: renders the last-push dormancy line when pushedAt is known, nothing when null', async () => {
    vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
      ok: true,
      data: makeData({
        repos: [
          makeRepo({
            fullName: 'fro-bot/dormant',
            status: {rollupState: 'red', failingChecks: 1, failingCheckDetails: [], pushedAt: '2026-10-01T00:00:00.000Z'},
          }),
          makeRepo({
            fullName: 'fro-bot/unknown-push',
            status: {rollupState: 'red', failingChecks: 1, failingCheckDetails: [], pushedAt: null},
          }),
        ],
      }),
    })

    render(<Monitoring />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    const lines = screen.getAllByTestId('repo-pushed-at')
    expect(lines).toHaveLength(1)
    expect(lines[0]).toHaveTextContent(/Last push/)
    // No archived section when nothing is archived.
    expect(screen.queryByTestId('monitoring-archived')).not.toBeInTheDocument()
  })
})
