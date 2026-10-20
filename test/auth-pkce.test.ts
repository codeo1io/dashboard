import type {GitHubOAuthClient, PkceChallengeParams, PkceVerifierParams} from '../src/auth/oauth.ts'
/**
 * OAuth PKCE tests (rm-149, rm-281).
 * Uses app.request() against buildDashboardApp() with an injected
 * pairing-enforcing OAuth fake, mirroring test/auth.test.ts conventions.
 *
 * Route contract under test (src/routes/auth.ts):
 *  - /auth/login sets BOTH the oauth_state cookie AND the oauth_pkce_verifier
 *    cookie (HttpOnly, /auth-scoped) and redirects to an authorize URL whose
 *    query carries code_challenge + code_challenge_method=S256 (rm-149).
 *  - /auth/callback requires the verifier cookie: missing/empty → 403 with NO
 *    token exchange attempted (fail closed BEFORE the exchange, so a stolen
 *    authorization code without the cookie can never be spent).
 *  - When the verifier is present it is forwarded to the token exchange
 *    (validateAuthorizationCode(code, {codeVerifier})) and both one-time
 *    cookies are cleared (rm-149).
 *
 * rm-281 (CodeQL js/insufficient-password-hash recipe): the challenge↔verifier
 * binding is proven through /auth/callback behavior — this suite performs no
 * direct cookie-value hashing. The single createHash site below (inside the
 * pairing-enforcing fake) carries the inline suppression per the recorded
 * recipe, so the class never re-derives: hash-like code in tests is either
 * absent (preferred) or annotated.
 */
import {strict as assert} from 'node:assert'
import {Buffer} from 'node:buffer'
import {createHash} from 'node:crypto'
import {describe, expect, it} from 'vitest'
import {buildDashboardApp} from '../src/server.ts'

// 32-byte key for tests — must be non-degenerate (mixed bytes)
const TEST_KEY = Buffer.from('testkey-ABCDEFGHIJKLMNOPQRSTUV12', 'utf8')

let exchangeCalls: {code: string; pkce?: PkceVerifierParams}[] = []
let challengeAtAuthorize: string | null = null

/**
 * rm-281 house shape: the fake enforces the server-side pairing rule
 * (S256(verifier) must equal the challenge minted at authorize time), so the
 * "wrong verifier" case is proven by the ROUTE's failure to issue a session —
 * never by the test hashing a cookie value itself.
 */
function makePairingEnforcingOauthClient(): GitHubOAuthClient {
  return {
    createAuthorizationURL: (state: string, _scopes: string[], pkce?: PkceChallengeParams) => {
      assert(pkce !== undefined, 'expected challenge params at authorize time')
      assert(pkce.codeChallengeMethod === 'S256', 'expected S256 method')
      challengeAtAuthorize = pkce.codeChallenge
      return new URL(
        `https://github.com/login/oauth/authorize?state=${state}&code_challenge=${encodeURIComponent(
          pkce.codeChallenge,
        )}&code_challenge_method=S256`,
      )
    },
    validateAuthorizationCode: async (code: string, pkce?: PkceVerifierParams) => {
      exchangeCalls.push({code, pkce})
      // server-side pairing rule: S256(verifier) must match the minted challenge
      // codeql[js/insufficient-password-hash]
      const derived = createHash('sha256').update(pkce?.codeVerifier ?? '').digest('base64url')
      if (derived !== challengeAtAuthorize) {
        throw new Error('PKCE verifier does not match challenge')
      }
      return {accessToken: () => 'fake-access-token'}
    },
  }
}

// Helper: build app with injected config
async function buildTestApp(opts: {operatorLogin?: string | undefined; githubLogin?: string | undefined}) {
  const fakeLogin = opts.githubLogin ?? opts.operatorLogin ?? 'octocat'
  return buildDashboardApp({
    operatorLogin: opts.operatorLogin,
    cookieKey: TEST_KEY,
    oauthClient: makePairingEnforcingOauthClient(),
    fetchUserLogin: async (_token: string) => fakeLogin,
  })
}

// Helper: extract a Set-Cookie header value
function getSetCookie(res: Response, name: string): string | undefined {
  const cookies = res.headers.getSetCookie?.() ?? []
  return cookies.find(c => c.startsWith(`${name}=`))
}

// Helper: extract cookie value from Set-Cookie header
function extractCookieValue(header: string): string {
  return header.split(';')[0]?.split('=').slice(1).join('=') ?? ''
}

describe('GET /auth/login (PKCE, rm-149)', () => {
  it('redirects to GitHub with state + S256 code_challenge', async () => {
    const app = await buildTestApp({operatorLogin: 'octocat'})
    const res = await app.request('/auth/login')
    expect(res.status).toBe(302)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('https://github.com/login/oauth/authorize')
    const url = new URL(location)
    expect(url.searchParams.get('state')).toBeTruthy()
    expect(url.searchParams.get('code_challenge')).toBeTruthy()
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
  })

  it('sets the HttpOnly /auth-scoped verifier cookie alongside the state cookie', async () => {
    const app = await buildTestApp({operatorLogin: 'octocat'})
    const res = await app.request('/auth/login')
    expect(res.status).toBe(302)
    expect(getSetCookie(res, 'oauth_state')).toBeTruthy()
    const verifierHeader = getSetCookie(res, 'oauth_pkce_verifier')
    expect(verifierHeader).toBeTruthy()
    const verifier = extractCookieValue(verifierHeader ?? '')
    // RFC 7636 §4.1: verifier is 43+ chars of the unreserved (base64url) alphabet
    expect(verifier.length).toBeGreaterThanOrEqual(43)
    // the challenge on the wire is NOT the verifier (S256 is a one-way transform —
    // asserted via the pairing-enforcing fake's exchange path, not by hashing here)
    const challenge = new URL(res.headers.get('location') ?? '').searchParams.get('code_challenge')
    expect(challenge).toBeTruthy()
    expect(verifier).not.toEqual(challenge)
    // cookie shape mirrors the state cookie (HttpOnly, path=/auth)
    expect(verifierHeader?.toLowerCase()).toContain('httponly')
    expect(verifierHeader?.toLowerCase()).toContain('path=/auth')
  })

  it('mints a fresh verifier per login (no cross-request reuse)', async () => {
    const app = await buildTestApp({operatorLogin: 'octocat'})
    const first = await app.request('/auth/login')
    const second = await app.request('/auth/login')
    expect(extractCookieValue(getSetCookie(first, 'oauth_pkce_verifier') ?? '')).not.toEqual(
      extractCookieValue(getSetCookie(second, 'oauth_pkce_verifier') ?? ''),
    )
  })
})

describe('GET /auth/callback (PKCE enforcement, rm-149)', () => {
  it('exchanges the code with the cookie verifier and issues a session', async () => {
    const app = await buildTestApp({operatorLogin: 'octocat', githubLogin: 'octocat'})
    exchangeCalls = []
    const loginRes = await app.request('/auth/login')
    const state = extractCookieValue(getSetCookie(loginRes, 'oauth_state') ?? '')
    const verifier = extractCookieValue(getSetCookie(loginRes, 'oauth_pkce_verifier') ?? '')

    const res = await app.request(`/auth/callback?code=auth-code-123&state=${state}`, {
      headers: {cookie: `oauth_state=${state}; oauth_pkce_verifier=${verifier}`},
    })

    expect(res.status).toBe(302)
    expect(exchangeCalls).toHaveLength(1)
    expect(exchangeCalls[0]?.code).toBe('auth-code-123')
    expect(exchangeCalls[0]?.pkce?.codeVerifier).toBe(verifier)
    expect(getSetCookie(res, '__Host-dashboard-session')).toBeDefined()
  })

  it('fails closed BEFORE the token exchange when the verifier cookie is missing', async () => {
    const app = await buildTestApp({operatorLogin: 'octocat', githubLogin: 'octocat'})
    exchangeCalls = []
    const loginRes = await app.request('/auth/login')
    const state = extractCookieValue(getSetCookie(loginRes, 'oauth_state') ?? '')

    const res = await app.request(`/auth/callback?code=auth-code-123&state=${state}`, {
      headers: {cookie: `oauth_state=${state}`},
    })

    expect(res.status).toBe(403)
    expect(await res.text()).toContain('missing PKCE verifier')
    expect(exchangeCalls).toHaveLength(0)
    expect(getSetCookie(res, '__Host-dashboard-session')).toBeUndefined()
  })

  it('fails closed when the verifier cookie is present but empty', async () => {
    const app = await buildTestApp({operatorLogin: 'octocat', githubLogin: 'octocat'})
    exchangeCalls = []
    const loginRes = await app.request('/auth/login')
    const state = extractCookieValue(getSetCookie(loginRes, 'oauth_state') ?? '')

    const res = await app.request(`/auth/callback?code=auth-code-123&state=${state}`, {
      headers: {cookie: `oauth_state=${state}; oauth_pkce_verifier=`},
    })

    expect(res.status).toBe(403)
    expect(exchangeCalls).toHaveLength(0)
  })

  it('rejects a DIFFERENT valid-shaped verifier via the server-side pairing rule', async () => {
    const app = await buildTestApp({operatorLogin: 'octocat', githubLogin: 'octocat'})
    exchangeCalls = []
    const loginRes = await app.request('/auth/login')
    const state = extractCookieValue(getSetCookie(loginRes, 'oauth_state') ?? '')
    // a different valid-shaped credential (43-char base64url) that login did NOT mint
    const wrongVerifier = 'A'.repeat(43)

    const res = await app.request(`/auth/callback?code=auth-code-123&state=${state}`, {
      headers: {cookie: `oauth_state=${state}; oauth_pkce_verifier=${wrongVerifier}`},
    })

    // the pairing-enforcing fake rejects at the exchange seam → no session is issued;
    // the stolen-code-without-cookie case is the 403 above
    expect(res.status).not.toBe(302)
    expect(exchangeCalls).toHaveLength(1)
    expect(getSetCookie(res, '__Host-dashboard-session')).toBeUndefined()
  })

  it('spends both one-time cookies (verifier + state cleared after a completed exchange)', async () => {
    const app = await buildTestApp({operatorLogin: 'octocat', githubLogin: 'octocat'})
    const loginRes = await app.request('/auth/login')
    const state = extractCookieValue(getSetCookie(loginRes, 'oauth_state') ?? '')
    const verifier = extractCookieValue(getSetCookie(loginRes, 'oauth_pkce_verifier') ?? '')

    const res = await app.request(`/auth/callback?code=auth-code-123&state=${state}`, {
      headers: {cookie: `oauth_state=${state}; oauth_pkce_verifier=${verifier}`},
    })

    expect(res.status).toBe(302)
    // one-time use: both cookies are SPENT (cleared via Max-Age=0 tombstone Set-Cookie headers)
    expect(getSetCookie(res, 'oauth_pkce_verifier')).toContain('Max-Age=0')
    expect(getSetCookie(res, 'oauth_state')).toContain('Max-Age=0')
  })
})
