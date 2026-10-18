import type {AggregatorSnapshot, DashboardRepo, FailingCheckDetail, RepoCiStatus} from '../github/aggregator.ts'
import type {PlatformStatus} from '../github/platform-status.ts'
import process from 'node:process'
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
  /**
   * rm-1447: platform-availability annotation (githubstatus feed) — overall
   * indicator, Actions component status, fetchedAt. null when no fetch has
   * succeeded (fail-open: absence never blocks or degrades the snapshot).
   * Public third-party data; carries no fleet identity.
   */
  readonly platformStatus: PlatformStatus | null
  /**
   * rm-1932 (footer seam): the deployment's release-channel version, from
   * the same scoped newest-calver selection the staleness gate measures
   * (see currentReleaseVersion below). null when not injected at build time
   * — the SPA footer hides its version element, never renders a placeholder.
   */
  readonly releaseVersion: string | null
}

/** Calver shape the release channel mints (YYYY.MM.counter — rm-1932). */
const CALVER_TAG_SHAPE = /^\d{4}\.\d{1,2}\.\d+$/

/**
 * rm-1932: the deployment's release-channel version, injected at image build
 * time via the RELEASE_CHANNEL_TAG build-arg (release.yaml computes it with
 * `scripts/compute-release-tag.ts --current` — the SAME scoped newest-calver
 * selection the release-channel-staleness gate uses; one source of truth,
 * never a second parser). Validated against the calver shape; absent,
 * empty, or malformed → null. Read per call so tests can stub the env
 * without re-importing the module.
 */
function currentReleaseVersion(): string | null {
  const raw = process.env.RELEASE_CHANNEL_TAG?.trim() ?? ''
  return raw.length > 0 && CALVER_TAG_SHAPE.test(raw) ? raw : null
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
    platformStatus: snapshot.platformStatus ?? null,
    releaseVersion: currentReleaseVersion(),
  }
}

/**
 * Builds the API router.
 *
 * @param getSnapshot - Optional snapshot provider. When absent, returns an empty snapshot.
 *   In production, the real aggregator's `getSnapshot` is injected via server.ts.
 *   Tests inject a fake.
 */
export function buildApiRouter(getSnapshot?: SnapshotProvider): Hono {
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

  return api
}
