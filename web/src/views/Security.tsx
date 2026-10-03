import {useState} from 'react'
import {fetchSecurity, type FetchSecurityResult, type SecurityAlert, type SecurityData} from '../api/security.ts'
import {useBoundedPoll} from '../hooks/useBoundedPoll.ts'

type ViewState =
  | {state: 'loading'}
  | {state: 'error'; reason: string}
  | {state: 'auth-expired'}
  | {state: 'ready'; data: SecurityData}

const POLL_INTERVAL_MS = 60000
/** rm-251 discipline: hard ceiling on a single poll — releases the latch even if the transport never settles. */
export const SECURITY_FETCH_TIMEOUT_MS = 15000

/** GitHub SecurityAdvisorySeverity values, worst-first (drives histogram order + chip class). */
const SEVERITY_ORDER: readonly (string | null)[] = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW', 'UNKNOWN', null]

function severityChipClass(severity: string | null): string {
  switch (severity) {
    case 'CRITICAL':
      return 'listener-severity severity-critical'
    case 'HIGH':
      return 'listener-severity severity-warning'
    case 'MODERATE':
      return 'listener-severity severity-info'
    default:
      return 'listener-severity severity-default'
  }
}

/** Deterministic (UTC) date rendering — stable under jsdom across locales/timezones. */
function fmtDate(iso: string | null): string {
  return iso === null ? '' : new Date(iso).toISOString().slice(0, 10)
}

function alertPrimaryId(alert: SecurityAlert): string {
  return alert.ghsaId ?? alert.cveId ?? '(unidentified)'
}

// rm-552: the advisory href arrives in the DTO (advisoryUrl) — the client
// builds no outbound URLs itself, keeping the shipped bundle free of
// third-party origin literals (web/src/privacy/build-output-no-tracking guard).

/**
 * Security-posture view (rm-117): makes the cured-alert story visible. The
 * fleet's Dependabot alerts are curated (0 open) — a count alone renders
 * that work invisible. This view shows the per-severity / per-EPSS shape of
 * anything still open, and the recent-cures ledger of what was cured and
 * when, per repo, from the minimized /api/security DTO.
 */
export function Security() {
  const [viewState, setViewState] = useState<ViewState>({state: 'loading'})

  // rm-251: shared bounded-poll lifecycle (timeout race + unmount abort),
  // same contract as Monitoring.
  useBoundedPoll<FetchSecurityResult>({
    fetcher: abortSignal => fetchSecurity({abortSignal}),
    timeoutMs: SECURITY_FETCH_TIMEOUT_MS,
    intervalMs: POLL_INTERVAL_MS,
    timeoutResult: {ok: false, reason: 'timeout'},
    onInitialStart: () => {
      setViewState({state: 'loading'})
    },
    onResult: result => {
      if (!result.ok) {
        // rm-273: 401 is session expiry — render the sign-in affordance; the
        // poll keeps running, so a re-login recovers automatically.
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
    <div className="operator-panel" data-testid="security-view">
      <div className="listener-header" style={{marginBottom: 'var(--space-4)', alignItems: 'center'}}>
        <h2 className="operator-section-heading" style={{marginBottom: 0}}>
          Security Posture
        </h2>
      </div>

      {viewState.state === 'loading' && (
        <div data-testid="security-loading" className="run-index-skeleton-container" aria-live="polite">
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
        <div data-testid="security-auth-expired" className="operator-warning-panel" role="alert">
          Session expired — sign in again to load security posture.{' '}
          <a href="/auth/login">Sign in</a>
        </div>
      )}

      {viewState.state === 'error' && (
        <div data-testid="security-error" className="operator-warning-panel operator-failure-state-unavailable" role="alert">
          Failed to load security posture ({viewState.reason}). Will retry.
        </div>
      )}

      {viewState.state === 'ready' && <SecurityBoard data={viewState.data} />}
    </div>
  )
}

function SecurityBoard({data}: {data: SecurityData}) {
  const openAlerts: readonly SecurityAlert[] = data.repos.flatMap(repo => repo.posture?.openAlerts ?? [])
  const degradedRepos = data.repos.filter(repo => repo.posture === null && repo.openAlertCount === null)
  const totalOpenCount = data.repos.reduce(
    (sum, repo) => sum + (repo.openAlertCount ?? 0),
    0,
  )
  const totalCures = data.repos.reduce(
    (sum, repo) => sum + (repo.posture?.recentCureCount ?? 0),
    0,
  )
  const refreshedAt = data.refreshedAt === null ? null : new Date(data.refreshedAt).toLocaleString()

  // Severity histogram over the OPEN drill-down sample (bounded by the
  // server's 10-node page cap; the fleet totals above stay authoritative).
  const severityCounts = new Map<string | null, number>()
  for (const alert of openAlerts) {
    const key = alert.severity ?? null
    severityCounts.set(key, (severityCounts.get(key) ?? 0) + 1)
  }

  // EPSS top list: most-exploitable-first (percentage desc), capped at 5.
  const epssTop = [...openAlerts]
    .filter(alert => alert.epssPercentage !== null)
    .sort((a, b) => (b.epssPercentage ?? 0) - (a.epssPercentage ?? 0))
    .slice(0, 5)

  const reposWithCures = data.repos.filter(repo => (repo.posture?.recentCures.length ?? 0) > 0)
  const curesFetchedAts = data.repos
    .map(repo => repo.posture?.curesFetchedAt ?? null)
    .filter((value): value is number => value !== null)
  const newestCuresFetch = curesFetchedAts.length === 0 ? null : Math.max(...curesFetchedAts)

  return (
    <div data-testid="security-board" style={{display: 'flex', flexDirection: 'column', gap: 'var(--space-3)'}}>
      {data.staleBanner && (
        <div data-testid="security-stale-banner" className="operator-warning-panel" role="status">
          Data is stale — showing the last known state. Counts may be outdated.
        </div>
      )}

      <div data-testid="security-summary" className="operator-summary-row" style={{display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap'}}>
        <span>
          <strong>{data.repos.length}</strong> {data.repos.length === 1 ? 'repo' : 'repos'} monitored
        </span>
        <span>
          <strong data-testid="security-open-total">{totalOpenCount}</strong> open alert{totalOpenCount === 1 ? '' : 's'}
        </span>
        <span>
          <strong data-testid="security-cured-total">{totalCures}</strong> lifetime cure{totalCures === 1 ? '' : 's'}
        </span>
        {degradedRepos.length > 0 && (
          <span data-testid="security-degraded-count">
            <strong>{degradedRepos.length}</strong> permission-degraded
          </span>
        )}
      </div>

      <section data-testid="security-severity-histogram" aria-label="Open alerts by severity">
        <h3 className="operator-section-heading" style={{fontSize: 'var(--text-body-md)'}}>
          Open alerts by severity
        </h3>
        {openAlerts.length === 0 ? (
          <div data-testid="security-no-open" className="operator-empty-state">
            <div className="operator-empty-icon" aria-hidden="true" style={{opacity: 0.2}}>✓</div>
            <p className="operator-empty-title">No open Dependabot alerts</p>
            <p className="operator-empty-desc">
              {data.repos.length} tracked {data.repos.length === 1 ? 'repository' : 'repositories'} — the cured history below is the story.
            </p>
          </div>
        ) : (
          SEVERITY_ORDER.map(severity => {
            const count = severityCounts.get(severity) ?? 0
            const label = severity ?? 'UNKNOWN'
            return (
              <div
                key={label}
                data-testid={`security-severity-${label}`}
                style={{display: 'flex', alignItems: 'center', gap: 'var(--space-2)', margin: 'var(--space-1) 0'}}
              >
                <span className={severityChipClass(severity)} style={{minWidth: '6.5em', textAlign: 'center'}}>{label}</span>
                <div className="listener-progress" style={{flex: 1}} aria-hidden="true">
                  <div style={{width: `${Math.round((count / Math.max(openAlerts.length, 1)) * 100)}%`}} />
                </div>
                <span aria-label={`${label} count`}>{count}</span>
              </div>
            )
          })
        )}
      </section>

      {epssTop.length > 0 && (
        <section data-testid="security-epss-top" aria-label="Highest EPSS open alerts">
          <h3 className="operator-section-heading" style={{fontSize: 'var(--text-body-md)'}}>
            Highest EPSS (exploitation probability)
          </h3>
          {epssTop.map(alert => (
            <div key={alertPrimaryId(alert)} data-testid="security-epss-row" style={{display: 'flex', alignItems: 'center', gap: 'var(--space-2)', margin: 'var(--space-1) 0'}}>
              <span className={severityChipClass(alert.severity)}>{alert.severity ?? 'UNKNOWN'}</span>
              <span style={{minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis'}}>{alertPrimaryId(alert)}</span>
              <span title={alert.cvssV3Vector ?? undefined}>CVSS {alert.cvssV3Score ?? '—'}</span>
              <div className="listener-progress" style={{flex: 1}} aria-hidden="true">
                <div style={{width: `${Math.round(((alert.epssPercentage ?? 0) * 100))}%`}} />
              </div>
              <span>{((alert.epssPercentage ?? 0) * 100).toFixed(2)}%</span>
              <span style={{color: 'var(--color-text-muted)'}}>p{((alert.epssPercentile ?? 0) * 100).toFixed(0)}</span>
            </div>
          ))}
        </section>
      )}

      <section data-testid="security-recent-cures" aria-label="Recently cured alerts">
        <h3 className="operator-section-heading" style={{fontSize: 'var(--text-body-md)'}}>
          Recently cured
        </h3>
        {reposWithCures.length === 0 && (
          <p data-testid="security-no-cures" style={{color: 'var(--color-text-muted)'}}>
            No cured alerts recorded yet{degradedRepos.length > 0 ? ' (some repos are permission-degraded — see below)' : ''}.
          </p>
        )}
        {reposWithCures.map(repo => (
          <div key={repo.fullName} data-testid="security-cure-repo" style={{marginBottom: 'var(--space-3)'}}>
            <h4 style={{marginBottom: 'var(--space-1)'}}>{repo.fullName}</h4>
            <p style={{fontSize: 'var(--text-body-sm)', color: 'var(--color-text-muted)', margin: 0}}>
              {repo.posture?.recentCureCount ?? 0} lifetime cures · showing most recent {repo.posture?.recentCures.length ?? 0}
            </p>
            <ul style={{listStyle: 'none', padding: 0, margin: 'var(--space-1) 0 0'}}>
              {repo.posture?.recentCures.map(alert => <CureRow key={alertPrimaryId(alert)} alert={alert} />)}
            </ul>
          </div>
        ))}
      </section>

      {degradedRepos.length > 0 && (
        <section data-testid="security-degraded" className="operator-warning-panel" role="status">
          {degradedRepos.map(repo => (
            <p key={repo.fullName} style={{margin: 0}}>
              {repo.fullName} — security alerts permission unavailable (token lacks the alerts scope); counts and cures are hidden, not guessed.
            </p>
          ))}
        </section>
      )}

      <div data-testid="security-footer" style={{fontSize: 'var(--text-body-sm)', color: 'var(--color-text-muted)'}}>
        {newestCuresFetch !== null && <span>cures walked {new Date(newestCuresFetch).toLocaleString()} · </span>}
        {refreshedAt !== null ? <span>refreshed {refreshedAt}</span> : <span>never refreshed</span>}
      </div>
    </div>
  )
}

function CureRow({alert}: {alert: SecurityAlert}) {
  const advisoryUrl = alert.advisoryUrl
  return (
    <li
      data-testid="security-cure-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        flexWrap: 'wrap',
        padding: 'var(--space-1) 0',
        borderTop: '1px solid var(--color-border-subtle, rgba(128,128,128,0.25))',
      }}
    >
      <span className={severityChipClass(alert.severity)}>{alert.severity ?? 'UNKNOWN'}</span>
      {advisoryUrl === null ? (
        <span>{alertPrimaryId(alert)}</span>
      ) : (
        <a href={advisoryUrl} target="_blank" rel="noreferrer">{alertPrimaryId(alert)}</a>
      )}
      {alert.cveId !== null && <span style={{color: 'var(--color-text-muted)'}}>{alert.cveId}</span>}
      <span>cured {fmtDate(alert.fixedAt ?? alert.createdAt)}</span>
      {alert.dependencyScope !== null && <span>({alert.dependencyScope.toLowerCase()})</span>}
      {alert.manifestPath !== null && <code style={{fontSize: 'var(--text-body-sm)'}}>{alert.manifestPath}</code>}
      {alert.vulnerableVersionRange !== null && (
        <span title={alert.cvssV3Vector ?? undefined}>
          {alert.vulnerableVersionRange}
          {alert.firstPatchedVersion !== null ? ` → ${alert.firstPatchedVersion}` : ' → (unpatched at cure)'}
        </span>
      )}
      {alert.updatePrUrl !== null && alert.updatePrState !== null && (
        <a href={alert.updatePrUrl} target="_blank" rel="noreferrer">cure PR ({alert.updatePrState.toLowerCase()})</a>
      )}
      {alert.withdrawnAt !== null && <span style={{color: 'var(--color-text-muted)'}}>(advisory withdrawn)</span>}
      {alert.cwes.length > 0 && (
        <span style={{color: 'var(--color-text-muted)'}}>{alert.cwes.join(' ')}</span>
      )}
    </li>
  )
}
