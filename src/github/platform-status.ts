/**
 * GitHub platform status reader (rm-1447).
 *
 * The public githubstatus.com Statuspage v2 API reports platform-wide
 * incidents — including the Actions component. While Actions run creation is
 * degraded (e.g. the 2026-10-09 outage window), every "green" CI rollup on
 * the dashboard is ambiguous: checks may be passing, or they may simply be
 * unable to register. This module annotates the monitoring snapshot with the
 * platform's own verdict so the fleet view can tell the two apart.
 *
 * Contract (fail-open in BOTH directions):
 * - Read-only outbound GETs to two public JSON endpoints. No auth, no new
 *   server endpoint, no new client surface beyond one additive DTO field.
 * - ANY failure — network error, timeout, non-200, non-JSON, unexpected
 *   shape — degrades to `null` (annotation absent), NEVER throws and never
 *   blocks or delays the aggregator's snapshot machinery.
 * - Unknown status vocabulary (Statuspage adds a value) clamps to
 *   'unknown' / null on the SERVER side so the client-side contract parse
 *   stays stable across third-party vocabulary drift.
 */
import {logger, sanitizeErrorMessage} from '../logger.ts'

/** Overall indicator from /api/v2/status.json (`status.indicator`). 'unknown' = absent/unrecognized. */
export type PlatformIndicator = 'none' | 'minor' | 'major' | 'critical' | 'maintenance' | 'unknown'

/** Per-component status from /api/v2/components.json (`components[].status`). */
export type PlatformComponentStatus =
  | 'operational'
  | 'degraded_performance'
  | 'partial_outage'
  | 'major_outage'
  | 'under_maintenance'

/** Maintenance-window status from /api/v2/scheduled-maintenances.json. */
export type PlatformMaintenanceStatus = 'scheduled' | 'in_progress'

/** An upcoming or underway platform maintenance window (rm-1467). */
export interface PlatformMaintenance {
  /** Bounded third-party text — display-only. */
  readonly name: string
  readonly status: PlatformMaintenanceStatus
  /** Bounded ISO timestamps (`scheduled_for` / `scheduled_until`). */
  readonly scheduledFor: string
  readonly scheduledUntil: string
}

/** How many maintenance windows ride the annotation — bounded so a noisy feed cannot flood the DTO. */
export const PLATFORM_STATUS_MAINTENANCE_MAX_ITEMS = 3

/**
 * The additive snapshot annotation. `actions` is null when the components
 * read failed or the Actions component was absent — overall platform truth
 * can still be present in that case.
 */
export interface PlatformStatus {
  /** Overall platform indicator; 'unknown' when the status read failed but another field is usable. */
  readonly overall: PlatformIndicator
  /** Human summary from the status feed, capped (bounded third-party text — display-only). */
  readonly overallDescription: string
  /** Actions component status; null = unknown (component read failed or absent). */
  readonly actions: PlatformComponentStatus | null
  /**
   * Upcoming/underway scheduled maintenance windows, soonest first (rm-1467).
   * Empty array when the maintenance read fails or reports nothing — a failed
   * maintenance read NEVER degrades the rest of the annotation.
   */
  readonly maintenances: readonly PlatformMaintenance[]
  /** Wall-clock ms-epoch of the read that produced this annotation. */
  readonly fetchedAt: number
}

/** Injectable seams — every knob overridable so tests never touch the network. */
export interface PlatformStatusOptions {
  readonly fetchFn?: typeof fetch
  readonly baseUrl?: string
  readonly timeoutMs?: number
  readonly now?: () => number
}

/** Default public Statuspage v2 base (no trailing slash). */
export const PLATFORM_STATUS_BASE_URL = 'https://www.githubstatus.com/api/v2'

/**
 * Short bound for both reads. This is an advisory annotation riding a 60s
 * refresh cycle — it must never hold a cycle hostage, so the ceiling is far
 * below the aggregator's per-call deadline (15s) and the cycle interval.
 */
export const PLATFORM_STATUS_TIMEOUT_MS = 3_000

/** Bound on third-party display text carried into the DTO (chars). */
export const PLATFORM_STATUS_DESCRIPTION_MAX_CHARS = 200

const PLATFORM_INDICATORS: readonly string[] = ['none', 'minor', 'major', 'critical', 'maintenance']
const PLATFORM_COMPONENT_STATUSES: readonly string[] = [
  'operational',
  'degraded_performance',
  'partial_outage',
  'major_outage',
  'under_maintenance',
]

function parseIndicator(raw: unknown): PlatformIndicator {
  return typeof raw === 'string' && PLATFORM_INDICATORS.includes(raw)
    ? (raw as PlatformIndicator)
    : 'unknown'
}

function parseComponentStatus(raw: unknown): PlatformComponentStatus | null {
  return typeof raw === 'string' && PLATFORM_COMPONENT_STATUSES.includes(raw)
    ? (raw as PlatformComponentStatus)
    : null
}

/** The component this annotation is about — the Actions pipeline itself. */
const ACTIONS_COMPONENT_NAME = 'Actions'

/** GET one endpoint and parse JSON; rejects on any transport/shape problem. */
async function fetchJson(fetchFn: typeof fetch, url: string, signal: AbortSignal): Promise<unknown> {
  const res = await fetchFn(url, {signal, headers: {accept: 'application/json'}})
  if (!res.ok) throw new Error(`status ${res.status}`)
  return res.json()
}

/**
 * Fetch the platform status. Returns null when nothing usable came back
 * (both reads failed) — the caller treats null as "annotation absent".
 * Never throws.
 */
export async function fetchPlatformStatus(opts: PlatformStatusOptions = {}): Promise<PlatformStatus | null> {
  const fetchFn = opts.fetchFn ?? fetch
  const baseUrl = (opts.baseUrl ?? PLATFORM_STATUS_BASE_URL).replace(/\/+$/, '')
  const timeoutMs = opts.timeoutMs ?? PLATFORM_STATUS_TIMEOUT_MS
  const now = opts.now ?? (() => Date.now())

  // One shared deadline for both reads. The signal is passed to the fetch
  // (a real fetch aborts) AND raced below, so even a signal-ignoring
  // injected fetch cannot hold the caller past the ceiling.
  const signal = AbortSignal.timeout(timeoutMs)
  const timeoutRace = async <T>(promise: Promise<T>): Promise<T> =>
    Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), {once: true})
      }),
    ])

  try {
    const [statusOutcome, componentsOutcome, maintenanceOutcome] = await Promise.allSettled([
      timeoutRace(fetchJson(fetchFn, `${baseUrl}/status.json`, signal)),
      timeoutRace(fetchJson(fetchFn, `${baseUrl}/components.json`, signal)),
      timeoutRace(fetchJson(fetchFn, `${baseUrl}/scheduled-maintenances.json`, signal)),
    ])

    const statusBody =
      statusOutcome.status === 'fulfilled' && typeof statusOutcome.value === 'object' && statusOutcome.value !== null
        ? (statusOutcome.value as {status?: unknown})
        : null
    const rawStatus = statusBody?.status
    const statusFields =
      typeof rawStatus === 'object' && rawStatus !== null ? (rawStatus as {indicator?: unknown; description?: unknown}) : null
    const overall = parseIndicator(statusFields?.indicator)
    const rawDescription = statusFields?.description
    const overallDescription =
      typeof rawDescription === 'string' ? rawDescription.slice(0, PLATFORM_STATUS_DESCRIPTION_MAX_CHARS) : ''

    let actions: PlatformComponentStatus | null = null
    const componentsRaw =
      componentsOutcome.status === 'fulfilled' &&
      typeof componentsOutcome.value === 'object' &&
      componentsOutcome.value !== null &&
      Array.isArray((componentsOutcome.value as {components?: unknown}).components)
        ? (componentsOutcome.value as {components: unknown[]}).components
        : null
    if (componentsRaw !== null) {
      for (const component of componentsRaw) {
        if (typeof component === 'object' && component !== null) {
          const {name, status} = component as {name?: unknown; status?: unknown}
          if (name === ACTIONS_COMPONENT_NAME) {
            actions = parseComponentStatus(status)
            break
          }
        }
      }
    }

    // Scheduled maintenance windows (rm-1467): filter to the live statuses —
    // the feed returns its FULL history, mostly 'completed' entries. Any
    // failure or unexpected shape leaves the list empty (fail-open) without
    // touching the rest of the annotation.
    const maintenances: PlatformMaintenance[] = []
    const maintenanceRaw =
      maintenanceOutcome.status === 'fulfilled' &&
      typeof maintenanceOutcome.value === 'object' &&
      maintenanceOutcome.value !== null &&
      Array.isArray((maintenanceOutcome.value as {scheduled_maintenances?: unknown}).scheduled_maintenances)
        ? (maintenanceOutcome.value as {scheduled_maintenances: unknown[]}).scheduled_maintenances
        : null
    if (maintenanceRaw !== null) {
      for (const entry of maintenanceRaw) {
        if (typeof entry !== 'object' || entry === null) continue
        const {name, status, scheduled_for: scheduledFor, scheduled_until: scheduledUntil} = entry as {
          name?: unknown
          status?: unknown
          scheduled_for?: unknown
          scheduled_until?: unknown
        }
        const maintenanceStatus: PlatformMaintenanceStatus | null =
          status === 'in_progress' ? 'in_progress' : status === 'scheduled' ? 'scheduled' : null
        if (maintenanceStatus === null) continue
        if (typeof name !== 'string' || typeof scheduledFor !== 'string' || typeof scheduledUntil !== 'string') {
          continue
        }
        maintenances.push({
          name: name.slice(0, PLATFORM_STATUS_DESCRIPTION_MAX_CHARS),
          status: maintenanceStatus,
          scheduledFor: scheduledFor.slice(0, 40),
          scheduledUntil: scheduledUntil.slice(0, 40),
        })
      }
      maintenances.sort((a, b) => (a.scheduledFor < b.scheduledFor ? -1 : a.scheduledFor > b.scheduledFor ? 1 : 0))
      maintenances.splice(PLATFORM_STATUS_MAINTENANCE_MAX_ITEMS)
    }

    // Nothing usable at all → annotation absent (fail-open), never a
    // fabricated "operational".
    if (overall === 'unknown' && actions === null && statusBody === null) {
      return null
    }

    return {overall, overallDescription, actions, maintenances, fetchedAt: now()}
  } catch (error) {
    // Both reads raced the shared deadline and lost, or an unexpected throw —
    // fail-open with no annotation. Never propagate.
    logger.debug('Platform status fetch failed; serving no annotation (fail-open)', {
      error: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)),
    })
    return null
  }
}
