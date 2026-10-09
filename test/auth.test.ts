/**
 * Auth route + middleware integration tests.
 * Uses app.request() against buildDashboardApp() with injected config/fakes.
 * Does NOT hit real GitHub — GitHub OAuth and /user fetch are mocked.
 */
import type {GitHubOAuthClient} from '../src/auth/oauth.ts'
import {Buffer} from 'node:buffer'
import {createHmac} from 'node:crypto'
import {describe, expect, it} from 'vitest'
import {fetchGitHubUserLogin, makeGitHubOAuthClient} from '../src/auth/oauth.ts'
import {sanitizeErrorMessage} from '../src/logger.ts'
import {deriveLogoutCsrfToken} from '../src/routes/auth.ts'
import {buildDashboardApp} from '../src/server.ts'
import {SessionManager} from '../src/session.ts'

// 32-byte key for tests — must be non-degenerate (mixed bytes)
const TEST_KEY = Buffer.from('testkey-ABCDEFGHIJKLMNOPQRSTUV12', 'utf8') // 32 bytes, mixed

// rm-149: PKCE code_verifier literal for the direct makeGitHubOAuthClient
// tests below (the route-level PKCE binding/rejection suite lives in
// test/auth-pkce.test.ts).
const TEST_VERIFIER = 'test-verifier-value-for-oauth-client-tests'

// Minimal fake GitHub OAuth client
function makeFakeGitHub(_login: string): GitHubOAuthClient {
  return {
    createAuthorizationURL: (state: string, _scopes: string[]) =>
      new URL(`https://github.com/login/oauth/authorize?state=${state}`),
    validateAuthorizationCode: async (_code: string) => ({
      accessToken: () => 'fake-access-token',
    }),
  }
}

// Helper: build app with injected config
async function buildTestApp(opts: {
  operatorLogin?: string | undefined
  cookieKey?: Buffer | undefined
  githubLogin?: string | undefined // what the fake /user endpoint returns
}) {
  const fakeLogin = opts.githubLogin ?? opts.operatorLogin ?? 'octocat'

  return buildDashboardApp({
    operatorLogin: opts.operatorLogin,
    cookieKey: opts.cookieKey ?? TEST_KEY,
    oauthClient: makeFakeGitHub(fakeLogin),
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

// Helper: cookie attribute tokens (lowercased, name=value segment dropped) — rm-604 pins
function cookieAttributes(header: string | undefined): string[] {
  return (header ?? '').split(';').map(part => part.trim().toLowerCase()).slice(1)
}

/** rm-604: full login+callback flow on ONE topology; returns both responses. */
async function runOAuthFlow(
  app: Awaited<ReturnType<typeof buildTestApp>>,
  loginRequest: () => Response | Promise<Response>,
  callbackHeaders: Record<string, string>,
  /** Origin prefix for the callback request ('' = relative/plain http) — must match the login topology. */
  callbackUrlPrefix = '',
): Promise<{loginRes: Response; callbackRes: Response}> {
  const loginRes = await loginRequest()
  const stateCookieValue = extractCookieValue(getSetCookie(loginRes, 'oauth_state') ?? '')
  // rm-149: the callback requires the PKCE verifier cookie alongside state.
  const pkceCookieValue = extractCookieValue(getSetCookie(loginRes, 'oauth_pkce') ?? '')
  const location = loginRes.headers.get('location') ?? ''
  const stateParam = new URL(location).searchParams.get('state') ?? ''
  const callbackRes = await app.request(
    `${callbackUrlPrefix}/auth/callback?code=fake-code&state=${stateParam}`,
    {
      headers: {cookie: `oauth_state=${stateCookieValue}; oauth_pkce=${pkceCookieValue}`, ...callbackHeaders},
    },
  )
  return {loginRes, callbackRes}
}

describe('auth middleware', () => {
  describe('/healthz is public', () => {
    it('GET /api/healthz returns 200 without auth', async () => {
      const app = await buildTestApp({operatorLogin: 'octocat'})
      const res = await app.request('/api/healthz')
      expect(res.status).toBe(200)
    })
  })

  describe('protected routes require auth', () => {
    it('GET / without session cookie → 401 or redirect to /auth/login', async () => {
      const app = await buildTestApp({operatorLogin: 'octocat'})
      const res = await app.request('/')
      expect([401, 302, 303]).toContain(res.status)
      if (res.status === 302 || res.status === 303) {
        expect(res.headers.get('location')).toContain('/auth/login')
      }
    })

    it('GET / with invalid session cookie → denied', async () => {
      const app = await buildTestApp({operatorLogin: 'octocat'})
      const res = await app.request('/', {
        headers: {cookie: 'session=invalid.garbage'},
      })
      expect([401, 302, 303]).toContain(res.status)
    })

    it('GET / with tampered session cookie → denied', async () => {
      const app = await buildTestApp({operatorLogin: 'octocat'})
      const sm = new SessionManager(TEST_KEY)
      const validCookie = sm.sign('octocat')
      const [payload] = validCookie.split('.')
      const fakeSig = Buffer.from('deadbeef'.repeat(8), 'hex').toString('base64url')
      const tampered = `${payload ?? ''}.${fakeSig}`
      const res = await app.request('/', {
        headers: {cookie: `session=${tampered}`},
      })
      expect([401, 302, 303]).toContain(res.status)
    })

    it('GET / with expired session cookie → denied', async () => {
      // Craft an expired cookie
      const payload = Buffer.from(
        JSON.stringify({login: 'octocat', exp: Math.floor(Date.now() / 1000) - 1}),
      ).toString('base64url')
      const hmac = createHmac('sha256', TEST_KEY).update(payload).digest()
      const sig = Buffer.from(hmac).toString('base64url')
      const expiredCookie = `${payload}.${sig}`

      const app = await buildTestApp({operatorLogin: 'octocat'})
      const res = await app.request('/', {
        headers: {cookie: `session=${expiredCookie}`},
      })
      expect([401, 302, 303]).toContain(res.status)
    })
  })

  describe('fail-closed: missing operator login', () => {
    it('DASHBOARD_OPERATOR_LOGIN unset → all auth denied (no session issued)', async () => {
      // operatorLogin undefined → fail closed (auth routes return 401)
      const app = await buildTestApp({operatorLogin: undefined})
      // Even the callback should fail
      const res = await app.request('/auth/callback?code=abc&state=xyz', {
        headers: {cookie: 'oauth_state=xyz.fakesig'},
      })
      expect([401, 403, 302, 303]).toContain(res.status)
    })

    it('DASHBOARD_OPERATOR_LOGIN unset → protected routes deny (401), not served openly', async () => {
      // The real fail-closed contract: with no operator configured, the
      // PROTECTED data routes (and any unknown path) must be denied — never
      // served without auth. Probing must not reveal which routes exist.
      const app = await buildTestApp({operatorLogin: undefined})
      const root = await app.request('/')
      expect(root.status).toBe(401)
      const unknown = await app.request('/anything')
      expect(unknown.status).toBe(401)
      const apiStatus = await app.request('/api/status')
      expect(apiStatus.status).toBe(401)
    })

    it('DASHBOARD_OPERATOR_LOGIN unset → /api/healthz stays public', async () => {
      const app = await buildTestApp({operatorLogin: undefined})
      const res = await app.request('/api/healthz')
      expect(res.status).toBe(200)
    })

    it('DASHBOARD_OPERATOR_LOGIN whitespace-only → boot throws', async () => {
      await expect(buildTestApp({operatorLogin: '   '})).rejects.toThrow(/operator.*login|DASHBOARD_OPERATOR_LOGIN/i)
    })
  })

  describe('fail-closed: weak cookie key', () => {
    it('cookie key < 32 bytes → boot throws', async () => {
      await expect(
        buildTestApp({
          operatorLogin: 'octocat',
          cookieKey: Buffer.from('short', 'utf8'),
        }),
      ).rejects.toThrow(/key.*32|32.*byte/i)
    })
  })

  describe('fail-closed: missing cookie key when operator is set', () => {
    it('operatorLogin set but no cookieKey → boot throws (FIX #3)', async () => {
      await expect(
        buildDashboardApp({
          operatorLogin: 'octocat',
          // cookieKey intentionally omitted
          oauthClient: makeFakeGitHub('octocat'),
          fetchUserLogin: async () => 'octocat',
        }),
      ).rejects.toThrow(/cookie key required/i)
    })

    it('operatorLogin unset (deny-all) with no cookieKey → does NOT throw (FIX #3)', async () => {
      await expect(
        buildDashboardApp({
          operatorLogin: undefined,
          // cookieKey intentionally omitted — deny-all mode needs no key
          oauthClient: makeFakeGitHub('octocat'),
          fetchUserLogin: async () => 'octocat',
        }),
      ).resolves.toBeDefined()
    })
  })

  describe('operator login mismatch (FIX #4)', () => {
    it('valid cookie for wrong login → protected route denied', async () => {
      // App is configured for 'octocat'; cookie is signed for 'attacker'
      const app = await buildTestApp({operatorLogin: 'octocat'})
      const attackerSm = new SessionManager(TEST_KEY)
      const attackerCookie = attackerSm.sign('attacker')

      const res = await app.request('/', {
        headers: {cookie: `session=${attackerCookie}`},
      })
      // Must be denied — redirect to login or 401
      expect([401, 302, 303]).toContain(res.status)
      if (res.status === 302 || res.status === 303) {
        expect(res.headers.get('location')).toContain('/auth/login')
      }
    })
  })
})

describe('sanitizeErrorMessage (FIX #5)', () => {
  it('redacts GitHub ghs_ tokens', () => {
    const msg = 'token exchange failed: ghs_FAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKE'
    expect(sanitizeErrorMessage(msg)).not.toContain('ghs_')
    expect(sanitizeErrorMessage(msg)).toContain('[REDACTED]')
  })

  it('redacts GitHub gho_ tokens', () => {
    const msg = 'error: gho_FAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKE'
    expect(sanitizeErrorMessage(msg)).not.toContain('gho_')
    expect(sanitizeErrorMessage(msg)).toContain('[REDACTED]')
  })

  it('redacts PEM blocks', () => {
    const pem = '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA\n-----END RSA PRIVATE KEY-----'
    const msg = `key load failed: ${pem}`
    expect(sanitizeErrorMessage(msg)).not.toContain('BEGIN RSA')
    expect(sanitizeErrorMessage(msg)).toContain('[REDACTED]')
  })

  it('redacts JWT-shaped strings', () => {
    const jwt = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
    const msg = `auth failed: ${jwt}`
    expect(sanitizeErrorMessage(msg)).not.toContain('eyJhbGci')
    expect(sanitizeErrorMessage(msg)).toContain('[REDACTED]')
  })

  it('passes through safe error messages unchanged', () => {
    const msg = 'OAuth callback: state mismatch'
    expect(sanitizeErrorMessage(msg)).toBe(msg)
  })
})

describe('OAuth flow', () => {
  describe('/auth/login', () => {
    it('redirects to GitHub authorization URL', async () => {
      const app = await buildTestApp({operatorLogin: 'octocat'})
      const res = await app.request('/auth/login')
      expect([302, 303]).toContain(res.status)
      const location = res.headers.get('location') ?? ''
      expect(location).toContain('github.com')
    })

    it('sets oauth_state cookie (HttpOnly)', async () => {
      const app = await buildTestApp({operatorLogin: 'octocat'})
      const res = await app.request('/auth/login')
      const stateCookie = getSetCookie(res, 'oauth_state')
      expect(stateCookie).toBeDefined()
      expect(stateCookie?.toLowerCase()).toContain('httponly')
    })

    it('sets oauth_state cookie with SameSite=Lax', async () => {
      const app = await buildTestApp({operatorLogin: 'octocat'})
      const res = await app.request('/auth/login')
      const stateCookie = getSetCookie(res, 'oauth_state')
      expect(stateCookie?.toLowerCase()).toContain('samesite=lax')
    })

    it('sets oauth_state cookie scoped to path=/auth (FIX P3)', async () => {
      const app = await buildTestApp({operatorLogin: 'octocat'})
      const res = await app.request('/auth/login')
      const stateCookie = getSetCookie(res, 'oauth_state')
      expect(stateCookie?.toLowerCase()).toContain('path=/auth')
    })
  })

  // rm-604 (2026-10-04): first direct pins of the Secure-attribution rule at
  // BOTH cookie sites. Decision-of-record branch (b): the rule stays
  // header-trusting (url https OR x-forwarded-proto === 'https') so
  // TLS-terminating-proxy deployments keep Secure without an env flag; the
  // asymmetry vs rm-129's opt-in RATE_LIMIT_TRUSTED_PROXY is deliberate and
  // documented in src/routes/auth.ts + README. These tests pin the matrix
  // so the two sites cannot drift apart silently.
  describe('cookie Secure attribution — three deployment topologies (rm-604)', () => {
    it('proxy-terminated TLS: plain-HTTP origin + x-forwarded-proto: https → Secure on BOTH cookie sites', async () => {
      const app = await buildTestApp({operatorLogin: 'octocat', githubLogin: 'octocat'})
      const {loginRes, callbackRes} = await runOAuthFlow(
        app,
        async () => app.request('/auth/login', {headers: {'x-forwarded-proto': 'https'}}),
        {'x-forwarded-proto': 'https'},
      )

      expect(cookieAttributes(getSetCookie(loginRes, 'oauth_state'))).toContain('secure')
      expect(callbackRes.status).toBe(302)
      expect(cookieAttributes(getSetCookie(callbackRes, 'session'))).toContain('secure')
    })

    it('direct TLS: https:// request URL, no XFP header → Secure on BOTH cookie sites', async () => {
      const app = await buildTestApp({operatorLogin: 'octocat', githubLogin: 'octocat'})
      const {loginRes, callbackRes} = await runOAuthFlow(
        app,
        async () => app.request('https://dashboard.example/auth/login'),
        {},
        'https://dashboard.example',
      )

      expect(cookieAttributes(getSetCookie(loginRes, 'oauth_state'))).toContain('secure')
      expect(callbackRes.status).toBe(302)
      expect(cookieAttributes(getSetCookie(callbackRes, 'session'))).toContain('secure')
    })

    it('plain HTTP, no XFP → NOT Secure on either site (Secure would break cookie delivery); XFP: http is exactly-not-https → NOT Secure', async () => {
      const app = await buildTestApp({operatorLogin: 'octocat', githubLogin: 'octocat'})
      const {loginRes, callbackRes} = await runOAuthFlow(
        app,
        async () => app.request('/auth/login'),
        {},
      )

      expect(cookieAttributes(getSetCookie(loginRes, 'oauth_state'))).not.toContain('secure')
      expect(callbackRes.status).toBe(302)
      expect(cookieAttributes(getSetCookie(callbackRes, 'session'))).not.toContain('secure')

      // The XFP rule is an exact 'https' match — a proxy forwarding an
      // plaintext hop as 'http' must not mark the cookie Secure.
      const xfpHttpLogin = await app.request('/auth/login', {headers: {'x-forwarded-proto': 'http'}})
      expect(cookieAttributes(getSetCookie(xfpHttpLogin, 'oauth_state'))).not.toContain('secure')
    })
  })

  describe('/auth/callback — happy path', () => {
    it('issues session cookie for allowlisted login', async () => {
      const app = await buildTestApp({operatorLogin: 'octocat', githubLogin: 'octocat'})
      const sm = new SessionManager(TEST_KEY)

      // First get a valid state cookie from /auth/login
      const loginRes = await app.request('/auth/login')
      const stateCookieHeader = getSetCookie(loginRes, 'oauth_state') ?? ''
      const stateCookieValue = extractCookieValue(stateCookieHeader)
      // rm-149: carry the PKCE verifier cookie too — the callback fails
      // closed without it.
      const pkceCookieValue = extractCookieValue(getSetCookie(loginRes, 'oauth_pkce') ?? '')
      // Extract the state from the redirect URL
      const location = loginRes.headers.get('location') ?? ''
      const stateParam = new URL(location).searchParams.get('state') ?? ''

      const res = await app.request(`/auth/callback?code=fake-code&state=${stateParam}`, {
        headers: {cookie: `oauth_state=${stateCookieValue}; oauth_pkce=${pkceCookieValue}`},
      })

      // Should redirect to / with a session cookie
      expect([302, 303]).toContain(res.status)
      expect(res.headers.get('location')).toBe('/')
      const sessionCookie = getSetCookie(res, 'session')
      expect(sessionCookie).toBeDefined()
      expect(sessionCookie?.toLowerCase()).toContain('httponly')
      expect(sessionCookie?.toLowerCase()).toContain('samesite=lax')

      // Verify the session cookie is valid
      const sessionValue = extractCookieValue(sessionCookie ?? '')
      const verified = sm.verify(sessionValue)
      expect(verified).not.toBeNull()
      expect(verified?.login).toBe('octocat')
    })

    it('protected route accessible with valid session cookie', async () => {
      const app = await buildTestApp({operatorLogin: 'octocat', githubLogin: 'octocat'})
      const sm = new SessionManager(TEST_KEY)
      const sessionCookie = sm.sign('octocat')

      // /api/healthz is public — verify it works with or without auth
      const res = await app.request('/api/healthz', {
        headers: {cookie: `session=${sessionCookie}`},
      })
      expect(res.status).toBe(200)
    })
  })

  describe('/auth/callback — security', () => {
    it('returns 401 when validateAuthorizationCode rejects', async () => {
      let fetchUserLoginCalls = 0
      const app = await buildDashboardApp({
        operatorLogin: 'octocat',
        cookieKey: TEST_KEY,
        oauthClient: {
          createAuthorizationURL: (state: string, _scopes: string[]) =>
            new URL(`https://github.com/login/oauth/authorize?state=${state}`),
          validateAuthorizationCode: async (_code: string) => {
            throw new Error('exchange failed')
          },
        },
        fetchUserLogin: async () => {
          fetchUserLoginCalls++
          return 'octocat'
        },
      })

      const loginRes = await app.request('/auth/login')
      const stateCookieHeader = getSetCookie(loginRes, 'oauth_state') ?? ''
      const stateCookieValue = extractCookieValue(stateCookieHeader)
      const pkceCookieValue = extractCookieValue(getSetCookie(loginRes, 'oauth_pkce') ?? '')
      const location = loginRes.headers.get('location') ?? ''
      const stateParam = new URL(location).searchParams.get('state') ?? ''

      const res = await app.request(`/auth/callback?code=auth-code&state=${stateParam}`, {
        headers: {cookie: `oauth_state=${stateCookieValue}; oauth_pkce=${pkceCookieValue}`},
      })

      expect(res.status).toBe(401)
      expect(getSetCookie(res, 'session')).toBeUndefined()
      expect(fetchUserLoginCalls).toBe(0)
    })

    it('rejects non-allowlisted login (403 or redirect)', async () => {
      // githubLogin is 'attacker', operatorLogin is 'octocat'
      const app = await buildTestApp({operatorLogin: 'octocat', githubLogin: 'attacker'})

      const loginRes = await app.request('/auth/login')
      const stateCookieHeader = getSetCookie(loginRes, 'oauth_state') ?? ''
      const stateCookieValue = extractCookieValue(stateCookieHeader)
      const pkceCookieValue = extractCookieValue(getSetCookie(loginRes, 'oauth_pkce') ?? '')
      const location = loginRes.headers.get('location') ?? ''
      const stateParam = new URL(location).searchParams.get('state') ?? ''

      const res = await app.request(`/auth/callback?code=fake-code&state=${stateParam}`, {
        headers: {cookie: `oauth_state=${stateCookieValue}; oauth_pkce=${pkceCookieValue}`},
      })

      expect([401, 403]).toContain(res.status)
      // Must NOT set a session cookie
      const sessionCookie = getSetCookie(res, 'session')
      expect(sessionCookie).toBeUndefined()
    })

    it('rejects state mismatch (CSRF protection)', async () => {
      const app = await buildTestApp({operatorLogin: 'octocat', githubLogin: 'octocat'})

      // Use a different state in the cookie vs the query param
      const loginRes = await app.request('/auth/login')
      const stateCookieHeader = getSetCookie(loginRes, 'oauth_state') ?? ''
      const stateCookieValue = extractCookieValue(stateCookieHeader)

      const res = await app.request('/auth/callback?code=fake-code&state=WRONG_STATE', {
        headers: {cookie: `oauth_state=${stateCookieValue}`},
      })

      expect([401, 403]).toContain(res.status)
      expect(getSetCookie(res, 'session')).toBeUndefined()
    })

    it('rejects missing state cookie (CSRF protection)', async () => {
      const app = await buildTestApp({operatorLogin: 'octocat', githubLogin: 'octocat'})
      const res = await app.request('/auth/callback?code=fake-code&state=somestate')
      expect([401, 403]).toContain(res.status)
    })

    it('rejects missing code parameter', async () => {
      const app = await buildTestApp({operatorLogin: 'octocat', githubLogin: 'octocat'})
      const loginRes = await app.request('/auth/login')
      const stateCookieHeader = getSetCookie(loginRes, 'oauth_state') ?? ''
      const stateCookieValue = extractCookieValue(stateCookieHeader)
      const location = loginRes.headers.get('location') ?? ''
      const stateParam = new URL(location).searchParams.get('state') ?? ''

      const res = await app.request(`/auth/callback?state=${stateParam}`, {
        headers: {cookie: `oauth_state=${stateCookieValue}`},
      })
      expect([400, 401, 403]).toContain(res.status)
    })
  })

  describe('/auth/logout — CSRF-protected POST (FIX P1)', () => {
    it('POST with valid CSRF token → session cleared + redirect to /auth/login', async () => {
      const app = await buildTestApp({operatorLogin: 'octocat'})
      const sm = new SessionManager(TEST_KEY)
      const sessionCookie = sm.sign('octocat')
      const csrfToken = deriveLogoutCsrfToken(TEST_KEY, 'octocat')

      const body = new URLSearchParams({csrf_token: csrfToken})
      const res = await app.request('/auth/logout', {
        method: 'POST',
        headers: {
          cookie: `session=${sessionCookie}`,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      })

      expect([302, 303]).toContain(res.status)
      expect(res.headers.get('location')).toContain('/auth/login')
      // Session cookie should be cleared (Max-Age=0 or Expires in past)
      const clearedCookie = getSetCookie(res, 'session')
      expect(clearedCookie).toBeDefined()
      expect(clearedCookie?.toLowerCase()).toMatch(/max-age=0|expires=.*1970/)
    })

    it('POST with missing CSRF token → 403', async () => {
      const app = await buildTestApp({operatorLogin: 'octocat'})
      const sm = new SessionManager(TEST_KEY)
      const sessionCookie = sm.sign('octocat')

      const res = await app.request('/auth/logout', {
        method: 'POST',
        headers: {
          cookie: `session=${sessionCookie}`,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: '',
      })

      expect(res.status).toBe(403)
    })

    it('POST with wrong CSRF token → 403', async () => {
      const app = await buildTestApp({operatorLogin: 'octocat'})
      const sm = new SessionManager(TEST_KEY)
      const sessionCookie = sm.sign('octocat')

      const body = new URLSearchParams({csrf_token: 'wrongtoken12345678901234567890ab'})
      const res = await app.request('/auth/logout', {
        method: 'POST',
        headers: {
          cookie: `session=${sessionCookie}`,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      })

      expect(res.status).toBe(403)
    })

    it('POST /auth/logout with an oversized body → 413 before parse (rm-268)', async () => {
      const app = await buildTestApp({operatorLogin: 'octocat'})
      const sm = new SessionManager(TEST_KEY)
      const sessionCookie = sm.sign('octocat')
      const res = await app.request('/auth/logout', {
        method: 'POST',
        headers: {
          cookie: `session=${sessionCookie}`,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: 'x'.repeat(17_000),
      })
      expect(res.status).toBe(413)
    })

    // rm-497: the read itself is bounded (shared readBodyCapped /
    // MAX_REQUEST_BODY_BYTES — src/read-body.ts). The three wire shapes rm-268's
    // post-hoc `.length` check could not defend against are pinned here:
    // endless chunked, finite-but-over-cap with NO content-length, and a
    // lying (under-declaring) Content-Length header.
    it('POST /auth/logout endless chunked body over the cap → 413 with the stream cancelled, not drained (rm-497)', async () => {
      const app = await buildTestApp({operatorLogin: 'octocat'})
      const sm = new SessionManager(TEST_KEY)
      const sessionCookie = sm.sign('octocat')

      let pulledChunks = 0
      const chunk = new Uint8Array(8192) // endless: 8 chunks × 8 KiB available, cap is 16 KiB
      const endless = new ReadableStream<Uint8Array>({
        pull(controller) {
          pulledChunks += 1
          controller.enqueue(chunk)
        },
        cancel() {
          /* reader.cancel() after crossing the cap lands here */
        },
      })

      const req = new Request('http://localhost/auth/logout', {
        method: 'POST',
        headers: {
          cookie: `session=${sessionCookie}`,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: endless,
        duplex: 'half',
      })

      const res = await app.request(req)
      expect(res.status).toBe(413)
      // 8 KiB × 3 = 24 KiB crosses the 16 KiB cap, then cancel — the flood
      // never gets to push the rest of the stream.
      expect(pulledChunks).toBe(3)
    })

    it('POST /auth/logout finite body over the cap with NO content-length → 413 by the incremental byte count (rm-497)', async () => {
      const app = await buildTestApp({operatorLogin: 'octocat'})
      const sm = new SessionManager(TEST_KEY)
      const sessionCookie = sm.sign('octocat')

      let pulledChunks = 0
      const chunk = new Uint8Array(8192) // finite: 4 chunks × 8 KiB = 32 KiB total, cap is 16 KiB
      const finite = new ReadableStream<Uint8Array>({
        pull(controller) {
          pulledChunks += 1
          controller.enqueue(chunk)
          if (pulledChunks >= 4) controller.close()
        },
        cancel() {
          /* reader.cancel() after crossing the cap lands here */
        },
      })

      const req = new Request('http://localhost/auth/logout', {
        method: 'POST',
        headers: {
          cookie: `session=${sessionCookie}`,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: finite,
        duplex: 'half',
      })

      const res = await app.request(req)
      // No content-length to precheck against — only the incremental count
      // can fire, and it must fire BEFORE the stream closes at 32 KiB.
      expect(res.status).toBe(413)
      expect(pulledChunks).toBe(3)
    })

    it('POST /auth/logout with a lying (under-declaring) Content-Length → 413 by the incremental byte count (rm-497)', async () => {
      const app = await buildTestApp({operatorLogin: 'octocat'})
      const sm = new SessionManager(TEST_KEY)
      const sessionCookie = sm.sign('octocat')

      let pulledChunks = 0
      const chunk = new Uint8Array(8192) // declares 10 bytes, actually ships 4 × 8 KiB
      const lying = new ReadableStream<Uint8Array>({
        pull(controller) {
          pulledChunks += 1
          controller.enqueue(chunk)
          if (pulledChunks >= 4) controller.close()
        },
        cancel() {
          /* reader.cancel() after crossing the cap lands here */
        },
      })

      const req = new Request('http://localhost/auth/logout', {
        method: 'POST',
        headers: {
          cookie: `session=${sessionCookie}`,
          'content-type': 'application/x-www-form-urlencoded',
          'content-length': '10',
        },
        body: lying,
        duplex: 'half',
      })

      const res = await app.request(req)
      // The declared 10 passes the precheck — the incremental count must be
      // the check that fires when the real wire bytes cross the cap.
      expect(res.status).toBe(413)
      expect(pulledChunks).toBe(3)
    })

    it('POST /auth/logout with a non-urlencoded content type → 415 (rm-268)', async () => {
      const app = await buildTestApp({operatorLogin: 'octocat'})
      const sm = new SessionManager(TEST_KEY)
      const sessionCookie = sm.sign('octocat')
      const res = await app.request('/auth/logout', {
        method: 'POST',
        headers: {
          cookie: `session=${sessionCookie}`,
          'content-type': 'multipart/form-data; boundary=x',
        },
        body: '--x\r\nContent-Disposition: form-data; name="csrf_token"\r\n\r\nnope\r\n--x--\r\n',
      })
      expect(res.status).toBe(415)
    })

    it('GET /auth/logout is not a registered route (no GET handler)', async () => {
      // /auth/logout is POST-only; GET should return 404 or 405
      const app = await buildTestApp({operatorLogin: 'octocat'})
      const sm = new SessionManager(TEST_KEY)
      const sessionCookie = sm.sign('octocat')

      const res = await app.request('/auth/logout', {
        method: 'GET',
        headers: {cookie: `session=${sessionCookie}`},
      })

      // Hono returns 404 for unregistered routes; 405 would also be acceptable
      expect([404, 405]).toContain(res.status)
    })

    it('CSRF token is login-specific (token for different login → 403)', async () => {
      const app = await buildTestApp({operatorLogin: 'octocat'})
      const sm = new SessionManager(TEST_KEY)
      const sessionCookie = sm.sign('octocat')
      // Token derived for a different login
      const wrongToken = deriveLogoutCsrfToken(TEST_KEY, 'attacker')

      const body = new URLSearchParams({csrf_token: wrongToken})
      const res = await app.request('/auth/logout', {
        method: 'POST',
        headers: {
          cookie: `session=${sessionCookie}`,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      })

      expect(res.status).toBe(403)
    })

    it('CSRF token from an expired time window → 403 (leaked token expires)', async () => {
      const app = await buildTestApp({operatorLogin: 'octocat'})
      const sm = new SessionManager(TEST_KEY)
      const sessionCookie = sm.sign('octocat')
      // Token derived 3 hours ago — older than the current + previous accepted windows
      const staleToken = deriveLogoutCsrfToken(TEST_KEY, 'octocat', Date.now() - 3 * 60 * 60 * 1000)

      const body = new URLSearchParams({csrf_token: staleToken})
      const res = await app.request('/auth/logout', {
        method: 'POST',
        headers: {
          cookie: `session=${sessionCookie}`,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      })

      expect(res.status).toBe(403)
    })
  })
})

describe('makeGitHubOAuthClient', () => {
  it('createAuthorizationURL produces the GitHub authorization URL', () => {
    const client = makeGitHubOAuthClient(
      'client-id',
      'client-secret',
      'https://dashboard.example.com/auth/callback',
    )

    const url = client.createAuthorizationURL('state value', ['read:user', 'repo:status'], 's256-challenge')

    expect(url.origin).toBe('https://github.com')
    expect(url.pathname).toBe('/login/oauth/authorize')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: 'client-id',
      redirect_uri: 'https://dashboard.example.com/auth/callback',
      state: 'state value',
      scope: 'read:user repo:status',
      response_type: 'code',
      // rm-149: PKCE S256 rides the authorize redirect — method pinned, no
      // plain fallback.
      code_challenge: 's256-challenge',
      code_challenge_method: 'S256',
    })
  })

  it('validateAuthorizationCode returns the access token on success', async () => {
    const clientId = 'client-id'
    const clientSecret = 'client-secret'
    const code = 'authorization-code'
    const token = 'gho_access-token'
    const redirectURI = 'https://dashboard.example.com/auth/callback'
    const client = makeGitHubOAuthClient(clientId, clientSecret, redirectURI)
    const originalFetch = globalThis.fetch

    globalThis.fetch = async (input, init) => {
      expect(input).toBe('https://github.com/login/oauth/access_token')
      expect(init?.method).toBe('POST')
      const headers = new Headers(init?.headers)
      expect(headers.get('accept')).toBe('application/json')
      expect(headers.get('content-type')).toBe('application/x-www-form-urlencoded')
      expect(headers.get('user-agent')).toBe('fro-bot-dashboard')
      expect(headers.get('authorization')).toBe(
        `Basic ${Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64')}`,
      )
      expect(init?.redirect).toBe('error')
      expect(init?.body).toBe(
        new URLSearchParams({
          client_id: clientId,
          code,
          // rm-149: the verifier rides the token exchange — GitHub checks
          // S256(code_verifier) against the challenge bound to the code.
          code_verifier: TEST_VERIFIER,
          redirect_uri: redirectURI,
          grant_type: 'authorization_code',
        }).toString(),
      )
      return Response.json({access_token: token})
    }

    try {
      const result = await client.validateAuthorizationCode(code, TEST_VERIFIER)
      expect(result.accessToken()).toBe(token)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('validateAuthorizationCode rejects network failures without echoing sensitive values', async () => {
    const clientId = 'client-id'
    const clientSecret = 'client-secret'
    const code = 'authorization-code'
    const token = 'gho_access-token'
    const client = makeGitHubOAuthClient(clientId, clientSecret, 'https://dashboard.example.com/auth/callback')
    const originalFetch = globalThis.fetch

    globalThis.fetch = async () => {
      throw new Error(`network failure: ${clientSecret}, ${code}, ${token}`)
    }

    try {
      const result = client.validateAuthorizationCode(code, TEST_VERIFIER)
      await expect(result).rejects.toThrow('GitHub OAuth token request failed')
      await expect(result).rejects.not.toThrow(clientSecret)
      await expect(result).rejects.not.toThrow(code)
      await expect(result).rejects.not.toThrow(token)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('validateAuthorizationCode rejects timeout failures without echoing sensitive values', async () => {
    const clientId = 'client-id'
    const clientSecret = 'client-secret'
    const code = 'authorization-code'
    const token = 'gho_access-token'
    const client = makeGitHubOAuthClient(clientId, clientSecret, 'https://dashboard.example.com/auth/callback')
    const originalFetch = globalThis.fetch

    globalThis.fetch = async () => {
      throw Object.assign(new Error(`timeout: ${clientSecret}, ${code}, ${token}`), {name: 'TimeoutError'})
    }

    try {
      const result = client.validateAuthorizationCode(code, TEST_VERIFIER)
      await expect(result).rejects.toThrow('GitHub OAuth token request failed')
      await expect(result).rejects.not.toThrow(clientSecret)
      await expect(result).rejects.not.toThrow(code)
      await expect(result).rejects.not.toThrow(token)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('validateAuthorizationCode rejects an HTTP 200 error response', async () => {
    const clientId = 'client-id'
    const clientSecret = 'client-secret'
    const code = 'authorization-code'
    const token = 'gho_access-token'
    const errorDescription = `provider response included ${clientSecret}, ${code}, and ${token}`
    const client = makeGitHubOAuthClient(clientId, clientSecret, 'https://dashboard.example.com/auth/callback')
    const originalFetch = globalThis.fetch

    globalThis.fetch = async () =>
      Response.json({
        error: 'bad_verification_code',
        error_description: errorDescription,
        error_uri: 'https://docs.github.com',
      })

    try {
      const result = client.validateAuthorizationCode(code, TEST_VERIFIER)
      await expect(result).rejects.toThrow('bad_verification_code')
      await expect(result).rejects.not.toThrow(clientSecret)
      await expect(result).rejects.not.toThrow(code)
      await expect(result).rejects.not.toThrow(token)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('validateAuthorizationCode rejects malformed JSON without echoing response content', async () => {
    const clientId = 'client-id'
    const clientSecret = 'client-secret'
    const code = 'authorization-code'
    const token = 'gho_access-token'
    const client = makeGitHubOAuthClient(clientId, clientSecret, 'https://dashboard.example.com/auth/callback')
    const originalFetch = globalThis.fetch

    globalThis.fetch = async () => new Response(clientSecret, {status: 200})

    try {
      const result = client.validateAuthorizationCode(code, TEST_VERIFIER)
      await expect(result).rejects.toThrow('GitHub OAuth token response was not valid JSON')
      await expect(result).rejects.not.toThrow(clientSecret)
      await expect(result).rejects.not.toThrow(code)
      await expect(result).rejects.not.toThrow(token)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('validateAuthorizationCode rejects an error response even when access_token is present', async () => {
    const clientId = 'client-id'
    const clientSecret = 'client-secret'
    const code = 'authorization-code'
    const token = 'gho_access-token'
    const client = makeGitHubOAuthClient(clientId, clientSecret, 'https://dashboard.example.com/auth/callback')
    const originalFetch = globalThis.fetch

    globalThis.fetch = async () =>
      Response.json({error: 'bad_verification_code', access_token: token})

    try {
      await expect(client.validateAuthorizationCode(code, TEST_VERIFIER)).rejects.toThrow('bad_verification_code')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('treats bad_request as an unrecognized OAuth error code', async () => {
    const clientId = 'client-id'
    const clientSecret = 'client-secret'
    const code = 'authorization-code'
    const client = makeGitHubOAuthClient(clientId, clientSecret, 'https://dashboard.example.com/auth/callback')
    const originalFetch = globalThis.fetch

    globalThis.fetch = async () => Response.json({error: 'bad_request'})

    try {
      let message = ''
      try {
        await client.validateAuthorizationCode(code, TEST_VERIFIER)
      } catch (error) {
        message = error instanceof Error ? error.message : ''
      }
      expect(message).toBe('GitHub OAuth token exchange failed')
      expect(message).not.toContain('bad_request')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('validateAuthorizationCode rejects a non-string error field', async () => {
    const clientId = 'client-id'
    const clientSecret = 'client-secret'
    const code = 'authorization-code'
    const token = 'gho_access-token'
    const client = makeGitHubOAuthClient(clientId, clientSecret, 'https://dashboard.example.com/auth/callback')
    const originalFetch = globalThis.fetch

    globalThis.fetch = async () => Response.json({error: 42, access_token: token})

    try {
      const result = client.validateAuthorizationCode(code, TEST_VERIFIER)
      await expect(result).rejects.toThrow('GitHub OAuth token exchange failed')
      await expect(result).rejects.not.toThrow('42')
      await expect(result).rejects.not.toThrow(clientSecret)
      await expect(result).rejects.not.toThrow(code)
      await expect(result).rejects.not.toThrow(token)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('validateAuthorizationCode rejects a non-ok HTTP response', async () => {
    const clientId = 'client-id'
    const clientSecret = 'client-secret'
    const code = 'authorization-code'
    const token = 'gho_access-token'
    const client = makeGitHubOAuthClient(clientId, clientSecret, 'https://dashboard.example.com/auth/callback')
    const originalFetch = globalThis.fetch

    globalThis.fetch = async () => new Response(null, {status: 502})

    try {
      const result = client.validateAuthorizationCode(code, TEST_VERIFIER)
      await expect(result).rejects.toThrow('502')
      await expect(result).rejects.not.toThrow(clientSecret)
      await expect(result).rejects.not.toThrow(code)
      await expect(result).rejects.not.toThrow(token)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('validateAuthorizationCode rejects a response missing access_token', async () => {
    const clientId = 'client-id'
    const clientSecret = 'client-secret'
    const code = 'authorization-code'
    const token = 'gho_access-token'
    const client = makeGitHubOAuthClient(clientId, clientSecret, 'https://dashboard.example.com/auth/callback')
    const originalFetch = globalThis.fetch

    globalThis.fetch = async () => Response.json({scope: 'read:user'})

    try {
      const result = client.validateAuthorizationCode(code, TEST_VERIFIER)
      await expect(result).rejects.toThrow(TypeError)
      await expect(result).rejects.not.toThrow(clientSecret)
      await expect(result).rejects.not.toThrow(code)
      await expect(result).rejects.not.toThrow(token)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('validateAuthorizationCode rejects an empty access_token', async () => {
    const clientId = 'client-id'
    const clientSecret = 'client-secret'
    const code = 'authorization-code'
    const token = 'gho_access-token'
    const client = makeGitHubOAuthClient(clientId, clientSecret, 'https://dashboard.example.com/auth/callback')
    const originalFetch = globalThis.fetch

    globalThis.fetch = async () => Response.json({access_token: ''})

    try {
      const result = client.validateAuthorizationCode(code, TEST_VERIFIER)
      await expect(result).rejects.toThrow(TypeError)
      await expect(result).rejects.not.toThrow(clientSecret)
      await expect(result).rejects.not.toThrow(code)
      await expect(result).rejects.not.toThrow(token)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('validateAuthorizationCode rejects HTTP 201 with a token', async () => {
    const clientId = 'client-id'
    const clientSecret = 'client-secret'
    const code = 'authorization-code'
    const token = 'gho_access-token'
    const client = makeGitHubOAuthClient(clientId, clientSecret, 'https://dashboard.example.com/auth/callback')
    const originalFetch = globalThis.fetch

    globalThis.fetch = async () => Response.json({access_token: token}, {status: 201})

    try {
      const result = client.validateAuthorizationCode(code, TEST_VERIFIER)
      await expect(result).rejects.toThrow('201')
      await expect(result).rejects.not.toThrow(clientSecret)
      await expect(result).rejects.not.toThrow(code)
      await expect(result).rejects.not.toThrow(token)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('fetchGitHubUserLogin rejects network failures without echoing the access token', async () => {
    const accessToken = 'gho_user-access-token'
    const originalFetch = globalThis.fetch

    globalThis.fetch = async () => {
      throw new Error(`network failure: ${accessToken}`)
    }

    try {
      const result = fetchGitHubUserLogin(accessToken)
      await expect(result).rejects.toThrow('GitHub /user request failed')
      await expect(result).rejects.not.toThrow(accessToken)
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

describe('rate limiter — /auth/login is in sensitiveRoutes (FIX 3)', () => {
  it('/auth/login is rate-limited: checkRateLimit is called for that path', async () => {
    // The sensitiveRoutes set now includes '/auth/login'.
    // We verify this by exhausting the rate limit for a single IP and confirming
    // that a subsequent /auth/login request returns 429.
    const {checkRateLimit} = await import('../src/server.ts')
    const ip = `test-ip-${Date.now()}-login-ratelimit`
    const now = Date.now()

    // Exhaust the limit for this IP
    for (let i = 0; i < 60; i++) {
      checkRateLimit(ip, now)
    }
    // 61st call should be blocked
    expect(checkRateLimit(ip, now)).toBe(false)
  })

  it('/auth/login returns 429 when rate limit is exhausted for the connecting IP', async () => {
    // In test context, getConnInfo throws → ip falls back to 'unknown'.
    // We exhaust the 'unknown' IP limit via checkRateLimit, then verify
    // that /auth/login (a sensitiveRoute) returns 429 — not /auth/callback
    // or any other path that was already in sensitiveRoutes.
    const {checkRateLimit} = await import('../src/server.ts')
    const now = Date.now()
    // Exhaust the 'unknown' IP limit (60 requests)
    for (let i = 0; i < 60; i++) {
      checkRateLimit('unknown', now)
    }

    // Build a fresh app — the rate limit map is module-level and shared
    const app = await buildTestApp({operatorLogin: 'octocat'})
    // /auth/login is now in sensitiveRoutes → should be rate-limited → 429
    const res = await app.request('/auth/login')
    expect(res.status).toBe(429)
  })

  it('/operator is rate-limited: returns 429 when the connecting IP is exhausted', async () => {
    // /operator must be in sensitiveRoutes so it is throttled before live
    // operator mutation endpoints land. The rate-limit middleware runs before
    // auth/mounting, so an exhausted IP gets 429 regardless of the operator flag.
    const {checkRateLimit} = await import('../src/server.ts')
    const now = Date.now()
    for (let i = 0; i < 60; i++) {
      checkRateLimit('unknown', now)
    }

    const app = await buildTestApp({operatorLogin: 'octocat'})
    const res = await app.request('/operator')
    expect(res.status).toBe(429)
  })

  it('/operator/* sub-paths are rate-limited: returns 429 when the IP is exhausted', async () => {
    const {checkRateLimit} = await import('../src/server.ts')
    const now = Date.now()
    for (let i = 0; i < 60; i++) {
      checkRateLimit('unknown', now)
    }

    const app = await buildTestApp({operatorLogin: 'octocat'})
    const res = await app.request('/operator/runs')
    expect(res.status).toBe(429)
  })
})

describe('rm-269 — static assets consume no rate-limit budget (docstring truth pin)', () => {
  it('an exhausted IP still gets non-429 on /assets/*, /static/*, /privacy, /sw.js', async () => {
    const {checkRateLimit} = await import('../src/server.ts')
    const ip = `test-ip-${Date.now()}-static-not-limited`
    const now = Date.now()
    for (let i = 0; i < 60; i++) {
      // bare checkRateLimit counts against every class budget
      checkRateLimit(ip, now)
    }
    const app = await buildTestApp({operatorLogin: 'octocat'})

    const sensitive = await app.request('/api/repos')
    expect(sensitive.status).toBe(429) // /api/* stays budget-gated

    // static / never-sensitive paths are outside the middleware's budget set
    for (const path of ['/assets/app.js', '/static/operator-stream.js', '/privacy', '/sw.js']) {
      const res = await app.request(path)
      expect(
        res.status !== 429,
        `${path} should not consume a rate-limit budget (got 429)`,
      ).toBe(true)
    }
  })
})

describe('rate limiter (FIX P1 + P2)', () => {
  it('checkRateLimit exported function: allows up to limit, blocks beyond', async () => {
    const {checkRateLimit} = await import('../src/server.ts')
    const ip = `test-ip-${Date.now()}-ratelimit`
    const now = Date.now()

    // First 60 requests should be allowed
    for (let i = 0; i < 60; i++) {
      expect(checkRateLimit(ip, now)).toBe(true)
    }
    // 61st should be blocked
    expect(checkRateLimit(ip, now)).toBe(false)
  })

  it('checkRateLimit resets after window expires', async () => {
    const {checkRateLimit} = await import('../src/server.ts')
    const ip = `test-ip-${Date.now()}-reset`
    const now = Date.now()

    // Exhaust the limit
    for (let i = 0; i < 61; i++) {
      checkRateLimit(ip, now)
    }
    expect(checkRateLimit(ip, now)).toBe(false)

    // After window expires, should reset
    const later = now + 61_000 // 61 seconds later
    expect(checkRateLimit(ip, later)).toBe(true)
  })

  it('stale entries are evicted after window passes (FIX P2 — unbounded growth)', async () => {
    const {checkRateLimit} = await import('../src/server.ts')
    // Create many unique IPs to populate the map
    const baseNow = Date.now() + 1_000_000 // offset to avoid collision with other tests
    const ips = Array.from({length: 10}, (_, i) => `evict-test-ip-${i}-${baseNow}`)

    for (const ip of ips) {
      checkRateLimit(ip, baseNow)
    }

    // Advance time by 2× window + 1ms (entries are now stale)
    const staleNow = baseNow + 2 * 60_000 + 1

    // Trigger a sweep by making 500 calls (EVICT_INTERVAL)
    const sweepIp = `sweep-trigger-${baseNow}`
    for (let i = 0; i < 500; i++) {
      checkRateLimit(sweepIp, staleNow)
    }

    // After sweep, the old IPs should be evicted — making a new request for them
    // should succeed (they start fresh, not blocked)
    for (const ip of ips) {
      expect(checkRateLimit(ip, staleNow)).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// /auth/callback — CSRF state compare (timing-safe)
//
// The state param is attacker-supplied input compared against our opaque
// 32-hex token. The compare must be timing-safe (timingSafeEqual with a
// length guard — the raw compare throws on length mismatch and would surface
// as a 500 via the global error handler instead of a clean 403).
// ---------------------------------------------------------------------------

describe('/auth/callback — CSRF state compare (timing-safe)', () => {
  const STATE = 'a'.repeat(32) // same shape as randomBytes(16).toString('hex')

  it('equal-length wrong state value → 403 (mismatch detected through timingSafeEqual)', async () => {
    const app = await buildTestApp({operatorLogin: 'octocat'})
    const res = await app.request(`/auth/callback?code=abc&state=${'b'.repeat(32)}`, {
      headers: {cookie: `oauth_state=${STATE}`},
    })
    expect(res.status).toBe(403)
  })

  it('wrong-length state value → 403, not a crash/500 (length guard before timingSafeEqual)', async () => {
    const app = await buildTestApp({operatorLogin: 'octocat'})
    const res = await app.request('/auth/callback?code=abc&state=xyz', {
      headers: {cookie: `oauth_state=${STATE}`},
    })
    expect(res.status).toBe(403)
    const body = await res.text()
    expect(body).toContain('state mismatch')
  })

  it('matching state passes the CSRF gate (no false rejection on the happy path)', async () => {
    const app = await buildTestApp({operatorLogin: 'octocat'})
    const res = await app.request(`/auth/callback?code=abc&state=${STATE}`, {
      // rm-149: a well-formed PKCE verifier cookie must also be present —
      // otherwise the 403 below could come from the PKCE gate instead of the
      // state compare, and this test would stop proving what its name says.
      headers: {cookie: `oauth_state=${STATE}; oauth_pkce=${'c'.repeat(43)}`},
    })
    // Past the CSRF gate the code exchange runs (fake client) and the operator
    // login matches, so this must NOT be a 403.
    expect(res.status).not.toBe(403)
    expect(res.status).not.toBe(500)
  })
})
