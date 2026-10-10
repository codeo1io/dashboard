import {useState} from 'react'
import {fetchMonitoring, type FetchMonitoringResult, type MonitoringData, type MonitoringRepo, type MonitoringRepoStatus} from '../api/monitoring.ts'
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
 * Red-repo drill-down view (rm-192) + security panel (rm-117): renders the
 * repos whose default branch is failing CI (with WHICH check failed, in
 * which workflow run and attempt) and the repos with open security alerts
 * (Dependabot + code-scanning counts). Green/clean repos are summarized in
 * a footer count — the view's purpose is the drill-down, not a full grid
 * (the monitoring grid remains rm-104).
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
 * rm-117: does this repo's security posture alone require operator attention?
 * (open Dependabot alerts or open code-scanning alerts — independent of CI.)
 */
function hasSecurityAttention(status: MonitoringRepoStatus): boolean {
  if (status.openAlertCount !== null && status.openAlertCount > 0) return true
  if (status.openCodeScanningAlerts !== null && status.openCodeScanningAlerts.openCount > 0) return true
  return false
}

function MonitoringBoard({data}: {data: MonitoringData}) {
  const redRepos = data.repos.filter(repo => repo.status.rollupState === 'red' || repo.status.failingChecks > 0)
  // rm-117: security-attention repos that are NOT CI-red get their own card —
  // a repo burning with CVEs while its CI is green is exactly the blind spot
  // the security panel exists to surface.
  const securityOnlyRepos = data.repos.filter(
    repo =>
      (repo.status.rollupState !== 'red' && repo.status.failingChecks === 0) &&
      hasSecurityAttention(repo.status),
  )
  const remaining = data.repos.length - redRepos.length - securityOnlyRepos.length
  // rm-117: honest coverage note — repos where the code-scanning half is
  // simply unavailable (optional read absent). 0 here means every repo's
  // count is a real count, not a silent gap.
  const withoutCodeScanningCoverage = data.repos.filter(repo => repo.status.openCodeScanningAlerts === null).length
  // rm-117 review fix (independent_review 5d6fd3f, low): the all-clear card
  // must not claim "0 open …" for a count it does not know — a null count is
  // UNKNOWN (permission absent or probe degraded), never zero.
  const dependabotCountUnknown = data.repos.some(repo => repo.status.openAlertCount === null)
  const dependabotOpenTotal = data.repos.reduce((sum, repo) => sum + (repo.status.openAlertCount ?? 0), 0)
  const codeScanningOpenTotal = data.repos.reduce(
    (sum, repo) => sum + (repo.status.openCodeScanningAlerts?.openCount ?? 0), 0)

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

      {redRepos.length === 0 && securityOnlyRepos.length === 0 ? (
        <div data-testid="monitoring-all-clear" className="operator-empty-state">
          <div className="operator-empty-icon" aria-hidden="true" style={{opacity: 0.2}}>✓</div>
          <p className="operator-empty-title">All repositories green</p>
          <p className="operator-empty-desc">
            {data.repos.length} tracked {data.repos.length === 1 ? 'repository' : 'repositories'}, no failing checks
            on default branches,{' '}
            {dependabotCountUnknown
              ? 'an unknown number of open Dependabot alerts (count unavailable)'
              : `${dependabotOpenTotal} open Dependabot ${dependabotOpenTotal === 1 ? 'alert' : 'alerts'}`}{' '}
            and{' '}
            {withoutCodeScanningCoverage > 0
              ? 'an unknown number of open code-scanning alerts (count unavailable)'
              : `${codeScanningOpenTotal} open code-scanning ${codeScanningOpenTotal === 1 ? 'alert' : 'alerts'}`}
            .
          </p>
        </div>
      ) : (
        <>
          {redRepos.map(repo => <RedRepoCard key={repo.fullName} repo={repo} />)}
          {securityOnlyRepos.map(repo => <SecurityRepoCard key={repo.fullName} repo={repo} />)}
        </>
      )}

      <div data-testid="monitoring-footer" style={{fontSize: 'var(--text-body-sm)', color: 'var(--color-text-muted)'}}>
        {remaining > 0 && (
          <span>
            {remaining} {remaining === 1 ? 'repository' : 'repositories'} without attention signals ·{' '}
          </span>
        )}
        {withoutCodeScanningCoverage > 0 && (
          <span data-testid="monitoring-codescanning-coverage">
            {withoutCodeScanningCoverage} without code-scanning coverage ·{' '}
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

      {/* rm-117: security posture rides the same card — red CI and burning
          CVEs are not mutually exclusive, and the operator triages one repo
          in one place. */}
      <SecuritySummary status={status} />
    </div>
  )
}

/**
 * rm-117: a repo whose ONLY attention signal is security (CI green). Same
 * card chrome as the red-repo card so the board reads as one list.
 */
function SecurityRepoCard({repo}: {repo: MonitoringRepo}) {
  const {status} = repo
  return (
    <div data-testid="monitoring-security-repo" className="listener-message-card">
      <div className="listener-header">
        <h3 className="listener-title" style={{margin: 0}}>
          {repo.fullName}
        </h3>
      </div>

      {status.stale && (
        <div style={{fontSize: 'var(--text-body-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)'}}>
          Status is stale — the last fetch failed; counts are from the last successful refresh.
        </div>
      )}

      <SecuritySummary status={status} />
    </div>
  )
}

/**
 * rm-117: the per-repo security summary — open code-scanning alert count +
 * severity buckets, plus the already-landed Dependabot count. Rendered only
 * when at least one source has something to report; a null code-scanning
 * half is called out as unavailable ONLY alongside a live Dependabot count,
 * so a fleet without security_events coverage isn't buried in n/a noise.
 */
function SecuritySummary({status}: {status: MonitoringRepoStatus}) {
  const cs = status.openCodeScanningAlerts
  const dependabot = status.openAlertCount
  const codeScanningActive = cs !== null && cs.openCount > 0
  const dependabotActive = dependabot !== null && dependabot > 0
  if (!codeScanningActive && !dependabotActive) return null
  return (
    <div
      data-testid="monitoring-security-summary"
      style={{marginTop: 'var(--space-2)', display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center', fontSize: 'var(--text-body-sm)'}}
    >
      {codeScanningActive && (
        <span
          className="listener-severity severity-critical"
          aria-label={`Open code-scanning alerts: ${cs.openCount}`}
        >
          {cs.openCount} open code-scanning {cs.openCount === 1 ? 'alert' : 'alerts'}
        </span>
      )}
      {dependabotActive && (
        <span
          className="listener-severity severity-warning"
          aria-label={`Open Dependabot alerts: ${dependabot}`}
        >
          {dependabot} Dependabot {dependabot === 1 ? 'alert' : 'alerts'}
        </span>
      )}
      {codeScanningActive && (
        <span data-testid="monitoring-codescanning-severity" style={{color: 'var(--color-text-muted)'}}>
          {cs.severity.critical} critical · {cs.severity.high} high · {cs.severity.medium} medium ·{' '}
          {cs.severity.low} low · {cs.severity.unrated} unrated
        </span>
      )}
      {!codeScanningActive && cs === null && dependabotActive && (
        <span data-testid="monitoring-codescanning-unavailable" style={{color: 'var(--color-text-muted)'}}>
          code scanning: unavailable (no security_events read on this installation)
        </span>
      )}
    </div>
  )
}
