import {useState} from 'react'
import {
  fetchMonitoring,
  type FetchMonitoringResult,
  type MonitoringData,
  type MonitoringRepo,
  type PlatformStatusSummary,
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

/**
 * rm-1447: statuses that make rollups ambiguous — checks may be failing to
 * REGISTER rather than passing. 'under_maintenance' is planned and excluded
 * (announced windows are not incidents); fetchedAt keeps even that state
 * inspectable via /api/status.
 */
const PLATFORM_ACTIONS_DEGRADED: readonly string[] = ['degraded_performance', 'partial_outage', 'major_outage']

function shouldShowPlatformBanner(platform: PlatformStatusSummary): boolean {
  if (platform.actions !== null) return PLATFORM_ACTIONS_DEGRADED.includes(platform.actions)
  // Actions component itself unreadable — fall back to broad overall
  // incidents, which usually subsume it (a total feed failure shows nothing,
  // matching the server's fail-open absence).
  return platform.overall === 'major' || platform.overall === 'critical'
}

function platformBannerPhrase(platform: PlatformStatusSummary): string {
  if (platform.actions === 'degraded_performance') return 'degraded performance'
  if (platform.actions === 'partial_outage') return 'a partial outage'
  if (platform.actions === 'major_outage') return 'a major outage'
  return platform.overall === 'critical' ? 'a critical platform incident' : 'a major platform incident'
}

function MonitoringBoard({data}: {data: MonitoringData}) {
  // rm-1968: archived repos are muted, never red — a repo frozen read-only
  // keeps its final failing checks forever at GitHub, so without this filter
  // a dead repo would be permanent board noise.
  const redRepos = data.repos.filter(
    repo => !repo.status.isArchived && (repo.status.rollupState === 'red' || repo.status.failingChecks > 0),
  )
  const archivedRepos = data.repos.filter(repo => repo.status.isArchived)
  const remaining = data.repos.length - redRepos.length - archivedRepos.length
  const refreshedAt = data.refreshedAt === null ? null : new Date(data.refreshedAt).toLocaleString()
  const platform = data.platformStatus

  return (
    <div data-testid="monitoring-board" style={{display: 'flex', flexDirection: 'column', gap: 'var(--space-3)'}}>
      {platform !== null && shouldShowPlatformBanner(platform) && (
        <div data-testid="monitoring-platform-banner" className="operator-platform-banner" role="status">
          <span>
            GitHub Actions reports {platformBannerPhrase(platform)} — CI checks may be failing to register
            rather than passing, so green-looking rollups can be misleading.
            {platform.overallDescription !== '' ? ` (${platform.overallDescription})` : ''} · platform status as
            of {new Date(platform.fetchedAt).toLocaleTimeString()}
          </span>
        </div>
      )}

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

      {/* rm-1968: archived repos — muted list, not red cards. Their facts are
          frozen (and excluded from the refresh loop server-side); showing them
          here keeps the operator's inventory complete without alarm noise. */}
      {archivedRepos.length > 0 && (
        <div data-testid="monitoring-archived" style={{opacity: 0.75}}>
          <h3 className="operator-section-heading" style={{fontSize: 'var(--text-body-sm)'}}>
            Archived {archivedRepos.length === 1 ? 'repository' : 'repositories'} · {archivedRepos.length}
          </h3>
          <ul style={{margin: 'var(--space-2) 0 0', paddingLeft: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', fontSize: 'var(--text-body-sm)', color: 'var(--color-text-muted)'}}>
            {archivedRepos.map(repo => (
              <li key={repo.fullName} data-testid="monitoring-archived-repo">
                {repo.fullName}
                {repo.status.pushedAt !== null && (
                  <span> · last push {new Date(repo.status.pushedAt).toLocaleDateString()}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div data-testid="monitoring-footer" style={{fontSize: 'var(--text-body-sm)', color: 'var(--color-text-muted)'}}>
        {remaining > 0 && (
          <span>
            {remaining} {remaining === 1 ? 'repository' : 'repositories'} not failing ·{' '}
          </span>
        )}
        {archivedRepos.length > 0 && (
          <span data-testid="monitoring-archived-count">
            {archivedRepos.length} archived ·{' '}
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
        {/* rm-1967: the Dependabot posture the fleet already pays per-cycle
            API budget for — transported end-to-end since the query-registry
            field landed, but never rendered. openAlertCount is null when the
            optional security_events grant is absent (graceful twin) — render
            nothing then, never a fake zero. */}
        {status.openAlertCount !== null && status.openAlertCount > 0 && (
          <span className="listener-severity severity-warning" data-testid="repo-alert-count" aria-label={`Open Dependabot alerts: ${status.openAlertCount}`}>
            {status.openAlertCount} Dependabot {status.openAlertCount === 1 ? 'alert' : 'alerts'}
          </span>
        )}
      </div>

      {status.stale && (
        <div style={{fontSize: 'var(--text-body-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)'}}>
          Status is stale — the last fetch failed; counts are from the last successful refresh.
        </div>
      )}

      {/* rm-1968: dormancy signal — a repo whose last push is months old is
          quiet by choice, not necessarily broken; pairs the red-ness with
          human context. Rendered only when known (null = unknown, never a
          fake "recent"). */}
      {status.pushedAt !== null && (
        <div data-testid="repo-pushed-at" style={{fontSize: 'var(--text-body-sm)', color: 'var(--color-text-muted)'}}>
          Last push {new Date(status.pushedAt).toLocaleString()}
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
