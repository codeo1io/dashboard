/**
 * Dashboard aggregator — Phase-1 signal set with cross-source leak guard.
 *
 * Security invariants (enforced here, tested in test/aggregator.test.ts):
 *
 * 1. DENYLIST-BEFORE-QUERY: The working set is filtered against redactedNodeIds
 *    BEFORE any per-repo GraphQL query is issued. A query against a redacted
 *    private repo is itself an observable signal/leak — it must never happen.
 *    See: buildWorkingSet() → the filter is applied before the query loop.
 *
 * 2. FAIL-CLOSED on denylist unavailability: If readMetadata returns err(...),
 *    we MUST NOT build a fresh union of installation-discovered repos (the
 *    denylist would be incomplete). Instead: serve last-good cache + staleBanner,
 *    or empty state on cold start. The GraphQL client is never called for
 *    installation-only repos when the denylist is unavailable.
 *
 * 3. SOURCE-CHANNEL LABELS: Repos in metadata publicRepos carry their
 *    discovery_channel. Repos discovered ONLY via installations (not in
 *    publicRepos, not denylisted) are listed in the working set with their
 *    full identity under the generic label 'discovered' — deliberate
 *    exposure to the single authenticated operator. driftCount reports the
 *    SIZE of that metadata-vs-installation gap as a bare count; the count
 *    field itself never carries names or node_ids, and gap identity (when
 *    shown at all) comes only from these labeled working-set rows.
 */

import type {Result} from '../result.ts'
import type {EnumerateReposResult, InstallationsClient} from './installations.ts'
import type {MetadataError, MetadataReader, MetadataResult} from './metadata.ts'

import {logger, sanitizeErrorMessage, type LogContext} from '../logger.ts'
import {isErr, isOk} from '../result.ts'
import {deriveDatabaseId} from './metadata.ts'

// ---------------------------------------------------------------------------
// Injectable GraphQL transport
// ---------------------------------------------------------------------------

/**
 * A single GraphQL query function. Accepts a query string and variables,
 * returns the raw response data. Injectable so tests never hit the network.
 *
 * @deprecated Use GraphqlQueryForInstallationFn instead — this type is kept
 * for backward compatibility with existing tests that inject graphqlQuery.
 */
export type GraphqlQueryFn = (query: string, variables: Record<string, unknown>) => Promise<unknown>

/**
 * Per-installation GraphQL query function. Accepts an installationId so the
 * implementation can mint the correct credential for each repo.
 * Injectable so tests never hit the network.
 */
export type GraphqlQueryForInstallationFn = (
  installationId: number,
  query: string,
  variables: Record<string, unknown>,
) => Promise<unknown>

// ---------------------------------------------------------------------------
// Phase-1 signal types
// ---------------------------------------------------------------------------

export type CiRollupState = 'green' | 'red' | 'pending' | 'unknown'

export interface RepoCiStatus {
  /** Mapped from statusCheckRollup.state: SUCCESS→green, FAILURE/ERROR→red, PENDING→pending */
  readonly rollupState: CiRollupState
  /** Number of failing check runs on the default branch */
  readonly failingChecks: number
  /** Number of open pull requests */
  readonly openPrCount: number
  /** Number of open issues */
  readonly openIssueCount: number
  /** Number of open security alerts (null if permission unavailable) */
  readonly openAlertCount: number | null
  /** Whether this repo's data is stale (per-repo fetch failed) */
  readonly stale: boolean
  /** When this data was fetched (ms since epoch) */
  readonly fetchedAt: number
}

/**
 * A repo entry in the dashboard snapshot.
 * Repos needing attention sort before healthy ones.
 */
export interface DashboardRepo {
  readonly node_id: string
  readonly owner: string
  readonly name: string
  readonly full_name: string
  /**
   * 'collab' | 'discovered' | any metadata discovery_channel value.
   * Repos only seen via installations (not in publicRepos) get 'discovered'.
   */
  readonly discovery_channel: string
  readonly status: RepoCiStatus
}

/**
 * The aggregator's public snapshot shape.
 */
export interface AggregatorSnapshot {
  /** Repos sorted attention-first */
  readonly repos: readonly DashboardRepo[]
  /**
   * True when the denylist was unavailable during the last refresh attempt
   * and we are serving stale/empty data.
   */
  readonly staleBanner: boolean
  /**
   * Count of repos the Agent App can see that are NOT in public metadata.
   * Never includes names or node_ids — count only.
   */
  readonly driftCount: number
  /** When the snapshot was last successfully refreshed (ms since epoch) */
  readonly refreshedAt: number | null
  /**
   * rm-112: single operator-facing degradation signal. True when the snapshot
   * serves anything other than fully-fresh complete data — enumeration
   * failure, metadata fail-closed serving, warm-empty protection, cycle
   * deadline overrun, or any per-repo stale/absence row.
   */
  readonly degraded: boolean
}

// ---------------------------------------------------------------------------
// GraphQL query + response types
// ---------------------------------------------------------------------------

const REPO_STATUS_QUERY = `
  query RepoStatus($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      defaultBranchRef {
        target {
          ... on Commit {
            statusCheckRollup {
              state
            }
            // GraphQL max page size; repos with >100 suites still understate failingChecks (documented ceiling, rm-110)
            checkSuites(first: 100) {
              nodes {
                checkRuns(first: 50, filterBy: { status: COMPLETED, conclusions: [FAILURE, TIMED_OUT, CANCELLED, ACTION_REQUIRED, STARTUP_FAILURE] }) {
                  totalCount
                }
              }
            }
          }
        }
      }
      pullRequests(states: OPEN) {
        totalCount
      }
      issues(states: OPEN) {
        totalCount
      }
      vulnerabilityAlerts(states: OPEN) {
        totalCount
      }
    }
  }
`

/**
 * Fallback query variant without vulnerabilityAlerts — used when the token
 * lacks the security_events/vulnerability_alerts scope. openAlertCount is set
 * to null (not stale) when this variant is used.
 */
const REPO_STATUS_QUERY_NO_ALERTS = `
  query RepoStatusNoAlerts($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      defaultBranchRef {
        target {
          ... on Commit {
            statusCheckRollup {
              state
            }
            // GraphQL max page size; repos with >100 suites still understate failingChecks (documented ceiling, rm-110)
            checkSuites(first: 100) {
              nodes {
                checkRuns(first: 50, filterBy: { status: COMPLETED, conclusions: [FAILURE, TIMED_OUT, CANCELLED, ACTION_REQUIRED, STARTUP_FAILURE] }) {
                  totalCount
                }
              }
            }
          }
        }
      }
      pullRequests(states: OPEN) {
        totalCount
      }
      issues(states: OPEN) {
        totalCount
      }
    }
  }
`

interface GraphqlRepoResponse {
  repository: {
    defaultBranchRef: {
      target: {
        statusCheckRollup: {state: string} | null
        checkSuites: {
          nodes: {checkRuns: {totalCount: number}}[]
        }
      }
    } | null
    pullRequests: {totalCount: number}
    issues: {totalCount: number}
    vulnerabilityAlerts?: {totalCount: number} | null
  } | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapRollupState(raw: string | undefined | null): CiRollupState {
  if (raw === 'SUCCESS') return 'green'
  if (raw === 'FAILURE' || raw === 'ERROR') return 'red'
  if (raw === 'PENDING' || raw === 'EXPECTED') return 'pending'
  return 'unknown'
}

function needsAttention(status: RepoCiStatus): boolean {
  if (status.stale) return true
  if (status.rollupState === 'red') return true
  if (status.failingChecks > 0) return true
  if (status.openAlertCount !== null && status.openAlertCount > 0) return true
  if (status.openPrCount > 0) return true
  return false
}

function sortAttentionFirst(repos: DashboardRepo[]): DashboardRepo[] {
  return repos.sort((a, b) => {
    const aNeeds = needsAttention(a.status) ? 0 : 1
    const bNeeds = needsAttention(b.status) ? 0 : 1
    return aNeeds - bNeeds
  })
}

/** rm-112: snapshot-level degradation = banner OR any per-repo stale row. */
function snapshotDegraded(banner: boolean, repos: readonly DashboardRepo[]): boolean {
  return banner || repos.some(repo => repo.status.stale)
}

// ---------------------------------------------------------------------------
// Aggregator deps interface
// ---------------------------------------------------------------------------

export interface AggregatorDeps {
  /** Enumerate repos from all installations */
  readonly enumerate: (client: InstallationsClient) => Promise<Result<EnumerateReposResult, unknown>>
  /** Read repo metadata + denylist */
  readonly readMetadata: (reader: MetadataReader) => Promise<Result<MetadataResult, MetadataError>>
  /**
   * Per-installation GraphQL query function — tests inject a fake.
   * The installationId is used to mint the correct credential for each repo.
   */
  readonly graphqlQueryForInstallation: GraphqlQueryForInstallationFn
  /** Injectable clock (defaults to Date.now) */
  readonly now?: () => number
  /** Injectable setInterval (defaults to global setInterval) */
  readonly setIntervalFn?: (fn: () => void, ms: number) => ReturnType<typeof setInterval>
  /** Injectable clearInterval (defaults to global clearInterval) */
  readonly clearIntervalFn?: (id: ReturnType<typeof setInterval>) => void
  /**
   * rm-160: hard wall-clock budget for one whole refresh cycle (metadata read +
   * enumeration + resolver calls + per-repo fetches). When a cycle overruns, the
   * in-flight guard is released and the snapshot degrades visibly instead of
   * the guard staying wedged and every future tick being skipped. Defaults to
   * 45s — under the 60s refresh interval so the next tick finds a free guard.
   */
  readonly refreshCycleDeadlineMs?: number
  /**
   * Optional: resolve the installation ID for a repo by owner/name.
   * Used for metadata-only public repos that have no installation_id from the
   * enumeration channel. If absent, such repos are skipped (not queried).
   */
  readonly resolveInstallationIdForRepo?: (owner: string, name: string) => Promise<number>
}

// ---------------------------------------------------------------------------
// Working set entry (pre-query)
// ---------------------------------------------------------------------------

interface WorkingSetEntry {
  readonly node_id: string
  readonly owner: string
  readonly name: string
  readonly full_name: string
  readonly discovery_channel: string
  /**
   * The installation ID that can authenticate GraphQL queries for this repo.
   * INTERNAL ONLY — never exposed in DashboardRepo or AggregatorSnapshot.
   * null means no installation was found; the repo will be skipped or marked stale.
   */
  readonly installation_id: number | null
}

/**
 * The generic discovery channel assigned to installation-only repos (repos seen
 * via the installation channel but NOT present in the metadata public set). This
 * is the redaction discriminator: any other channel value means the repo came
 * from the public metadata set and is safe to identify in logs. Defined once and
 * referenced at both the production site (buildWorkingSet) and the consumption
 * sites (safeRepoLogIdentity / safeRepoErrorContext) so the two can never drift.
 */
const DISCOVERED_CHANNEL = 'discovered'

/** A repo is known-public only if it came from the metadata public set. */
function isKnownPublic(discoveryChannel: string): boolean {
  return discoveryChannel !== DISCOVERED_CHANNEL
}

type RepoLogIdentity = Pick<WorkingSetEntry, 'node_id' | 'owner' | 'name' | 'discovery_channel' | 'installation_id'>

/**
 * Build the working set from the union of installation repos and metadata publicRepos,
 * then REMOVE every repo whose node_id is in redactedNodeIds OR whose database_id is
 * in redactedDatabaseIds.
 *
 * This is the DENYLIST-BEFORE-QUERY enforcement point. The returned set contains
 * ONLY repos that are safe to query. Denylisted repos never reach the query loop.
 *
 * Cross-format safety: GitHub has two node_id formats (legacy base64 and new R_kgDO...).
 * The node_id check is the primary guard (both channels use the same format per API
 * version). The database_id check is the secondary, format-independent guard — it closes
 * the gap if API-version skew ever produces different node_id formats for the same repo
 * across channels.
 *
 * redactedDatabaseIds is now populated from TWO sources:
 *   1. Explicit `database_id`/`id` fields in repos.yaml entries (if present).
 *   2. Derived from the node_id string via `deriveDatabaseId()` in metadata.ts:
 *      legacy base64 node_ids (e.g. `MDEwOlJlcG9zaXRvcnkxODY5MTU0`) encode the
 *      databaseId in their decoded ASCII form and can be reliably extracted.
 *      New-format node_ids (`R_kgDO...`) cannot be reliably decoded without a
 *      known test vector — `deriveDatabaseId` returns null for them, so those
 *      entries contribute only to redactedNodeIds (primary guard only).
 *
 * Residual limitation: if a redacted entry has a new-format node_id AND the
 * installation channel returns the same repo under a DIFFERENT new-format node_id
 * (cross-format skew within the new format), neither guard catches it. This is
 * an extremely unlikely edge case (new-format node_ids are stable per repo), and
 * the primary node_id guard still works for same-format matches. The databaseId
 * secondary guard closes the gap for all legacy-format entries and any entry with
 * an explicit database_id field. A warning is logged when any redacted entry
 * could not contribute a derived databaseId (denylistComplete=false).
 *
 * @param installRepos - Repos from the installations channel (must carry database_id)
 * @param metadata - Parsed metadata result (publicRepos + redactedNodeIds + redactedDatabaseIds)
 * @returns { workingSet, driftCount, denylistComplete } where driftCount is the number of
 *   installation-only repos (not in publicRepos, not denylisted) — count only, and
 *   denylistComplete indicates whether ALL redacted entries contributed a databaseId.
 */
function buildWorkingSet(
  installRepos: readonly {node_id: string; database_id: number; owner: string; name: string; full_name: string; installation_id: number}[],
  metadata: MetadataResult,
): {workingSet: WorkingSetEntry[]; driftCount: number; denylistComplete: boolean} {
  const {publicRepos, redactedNodeIds, redactedDatabaseIds} = metadata

  // rm-161: guard-coverage telemetry now comes straight from the parser, where
  // per-entry knowledge lives (metadata.ts counts redacted entries that armed
  // the format-independent secondary guard via a derived OR explicit
  // databaseId). denylistComplete=true iff EVERY redacted entry armed it.
  // The previous R_-prefix heuristic re-derived here could never clear while
  // any modern node_id existed — even when that entry carried an explicit
  // database_id and the guard was fully armed — training operators to ignore
  // the warning.
  // Tradeoff (unchanged): we do NOT fail fully closed here — the primary
  // node_id guard covers same-format matches, and full fail-closed-to-empty
  // would be too aggressive for a single undecodable new-format node_id. We
  // warn once per refresh with the exact current condition instead.
  const denylistComplete = metadata.redactedEntriesMissingDatabaseId === 0

  // Index install repos by node_id AND database_id for O(1) lookup.
  // This is the auth-context index: when a metadata publicRepo matches an install
  // repo, we use the install repo's installation_id (the only valid auth context).
  const installByNodeId = new Map<string, (typeof installRepos)[number]>()
  const installByDatabaseId = new Map<number, (typeof installRepos)[number]>()
  for (const repo of installRepos) {
    installByNodeId.set(repo.node_id, repo)
    installByDatabaseId.set(repo.database_id, repo)
  }

  // Union: start with publicRepos (they have authoritative channel labels).
  // For each publicRepo, look up the matching install repo to get installation_id.
  // If no match, installation_id is null (will be resolved later or skipped).
  const unionByNodeId = new Map<string, WorkingSetEntry>()
  for (const pub of publicRepos) {
    // *** DENYLIST CHECK — publicRepos should never contain redacted entries,
    // but we double-check here for defense-in-depth. rm-161: symmetric with the
    // installation channel — BOTH keys checked (node_id OR derived
    // databaseId), so the double-check cannot be bypassed by cross-format
    // node_id skew the way the node_id-only check could. ***
    const pubDerivedDatabaseId = deriveDatabaseId(pub.node_id)
    if (
      redactedNodeIds.has(pub.node_id) ||
      (pubDerivedDatabaseId !== null && redactedDatabaseIds.has(pubDerivedDatabaseId))
    ) {
      continue
    }

    // Look up the install repo to get the installation_id (auth context).
    const installRepo = installByNodeId.get(pub.node_id)
    const installationId = installRepo?.installation_id ?? null

    unionByNodeId.set(pub.node_id, {
      node_id: pub.node_id,
      owner: pub.owner,
      name: pub.name,
      full_name: `${pub.owner}/${pub.name}`,
      discovery_channel: pub.discovery_channel,
      installation_id: installationId,
    })
  }

  // Add installation repos not already in the union
  let driftCount = 0
  for (const repo of installRepos) {
    // *** PRIMARY + SECONDARY DENYLIST-BEFORE-QUERY ENFORCEMENT ***
    // Exclude if EITHER:
    //   (a) node_id matches redactedNodeIds (primary — same format per API version), OR
    //   (b) database_id matches redactedDatabaseIds (secondary — format-independent,
    //       closes the node_id format-mismatch gap; populated from derived databaseIds
    //       extracted from legacy base64 node_ids AND explicit database_id fields).
    // A match on either key is sufficient to exclude the repo.
    if (redactedNodeIds.has(repo.node_id) || redactedDatabaseIds.has(repo.database_id)) {
      continue
    }

    if (!unionByNodeId.has(repo.node_id)) {
      // Installation-only repo: use generic 'discovered' label
      unionByNodeId.set(repo.node_id, {
        node_id: repo.node_id,
        owner: repo.owner,
        name: repo.name,
        full_name: repo.full_name,
        discovery_channel: DISCOVERED_CHANNEL,
        installation_id: repo.installation_id,
      })
      driftCount++
    }
  }

  return {workingSet: [...unionByNodeId.values()], driftCount, denylistComplete}
}

// ---------------------------------------------------------------------------
// Per-repo GraphQL fetch
// ---------------------------------------------------------------------------

/**
 * Build a log-safe identity for a repo (#54).
 *
 * Private repo names must never reach operational logs. A repo's real
 * `owner`/`name` are only safe to log when the repo is KNOWN PUBLIC — i.e. it
 * came from the `metadata/repos.yaml` public set. Installation-only repos are
 * NOT known public and may be private, so they are logged with only
 * non-revealing identifiers (`node_id`/`installation_id`) instead of
 * `owner`/`name`.
 */
function safeRepoLogIdentity(entry: RepoLogIdentity): LogContext {
  if (!isKnownPublic(entry.discovery_channel)) {
    // Not known public — redact owner/name, keep diagnosable opaque identity.
    return {repoNodeId: entry.node_id, installationId: entry.installation_id}
  }
  // Known public (from metadata public set) — name is safe to log.
  return {owner: entry.owner, name: entry.name, repoNodeId: entry.node_id}
}

/**
 * Build a log-safe identity + error context (#54).
 *
 * The error string is a SECOND leak vector: GitHub's GraphQL API echoes the
 * queried `owner/name` back in error messages (e.g. "Could not resolve to a
 * Repository with the name 'private-org/secret-repo'"). `sanitizeErrorMessage`
 * strips credentials but NOT repo names, so for a not-known-public repo the
 * repo's own `owner`, `name`, and `full_name` are stripped from the error text
 * before logging.
 */
function safeRepoErrorContext(entry: RepoLogIdentity, error: unknown): LogContext {
  const message = sanitizeErrorMessage(error instanceof Error ? error.message : String(error))
  const identity = safeRepoLogIdentity(entry)
  if (isKnownPublic(entry.discovery_channel)) {
    return {...identity, error: message}
  }
  // Not known public — also scrub this repo's identity from the error text.
  const scrubbed = redactRepoIdentityFromText(message, entry)
  return {...identity, error: scrubbed}
}

/** Strip a repo's own owner, name, and full_name occurrences from a text string. */
function redactRepoIdentityFromText(text: string, entry: RepoLogIdentity): string {
  // Replace identity tokens LONGEST-FIRST so the most specific match always wins
  // and no partial fragment survives when tokens overlap (e.g. the name is a
  // substring of the owner). An error string may carry the full `owner/name`,
  // or the owner or name in isolation.
  const tokens = [`${entry.owner}/${entry.name}`, entry.owner, entry.name]
    .filter(token => token.length > 1)
    .sort((a, b) => b.length - a.length)
  let out = text
  for (const token of tokens) {
    out = out.split(token).join('[REDACTED_REPO]')
  }
  return out
}

/**
 * Detect whether a GraphQL error is specifically about the vulnerabilityAlerts
 * field being inaccessible (permission/scope error).
 */
function isVulnerabilityAlertsPermissionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const msg = error.message.toLowerCase()
  // GitHub GraphQL returns errors like:
  //   "Must have push access to view vulnerability alerts."
  //   "Resource not accessible by integration"
  //   "Field 'vulnerabilityAlerts' doesn't exist on type 'Repository'"
  return (
    msg.includes('vulnerabilityalerts') ||
    msg.includes('vulnerability_alerts') ||
    msg.includes('vulnerability alerts') ||
    (msg.includes('push access') && msg.includes('vulnerability'))
  )
}

/**
 * Parse a GraphQL response into a RepoCiStatus, with openAlertCount from the response
 * (or null if the field is absent/null).
 */
function parseRepoResponse(raw: unknown, fetchedAt: number, openAlertCount: number | null): RepoCiStatus {
  const data = raw as GraphqlRepoResponse

  const repo = data.repository
  if (repo === null || repo === undefined) {
    // rm-112 (cycle-9): repository:null means the repo vanished between
    // enumeration and query — deleted, renamed, made private, or the
    // installation lost access. That is a degradation the operator must see,
    // so we fail visible (stale:true), matching the installation_id:null and
    // fetch-failure paths below. Serving a calm unknown here hid silent drift.
    return {rollupState: 'unknown', failingChecks: 0, openPrCount: 0, openIssueCount: 0, openAlertCount: null, stale: true, fetchedAt}
  }

  const target = repo.defaultBranchRef?.target
  const rollupRaw = target?.statusCheckRollup?.state
  const rollupState = mapRollupState(rollupRaw)

  // Sum failing check runs across all check suites
  let failingChecks = 0
  if (target?.checkSuites?.nodes) {
    for (const suite of target.checkSuites.nodes) {
      failingChecks += suite.checkRuns.totalCount
    }
  }

  const openPrCount = repo.pullRequests.totalCount
  const openIssueCount = repo.issues.totalCount

  // Use the provided openAlertCount (may be from the response or null if no-alerts variant)
  const alertCount = openAlertCount ?? (repo.vulnerabilityAlerts?.totalCount ?? null)

  return {rollupState, failingChecks, openPrCount, openIssueCount, openAlertCount: alertCount, stale: false, fetchedAt}
}

async function fetchRepoStatus(
  entry: WorkingSetEntry,
  graphqlQueryForInstallation: GraphqlQueryForInstallationFn,
  now: () => number,
): Promise<RepoCiStatus> {
  const fetchedAt = now()

  // installation_id must be present — if null, we cannot authenticate the query
  if (entry.installation_id === null) {
    logger.warning('No installation_id for repo; marking stale', safeRepoLogIdentity(entry))
    return {rollupState: 'unknown', failingChecks: 0, openPrCount: 0, openIssueCount: 0, openAlertCount: null, stale: true, fetchedAt}
  }

  const installationId = entry.installation_id
  const vars = {owner: entry.owner, name: entry.name}

  try {
    const raw = await graphqlQueryForInstallation(installationId, REPO_STATUS_QUERY, vars)
    if ((raw as GraphqlRepoResponse).repository == null) {
      logger.warning('Repository null in GraphQL response (deleted/renamed/private or access lost); marking stale', safeRepoLogIdentity(entry))
    }
    return parseRepoResponse(raw, fetchedAt, null)
  } catch (error) {
    // P1 #11: if the error is specifically about vulnerabilityAlerts permission,
    // retry without that field and set openAlertCount = null (not stale).
    if (isVulnerabilityAlertsPermissionError(error)) {
      logger.warning('vulnerabilityAlerts permission error; retrying without alerts field', safeRepoLogIdentity(entry))
      try {
        const raw = await graphqlQueryForInstallation(installationId, REPO_STATUS_QUERY_NO_ALERTS, vars)
        if ((raw as GraphqlRepoResponse).repository == null) {
          logger.warning('Repository null in GraphQL response (deleted/renamed/private or access lost); marking stale', safeRepoLogIdentity(entry))
        }
        // Parse with openAlertCount=null (alerts unavailable, not stale)
        return parseRepoResponse(raw, fetchedAt, null)
      } catch (retryError) {
        logger.warning('Per-repo GraphQL fetch failed (no-alerts retry); marking stale', safeRepoErrorContext(entry, retryError))
        return {rollupState: 'unknown', failingChecks: 0, openPrCount: 0, openIssueCount: 0, openAlertCount: null, stale: true, fetchedAt}
      }
    }

    logger.warning('Per-repo GraphQL fetch failed; marking stale', safeRepoErrorContext(entry, error))
    return {rollupState: 'unknown', failingChecks: 0, openPrCount: 0, openIssueCount: 0, openAlertCount: null, stale: true, fetchedAt}
  }
}

// ---------------------------------------------------------------------------
// Aggregator factory
// ---------------------------------------------------------------------------

/**
 * Create a dashboard aggregator.
 *
 * The aggregator is a factory — it does NOT auto-start an interval at import
 * time. Call `start()` to begin background refresh, `stop()` to cancel it.
 *
 * Deps are fully injectable for testing (fake timers, fake GraphQL, fake
 * enumerate/readMetadata).
 */
/**
 * rm-160: default whole-cycle deadline (ms). Below the 60s refresh interval so
 * an overran cycle releases the in-flight guard before the next tick arrives.
 */
const DEFAULT_REFRESH_CYCLE_DEADLINE_MS = 45_000

export function createAggregator(
  installationsClient: InstallationsClient,
  metadataReader: MetadataReader,
  deps: AggregatorDeps,
) {
  const {graphqlQueryForInstallation} = deps
  const now = deps.now ?? (() => Date.now())
  const setIntervalFn = deps.setIntervalFn ?? ((fn, ms) => setInterval(fn, ms))
  const clearIntervalFn = deps.clearIntervalFn ?? (id => clearInterval(id))

  // Last-good snapshot (serves stale data when refresh fails)
  let lastGoodSnapshot: AggregatorSnapshot | null = null

  // Interval handle
  let intervalHandle: ReturnType<typeof setInterval> | null = null

  // In-flight guard: prevents overlapping refreshes. If a refresh cycle takes
  // longer than the 60s interval, the next tick is skipped rather than piling
  // up concurrent refreshes that race on lastGoodSnapshot.
  let refreshing = false

  // rm-160: monotonic cycle sequence. A cycle that overruns its deadline is
  // abandoned (guard released, snapshot degraded) but its awaits may still
  // settle later — the seq guard makes those late writes no-ops so an overran
  // cycle can never overwrite a newer cycle's snapshot.
  let latestCycleSeq = 0

  function commitSnapshot(cycleSeq: number, snapshot: AggregatorSnapshot): void {
    if (cycleSeq !== latestCycleSeq) {
      logger.warning('Discarding snapshot from overran refresh cycle (a newer cycle owns the snapshot)')
      return
    }
    lastGoodSnapshot = snapshot
  }

  /**
   * Perform a full refresh cycle.
   *
   * Security: if readMetadata fails (denylist unavailable), we MUST NOT build
   * a fresh union. We serve last-good cache + staleBanner, or empty on cold start.
   */
  async function runRefresh(cycleSeq: number): Promise<void> {
    // 1. Read metadata + denylist FIRST
    const metadataResult = await deps.readMetadata(metadataReader)

    if (isErr(metadataResult)) {
      // FAIL-CLOSED: denylist unavailable — do NOT build a fresh union
      logger.warning('Metadata read failed; failing closed — serving stale/empty snapshot', {
        error: sanitizeErrorMessage(metadataResult.error.message),
      })

      if (lastGoodSnapshot === null) {
        // Cold start with no cache — serve empty with banner
        commitSnapshot(cycleSeq, {repos: [], staleBanner: true, driftCount: 0, refreshedAt: null, degraded: true})
      } else {
        // Serve last-good with staleBanner
        commitSnapshot(cycleSeq, {...lastGoodSnapshot, staleBanner: true, degraded: true})
      }
      return
    }

    const metadata = metadataResult.data

    // 2. Enumerate installation repos
    const enumerateResult = await deps.enumerate(installationsClient)

    let installRepos: readonly {node_id: string; database_id: number; owner: string; name: string; full_name: string; installation_id: number}[] = []
    let enumerationFailed = false
    if (isOk(enumerateResult)) {
      installRepos = enumerateResult.data.repos
    } else {
      enumerationFailed = true
      logger.warning('Installation enumeration failed; using empty install set — snapshot will be incomplete', {
        error: sanitizeErrorMessage(String((enumerateResult as {error: unknown}).error)),
      })
    }

    // 3. Build working set — DENYLIST-BEFORE-QUERY applied here
    const {workingSet: rawWorkingSet, driftCount, denylistComplete} = buildWorkingSet(installRepos, metadata)

    // Resolve installation_id for metadata-only repos (those with installation_id=null).
    // These are public repos in metadata that weren't found in the installation channel.
    // We use resolveInstallationIdForRepo (App JWT endpoint) to find the right installation.
    // If unavailable or resolution fails, the repo is skipped (not queried without auth context).
    let workingSet: WorkingSetEntry[]
    // rm-112: resolver-failure absence entries — repos whose installation could
    // not be resolved stay VISIBLE (previous row preserved stale, or a
    // synthesized unknown row) instead of silently dropping out of the snapshot.
    const absenceEntries: WorkingSetEntry[] = []
    if (deps.resolveInstallationIdForRepo === undefined) {
      // No resolver: filter out repos with no installation_id (cannot query safely)
      workingSet = rawWorkingSet.filter(e => e.installation_id !== null)
    } else {
      const resolveInstallation = deps.resolveInstallationIdForRepo
      const resolvedEntries: WorkingSetEntry[] = []
      for (const entry of rawWorkingSet) {
        if (entry.installation_id !== null) {
          resolvedEntries.push(entry)
          continue
        }
        // Metadata-only repo: resolve installation_id via App JWT
        try {
          const resolvedId = await resolveInstallation(entry.owner, entry.name)
          resolvedEntries.push({...entry, installation_id: resolvedId})
        } catch (resolveError) {
          // rm-112: fail-visible, not fail-silent — do NOT query without an
          // auth context, but do not drop the repo from the snapshot either.
          logger.warning(
            'Could not resolve installation for metadata-only repo; keeping as stale absence entry',
            safeRepoErrorContext(entry, resolveError),
          )
          absenceEntries.push(entry)
          // Skip: no valid auth context — do NOT query with an ambient token
        }
      }
      workingSet = resolvedEntries
    }

    // Warn if cross-format denylist protection is partial (redacted entries
    // with no derived AND no explicit databaseId). The primary node_id guard
    // still applies; only the secondary databaseId guard is absent for those
    // entries. rm-161: driven by parser-side per-entry telemetry.
    if (!denylistComplete) {
      logger.warning(
        `Denylist cross-format protection is partial: ${metadata.redactedEntriesMissingDatabaseId} redacted entr` +
        `${metadata.redactedEntriesMissingDatabaseId === 1 ? 'y has' : 'ies have'} no numeric databaseId ` +
        '(undecodable node_id and no explicit database_id/id field). The primary node_id guard still applies for ' +
        'same-format matches. If the installation channel returns the same repo under a different node_id format, ' +
        'it may not be excluded by the secondary guard.',
      )
    }

    // rm-112: resolver-failure absence entries — the repo stays visible with an
    // explicit stale marker. Its previous row (if any) is preserved with
    // stale=true (last-good serving, fail-visible); never-seen repos surface as
    // a synthesized 'unknown' row rather than silently vanishing. Built BEFORE
    // the empty-set guard so the guard can COMPOSE them with preserved
    // last-good rows: absence rows are failure markers, not fresh data, and
    // must never arm the wipe path (independent-review finding F2, 9351c56b).
    const absenceRows: DashboardRepo[] = []
    for (const entry of absenceEntries) {
      const previous = lastGoodSnapshot?.repos.find(repo => repo.node_id === entry.node_id)
      absenceRows.push(
        previous === undefined
          ? {
              node_id: entry.node_id,
              owner: entry.owner,
              name: entry.name,
              full_name: entry.full_name,
              discovery_channel: entry.discovery_channel,
              status: {
                rollupState: 'unknown',
                failingChecks: 0,
                openPrCount: 0,
                openIssueCount: 0,
                openAlertCount: null,
                stale: true,
                fetchedAt: now(),
              },
            }
          : {...previous, status: {...previous.status, stale: true}},
      )
    }

    if (workingSet.length === 0) {
      // rm-112: an empty FRESH UNION while a previous snapshot served repos is
      // a suspicious wipe, not a legitimate empty fleet (an empty fleet starts
      // empty). Absence rows are failure markers, not fresh data: they arm
      // neither the wipe path nor an absence-only commit that would silently
      // drop previously-served install-channel rows (review F2, 9351c56b).
      if (lastGoodSnapshot !== null && lastGoodSnapshot.repos.length > 0) {
        if (absenceRows.length === 0) {
          logger.warning(
            'Refresh produced an empty working set while serving a non-empty snapshot; keeping last-good with stale banner (warm-empty protection)',
          )
          commitSnapshot(cycleSeq, {...lastGoodSnapshot, staleBanner: true, degraded: true})
          return
        }
        // Resolver failures present: absence rows ride along with their precise
        // stale/unknown markers; every other last-good row survives marked
        // stale — nothing fresh replaced it this cycle.
        const absenceNodeIds = new Set(absenceRows.map(repo => repo.node_id))
        const preserved = lastGoodSnapshot.repos
          .filter(repo => !absenceNodeIds.has(repo.node_id))
          .map(repo => ({...repo, status: {...repo.status, stale: true}}))
        logger.warning(
          'Refresh produced no resolvable repos (resolver failures present) while serving a non-empty snapshot; keeping last-good with stale banner (warm-empty protection)',
        )
        commitSnapshot(cycleSeq, {
          repos: sortAttentionFirst([...preserved, ...absenceRows]),
          staleBanner: true,
          driftCount,
          refreshedAt: now(),
          degraded: true,
        })
        return
      }
      // No last-good to protect: surface the failure markers themselves.
      // staleBanner=true if enumeration failed (data is incomplete — install
      // repos missing) or resolver failures left unresolved rows visible.
      commitSnapshot(cycleSeq, {
        repos: absenceRows,
        staleBanner: enumerationFailed || absenceRows.length > 0,
        driftCount,
        refreshedAt: now(),
        degraded: enumerationFailed || absenceRows.length > 0,
      })
      return
    }

    // 4. Fetch per-repo status — only for repos that survived the denylist filter.
    //
    // rm-112 (cycle-9): a per-repo cache used to sit here (60s TTL checked with
    // a strict '<' against a 60s refresh interval). The cache was consulted
    // only at the top of this same loop, so an entry's revisit age was the
    // interval plus or minus per-repo fetch-latency variance — a timing-lucky
    // entry could dip marginally under TTL when the current cycle had already
    // spent that wall time on predecessors' fetches, but the steady-state hit
    // rate was not meaningfully above zero and the machinery was dead weight.
    // Raising the TTL instead would serve older data to save negligible API
    // budget (1 query/repo/minute for a small fleet), trading away the
    // dashboard's freshness contract. Removed; every cycle fetches every
    // working-set repo fresh.
    const dashboardRepos: DashboardRepo[] = []
    for (const entry of workingSet) {
      const status = await fetchRepoStatus(entry, graphqlQueryForInstallation, now)
      dashboardRepos.push({
        node_id: entry.node_id,
        owner: entry.owner,
        name: entry.name,
        full_name: entry.full_name,
        discovery_channel: entry.discovery_channel,
        status,
      })
    }

    const sorted = sortAttentionFirst([...dashboardRepos, ...absenceRows])
    // staleBanner=true if enumeration failed — data is incomplete (install repos missing).
    // We still show metadata publicRepos (they are public and safe), but the operator
    // must know the installation channel data is absent.
    commitSnapshot(cycleSeq, {
      repos: sorted,
      staleBanner: enumerationFailed,
      driftCount,
      refreshedAt: now(),
      degraded: snapshotDegraded(enumerationFailed, sorted),
    })

    logger.info('Aggregator refresh complete', {
      repoCount: sorted.length,
      driftCount,
      enumerationFailed,
    })
  }

  /**
   * Perform a refresh cycle, guarded against overlap. If a refresh is already
   * in flight, this call is skipped (returns immediately) so concurrent cycles
   * never race on shared state.
   */
  async function refresh(): Promise<void> {
    if (refreshing) {
      logger.debug('Refresh already in flight; skipping overlapping cycle')
      return
    }
    refreshing = true
    // rm-160: number the cycle so a run that overruns its deadline and settles
    // late can never overwrite a newer cycle's snapshot (commitSnapshot seq).
    const cycleSeq = ++latestCycleSeq
    const deadlineMs = deps.refreshCycleDeadlineMs ?? DEFAULT_REFRESH_CYCLE_DEADLINE_MS
    let deadlineTimer: ReturnType<typeof setTimeout> | undefined
    try {
      // rm-160: cycle deadline. Per-request AbortSignal.timeout deadlines
      // (rm-160, request layer) already make a single hung upstream unable to
      // wedge a cycle, but a whole cycle can still overrun via many
      // slow-but-under-deadline requests — or a future request path that misses
      // its signal. When that happens, release the in-flight guard and degrade
      // the snapshot VISIBLY instead of skipping every future tick while the
      // zombie cycle holds `refreshing=true` forever (the cycle-9 wedge).
      const outcome = await Promise.race([
        runRefresh(cycleSeq),
        new Promise<'cycle-deadline'>(resolve => {
          deadlineTimer = setTimeout(() => resolve('cycle-deadline'), deadlineMs)
        }),
      ])
      if (outcome === 'cycle-deadline') {
        logger.warning('Aggregator refresh cycle overran its deadline; releasing in-flight guard and degrading snapshot', {
          deadlineMs,
        })
        if (lastGoodSnapshot === null) {
          lastGoodSnapshot = {repos: [], staleBanner: true, driftCount: 0, refreshedAt: null, degraded: true}
        } else {
          lastGoodSnapshot = {...lastGoodSnapshot, staleBanner: true, degraded: true}
        }
      }
    } finally {
      if (deadlineTimer !== undefined) clearTimeout(deadlineTimer)
      refreshing = false
    }
  }

  /**
   * Get the current snapshot. Returns empty state if no refresh has run yet.
   */
  function getSnapshot(): AggregatorSnapshot {
    if (lastGoodSnapshot === null) {
      return {repos: [], staleBanner: false, driftCount: 0, refreshedAt: null, degraded: false}
    }
    return lastGoodSnapshot
  }

  /**
   * Start the background refresh interval (60s). Also triggers an immediate refresh.
   */
  async function start(): Promise<void> {
    await refresh()
    intervalHandle = setIntervalFn(() => {
      refresh().catch(error => {
        logger.error('Aggregator background refresh threw unexpectedly', {
          error: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)),
        })
      })
    }, 60_000)
  }

  /**
   * Stop the background refresh interval.
   */
  function stop(): void {
    if (intervalHandle !== null) {
      clearIntervalFn(intervalHandle)
      intervalHandle = null
    }
  }

  return {refresh, getSnapshot, start, stop}
}

export type Aggregator = ReturnType<typeof createAggregator>
