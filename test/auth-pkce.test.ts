/**
 * rm-149: PKCE S256 hardening of the operator OAuth flow (RFC 7636).
 *
 * Acceptance surface, per the ledger def:
 * - the authorize redirect carries state AND an S256 code_challenge (never a
 *   plain method — no downgrade);
 * - the verifier lives in a short-lived HttpOnly SameSite=Lax cookie that
 *   mirrors the state cookie (same TTL, path, and Secure-attribution rule);
 * - the token exchange sends code_verifier and rejects a missing challenge
 *   (downgrade shape), a tampered verifier (well-formed but wrong), and a
 *   malformed or absent cookie;
 * - both auth cookies are cleared one-time-use on the callback response.
 *
 * CodeQL authoring constraint (rm-149's 2026-09-30 github-review rider): the
 * historical js/insufficient-password-hash false-positive came from hashing a
 * Set-Cookie-sourced verifier. Every S256 hash input in this file is a value
 * captured BEFORE it enters a cookie: the binding proof hashes the
 * code_verifier ARGUMENT the fake's validateAuthorizationCode receives and
 * compares it to the code_challenge ARGUMENT createAuthorizationURL received
 * — the cookie↔argument link is asserted by plain string equality only, never
 * by hashing a cookie value.
 */
import type {GitHubOAuthClient} from '../src/auth/oauth.ts'
import {Buffer} from 'node:buffer'
import {describe, expect, it} from 'vitest'
import {deriveS256Challenge, generatePkceVerifier, isWellFormedPkceVerifier} from '../src/auth/pkce.ts'
import {buildDashboardApp} from '../src/server.ts'
import {SessionManager} from '../src/session.ts'

// 32-byte key — same non-degeneracy rule as test/auth.test.ts.
const TEST_KEY = Buffer.from('pKcE-tEsT-kEy-AbCdEfGhIjKlMnOpQr', 'utf8') // 32 bytes, mixed

// RFC 7636 Appendix B reference vector — pins S256 correctness byte-for-byte.
const RFC_VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
const RFC_CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'

/** What the fake client observed — by function ARGUMENT, never by cookie. */
interface PkceObservation {
  /** code_challenge argument received by createAuthorizationURL. */
  challenge: string | undefined
  /** code_verifier argument received by validateAuthorizationCode. */
  verifier: string | undefined
  exchangeCalls: number
}

/**
 * Fake GitHub client that enforces the RFC 7636 §4.6 binding exactly the way
 * GitHub's token endpoint does: the exchange succeeds only when
 * S256(code_verifier) equals the challenge the authorize redirect carried.
 * `dropChallenge` mints the downgrade shape (a redirect with NO challenge) to
 * prove the exchange still fails closed instead of silently completing.
 */
function makePkceFake(opts: {dropChallenge?: boolean} = {}): {client: GitHubOAuthClient; observed: PkceObservation} {
  const observed: PkceObservation = {challenge: undefined, verifier: undefined, exchangeCalls: 0}
  const client: GitHubOAuthClient = {
    createAuthorizationURL: (state, _scopes, codeChallenge) => {
      observed.challenge = opts.dropChallenge ? undefined : codeChallenge
      const params = new URLSearchParams({state})
      if (observed.challenge !== undefined) {
        params.set('code_challenge', observed.challenge)
        params.set('code_challenge_method', 'S256')
      }
      return new URL(`https://github.com/login/oauth/authorize?${params.toString()}`)
    },
    validateAuthorizationCode: async (code, codeVerifier) => {
      observed.exchangeCalls++
      observed.verifier = codeVerifier
      if (observed.challenge === undefined || deriveS256Challenge(codeVerifier) !== observed.challenge) {
        // GitHub's error shape for a failed PKCE binding (bad_verification_code).
        throw new Error('GitHub OAuth token exchange failed: bad_verification_code')
      }
      return {accessToken: () => `gho_pkcefake-${code}`}
    },
  }
  return {client, observed}
}

async function buildPkceApp(client: GitHubOAuthClient) {
  return buildDashboardApp({
    operatorLogin: 'octocat',
    cookieKey: TEST_KEY,
    oauthClient: client,
    fetchUserLogin: async token => (token.startsWith('gho_pkcefake-') ? 'octocat' : 'someone-else'),
  })
}

function setCookieHeader(res: Response, name: string): string | undefined {
  return (res.headers.getSetCookie?.() ?? []).find(cookie => cookie.startsWith(`${name}=`))
}

function cookieValue(header: string | undefined): string {
  return header?.split(';')[0]?.split('=').slice(1).join('=') ?? ''
}

/** Lowercased attribute tokens after the name=value segment (rm-604 helper shape). */
function cookieAttributes(header: string | undefined): string[] {
  return (header ?? '').split(';').map(part => part.trim().toLowerCase()).slice(1)
}

/** Drives /auth/login and returns both cookies plus the redirect target. */
async function driveLogin(app: Awaited<ReturnType<typeof buildPkceApp>>, url = '/auth/login') {
  const loginRes = await app.request(url)
  const stateHeader = setCookieHeader(loginRes, 'oauth_state')
  const pkceHeader = setCookieHeader(loginRes, 'oauth_pkce')
  const location = loginRes.headers.get('location') ?? ''
  const stateCookie = cookieValue(stateHeader)
  const pkceCookie = cookieValue(pkceHeader)
  return {
    loginRes,
    stateParam: new URL(location).searchParams.get('state') ?? '',
    stateCookie,
    pkceCookie,
    pkceHeader,
    location,
    /** Cookie header for the callback; `overrideVerifier` simulates tampering. */
    cookieHeader: (overrideVerifier?: string) =>
      `oauth_state=${stateCookie}; oauth_pkce=${overrideVerifier ?? pkceCookie}`,
  }
}

describe('rm-149 PKCE helpers (src/auth/pkce.ts)', () => {
  it('generatePkceVerifier mints a fresh 43-char unreserved verifier per call', () => {
    const first = generatePkceVerifier()
    const second = generatePkceVerifier()
    expect(first).toHaveLength(43)
    expect(second).toHaveLength(43)
    expect(first).toMatch(/^[\w.~-]{43}$/)
    expect(second).toMatch(/^[\w.~-]{43}$/)
    expect(first).not.toBe(second)
    expect(isWellFormedPkceVerifier(first)).toBe(true)
  })

  it('deriveS256Challenge matches the RFC 7636 Appendix B reference vector', () => {
    expect(deriveS256Challenge(RFC_VERIFIER)).toBe(RFC_CHALLENGE)
  })

  it('isWellFormedPkceVerifier rejects absent, wrong-length, and non-unreserved shapes', () => {
    expect(isWellFormedPkceVerifier(undefined)).toBe(false)
    expect(isWellFormedPkceVerifier('')).toBe(false)
    expect(isWellFormedPkceVerifier('a'.repeat(42))).toBe(false)
    expect(isWellFormedPkceVerifier('a'.repeat(44))).toBe(false)
    // base64 non-url-safe bytes (+, /, =) never appear in a minted verifier
    expect(isWellFormedPkceVerifier(`+/${'a'.repeat(40)}=`)).toBe(false)
    expect(isWellFormedPkceVerifier(`${'cd'.repeat(21)}e`)).toBe(true) // 43 unreserved chars
  })
})

describe('rm-149 /auth/login — authorize redirect + verifier cookie', () => {
  it('redirect carries state AND an S256 code_challenge, and never the verifier itself', async () => {
    const {client, observed} = makePkceFake()
    const app = await buildPkceApp(client)
    const login = await driveLogin(app)

    const url = new URL(login.location)
    expect(url.searchParams.get('state')).toBe(login.stateParam)
    expect(url.searchParams.get('state')).toHaveLength(32)
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    const challenge = url.searchParams.get('code_challenge') ?? ''
    expect(challenge).toHaveLength(43)
    // No plain-method downgrade anywhere on the redirect, and the verifier
    // never rides the URL (only the challenge does).
    expect(url.search).not.toContain('code_challenge_method=plain')
    expect(login.location).not.toContain(login.pkceCookie)

    // Argument-sourced equality: the challenge the redirect builder received
    // is the challenge in the URL. The S256 proof itself lives inside the
    // fake's exchange (hashing only function arguments — see the file header).
    expect(observed.challenge).toBe(challenge)
    expect(observed.verifier).toBeUndefined()
  })

  it('verifier cookie mirrors the state cookie: HttpOnly, SameSite=Lax, Path=/auth, Max-Age=600', async () => {
    const {client} = makePkceFake()
    const app = await buildPkceApp(client)
    const login = await driveLogin(app)

    expect(login.pkceHeader).toBeDefined()
    const attrs = cookieAttributes(login.pkceHeader)
    expect(attrs).toContain('httponly')
    expect(attrs).toContain('samesite=lax')
    expect(attrs).toContain('path=/auth')
    // Same short TTL class as the state cookie — both are 10-minute one-flow tokens.
    expect(attrs).toContain('max-age=600')
    expect(cookieAttributes(setCookieHeader(login.loginRes, 'oauth_state'))).toContain('max-age=600')
  })

  it('Secure attribution mirrors the state cookie at the third cookie site (rm-604 rule)', async () => {
    const {client} = makePkceFake()
    const app = await buildPkceApp(client)

    // Direct TLS: absolute https request URL.
    const tls = await driveLogin(app, 'https://dashboard.example.com/auth/login')
    const tlsState = cookieAttributes(setCookieHeader(tls.loginRes, 'oauth_state'))
    expect(tlsState).toContain('secure')
    expect(cookieAttributes(tls.pkceHeader)).toContain('secure')

    // Proxy-terminated TLS: plain-HTTP origin + x-forwarded-proto: https.
    const xfp = await app.request('/auth/login', {headers: {'x-forwarded-proto': 'https'}})
    expect(cookieAttributes(setCookieHeader(xfp, 'oauth_pkce'))).toContain('secure')

    // Plain HTTP, no XFP: neither site is Secure (Secure would drop the cookie).
    const plain = await app.request('/auth/login')
    expect(cookieAttributes(setCookieHeader(plain, 'oauth_state'))).not.toContain('secure')
    expect(cookieAttributes(setCookieHeader(plain, 'oauth_pkce'))).not.toContain('secure')
  })

  it('each login mints a fresh state AND a fresh verifier (no replay across flows)', async () => {
    const {client} = makePkceFake()
    const app = await buildPkceApp(client)
    const first = await driveLogin(app)
    const second = await driveLogin(app)
    expect(second.stateCookie).not.toBe(first.stateCookie)
    expect(second.pkceCookie).not.toBe(first.pkceCookie)
  })
})

describe('rm-149 /auth/callback — PKCE binding, fail-closed paths, one-time use', () => {
  it('happy path: exchange receives the cookie-held verifier, S256(verifier) === challenge, session issued', async () => {
    const {client, observed} = makePkceFake()
    const app = await buildPkceApp(client)
    const login = await driveLogin(app)

    const res = await app.request(`/auth/callback?code=pkce-code&state=${login.stateParam}`, {
      headers: {cookie: login.cookieHeader()},
    })

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/')
    const sessionCookie = setCookieHeader(res, 'session')
    expect(sessionCookie).toBeDefined()
    const verified = new SessionManager(TEST_KEY).verify(cookieValue(sessionCookie))
    expect(verified?.login).toBe('octocat')

    // The exchange ran exactly once with the verifier the cookie held (plain
    // string equality — the cookie↔argument link), and the fake's binding
    // check passed: S256(argument verifier) === argument challenge.
    expect(observed.exchangeCalls).toBe(1)
    expect(observed.verifier).toBe(login.pkceCookie)
    expect(observed.challenge).toBe(deriveS256Challenge(observed.verifier ?? ''))
  })

  it('missing verifier cookie → 403 BEFORE the exchange; no session, exchange never called', async () => {
    const {client, observed} = makePkceFake()
    const app = await buildPkceApp(client)
    const login = await driveLogin(app)

    const res = await app.request(`/auth/callback?code=pkce-code&state=${login.stateParam}`, {
      headers: {cookie: `oauth_state=${login.stateCookie}`},
    })

    expect(res.status).toBe(403)
    expect(await res.text()).toContain('PKCE')
    expect(setCookieHeader(res, 'session')).toBeUndefined()
    expect(observed.exchangeCalls).toBe(0)
  })

  it('malformed verifier cookie (short / non-unreserved bytes) → 403, exchange never called', async () => {
    const {client, observed} = makePkceFake()
    const app = await buildPkceApp(client)
    const login = await driveLogin(app)

    for (const bad of ['short-value', `+/${'a'.repeat(40)}=`]) {
      const res = await app.request(`/auth/callback?code=pkce-code&state=${login.stateParam}`, {
        headers: {cookie: login.cookieHeader(bad)},
      })
      expect(res.status).toBe(403)
      expect(setCookieHeader(res, 'session')).toBeUndefined()
    }
    expect(observed.exchangeCalls).toBe(0)
  })

  it('tampered verifier cookie (well-formed, wrong) → rejected BY the exchange: 401, no session', async () => {
    const {client, observed} = makePkceFake()
    const app = await buildPkceApp(client)
    const login = await driveLogin(app)

    // Fresh mint: passes the shape gate, but S256(new) ≠ the bound challenge.
    const tampered = generatePkceVerifier()
    expect(tampered).not.toBe(login.pkceCookie)

    const res = await app.request(`/auth/callback?code=pkce-code&state=${login.stateParam}`, {
      headers: {cookie: login.cookieHeader(tampered)},
    })

    expect(res.status).toBe(401)
    expect(setCookieHeader(res, 'session')).toBeUndefined()
    expect(observed.exchangeCalls).toBe(1)
    expect(observed.verifier).toBe(tampered)
  })

  it('downgrade shape — redirect minted WITHOUT a challenge → the exchange still fails closed (401)', async () => {
    const {client, observed} = makePkceFake({dropChallenge: true})
    const app = await buildPkceApp(client)
    const login = await driveLogin(app)

    expect(new URL(login.location).searchParams.get('code_challenge')).toBeNull()

    const res = await app.request(`/auth/callback?code=pkce-code&state=${login.stateParam}`, {
      headers: {cookie: login.cookieHeader()},
    })

    expect(res.status).toBe(401)
    expect(setCookieHeader(res, 'session')).toBeUndefined()
    expect(observed.exchangeCalls).toBe(1)
  })

  it('one-time use: the callback clears BOTH the state and PKCE cookies', async () => {
    const {client} = makePkceFake()
    const app = await buildPkceApp(client)
    const login = await driveLogin(app)

    const res = await app.request(`/auth/callback?code=pkce-code&state=${login.stateParam}`, {
      headers: {cookie: login.cookieHeader()},
    })
    expect(res.status).toBe(302)
    for (const name of ['oauth_state', 'oauth_pkce']) {
      const cleared = setCookieHeader(res, name)
      expect(cleared).toBeDefined()
      expect(cleared?.toLowerCase()).toMatch(/max-age=0|expires=.*1970/)
    }
  })
})
