import type {AggregatorSnapshot, DashboardRepo, FailingCheckDetail, RepoCiStatus, SecurityAlertDetail} from '../github/aggregator.ts'
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
 * One security alert as emitted to the SPA — a 1:1 display-safe projection
 * of the aggregator's SecurityAlertDetail (rm-117). Only explicitly mapped
 * fields ride the wire (same whitelist discipline as the monitoring DTO);
 * the aggregation payload is identical for OPEN drill-downs and cures.
 */
interface SecurityAlertDto {
  readonly state: string | null
  readonly createdAt: string | null
  readonly fixedAt: string | null
  readonly dismissedAt: string | null
  readonly autoDismissedAt: string | null
  readonly dismissReason: string | null
  readonly dependencyScope: string | null
  readonly manifestPath: string | null
  readonly firstPatchedVersion: string | null
  readonly vulnerableVersionRange: string | null
  readonly updatePrState: string | null
  readonly updatePrUrl: string | null
  readonly severity: string | null
  readonly classification: string | null
  readonly withdrawnAt: string | null
  readonly ghsaId: string | null
  readonly cveId: string | null
  /** Derived outbound link; built server-side so no third-party origin literal ships in the client bundle (privacy guard; updatePrUrl precedent). */
  readonly advisoryUrl: string | null
  readonly cvssV3Score: number | null
  readonly cvssV3Vector: string | null
  readonly cvssV4Score: number | null
  readonly cvssV4Vector: string | null
  readonly epssPercentage: number | null
  readonly epssPercentile: number | null
  readonly cwes: readonly string[]
  readonly identifiers: readonly {readonly type: string; readonly value: string}[]
}

function advisoryUrlFor(alert: SecurityAlertDetail): string | null {
  if (alert.ghsaId === null) {
    return alert.cveId === null ? null : `https://nvd.nist.gov/vuln/detail/${alert.cveId}`
  }
  return `https://github.com/advisories/${alert.ghsaId}`
}

function toSecurityAlertDto(alert: SecurityAlertDetail): SecurityAlertDto {
  return {
    state: alert.state,
    createdAt: alert.createdAt,
    fixedAt: alert.fixedAt,
    dismissedAt: alert.dismissedAt,
    autoDismissedAt: alert.autoDismissedAt,
    dismissReason: alert.dismissReason,
    dependencyScope: alert.dependencyScope,
    manifestPath: alert.manifestPath,
    firstPatchedVersion: alert.firstPatchedVersion,
    vulnerableVersionRange: alert.vulnerableVersionRange,
    updatePrState: alert.updatePrState,
    updatePrUrl: alert.updatePrUrl,
    severity: alert.severity,
    classification: alert.classification,
    withdrawnAt: alert.withdrawnAt,
    ghsaId: alert.ghsaId,
    cveId: alert.cveId,
    advisoryUrl: advisoryUrlFor(alert),
    cvssV3Score: alert.cvssV3Score,
    cvssV3Vector: alert.cvssV3Vector,
    cvssV4Score: alert.cvssV4Score,
    cvssV4Vector: alert.cvssV4Vector,
    epssPercentage: alert.epssPercentage,
    epssPercentile: alert.epssPercentile,
    cwes: alert.cwes,
    identifiers: alert.identifiers,
  }
}

interface SecurityRepoDto {
  readonly full_name: string
  readonly stale: boolean
  readonly openAlertCount: number | null
  /** null = permission-degraded (token lacks the alerts scope): the whole posture is absent, never half-populated */
  readonly posture: {
    readonly openAlerts: readonly SecurityAlertDto[]
    readonly recentCures: readonly SecurityAlertDto[]
    readonly recentCureCount: number | null
    readonly curesFetchedAt: number | null
  } | null
}

interface SecurityDto {
  readonly repos: readonly SecurityRepoDto[]
  readonly staleBanner: boolean
  readonly refreshedAt: number | null
}

function toSecurityRepoDto(repo: DashboardRepo): SecurityRepoDto {
  return {
    full_name: repo.full_name,
    stale: repo.status.stale,
    openAlertCount: repo.status.openAlertCount,
    posture:
      repo.status.securityPosture === null
        ? null
        : {
            openAlerts: repo.status.securityPosture.openAlerts.map(toSecurityAlertDto),
            recentCures: repo.status.securityPosture.recentCures.map(toSecurityAlertDto),
            recentCureCount: repo.status.securityPosture.recentCureCount,
            curesFetchedAt: repo.status.securityPosture.curesFetchedAt,
          },
  }
}

function toSecurityDto(snapshot: AggregatorSnapshot): SecurityDto {
  return {
    repos: snapshot.repos.map(toSecurityRepoDto),
    staleBanner: snapshot.staleBanner,
    refreshedAt: snapshot.refreshedAt,
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

  /**
   * BFF aggregation endpoint for the SPA security-posture view (rm-117).
   *
   * Returns a MINIMIZED client DTO — only the security fields the posture
   * UI needs: per-repo open-alert drill-down (severity / CVSS / EPSS / CWEs /
   * identifiers / manifest PATH / cure-PR state) plus the recent-cures
   * sample that makes the cured-alert story visible. Internal fields
   * (node_id, owner, name, discovery_channel, fetchedAt, rollup/CI fields)
   * are NEVER emitted here — /api/monitoring stays the CI view's DTO.
   *
   * Security invariants (same contract as /api/monitoring):
   * - Cache-Control: no-store — posture data must never be cached by intermediaries.
   * - Behind auth — the auth middleware in server.ts denies unauthenticated requests.
   * - The DTO mapper is the final whitelist: only explicitly mapped fields are emitted.
   * - Permission-degraded repos surface posture:null — the view renders the
   *   degraded notice, never half-populated posture data.
   */
  api.get('/security', c => {
    const snapshot = getSnapshot === undefined ? COLD_START_SNAPSHOT : getSnapshot()
    c.header('Cache-Control', 'no-store')
    return c.json(toSecurityDto(snapshot))
  })

  return api
}
