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
  /** Wall-clock ms-epoch of the read that produced this annotation. */
  readonly fetchedAt: number
}

/** Injectable seams — every knob overridable so tests never touch the network. */
export interface PlatformStatusOptions {
  readonly fetchFn?: typeof fetch
  readonly baseUrl?: string
  readonly timeoutMs?: number
  readonly now?: () => number
  readonly etagMemo?: PlatformStatusEtagMemo
}

/** Default public Statuspage v2 base (no trailing slash). */
export const PLATFORM_STATUS_BASE_URL = 'https://www.githubstatus.com/api/v2'

/**
 * Short bound for both reads. This is an advisory annotation riding a 60s
 * refresh cycle — it must never hold a cycle hostage, so the ceiling is far
 * below the aggregator's per-call deadline (15s) and the cycle interval.
 */
export const PLATFORM_STATUS_TIMEOUT_MS = 3_000

/**
 * rm-1447 follow-up (2026-10-17): each snapshot cycle used to issue two
 * unconditional third-party GETs to www.githubstatus.com (~2,880/day at the
 * default 60s refresh). The feeds serve ETags, so reads now revalidate with
 * If-None-Match and reuse the stored body per endpoint on 304 — still
 * read-only outbound GETs. The memo is injectable so tests stay network-free;
 * the module-level default carries state across the aggregator's cycles.
 */
export interface PlatformStatusEtagMemoEntry {
  etag?: string
  body?: unknown
}

export interface PlatformStatusEtagMemo {
  status?: PlatformStatusEtagMemoEntry
  components?: PlatformStatusEtagMemoEntry
}

const defaultEtagMemo: PlatformStatusEtagMemo = {}

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
interface ConditionalFetchOutcome {
  notModified: boolean
  body?: unknown
  etag?: string
}

async function fetchJson(
  fetchFn: typeof fetch,
  url: string,
  signal: AbortSignal,
  etag?: string,
): Promise<ConditionalFetchOutcome> {
  const headers: Record<string, string> = {accept: 'application/json'}
  if (etag !== undefined) {
    headers['if-none-match'] = etag
  }
  const res = await fetchFn(url, {signal, headers})
  if (res.status === 304) return {notModified: true}
  if (!res.ok) throw new Error(`status ${res.status}`)
  return {notModified: false, body: await res.json(), etag: res.headers.get('etag') ?? undefined}
}

// rm-1447 follow-up: fold If-None-Match revalidation into the outcome
// mapping — a 304 reuses the stored body for that endpoint; a 304 with no
// stored body (memo cleared mid-flight) degrades to a failed read so the
// fail-open/fail-closed paths below stay intact. Fresh bodies are memoized
// only alongside an etag.
function resolveMemoizedBody(
  memo: PlatformStatusEtagMemo,
  slot: 'status' | 'components',
  read: ConditionalFetchOutcome | null,
): unknown {
  if (read === null) {
    return null
  }
  const entry = (memo[slot] ??= {})
  if (read.notModified) {
    return entry.body ?? null
  }
  const body = read.body ?? null
  if (read.etag !== undefined && body !== null && typeof body === 'object') {
    entry.etag = read.etag
    entry.body = body
  }
  return body
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
    const memo = opts.etagMemo ?? defaultEtagMemo
    const [statusOutcome, componentsOutcome] = await Promise.allSettled([
      timeoutRace(fetchJson(fetchFn, `${baseUrl}/status.json`, signal, memo.status?.etag)),
      timeoutRace(fetchJson(fetchFn, `${baseUrl}/components.json`, signal, memo.components?.etag)),
    ])

    const statusBody =
      statusOutcome.status === 'fulfilled'
        ? (resolveMemoizedBody(memo, 'status', statusOutcome.value) as {status?: unknown} | null)
        : null
    const rawStatus = statusBody?.status
    const statusFields =
      typeof rawStatus === 'object' && rawStatus !== null ? (rawStatus as {indicator?: unknown; description?: unknown}) : null
    const overall = parseIndicator(statusFields?.indicator)
    const rawDescription = statusFields?.description
    const overallDescription =
      typeof rawDescription === 'string'
        ? truncateCodePoints(rawDescription, PLATFORM_STATUS_DESCRIPTION_MAX_CHARS)
        : ''

    let actions: PlatformComponentStatus | null = null
    const componentsBody =
      componentsOutcome.status === 'fulfilled'
        ? resolveMemoizedBody(memo, 'components', componentsOutcome.value)
        : null
    const componentsRaw =
      componentsBody !== null && Array.isArray((componentsBody as {components?: unknown}).components)
        ? (componentsBody as {components: unknown[]}).components
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

    // Nothing usable at all → annotation absent (fail-open), never a
    // fabricated "operational".
    if (overall === 'unknown' && actions === null && statusBody === null) {
      return null
    }

    return {overall, overallDescription, actions, fetchedAt: now()}
  } catch (error) {
    // Both reads raced the shared deadline and lost, or an unexpected throw —
    // fail-open with no annotation. Never propagate.
    logger.debug('Platform status fetch failed; serving no annotation (fail-open)', {
      error: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)),
    })
    return null
  }
}

// rm-1491: truncate on Unicode code points, never mid-surrogate-pair — a raw
// String#slice can split an astral character at the cut and ship a lone
// surrogate into the /api/monitoring DTO (renders as U+FFFD in the client).
// BMP-only and shorter text is identical to slice().
function truncateCodePoints(text: string, maxCodePoints: number): string {
  if (text.length <= maxCodePoints) {
    return text
  }
  let truncated = ''
  let count = 0
  for (const char of text) {
    if (count >= maxCodePoints) {
      break
    }
    truncated += char
    count += 1
  }
  return truncated
}
