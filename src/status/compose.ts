/**
 * System-status composition (rm-107): the single place that composes the
 * dashboard process's OWN health signals — snapshot freshness, GitHub
 * rate-limit pressure, listener-store depth/age, and recent refresh
 * failures — into the `system` block of /api/monitoring.
 *
 * Process-level registry BY DESIGN: the status surface answers "is THIS
 * dashboard process healthy", and its feeds (the throttle hooks in
 * app-client, the fail-visible paths in the aggregator, the listener store)
 * attach at module wiring points that server.ts does not thread together
 * (the /api/monitoring route receives only the snapshot provider). Feeds
 * register here instead; the route composes. The aggregator/app-client/store
 * modules import this module's recorders (value imports pointing one way);
 * this module references their types with import-type only, so there is no
 * runtime import cycle.
 *
 * Tests reset the registry via resetSystemStatusForTests(); each feed site
 * also accepts an injected override where practical (see app-client).
 */
import type {AggregatorSnapshot} from '../github/aggregator.ts'

/** Which fail-visible path reported the failure. */
export type RefreshFailurePhase = 'metadata' | 'refresh'

export interface RefreshFailureEvent {
  readonly at: number
  readonly phase: RefreshFailurePhase
  /** Sanitized by the caller (aggregator fail paths run sanitizeErrorMessage); truncated here as a second belt. */
  readonly detail: string
}

export interface RateLimitCounters {
  readonly primaryCount: number
  readonly secondaryCount: number
  readonly lastEventAt: number | null
  readonly lastRetryAfterSeconds: number | null
}

/** Structural registration contract — no import from listener/store.ts needed (avoids a cycle). */
export interface ListenerStoreStatusSource {
  stats: () => {
    totalMessages: number
    unreadCount: number
    prunedTotal: number
    oldestReceivedAt: string | null
  }
}

/** Snapshot-shaped input so tests and the route can pass a partial/minimized snapshot. */
export type SystemStatusSnapshotInput = Pick<
  AggregatorSnapshot,
  'refreshedAt' | 'staleBanner' | 'refreshDurationMs' | 'refreshDegraded'
>

export interface SystemStatus {
  readonly composedAt: number
  readonly snapshot: {
    readonly refreshedAt: number | null
    readonly ageMs: number | null
    readonly staleBanner: boolean
    readonly refreshDurationMs: number | null
    readonly refreshDegraded: boolean
  }
  readonly rateLimit: RateLimitCounters
  readonly listenerStore: {
    readonly totalMessages: number
    readonly unreadCount: number
    readonly prunedTotal: number
    readonly oldestEventAgeSeconds: number | null
  } | null
  readonly lastRefreshFailures: readonly RefreshFailureEvent[]
}

/** Keep the failure ring small — this is a status surface, not a log. */
const REFRESH_FAILURES_CAP = 8
/** Second belt on caller-side sanitization: never let a long message bloat the DTO. */
const REFRESH_FAILURE_DETAIL_MAX = 160

const refreshFailures: RefreshFailureEvent[] = []

const rateLimitState = {
  primaryCount: 0,
  secondaryCount: 0,
  lastEventAt: null as number | null,
  lastRetryAfterSeconds: null as number | null,
}

let registeredStore: ListenerStoreStatusSource | null = null

export function recordRefreshFailure(
  phase: RefreshFailurePhase,
  detail: string,
  at: number = Date.now(),
): void {
  refreshFailures.push({at, phase, detail: detail.slice(0, REFRESH_FAILURE_DETAIL_MAX)})
  if (refreshFailures.length > REFRESH_FAILURES_CAP) {
    refreshFailures.splice(0, refreshFailures.length - REFRESH_FAILURES_CAP)
  }
}

export function recordRateLimitEvent(event: {
  secondary: boolean
  retryAfterSeconds: number
  at?: number
}): void {
  if (event.secondary) {
    rateLimitState.secondaryCount += 1
  } else {
    rateLimitState.primaryCount += 1
  }
  rateLimitState.lastEventAt = event.at ?? Date.now()
  rateLimitState.lastRetryAfterSeconds = event.retryAfterSeconds
}

/** Last-registered-wins: prod creates exactly one store; tests reset between cases. */
export function registerListenerStoreStatusSource(store: ListenerStoreStatusSource): void {
  registeredStore = store
}

export function unregisterListenerStoreStatusSource(store: ListenerStoreStatusSource): void {
  if (registeredStore === store) {
    registeredStore = null
  }
}

/** Test seam: clears every registry lane. Never call from prod paths. */
export function resetSystemStatusForTests(): void {
  refreshFailures.length = 0
  rateLimitState.primaryCount = 0
  rateLimitState.secondaryCount = 0
  rateLimitState.lastEventAt = null
  rateLimitState.lastRetryAfterSeconds = null
  registeredStore = null
}

/** Newest-first copy of the failure ring (bounded by REFRESH_FAILURES_CAP). */
function recentRefreshFailures(): readonly RefreshFailureEvent[] {
  return [...refreshFailures].reverse()
}

function rateLimitSnapshot(): RateLimitCounters {
  return {
    primaryCount: rateLimitState.primaryCount,
    secondaryCount: rateLimitState.secondaryCount,
    lastEventAt: rateLimitState.lastEventAt,
    lastRetryAfterSeconds: rateLimitState.lastRetryAfterSeconds,
  }
}

function listenerStoreBlock(now: number): SystemStatus['listenerStore'] {
  if (registeredStore === null) return null
  const stats = registeredStore.stats()
  const oldestMs = stats.oldestReceivedAt === null ? null : Date.parse(stats.oldestReceivedAt)
  const oldestEventAgeSeconds =
    oldestMs === null || Number.isNaN(oldestMs) ? null : Math.max(0, Math.round((now - oldestMs) / 1000))
  return {
    totalMessages: stats.totalMessages,
    unreadCount: stats.unreadCount,
    prunedTotal: stats.prunedTotal,
    oldestEventAgeSeconds,
  }
}

/**
 * Pure composition of the system block. `now` is injectable for tests; it is
 * read ONCE so composedAt/ageMs/oldestEventAgeSeconds are mutually coherent.
 */
export function composeSystemStatus(
  snapshot: SystemStatusSnapshotInput,
  opts: {now?: () => number} = {},
): SystemStatus {
  const nowMs = (opts.now ?? Date.now)()
  const ageMs = snapshot.refreshedAt === null ? null : Math.max(0, nowMs - snapshot.refreshedAt)
  return {
    composedAt: nowMs,
    snapshot: {
      refreshedAt: snapshot.refreshedAt,
      ageMs,
      staleBanner: snapshot.staleBanner,
      refreshDurationMs: snapshot.refreshDurationMs,
      refreshDegraded: snapshot.refreshDegraded,
    },
    rateLimit: rateLimitSnapshot(),
    listenerStore: listenerStoreBlock(nowMs),
    lastRefreshFailures: recentRefreshFailures(),
  }
}
