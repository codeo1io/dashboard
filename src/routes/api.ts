import type {
  AggregatorRefreshStats,
  AggregatorSnapshot,
  DashboardRepo,
  FailingCheckDetail,
  RepoCiStatus,
} from '../github/aggregator.ts'
import type {RateLimitBudget} from '../github/app-client.ts'
import type {ListenerStats} from '../listener/store.ts'
import {Hono} from 'hono'
import {COLD_START_SNAPSHOT} from '../github/aggregator.ts'

/** Injectable snapshot provider — returns the current aggregator snapshot. */
export type SnapshotProvider = () => AggregatorSnapshot

// rm-197: this route and server.ts import the single bannered
// COLD_START_SNAPSHOT constant from aggregator.ts (which carries the rm-156
// watchdog fields); the standalone EMPTY_SNAPSHOT literal is gone. (rm-270:
// reworded — the original note was phrased relative to the authoring run,
// which reads as noise on main.)
// ---------------------------------------------------------------------------
// Client DTO — /api/monitoring
//
// The SPA is an untrusted display-only client. This DTO exposes ONLY what the
// monitoring UI needs. Internal fields (node_id, owner, name, fetchedAt,
// installation_id, redactedNodeIds, redactedDatabaseIds) are NEVER emitted.
// ---------------------------------------------------------------------------

interface MonitoringRepoStatusDto {
  readonly rollupState: RepoCiStatus['rollupState']
  readonly failingChecks: number
  /**
   * Drill-down details for failing check runs (rm-192): which check failed,
   * in which workflow run. Bounded by FAILING_CHECK_DETAILS_CAP. URLs are
   * public GitHub check-run pages — safe for the display-only client.
   */
  readonly failingCheckDetails: readonly FailingCheckDetail[]
  readonly openPrCount: number
  readonly openIssueCount: number
  readonly openAlertCount: number | null
  readonly stale: boolean
}

interface MonitoringRepoDto {
  readonly full_name: string
  readonly discovery_channel: string
  readonly status: MonitoringRepoStatusDto
}

interface MonitoringDto {
  readonly repos: readonly MonitoringRepoDto[]
  readonly staleBanner: boolean
  readonly driftCount: number
  /** Count of installations that failed during the enumeration feeding this snapshot; null = unknown. */
  readonly enumerationIncomplete: number | null
  readonly refreshedAt: number | null
  /** Wall-clock duration (ms) of the last completed refresh attempt (rm-156 watchdog signal) */
  readonly refreshDurationMs: number | null
  /** True when the last refresh attempt exceeded the watchdog ceiling (rm-156 watchdog signal) */
  readonly refreshDegraded: boolean
}

// ---------------------------------------------------------------------------
// Diagnostic composite — /api/monitor (rm-107 cycle-1 batch, run be59a16e)
//
// Operator-only diagnostic surface composing the fleet-data plane's own
// truth: App-client rate-limit budget, listener backlog depth, and the
// aggregator's monotone refresh telemetry. Everything here is diagnostic —
// no new GitHub query is issued; each provider reads state the running
// processes already maintain.
// ---------------------------------------------------------------------------

/** Rate-limit budget observed from App-client response headers + event counters. */
export type MonitorRateLimitDto = RateLimitBudget

/** Listener backlog telemetry (depth/age against the retention window). */
export type MonitorListenerDto = ListenerStats

export interface MonitorRefreshDto {
  /** Outcome of the last completed attempt; null before the first attempt. */
  readonly lastOutcome: 'ok' | 'failed' | null
  /** Consecutive fail-visible attempts; resets only on a clean success (monotone under failure). */
  readonly failStreak: number
  /** Epoch ms of the last attempt's start; null before the first attempt. */
  readonly lastAttemptAt: number | null
  /** Epoch ms of the last clean success; null before the first success. */
  readonly lastSuccessAt: number | null
  /** Watchdog wall-clock duration (ms) of the last completed attempt; null when never stamped. */
  readonly durationMs: number | null
  /** True when the watchdog ceiling was exceeded or degraded state is preserved (sticky). */
  readonly degraded: boolean
  /** True when the served snapshot is fail-visible (stale banner). */
  readonly staleBanner: boolean
  /** Epoch ms of the served snapshot's last successful refresh; null when cold. */
  readonly refreshedAt: number | null
}

export interface MonitorDto {
  /** Data freshness: true while the served snapshot is not fail-visible. */
  readonly ok: boolean
  /**
   * Monotone composite health reading. Precedence stale > degraded > ok:
   * a fail-closed refresh can never improve the reading — a forced failure
   * either raises it to 'stale' (banner) or holds 'degraded' (sticky degraded
   * / failStreak > 0). Only a fully successful refresh may lower it.
   */
  readonly health: 'ok' | 'degraded' | 'stale'
  /** Null when the provider is not wired (observability degrades, never fabricates). */
  readonly rateLimit: MonitorRateLimitDto | null
  readonly listener: MonitorListenerDto | null
  readonly refresh: MonitorRefreshDto
  readonly generatedAt: number
}

/** Injectable diagnostic providers for /api/monitor. All optional. */
export interface MonitorProviders {
  /** rm-107 S1: App-client rate-limit budget recorder snapshot. */
  readonly getRateLimitStats?: () => RateLimitBudget
  /** rm-107 S2: listener backlog stats accessor. */
  readonly getListenerStats?: () => ListenerStats
  /** rm-107 S3: aggregator monotone refresh telemetry. */
  readonly getRefreshStats?: () => AggregatorRefreshStats
}

function toMonitorDto(
  snapshot: AggregatorSnapshot,
  providers: MonitorProviders | undefined,
): MonitorDto {
  const refresh: MonitorRefreshDto = {
    lastOutcome: providers?.getRefreshStats === undefined ? null : providers.getRefreshStats().lastOutcome,
    failStreak: providers?.getRefreshStats === undefined ? 0 : providers.getRefreshStats().failStreak,
    lastAttemptAt: providers?.getRefreshStats === undefined ? null : providers.getRefreshStats().lastAttemptAt,
    lastSuccessAt: providers?.getRefreshStats === undefined ? null : providers.getRefreshStats().lastSuccessAt,
    durationMs: snapshot.refreshDurationMs,
    degraded: snapshot.refreshDegraded,
    staleBanner: snapshot.staleBanner,
    refreshedAt: snapshot.refreshedAt,
  }
  const health = refresh.staleBanner ? 'stale' : refresh.degraded || refresh.failStreak > 0 ? 'degraded' : 'ok'
  return {
    ok: !refresh.staleBanner,
    health,
    rateLimit: providers?.getRateLimitStats === undefined ? null : providers.getRateLimitStats(),
    listener: providers?.getListenerStats === undefined ? null : providers.getListenerStats(),
    refresh,
    generatedAt: Date.now(),
  }
}

function toMonitoringRepoDto(repo: DashboardRepo): MonitoringRepoDto {
  return {
    full_name: repo.full_name,
    discovery_channel: repo.discovery_channel,
    status: {
      rollupState: repo.status.rollupState,
      failingChecks: repo.status.failingChecks,
      failingCheckDetails: repo.status.failingCheckDetails,
      openPrCount: repo.status.openPrCount,
      openIssueCount: repo.status.openIssueCount,
      openAlertCount: repo.status.openAlertCount,
      stale: repo.status.stale,
    },
  }
}

function toMonitoringDto(snapshot: AggregatorSnapshot): MonitoringDto {
  return {
    repos: snapshot.repos.map(toMonitoringRepoDto),
    staleBanner: snapshot.staleBanner,
    driftCount: snapshot.driftCount,
    enumerationIncomplete: snapshot.enumerationIncomplete,
    refreshedAt: snapshot.refreshedAt,
    refreshDurationMs: snapshot.refreshDurationMs,
    refreshDegraded: snapshot.refreshDegraded,
  }
}

/**
 * Builds the API router.
 *
 * @param getSnapshot - Optional snapshot provider. When absent, returns an empty snapshot.
 *   In production, the real aggregator's `getSnapshot` is injected via server.ts.
 *   Tests inject a fake.
 */
export function buildApiRouter(getSnapshot?: SnapshotProvider, providers?: MonitorProviders): Hono {
  const api = new Hono()

  api.get('/healthz', c => {
    return c.json({ok: true, lastFetch: null, rateLimit: null})
  })

  /**
   * Authenticated internal status API — returns the full AggregatorSnapshot.
   * This endpoint is for internal/operator use only. It is NOT the client DTO.
   * If you need to add a consumer, prefer /api/monitoring (the minimized DTO).
   */
  api.get('/status', c => {
    const snapshot = getSnapshot === undefined ? COLD_START_SNAPSHOT : getSnapshot()
    c.header('Cache-Control', 'no-store')
    return c.json(snapshot)
  })

  /**
   * BFF aggregation endpoint for the SPA monitoring view.
   *
   * Returns a MINIMIZED client DTO — only the fields the monitoring UI needs.
   * Internal fields (node_id, owner, name, fetchedAt, installation_id,
   * redactedNodeIds, redactedDatabaseIds) are NEVER emitted to the SPA client.
   *
   * Security invariants:
   * - Cache-Control: no-store — snapshot must never be cached by intermediaries.
   * - Behind auth — the auth middleware in server.ts denies unauthenticated requests.
   * - The SPA is untrusted display-only. Redaction is guaranteed at the aggregator seam.
   * - Denylisted/private repo identifiers are NEVER present in the snapshot output.
   * - The DTO mapper is the final whitelist: only explicitly mapped fields are emitted.
   */
  api.get('/monitoring', c => {
    const snapshot = getSnapshot === undefined ? COLD_START_SNAPSHOT : getSnapshot()
    c.header('Cache-Control', 'no-store')
    return c.json(toMonitoringDto(snapshot))
  })

  /**
   * Operator diagnostic composite (rm-107 cycle-1 batch): composes the
   * rate-limit budget, listener backlog, and monotone refresh telemetry into
   * one reading. Behind auth like every other /api route; never cached.
   */
  api.get('/monitor', c => {
    const snapshot = getSnapshot === undefined ? COLD_START_SNAPSHOT : getSnapshot()
    c.header('Cache-Control', 'no-store')
    return c.json(toMonitorDto(snapshot, providers))
  })

  return api
}
