import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { Monitoring } from './Monitoring.tsx'
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
})

describe('Monitoring poll reliability (rm-251)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Sibling tests share the module mock; clear their call history so the
    // count assertions below see only this test's polls.
    vi.mocked(monitoringApi.fetchMonitoring).mockClear()
    vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValue({ok: true, data: makeData()})
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('releases the latch when a poll hangs and recovers on the next tick', async () => {
    // First poll never settles — the rm-251 wedge. The 15s wall-clock race
    // must fire, release isFetchingRef, and surface the timeout reason.
    vi.mocked(monitoringApi.fetchMonitoring)
      .mockImplementationOnce(() => new Promise<import('../api/monitoring.ts').FetchMonitoringResult>(() => {}))
      .mockResolvedValueOnce({ok: true, data: makeData()})

    render(<Monitoring />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_010)
    })

    expect(screen.getByTestId('monitoring-error')).toHaveTextContent('timeout')

    // The 60s interval tick must be able to fetch at all: with the pre-fix
    // latch still held, loadData would return early and the error would stay.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })

    expect(monitoringApi.fetchMonitoring).toHaveBeenCalledTimes(2)
    expect(screen.queryByTestId('monitoring-error')).toBeNull()
  })

  it('aborts the in-flight request when the view unmounts', async () => {
    const signals: AbortSignal[] = []
    vi.mocked(monitoringApi.fetchMonitoring).mockImplementation((options?: {abortSignal?: AbortSignal}) => {
      if (options?.abortSignal !== undefined) signals.push(options.abortSignal)
      return new Promise<import('../api/monitoring.ts').FetchMonitoringResult>(() => {})
    })

    const {unmount} = render(<Monitoring />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(firstSignalAborted(signals)).toBe(false)
    unmount()
    expect(firstSignalAborted(signals)).toBe(true)
  })
})

function firstSignalAborted(signals: AbortSignal[]): boolean {
  return signals[0]?.aborted === true
}
