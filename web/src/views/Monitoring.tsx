import {useState} from 'react'
import {fetchMonitoring, type FetchMonitoringResult, type MonitoringData, type MonitoringRepo, type MonitoringSystemStatus} from '../api/monitoring.ts'
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

      {viewState.state === 'ready' && <MonitoringBoard data={viewState.data} />}
    </div>
  )
}

function systemAgeLabel(ageMs: number | null): string {
  if (ageMs === null) return 'never refreshed'
  if (ageMs < 1_000) return 'under 1s ago'
  if (ageMs < 60_000) return `${Math.floor(ageMs / 1_000)}s ago`
  if (ageMs < 3_600_000) return `${Math.floor(ageMs / 60_000)}m ago`
  return `${Math.floor(ageMs / 3_600_000)}h ago`
}

/**
 * rm-107: one-line operator truth about the serving pipeline — snapshot
 * freshness, degradation, rate-limit pressure, listener depth and the most
 * recent refresh failures. Renders ONLY from the server-composed system
 * block (ageMs is server-computed — never re-derived from the client clock);
 * absent block (older payload) renders nothing.
 */
function SystemStatusStrip({system}: {system: MonitoringSystemStatus | undefined}) {
  if (system === undefined) return null
  const failures = system.lastRefreshFailures.slice(0, 3)
  const hiddenFailures = system.lastRefreshFailures.length - failures.length
  return (
    <section data-testid="monitoring-system-strip" className="operator-empty-state" role="status" style={{alignItems: 'flex-start'}}>
      <p className="operator-empty-title" style={{fontSize: '0.95rem'}}>
        System status
        {system.snapshot.refreshDegraded ? (
          <span data-testid="monitoring-system-degraded" style={{color: 'var(--status-error)'}}>
            {' '}- refresh pipeline degraded
          </span>
        ) : null}
      </p>
      <p className="operator-empty-desc" style={{display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)'}}>
        <span data-testid="monitoring-system-age">Data age {systemAgeLabel(system.snapshot.ageMs)}</span>
        {system.snapshot.staleBanner ? <span data-testid="monitoring-system-stale">stale banner on</span> : null}
        <span data-testid="monitoring-system-ratelimits">
          Rate limits: {system.rateLimit.primaryCount} primary / {system.rateLimit.secondaryCount} secondary
          {system.rateLimit.lastRetryAfterSeconds !== null ? ` (last retry-after ${system.rateLimit.lastRetryAfterSeconds}s)` : ''}
        </span>
        {system.listenerStore !== null ? (
          <span data-testid="monitoring-system-store">
            Listener store: {system.listenerStore.totalMessages} messages / {system.listenerStore.unreadCount} unread
            {system.listenerStore.prunedTotal > 0 ? ` / ${system.listenerStore.prunedTotal} pruned this process` : ''}
            {system.listenerStore.oldestEventAgeSeconds !== null ? ` / oldest ${systemAgeLabel(system.listenerStore.oldestEventAgeSeconds * 1_000)}` : ''}
          </span>
        ) : (
          <span data-testid="monitoring-system-store">Listener store: not mounted</span>
        )}
      </p>
      {failures.length > 0 ? (
        <ul data-testid="monitoring-system-failures" className="operator-empty-desc" style={{marginTop: 0, listStyle: 'disc inside'}}>
          {failures.map(failure => (
            <li key={`${failure.phase}-${failure.at}`} data-testid="monitoring-system-failure">
              {failure.phase}: {failure.detail}
            </li>
          ))}
          {hiddenFailures > 0 ? <li>+{hiddenFailures} more (see server logs)</li> : null}
        </ul>
      ) : null}
    </section>
  )
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

      <SystemStatusStrip system={data.system} />

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
