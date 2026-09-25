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
  /**
   * Count of installations that failed (token mint or repo listing) during the
   * enumeration feeding this snapshot. 0 = enumeration was complete.
   * null = unknown — either enumeration failed entirely (staleBanner is true)
   * or no refresh has run yet. Count only; installation ids/names are never
   * exposed (redaction invariant).
   */
  readonly enumerationIncomplete: number | null
  /** When the snapshot was last successfully refreshed (ms since epoch) */
  readonly refreshedAt: number | null
}

// ---------------------------------------------------------------------------
// Cold-start snapshot
// ---------------------------------------------------------------------------

/**
 * rm-197 (review fix): the single bannered cold-start/empty snapshot.
 * server.ts and routes/api.ts previously each carried an identical literal —
 * a future field addition could silently diverge them (no test asserted
 * parity). Both now import this one constant.
 */
export const COLD_START_SNAPSHOT: AggregatorSnapshot = {
  repos: [],
  staleBanner: true,
  driftCount: 0,
  enumerationIncomplete: null,
  refreshedAt: null,
}

// ---------------------------------------------------------------------------
// GraphQL query + response types
// ---------------------------------------------------------------------------

export const REPO_STATUS_QUERY = `
  query RepoStatus($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      defaultBranchRef {
        target {
          ... on Commit {
            statusCheckRollup {
              state
            }
            # GraphQL max page size; repos with >100 suites still understate failingChecks (documented ceiling, rm-110)
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
export const REPO_STATUS_QUERY_NO_ALERTS = `
  query RepoStatusNoAlerts($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      defaultBranchRef {
        target {
          ... on Commit {
            statusCheckRollup {
              state
            }
            # GraphQL max page size; repos with >100 suites still understate failingChecks (documented ceiling, rm-110)
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

export function sortAttentionFirst(repos: DashboardRepo[]): DashboardRepo[] {
  return repos.sort((a, b) => {
    const aNeeds = needsAttention(a.status) ? 0 : 1
    const bNeeds = needsAttention(b.status) ? 0 : 1
    return aNeeds - bNeeds
  })
}

/**
 * Build a fail-visible absence row for a working-set repo that could not be
 * queried (no resolvable auth context). The identity is denylist-cleared
 * public metadata; the status is deliberately the same fail-visible shape the
 * repository:null and fetch-failure paths already produce, so downstream
 * consumers need no new branch to render it.
 */
function toAbsenceEntry(entry: WorkingSetEntry, status: RepoCiStatus): DashboardRepo {
  return {
    node_id: entry.node_id,
    owner: entry.owner,
    name: entry.name,
    full_name: entry.full_name,
    discovery_channel: entry.discovery_channel,
    status,
  }
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
   * Optional: resolve the installation ID for a repo by owner/name.
   * Used for metadata-only public repos that have no installation_id from the
   * enumeration channel. If absent, such repos are skipped (not queried).
   */
  readonly resolveInstallationIdForRepo?: (owner: string, name: string) => Promise<number>
  /**
   * Per-call deadline raced against every outbound call in a refresh cycle
   * (this run's rm-197: deadline racing + stall watchdog — a second layer on
   * top of the transport-level GITHUB_REQUEST_TIMEOUT_MS bounds, so even a
   * deps-injected transport with no timeout of its own cannot wedge a
   * cycle). Defaults to AGGREGATOR_FETCH_DEADLINE_MS (15s).
   */
  readonly fetchDeadlineMs?: number
  /**
   * Max concurrent per-repo status fetches (rm-141). Defaults to
   * AGGREGATOR_REFRESH_CONCURRENCY (4). 1 restores the old serial walk.
   */
  readonly refreshConcurrency?: number
  /**
   * A cycle still in flight after this long serves the stale banner even
   * though no newer cycle has run (stall watchdog). Defaults to 2× the
   * refresh interval.
   */
  readonly staleAfterMs?: number
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

export type RepoLogIdentity = Pick<WorkingSetEntry, 'node_id' | 'owner' | 'name' | 'discovery_channel' | 'installation_id'>

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

  // denylistComplete: true if every redacted node_id also has a derived databaseId in
  // redactedDatabaseIds. False means at least one redacted entry (likely a new-format
  // R_kgDO... node_id) could not contribute a databaseId — the cross-format secondary
  // guard is partial for that entry. The primary node_id guard still applies.
  // Tradeoff: we do NOT fail fully closed here — the primary guard covers same-format
  // matches, and full fail-closed-to-empty would be too aggressive for a single
  // undecodable new-format node_id. We log a warning instead.
  let denylistComplete = true
  for (const nodeId of redactedNodeIds) {
    // Check if this node_id has a corresponding databaseId in the denylist.
    // We can't reverse-lookup by node_id here, so we check if redactedDatabaseIds
    // is non-empty as a proxy — if it's empty and redactedNodeIds is non-empty,
    // at least one entry has no derived databaseId.
    // More precise: new-format node_ids (R_kgDO...) can't be decoded, so if any
    // redacted node_id starts with R_, denylistComplete is false.
    if (nodeId.startsWith('R_')) {
      denylistComplete = false
      break
    }
  }

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
    // but we double-check here for defense-in-depth ***
    if (redactedNodeIds.has(pub.node_id)) {
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
export function redactRepoIdentityFromText(text: string, entry: RepoLogIdentity): string {
  // Replace identity tokens LONGEST-FIRST so the most specific match always wins
  // and no partial fragment survives when tokens overlap (e.g. the name is a
  // substring of the owner). An error string may carry the full `owner/name`,
  // or the owner or name in isolation.
  // rm-200: bare-token matches are boundary-anchored (no [\w.-] adjacent) so
  // that single-character tokens — legal GitHub owner/repo names — are
  // redacted when standalone WITHOUT shredding every occurrence of that
  // character inside unrelated words. The previous `length > 1` filter was a
  // split/join workaround that silently leaked 1-char identities; with
  // anchoring the filter only needs to drop empty strings.
  // rm-200 (review fix): the full `owner/name` PAIR is replaced UNANCHORED —
  // a complete pair in prose is always an identity reference, so suffix
  // contexts (`a/b-42` in check-run/deployment error strings) must not leak
  // the name via a failed boundary lookahead. Bare owner/name tokens keep
  // the anchored semantics above (residual: a bare name adjacent to '.' in
  // non-pair prose is accepted and documented).
  const tokens = [`${entry.owner}/${entry.name}`, entry.owner, entry.name]
    .filter(token => token.length > 0)
    .sort((a, b) => b.length - a.length)
  let out = text
  for (const token of tokens) {
    const pattern = token.includes('/')
      ? escapeRegExp(token)
      : String.raw`(?<![\w.-])${escapeRegExp(token)}(?![\w.-])`
    out = out.replaceAll(new RegExp(pattern, 'g'), '[REDACTED_REPO]')
  }
  return out
}

/**
 * Escape all regex metacharacters so a literal token stays literal.
 * Exported as an extraction seam for the boundary assertions in the property
 * suite (rm-200).
 */
export function escapeRegExp(text: string): string {
  return text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
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
  // rm-168: the bare "Resource not accessible by integration" form carries NO
  // vulnerability keyword, yet it is exactly the App-token permission denial
  // for this query — when the token lacks security_events:vulnerability_alerts
  // read, the vulnerabilityAlerts field is the only field the repo query
  // requests that needs it. Matching the generic message keeps the whole repo
  // from going stale on a pure alerts-permission gap; the worst case of a
  // broader false positive is one no-alerts retry that itself fails visible.
  return (
    msg.includes('vulnerabilityalerts') ||
    msg.includes('vulnerability_alerts') ||
    msg.includes('vulnerability alerts') ||
    msg.includes('resource not accessible by integration') ||
    (msg.includes('push access') && msg.includes('vulnerability'))
  )
}

/**
 * Parse a GraphQL response into a RepoCiStatus, with openAlertCount from the response
 * (or null if the field is absent/null).
 */
export function parseRepoResponse(raw: unknown, fetchedAt: number, openAlertCount: number | null): RepoCiStatus {
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
  fetchDeadlineMs: number,
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
    // Deadline-bounded: a hung GraphQL call degrades to a stale row for
    // this repo (the catch below) instead of stalling the refresh cycle.
    const raw = await withDeadline(
      graphqlQueryForInstallation(installationId, REPO_STATUS_QUERY, vars),
      fetchDeadlineMs,
      'per-repo graphql (repo identity withheld from deadline labels)',
    )
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
        // The no-alerts retry is deadline-bounded too.
        const raw = await withDeadline(
          graphqlQueryForInstallation(installationId, REPO_STATUS_QUERY_NO_ALERTS, vars),
          fetchDeadlineMs,
          'per-repo graphql retry (no-alerts)',
        )
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
// Outbound deadline machinery (this run's rm-197)
// ---------------------------------------------------------------------------

/**
 * Per-call deadline raced against every outbound call made during a refresh
 * cycle (metadata read, enumeration, per-repo GraphQL, installation
 * resolution). 15s is comfortably above a healthy GitHub round-trip (p99
 * GraphQL lands well under 5s) while guaranteeing that a fleet of N repos
 * cannot stall a 60s cycle indefinitely: worst case N × 15s before the
 * cycle ends, and the served snapshot goes bannered long before that via
 * the stall watchdog (see getSnapshot).
 */
export const AGGREGATOR_FETCH_DEADLINE_MS = 15_000

/**
 * Upper bound on concurrent per-repo status fetches (rm-141). The refresh
 * walk used to be strictly serial — wall-time per cycle summed every repo's
 * latency, which is what made a single slow endpoint punish the whole
 * fleet. A small fixed pool keeps GitHub-facing concurrency polite while
 * letting independent repos overlap.
 */
export const AGGREGATOR_REFRESH_CONCURRENCY = 4

/** Refresh interval (ms) — also the unit the stall watchdog counts in. */
export const AGGREGATOR_REFRESH_INTERVAL_MS = 60_000

/** A cycle still in flight after 2× the refresh interval serves the stale banner. */
const DEFAULT_STALE_AFTER_MS = 2 * AGGREGATOR_REFRESH_INTERVAL_MS

/**
 * Rejected by withDeadline when the wrapped promise does not settle within
 * its deadline. Distinct type so call sites can distinguish a timeout from
 * an underlying transport error when shaping the fail-visible response.
 */
class DeadlineExceededError extends Error {
  constructor(label: string) {
    super(`Outbound call exceeded its deadline: ${label}`)
    this.name = 'DeadlineExceededError'
  }
}

/**
 * Race a promise against a deadline. The losing underlying promise is NOT
 * cancelled (it keeps running in the background; its eventual settlement is
 * discarded) — what this guarantees is that the CALLER settles, so a hung
 * call can never stall the refresh loop or hold the in-flight guard
 * forever. True cancellation happens at the transport layer (the
 * GITHUB_REQUEST_TIMEOUT_MS bounds on the real clients).
 */
async function withDeadline<T>(promise: Promise<T>, deadlineMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new DeadlineExceededError(label))
    }, deadlineMs)
  })
  try {
    return await Promise.race([promise, deadline])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

/**
 * withDeadline, shaped for the Result-typed deps calls: a deadline breach is
 * returned AS a value (not thrown) so the existing isErr-style guards at the
 * call site can branch on it exactly like a transport failure.
 */
async function deadlineOr<T>(promise: Promise<T>, deadlineMs: number, label: string): Promise<T | DeadlineExceededError> {
  try {
    return await withDeadline(promise, deadlineMs, label)
  } catch (error) {
    if (error instanceof DeadlineExceededError) return error
    throw error
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
export function createAggregator(
  installationsClient: InstallationsClient,
  metadataReader: MetadataReader,
  deps: AggregatorDeps,
) {
  const {graphqlQueryForInstallation} = deps
  const now = deps.now ?? (() => Date.now())
  const setIntervalFn = deps.setIntervalFn ?? ((fn, ms) => setInterval(fn, ms))
  const clearIntervalFn = deps.clearIntervalFn ?? (id => clearInterval(id))
  const fetchDeadlineMs = deps.fetchDeadlineMs ?? AGGREGATOR_FETCH_DEADLINE_MS
  const refreshConcurrency = Math.max(1, deps.refreshConcurrency ?? AGGREGATOR_REFRESH_CONCURRENCY)
  const staleAfterMs = deps.staleAfterMs ?? DEFAULT_STALE_AFTER_MS

  // Last-good snapshot (serves stale data when refresh fails)
  let lastGoodSnapshot: AggregatorSnapshot | null = null

  // Interval handle
  let intervalHandle: ReturnType<typeof setInterval> | null = null

  // Stall watchdog: wall-clock start of the currently in-flight cycle (null
  // when idle). getSnapshot() serves the stale banner once a cycle has been
  // running longer than staleAfterMs — a cycle wedged on a hung call would
  // otherwise hold the in-flight guard forever and keep presenting the
  // last-good snapshot as fresh.
  let cycleStartedAt: number | null = null

  // In-flight guard: prevents overlapping refreshes. If a refresh cycle takes
  // longer than the 60s interval, the next tick is skipped rather than piling
  // up concurrent refreshes that race on lastGoodSnapshot.
  let refreshing = false

  /**
   * Mark the served snapshot stale — used by every fail-visible path
   * (metadata fail-closed, enumeration failure, unexpected refresh throw).
   * Cold start serves an empty bannered snapshot; otherwise the last-good
   * snapshot is preserved with staleBanner flipped on — a degraded snapshot
   * is never served as fresh.
   */
  function markSnapshotStale(): void {
    if (lastGoodSnapshot === null) {
      lastGoodSnapshot = {
        repos: [],
        staleBanner: true,
        driftCount: 0,
        enumerationIncomplete: null,
        refreshedAt: null,
      }
    } else {
      lastGoodSnapshot = {...lastGoodSnapshot, staleBanner: true}
    }
  }

  /**
   * Perform a full refresh cycle.
   *
   * Security: if readMetadata fails (denylist unavailable), we MUST NOT build
   * a fresh union. We serve last-good cache + staleBanner, or empty on cold start.
   */
  async function runRefresh(): Promise<void> {
    // 1. Read metadata + denylist FIRST (deadline-bounded)
    const metadataResult = await deadlineOr(deps.readMetadata(metadataReader), fetchDeadlineMs, 'metadata read')

    if (metadataResult instanceof DeadlineExceededError || isErr(metadataResult)) {
      // FAIL-CLOSED: denylist unavailable (or the read hung past its
      // deadline) — do NOT build a fresh union
      logger.warning('Metadata read failed or timed out; failing closed — serving stale/empty snapshot', {
        error: metadataResult instanceof DeadlineExceededError
          ? metadataResult.message
          : sanitizeErrorMessage(metadataResult.error.message),
      })

      if (lastGoodSnapshot === null) {
        // Cold start with no cache — serve empty with banner
        lastGoodSnapshot = {repos: [], staleBanner: true, driftCount: 0, enumerationIncomplete: null, refreshedAt: null}
      } else {
        // Serve last-good with staleBanner
        lastGoodSnapshot = {...lastGoodSnapshot, staleBanner: true}
      }
      return
    }

    const metadata = metadataResult.data

    // 2. Enumerate installation repos (deadline-bounded)
    const enumerateResult = await deadlineOr(deps.enumerate(installationsClient), fetchDeadlineMs, 'installation enumeration')

    let installRepos: readonly {node_id: string; database_id: number; owner: string; name: string; full_name: string; installation_id: number}[] = []
    let enumerationFailed = false
    let enumerationIncomplete: number | null = 0
    if (enumerateResult instanceof DeadlineExceededError) {
      // Enumeration hung past its deadline — treat exactly like an
      // enumeration failure: incomplete picture, bannered, never silent.
      enumerationFailed = true
      enumerationIncomplete = null
      logger.warning('Installation enumeration timed out; using empty install set — snapshot will be incomplete', {
        error: enumerateResult.message,
      })
    } else if (isOk(enumerateResult)) {
      installRepos = enumerateResult.data.repos
      enumerationIncomplete = enumerateResult.data.failedInstallationIds.length
    } else {
      enumerationFailed = true
      enumerationIncomplete = null
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
    // rm-112 (this cycle): resolver-failure / unresolved metadata-only repos get
    // an ABSENCE ENTRY instead of a silent drop. The identity is known (public
    // metadata, denylist already applied in buildWorkingSet), so the honest
    // representation is a fail-visible row (rollupState 'unknown', stale) that
    // sorts attention-first — not the repo vanishing from the dashboard while
    // its CI burns. Never queried, never logged by name here.
    const absentEntries: DashboardRepo[] = []
    const absenceStatus = (): RepoCiStatus => ({
      rollupState: 'unknown',
      failingChecks: 0,
      openPrCount: 0,
      openIssueCount: 0,
      openAlertCount: null,
      stale: true,
      // Review fix note: this stamp is the "never fetched, best effort"
      // placeholder for repos we have no prior data for. When the warm-empty
      // guard merges last-good with absence entries, a row we DO have prior
      // data for inherits that older fetchedAt instead (see below).
      fetchedAt: now(),
    })
    let workingSet: WorkingSetEntry[]
    if (deps.resolveInstallationIdForRepo === undefined) {
      // No resolver: repos with no installation_id cannot be queried safely —
      // surface them as absence entries rather than dropping them silently.
      workingSet = []
      for (const entry of rawWorkingSet) {
        if (entry.installation_id === null) {
          absentEntries.push(toAbsenceEntry(entry, absenceStatus()))
        } else {
          workingSet.push(entry)
        }
      }
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
          const resolvedId = await withDeadline(resolveInstallation(entry.owner, entry.name), fetchDeadlineMs, 'installation resolution')
          resolvedEntries.push({...entry, installation_id: resolvedId})
        } catch (resolveError) {
          logger.warning('Could not resolve installation for metadata-only repo; surfacing absence entry', safeRepoErrorContext(entry, resolveError))
          // No valid auth context — do NOT query with an ambient token; the
          // repo stays visible as a stale/unknown absence entry instead.
          absentEntries.push(toAbsenceEntry(entry, absenceStatus()))
        }
      }
      workingSet = resolvedEntries
    }

    // Warn if cross-format denylist protection is partial (new-format node_ids that
    // couldn't be decoded to a databaseId). The primary node_id guard still applies;
    // only the secondary databaseId guard is absent for those entries.
    if (!denylistComplete) {
      logger.warning(
        'Denylist cross-format protection is partial: one or more redacted entries have new-format node_ids (R_kgDO...) ' +
        'that could not be decoded to a numeric databaseId. The primary node_id guard still applies for same-format matches. ' +
        'If the installation channel returns the same repo under a different node_id format, it may not be excluded by the secondary guard.',
      )
    }

    if (workingSet.length === 0) {
      // rm-112 (this cycle): a WARM-EMPTY working set no longer replaces
      // last-good with a fresh empty list. If we ever served real repos and
      // the channel now yields nothing, the operator keeps seeing the last
      // known state under a stale banner — an empty board presenting itself
      // as fresh truth is the failure mode this guards against. Absence
      // entries collected this cycle still surface alongside last-good.
      if (lastGoodSnapshot !== null && lastGoodSnapshot.repos.length > 0) {
        logger.warning('Refresh produced an empty working set; serving last-good snapshot with stale banner', {
          enumerationIncomplete,
          driftCount,
        })
        // Review fix (independent review P3, 2026-09-25): a repo can sit in
        // last-good AND surface as an absence entry this cycle (installation
        // enumeration loss + resolver failure). Without dedup it renders
        // twice — stale cached state plus an unknown absence row. Prefer the
        // absence entry: the fresh channel's verdict ("cannot query now")
        // outranks cached state, mirroring how this guard treats last-good as
        // fallback-only. fetchedAt honesty: absence rows were never fetched
        // this cycle, so a row that exists in last-good inherits its last
        // true fetchedAt instead of now() — consumers keying on fetchedAt
        // must not read absence as the freshest data.
        const absenceByNodeId = new Map(absentEntries.map(repo => [repo.node_id, repo]))
        const lastGoodNodeIds = new Set(lastGoodSnapshot.repos.map(repo => repo.node_id))
        const servedRepos = lastGoodSnapshot.repos.map(repo => {
          const absence = absenceByNodeId.get(repo.node_id)
          if (absence === undefined) return repo
          return {...absence, status: {...absence.status, fetchedAt: repo.status.fetchedAt}}
        })
        for (const absence of absentEntries) {
          if (!lastGoodNodeIds.has(absence.node_id)) servedRepos.push(absence)
        }
        lastGoodSnapshot = {
          repos: sortAttentionFirst(servedRepos),
          staleBanner: true,
          enumerationIncomplete,
          driftCount,
          refreshedAt: lastGoodSnapshot.refreshedAt,
        }
        return
      }
      // Cold or already-empty state — absence entries (if any) are the whole
      // honest picture; nothing was dropped silently.
      // staleBanner=true if enumeration failed OR is incomplete — a partially
      // enumerated empty set must never read as authoritative emptiness
      // (review finding F2).
      lastGoodSnapshot = {
        repos: sortAttentionFirst([...absentEntries]),
        staleBanner: enumerationFailed || (enumerationIncomplete ?? 0) > 0,
        enumerationIncomplete,
        driftCount,
        refreshedAt: now(),
      }
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
    // rm-141: bounded-concurrency walk. Results are written to a fixed-index
    // array — completion order cannot permute the snapshot, so the served
    // row set stays deterministic no matter how the pool interleaves. Each
    // fetchRepoStatus call is deadline-bounded internally, so every worker
    // slot is guaranteed to free up; Promise.all can never hang.
    const statuses: (RepoCiStatus | undefined)[] = Array.from({length: workingSet.length})
    let nextIndex = 0
    const workerCount = Math.max(1, Math.min(refreshConcurrency, workingSet.length))
    const workers: Promise<void>[] = []
    for (let worker = 0; worker < workerCount; worker++) {
      workers.push(
        (async () => {
          while (true) {
            const index = nextIndex
            nextIndex += 1
            if (index >= workingSet.length) return
            const entry = workingSet[index]
            if (entry === undefined) continue
            statuses[index] = await fetchRepoStatus(entry, graphqlQueryForInstallation, now, fetchDeadlineMs)
          }
        })(),
      )
    }
    await Promise.all(workers)
    for (const [index, entry] of workingSet.entries()) {
      if (entry === undefined) continue
      dashboardRepos.push({
        node_id: entry.node_id,
        owner: entry.owner,
        name: entry.name,
        full_name: entry.full_name,
        discovery_channel: entry.discovery_channel,
        // Fixed-index read-back; the ?? is unreachable (every index is
        // assigned before Promise.all resolves) and exists only to satisfy
        // noUncheckedIndexedAccess.
        status: statuses[index] ?? {rollupState: 'unknown', failingChecks: 0, openPrCount: 0, openIssueCount: 0, openAlertCount: null, stale: true, fetchedAt: now()},
      })
    }

    // 4b. Append the absence entries collected during resolution (rm-112).
    dashboardRepos.push(...absentEntries)

    // 5. Sort attention-first and store snapshot (absence entries are
    // DashboardRepo rows and sort attention-first via stale:true).
    const sorted = sortAttentionFirst(dashboardRepos)
    // staleBanner=true if enumeration failed OR is incomplete — data is
    // incomplete (install repos missing). We still show metadata publicRepos
    // (they are public and safe), but the operator must know the installation
    // channel data is absent.
    lastGoodSnapshot = {repos: sorted, staleBanner: enumerationFailed || (enumerationIncomplete ?? 0) > 0, driftCount, enumerationIncomplete, refreshedAt: now()}

    logger.info('Aggregator refresh complete', {
      repoCount: sorted.length,
      absenceCount: absentEntries.length,
      driftCount,
      enumerationFailed,
      enumerationIncomplete,
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
    cycleStartedAt = now()
    try {
      await runRefresh()
    } catch (error) {
      // An unexpected throw must not silently serve the last-good snapshot as
      // if it were fresh — mark it stale (fail-visible).
      logger.error('Aggregator refresh threw unexpectedly; marking served snapshot stale', {
        error: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)),
      })
      markSnapshotStale()
    } finally {
      refreshing = false
      cycleStartedAt = null
    }
  }

  /**
   * Get the current snapshot. If no refresh has ever completed, serves the
   * same empty bannered snapshot the fail-visible paths serve (rm-197): a
   * refresh may still be in flight, and `staleBanner: false` with `repos: []`
   * would present "authoritatively verified empty" while the very first walk
   * is still running.
   */
  function getSnapshot(): AggregatorSnapshot {
    if (lastGoodSnapshot === null) {
      return {repos: [], staleBanner: true, driftCount: 0, enumerationIncomplete: null, refreshedAt: null}
    }
    // Stall watchdog: while a cycle is in flight longer than staleAfterMs
    // (default 2× the refresh interval), the served snapshot carries the
    // stale banner even though lastGood is unchanged — a wedged cycle must
    // never keep presenting itself as fresh data. (With the per-call
    // deadlines above this window is bounded anyway; the watchdog is the
    // belt to that braces.)
    if (cycleStartedAt !== null && now() - cycleStartedAt > staleAfterMs) {
      return {...lastGoodSnapshot, staleBanner: true}
    }
    return lastGoodSnapshot
  }

  /**
   * Start the background refresh interval (60s). Also triggers an immediate refresh.
   *
   * rm-201: a duplicate start() must not leak the first interval — intervalHandle
   * holds only one id, so a second assignment would orphan the first tick
   * forever (stop() clears only the latest handle).
   */
  async function start(): Promise<void> {
    if (intervalHandle !== null) {
      logger.debug('Aggregator already started; ignoring duplicate start')
      return
    }
    // rm-197: install the interval BEFORE awaiting the first refresh so a
    // stalled first walk cannot leave the process without a tick. The
    // `refreshing` overlap guard makes an early tick a no-op, and all five
    // GitHub transport constructions carry the 30s request timeout via
    // GITHUB_REQUEST_TIMEOUT_MS (app-client ThrottledOctokit, installations
    // Octokit, server.ts metadata Octokit, server.ts per-repo graphql;
    // auth/oauth.ts is bounded by AbortSignal.timeout), so the awaited first
    // walk is bounded too.
    intervalHandle = setIntervalFn(() => {
      refresh().catch(error => {
        // Belt-and-braces: refresh() already catches and marks stale; this
        // guards against a future regression re-introducing a reject path.
        logger.error('Aggregator background refresh threw unexpectedly', {
          error: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)),
        })
        markSnapshotStale()
      })
    }, AGGREGATOR_REFRESH_INTERVAL_MS)

    // rm-197: the first walk is awaited (warm boot) but — with the interval
    // already armed and all five transports time-bounded (see above) — it
    // can no longer wedge the process if it stalls.
    await refresh()
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
