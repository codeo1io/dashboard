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

import process from 'node:process'
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
// Request deadlines (rm-160)
// ---------------------------------------------------------------------------

/**
 * Default per-request deadline for every outbound GitHub request (ms).
 *
 * rm-160: Octokit's own `timeout` option is inert against a hung upstream —
 * the fetch only aborts when the deadline is bound at the request layer via
 * `AbortSignal.timeout` on `request.signal`. Every outbound request in this
 * repo (mint, installations enumeration, installation-repos pagination,
 * metadata read, per-repo graphql) carries this deadline so a wedged socket
 * can never hold the aggregator's in-flight refresh guard open forever.
 */
export const GITHUB_REQUEST_TIMEOUT_MS_DEFAULT = 15_000

/**
 * Resolve the GitHub request deadline from `GITHUB_REQUEST_TIMEOUT_MS`
 * (overrideable for tests / slow-proxy environments). Non-numeric, empty, or
 * non-positive values fall back to the default.
 */
export function resolveGithubRequestTimeoutMs(): number {
  const raw = process.env.GITHUB_REQUEST_TIMEOUT_MS
  if (raw === undefined) return GITHUB_REQUEST_TIMEOUT_MS_DEFAULT
  const trimmed = raw.trim()
  if (trimmed === '') return GITHUB_REQUEST_TIMEOUT_MS_DEFAULT
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed <= 0) return GITHUB_REQUEST_TIMEOUT_MS_DEFAULT
  return Math.floor(parsed)
}

/** Fresh `AbortSignal.timeout` for a single outbound GitHub request. */
export function githubRequestTimeoutSignal(): AbortSignal {
  return AbortSignal.timeout(resolveGithubRequestTimeoutMs())
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AppClientOptions {
  readonly appId: string
  readonly privateKey: string
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
  const {appId, privateKey} = options

  const octokit = new ThrottledOctokit({
    authStrategy: createAppAuth,
    auth: {appId, privateKey},
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
    // rm-160: route the mint through the throttled instance's request fn with
    // a per-request AbortSignal.timeout deadline. auth-app honors a
    // strategy-level `request` option (dist-src/index.js: `options.request ||
    // defaultRequest.defaults(...)`) — without it the mint POSTs to
    // /app/installations/{id}/access_tokens via its own undecorated default
    // request, invisible to both throttling and deadlines.
    const installAuth = createAppAuth({
      appId,
      privateKey,
      installationId,
      // Cast seam (AGENTS.md: `as unknown as X` at Octokit boundaries) — the
      // loose wrapper erases the RequestInterface extras (defaults/endpoint)
      // that auth-app's option type names but does not invoke on this path.
      request: withGithubRequestTimeout(octokit.request) as unknown as Parameters<
        typeof createAppAuth
      >[0]['request'],
    })
    const result = await installAuth({
      type: 'installation',
      permissions,
    })
    return result.token
  }

  return {octokit, mintInstallationToken}
}

// ---------------------------------------------------------------------------
// Error helpers
// ---------------------------------------------------------------------------

/**
 * Loose request-fn shape at the Octokit boundary (cast seam — see AGENTS.md:
 * `as unknown as X` at Octokit boundaries, never `any`).
 */
export type LooseOctokitRequestFn = (
  route: string,
  options?: Record<string, unknown>,
) => Promise<unknown>

/**
 * Wrap an Octokit request fn so every call carries a per-request
 * `AbortSignal.timeout` deadline (rm-160).
 *
 * The signal is injected as `request: {signal}` — the Octokit request layer
 * forwards it to fetch (`@octokit/request/dist-src/fetch-wrapper.js`:
 * `signal: requestOptions.request?.signal`).
 */
export function withGithubRequestTimeout(request: LooseOctokitRequestFn): LooseOctokitRequestFn {
  return async (route, options = {}) =>
    request(route, {
      ...options,
      request: {
        ...(options.request ?? {}),
        signal: githubRequestTimeoutSignal(),
      },
    })
}

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
