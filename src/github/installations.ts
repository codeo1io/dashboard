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
import type {RestRequestFn} from './conditional-reads.ts'

import {Octokit} from '@octokit/core'
import {logger} from '../logger.ts'
import {err, ok} from '../result.ts'
import {createBoundedFetch, GITHUB_REQUEST_TIMEOUT_MS, safeErrorMessage} from './app-client.ts'
import {ifNoneMatchHeader, normalizeEtag} from './conditional-reads.ts'

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
  ) => Promise<MintedToken>
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

const tokenCache = new Map<number, CachedToken>()

const TOKEN_EXPIRY_BUFFER_MS = 60_000 // refresh 1 min before expiry

/**
 * Upper bound on cached installation tokens. Insertion-ordered Map eviction,
 * LRU-style: getCachedToken re-inserts an entry on every hit, so the drop
 * order tracks recency of USE rather than first insertion — when the cache
 * is full and a NEW installation id is being cached, the least-recently-used
 * entry goes first (review fix 2026-09-26: plain FIFO evicted the hottest
 * entry under churn). The live installation census is normally far smaller;
 * this bound exists so churn (install/uninstall cycles) can never grow the
 * map without limit (2026-09-26, cycle batch B2b).
 */
const TOKEN_CACHE_MAX = 32

/** Drop entries whose tokens are fully expired (not merely near-expiry). */
function sweepExpiredTokens(now = Date.now()): void {
  for (const [installationId, cached] of tokenCache) {
    if (now >= cached.expiresAt) {
      tokenCache.delete(installationId)
    }
  }
}

/** Drop cached tokens for installations absent from a successful census. */
function pruneTokenCache(knownInstallationIds: ReadonlySet<number>): void {
  for (const installationId of tokenCache.keys()) {
    if (!knownInstallationIds.has(installationId)) {
      tokenCache.delete(installationId)
    }
  }
}

function getCachedToken(installationId: number): string | null {
  const cached = tokenCache.get(installationId)
  if (cached === undefined) return null
  if (Date.now() >= cached.expiresAt - TOKEN_EXPIRY_BUFFER_MS) {
    tokenCache.delete(installationId)
    return null
  }
  // LRU refresh: re-insert on hit so eviction order tracks recency of use.
  tokenCache.delete(installationId)
  tokenCache.set(installationId, cached)
  return cached.token
}

function setCachedToken(installationId: number, token: string, expiresAt: Date | null): void {
  // Opportunistic hygiene on every insert (2026-09-26, cycle batch B2b):
  // expired entries left behind by departed installations used to linger
  // forever (entries were only ever deleted on their own re-access), and the
  // LRU-style bound below keeps install/uninstall churn from growing the map
  // without limit.
  sweepExpiredTokens()
  if (!tokenCache.has(installationId) && tokenCache.size >= TOKEN_CACHE_MAX) {
    const lru = tokenCache.keys().next()
    if (!lru.done) {
      tokenCache.delete(lru.value)
    }
  }
  // rm-185: honor the API-provided expiry, but CAP it at the historical
  // 55-min guess — a far-future expiry can never extend a token's cached
  // life beyond the pre-seam behavior. The cap doubles as the fallback when
  // the mint boundary could not determine an expiry. Ill-formed dates
  // (NaN) fall back to the cap too: a NaN expiry would never compare stale.
  const cappedDefaultMs = Date.now() + 55 * 60 * 1000
  const rawMs = expiresAt === null ? Number.NaN : expiresAt.getTime()
  const expiresAtMs = Number.isNaN(rawMs) ? cappedDefaultMs : Math.min(rawMs, cappedDefaultMs)
  tokenCache.set(installationId, {token, expiresAt: expiresAtMs})
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
 */
export async function mintReadOnlyToken(
  installationId: number,
  mintFn: (installationId: number, permissions: Record<string, 'read'>) => Promise<MintedToken>,
): Promise<string> {
  // Check cache first
  const cached = getCachedToken(installationId)
  if (cached !== null) return cached

  // Try full permissions first
  try {
    const minted = await mintFn(installationId, FULL_READ_PERMISSIONS)
    // rm-185: cache against the API-provided expiry (capped in setCachedToken)
    setCachedToken(installationId, minted.token, minted.expiresAt)
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
        error: safeErrorMessage(fullError),
      })
      throw fullError
    }
    logger.warning('Failed to mint token with optional scopes (permission-shaped); retrying with core scopes only', {
      installationId,
      error: safeErrorMessage(fullError),
    })
  }

  // Retry with core-only permissions
  const minted = await mintFn(installationId, CORE_READ_PERMISSIONS)
  setCachedToken(installationId, minted.token, minted.expiresAt)
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
    // Prune against the (empty) census before the early return — an empty
    // census means NO installations are reachable, so no cached token can
    // still be needed.
    pruneTokenCache(new Set<number>())
    return ok({repos: [], installations: [], failedInstallationIds: []})
  }

  // The successful census is the ground truth for which installation tokens
  // may still be needed — drop tokens for installations that no longer exist
  // instead of leaving them to expire silently in the map.
  pruneTokenCache(new Set(installations.map(installation => installation.id)))

  logger.debug('Enumerating repos across installations', {count: installations.length})

  const reposByNodeId = new Map<string, RepoRecord>()
  const failedInstallationIds: number[] = []

  for (const installation of installations) {
    let token: string
    try {
      token = await mintReadOnlyToken(installation.id, client.mintInstallationToken)
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

/** rm-162: one repo-list page's last-known-good state (etag + parsed items + seen total). */
interface RepoListPageCacheEntry {
  readonly etag: string | null
  readonly items: readonly Omit<RepoRecord, 'installation_id'>[]
  readonly total_count: number
}

/**
 * rm-162: per-(token, page) ETag cache for the installation repo-list walk.
 * Keyed by the installation token (the authorization scope of the list), so
 * entries die with the ≤55-minute token-cache rotation; bounded to a small
 * fleet-sized number of tokens with insert-order eviction.
 */
const REPO_LIST_PAGE_CACHE_MAX_TOKENS = 16
const repoListPageCache = new Map<string, Map<number, RepoListPageCacheEntry>>()

/**
 * Paginate GET /installation/repositories through an injectable request
 * seam, with conditional reads (rm-162): each page carries If-None-Match
 * from its stored ETag; a 304 reuses that page's cached items unchanged.
 * 304s are free against the primary rate limit, so a steady-state 60s cycle
 * pays zero full-body repo-list reads. A 200 refreshes the page's cache.
 *
 * GitHub only answers 304 to a matching If-None-Match (i.e. when we had a
 * cached page); the defensive no-cache 304 branch drops the page and
 * re-requests unconditionally rather than silently serving an empty page.
 *
 * Errors propagate to the caller's existing degraded-installation handling —
 * a failed conditional read behaves exactly like a failed plain read.
 */
export async function listInstallationReposPages(
  request: RestRequestFn,
  cacheKey: string,
): Promise<readonly Omit<RepoRecord, 'installation_id'>[]> {
  let pages = repoListPageCache.get(cacheKey)
  if (pages === undefined) {
    pages = new Map()
    repoListPageCache.set(cacheKey, pages)
    while (repoListPageCache.size > REPO_LIST_PAGE_CACHE_MAX_TOKENS) {
      const oldest = repoListPageCache.keys().next().value
      if (oldest === undefined) break
      repoListPageCache.delete(oldest)
    }
  }

  const repos: Omit<RepoRecord, 'installation_id'>[] = []
  let page = 1
  let total = 0
  while (true) {
    const cached = pages.get(page)
    const response = await request('GET /installation/repositories', {
      per_page: 100,
      page,
      headers: ifNoneMatchHeader(cached?.etag ?? null),
    })
    let pageItems: readonly Omit<RepoRecord, 'installation_id'>[]
    if (response.status === 304) {
      if (cached === undefined) {
        pages.delete(page)
        continue // re-request this page without a conditional header (bounded: once)
      }
      logger.debug('installation repo-list page 304 Not Modified — reusing cached page (rm-162)')
      pageItems = cached.items
      total = cached.total_count
    } else {
      const data = response.data as {
        total_count: number
        repositories: {
          id: number
          node_id: string
          owner: {login: string}
          name: string
          full_name: string
        }[]
      }
      pageItems = data.repositories.map(repo => ({
        node_id: repo.node_id,
        database_id: repo.id,
        owner: repo.owner.login,
        name: repo.name,
        full_name: repo.full_name,
      }))
      total = data.total_count
      pages.set(page, {etag: normalizeEtag(response.headers.etag), items: pageItems, total_count: data.total_count})
    }
    repos.push(...pageItems)
    if (repos.length >= total || pageItems.length < 100) break
    page++
  }
  return repos
}

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
  // rm-162: the token doubles as the cache key — the repo-list view is
  // scoped to the token's authorization, so entries die with token rotation.
  return listInstallationReposPages(async (route, params) => installOctokit.request(route, params), token)
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
    listInstallations,
    mintInstallationToken: appClient.mintInstallationToken,
    listInstallationRepos: listInstallationReposWithToken,
  }
}
