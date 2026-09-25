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
import {safeErrorMessage} from './app-client.ts'

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

export interface InstallationsClient {
  /**
   * List all App installations (App-JWT-level call).
   */
  readonly listInstallations: () => Promise<readonly InstallationRecord[]>
  /**
   * Mint a read-only installation token for the given installation ID.
   * Returns the raw token string. NEVER log this value.
   */
  readonly mintInstallationToken: (
    installationId: number,
    permissions: Record<string, 'read'>,
  ) => Promise<string>
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
 * Upper bound on cached installation tokens. Insertion-ordered Map eviction:
 * when the cache is full and a NEW installation id is being cached, the
 * oldest entry (first insertion) is dropped. The live installation census is
 * normally far smaller; this bound exists so churn (install/uninstall
 * cycles) can never grow the map without limit (2026-09-26, cycle batch B2b).
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
  return cached.token
}

function setCachedToken(installationId: number, token: string, expiresAt: Date | null): void {
  // Opportunistic hygiene on every insert: expired entries left behind by
  // departed installations used to linger forever (entries were only ever
  // deleted on their own re-access).
  sweepExpiredTokens()
  if (!tokenCache.has(installationId) && tokenCache.size >= TOKEN_CACHE_MAX) {
    const oldest = tokenCache.keys().next()
    if (!oldest.done) {
      tokenCache.delete(oldest.value)
    }
  }
  const expiresAtMs = expiresAt === null ? Date.now() + 55 * 60 * 1000 : expiresAt.getTime() // default 55 min
  tokenCache.set(installationId, {token, expiresAt: expiresAtMs})
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

/**
 * Mint a read-only installation token with graceful optional-scope degradation.
 *
 * First attempts to mint with FULL_READ_PERMISSIONS (core + optional).
 * If that fails, retries with only CORE_READ_PERMISSIONS.
 * If the core-only mint also fails, throws.
 */
export async function mintReadOnlyToken(
  installationId: number,
  mintFn: (installationId: number, permissions: Record<string, 'read'>) => Promise<string>,
): Promise<string> {
  // Check cache first
  const cached = getCachedToken(installationId)
  if (cached !== null) return cached

  // Try full permissions first
  try {
    const token = await mintFn(installationId, FULL_READ_PERMISSIONS)
    // Cache with a default expiry (we don't have expiry info from the injected fn)
    setCachedToken(installationId, token, null)
    return token
  } catch (fullError) {
    logger.warning('Failed to mint token with optional scopes; retrying with core scopes only', {
      installationId,
      error: safeErrorMessage(fullError),
    })
  }

  // Retry with core-only permissions
  const token = await mintFn(installationId, CORE_READ_PERMISSIONS)
  setCachedToken(installationId, token, null)
  return token
}

/**
 * Enumerate all installations, mint read-only tokens, and union accessible repos.
 *
 * Returns `err(FetchInstallationsError)` if `listInstallations` fails.
 * Per-install token mint failures are logged and skipped (fail-soft per install).
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
    return ok({repos: [], installations: []})
  }

  // The successful census is the ground truth for which installation tokens
  // may still be needed — drop tokens for installations that no longer exist
  // instead of leaving them to expire silently in the map.
  pruneTokenCache(new Set(installations.map(installation => installation.id)))

  logger.debug('Enumerating repos across installations', {count: installations.length})

  const reposByNodeId = new Map<string, RepoRecord>()

  for (const installation of installations) {
    let token: string
    try {
      token = await mintReadOnlyToken(installation.id, client.mintInstallationToken)
    } catch (mintError) {
      logger.warning('Failed to mint installation token; skipping install', {
        installationId: installation.id,
        error: safeErrorMessage(mintError),
      })
      continue
    }

    let repos: readonly Omit<RepoRecord, 'installation_id'>[]
    try {
      repos = await client.listInstallationRepos(token)
    } catch (repoError) {
      logger.warning('Failed to list repos for installation; skipping', {
        installationId: installation.id,
        error: safeErrorMessage(repoError),
      })
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
  })
}

// ---------------------------------------------------------------------------
// Real client factory (uses DashboardAppClient)
// ---------------------------------------------------------------------------

async function listInstallationReposWithToken(token: string): Promise<readonly Omit<RepoRecord, 'installation_id'>[]> {
  const installOctokit = new Octokit({auth: token})

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
    listInstallations,
    mintInstallationToken: appClient.mintInstallationToken,
    listInstallationRepos: listInstallationReposWithToken,
  }
}
