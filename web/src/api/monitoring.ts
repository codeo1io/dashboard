/**
 * Client for /api/monitoring — the BFF monitoring DTO (rm-192 drill-down).
 *
 * Mirrors web/src/api/listener.ts conventions: strict runtime parse of the
 * server contract, `Result`-style return, no `any`. The DTO is the minimized
 * whitelist from src/routes/api.ts — internal fields never arrive here.
 */
export type CiRollupState = 'green' | 'red' | 'pending' | 'unknown'

export interface FailingCheckDetail {
  readonly workflowTitle: string | null
  readonly runAttempt: number | null
  readonly checkName: string
  readonly detailsUrl: string
}

export interface MonitoringRepoStatus {
  readonly rollupState: CiRollupState
  readonly failingChecks: number
  readonly failingCheckDetails: readonly FailingCheckDetail[]
  readonly openPrCount: number
  readonly openIssueCount: number
  readonly openAlertCount: number | null
  readonly stale: boolean
}

export interface MonitoringRepo {
  readonly fullName: string
  readonly discoveryChannel: string
  readonly status: MonitoringRepoStatus
}

export interface MonitoringData {
  readonly repos: readonly MonitoringRepo[]
  readonly staleBanner: boolean
  readonly driftCount: number
  readonly enumerationIncomplete: number | null
  readonly refreshedAt: number | null
}

export type FetchMonitoringResult =
  | { ok: true; data: MonitoringData }
  | { ok: false; reason: 'timeout' | 'network' | 'unauthenticated' | 'contract-drift' }

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val)
}

function parseFailingCheckDetail(item: unknown): FailingCheckDetail | null {
  if (!isPlainObject(item)) return null
  const {workflowTitle, runAttempt, checkName, detailsUrl} = item
  if (workflowTitle !== null && typeof workflowTitle !== 'string') return null
  if (runAttempt !== null && typeof runAttempt !== 'number') return null
  if (typeof checkName !== 'string' || typeof detailsUrl !== 'string') return null
  return {workflowTitle, runAttempt, checkName, detailsUrl}
}

const ROLLUP_STATES: readonly string[] = ['green', 'red', 'pending', 'unknown']

function parseRepo(item: unknown): MonitoringRepo | null {
  if (!isPlainObject(item)) return null
  const {full_name, discovery_channel, status} = item
  if (typeof full_name !== 'string' || typeof discovery_channel !== 'string') return null
  if (!isPlainObject(status)) return null

  const {
    rollupState,
    failingChecks,
    failingCheckDetails,
    openPrCount,
    openIssueCount,
    openAlertCount,
    stale,
  } = status
  if (typeof rollupState !== 'string' || !ROLLUP_STATES.includes(rollupState)) return null
  if (typeof failingChecks !== 'number') return null
  if (typeof openPrCount !== 'number' || typeof openIssueCount !== 'number') return null
  if (openAlertCount !== null && typeof openAlertCount !== 'number') return null
  if (typeof stale !== 'boolean') return null
  if (!Array.isArray(failingCheckDetails)) return null

  const details: FailingCheckDetail[] = []
  for (const detail of failingCheckDetails) {
    const parsed = parseFailingCheckDetail(detail)
    if (parsed === null) return null
    details.push(parsed)
  }

  return {
    fullName: full_name,
    discoveryChannel: discovery_channel,
    status: {
      rollupState: rollupState as MonitoringRepoStatus['rollupState'],
      failingChecks,
      failingCheckDetails: details,
      openPrCount,
      openIssueCount,
      openAlertCount,
      stale,
    },
  }
}

export async function fetchMonitoring(opts: {abortSignal?: AbortSignal} = {}): Promise<FetchMonitoringResult> {
  try {
    const res = await fetch('/api/monitoring', {
      method: 'GET',
      credentials: 'same-origin',
      signal: opts.abortSignal,
    })

    if (!res.ok) {
      // rm-273: 401 is session expiry, not a transport failure — classify it
      // so the UI can offer a sign-in affordance instead of blaming the
      // network (the operator's session expired, the dashboard did not break).
      if (res.status === 401) {
        return { ok: false, reason: 'unauthenticated' }
      }
      return { ok: false, reason: 'network' }
    }

    const data = await res.json()
    if (!isPlainObject(data) || !Array.isArray(data.repos)) return {ok: false, reason: 'contract-drift'}
    if (typeof data.staleBanner !== 'boolean' || typeof data.driftCount !== 'number') {
      return {ok: false, reason: 'contract-drift'}
    }
    if (data.enumerationIncomplete !== null && typeof data.enumerationIncomplete !== 'number') {
      return {ok: false, reason: 'contract-drift'}
    }
    if (data.refreshedAt !== null && typeof data.refreshedAt !== 'number') {
      return {ok: false, reason: 'contract-drift'}
    }

    const repos: MonitoringRepo[] = []
    for (const item of data.repos) {
      const parsed = parseRepo(item)
      if (parsed === null) return {ok: false, reason: 'contract-drift'}
      repos.push(parsed)
    }

    return {
      ok: true,
      data: {
        repos,
        staleBanner: data.staleBanner,
        driftCount: data.driftCount,
        enumerationIncomplete: data.enumerationIncomplete,
        refreshedAt: data.refreshedAt,
      },
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return {ok: false, reason: 'timeout'}
    }
    return {ok: false, reason: 'network'}
  }
}

// rm-107 S1/S2/S3 (cycle-1 batch, run be59a16e): the monitoring composite —
// the data plane's OWN truth (token budget, listener backlog, refresh
// health), composed server-side so the reading is monotone under failure by
// construction. Mirrors the /api/monitor DTO from src/routes/api.ts.
export type MonitorHealth = 'ok' | 'degraded' | 'stale'

export interface MonitorRateLimit {
  readonly limit: number | null
  readonly remaining: number | null
  readonly resetAt: number | null
  readonly observedAt: number | null
  readonly takenEvents: number | null
  readonly secondaryEvents: number | null
}

export interface MonitorListener {
  readonly unread: number
  readonly retained: number
  readonly oldestUnreadAgeMs: number | null
  readonly retentionMaxRows: number
}

export interface MonitorRefresh {
  readonly lastOutcome: 'ok' | 'failed' | null
  readonly failStreak: number
  readonly lastAttemptAt: number | null
  readonly lastSuccessAt: number | null
  readonly durationMs: number | null
  readonly degraded: boolean
  readonly staleBanner: boolean
  readonly refreshedAt: number | null
}

export interface MonitorData {
  readonly ok: boolean
  readonly health: MonitorHealth
  readonly rateLimit: MonitorRateLimit | null
  readonly listener: MonitorListener | null
  readonly refresh: MonitorRefresh
  readonly generatedAt: number
}

export type FetchMonitorResult =
  | { ok: true; data: MonitorData }
  | { ok: false; reason: 'timeout' | 'network' | 'unauthenticated' | 'contract-drift' }

function parseMonitorRateLimit(val: unknown): MonitorRateLimit | null {
  if (!isPlainObject(val)) return null
  const {limit, remaining, resetAt, observedAt, takenEvents, secondaryEvents} = val
  if (limit !== null && typeof limit !== 'number') return null
  if (remaining !== null && typeof remaining !== 'number') return null
  if (resetAt !== null && typeof resetAt !== 'number') return null
  if (observedAt !== null && typeof observedAt !== 'number') return null
  if (takenEvents !== null && typeof takenEvents !== 'number') return null
  if (secondaryEvents !== null && typeof secondaryEvents !== 'number') return null
  return {limit, remaining, resetAt, observedAt, takenEvents, secondaryEvents}
}

function parseMonitorListener(val: unknown): MonitorListener | null {
  if (!isPlainObject(val)) return null
  const {unread, retained, oldestUnreadAgeMs, retentionMaxRows} = val
  if (typeof unread !== 'number' || typeof retained !== 'number') return null
  if (oldestUnreadAgeMs !== null && typeof oldestUnreadAgeMs !== 'number') return null
  if (typeof retentionMaxRows !== 'number') return null
  return {unread, retained, oldestUnreadAgeMs, retentionMaxRows}
}

function parseMonitorRefresh(val: unknown): MonitorRefresh | null {
  if (!isPlainObject(val)) return null
  const {
    lastOutcome,
    failStreak,
    lastAttemptAt,
    lastSuccessAt,
    durationMs,
    degraded,
    staleBanner,
    refreshedAt,
  } = val
  if (lastOutcome !== null && lastOutcome !== 'ok' && lastOutcome !== 'failed') return null
  if (typeof failStreak !== 'number' || !Number.isFinite(failStreak)) return null
  if (typeof degraded !== 'boolean' || typeof staleBanner !== 'boolean') return null
  if (lastAttemptAt !== null && typeof lastAttemptAt !== 'number') return null
  if (lastSuccessAt !== null && typeof lastSuccessAt !== 'number') return null
  if (durationMs !== null && typeof durationMs !== 'number') return null
  if (refreshedAt !== null && typeof refreshedAt !== 'number') return null
  return {lastOutcome, failStreak, lastAttemptAt, lastSuccessAt, durationMs, degraded, staleBanner, refreshedAt}
}

export async function fetchMonitor(opts: {abortSignal?: AbortSignal} = {}): Promise<FetchMonitorResult> {
  try {
    const res = await fetch('/api/monitor', {
      method: 'GET',
      credentials: 'same-origin',
      signal: opts.abortSignal,
    })

    if (!res.ok) {
      // rm-273 convention: 401 is session expiry, not transport failure.
      if (res.status === 401) {
        return {ok: false, reason: 'unauthenticated'}
      }
      return {ok: false, reason: 'network'}
    }

    const data = await res.json()
    if (!isPlainObject(data)) return {ok: false, reason: 'contract-drift'}
    if (typeof data.ok !== 'boolean' || typeof data.generatedAt !== 'number') {
      return {ok: false, reason: 'contract-drift'}
    }
    if (data.health !== 'ok' && data.health !== 'degraded' && data.health !== 'stale') {
      return {ok: false, reason: 'contract-drift'}
    }

    let rateLimit: MonitorRateLimit | null = null
    if (data.rateLimit !== null) {
      const parsed = parseMonitorRateLimit(data.rateLimit)
      if (parsed === null) return {ok: false, reason: 'contract-drift'}
      rateLimit = parsed
    }

    let listener: MonitorListener | null = null
    if (data.listener !== null) {
      const parsed = parseMonitorListener(data.listener)
      if (parsed === null) return {ok: false, reason: 'contract-drift'}
      listener = parsed
    }

    const refresh = parseMonitorRefresh(data.refresh)
    if (refresh === null) return {ok: false, reason: 'contract-drift'}

    return {
      ok: true,
      data: {
        ok: data.ok,
        health: data.health,
        rateLimit,
        listener,
        refresh,
        generatedAt: data.generatedAt,
      },
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return {ok: false, reason: 'timeout'}
    }
    return {ok: false, reason: 'network'}
  }
}
