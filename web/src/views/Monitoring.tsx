import {useState} from 'react'
import {fetchMonitoring, type FetchMonitoringResult, type MonitoringData, type MonitoringRepo} from '../api/monitoring.ts'
import {useBoundedPoll} from '../hooks/useBoundedPoll.ts'

type ViewState =
  | {state: 'loading'}
  | {state: 'error'; reason: string}
  | {state: 'auth-expired'}
  | {state: 'ready'; data: MonitoringData; postReadyFailures: number}

const POLL_INTERVAL_MS = 60000
/** rm-251: hard ceiling on a single poll — releases the latch even if the transport never settles. */
export const MONITORING_FETCH_TIMEOUT_MS = 15000

/**
 * Red-repo drill-down view (rm-192): renders the repos whose default branch
 * is failing CI, with WHICH check failed, in which workflow run and attempt.
 * Green/unknown repos are summarized in a footer count — the view's purpose
 * is the drill-down, not a full grid (the monitoring grid remains rm-104).
 */
export function Monitoring() {
  const [viewState, setViewState] = useState<ViewState>({state: 'loading'})

  // rm-251: the view consumes the shared bounded-poll hook (the rm-155
  // Listener.tsx lifecycle). The previous inline copy had no timeout race,
  // never aborted its controller, and released the latch only on the settled
  // path — one hung response wedged the view until page reload.
  useBoundedPoll<FetchMonitoringResult>({
    fetcher: abortSignal => fetchMonitoring({abortSignal}),
    timeoutMs: MONITORING_FETCH_TIMEOUT_MS,
    intervalMs: POLL_INTERVAL_MS,
    timeoutResult: {ok: false, reason: 'timeout'},
    onInitialStart: () => {
      setViewState({state: 'loading'})
    },
    onResult: result => {
      if (!result.ok) {
        // rm-273: 401 is session expiry, not a network failure — render the
        // sign-in affordance instead of the retry copy. The poll keeps
        // running, so a re-login (this tab or another) recovers automatically.
        if (result.reason === 'unauthenticated') {
          setViewState({state: 'auth-expired'})
          return
        }
        // rm-780: a failure AFTER the board is up keeps the last-good data
        // (rm-155 semantics) but now counts — postReadyFailures drives the
        // view-level staleness banner, so a silently frozen board is visible.
        setViewState(prev =>
          prev.state === 'ready'
            ? {state: 'ready', data: prev.data, postReadyFailures: prev.postReadyFailures + 1}
            : {state: 'error', reason: result.reason},
        )
        return
      }
      setViewState({state: 'ready', data: result.data, postReadyFailures: 0})
    },
    refetchOnFocus: true,
  })

  return (
    <div className="operator-panel" data-testid="monitoring-view">
      <div className="listener-header" style={{marginBottom: 'var(--space-4)', alignItems: 'center'}}>
        <h2 className="operator-section-heading" style={{marginBottom: 0}}>
          Repository Monitoring
        </h2>
      </div>

      {viewState.state === 'loading' && (
        <div data-testid="monitoring-loading" className="run-index-skeleton-container" aria-live="polite">
          {[1, 2, 3].map((i) => (
            <div key={i} className="run-card-skeleton">
              <span className="skeleton-item skeleton-pill" aria-hidden="true" />
              <span className="skeleton-item skeleton-repo" aria-hidden="true" />
              <span className="skeleton-item skeleton-time" aria-hidden="true" />
            </div>
          ))}
        </div>
      )}

      {viewState.state === 'auth-expired' && (
        <div data-testid="monitoring-auth-expired" className="operator-warning-panel" role="alert">
          Session expired — sign in again to load monitoring data.{' '}
          <a href="/auth/login">Sign in</a>
        </div>
      )}

      {viewState.state === 'error' && (
        <div data-testid="monitoring-error" className="operator-warning-panel operator-failure-state-unavailable" role="alert">
          Failed to load monitoring data ({viewState.reason}). Will retry.
        </div>
      )}

      {viewState.state === 'ready' && viewState.postReadyFailures > 0 && (
        <div data-testid="monitoring-view-stale-banner" className="operator-warning-panel" role="status">
          Showing the last known state — refreshes are failing ({viewState.postReadyFailures}{' '}
          {viewState.postReadyFailures === 1 ? 'failure' : 'failures'} in a row). Counts may be outdated.
        </div>
      )}

      {viewState.state === 'ready' && <MonitoringBoard data={viewState.data} viewStale={viewState.postReadyFailures > 0} />}
    </div>
  )
}

function MonitoringBoard({data, viewStale}: {data: MonitoringData; viewStale: boolean}) {
  const redRepos = data.repos.filter(repo => repo.status.rollupState === 'red' || repo.status.failingChecks > 0)
  // rm-780: stale-but-not-red repos were previously INVISIBLE — the red
  // filter above is the only row render, the footer counted them as "not
  // failing", and the all-clear empty state could sit over an all-stale
  // board (the DTO-level staleBanner is enumeration-wide only). They now
  // render attention-first: behind red, ahead of the green count.
  const staleRepos = data.repos.filter(
    repo =>
      !redRepos.includes(repo) &&
      (repo.status.stale === true || repo.status.rollupState === 'unknown'),
  )
  const remaining = data.repos.length - redRepos.length - staleRepos.length
  // rm-780: the all-clear claim is only true when nothing is stale/unknown,
  // the view is not running on failing refreshes, AND the DTO-level
  // enumeration banner is clear — the aggregator's fail-closed paths serve
  // staleBanner with ZERO rows (repos:[] + staleBanner:true), which a
  // row-only gate misreads as all-clear (cycle:3 residual amendment).
  const allClear =
    redRepos.length === 0 && staleRepos.length === 0 && !viewStale && !data.staleBanner
  const refreshedAt = data.refreshedAt === null ? null : new Date(data.refreshedAt).toLocaleString()
  // rm-107: measured duration of the last walk for the degraded banner — null
  // only when no cycle has ever stamped a snapshot (never while degraded).
  const degradedDuration = data.refreshDurationMs === null ? null : `${(data.refreshDurationMs / 1000).toFixed(1)}s`

  return (
    <div data-testid="monitoring-board" style={{display: 'flex', flexDirection: 'column', gap: 'var(--space-3)'}}>
      {data.staleBanner && (
        <div data-testid="monitoring-stale-banner" className="operator-warning-panel" role="status">
          Data is stale — showing the last known state. Counts may be outdated.
        </div>
      )}

      {data.refreshDegraded && (
        <div data-testid="monitoring-refresh-degraded-banner" className="operator-warning-panel" role="status">
          Refresh is degraded — the last refresh took{' '}
          {degradedDuration ?? 'longer than expected'}, over the watchdog ceiling.
          Counts are current as of the last completed walk but may lag behind live activity.
        </div>
      )}

      {redRepos.map(repo => <RedRepoCard key={repo.fullName} repo={repo} />)}

      {staleRepos.map(repo => <StaleRepoCard key={repo.fullName} repo={repo} />)}

      {redRepos.length === 0 && staleRepos.length === 0 &&
        (allClear ? (
          <div data-testid="monitoring-all-clear" className="operator-empty-state">
            <div className="operator-empty-icon" aria-hidden="true" style={{opacity: 0.2}}>✓</div>
            <p className="operator-empty-title">All repositories green</p>
            <p className="operator-empty-desc">
              {data.repos.length} tracked {data.repos.length === 1 ? 'repository' : 'repositories'}, no failing checks
              on default branches.
            </p>
          </div>
        ) : (
          // rm-780: refreshes are failing — the "all green" claim cannot be
          // made about the last-good data, so a neutral summary replaces it.
          <div data-testid="monitoring-all-clear-suppressed" className="operator-empty-state">
            <p className="operator-empty-desc">
              No failing checks in the last completed refresh — current state unverified while refreshes fail.
            </p>
          </div>
        ))}

      <div data-testid="monitoring-footer" style={{fontSize: 'var(--text-body-sm)', color: 'var(--color-text-muted)'}}>
        {remaining > 0 && (
          <span>
            {remaining} {remaining === 1 ? 'repository' : 'repositories'} not failing ·{' '}
          </span>
        )}
        {staleRepos.length > 0 && (
          <span data-testid="monitoring-stale-count">
            {staleRepos.length} {staleRepos.length === 1 ? 'repository' : 'repositories'} stale ·{' '}
          </span>
        )}
        {refreshedAt !== null ? <span>refreshed {refreshedAt}</span> : <span>never refreshed</span>}
      </div>
    </div>
  )
}

/**
 * rm-780: attention-first card for a stale/unknown repo that is NOT red —
 * previously this class of row was invisible (not failing, so not a red
 * card; not green either, but the footer only had a "not failing" count).
 * Mirrors RedRepoCard's chrome; the note carries the degradation truth.
 */
function StaleRepoCard({repo}: {repo: MonitoringRepo}) {
  const note =
    repo.status.stale === true
      ? 'Status is stale — the last fetch failed; counts are from the last successful refresh.'
      : 'Rollup state unknown — no CI conclusion could be derived for this repository.'
  return (
    <div data-testid="monitoring-stale-repo" className="listener-message-card">
      <div className="listener-header">
        <h3 className="listener-title" style={{margin: 0}}>
          {repo.fullName}
        </h3>
        <span className="listener-severity severity-warning" aria-label="Stale status">
          stale
        </span>
      </div>
      <div data-testid="monitoring-stale-repo-note" style={{fontSize: 'var(--text-body-sm)', color: 'var(--color-text-muted)'}}>
        {note}
      </div>
    </div>
  )
}

function RedRepoCard({repo}: {repo: MonitoringRepo}) {
  const {status} = repo
  return (
    <div data-testid="monitoring-red-repo" className="listener-message-card operator-failure-state-unavailable">
      <div className="listener-header">
        <h3 className="listener-title" style={{margin: 0}}>
          {repo.fullName}
        </h3>
        <span className="listener-severity severity-critical" aria-label={`Failing checks: ${status.failingChecks}`}>
          {status.failingChecks} failing {status.failingChecks === 1 ? 'check' : 'checks'}
        </span>
      </div>

      {status.stale && (
        <div style={{fontSize: 'var(--text-body-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)'}}>
          Status is stale — the last fetch failed; counts are from the last successful refresh.
        </div>
      )}

      {status.failingCheckDetails.length > 0 ? (
        <ul data-testid="monitoring-check-details" style={{margin: 0, paddingLeft: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)'}}>
          {status.failingCheckDetails.map((detail, i) => (
            <li key={i}>
              {detail.detailsUrl !== '' ? (
                <a href={detail.detailsUrl} target="_blank" rel="noopener noreferrer" className="listener-link">
                  {detail.checkName} ↗
                </a>
              ) : (
                detail.checkName
              )}
              {detail.workflowTitle !== null && (
                <span style={{color: 'var(--color-text-muted)'}}>
                  {' '}
                  · {detail.workflowTitle}
                  {detail.runAttempt !== null && ` (attempt ${detail.runAttempt})`}
                </span>
              )}
            </li>
          ))}
          {status.failingChecks > status.failingCheckDetails.length && (
            <li data-testid="monitoring-details-capped" style={{color: 'var(--color-text-muted)'}}>
              +{status.failingChecks - status.failingCheckDetails.length} more (drill-down capped)
            </li>
          )}
        </ul>
      ) : (
        <div data-testid="monitoring-count-only" style={{color: 'var(--color-text-muted)'}}>
          {status.failingChecks} failed {status.failingChecks === 1 ? 'check run' : 'check runs'} — run titles
          unavailable (count-only view).
        </div>
      )}
    </div>
  )
}
