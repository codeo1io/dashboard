import {useCallback, useEffect, useRef, useState} from 'react'
import {fetchMonitoring, type MonitoringData, type MonitoringRepo} from '../api/monitoring.ts'

type ViewState =
  | {state: 'loading'}
  | {state: 'error'; reason: string}
  | {state: 'ready'; data: MonitoringData}

const POLL_INTERVAL_MS = 60000

/**
 * Red-repo drill-down view (rm-192): renders the repos whose default branch
 * is failing CI, with WHICH check failed, in which workflow run and attempt.
 * Green/unknown repos are summarized in a footer count — the view's purpose
 * is the drill-down, not a full grid (the monitoring grid remains rm-104).
 */
export function Monitoring() {
  const [viewState, setViewState] = useState<ViewState>({state: 'loading'})
  const isFetchingRef = useRef(false)

  const loadData = useCallback(async (isInitial: boolean) => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true

    if (isInitial) {
      setViewState({state: 'loading'})
    }

    const abortController = new AbortController()
    const result = await fetchMonitoring({abortSignal: abortController.signal})
    isFetchingRef.current = false

    if (!result.ok) {
      setViewState(prev => (prev.state === 'ready' ? prev : {state: 'error', reason: result.reason}))
      return
    }
    setViewState({state: 'ready', data: result.data})
  }, [])

  useEffect(() => {
    void loadData(true)
  }, [loadData])

  useEffect(() => {
    const intervalId = setInterval(() => {
      void loadData(false)
    }, POLL_INTERVAL_MS)
    const handleFocus = () => {
      void loadData(false)
    }
    window.addEventListener('focus', handleFocus)
    return () => {
      clearInterval(intervalId)
      window.removeEventListener('focus', handleFocus)
    }
  }, [loadData])

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

      {viewState.state === 'error' && (
        <div data-testid="monitoring-error" className="operator-warning-panel operator-failure-state-unavailable" role="alert">
          Failed to load monitoring data ({viewState.reason}). Will retry.
        </div>
      )}

      {viewState.state === 'ready' && <MonitoringBoard data={viewState.data} />}
    </div>
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
