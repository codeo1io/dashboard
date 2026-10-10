/**
 * Client for /api/monitoring — the BFF monitoring DTO (rm-192 drill-down).
 *
 * Mirrors web/src/api/listener.ts conventions: strict runtime parse of the
 * server contract, `Result`-style return, no `any`. The DTO is the minimized
 * whitelist from src/routes/api.ts — internal fields never arrive here.
 */
import {withGetSeamTimeout} from './fetch-timeout.ts'

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

export interface RateLimitClassData {
  readonly cls: string
  readonly max: number
  readonly hits: number
}

export interface RateLimitBudgetData {
  readonly windowMs: number
  readonly maxKeys: number
  readonly trackedKeys: number
  readonly classes: readonly RateLimitClassData[]
}

export interface ListenerStoreStatusData {
  readonly rows: number
  readonly maxRows: number
  readonly maxAgeMs: number
  readonly oldestReceivedAt: string | null
  readonly unread: number
}

export interface SnapshotFreshnessData {
  readonly refreshedAt: number | null
  readonly staleBanner: boolean
  readonly refreshDegraded: boolean
  readonly refreshDurationMs: number | null
  readonly trackedRepos: number
  readonly driftCount: number
}

export interface RefreshFailureData {
  readonly enumerationIncomplete: number | null
  readonly degraded: boolean
}

/** rm-107: composed operator system-status surface (strictly parsed; absent when the server omits it). */
export interface SystemStatusData {
  readonly snapshot: SnapshotFreshnessData
  readonly refreshFailures: RefreshFailureData
  readonly rateLimit: RateLimitBudgetData
  readonly listenerStore: ListenerStoreStatusData | null
}

export interface MonitoringData {
  readonly repos: readonly MonitoringRepo[]
  /** Wall-clock duration (ms) of the last completed refresh attempt, or null when no cycle has stamped it yet (rm-156) */
  readonly refreshDurationMs: number | null
  /** True when the last refresh attempt exceeded the watchdog ceiling — data is being served but the walk is degraded (rm-156) */
  readonly refreshDegraded: boolean
  readonly staleBanner: boolean
  readonly driftCount: number
  readonly enumerationIncomplete: number | null
  readonly refreshedAt: number | null
  /** rm-107: present only when the server wired the system-status provider. */
  readonly system?: SystemStatusData
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
  // https://-only detailsUrl contract (mirrors the enforced link filter in
  // web/src/api/listener.ts): '' is the server's no-link value; any non-empty
  // value must be https:// — a non-https detailsUrl is contract drift and the
  // strict parse fails closed.
  if (detailsUrl !== '' && !detailsUrl.startsWith('https://')) return null
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

function parseRateLimitClass(item: unknown): RateLimitClassData | null {
  if (!isPlainObject(item)) return null
  if (typeof item.cls !== 'string') return null
  if (typeof item.max !== 'number' || typeof item.hits !== 'number') return null
  return {cls: item.cls, max: item.max, hits: item.hits}
}

function parseRateLimitBudget(item: unknown): RateLimitBudgetData | null {
  if (!isPlainObject(item)) return null
  if (
    typeof item.windowMs !== 'number' ||
    typeof item.maxKeys !== 'number' ||
    typeof item.trackedKeys !== 'number' ||
    !Array.isArray(item.classes)
  ) {
    return null
  }
  const classes: RateLimitClassData[] = []
  for (const entry of item.classes) {
    const parsed = parseRateLimitClass(entry)
    if (parsed === null) return null
    classes.push(parsed)
  }
  return {windowMs: item.windowMs, maxKeys: item.maxKeys, trackedKeys: item.trackedKeys, classes}
}

function parseListenerStoreStatus(item: unknown): ListenerStoreStatusData | null {
  if (!isPlainObject(item)) return null
  if (
    typeof item.rows !== 'number' ||
    typeof item.maxRows !== 'number' ||
    typeof item.maxAgeMs !== 'number' ||
    typeof item.unread !== 'number'
  ) {
    return null
  }
  if (item.oldestReceivedAt !== null && typeof item.oldestReceivedAt !== 'string') return null
  return {
    rows: item.rows,
    maxRows: item.maxRows,
    maxAgeMs: item.maxAgeMs,
    oldestReceivedAt: item.oldestReceivedAt,
    unread: item.unread,
  }
}

function parseSnapshotFreshness(item: unknown): SnapshotFreshnessData | null {
  if (!isPlainObject(item)) return null
  if (typeof item.staleBanner !== 'boolean' || typeof item.refreshDegraded !== 'boolean') return null
  if (item.refreshedAt !== null && typeof item.refreshedAt !== 'number') return null
  if (item.refreshDurationMs !== null && typeof item.refreshDurationMs !== 'number') return null
  if (typeof item.trackedRepos !== 'number' || typeof item.driftCount !== 'number') return null
  return {
    refreshedAt: item.refreshedAt,
    staleBanner: item.staleBanner,
    refreshDegraded: item.refreshDegraded,
    refreshDurationMs: item.refreshDurationMs,
    trackedRepos: item.trackedRepos,
    driftCount: item.driftCount,
  }
}

function parseRefreshFailure(item: unknown): RefreshFailureData | null {
  if (!isPlainObject(item)) return null
  if (item.enumerationIncomplete !== null && typeof item.enumerationIncomplete !== 'number') return null
  if (typeof item.degraded !== 'boolean') return null
  return {enumerationIncomplete: item.enumerationIncomplete, degraded: item.degraded}
}

/**
 * rm-107: strict parse of the composed system-status surface. Absent on the
 * wire → undefined (older server); present but malformed → null (contract
 * drift — the caller rejects the payload rather than half-rendering status).
 */
function parseSystemStatus(item: unknown): SystemStatusData | undefined | null {
  if (item === undefined) return undefined
  if (!isPlainObject(item)) return null
  const snapshot = parseSnapshotFreshness(item.snapshot)
  const refreshFailures = parseRefreshFailure(item.refreshFailures)
  const rateLimit = parseRateLimitBudget(item.rateLimit)
  if (snapshot === null || refreshFailures === null || rateLimit === null) return null
  if (item.listenerStore === undefined) return null
  const listenerStore =
    item.listenerStore === null ? null : parseListenerStoreStatus(item.listenerStore)
  if (listenerStore === null && item.listenerStore !== null) return null
  return {snapshot, refreshFailures, rateLimit, listenerStore}
}

export async function fetchMonitoring(opts: {abortSignal?: AbortSignal} = {}): Promise<FetchMonitoringResult> {
  try {
    // rm-780: the seam carries its own wall-clock bound (see fetch-timeout.ts)
    // — the view-level `useBoundedPoll` bound only protects poll callers.
    const res = await withGetSeamTimeout(
      fetch('/api/monitoring', {
        method: 'GET',
        credentials: 'same-origin',
        signal: opts.abortSignal,
      }),
    )
    if (res === 'timeout') return {ok: false, reason: 'timeout'}

    if (!res.ok) {
      // rm-273: 401 is session expiry, not a transport failure — classify it
      // so the UI can offer a sign-in affordance instead of blaming the
      // network (the operator's session expired, the dashboard did not break).
      if (res.status === 401) {
        return { ok: false, reason: 'unauthenticated' }
      }
      return { ok: false, reason: 'network' }
    }

    // rm-515 (rm-421b twin): a followed redirect means the gateway bounced
    // the request to the login surface (302 → login HTML → 200); without this
    // guard the JSON read below throws and the catch blames the network.
    if (res.redirected) {
      return { ok: false, reason: 'unauthenticated' }
    }

    const data = await withGetSeamTimeout(res.json())
    if (data === 'timeout') return {ok: false, reason: 'timeout'}
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
    // rm-107: the watchdog pair is part of the server DTO (src/routes/api.ts)
    // and must survive this whitelist — dropping it would hide a degraded walk
    // (rm-156) from the operator UI. null refreshDurationMs is legal (no
    // cycle has stamped a snapshot yet); refreshDegraded is always present.
    if (data.refreshDurationMs !== null && typeof data.refreshDurationMs !== 'number') {
      return {ok: false, reason: 'contract-drift'}
    }
    if (typeof data.refreshDegraded !== 'boolean') {
      return {ok: false, reason: 'contract-drift'}
    }

    // rm-107: the composed system-status surface is optional on the wire
    // (bare-router servers omit it), but a present-but-malformed object is
    // contract drift — reject rather than silently dropping operator status.
    const system = parseSystemStatus(data.system)
    if (system === null) return {ok: false, reason: 'contract-drift'}

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
        refreshDurationMs: data.refreshDurationMs,
        refreshDegraded: data.refreshDegraded,
        ...(system === undefined ? {} : {system}),
      },
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return {ok: false, reason: 'timeout'}
    }
    return {ok: false, reason: 'network'}
  }
}
