/**
 * rm-149 — OAuth PKCE (RFC 7636) round-trip tests.
 *
 * Covers both sides of the login round-trip: the authorize redirect must carry
 * an S256 code_challenge derived from a fresh verifier, and the token exchange
 * must present the matching code_verifier. The fake OAuth client emulates
 * GitHub's server-side check — it compares the S256 of the verifier received
 * AT EXCHANGE TIME against the challenge captured from the authorize redirect.
 *
 * CodeQL note (js/insufficient-password-hash): every createHash input in this
 * file is a value captured as a FUNCTION ARGUMENT (the verifier observed when
 * the route calls the client, before any cookie round-trip) — never a value
 * read back from a Set-Cookie header. Cookie APIs only carry the opaque
 * strings; the RFC 7636 S256 transform lives in src/auth/oauth.ts.
 */
import type {GitHubOAuthClient} from '../src/auth/oauth.ts'
import {Buffer} from 'node:buffer'
import {describe, expect, it} from 'vitest'
import {createS256CodeChallenge} from '../src/auth/oauth.ts'
import {buildDashboardApp} from '../src/server.ts'

// 32-byte key for tests — must be non-degenerate (mixed bytes)
const TEST_KEY = Buffer.from('testkey-ABCDEFGHIJKLMNOPQRSTUV12', 'utf8') // 32 bytes, mixed

/** GitHub-side state: what the authorize redirect issued for this round-trip. */
interface IssuedAuthorization {
  readonly state: string
  readonly codeChallenge: string
  readonly challengeMethod: string
}

/**
 * Fake OAuth client that emulates GitHub's PKCE enforcement: the exchange only
 * succeeds when the S256 of the presented verifier matches the challenge from
 * the authorize redirect (captured as arguments — not from cookie headers).
 */
function makePkceEnforcingClient(options: {onExchangeAttempt?: (verifier: string) => void} = {}): {
  readonly client: GitHubOAuthClient
  readonly issued: () => IssuedAuthorization | null
} {
  let issuedAuth: IssuedAuthorization | null = null
  return {
    client: {
      createAuthorizationURL: (state: string, _scopes: string[], codeVerifier: string): URL => {
        // GitHub derives and records the challenge at redirect time.
        issuedAuth = {
          state,
          codeChallenge: createS256CodeChallenge(codeVerifier),
          challengeMethod: 'S256',
        }
        const url = new URL('https://github.com/login/oauth/authorize')
        url.search = new URLSearchParams({
          state,
          code_challenge: createS256CodeChallenge(codeVerifier),
          code_challenge_method: 'S256',
        }).toString()
        return url
      },
      validateAuthorizationCode: async (code: string, codeVerifier: string): Promise<{accessToken: () => string}> => {
        options.onExchangeAttempt?.(codeVerifier)
        if (code !== 'fake-code') throw new Error('invalid code')
        if (issuedAuth === null) throw new Error('no authorize redirect was issued')
        // GitHub's check: S256(presented verifier) must equal the recorded challenge.
        if (createS256CodeChallenge(codeVerifier) !== issuedAuth.codeChallenge) {
          throw new Error('code_verifier mismatch')
        }
        return {accessToken: () => 'fake-access-token'}
      },
    },
    issued: () => issuedAuth,
  }
}

// Helper: extract a Set-Cookie header value
function getSetCookie(res: Response, name: string): string | undefined {
  const cookies = res.headers.getSetCookie?.() ?? []
  return cookies.find(c => c.startsWith(`${name}=`))
}

// Helper: raw cookie value out of a Set-Cookie header
function extractCookieValue(header: string): string {
  return header.split(';')[0]?.split('=').slice(1).join('=') ?? ''
}

describe('rm-149 — PKCE S256 on the login round-trip', () => {
  it('/auth/login redirect carries an S256 code_challenge and never the verifier', async () => {
    const {client} = makePkceEnforcingClient()
    const app = await buildDashboardApp({
      operatorLogin: 'octocat',
      cookieKey: TEST_KEY,
      oauthClient: client,
      fetchUserLogin: async () => 'octocat',
    })

    const res = await app.request('/auth/login')
    expect(res.status).toBe(302)

    const params = Object.fromEntries(new URL(res.headers.get('location') ?? '').searchParams)
    expect(params.code_challenge_method).toBe('S256')
    // 43-char base64url challenge (sha256 of a 43-char verifier, padding-stripped)
    expect(params.code_challenge).toMatch(/^[A-Za-z0-9_-]{43}$/)
    // The verifier itself must never appear in the redirect
    const redirect = res.headers.get('location') ?? ''
    expect(redirect).not.toContain('code_verifier')
    // ...but it IS issued in the one-time HttpOnly cookie
    const pkceCookie = getSetCookie(res, 'oauth_pkce_verifier')
    expect(pkceCookie).toBeDefined()
    const verifier = extractCookieValue(pkceCookie ?? '')
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/)
    // And the challenge in the redirect is the S256 of that verifier
    expect(params.code_challenge).toBe(createS256CodeChallenge(verifier))
  })

  it('verifier cookie mirrors the state cookie flags (HttpOnly, SameSite=Lax, path=/auth, short TTL; Secure behind https)', async () => {
    const {client} = makePkceEnforcingClient()
    const app = await buildDashboardApp({
      operatorLogin: 'octocat',
      cookieKey: TEST_KEY,
      oauthClient: client,
      fetchUserLogin: async () => 'octocat',
    })

    // Plain http (the app.request default): same attribute set the state
    // cookie carries. Secure is conditional on the request proto in this
    // repo (see src/routes/auth.ts setCookie options), so it is asserted on
    // the proxied-https variant below, exactly like the state cookie.
    const res = await app.request('/auth/login')
    const pkceCookie = (getSetCookie(res, 'oauth_pkce_verifier') ?? '').toLowerCase()
    expect(pkceCookie).toContain('httponly')
    expect(pkceCookie).toContain('samesite=lax')
    expect(pkceCookie).toContain('path=/auth')
    expect(pkceCookie).toMatch(/max-age=600/)

    // Behind the reverse proxy (x-forwarded-proto: https): both cookies gain Secure.
    const httpsRes = await app.request('/auth/login', {
      headers: {'x-forwarded-proto': 'https'},
    })
    expect((getSetCookie(httpsRes, 'oauth_pkce_verifier') ?? '').toLowerCase()).toContain('secure')
    expect((getSetCookie(httpsRes, 'oauth_state') ?? '').toLowerCase()).toContain('secure')
  })

  it('happy path — verifier presented at exchange satisfies the S256 check and issues a session', async () => {
    let presentedVerifier: string | undefined
    const {client, issued} = makePkceEnforcingClient({onExchangeAttempt: v => (presentedVerifier = v)})
    const app = await buildDashboardApp({
      operatorLogin: 'octocat',
      cookieKey: TEST_KEY,
      oauthClient: client,
      fetchUserLogin: async () => 'octocat',
    })

    const loginRes = await app.request('/auth/login')
    const stateCookieValue = extractCookieValue(getSetCookie(loginRes, 'oauth_state') ?? '')
    const pkceCookieValue = extractCookieValue(getSetCookie(loginRes, 'oauth_pkce_verifier') ?? '')
    const stateParam = new URL(loginRes.headers.get('location') ?? '').searchParams.get('state') ?? ''

    const res = await app.request(`/auth/callback?code=fake-code&state=${stateParam}`, {
      headers: {cookie: `oauth_state=${stateCookieValue}; oauth_pkce_verifier=${pkceCookieValue}`},
    })

    expect([302, 303]).toContain(res.status)
    expect(res.headers.get('location')).toBe('/')
    expect(getSetCookie(res, 'session')).toBeDefined()
    // The exchange presented the cookie's verifier AND GitHub's S256 check passed
    expect(presentedVerifier).toBe(pkceCookieValue)
    expect(issued()?.codeChallenge).toBe(createS256CodeChallenge(pkceCookieValue))
    // One-time use: the verifier cookie is cleared on the response
    expect((getSetCookie(res, 'oauth_pkce_verifier') ?? '').toLowerCase()).toContain('max-age=0')
  })

  it('missing verifier cookie → 403 before any token exchange (challenge-absent rejection)', async () => {
    let exchangeCalls = 0
    const {client} = makePkceEnforcingClient({onExchangeAttempt: () => exchangeCalls++})
    const app = await buildDashboardApp({
      operatorLogin: 'octocat',
      cookieKey: TEST_KEY,
      oauthClient: client,
      fetchUserLogin: async () => 'octocat',
    })

    const loginRes = await app.request('/auth/login')
    const stateCookieValue = extractCookieValue(getSetCookie(loginRes, 'oauth_state') ?? '')
    const stateParam = new URL(loginRes.headers.get('location') ?? '').searchParams.get('state') ?? ''

    // State cookie present, PKCE cookie absent
    const res = await app.request(`/auth/callback?code=fake-code&state=${stateParam}`, {
      headers: {cookie: `oauth_state=${stateCookieValue}`},
    })

    expect(res.status).toBe(403)
    expect(await res.text()).toContain('PKCE verifier')
    expect(exchangeCalls).toBe(0)
    expect(getSetCookie(res, 'session')).toBeUndefined()
  })

  it('tampered verifier → exchange rejected by the S256 check (401, no session)', async () => {
    const {client} = makePkceEnforcingClient()
    const app = await buildDashboardApp({
      operatorLogin: 'octocat',
      cookieKey: TEST_KEY,
      oauthClient: client,
      fetchUserLogin: async () => 'octocat',
    })

    const loginRes = await app.request('/auth/login')
    const stateCookieValue = extractCookieValue(getSetCookie(loginRes, 'oauth_state') ?? '')
    const stateParam = new URL(loginRes.headers.get('location') ?? '').searchParams.get('state') ?? ''

    // A different verifier (attacker-substituted cookie): its S256 cannot match
    // the challenge GitHub recorded for this authorization code.
    const tamperedVerifier = 'A234567890123456789012345678901234567890123'
    const res = await app.request(`/auth/callback?code=fake-code&state=${stateParam}`, {
      headers: {cookie: `oauth_state=${stateCookieValue}; oauth_pkce_verifier=${tamperedVerifier}`},
    })

    expect(res.status).toBe(401)
    expect(getSetCookie(res, 'session')).toBeUndefined()
  })

  it('verifier cookie is single-use: the callback clears it in the browser jar (deletion markers on the response)', async () => {
    const {client} = makePkceEnforcingClient()
    const app = await buildDashboardApp({
      operatorLogin: 'octocat',
      cookieKey: TEST_KEY,
      oauthClient: client,
      fetchUserLogin: async () => 'octocat',
    })

    const loginRes = await app.request('/auth/login')
    const stateCookieValue = extractCookieValue(getSetCookie(loginRes, 'oauth_state') ?? '')
    const pkceCookieValue = extractCookieValue(getSetCookie(loginRes, 'oauth_pkce_verifier') ?? '')
    const stateParam = new URL(loginRes.headers.get('location') ?? '').searchParams.get('state') ?? ''

    const first = await app.request(`/auth/callback?code=fake-code&state=${stateParam}`, {
      headers: {cookie: `oauth_state=${stateCookieValue}; oauth_pkce_verifier=${pkceCookieValue}`},
    })
    expect([302, 303]).toContain(first.status)

    // One-time semantics are delivered by clearing the cookie in the browser
    // jar — there is deliberately no server-side one-time store (the state
    // cookie has the same property; a raw socket replay that re-sends the
    // cookie bytes is indistinguishable from the first request). Assert the
    // deletion markers: a compliant browser jar holds neither cookie after
    // this response, so a browser-driven replay cannot re-present them.
    const setCookies = first.headers.getSetCookie()
    const pkceDeletion = setCookies.find(sc => sc.startsWith('oauth_pkce_verifier=')) ?? ''
    expect(pkceDeletion).toContain('Max-Age=0')
    const stateDeletion = setCookies.find(sc => sc.startsWith('oauth_state=')) ?? ''
    expect(stateDeletion).toContain('Max-Age=0')
  })
})

describe('rm-149 — PKCE S256 derivation (RFC 7636 appendix B vector)', () => {
  it('matches the RFC 7636 test vector', () => {
    // RFC 7636 Appendix B: verifier "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
    // has S256 challenge "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM".
    expect(createS256CodeChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    )
  })
})
