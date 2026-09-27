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

import {logger} from '../logger.ts'
import {err, ok} from '../result.ts'
import {createInstallationOctokit, safeErrorMessage} from './app-client.ts'

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
   *
   * `installationId` (rm-162) scopes the If-None-Match page cache to the
   * installation whose token is presented — omit it only for one-shot calls
   * that must not consult or populate the cache.
   */
  readonly listInstallationRepos: (
    token: string,
    installationId?: number,
  ) => Promise<readonly Omit<RepoRecord, 'installation_id'>[]>
}

// ---------------------------------------------------------------------------
// In-memory token cache
// ---------------------------------------------------------------------------

/** rm-221: refresh a cached token this long before its true expiry. */
const TOKEN_EXPIRY_BUFFER_MS = 60_000

interface CachedToken {
  readonly token: string
  readonly expiresAt: number // ms since epoch
}

/**
 * Per-instance installation-token cache (rm-221).
 *
 * Previously a module-global `Map` shared by every caller with no eviction
 * path: tokens for uninstalled installations lingered until process exit,
 * and expiry checks read `Date.now()` directly (untestable). The class takes
 * an injectable clock and exposes explicit eviction so the enumeration sweep
 * can drop entries the App no longer reports.
 */
export class InstallationTokenCache {
  readonly #cache = new Map<number, CachedToken>()
  readonly #now: () => number

  constructor(now: () => number = () => Date.now()) {
    this.#now = now
  }

  get(installationId: number): string | null {
    const cached = this.#cache.get(installationId)
    if (cached === undefined) return null
    if (this.#now() >= cached.expiresAt - TOKEN_EXPIRY_BUFFER_MS) {
      this.#cache.delete(installationId)
      return null
    }
    return cached.token
  }

  set(installationId: number, token: string, expiresAt: Date | null): void {
    // rm-185: honor the API-provided expiry, but CAP it at the historical
    // 55-min guess — a far-future expiry can never extend a token's cached
    // life beyond the pre-seam behavior. The cap doubles as the fallback when
    // the mint boundary could not determine an expiry. Ill-formed dates
    // (NaN) fall back to the cap too: a NaN expiry would never compare stale.
    const cappedDefaultMs = this.#now() + 55 * 60 * 1000
    const rawMs = expiresAt === null ? Number.NaN : expiresAt.getTime()
    const expiresAtMs = Number.isNaN(rawMs) ? cappedDefaultMs : Math.min(rawMs, cappedDefaultMs)
    this.#cache.set(installationId, {token, expiresAt: expiresAtMs})
  }

  /** rm-221: drop a single installation's cached token (installation removed). */
  evict(installationId: number): void {
    this.#cache.delete(installationId)
  }

  /**
   * rm-221: drop every cached token whose installation id is NOT in
   * `retain`. Returns the evicted ids so the sweep can log what it dropped.
   */
  evictExcept(retain: readonly number[]): readonly number[] {
    const keep = new Set(retain)
    const evicted: number[] = []
    for (const id of this.#cache.keys()) {
      if (!keep.has(id)) {
        this.#cache.delete(id)
        evicted.push(id)
      }
    }
    return evicted
  }
}

/** Module-default cache — production wiring; tests construct scoped instances. */
const tokenCache = new InstallationTokenCache()

function getCachedToken(installationId: number): string | null {
  return tokenCache.get(installationId)
}

function setCachedToken(installationId: number, token: string, expiresAt: Date | null): void {
  tokenCache.set(installationId, token, expiresAt)
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
    // rm-221: an empty (successful) installation list means every cached
    // token is stale — evict them all rather than letting removed
    // installations hold tokens until process exit.
    const evicted = tokenCache.evictExcept([])
    if (evicted.length > 0) {
      logger.debug('Evicted cached tokens for removed installations', {count: evicted.length})
    }
    return ok({repos: [], installations: [], failedInstallationIds: []})
  }

  // rm-221: sweep tokens for installations the App no longer reports.
  // `listInstallations` succeeded, so the current set is authoritative.
  const evicted = tokenCache.evictExcept(installations.map(install => install.id))
  if (evicted.length > 0) {
    logger.debug('Evicted cached tokens for removed installations', {
      count: evicted.length,
      installationIds: evicted,
    })
  }

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
      repos = await client.listInstallationRepos(token, installation.id)
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

/**
 * rm-162: one page of the installation repo list, cached with its ETag so
 * the next walk can send `If-None-Match` and treat 304 Not Modified as
 * "this page is unchanged". 304 responses are free against GitHub's primary
 * rate limit, so a steady-state cycle pays N cheap requests instead of N
 * full payload downloads.
 */
interface CachedRepoPage {
  readonly etag: string | null
  readonly items: readonly Omit<RepoRecord, 'installation_id'>[]
}

interface RepoListOptions {
  /** Per-request timeout override; defaults to GITHUB_REQUEST_TIMEOUT_MS. */
  readonly requestTimeoutMs?: number
  /** Fetch override for tests — forwarded to the Octokit request layer. */
  readonly fetch?: typeof globalThis.fetch
}

/**
 * rm-221 + rm-162: build a per-client-instance repo-list function.
 *
 * - Transport: every page request goes through `createInstallationOctokit` —
 *   the SAME throttle + retry plugin chain as the App client. A bare
 *   token-authenticated Octokit has no primary/secondary-rate-limit or
 *   transient-5xx handling (grep target of rm-221: none left in this path).
 * - Conditional GETs: the per-installation page cache stores each page's
 *   ETag; unchanged pages resolve as 304 and reuse cached items.
 *
 * The cache lives in this closure — scoped to the returned client instance
 * (rm-221), never module-global — and is keyed by installation id so sibling
 * installations never read each other's pages.
 */
export function createInstallationRepoListFn(options: RepoListOptions = {}) {
  const pageCaches = new Map<number | 'uncached', Map<number, CachedRepoPage>>()

  async function listInstallationRepos(
    token: string,
    installationId?: number,
  ): Promise<readonly Omit<RepoRecord, 'installation_id'>[]> {
    // rm-162: skip the conditional layer entirely when the caller opts out.
    const cacheKey: number | 'uncached' = installationId ?? 'uncached'
    let pages = pageCaches.get(cacheKey)
    if (pages === undefined) {
      pages = new Map<number, CachedRepoPage>()
      pageCaches.set(cacheKey, pages)
    }

    const installOctokit = createInstallationOctokit({
      token,
      requestTimeoutMs: options.requestTimeoutMs,
      fetch: options.fetch,
    })

    const repos: Omit<RepoRecord, 'installation_id'>[] = []
    let page = 1
    let unchangedPages = 0
    while (true) {
      const cached = pages.get(page)
      let response: Awaited<ReturnType<typeof installOctokit.request<'GET /installation/repositories'>>>
      try {
        response = await installOctokit.request('GET /installation/repositories', {
          per_page: 100,
          page,
          ...(cached?.etag === undefined || cached.etag === null
            ? {}
            : {headers: {'If-None-Match': cached.etag}}),
        })
      } catch (error) {
        // @octokit/request throws on any non-2xx, including 304 Not Modified —
        // conditional-request responses surface as RequestError{status: 304}.
        if ((error as {status?: number}).status === 304 && cached !== undefined) {
          // Unchanged page: reuse the cached items. 304 responses carry no
          // body, so termination (short page) comes from the cache.
          repos.push(...cached.items)
          unchangedPages++
          if (cached.items.length < 100) break
          page++
          continue
        }
        throw error
      }
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
      const items = data.repositories.map(repo => ({
        node_id: repo.node_id,
        database_id: repo.id,
        owner: repo.owner.login,
        name: repo.name,
        full_name: repo.full_name,
      }))
      pages.set(page, {etag: response.headers.etag ?? null, items})
      repos.push(...items)
      if (repos.length >= data.total_count || items.length < 100) {
        // List shrank: drop cached pages beyond the new tail so a later
        // regrow cannot serve a stale page as "unchanged".
        for (const key of pages.keys()) {
          if (key > page) pages.delete(key)
        }
        break
      }
      page++
    }
    if (unchangedPages > 0 && unchangedPages === page) {
      logger.debug('Installation repo list fully unchanged (304 Not Modified on every page)', {
        installationId: installationId ?? null,
        pages: unchangedPages,
      })
    }
    return repos
  }

  return listInstallationRepos
}

/**
 * Build a real `InstallationsClient` from a `DashboardAppClient`.
 * The Octokit instance in the client is JWT-authenticated (App-level).
 */
export function buildInstallationsClient(appClient: DashboardAppClient): InstallationsClient {
  const listInstallationRepos = createInstallationRepoListFn()
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
    listInstallationRepos,
  }
}
