import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { Monitoring, MONITORING_FETCH_TIMEOUT_MS } from './Monitoring.tsx'
import * as monitoringApi from '../api/monitoring.ts'
import type { MonitoringData, MonitoringRepo, MonitoringRepoStatus } from '../api/monitoring.ts'

vi.mock('../api/monitoring.ts')

// rm-836: the CI-freshness reference clock is makeData's refreshedAt — ages
// are computed against it, not wall-clock. Fixture default: a run 2h old
// (fresh); rm-836 scenarios override lastRunAt per case.
const DATA_AS_OF = 1742000000000
const FRESH_RUN_AT = DATA_AS_OF - 2 * 60 * 60 * 1000

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
      lastRunAt: FRESH_RUN_AT,
      ...overrides.status
    }
  }
}

function makeData(overrides: Partial<MonitoringData> = {}): MonitoringData {
  return {
    repos: [],
    refreshDurationMs: 1234,
    refreshDegraded: false,
    staleBanner: false,
    driftCount: 0,
    enumerationIncomplete: null,
    refreshedAt: DATA_AS_OF,
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

  it('rm-107: renders the refresh-degraded banner when the watchdog flags a slow walk, independent of staleness', async () => {
    vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
      ok: true,
      data: makeData({refreshDegraded: true, refreshDurationMs: 95000})
    })

    render(<Monitoring />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(screen.getByTestId('monitoring-board')).toBeInTheDocument()
    expect(screen.getByTestId('monitoring-refresh-degraded-banner')).toBeInTheDocument()
    // The measured walk duration surfaces in the banner (95,000 ms → 95.0s).
    expect(screen.getByTestId('monitoring-refresh-degraded-banner')).toHaveTextContent('95.0s')
    // Degraded is orthogonal to stale — neither banner implies the other.
    expect(screen.queryByTestId('monitoring-stale-banner')).not.toBeInTheDocument()
  })

  it('rm-107: no degraded banner on a healthy walk (whitelist pair present, flag false)', async () => {
    vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
      ok: true,
      data: makeData({refreshDegraded: false, refreshDurationMs: 1200})
    })

    render(<Monitoring />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(screen.getByTestId('monitoring-board')).toBeInTheDocument()
    expect(screen.queryByTestId('monitoring-refresh-degraded-banner')).not.toBeInTheDocument()
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

describe('Monitoring rm-780 (stale-state surfacing: invisible rows, false all-clear, frozen-board marker)', () => {
  // The file's makeRepo helper ignores its fullName override (default
  // 'fro-bot/agent' always wins), so this describe wraps it to name rows.
  function makeRepoRm780(fullName: string, status: Partial<MonitoringRepoStatus>): MonitoringRepo {
    return {...makeRepo({status}), fullName}
  }

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

  it('renders stale-but-not-red repos as attention-first cards and separates the footer count', async () => {
    vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
      ok: true,
      data: makeData({
        repos: [
          makeRepoRm780('fro-bot/healthy', {rollupState: 'green', failingChecks: 0, failingCheckDetails: []}),
          makeRepoRm780('fro-bot/stale-green', {rollupState: 'green', failingChecks: 0, failingCheckDetails: [], stale: true}),
          makeRepoRm780('fro-bot/unknown', {rollupState: 'unknown', failingChecks: 0, failingCheckDetails: []}),
        ],
      }),
    })

    render(<Monitoring />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    // Stale/unknown non-red rows are now VISIBLE (previously invisible).
    const staleCards = screen.getAllByTestId('monitoring-stale-repo')
    expect(staleCards).toHaveLength(2)
    expect(screen.getAllByTestId('monitoring-stale-repo-note')).toHaveLength(2)
    expect(staleCards[0]).toHaveTextContent('fro-bot/stale-green')
    expect(staleCards[1]).toHaveTextContent('fro-bot/unknown')
    // The stale note carries the degradation truth (stale vs unknown wording).
    expect(screen.getAllByTestId('monitoring-stale-repo-note')[0]).toHaveTextContent('Status is stale')
    expect(screen.getAllByTestId('monitoring-stale-repo-note')[1]).toHaveTextContent('Rollup state unknown')

    // No false all-clear over a board with stale/unknown rows.
    expect(screen.queryByTestId('monitoring-all-clear')).not.toBeInTheDocument()
    expect(screen.queryByTestId('monitoring-all-clear-suppressed')).not.toBeInTheDocument()

    // Footer separates stale from not-failing (stale rows are no longer
    // counted as plain "not failing").
    expect(screen.getByTestId('monitoring-stale-count')).toHaveTextContent('2 repositories stale')
    expect(screen.getByTestId('monitoring-footer')).toHaveTextContent('1 repository not failing')
    expect(screen.getByTestId('monitoring-footer')).not.toHaveTextContent('3 repositories not failing')
  })

  it('sorts attention-first: red ahead of stale, stale ahead of the green count', async () => {
    vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
      ok: true,
      data: makeData({
        repos: [
          makeRepoRm780('fro-bot/stale-green', {rollupState: 'green', failingChecks: 0, failingCheckDetails: [], stale: true}),
          makeRepoRm780('fro-bot/red', {rollupState: 'red', failingChecks: 2, failingCheckDetails: []}),
          makeRepoRm780('fro-bot/healthy', {rollupState: 'green', failingChecks: 0, failingCheckDetails: []}),
        ],
      }),
    })

    render(<Monitoring />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    const red = screen.getAllByTestId('monitoring-red-repo')[0]!
    const stale = screen.getAllByTestId('monitoring-stale-repo')[0]!
    // Red renders before stale in DOM order (attention-first).
    expect(red.compareDocumentPosition(stale) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(screen.getAllByTestId('monitoring-stale-repo')).toHaveLength(1)
    expect(screen.getByTestId('monitoring-footer')).toHaveTextContent('1 repository not failing')
  })

  it('keeps the board and swaps all-clear for the suppressed note on the first post-ready refresh failure, then recovers', async () => {
    vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
      ok: true,
      data: makeData({
        repos: [makeRepoRm780('fro-bot/healthy', {rollupState: 'green', failingChecks: 0, failingCheckDetails: []})],
      }),
    })

    render(<Monitoring />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })
    expect(screen.getByTestId('monitoring-all-clear')).toBeInTheDocument()
    expect(screen.queryByTestId('monitoring-view-stale-banner')).not.toBeInTheDocument()

    // Poll 2 fails: the board stays (last-good data) but the failure is now
    // visible, and the "all green" claim is retracted for unverified data.
    vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({ok: false, reason: 'timeout'})
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000)
    })
    expect(screen.getByTestId('monitoring-view-stale-banner')).toHaveTextContent('1 failure in a row')
    expect(screen.getByTestId('monitoring-all-clear-suppressed')).toBeInTheDocument()
    expect(screen.queryByTestId('monitoring-all-clear')).not.toBeInTheDocument()
    expect(screen.getByTestId('monitoring-board')).toBeInTheDocument()
    // The last-good data is still rendered (footer count from the kept data).
    expect(screen.getByTestId('monitoring-footer')).toHaveTextContent('1 repository not failing')

    // Poll 3 succeeds: banner clears, the all-clear claim is back.
    vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
      ok: true,
      data: makeData({
        repos: [makeRepoRm780('fro-bot/healthy', {rollupState: 'green', failingChecks: 0, failingCheckDetails: []})],
      }),
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000)
    })
    expect(screen.queryByTestId('monitoring-view-stale-banner')).not.toBeInTheDocument()
    expect(screen.getByTestId('monitoring-all-clear')).toBeInTheDocument()
    expect(screen.queryByTestId('monitoring-all-clear-suppressed')).not.toBeInTheDocument()
  })

  it('an all-green healthy board still renders the plain all-clear with no stale markers', async () => {
    vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
      ok: true,
      data: makeData({
        repos: [makeRepoRm780('fro-bot/healthy', {rollupState: 'green', failingChecks: 0, failingCheckDetails: []})],
      }),
    })

    render(<Monitoring />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(screen.getByTestId('monitoring-all-clear')).toBeInTheDocument()
    expect(screen.queryByTestId('monitoring-stale-repo')).not.toBeInTheDocument()
    expect(screen.queryByTestId('monitoring-view-stale-banner')).not.toBeInTheDocument()
    expect(screen.queryByTestId('monitoring-stale-count')).not.toBeInTheDocument()
  })

  describe('rm-836: per-repo CI-freshness (last-CI-activity line + enumeration-level CI-silence banner)', () => {
    /** 49h before the data's own clock — one hour past the 48h floor. */
    const SILENT_RUN_AT = DATA_AS_OF - 49 * 60 * 60 * 1000

    it('a fresh repo shows a muted last-run line (age computed against refreshedAt, not wall-clock)', async () => {
      vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
        ok: true,
        data: makeData({repos: [makeRepo()]}), // fixture default: 2h-old run
      })

      render(<Monitoring />)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10)
      })

      const line = screen.getByTestId('monitoring-ci-age-fresh')
      expect(line).toHaveTextContent('Last CI run: 2h ago')
      expect(screen.queryByTestId('monitoring-ci-age-stale')).not.toBeInTheDocument()
      expect(screen.queryByTestId('monitoring-ci-age-unknown')).not.toBeInTheDocument()
    })

    it('a repo past the 48h floor flips the line to attention with the CI-silence marker', async () => {
      vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
        ok: true,
        data: makeData({repos: [makeRepo({status: {lastRunAt: SILENT_RUN_AT}})]}),
      })

      render(<Monitoring />)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10)
      })

      const line = screen.getByTestId('monitoring-ci-age-stale')
      expect(line).toHaveTextContent('Last CI run: 2d ago')
      expect(line).toHaveTextContent('CI silence')
    })

    it('unknown run-age (lastRunAt null) reads as attention-unknown, never as fresh', async () => {
      vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
        ok: true,
        data: makeData({repos: [makeRepo({status: {lastRunAt: null}})]}),
      })

      render(<Monitoring />)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10)
      })

      expect(screen.getByTestId('monitoring-ci-age-unknown')).toHaveTextContent('Last CI run: unknown')
      expect(screen.queryByTestId('monitoring-ci-age-fresh')).not.toBeInTheDocument()
    })

    it('enumeration-level silence (every tracked repo silent) renders ONE board-level banner naming the class', async () => {
      vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
        ok: true,
        data: makeData({repos: [makeRepo({status: {lastRunAt: SILENT_RUN_AT}})]}),
      })

      render(<Monitoring />)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10)
      })

      expect(screen.getByTestId('monitoring-ci-silence-banner')).toHaveTextContent('CI silence')
      expect(screen.getByTestId('monitoring-ci-silence-banner')).toHaveTextContent('48h')
    })

    it('a mixed board (any fresh repo) does NOT render the enumeration-level silence banner', async () => {
      vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
        ok: true,
        data: makeData({
          repos: [
            makeRepo({status: {lastRunAt: SILENT_RUN_AT}}),
            makeRepoRm780('fro-bot/healthy', {
              rollupState: 'green',
              failingChecks: 0,
              failingCheckDetails: [],
              lastRunAt: FRESH_RUN_AT,
            }),
          ],
        }),
      })

      render(<Monitoring />)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10)
      })

      expect(screen.queryByTestId('monitoring-ci-silence-banner')).not.toBeInTheDocument()
      // But the silent repo still shows its own attention line.
      expect(screen.getByTestId('monitoring-ci-age-stale')).toBeInTheDocument()
    })

    it('an empty fleet (fail-cold boot) never renders the silence banner — silence is a per-repo claim', async () => {
      vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
        ok: true,
        data: makeData({repos: []}),
      })

      render(<Monitoring />)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10)
      })

      expect(screen.queryByTestId('monitoring-ci-silence-banner')).not.toBeInTheDocument()
    })
  })
})

describe('Monitoring rm-835 (cold-start truth: DTO stale banner + empty enumeration)', () => {
  // Mirrors the rm-780 describe's naming wrapper for the same reason:
  // makeRepo ignores its fullName override, so rows are named here.
  function makeRepoRm835(fullName: string, status: Partial<MonitoringRepoStatus>): MonitoringRepo {
    return {...makeRepo({status}), fullName}
  }

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

  it('pins the fail-closed cold-start DTO: stale banner renders, the green claim does not', async () => {
    // The aggregator's fail-closed cold-start snapshot (src/github/aggregator.ts
    // setSnapshot/getSnapshot: repos: [] + staleBanner: true) previously rendered
    // BOTH the stale panel and the "All repositories green" claim in one frame.
    vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
      ok: true,
      data: makeData({staleBanner: true})
    })

    render(<Monitoring />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(screen.getByTestId('monitoring-board')).toBeInTheDocument()
    expect(screen.getByTestId('monitoring-stale-banner')).toHaveTextContent('Data is stale')
    expect(screen.getByTestId('monitoring-no-data')).toBeInTheDocument()
    expect(screen.queryByTestId('monitoring-all-clear')).not.toBeInTheDocument()
  })

  it('an empty but fresh enumeration renders the no-data state, not the green claim', async () => {
    vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
      ok: true,
      data: makeData() // repos: [], staleBanner: false
    })

    render(<Monitoring />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(screen.getByTestId('monitoring-board')).toBeInTheDocument()
    expect(screen.getByTestId('monitoring-no-data')).toBeInTheDocument()
    expect(screen.queryByTestId('monitoring-all-clear')).not.toBeInTheDocument()
    expect(screen.queryByTestId('monitoring-stale-banner')).not.toBeInTheDocument()
  })

  it('the DTO stale banner retracts the green claim even with rows present', async () => {
    vi.mocked(monitoringApi.fetchMonitoring).mockResolvedValueOnce({
      ok: true,
      data: makeData({
        repos: [makeRepoRm835('fro-bot/healthy', {rollupState: 'green', failingChecks: 0, failingCheckDetails: []})],
        staleBanner: true
      })
    })

    render(<Monitoring />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(screen.getByTestId('monitoring-board')).toBeInTheDocument()
    expect(screen.getByTestId('monitoring-stale-banner')).toBeInTheDocument()
    expect(screen.queryByTestId('monitoring-all-clear')).not.toBeInTheDocument()
    expect(screen.getByTestId('monitoring-all-clear-suppressed')).toBeInTheDocument()
    // The healthy row itself still renders (last-known state, honestly framed).
    expect(screen.getByTestId('monitoring-footer')).toHaveTextContent('1 repository not failing')
  })
})
