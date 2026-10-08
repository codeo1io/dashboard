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

  // rm-751: enumeration-truth last mile — the whole contract pipeline already
  // publishes+parses enumerationIncomplete/driftCount; these tests pin the
  // render consumer. Written red-first against the view that ignored both.
  describe('rm-751 enumeration-truth rendering', () => {
    it('cues the enumeration gap on a fresh-but-partial snapshot and qualifies the all-clear claim', async () => {
      vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
        ok: true,
        data: makeData({
          repos: [
            makeRepo({fullName: 'fro-bot/agent', status: {rollupState: 'green', failingChecks: 0, failingCheckDetails: []}})
          ],
          enumerationIncomplete: 3,
          staleBanner: false
        })
      })

      render(<Monitoring />)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10)
      })

      // The cue is its own affordance, separate from the stale banner.
      const cue = screen.getByTestId('monitoring-enumeration-gap')
      expect(cue).toHaveTextContent('3')
      expect(cue).toHaveTextContent(/not enumerated/)
      expect(cue).toHaveTextContent(/incomplete/i)
      expect(screen.queryByTestId('monitoring-stale-banner')).not.toBeInTheDocument()

      // The all-clear block never claims completeness while enumeration is incomplete.
      const allClear = screen.getByTestId('monitoring-all-clear')
      expect(allClear).toHaveTextContent('All enumerated repositories green')
      expect(allClear).not.toHaveTextContent('All repositories green')
    })

    it('renders the driftCount footer when installation-only repos exist (rm-126 decision: footer fold)', async () => {
      vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
        ok: true,
        data: makeData({driftCount: 2, enumerationIncomplete: 0})
      })

      render(<Monitoring />)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10)
      })

      const drift = screen.getByTestId('monitoring-drift-count')
      expect(drift).toHaveTextContent('2')
      // driftCount is provenance, not incompleteness — no enumeration cue for it.
      expect(screen.queryByTestId('monitoring-enumeration-gap')).not.toBeInTheDocument()
    })

    it('keeps the complete-snapshot rendering uncued and unqualified (null and 0 enumerationIncomplete)', async () => {
      for (const enumerationIncomplete of [null, 0] as const) {
        vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
          ok: true,
          data: makeData({enumerationIncomplete})
        })

        const {unmount} = render(<Monitoring />)
        await act(async () => {
          await vi.advanceTimersByTimeAsync(10)
        })

        expect(screen.queryByTestId('monitoring-enumeration-gap')).not.toBeInTheDocument()
        expect(screen.getByTestId('monitoring-all-clear')).toHaveTextContent('All repositories green')
        expect(screen.queryByTestId('monitoring-drift-count')).not.toBeInTheDocument()
        unmount()
      }
    })

    it('shows the enumeration cue alongside red repos too (board-level truth, not all-clear-only)', async () => {
      vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
        ok: true,
        data: makeData({repos: [makeRepo()], enumerationIncomplete: 1, staleBanner: false})
      })

      render(<Monitoring />)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10)
      })

      expect(screen.getByTestId('monitoring-red-repo')).toBeInTheDocument()
      expect(screen.getByTestId('monitoring-enumeration-gap')).toHaveTextContent('1 installation not enumerated')
    })
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
