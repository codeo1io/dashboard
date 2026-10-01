/**
 * GitHub OAuth client abstraction.
 *
 * The `GitHubOAuthClient` interface is the seam — tests inject a fake,
 * production uses direct GitHub OAuth calls from `makeGitHubOAuthClient()`.
 *
 * Security: tokens are never logged (redactSensitiveFields covers 'token'
 * and 'access_token' patterns). The operator allowlist check lives in the
 * route handler, not here.
 *
 * rm-149 (2026-10-01): both sides of the round-trip carry PKCE (RFC 7636) —
 * `createAuthorizationURL` derives the S256 `code_challenge` from the
 * verifier, `validateAuthorizationCode` presents `code_verifier` at the
 * token exchange.
 */
import {Buffer} from 'node:buffer'
import {createHash} from 'node:crypto'

const GITHUB_OAUTH_ERROR_CODES = new Set([
  'access_denied',
  'bad_verification_code',
  'incorrect_client_credentials',
  'invalid_client',
  'invalid_grant',
  'invalid_request',
  'redirect_uri_mismatch',
  'unsupported_grant_type',
  'unverified_user_email',
])

const GITHUB_FETCH_TIMEOUT_MS = 10_000

/**
 * Minimal interface for the GitHub OAuth client.
 * Uses function property style (not shorthand method signatures) per lint rules.
 */
export interface GitHubOAuthClient {
  readonly createAuthorizationURL: (state: string, scopes: string[], codeVerifier: string) => URL
  readonly validateAuthorizationCode: (code: string, codeVerifier: string) => Promise<{accessToken: () => string}>
}

/**
 * RFC 7636 S256 code challenge for a code verifier (rm-149):
 * BASE64URL-ENCODE(SHA256(ASCII(code_verifier))) with padding stripped.
 * Shared by the production redirect builder below and the test fakes that
 * emulate GitHub's server-side challenge check.
 */
export function createS256CodeChallenge(codeVerifier: string): string {
  // Node's Hash.toString() ignores arguments ('[object Object]') — the
  // base64url transform goes through digest().
  return createHash('sha256').update(codeVerifier, 'ascii').digest('base64url')
}

/**
 * Creates a production GitHub OAuth client using GitHub's documented OAuth endpoints.
 *
 * @param clientId - `DASHBOARD_OAUTH_CLIENT_ID`
 * @param clientSecret - `DASHBOARD_OAUTH_CLIENT_SECRET`
 * @param redirectURI - Full callback URL (e.g. `https://example.com/auth/callback`)
 */
export function makeGitHubOAuthClient(
  clientId: string,
  clientSecret: string,
  redirectURI: string,
): GitHubOAuthClient {
  return {
    createAuthorizationURL: (state: string, scopes: string[], codeVerifier: string): URL => {
      const url = new URL('https://github.com/login/oauth/authorize')
      url.search = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectURI,
        state,
        scope: scopes.join(' '),
        response_type: 'code',
        // rm-149: PKCE S256 — the challenge is derived from the verifier the
        // caller holds; the verifier itself never appears in the redirect.
        code_challenge: createS256CodeChallenge(codeVerifier),
        code_challenge_method: 'S256',
      }).toString()
      return url
    },
    validateAuthorizationCode: async (code: string, codeVerifier: string): Promise<{accessToken: () => string}> => {
      let res: Response
      try {
        res = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64')}`,
            'User-Agent': 'fro-bot-dashboard',
          },
          body: new URLSearchParams({
            client_id: clientId,
            code,
            redirect_uri: redirectURI,
            grant_type: 'authorization_code',
            // rm-149: PKCE — GitHub rejects the exchange when this verifier's
            // S256 does not match the challenge sent on the authorize redirect.
            code_verifier: codeVerifier,
          }).toString(),
          redirect: 'error',
          signal: AbortSignal.timeout(GITHUB_FETCH_TIMEOUT_MS),
        })
      } catch {
        throw new Error('GitHub OAuth token request failed')
      }

      if (res.status !== 200) {
        throw new Error(`GitHub OAuth token request failed: ${res.status}`)
      }

      let data: unknown
      try {
        data = await res.json()
      } catch {
        throw new Error('GitHub OAuth token response was not valid JSON')
      }

      if (data === null || typeof data !== 'object') {
        throw new TypeError('GitHub OAuth token response is not an object')
      }
      const obj = data as Record<string, unknown>

      // GitHub reports invalid codes in a successful HTTP response.
      if ('error' in obj) {
        if (typeof obj.error !== 'string' || !GITHUB_OAUTH_ERROR_CODES.has(obj.error)) {
          throw new Error('GitHub OAuth token exchange failed')
        }
        throw new Error(`GitHub OAuth token exchange failed: ${obj.error}`)
      }

      if (typeof obj.access_token !== 'string' || obj.access_token.length === 0) {
        throw new TypeError('GitHub OAuth token response missing access_token field')
      }
      const token = obj.access_token
      return {accessToken: () => token}
    },
  }
}

/**
 * Fetches the authenticated user's GitHub login using the access token.
 * This is the production implementation — tests inject a fake via `fetchUserLogin`.
 *
 * Security: access token is never logged.
 */
export async function fetchGitHubUserLogin(accessToken: string): Promise<string> {
  let res: Response
  try {
    res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: AbortSignal.timeout(GITHUB_FETCH_TIMEOUT_MS),
    })
  } catch {
    throw new Error('GitHub /user request failed')
  }

  if (!res.ok) {
    throw new Error(`GitHub /user request failed: ${res.status}`)
  }

  let data: unknown
  try {
    data = await res.json()
  } catch {
    throw new Error('GitHub /user response was not valid JSON')
  }
  if (data === null || typeof data !== 'object') {
    throw new TypeError('GitHub /user response is not an object')
  }
  const obj = data as Record<string, unknown>
  if (typeof obj.login !== 'string') {
    throw new TypeError('GitHub /user response missing login field')
  }
  return obj.login
}
