// rm-917: optional+graceful GitHub Statuspage (v2) reader for the Actions
// component state. ANNOTATION-ONLY by contract:
//   - Banner truth always comes from run data (the aggregator's lastRunAt
//     evidence). This module's output may only ANNOTATE the silence banner.
//   - Fail-open discipline: ANY failure (network, shape, timeout) yields
//     `null` — the banner renders exactly as it would without this module.
//     A status-feed failure must never suppress, fabricate, or defer the
//     banner.
//   - KNOWN LIMITATION (recorded in ROADMAP rm-917): repo-scoped enforcement
//     actions (e.g. the 2026-10-09 run-creation disable) stay GREEN on
//     githubstatus — this catches the platform-incident class only.
// Client never fetches statuspage directly; this is server-side only.

export interface ActionsComponentStatus {
  /** Raw Statuspage component state, e.g. 'operational' | 'degraded_performance'. */
  readonly state: string
  /** When the state was fetched (ms epoch). */
  readonly fetchedAt: number
}

const STATUSPAGE_COMPONENTS_URL = 'https://www.githubstatus.com/api/v2/components.json'
const ACTIONS_COMPONENT_NAME = 'Actions'
/** Cache TTL: platform state changes on the scale of minutes; refetch at most this often. */
const CACHE_TTL_MS = 5 * 60 * 1000
/** Hard bound on the outbound fetch (mirrors the house deadline discipline). */
const FETCH_TIMEOUT_MS = 4_000

interface StatuspageComponent {
  readonly name?: unknown
  readonly status?: unknown
}

interface StatuspageResponse {
  readonly components?: unknown
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>

interface CacheEntry {
  readonly value: ActionsComponentStatus | null
  readonly at: number
}

let cache: CacheEntry | null = null
let inFlight: Promise<ActionsComponentStatus | null> | null = null

function parseState(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null
  const components = (body as StatuspageResponse).components
  if (!Array.isArray(components)) return null
  for (const component of components) {
    if (typeof component !== 'object' || component === null) continue
    const candidate = component as StatuspageComponent
    if (candidate.name === ACTIONS_COMPONENT_NAME && typeof candidate.status === 'string') {
      return candidate.status
    }
  }
  return null
}

async function fetchOnce(fetchImpl: FetchLike): Promise<ActionsComponentStatus | null> {
  const response = await fetchImpl(STATUSPAGE_COMPONENTS_URL, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {accept: 'application/json'},
  })
  if (!response.ok) return null
  const state = parseState(await response.json())
  if (state === null) return null
  return {state, fetchedAt: Date.now()}
}

/**
 * Read the Actions component state, best-effort. Never throws; returns null
 * when unavailable. Failures are NOT cached (the next call retries after the
 * in-flight settles) so a transient outage cannot pin a stale annotation.
 */
export async function readActionsComponentStatus(
  fetchImpl: FetchLike = globalThis.fetch,
): Promise<ActionsComponentStatus | null> {
  const now = Date.now()
  if (cache !== null && now - cache.at < CACHE_TTL_MS) return cache.value
  if (inFlight !== null) return inFlight
  const flight = (async () => {
    try {
      const value = await fetchOnce(fetchImpl)
      cache = {value, at: Date.now()}
      return value
    } catch {
      // Fail-open: no annotation. Deliberately do not cache failures.
      cache = {value: null, at: Date.now() - CACHE_TTL_MS}
      return null
    } finally {
      inFlight = null
    }
  })()
  inFlight = flight
  return flight
}

/** Test seam: reset the module cache + in-flight guard. */
export function resetStatuspageCacheForTests(): void {
  cache = null
  inFlight = null
}
