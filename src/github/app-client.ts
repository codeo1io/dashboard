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
import {graphql} from '@octokit/graphql'
import {retry} from '@octokit/plugin-retry'
import {throttling} from '@octokit/plugin-throttling'

import {logger, sanitizeErrorMessage} from '../logger.ts'

// ---------------------------------------------------------------------------
// Throttled + retrying Octokit class
// ---------------------------------------------------------------------------

const ThrottledOctokit = Octokit.plugin(throttling, retry)

// ---------------------------------------------------------------------------
// Per-request ceiling (rm-197 value, rm-156 enforcement)
// ---------------------------------------------------------------------------

/**
 * rm-197: default per-request timeout for every GitHub transport in this
 * process. Bounding each request keeps the aggregator's serial first refresh
 * (and every later walk) finite even when GitHub stalls a connection.
 *
 * rm-156 (cycle-9 batch, run 91e4626d — merged 2026-09-26): the ceiling is
 * ENFORCED at the transport layer via `createBoundedFetch` below, because
 * this runtime's `@octokit/request` does not honor the `timeout` request
 * option against hung upstreams, and `@octokit/graphql` never forwards
 * per-request signals at all — `request: {fetch}` is the only honored seam
 * on both paths (see
 * docs/solutions/runtime-errors/octokit-timeout-option-inert-on-hung-upstreams-bind-at-fetch-layer-2026-09-24.md).
 * Undici's default is ~300s; a single hung upstream must not stall the
 * serial aggregator refresh cycle.
 */
export const GITHUB_REQUEST_TIMEOUT_MS = 30_000

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
  /**
   * Per-request timeout (ms) for the App-level Octokit. rm-197: no GitHub
   * call in this process may hang — the aggregator's serial first refresh
   * must stay bounded. Defaults to GITHUB_REQUEST_TIMEOUT_MS (30s).
   * rm-156: enforced at the fetch layer — test-injectable, and tests may also
   * point `baseUrl` at a local fixture server.
   */
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
 * Create a dashboard App client authenticated as the fro-bot Agent App.
 *
 * The returned `octokit` is JWT-authenticated (App-level) and is suitable for
 * `apps.listInstallations`. Use `mintInstallationToken` to get per-install tokens.
 */
export function createDashboardAppClient(options: AppClientOptions): DashboardAppClient {
  const {appId, privateKey, requestTimeoutMs, baseUrl} = options
  const timeoutMs = requestTimeoutMs ?? GITHUB_REQUEST_TIMEOUT_MS

  const octokit = new ThrottledOctokit({
    authStrategy: createAppAuth,
    auth: {appId, privateKey},
    ...(baseUrl === undefined ? {} : {baseUrl}),
    // rm-156: ENFORCED at the transport layer (createBoundedFetch) — this
    // runtime ignores the `timeout` option on hung upstreams. The key stays
    // (same deadline where honored; rm-197 transport-contract gate pins it).
    request: {timeout: timeoutMs, fetch: createBoundedFetch(timeoutMs)},
    // rm-156: a timed-out request must fail fast, not be retried. The retry
    // plugin cannot distinguish a timeout abort (surfaced as status 500 by
    // @octokit/request) from a retryable 5xx, and retrying multiplies the
    // stall the bound exists to cap. Rate-limit handling stays (throttling
    // plugin); transient upstream failures re-heal on the next aggregator
    // refresh cycle.
    retry: {enabled: false},
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
  ): Promise<MintedToken> {
    // rm-156: the mint rides the SAME bounded, throttled transport as the
    // REST client — auth-app honors a passed `request` for its token fetches.
    const installAuth = createAppAuth({appId, privateKey, installationId, request: octokit.request})
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
// Per-installation GraphQL query factory (rm-156)
// ---------------------------------------------------------------------------

/** Options for {@link createInstallationGraphqlQueryFn} (rm-156 test seam). */
export interface InstallationGraphqlOptions {
  /** Per-request timeout (ms). Defaults to GITHUB_REQUEST_TIMEOUT_MS. */
  readonly timeoutMs?: number
  /** Override the GitHub GraphQL base URL (tests only). */
  readonly baseUrl?: string
}

/**
 * Build the per-installation GraphQL query function used by the aggregator:
 * the token comes from the caller's getter (typically the read-only
 * installation token cache) and every request is timeout-bounded (rm-156).
 *
 * rm-197 merge note: this extracts main's inline per-installation graphql
 * construction into a factory so the transport-level bound lives in ONE
 * place — request:{fetch} is the only seam this runtime honors on hung
 * upstreams. The defaults client is still constructed per call, matching the
 * landed inline shape.
 */
export function createInstallationGraphqlQueryFn(
  getToken: (installationId: number) => Promise<string>,
  options: InstallationGraphqlOptions = {},
): (installationId: number, query: string, variables: Record<string, unknown>) => Promise<unknown> {
  const timeoutMs = options.timeoutMs ?? GITHUB_REQUEST_TIMEOUT_MS
  return async (installationId: number, query: string, variables: Record<string, unknown>): Promise<unknown> => {
    const token = await getToken(installationId)
    const gql = graphql.defaults({
      headers: {authorization: `token ${token}`},
      // rm-156: fetch-layer enforcement (load-bearing); rm-197: the `timeout`
      // key rides along for the transport-contract gate + paths that honor it.
      request: {timeout: timeoutMs, fetch: createBoundedFetch(timeoutMs)},
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
