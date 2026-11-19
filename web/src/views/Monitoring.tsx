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

/** rm-192: the drill-down set — a failing default branch, in red or count-only shape. */
function isFailing(repo: MonitoringRepo): boolean {
  return repo.status.rollupState === 'red' || repo.status.failingChecks > 0
}

/**
 * rm-2135: a repo whose data is degraded — the rollup is unknown (the last
 * fetch failed) or the counts are flagged stale. These rows are NOT "not
 * failing": rendering them as healthy would make an outage look green.
 */
function isDegraded(repo: MonitoringRepo): boolean {
  return !isFailing(repo) && (repo.status.rollupState === 'unknown' || repo.status.stale)
}

function MonitoringBoard({data}: {data: MonitoringData}) {
  const redRepos = data.repos.filter(isFailing)
  const degradedRepos = data.repos.filter(isDegraded)
  const remaining = data.repos.length - redRepos.length - degradedRepos.length
  // rm-2135: "all clear" asserts a KNOWN-GOOD snapshot — nothing red, nothing
  // degraded, non-empty, and not a stale banner. Anything else renders the
  // honest state (cards, degraded group, or the suppressed branch).
  const healthy = redRepos.length === 0 && degradedRepos.length === 0
  const allClear = healthy && data.repos.length > 0 && !data.staleBanner
  // rm-2137: fleet totals from per-repo counts the server already emits.
  const fleetPrCount = data.repos.reduce((sum, repo) => sum + repo.status.openPrCount, 0)
  const fleetIssueCount = data.repos.reduce((sum, repo) => sum + repo.status.openIssueCount, 0)
  const fleetAlertsKnown = data.repos.every(repo => repo.status.openAlertCount !== null)
  const fleetAlertCount = fleetAlertsKnown
    ? data.repos.reduce((sum, repo) => sum + (repo.status.openAlertCount ?? 0), 0)
    : null
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

      {data.refreshDegraded && (
        <div data-testid="monitoring-watchdog-banner" className="operator-warning-panel" role="status">
          Last refresh exceeded the watchdog ceiling
          {data.refreshDurationMs !== null ? ` (${(data.refreshDurationMs / 1000).toFixed(1)}s)` : ''} — counts may
          be incomplete.
        </div>
      )}

      {(data.driftCount > 0 || (data.enumerationIncomplete !== null && data.enumerationIncomplete > 0)) && (
        <div data-testid="monitoring-completeness-banner" className="operator-warning-panel" role="status">
          Fleet picture incomplete — {data.driftCount} drifted
          {data.driftCount === 1 ? ' repository' : ' repositories'}
          {data.enumerationIncomplete !== null && data.enumerationIncomplete > 0
            ? ` · ${data.enumerationIncomplete} ${data.enumerationIncomplete === 1 ? 'repository' : 'repositories'} could not be enumerated`
            : ''}
          .
        </div>
      )}

      {(fleetPrCount > 0 || fleetIssueCount > 0 || (fleetAlertCount ?? 0) > 0) && (
        <div data-testid="monitoring-attention-inbox" className="listener-message-card" role="status">
          <span data-testid="monitoring-pr-count">{fleetPrCount} open pull requests</span> ·{' '}
          <span data-testid="monitoring-issue-count">{fleetIssueCount} open issues</span> ·{' '}
          <span data-testid="monitoring-alert-count">
            {fleetAlertCount === null ? 'alert counts unavailable (partial fetch)' : `${fleetAlertCount} open alerts`}
          </span>{' '}
          · across {data.repos.length} {data.repos.length === 1 ? 'repository' : 'repositories'}
        </div>
      )}

      {healthy ? (
        allClear ? (
          <div data-testid="monitoring-all-clear" className="operator-empty-state">
            <div className="operator-empty-icon" aria-hidden="true" style={{opacity: 0.2}}>✓</div>
            <p className="operator-empty-title">All repositories green</p>
            <p className="operator-empty-desc">
              {data.repos.length} tracked {data.repos.length === 1 ? 'repository' : 'repositories'}, no failing checks
              on default branches.
            </p>
          </div>
        ) : (
          <div data-testid="monitoring-all-clear-suppressed" className="operator-empty-state">
            <div className="operator-empty-icon" aria-hidden="true" style={{opacity: 0.2}}>…</div>
            <p className="operator-empty-title">No failing checks recorded</p>
            <p className="operator-empty-desc">
              The snapshot is {data.repos.length === 0 ? 'empty' : 'stale'} — all-clear is withheld until a fresh,
              complete refresh.
            </p>
          </div>
        )
      ) : (
        <>
          {redRepos.map((repo) => (
            <RedRepoCard key={repo.fullName} repo={repo} />
          ))}
          {degradedRepos.length > 0 && (
            <div data-testid="monitoring-degraded-banner" className="operator-warning-panel" role="status">
              {degradedRepos.length} of {data.repos.length}{' '}
              {data.repos.length === 1 ? 'repository is' : 'repositories are'} reporting degraded or unavailable data
              — the fleet picture is incomplete.
            </div>
          )}
          {degradedRepos.map((repo) => (
            <div key={repo.fullName} data-testid="monitoring-degraded-repo" className="listener-message-card">
              <div className="listener-header">
                <h3 className="listener-title" style={{margin: 0}}>
                  {repo.fullName}
                </h3>
                <span className="listener-severity severity-warning">data degraded</span>
              </div>
              <div style={{fontSize: 'var(--text-body-sm)', color: 'var(--color-text-muted)'}}>
                {repo.status.rollupState === 'unknown'
                  ? 'Status unknown — the last fetch failed; no counts are shown rather than stale-looking zeros.'
                  : 'Status is stale — counts are from the last successful refresh.'}
              </div>
            </div>
          ))}
        </>
      )}

      <div data-testid="monitoring-footer" style={{fontSize: 'var(--text-body-sm)', color: 'var(--color-text-muted)'}}>
        {remaining > 0 && (
          <span>
            {remaining} {remaining === 1 ? 'repository' : 'repositories'} not failing ·{' '}
          </span>
        )}
        {refreshedAt !== null ? <span>refreshed {refreshedAt}</span> : <span>never refreshed</span>}
        {data.refreshDurationMs !== null && (
          <span> · refresh took {(data.refreshDurationMs / 1000).toFixed(1)}s</span>
        )}
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
