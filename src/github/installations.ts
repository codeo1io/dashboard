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

/** Which phase of per-installation enumeration failed. */
export type SkippedInstallationPhase = 'mint' | 'list-repos'

/**
 * An installation that was enumerated but excluded from the repo union because
 * its token mint or repo listing failed. rm-164: this makes partial GitHub-side
 * outages visible in the snapshot instead of silently shrinking monitored scope.
 * The error string is the already-redacted safeErrorMessage form (never a raw
 * token or repo name — neither is involved at these phases).
 */
export interface SkippedInstallation {
  readonly installationId: number
  readonly phase: SkippedInstallationPhase
  readonly error: string
}

export interface EnumerateReposResult {
  readonly repos: readonly RepoRecord[]
  readonly installations: readonly InstallationRecord[]
  /** Per-installation failures that shrank this cycle's repo union (empty = full coverage). */
  readonly skippedInstallations: readonly SkippedInstallation[]
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
 * Per-install token mint/list failures are logged, reported in
 * `skippedInstallations`, and skipped (fail-soft per install).
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
    return ok({repos: [], installations: [], skippedInstallations: []})
  }

  logger.debug('Enumerating repos across installations', {count: installations.length})

  const reposByNodeId = new Map<string, RepoRecord>()
  const skippedInstallations: SkippedInstallation[] = []

  for (const installation of installations) {
    let token: string
    try {
      token = await mintReadOnlyToken(installation.id, client.mintInstallationToken)
    } catch (mintError) {
      const mintErrorMessage = safeErrorMessage(mintError)
      logger.warning('Failed to mint installation token; skipping install', {
        installationId: installation.id,
        error: mintErrorMessage,
      })
      skippedInstallations.push({installationId: installation.id, phase: 'mint', error: mintErrorMessage})
      continue
    }

    let repos: readonly Omit<RepoRecord, 'installation_id'>[]
    try {
      repos = await client.listInstallationRepos(token)
    } catch (repoError) {
      const listErrorMessage = safeErrorMessage(repoError)
      logger.warning('Failed to list repos for installation; skipping', {
        installationId: installation.id,
        error: listErrorMessage,
      })
      skippedInstallations.push({installationId: installation.id, phase: 'list-repos', error: listErrorMessage})
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
    skippedInstallations,
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
