/**
 * GitHub App client for the dashboard.
 *
 * Provides a throttled + retrying Octokit instance authenticated as the
 * fro-bot Agent App (second App private key). Used by `installations.ts` to
 * enumerate installations and mint read-only installation tokens.
 *
 * Security invariants:
 * - JWTs, private keys, and installation tokens are NEVER written to any log output.
 * - `safeErrorMessage` strips PEM blocks and JWT-shaped strings before surfacing errors.
 * - Octokit boundary casts use `as unknown as X`, never `any`.
 */

import type {MintedToken} from './installations.ts'
import {createAppAuth} from '@octokit/auth-app'
import {Octokit} from '@octokit/core'
import {retry} from '@octokit/plugin-retry'
import {throttling} from '@octokit/plugin-throttling'

import {logger, sanitizeErrorMessage} from '../logger.ts'

// ---------------------------------------------------------------------------
// Throttled + retrying Octokit class
// ---------------------------------------------------------------------------

const ThrottledOctokit = Octokit.plugin(throttling, retry)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AppClientOptions {
  readonly appId: string
  readonly privateKey: string
  /**
   * Per-request timeout (ms) for the App-level Octokit. rm-197: no GitHub
   * call in this process may hang — the aggregator's serial first refresh
   * must stay bounded. Defaults to GITHUB_REQUEST_TIMEOUT_MS (30s).
   */
  readonly requestTimeoutMs?: number
}

export interface DashboardAppClient {
  /**
   * The underlying Octokit instance authenticated as the App (JWT-level).
   * Use for App-level endpoints like `apps.listInstallations` and
   * `GET /repos/{owner}/{repo}/installation`.
   */
  readonly octokit: InstanceType<typeof ThrottledOctokit>
  /**
   * Mint a read-only installation token for the given installation ID.
   * Returns the raw token string plus its REAL expiry (rm-185: previously
   * the API-provided expiresAt was discarded here, forcing the cache in
   * installations.ts to guess a 55-min TTL). NEVER log the token value.
   *
   * The permissions type is `Record<string, 'read'>` — write/admin scopes are
   * unrepresentable at the dashboard boundary by construction.
   */
  readonly mintInstallationToken: (
    installationId: number,
    permissions: Record<string, 'read'>,
  ) => Promise<MintedToken>
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * rm-197: default per-request timeout for every GitHub transport in this
 * process. Bounding each request keeps the aggregator's serial first refresh
 * (and every later walk) finite even when GitHub stalls a connection.
 */
export const GITHUB_REQUEST_TIMEOUT_MS = 30_000

/**
 * Shared throttle + retry configuration for every Octokit instance this
 * process constructs (rm-221). Primary rate limits: retry up to twice with
 * the server-provided retryAfter. Secondary rate limits: log and back off
 * via the plugin's automatic handling (never hammer past a 403).
 *
 * Keep the two callbacks free of token/PEM material — `opts.url` is the only
 * request detail surfaced.
 */
export function githubThrottleOptions(): {
  onRateLimit: (retryAfter: number, opts: Record<string, unknown>, octokit: unknown, retryCount: number) => boolean
  onSecondaryRateLimit: (retryAfter: number, opts: Record<string, unknown>, octokit: unknown) => boolean
} {
  return {
    onRateLimit: (retryAfter: number, opts: Record<string, unknown>, _octokit: unknown, retryCount: number) => {
      logger.warning('GitHub rate limit hit', {retryAfter, url: opts.url, retryCount})
      return retryCount < 2
    },
    onSecondaryRateLimit: (retryAfter: number, opts: Record<string, unknown>, _octokit: unknown) => {
      logger.warning('GitHub secondary rate limit hit', {retryAfter, url: opts.url})
      return false
    },
  }
}

/**
 * rm-221: construct a throttled + retrying Octokit authenticated with an
 * installation token. Every per-installation transport in the refresh path
 * (repo-list pagination, contents reads, GraphQL queries) goes through this
 * factory — a bare token-authenticated Octokit has no rate-limit or
 * transient-5xx handling and defeats the rm-197 timeout-only bound.
 *
 * Returns the same plugin-wrapped class the App client uses, so `.graphql()`
 * requests also flow through the throttling/retry hooks.
 */
export function createInstallationOctokit(options: {
  readonly token: string
  readonly requestTimeoutMs?: number
  /** Fetch override for tests — forwarded to the Octokit request layer. */
  readonly fetch?: typeof globalThis.fetch
}): InstanceType<typeof ThrottledOctokit> {
  return new ThrottledOctokit({
    auth: options.token,
    request: {
      timeout: options.requestTimeoutMs ?? GITHUB_REQUEST_TIMEOUT_MS,
      ...(options.fetch === undefined ? {} : {fetch: options.fetch}),
    },
    throttle: githubThrottleOptions(),
  })
}

/**
 * Create a dashboard App client authenticated as the fro-bot Agent App.
 *
 * The returned `octokit` is JWT-authenticated (App-level) and is suitable for
 * `apps.listInstallations`. Use `mintInstallationToken` to get per-install tokens.
 */
export function createDashboardAppClient(options: AppClientOptions): DashboardAppClient {
  const {appId, privateKey} = options

  const octokit = new ThrottledOctokit({
    authStrategy: createAppAuth,
    auth: {appId, privateKey},
    request: {timeout: options.requestTimeoutMs ?? GITHUB_REQUEST_TIMEOUT_MS},
    throttle: githubThrottleOptions(),
  })

  async function mintInstallationToken(
    installationId: number,
    permissions: Record<string, 'read'>,
  ): Promise<MintedToken> {
    const installAuth = createAppAuth({appId, privateKey, installationId})
    const result = await installAuth({
      type: 'installation',
      permissions,
    })
    // rm-185: thread the auth result's real expiry through instead of
    // discarding it. @octokit/auth-app returns expiresAt as an ISO string
    // (some versions emit a Date); normalize defensively and yield null on
    // any ill-formed value so the cache falls back to its capped default.
    const rawExpiresAt: unknown = (result as {expiresAt?: unknown}).expiresAt
    let expiresAt: Date | null = null
    if (typeof rawExpiresAt === 'string' || rawExpiresAt instanceof Date) {
      const parsed = rawExpiresAt instanceof Date ? rawExpiresAt : new Date(rawExpiresAt)
      expiresAt = Number.isNaN(parsed.getTime()) ? null : parsed
    }
    return {token: result.token, expiresAt}
  }

  return {octokit, mintInstallationToken}
}

// ---------------------------------------------------------------------------
// Error helpers
// ---------------------------------------------------------------------------

/**
 * Extract a safe error message that cannot contain sensitive material.
 *
 * Delegates to `sanitizeErrorMessage` from logger.ts — the single canonical
 * redactor that covers PEM blocks, JWT-shaped strings, GitHub tokens
 * (ghs_/gho_/ghp_/ghu_/github_pat_), and long opaque bearer strings.
 */
export function safeErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Unknown error'
  }
  return sanitizeErrorMessage(error.message)
}
