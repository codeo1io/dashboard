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

import {createAppAuth} from '@octokit/auth-app'
import {Octokit} from '@octokit/core'
import {graphql} from '@octokit/graphql'
import {retry} from '@octokit/plugin-retry'
import {throttling} from '@octokit/plugin-throttling'

import {logger, sanitizeErrorMessage} from '../logger.ts'

// ---------------------------------------------------------------------------
// Throttled + retrying Octokit class
// ---------------------------------------------------------------------------

const ThrottledOctokit = Octokit.plugin(throttling, retry)

/**
 * Per-request timeout for every outbound GitHub data-plane call (REST via
 * Octokit, installation-token mint via auth-app, GraphQL via
 * @octokit/graphql). Undici's default is ~300s; a single hung upstream must
 * not stall the serial aggregator refresh cycle (rm-156).
 */
export const GITHUB_HTTP_TIMEOUT_MS = 15_000

/**
 * Build a fetch wrapper that bounds every call by wall-clock time (rm-156).
 *
 * The runtime's `@octokit/request` does not honor the `timeout` option for
 * hung upstreams (empirically verified on this Node: a silent server holds
 * the request open indefinitely), and `@octokit/graphql` never forwards
 * per-request signals. Injecting a custom `fetch` via
 * `request: {fetch: ...}` IS honored by both paths, so the bound is enforced
 * at the transport layer: race the caller's signal (if any) against
 * `AbortSignal.timeout(ms)` and pass the aggregate to undici.
 */
export function createBoundedFetch(timeoutMs: number): typeof globalThis.fetch {
  return async (input, init) => {
    const timeoutSignal = AbortSignal.timeout(timeoutMs)
    const signal = init?.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal
    return globalThis.fetch(input, {...init, signal})
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AppClientOptions {
  readonly appId: string
  readonly privateKey: string
  /** Per-request timeout (ms) for outbound GitHub HTTP (rm-156). Defaults to GITHUB_HTTP_TIMEOUT_MS. Test-injectable. */
  readonly requestTimeoutMs?: number
  /** Override the GitHub API base URL. Production leaves this unset (api.github.com); tests point it at a local fixture server. */
  readonly baseUrl?: string
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
   * Returns the raw token string. NEVER log this value.
   *
   * The permissions type is `Record<string, 'read'>` — write/admin scopes are
   * unrepresentable at the dashboard boundary by construction.
   */
  readonly mintInstallationToken: (
    installationId: number,
    permissions: Record<string, 'read'>,
  ) => Promise<string>
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a dashboard App client authenticated as the fro-bot Agent App.
 *
 * The returned `octokit` is JWT-authenticated (App-level) and is suitable for
 * `apps.listInstallations`. Use `mintInstallationToken` to get per-install tokens.
 */
export function createDashboardAppClient(options: AppClientOptions): DashboardAppClient {
  const {appId, privateKey, requestTimeoutMs, baseUrl} = options
  const timeoutMs = requestTimeoutMs ?? GITHUB_HTTP_TIMEOUT_MS

  const octokit = new ThrottledOctokit({
    authStrategy: createAppAuth,
    auth: {appId, privateKey},
    request: {fetch: createBoundedFetch(timeoutMs)},
    // rm-156: a timed-out request must fail fast, not be retried. The retry
    // plugin cannot distinguish a timeout abort (surfaced as status 500 by
    // @octokit/request) from a retryable 5xx, and retrying multiplies the
    // stall the bound exists to cap. Rate-limit handling stays (throttling
    // plugin); transient upstream failures re-heal on the next aggregator
    // refresh cycle (60s TTL).
    retry: {enabled: false},
    ...(baseUrl === undefined ? {} : {baseUrl}),
    throttle: {
      onRateLimit: (retryAfter: number, opts: Record<string, unknown>, _octokit: unknown, retryCount: number) => {
        logger.warning('GitHub rate limit hit', {retryAfter, url: opts.url, retryCount})
        return retryCount < 2
      },
      onSecondaryRateLimit: (retryAfter: number, opts: Record<string, unknown>, _octokit: unknown) => {
        logger.warning('GitHub secondary rate limit hit', {retryAfter, url: opts.url})
        return false
      },
    },
  })

  async function mintInstallationToken(
    installationId: number,
    permissions: Record<string, 'read'>,
  ): Promise<string> {
    // Route the token exchange through the throttled + timeout-bounded
    // request instance so a hung mint call cannot outlive the data-plane
    // timeout (rm-156).
    const installAuth = createAppAuth({appId, privateKey, installationId, request: octokit.request})
    const result = await installAuth({
      type: 'installation',
      permissions,
    })
    return result.token
  }

  return {octokit, mintInstallationToken}
}

// ---------------------------------------------------------------------------
// Installation GraphQL query function
// ---------------------------------------------------------------------------

/** Options for {@link createInstallationGraphqlQueryFn} (rm-156 test seam). */
export interface InstallationGraphqlOptions {
  /** Per-request timeout (ms). Defaults to GITHUB_HTTP_TIMEOUT_MS. */
  readonly timeoutMs?: number
  /** Override the GitHub GraphQL base URL (tests only). */
  readonly baseUrl?: string
}

/**
 * Build the per-installation GraphQL query function used by the aggregator:
 * the token comes from the caller's getter (typically the read-only
 * installation token cache) and every request is timeout-bounded (rm-156).
 */
export function createInstallationGraphqlQueryFn(
  getToken: (installationId: number) => Promise<string>,
  options: InstallationGraphqlOptions = {},
): (installationId: number, query: string, variables: Record<string, unknown>) => Promise<unknown> {
  const timeoutMs = options.timeoutMs ?? GITHUB_HTTP_TIMEOUT_MS
  return async (installationId: number, query: string, variables: Record<string, unknown>): Promise<unknown> => {
    const token = await getToken(installationId)
    const gql = graphql.defaults({
      headers: {authorization: `token ${token}`},
      request: {fetch: createBoundedFetch(timeoutMs)},
      ...(options.baseUrl === undefined ? {} : {baseUrl: options.baseUrl}),
    })
    return gql(query, variables)
  }
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
