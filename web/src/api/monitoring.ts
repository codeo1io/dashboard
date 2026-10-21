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

/** Overall platform indicator from the githubstatus feed ('unknown' = unrecognized/absent). */
export type PlatformIndicator = 'none' | 'minor' | 'major' | 'critical' | 'maintenance' | 'unknown'

/** Actions component status from the githubstatus feed. */
export type PlatformComponentStatus =
  | 'operational'
  | 'degraded_performance'
  | 'partial_outage'
  | 'major_outage'
  | 'under_maintenance'

/** rm-1447: platform-availability annotation riding the monitoring DTO. */
export interface PlatformStatusSummary {
  readonly overall: PlatformIndicator
  readonly overallDescription: string
  readonly actions: PlatformComponentStatus | null
  readonly fetchedAt: number
}

export interface MonitoringData {
  readonly repos: readonly MonitoringRepo[]
  readonly staleBanner: boolean
  readonly driftCount: number
  readonly enumerationIncomplete: number | null
  readonly refreshedAt: number | null
  /** rm-1447: null when the server could not fetch the feed (fail-open both directions). */
  readonly platformStatus: PlatformStatusSummary | null
}

export type FetchMonitoringResult =
  | { ok: true; data: MonitoringData }
  | { ok: false; reason: 'timeout' | 'network' | 'unauthenticated' | 'contract-drift' }

/**
 * rm-501: hard budget for every monitoring API call that is not already
 * bounded by a caller-supplied abort signal, mirroring the listener twin's
 * rm-1487 default (LISTENER_CALL_TIMEOUT_MS in web/src/api/listener.ts).
 * Every current caller rides useBoundedPoll's view-layer timeout race
 * (15s), but a caller passing no signal held an unbounded fetch — 10s keeps
 * this api-layer backstop strictly below that view budget and the web
 * testTimeout (30s), so jsdom suites never inherit a hang and a caller's
 * own tighter race still fires first.
 */
export const MONITORING_CALL_TIMEOUT_MS = 10_000

/**
 * rm-501: caller aborts reject as AbortError while AbortSignal.timeout()
 * rejects as TimeoutError — both mean "the call did not complete in its
 * budget" and must classify as `timeout`, never `network` (the listener twin
 * hit this exact seam under rm-1487).
 */
function isAbortClassError(err: unknown): boolean {
  return err instanceof DOMException && (err.name === 'AbortError' || err.name === 'TimeoutError')
}

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

const PLATFORM_INDICATORS: readonly string[] = ['none', 'minor', 'major', 'critical', 'maintenance', 'unknown']

const PLATFORM_COMPONENT_STATUSES: readonly string[] = [
  'operational',
  'degraded_performance',
  'partial_outage',
  'major_outage',
  'under_maintenance',
]

/**
 * rm-1447: strict parse of the optional platform annotation. The server
 * CLAMPS the third-party vocabulary ('unknown'/null holes) before emitting,
 * so a value outside these closed sets is genuine contract drift.
 */
function parsePlatformStatus(item: unknown): PlatformStatusSummary | null {
  if (!isPlainObject(item)) return null
  const {overall, overallDescription, actions, fetchedAt} = item
  if (typeof overall !== 'string' || !PLATFORM_INDICATORS.includes(overall)) return null
  if (typeof overallDescription !== 'string') return null
  if (actions !== null && (typeof actions !== 'string' || !PLATFORM_COMPONENT_STATUSES.includes(actions))) return null
  if (typeof fetchedAt !== 'number') return null
  return {
    overall: overall as PlatformIndicator,
    overallDescription,
    actions: actions as PlatformComponentStatus | null,
    fetchedAt,
  }
}

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
      // rm-501: api-layer default bound — a caller signal still wins, so a
      // view-layer budget keeps its meaning.
      signal: opts.abortSignal ?? AbortSignal.timeout(MONITORING_CALL_TIMEOUT_MS),
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
    // rm-1447: the platform annotation is OPTIONAL — absent/null is the
    // fail-open shape; present-but-malformed is contract drift.
    let platformStatus: PlatformStatusSummary | null = null
    if (data.platformStatus !== null && data.platformStatus !== undefined) {
      const parsed = parsePlatformStatus(data.platformStatus)
      if (parsed === null) return {ok: false, reason: 'contract-drift'}
      platformStatus = parsed
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
        platformStatus,
      },
    }
  } catch (err) {
    if (isAbortClassError(err)) {
      return {ok: false, reason: 'timeout'}
    }
    return {ok: false, reason: 'network'}
  }
}
