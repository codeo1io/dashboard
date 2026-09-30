/**
 * Installation enumeration and repo union for the dashboard.
 *
 * Flow (dashboard-specific — structurally different from the gateway's per-repo flow):
 *   App JWT → listInstallations → per-install read-only token → GET /installation/repositories
 *   → union + dedupe by node_id across all installs.
 *
 * Security invariants:
 * - Every installation token is minted with an EXPLICIT read-only permissions object.
 * - `security_events` and `vulnerability_alerts` are optional: if the mint fails with
 *   those scopes, we retry with only the core read scopes (graceful degradation).
 * - Installation tokens are never logged.
 * - Errors are surfaced as `Result<T,E>` — callers serve stale/empty on failure.
 */

import type {Result} from '../result.ts'
import type {DashboardAppClient} from './app-client.ts'

import {Octokit} from '@octokit/core'
import {logger} from '../logger.ts'
import {err, ok} from '../result.ts'
import {createBoundedFetch, GITHUB_REQUEST_TIMEOUT_MS, safeErrorMessage} from './app-client.ts'

// ---------------------------------------------------------------------------
// Read-only permissions
// ---------------------------------------------------------------------------

/**
 * Core read-only permissions that MUST always be present on every installation token.
 * These are the non-optional scopes — if the mint fails with these, it's a hard error.
 */
export const CORE_READ_PERMISSIONS = {
  pull_requests: 'read',
  checks: 'read',
  issues: 'read',
  contents: 'read',
  metadata: 'read',
} as const satisfies Record<string, 'read'>

/**
 * Optional read-only permissions. If the App doesn't have these registered,
 * the mint will fail — we catch that and retry with only CORE_READ_PERMISSIONS.
 */
export const OPTIONAL_READ_PERMISSIONS = {
  security_events: 'read',
  vulnerability_alerts: 'read',
} as const satisfies Record<string, 'read'>

/**
 * Full read-only permissions object (core + optional).
 * This is the preferred set — used on first mint attempt.
 */
export const FULL_READ_PERMISSIONS: Record<string, 'read'> = {
  ...CORE_READ_PERMISSIONS,
  ...OPTIONAL_READ_PERMISSIONS,
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RepoRecord {
  readonly node_id: string
  /**
   * GitHub's numeric repository id (REST `repository.id` = databaseId).
   * This is the stable cross-format join key: GitHub has two node_id formats
   * (legacy base64 `MDEwOlJlcG9zaXRvcnkx` and new `R_kgDO...`), but the
   * numeric database_id is stable across both. Used as a secondary denylist
   * key in the aggregator to close the node_id format-mismatch gap.
   */
  readonly database_id: number
  readonly owner: string
  readonly name: string
  readonly full_name: string
  /**
   * The installation ID that produced this repo record.
   * Required for per-repo GraphQL authentication — each repo must be queried
   * with a token minted for the installation that can see it.
   */
  readonly installation_id: number
}

export interface InstallationRecord {
  readonly id: number
  readonly account: string | null
}

export interface EnumerateReposResult {
  readonly repos: readonly RepoRecord[]
  readonly installations: readonly InstallationRecord[]
  /**
   * Installations whose token mint or repo listing failed during enumeration
   * (ids only — account names never leave this module). Non-empty means the
   * union is PARTIAL: repos reachable only through these installations are
   * missing from `repos`. Callers must surface this instead of presenting the
   * snapshot as complete (fail-visible enumeration).
   */
  readonly failedInstallationIds: readonly number[]
}

export class FetchInstallationsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FetchInstallationsError'
  }
}

// ---------------------------------------------------------------------------
// Dependency injection interface (for testability)
// ---------------------------------------------------------------------------

/**
 * Result of minting an installation token (rm-185).
 *
 * `expiresAt` is the API-provided token expiry; `null` when the mint
 * boundary could not determine one (the cache then falls back to its
 * capped 55-min default).
 */
export interface MintedToken {
  readonly token: string
  readonly expiresAt: Date | null
}

/**
 * Repo identity sufficient to mint a repository-scoped installation token
 * (rm-118). GitHub's mint endpoint accepts numeric `repository_ids`, so the
 * database id — not owner/name — is the scoping key; owner/name keep traveling
 * in the query variables.
 */
export interface RepoTokenScope {
  readonly databaseId: number
}

/**
 * rm-118: capabilities a mint request can bound beyond the permission subset.
 */
export interface MintScope {
  /**
   * GitHub App id the mintFn authenticates as. Partitions the token cache so
   * two App identities (or two permission sets) can never be served each
   * other's tokens (rm-118).
   */
  readonly appId?: string
  /**
   * Numeric repository database ids (GitHub `repository_ids` at the mint
   * endpoint). When set, the minted token can only access those repositories —
   * per-repo status queries pass exactly one id, so a leaked token opens
   * exactly the repo it was minted for. Undefined = installation-wide
   * (enumeration / metadata-read class keeps this).
   */
  readonly repositoryIds?: readonly number[]
}

/** Cache namespace for callers that do not know their App identity (rm-118). */
export const UNSPECIFIED_APP_NAMESPACE = 'app-unspecified'

export interface InstallationsClient {
  /**
   * List all App installations (App-JWT-level call).
   */
  readonly listInstallations: () => Promise<readonly InstallationRecord[]>
  /**
   * Mint a read-only installation token for the given installation ID.
   * Returns the raw token string plus its real expiry. NEVER log the token.
   */
  readonly mintInstallationToken: (
    installationId: number,
    permissions: Record<string, 'read'>,
    repositoryIds?: readonly number[],
  ) => Promise<MintedToken>
  /**
   * App identity used to partition the shared token cache (rm-118). Optional
   * so hand-rolled test fakes keep typechecking; production clients set it.
   */
  readonly appId?: string
  /**
   * List all repos accessible to the given installation token.
   * Returns records without installation_id — enumerateRepos attaches it.
   */
  readonly listInstallationRepos: (token: string) => Promise<readonly Omit<RepoRecord, 'installation_id'>[]>
}

// ---------------------------------------------------------------------------
// In-memory token cache
// ---------------------------------------------------------------------------

interface CachedToken {
  readonly token: string
  readonly expiresAt: number // ms since epoch
}

const TOKEN_EXPIRY_BUFFER_MS = 60_000 // refresh 1 min before expiry

const tokenCache = new Map<string, CachedToken>()

/**
 * rm-118: the cache key is the FULL mint identity — (appId, installationId,
 * permission subset, repository scope) — never installationId alone. The old
 * installationId-only key let two App identities or two permission sets
 * collide on one entry (a CORE-degraded token silently served to a caller
 * that asked for FULL), and would have let a repo-scoped token masquerade as
 * an installation-wide one. Mint-ceiling note: GitHub allows 5000
 * installation-token mints per hour per installation; the capped cache keeps
 * steady-state volume at roughly one mint per DISTINCT cache key per hour per
 * installation (enumeration + metadata read + one key per status-queried
 * repo) — orders of magnitude under the ceiling.
 */
function tokenCacheKey(
  appId: string,
  installationId: number,
  permissions: Record<string, 'read'>,
  repositoryIds: readonly number[] | undefined,
): string {
  const perms = Object.keys(permissions).sort().join(',')
  const repos = repositoryIds === undefined ? 'all' : [...repositoryIds].sort((a, b) => a - b).join(',')
  return `app=${appId}|installation=${installationId}|permissions=${perms}|repositories=${repos}`
}

/** rm-118: deterministic-cache hook for tests (the cache is module-global). */
export function resetTokenCache(): void {
  tokenCache.clear()
}

function getCachedToken(cacheKey: string): string | null {
  const cached = tokenCache.get(cacheKey)
  if (cached === undefined) return null
  if (Date.now() >= cached.expiresAt - TOKEN_EXPIRY_BUFFER_MS) {
    tokenCache.delete(cacheKey)
    return null
  }
  return cached.token
}

function setCachedToken(cacheKey: string, token: string, expiresAt: Date | null): void {
  // rm-185: honor the API-provided expiry, but CAP it at the historical
  // 55-min guess — a far-future expiry can never extend a token's cached
  // life beyond the pre-seam behavior. The cap doubles as the fallback when
  // the mint boundary could not determine an expiry. Ill-formed dates
  // (NaN) fall back to the cap too: a NaN expiry would never compare stale.
  const cappedDefaultMs = Date.now() + 55 * 60 * 1000
  const rawMs = expiresAt === null ? Number.NaN : expiresAt.getTime()
  const expiresAtMs = Number.isNaN(rawMs) ? cappedDefaultMs : Math.min(rawMs, cappedDefaultMs)
  tokenCache.set(cacheKey, {token, expiresAt: expiresAtMs})
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

/**
 * Classify a mint error as permission-shaped (rm-170).
 *
 * GitHub App installation-token minting rejects ungranted permissions with
 * HTTP 403. Only that class can plausibly be fixed by retrying with the core
 * subset. Everything else (5xx, 429, timeouts, network errors without a
 * status) is transient/infra and must fail visibly instead.
 */
function isPermissionShapedMintError(error: unknown): boolean {
  const shaped = error as
    | {status?: unknown; response?: {headers?: Record<string, unknown>} | null}
    | null
    | undefined
  if (shaped?.status !== 403) return false
  // GitHub returns 403 — not 429 — for rate limits: primary exhaustion sends
  // `x-ratelimit-remaining: 0` and secondary limits send `retry-after`. Those
  // are transient conditions, not permission verdicts: classify them OUT of
  // the permission shape so a rate-limited mint rethrows instead of caching
  // a reduced-scope token for the cache TTL (review finding F1).
  const headers = shaped.response?.headers ?? {}
  const remaining = headers['x-ratelimit-remaining']
  if (remaining === '0' || remaining === 0) return false
  if ('retry-after' in headers) return false
  return true
}

/**
 * Mint a read-only installation token with graceful optional-scope degradation.
 *
 * First attempts to mint with FULL_READ_PERMISSIONS (core + optional).
 * If that fails with a permission-shaped 403 (rm-170), retries with only
 * CORE_READ_PERMISSIONS. Any other error rethrows — never cached, never
 * silently degraded — so the caller reports the failure.
 * If the core-only mint also fails, throws.
 *
 * rm-118: `scope` bounds the mint. `repositoryIds` requests a
 * repository-scoped token via the mint endpoint's `repository_ids` array —
 * per-repo status queries pass exactly one id. `appId` partitions the cache.
 * The permission-subset downgrade (rm-170) and the expiry cap (rm-185) are
 * unchanged; a CORE-fallback token is cached under its own key so it is
 * never served to a later FULL-expecting caller.
 */
export async function mintReadOnlyToken(
  installationId: number,
  mintFn: (
    installationId: number,
    permissions: Record<string, 'read'>,
    repositoryIds?: readonly number[],
  ) => Promise<MintedToken>,
  scope: MintScope = {},
): Promise<string> {
  const appId = scope.appId ?? UNSPECIFIED_APP_NAMESPACE
  const {repositoryIds} = scope
  // Only thread repositoryIds through when set, so unscoped mints keep the
  // exact 2-arg call shape existing fakes/tests assert on.
  const callMint = async (permissions: Record<string, 'read'>) =>
    repositoryIds === undefined
      ? mintFn(installationId, permissions)
      : mintFn(installationId, permissions, repositoryIds)

  // Check cache first (rm-118: keyed by the full mint identity)
  const fullKey = tokenCacheKey(appId, installationId, FULL_READ_PERMISSIONS, repositoryIds)
  const cached = getCachedToken(fullKey)
  if (cached !== null) return cached

  // Try full permissions first
  try {
    const minted = await callMint(FULL_READ_PERMISSIONS)
    // rm-185: cache against the API-provided expiry (capped in setCachedToken)
    setCachedToken(fullKey, minted.token, minted.expiresAt)
    return minted.token
  } catch (fullError) {
    if (!isPermissionShapedMintError(fullError)) {
      // rm-170: only permission-shaped 403s justify the scope fallback. A
      // transient error (network blip, 5xx, 429, timeout) must NOT degrade
      // the permission subset — rethrow so the caller records this
      // installation as failed (fail-visible) instead of caching a
      // reduced-scope token for the cache TTL.
      logger.error('Installation token mint failed (non-permission error; no scope fallback)', {
        installationId,
        repositoryIds: repositoryIds ?? 'all',
        error: safeErrorMessage(fullError),
      })
      throw fullError
    }
    logger.warning('Failed to mint token with optional scopes (permission-shaped); retrying with core scopes only', {
      installationId,
      repositoryIds: repositoryIds ?? 'all',
      error: safeErrorMessage(fullError),
    })
  }

  // Retry with core-only permissions. Cached under its OWN key (rm-118) so a
  // CORE-degraded token can never be served to a later FULL-expecting caller.
  const minted = await callMint(CORE_READ_PERMISSIONS)
  setCachedToken(tokenCacheKey(appId, installationId, CORE_READ_PERMISSIONS, repositoryIds), minted.token, minted.expiresAt)
  return minted.token
}

/**
 * Enumerate all installations, mint read-only tokens, and union accessible repos.
 *
 * Returns `err(FetchInstallationsError)` if `listInstallations` fails.
 * Per-install token mint/list failures are logged, skipped (fail-soft per
 * install), and reported via `failedInstallationIds` so callers can surface
 * the partial union instead of presenting it as complete.
 * Repos are deduped by `node_id` across all installs.
 */
export async function enumerateRepos(
  client: InstallationsClient,
): Promise<Result<EnumerateReposResult, FetchInstallationsError>> {
  let installations: readonly InstallationRecord[]
  try {
    installations = await client.listInstallations()
  } catch (error) {
    const msg = safeErrorMessage(error)
    logger.error('Failed to list GitHub App installations', {error: msg})
    return err(new FetchInstallationsError(`Failed to list installations: ${msg}`))
  }

  if (installations.length === 0) {
    return ok({repos: [], installations: [], failedInstallationIds: []})
  }

  logger.debug('Enumerating repos across installations', {count: installations.length})

  const reposByNodeId = new Map<string, RepoRecord>()
  const failedInstallationIds: number[] = []

  for (const installation of installations) {
    let token: string
    try {
      // rm-118: enumeration is the WIDE-mint class — it must list every repo
      // the installation can see — so it keeps the installation-wide token;
      // the appId namespace keeps this cache entry distinct from the
      // repo-scoped keys minted for status queries.
      token = await mintReadOnlyToken(installation.id, client.mintInstallationToken, {appId: client.appId})
    } catch (mintError) {
      logger.warning('Failed to mint installation token; counting degraded installation', {
        installationId: installation.id,
        error: safeErrorMessage(mintError),
      })
      failedInstallationIds.push(installation.id)
      continue
    }

    let repos: readonly Omit<RepoRecord, 'installation_id'>[]
    try {
      repos = await client.listInstallationRepos(token)
    } catch (repoError) {
      logger.warning('Failed to list repos for installation; counting degraded installation', {
        installationId: installation.id,
        error: safeErrorMessage(repoError),
      })
      failedInstallationIds.push(installation.id)
      continue
    }

    for (const repo of repos) {
      if (!reposByNodeId.has(repo.node_id)) {
        // Attach the producing installation's id — required for per-repo GraphQL auth.
        // First-seen-wins dedupe: the retained record's installation_id is always an
        // installation that actually saw this repo.
        reposByNodeId.set(repo.node_id, {...repo, installation_id: installation.id})
      }
    }
  }

  return ok({
    repos: [...reposByNodeId.values()],
    installations,
    failedInstallationIds,
  })
}

// ---------------------------------------------------------------------------
// Real client factory (uses DashboardAppClient)
// ---------------------------------------------------------------------------

async function listInstallationReposWithToken(token: string): Promise<readonly Omit<RepoRecord, 'installation_id'>[]> {
  const installOctokit = new Octokit({
    auth: token,
    // rm-197: serial per-repo walk must not stall the refresh. rm-267: the
    // bare `timeout` key is INERT on hung upstreams (rm-156) — ride
    // createBoundedFetch like the app-client siblings (transport contract).
    request: {
      timeout: GITHUB_REQUEST_TIMEOUT_MS,
      fetch: createBoundedFetch(GITHUB_REQUEST_TIMEOUT_MS),
    },
  })

  const repos: Omit<RepoRecord, 'installation_id'>[] = []
  let page = 1
  while (true) {
    const response = await installOctokit.request('GET /installation/repositories', {
      per_page: 100,
      page,
    })
    const data = response.data as unknown as {
      total_count: number
      repositories: {
        id: number
        node_id: string
        owner: {login: string}
        name: string
        full_name: string
      }[]
    }
    for (const repo of data.repositories) {
      repos.push({
        node_id: repo.node_id,
        database_id: repo.id,
        owner: repo.owner.login,
        name: repo.name,
        full_name: repo.full_name,
      })
    }
    if (repos.length >= data.total_count || data.repositories.length < 100) break
    page++
  }
  return repos
}

/**
 * Build a real `InstallationsClient` from a `DashboardAppClient`.
 * The Octokit instance in the client is JWT-authenticated (App-level).
 */
export function buildInstallationsClient(appClient: DashboardAppClient): InstallationsClient {
  async function listInstallations(): Promise<readonly InstallationRecord[]> {
    const installations: InstallationRecord[] = []
    let page = 1
    while (true) {
      const response = await appClient.octokit.request('GET /app/installations', {
        per_page: 100,
        page,
      })
      const data = response.data as unknown as {id: number; account: {login: string} | null}[]
      for (const install of data) {
        installations.push({
          id: install.id,
          account: install.account?.login ?? null,
        })
      }
      if (data.length < 100) break
      page++
    }
    return installations
  }

  return {
    appId: appClient.appId,
    listInstallations,
    mintInstallationToken: async (installationId, permissions, repositoryIds) =>
      appClient.mintInstallationToken(installationId, permissions, repositoryIds),
    listInstallationRepos: listInstallationReposWithToken,
  }
}
