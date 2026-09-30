/**
 * GitHub OAuth client abstraction.
 *
 * The `GitHubOAuthClient` interface is the seam — tests inject a fake,
 * production uses direct GitHub OAuth calls from `makeGitHubOAuthClient()`.
 *
 * Security: tokens are never logged (redactSensitiveFields covers 'token'
 * and 'access_token' patterns). The operator allowlist check lives in the
 * route handler, not here.
 */
import {Buffer} from 'node:buffer'

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
 * PKCE (rm-149): the authorization-URL challenge half. `codeChallengeMethod`
 * is a literal — GitHub documents S256 as the supported plain-secret method.
 */
export interface PkceChallengeParams {
  readonly codeChallenge: string
  readonly codeChallengeMethod: 'S256'
}

/** PKCE (rm-149): the token-exchange half. */
export interface PkceVerifierParams {
  readonly codeVerifier: string
}

/**
 * Minimal interface for the GitHub OAuth client.
 * Uses function property style (not shorthand method signatures) per lint rules.
 * Both PKCE parameters are optional so legacy fakes keep typechecking; the
 * production client and the routes treat PKCE as mandatory in practice.
 */
export interface GitHubOAuthClient {
  readonly createAuthorizationURL: (state: string, scopes: string[], pkce?: PkceChallengeParams) => URL
  readonly validateAuthorizationCode: (code: string, pkce?: PkceVerifierParams) => Promise<{accessToken: () => string}>
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
    createAuthorizationURL: (state: string, scopes: string[], pkce?: PkceChallengeParams): URL => {
      const params: Record<string, string> = {
        client_id: clientId,
        redirect_uri: redirectURI,
        state,
        scope: scopes.join(' '),
        response_type: 'code',
      }
      // rm-149: PKCE S256 — challenge goes in the authorize URL, verifier never
      // leaves the server except via the HttpOnly /auth-scoped cookie.
      if (pkce !== undefined) {
        params.code_challenge = pkce.codeChallenge
        params.code_challenge_method = pkce.codeChallengeMethod
      }
      const url = new URL('https://github.com/login/oauth/authorize')
      url.search = new URLSearchParams(params).toString()
      return url
    },
    validateAuthorizationCode: async (code: string, pkce?: PkceVerifierParams): Promise<{accessToken: () => string}> => {
      const body: Record<string, string> = {
        client_id: clientId,
        code,
        redirect_uri: redirectURI,
        grant_type: 'authorization_code',
      }
      // rm-149: PKCE — the verifier is only ever sent to GitHub's token
      // endpoint (over TLS) alongside the code it proves.
      if (pkce !== undefined) {
        body.code_verifier = pkce.codeVerifier
      }
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
          body: new URLSearchParams(body).toString(),
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
