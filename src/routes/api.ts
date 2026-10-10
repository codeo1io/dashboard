import type {AggregatorSnapshot, DashboardRepo, FailingCheckDetail, RepoCiStatus} from '../github/aggregator.ts'
import type {ListenerStoreStats} from '../listener/store.ts'
import type {RateLimitBudgetSnapshot} from '../server.ts'
import {Hono} from 'hono'
import {COLD_START_SNAPSHOT} from '../github/aggregator.ts'

/** Injectable snapshot provider — returns the current aggregator snapshot. */
export type SnapshotProvider = () => AggregatorSnapshot

/**
 * rm-107: server-side system-status signal sources for the monitoring DTO's
 * composed `system` object. `rateLimit` is always available (module state in
 * server.ts); `listenerStore` is null when the channel is not mounted.
 * Identifier-free by construction — counts, caps, and timestamps only.
 */
export interface SystemStatusSignals {
  readonly rateLimit: RateLimitBudgetSnapshot
  readonly listenerStore: ListenerStoreStats | null
}

/** Injectable system-status provider (rm-107). */
export type SystemStatusProvider = () => SystemStatusSignals

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
  /**
   * rm-107: composed operator system-status surface. Present only when the
   * system-status provider is wired (production wiring in server.ts always
   * provides it; bare-router tests omit it).
   */
  readonly system?: MonitoringSystemStatusDto
}

/** Rate-limit per-class budget row (rm-107) — whitelist-mapped from RateLimitBudgetSnapshot. */
interface RateLimitClassDto {
  readonly cls: string
  readonly max: number
  readonly hits: number
}

interface RateLimitBudgetDto {
  readonly windowMs: number
  readonly maxKeys: number
  readonly trackedKeys: number
  readonly classes: readonly RateLimitClassDto[]
}

interface ListenerStoreStatusDto {
  readonly rows: number
  readonly maxRows: number
  readonly maxAgeMs: number
  readonly oldestReceivedAt: string | null
  readonly unread: number
}

/**
 * rm-107 snapshot-freshness signal: the whitelist is explicit so internal
 * snapshot fields cannot leak through this composition.
 */
interface SnapshotFreshnessDto {
  readonly refreshedAt: number | null
  readonly staleBanner: boolean
  readonly refreshDegraded: boolean
  readonly refreshDurationMs: number | null
  readonly trackedRepos: number
  readonly driftCount: number
}

/**
 * rm-107 refresh-failure signal: enumeration failures are count-only by the
 * redaction invariant; `degraded` composes the watchdog and denylist
 * failure flags into one honest "the walk is impaired" bit.
 */
interface RefreshFailureDto {
  readonly enumerationIncomplete: number | null
  readonly degraded: boolean
}

interface MonitoringSystemStatusDto {
  readonly snapshot: SnapshotFreshnessDto
  readonly refreshFailures: RefreshFailureDto
  readonly rateLimit: RateLimitBudgetDto
  readonly listenerStore: ListenerStoreStatusDto | null
}

function toSystemStatusDto(snapshot: AggregatorSnapshot, signals: SystemStatusSignals): MonitoringSystemStatusDto {
  return {
    snapshot: {
      refreshedAt: snapshot.refreshedAt,
      staleBanner: snapshot.staleBanner,
      refreshDegraded: snapshot.refreshDegraded,
      refreshDurationMs: snapshot.refreshDurationMs,
      trackedRepos: snapshot.repos.length,
      driftCount: snapshot.driftCount,
    },
    refreshFailures: {
      enumerationIncomplete: snapshot.enumerationIncomplete,
      degraded: snapshot.refreshDegraded || snapshot.staleBanner,
    },
    rateLimit: {
      windowMs: signals.rateLimit.windowMs,
      maxKeys: signals.rateLimit.maxKeys,
      trackedKeys: signals.rateLimit.trackedKeys,
      classes: signals.rateLimit.classes.map(row => ({cls: row.cls, max: row.max, hits: row.hits})),
    },
    listenerStore:
      signals.listenerStore === null
        ? null
        : {
            rows: signals.listenerStore.rows,
            maxRows: signals.listenerStore.maxRows,
            maxAgeMs: signals.listenerStore.maxAgeMs,
            oldestReceivedAt: signals.listenerStore.oldestReceivedAt,
            unread: signals.listenerStore.unread,
          },
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

function toMonitoringDto(snapshot: AggregatorSnapshot, signals?: SystemStatusSignals): MonitoringDto {
  return {
    repos: snapshot.repos.map(toMonitoringRepoDto),
    staleBanner: snapshot.staleBanner,
    driftCount: snapshot.driftCount,
    enumerationIncomplete: snapshot.enumerationIncomplete,
    refreshedAt: snapshot.refreshedAt,
    refreshDurationMs: snapshot.refreshDurationMs,
    refreshDegraded: snapshot.refreshDegraded,
    ...(signals === undefined ? {} : {system: toSystemStatusDto(snapshot, signals)}),
  }
}

/**
 * Builds the API router.
 *
 * @param getSnapshot - Optional snapshot provider. When absent, returns an empty snapshot.
 *   In production, the real aggregator's `getSnapshot` is injected via server.ts.
 *   Tests inject a fake.
 */
export function buildApiRouter(getSnapshot?: SnapshotProvider, getSystemStatus?: SystemStatusProvider): Hono {
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
    const signals = getSystemStatus === undefined ? undefined : getSystemStatus()
    c.header('Cache-Control', 'no-store')
    return c.json(toMonitoringDto(snapshot, signals))
  })

  return api
}
