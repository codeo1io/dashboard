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

export interface MonitoringSystemStatus {
  readonly composedAt: number
  readonly snapshot: {
    readonly refreshedAt: number | null
    readonly ageMs: number | null
    readonly staleBanner: boolean
    readonly refreshDurationMs: number | null
    readonly refreshDegraded: boolean
  }
  readonly rateLimit: {
    readonly primaryCount: number
    readonly secondaryCount: number
    readonly lastEventAt: number | null
    readonly lastRetryAfterSeconds: number | null
  }
  readonly listenerStore: {
    readonly totalMessages: number
    readonly unreadCount: number
    readonly prunedTotal: number
    readonly oldestEventAgeSeconds: number | null
  } | null
  readonly lastRefreshFailures: readonly {readonly phase: string; readonly at: number; readonly detail: string}[]
}

export interface MonitoringData {
  readonly repos: readonly MonitoringRepo[]
  readonly staleBanner: boolean
  readonly driftCount: number
  readonly enumerationIncomplete: number | null
  readonly refreshedAt: number | null
  /**
   * rm-107: server-composed system block (snapshot freshness, rate-limit
   * counters, listener-store depth, recent refresh failures). Optional at the
   * seam — an older payload without it still parses, the view hides the strip.
   */
  readonly system?: MonitoringSystemStatus
}

export type FetchMonitoringResult =
  | { ok: true; data: MonitoringData }
  | { ok: false; reason: 'timeout' | 'network' | 'unauthenticated' | 'contract-drift' }

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val)
}

const isNumberOrNull = (val: unknown): val is number | null => val === null || typeof val === 'number'

/**
 * rm-107: strict parse of the /api/monitoring `system` block.
 *
 * Optional-field discipline: ABSENT → undefined (older payload tolerated);
 * PRESENT but malformed → undefined, which fetchMonitoring turns into a
 * contract-drift failure — a half-parsed system block must never render as
 * "system healthy". Nested optionality: `listenerStore: null` is the
 * server's explicit "no store in this process" (never a drift).
 */
function parseSystemStatus(raw: unknown): MonitoringSystemStatus | undefined {
  if (!isPlainObject(raw)) return undefined
  const {composedAt, snapshot, rateLimit, listenerStore, lastRefreshFailures} = raw
  if (typeof composedAt !== 'number') return undefined
  if (!isPlainObject(snapshot) || !isPlainObject(rateLimit) || !Array.isArray(lastRefreshFailures)) return undefined
  if (!isNumberOrNull(snapshot.refreshedAt) || !isNumberOrNull(snapshot.ageMs)) return undefined
  if (typeof snapshot.staleBanner !== 'boolean' || !isNumberOrNull(snapshot.refreshDurationMs)) return undefined
  if (typeof snapshot.refreshDegraded !== 'boolean') return undefined
  if (
    typeof rateLimit.primaryCount !== 'number' ||
    typeof rateLimit.secondaryCount !== 'number' ||
    !isNumberOrNull(rateLimit.lastEventAt) ||
    !isNumberOrNull(rateLimit.lastRetryAfterSeconds)
  ) {
    return undefined
  }
  let store: MonitoringSystemStatus['listenerStore'] = null
  if (listenerStore !== null && listenerStore !== undefined) {
    if (!isPlainObject(listenerStore)) return undefined
    if (
      typeof listenerStore.totalMessages !== 'number' ||
      typeof listenerStore.unreadCount !== 'number' ||
      typeof listenerStore.prunedTotal !== 'number' ||
      !isNumberOrNull(listenerStore.oldestEventAgeSeconds)
    ) {
      return undefined
    }
    store = {
      totalMessages: listenerStore.totalMessages,
      unreadCount: listenerStore.unreadCount,
      prunedTotal: listenerStore.prunedTotal,
      oldestEventAgeSeconds: listenerStore.oldestEventAgeSeconds,
    }
  }
  const failures: {phase: string; at: number; detail: string}[] = []
  for (const entry of lastRefreshFailures) {
    if (!isPlainObject(entry)) return undefined
    if (typeof entry.phase !== 'string' || typeof entry.at !== 'number' || typeof entry.detail !== 'string') return undefined
    failures.push({phase: entry.phase, at: entry.at, detail: entry.detail})
  }
  return {
    composedAt,
    snapshot: {
      refreshedAt: snapshot.refreshedAt,
      ageMs: snapshot.ageMs,
      staleBanner: snapshot.staleBanner,
      refreshDurationMs: snapshot.refreshDurationMs,
      refreshDegraded: snapshot.refreshDegraded,
    },
    rateLimit: {
      primaryCount: rateLimit.primaryCount,
      secondaryCount: rateLimit.secondaryCount,
      lastEventAt: rateLimit.lastEventAt,
      lastRetryAfterSeconds: rateLimit.lastRetryAfterSeconds,
    },
    listenerStore: store,
    lastRefreshFailures: failures,
  }
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

    // rm-515 (rm-421b twin): a followed redirect means the gateway bounced
    // the request to the login surface (302 → login HTML → 200); without this
    // guard the JSON read below throws and the catch blames the network.
    if (res.redirected) {
      return { ok: false, reason: 'unauthenticated' }
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
    // rm-107: the system block is optional at the wire, strict when present.
    const system = parseSystemStatus(data.system)
    if (data.system !== undefined && system === undefined) {
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
