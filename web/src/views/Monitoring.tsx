import {useState} from 'react'
import {
  fetchMonitoring,
  fetchMonitor,
  type FetchMonitoringResult,
  type FetchMonitorResult,
  type MonitorData,
  type MonitoringData,
  type MonitoringRepo,
} from '../api/monitoring.ts'
import {useBoundedPoll} from '../hooks/useBoundedPoll.ts'

type ViewState =
  | {state: 'loading'}
  | {state: 'error'; reason: string}
  | {state: 'auth-expired'}
  | {state: 'ready'; data: MonitoringData}

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
  // rm-107 (cycle-1 batch): the data-plane composite — the fleet view's OWN
  // health (token budget, listener backlog, refresh streak). Polled
  // independently: if /api/monitor fails, the strip simply disappears and the
  // repository view is untouched (B2: independent failure).
  const [monitorData, setMonitorData] = useState<MonitorData | null>(null)

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
        setViewState(prev => (prev.state === 'ready' ? prev : {state: 'error', reason: result.reason}))
        return
      }
      setViewState({state: 'ready', data: result.data})
    },
    refetchOnFocus: true,
  })

  useBoundedPoll<FetchMonitorResult>({
    fetcher: abortSignal => fetchMonitor({abortSignal}),
    timeoutMs: MONITORING_FETCH_TIMEOUT_MS,
    intervalMs: POLL_INTERVAL_MS,
    timeoutResult: {ok: false, reason: 'timeout'},
    onResult: result => {
      // Fail-open by design: without a verified composite, render nothing
      // rather than a guessed reading (the strip is additive, never load-bearing).
      setMonitorData(result.ok ? result.data : null)
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

      {viewState.state === 'ready' && (
        <div style={{display: 'flex', flexDirection: 'column', gap: 'var(--space-3)'}}>
          <MonitorHealthStrip monitor={monitorData} />
          <MonitoringBoard data={viewState.data} />
        </div>
      )}
    </div>
  )
}

/**
 * rm-107 S1/S2/S3: the data plane's own truth, composed server-side into a
 * monotone reading — token budget observed at the transport, listener backlog
 * depth/age, and the refresh fail streak. `stale` (fail-visible) outranks
 * `degraded` (slow but fresh); a failed refresh can never improve the label.
 */
function MonitorHealthStrip({monitor}: {monitor: MonitorData | null}) {
  if (monitor === null) return null
  const healthLabel = monitor.health === 'stale' ? 'stale' : monitor.health === 'degraded' ? 'degraded' : 'healthy'
  return (
    <div
      data-testid="monitor-health-strip"
      className={monitor.health === 'ok' ? 'operator-panel' : 'operator-warning-panel'}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--space-3)',
        fontSize: 'var(--text-body-sm)',
        alignItems: 'center',
      }}
      role="status"
    >
      <span data-testid="monitor-health">
        Data plane: {healthLabel}
        {monitor.refresh.failStreak > 0 &&
          ` (last ${monitor.refresh.failStreak} refresh${monitor.refresh.failStreak === 1 ? '' : 'es'} failed)`}
      </span>
      {monitor.rateLimit !== null && monitor.rateLimit.remaining !== null && (
        <span data-testid="monitor-rate-limit">
          Token budget: {monitor.rateLimit.remaining}
          {monitor.rateLimit.limit !== null ? `/${monitor.rateLimit.limit}` : ''} remaining
          {monitor.rateLimit.resetAt !== null && ` · resets ${new Date(monitor.rateLimit.resetAt).toLocaleTimeString()}`}
        </span>
      )}
      {monitor.listener !== null && (
        <span data-testid="monitor-listener">
          Listener: {monitor.listener.unread} unread
          {monitor.listener.oldestUnreadAgeMs !== null && ` · oldest ${formatAge(monitor.listener.oldestUnreadAgeMs)} old`}
        </span>
      )}
      {monitor.refresh.durationMs !== null && (
        <span data-testid="monitor-refresh-duration">Last refresh: {monitor.refresh.durationMs} ms</span>
      )}
    </div>
  )
}

function formatAge(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  if (minutes < 1) return '<1 min'
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h`
}

function MonitoringBoard({data}: {data: MonitoringData}) {
  const redRepos = data.repos.filter(repo => repo.status.rollupState === 'red' || repo.status.failingChecks > 0)
  const remaining = data.repos.length - redRepos.length
  const refreshedAt = data.refreshedAt === null ? null : new Date(data.refreshedAt).toLocaleString()

  return (
    <div data-testid="monitoring-board" style={{display: 'flex', flexDirection: 'column', gap: 'var(--space-3)'}}>
      {data.staleBanner && (
        <div data-testid="monitoring-stale-banner" className="operator-warning-panel" role="status">
          Data is stale — showing the last known state. Counts may be outdated.
        </div>
      )}

      {redRepos.length === 0 ? (
        <div data-testid="monitoring-all-clear" className="operator-empty-state">
          <div className="operator-empty-icon" aria-hidden="true" style={{opacity: 0.2}}>✓</div>
          <p className="operator-empty-title">All repositories green</p>
          <p className="operator-empty-desc">
            {data.repos.length} tracked {data.repos.length === 1 ? 'repository' : 'repositories'}, no failing checks
            on default branches.
          </p>
        </div>
      ) : (
        redRepos.map(repo => <RedRepoCard key={repo.fullName} repo={repo} />)
      )}

      <div data-testid="monitoring-footer" style={{fontSize: 'var(--text-body-sm)', color: 'var(--color-text-muted)'}}>
        {remaining > 0 && (
          <span>
            {remaining} {remaining === 1 ? 'repository' : 'repositories'} not failing ·{' '}
          </span>
        )}
        {refreshedAt !== null ? <span>refreshed {refreshedAt}</span> : <span>never refreshed</span>}
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
