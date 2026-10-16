import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { Monitoring, MONITORING_FETCH_TIMEOUT_MS } from './Monitoring.tsx'
import * as monitoringApi from '../api/monitoring.ts'
import type {MonitoringData, MonitoringRepo, MonitoringRepoStatus, PlatformStatusSummary} from '../api/monitoring.ts'

vi.mock('../api/monitoring.ts')

/** rm-1467 helper: a well-formed platform annotation (maintenance windows default empty). */
function makePlatform(overrides: Partial<PlatformStatusSummary> = {}): PlatformStatusSummary {
  return {
    overall: 'none',
    overallDescription: '',
    actions: 'operational',
    maintenances: [],
    fetchedAt: 1742000000000,
    ...overrides,
  }
}

function makeRepo(
  overrides: { fullName?: string; discoveryChannel?: string; status?: Partial<MonitoringRepoStatus> } = {}
): MonitoringRepo {
  return {
    fullName: 'fro-bot/agent',
    discoveryChannel: 'installation',
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
        data: makeData({platformStatus: makePlatform({
          overall: 'minor',
          overallDescription: 'Investigating Actions run creation delays',
          actions: 'major_outage',
        })})
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
        data: makeData({platformStatus: makePlatform({
          overall: 'critical',
          actions: null,
        })})
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
        data: makeData({platformStatus: makePlatform({
          overall: 'none',
          overallDescription: 'All Systems Operational',
        })})
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
          platformStatus: makePlatform({
            overall: 'minor',
            actions: 'partial_outage',
          }),
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

  // rm-1467: scheduled platform maintenance windows are operator-actionable
  // (they make rollup silence ambiguous exactly like a degradation can) — the
  // chip renders them on the fleet view, fail-open on the rm-1447 pattern
  // (absent annotation = silence, never an error).
  describe('rm-1467 maintenance chip', () => {
    const window1 = {
      name: 'Actions upgrade',
      status: 'scheduled' as const,
      scheduledFor: '2026-10-20T14:00:00Z',
      scheduledUntil: '2026-10-20T16:00:00Z',
    }

    it('renders a chip for a scheduled window with the window name and range', async () => {
      vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
        ok: true,
        data: makeData({platformStatus: makePlatform({maintenances: [window1]})})
      })

      render(<Monitoring />)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10)
      })

      const chip = screen.getByTestId('monitoring-maintenance-chip')
      expect(chip).toHaveAttribute('role', 'status')
      expect(chip).toHaveTextContent('Scheduled platform maintenance: Actions upgrade')
      expect(chip).not.toHaveTextContent('Underway')
      // A localized window range renders (locale-dependent, so assert the
      // en-US-ish separator only — deterministic presence, not exact text).
      expect(chip.textContent ?? '').toMatch(/·\s*\d/)
    })

    it('renders the Underway variant for an in-progress window', async () => {
      vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
        ok: true,
        data: makeData({platformStatus: makePlatform({maintenances: [{...window1, status: 'in_progress'}]})})
      })

      render(<Monitoring />)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10)
      })

      expect(screen.getByTestId('monitoring-maintenance-chip')).toHaveTextContent('Underway platform maintenance')
      expect(screen.getByTestId('monitoring-maintenance-chip')).not.toHaveTextContent('Scheduled')
    })

    it('renders every window in the (server-capped) list', async () => {
      const windows = [
        window1,
        {...window1, name: 'API migration', scheduledFor: '2026-10-22T00:00:00Z', scheduledUntil: '2026-10-22T02:00:00Z'},
      ]
      vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
        ok: true,
        data: makeData({platformStatus: makePlatform({maintenances: windows})})
      })

      render(<Monitoring />)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10)
      })

      const chip = screen.getByTestId('monitoring-maintenance-chip')
      expect(chip).toHaveTextContent('Actions upgrade')
      expect(chip).toHaveTextContent('API migration')
    })

    it('drops only the malformed span, not the window (name survives a bad timestamp)', async () => {
      vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
        ok: true,
        data: makeData({platformStatus: makePlatform({maintenances: [{...window1, scheduledFor: 'not-a-date', scheduledUntil: 'also-not'}]})})
      })

      render(<Monitoring />)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10)
      })

      const chip = screen.getByTestId('monitoring-maintenance-chip')
      expect(chip).toHaveTextContent('Scheduled platform maintenance: Actions upgrade')
      expect(chip.textContent ?? '').not.toMatch(/·/)
    })

    it('does not render when there are no windows (empty list is silence)', async () => {
      vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
        ok: true,
        data: makeData({platformStatus: makePlatform()})
      })

      render(<Monitoring />)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10)
      })

      expect(screen.queryByTestId('monitoring-maintenance-chip')).not.toBeInTheDocument()
      expect(screen.getByTestId('monitoring-board')).toBeInTheDocument()
    })

    it('does not render when the annotation is absent (fail-open on the rm-1447 pattern)', async () => {
      vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
        ok: true,
        data: makeData()
      })

      render(<Monitoring />)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10)
      })

      expect(screen.queryByTestId('monitoring-maintenance-chip')).not.toBeInTheDocument()
      expect(screen.getByTestId('monitoring-board')).toBeInTheDocument()
    })

    it('coexists with the degraded-actions banner when both hold', async () => {
      vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
        ok: true,
        data: makeData({platformStatus: makePlatform({
          actions: 'degraded_performance',
          maintenances: [window1],
        })})
      })

      render(<Monitoring />)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10)
      })

      expect(screen.getByTestId('monitoring-platform-banner')).toBeInTheDocument()
      expect(screen.getByTestId('monitoring-maintenance-chip')).toBeInTheDocument()
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
