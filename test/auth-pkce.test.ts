/**
 * rm-149: PKCE (S256) on the GitHub OAuth authorization-code flow.
 *
 * Contract:
 * - /auth/login issues a one-time PKCE pair: the S256 challenge goes into the
 *   authorize URL, the verifier rides an HttpOnly /auth-scoped cookie, and the
 *   challenge is provably SHA-256(verifier) — binding URL to cookie.
 * - /auth/callback REQUIRES the verifier cookie: without it the exchange never
 *   happens (403 fail-closed), so a stolen authorization code is unusable.
 * - The verifier is spent at the token exchange (code_verifier reaches the
 *   OAuth seam) and cleared after use.
 *
 * Uses app.request() against buildDashboardApp() with a recording fake client —
 * no real GitHub. Mirrors test/auth.test.ts harness.
 */
import type {GitHubOAuthClient, PkceChallengeParams, PkceVerifierParams} from '../src/auth/oauth.ts'
import {Buffer} from 'node:buffer'
import {createHash} from 'node:crypto'
import {describe, expect, it} from 'vitest'
import {buildDashboardApp} from '../src/server.ts'
import {SessionManager} from '../src/session.ts'

const TEST_KEY = Buffer.from('testkey-ABCDEFGHIJKLMNOPQRSTUV12', 'utf8') // 32 bytes, mixed

interface AuthorizationCall {
  readonly state: string
  readonly scopes: readonly string[]
  readonly pkce: PkceChallengeParams | undefined
}

interface ExchangeCall {
  readonly code: string
  readonly pkce: PkceVerifierParams | undefined
}

/** Fake OAuth client that records every call it receives from the routes. */
function makeRecordingOAuthClient(): GitHubOAuthClient & {
  readonly authorizationCalls: AuthorizationCall[]
  readonly exchangeCalls: ExchangeCall[]
} {
  const authorizationCalls: AuthorizationCall[] = []
  const exchangeCalls: ExchangeCall[] = []
  return {
    authorizationCalls,
    exchangeCalls,
    createAuthorizationURL: (state, scopes, pkce) => {
      authorizationCalls.push({state, scopes, pkce})
      const url = new URL('https://github.com/login/oauth/authorize')
      url.searchParams.set('state', state)
      if (pkce !== undefined) {
        url.searchParams.set('code_challenge', pkce.codeChallenge)
        url.searchParams.set('code_challenge_method', pkce.codeChallengeMethod)
      }
      return url
    },
    validateAuthorizationCode: async (code, pkce) => {
      exchangeCalls.push({code, pkce})
      return {accessToken: () => 'fake-access-token'}
    },
  }
}

async function buildTestApp(oauthClient: GitHubOAuthClient, operatorLogin = 'octocat') {
  return buildDashboardApp({
    operatorLogin,
    cookieKey: TEST_KEY,
    oauthClient,
    fetchUserLogin: async (_token: string) => operatorLogin,
  })
}

function getSetCookie(res: Response, name: string): string | undefined {
  const cookies = res.headers.getSetCookie?.() ?? []
  return cookies.find(c => c.startsWith(`${name}=`))
}

function extractCookieValue(header: string): string {
  return header.split(';')[0]?.split('=').slice(1).join('=') ?? ''
}

interface LoginCookies {
  readonly stateCookie: string
  readonly pkceCookie: string
  readonly stateParam: string
  readonly challengeParam: string
}

/** Drive /auth/login and harvest the state/PKCE cookies + redirect params. */
async function performLogin(app: Awaited<ReturnType<typeof buildTestApp>>): Promise<LoginCookies> {
  const res = await app.request('/auth/login')
  expect(res.status).toBe(302)
  const location = res.headers.get('location') ?? ''
  const url = new URL(location)
  const stateHeader = getSetCookie(res, 'oauth_state') ?? ''
  const pkceHeader = getSetCookie(res, 'oauth_pkce_verifier') ?? ''
  return {
    stateCookie: extractCookieValue(stateHeader),
    pkceCookie: extractCookieValue(pkceHeader),
    stateParam: url.searchParams.get('state') ?? '',
    challengeParam: url.searchParams.get('code_challenge') ?? '',
  }
}

describe('PKCE authorization (rm-149)', () => {
  it('/auth/login sends an S256 challenge bound to the verifier cookie', async () => {
    const client = makeRecordingOAuthClient()
    const app = await buildTestApp(client)
    const res = await app.request('/auth/login')

    expect(res.status).toBe(302)
    const location = new URL(res.headers.get('location') ?? '')
    expect(location.searchParams.get('code_challenge_method')).toBe('S256')

    // RFC 7636 §4.2: an S256 challenge is 43-char base64url (SHA-256 of a
    // 32-byte verifier, unpadded).
    const challenge = location.searchParams.get('code_challenge') ?? ''
    expect(challenge).toMatch(/^[\w-]{43}$/)

    // Binding proof: challenge === base64url(SHA-256(verifier cookie value)).
    const pkceHeader = getSetCookie(res, 'oauth_pkce_verifier')
    expect(pkceHeader).toBeDefined()
    expect(pkceHeader).toContain('HttpOnly')
    expect(pkceHeader).toContain('Path=/auth')
    const verifier = extractCookieValue(pkceHeader ?? '')
    expect(createHash('sha256').update(verifier).digest('base64url')).toBe(challenge)

    // The seam received the same pair it echoed into the URL.
    expect(client.authorizationCalls).toHaveLength(1)
    expect(client.authorizationCalls[0]?.pkce).toEqual({codeChallenge: challenge, codeChallengeMethod: 'S256'})
  })

  it('each login mints a fresh one-time pair', async () => {
    const app = await buildTestApp(makeRecordingOAuthClient())
    const first = await performLogin(app)
    const second = await performLogin(app)
    expect(first.challengeParam).not.toBe(second.challengeParam)
    expect(first.pkceCookie).not.toBe(second.pkceCookie)
    expect(first.stateCookie).not.toBe(second.stateCookie)
  })

  it('/auth/callback without the verifier cookie → 403, no token exchange', async () => {
    const client = makeRecordingOAuthClient()
    const app = await buildTestApp(client)
    const login = await performLogin(app)

    // State cookie present and matching — only the PKCE cookie is withheld.
    const res = await app.request(
      `/auth/callback?code=stolen-code&state=${encodeURIComponent(login.stateCookie)}`,
      {headers: {cookie: `oauth_state=${login.stateCookie}`}},
    )
    expect(res.status).toBe(403)
    expect(await res.text()).toContain('PKCE verifier')
    expect(client.exchangeCalls).toHaveLength(0)
  })

  it('/auth/callback spends the verifier at the token exchange, then clears it', async () => {
    const client = makeRecordingOAuthClient()
    const app = await buildTestApp(client)
    const login = await performLogin(app)

    const res = await app.request(
      `/auth/callback?code=legit-code&state=${encodeURIComponent(login.stateParam)}`,
      {headers: {cookie: `oauth_state=${login.stateCookie}; oauth_pkce_verifier=${login.pkceCookie}`}},
    )
    expect(res.status).toBe(302)

    // The verifier that reaches the exchange is exactly the cookie's value.
    expect(client.exchangeCalls).toHaveLength(1)
    expect(client.exchangeCalls[0]?.pkce).toEqual({codeVerifier: login.pkceCookie})

    // One-time: both OAuth cookies are cleared on the response.
    expect(getSetCookie(res, 'oauth_state')).toContain('Max-Age=0')
    expect(getSetCookie(res, 'oauth_pkce_verifier')).toContain('Max-Age=0')

    // A session was actually issued for the allowlisted login.
    const sessionCookie = getSetCookie(res, 'session')
    expect(sessionCookie).toBeDefined()
    const sm = new SessionManager(TEST_KEY)
    expect(sm.verify(extractCookieValue(sessionCookie ?? ''))?.login).toBe('octocat')
  })
})
