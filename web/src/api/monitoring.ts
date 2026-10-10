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

export async function fetchMonitoring(opts: {abortSignal?: AbortSignal} = {}): Promise<FetchMonitoringResult> {
  try {
    // rm-780: the seam carries its own wall-clock bound (see fetch-timeout.ts)
    // — the view-level `useBoundedPoll` bound only protects poll callers.
    // rm-847: the seam also OWNS the transport abort now — the controller is
    // composed with the caller's poll signal (either side aborting cancels
    // the request), so a bound fire releases the connection instead of
    // racing 'timeout' over a live request.
    const controller = new AbortController()
    const signal =
      opts.abortSignal === undefined
        ? controller.signal
        : AbortSignal.any([opts.abortSignal, controller.signal])
    const res = await withGetSeamTimeout(
      fetch('/api/monitoring', {
        method: 'GET',
        credentials: 'same-origin',
        signal,
      }),
      controller,
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

    const data = await withGetSeamTimeout(res.json(), controller)
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
      },
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return {ok: false, reason: 'timeout'}
    }
    return {ok: false, reason: 'network'}
  }
}
