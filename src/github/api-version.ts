import type {Octokit} from '@octokit/core'

/**
 * GitHub REST API version pin (rm-855).
 *
 * GitHub's calendar-versioning guidance: pin `X-GitHub-Api-Version` on every
 * REST client so a future deprecation window cannot shift responses under a
 * long-lived deployment. This module is the single source of the pinned date;
 * every Octokit construction in this repository MUST pass its client through
 * {@link pinGitHubApiVersion} at construction time, and the one manual OAuth
 * token-exchange fetch (`src/auth/oauth.ts`) reads {@link GITHUB_API_VERSION}
 * directly.
 *
 * GraphQL (the aggregated `graphql.defaults` client in `src/github/app-client.ts`)
 * is DOCUMENTED VERSIONLESS by GitHub: `X-GitHub-Api-Version` applies to the
 * REST API only and must not be sent on GraphQL requests — see the comment at
 * that construction site.
 *
 * MECHANISM (verified against @octokit/core 7.0.8 dist-src + wire-level
 * probes, 2026-10-17): the constructor reads NO `defaultHeaders` option — only
 * userAgent/baseUrl/previews/timeZone/request/auth are honored, so a
 * `defaultHeaders` key in the options object is silently dropped. The pin is
 * therefore written into `request.endpoint.DEFAULTS.headers`, the merge base
 * every endpoint resolution starts from. That single object is shared by all
 * three egress shapes of a constructed client:
 *   - direct `octokit.request()` calls,
 *   - the request-hook pipeline (auth/throttle/retry hooks rebuild their
 *     per-call `request` closure over the same endpoint),
 *   - auth-strategy internal egress (token mints), whose state machine keeps
 *     the construction-time request function and resolves through the same
 *     endpoint defaults.
 * Wire-proven for both the auth-app installation-token mint and a
 * createTokenAuth REST request.
 */
export const GITHUB_API_VERSION = '2022-11-28'

const GITHUB_API_VERSION_HEADER = 'x-github-api-version'

/**
 * Pin the REST API version on every GitHub egress path of an Octokit client.
 * Call once, immediately at the construction site, and use the return value.
 */
export function pinGitHubApiVersion<T extends Octokit>(octokit: T): T {
  octokit.request.endpoint.DEFAULTS.headers[GITHUB_API_VERSION_HEADER] = GITHUB_API_VERSION
  return octokit
}
