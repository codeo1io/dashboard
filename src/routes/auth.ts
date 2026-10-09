/**
 * GitHub OAuth routes: /auth/login, /auth/callback, /auth/logout.
 *
 * Security invariants:
 * - State cookie is HttpOnly, Secure, SameSite=Lax, short-TTL (~10 min), path=/auth.
 * - PKCE (rm-149, RFC 7636): the authorize redirect ALWAYS carries an S256
 *   code_challenge (never plain); the verifier lives in a second short-TTL
 *   HttpOnly SameSite=Lax cookie (`oauth_pkce`) minted alongside state with
 *   identical attributes; the callback refuses to exchange without a
 *   well-formed verifier (403) and passes it as code_verifier to the token
 *   exchange, which rejects mismatches (401). No verifier-less downgrade.
 * - State mismatch → 403 (CSRF protection).
 * - Non-allowlisted login → 403, no session issued.
 * - Session cookie is HttpOnly, Secure, SameSite=Lax, 24h TTL.
 * - Operator login check is case-sensitive exact match.
 * - Logout requires a valid CSRF token (HMAC-derived, double-submit pattern).
 *   Token = HMAC-SHA256(cookieKey, login + ':logout:' + window) truncated to 32 hex chars,
 *   where window = floor(now / CSRF_WINDOW_MS). Binding to the time window means a leaked
 *   token expires after at most 2 windows (~2 hours). Verified with timingSafeEqual.
 */
import type {GitHubOAuthClient} from '../auth/oauth.ts'
import type {SessionManager} from '../session.ts'
import {Buffer} from 'node:buffer'
import {createHmac, randomBytes, timingSafeEqual} from 'node:crypto'
import {Hono} from 'hono'
import {deleteCookie, getCookie, setCookie} from 'hono/cookie'
import {deriveS256Challenge, generatePkceVerifier, isWellFormedPkceVerifier} from '../auth/pkce.ts'
import {logger, sanitizeErrorMessage} from '../logger.ts'
import {MAX_REQUEST_BODY_BYTES, readBodyCapped} from '../read-body.ts'

/** State cookie TTL: 10 minutes */
const STATE_COOKIE_MAX_AGE = 10 * 60

/** Name of the OAuth state cookie */
const STATE_COOKIE_NAME = 'oauth_state'

/** Name of the OAuth PKCE code verifier cookie (rm-149) */
const PKCE_COOKIE_NAME = 'oauth_pkce'

/** Name of the session cookie */
const SESSION_COOKIE_NAME = 'session'

export interface AuthRouteConfig {
  /** Exact GitHub login that is allowed to authenticate. */
  readonly operatorLogin: string
  /** Session manager for signing/verifying session cookies. */
  readonly sessionManager: SessionManager
  /** GitHub OAuth client (Arctic or fake for tests). */
  readonly oauthClient: GitHubOAuthClient
  /** Fetches the GitHub login for an access token. Injected for testability. */
  readonly fetchUserLogin: (accessToken: string) => Promise<string>
  /** Cookie signing key — used to derive the logout CSRF token. */
  readonly cookieKey: Buffer
}

/** CSRF token validity window (ms). A leaked logout token expires after at most 2 windows. */
const CSRF_WINDOW_MS = 60 * 60 * 1000

/**
 * Derives the logout CSRF token for a given login, bound to a coarse time window.
 * Token = first 32 hex chars of HMAC-SHA256(cookieKey, login + ':logout:' + window).
 * Binding to the login makes it operator-specific; binding to the time window means
 * a leaked token stops working after at most 2 windows (defeats permanent replay).
 */
export function deriveLogoutCsrfToken(cookieKey: Buffer, login: string, now: number = Date.now()): string {
  const window = Math.floor(now / CSRF_WINDOW_MS)
  return createHmac('sha256', cookieKey).update(`${login}:logout:${window}`).digest('hex').slice(0, 32)
}

/**
 * Builds the auth router with the given config.
 * Mounted at `/auth` in the main app.
 */
export function buildAuthRouter(config: AuthRouteConfig): Hono {
  const {operatorLogin, sessionManager, oauthClient, fetchUserLogin, cookieKey} = config
  const router = new Hono()

  /**
   * GET /auth/login
   * Generates OAuth state + a PKCE verifier (rm-149), stores both in short-TTL
   * HttpOnly cookies, redirects to GitHub with an S256 code_challenge.
   */
  router.get('/login', c => {
    const state = randomBytes(16).toString('hex')

    // rm-149 PKCE (RFC 7636, S256 only): 43-char verifier from 32 random
    // bytes; the challenge is BASE64URL(SHA-256(verifier)) and rides the
    // authorize redirect. GitHub OAuth Apps accept S256 only — there is no
    // plain-method fallback anywhere on this path.
    const codeVerifier = generatePkceVerifier()
    const codeChallenge = deriveS256Challenge(codeVerifier)

    // Store state in a short-TTL HttpOnly cookie scoped to /auth (only read on /auth/callback).
    // CSRF check compares query param state vs cookie state (exact match).
    //
    // Secure attribution (rm-604, decision-of-record 2026-10-04, branch (b)):
    // trust BOTH the request scheme AND x-forwarded-proto — deliberately
    // header-trusting, deliberately NOT env-gated. This is a single-operator
    // dashboard deployed behind a TLS-terminating reverse proxy: without XFP
    // trust, the proxy deployment silently loses the Secure flag. The
    // asymmetry vs rm-129 (RATE_LIMIT_TRUSTED_PROXY must be opt-in because
    // XFF-based rate-limit keying is client-spoofable when the proxy merely
    // APPENDS) is intentional: here a spoofed 'x-forwarded-proto: https' from
    // a plain-HTTP direct client can only ADD Secure to a cookie that is
    // already HttpOnly + SameSite=Lax — it cannot strip protection or mint
    // auth; the attack requires a MITM who could already read the response.
    // Behind an appending proxy the residual risk is accepted: the worst
    // outcome is a Secure cookie over that same already-intercepted hop.
    // Deployment requirement documented in README (Configuration): use an
    // OVERWRITING proxy or serve direct TLS.
    setCookie(c, STATE_COOKIE_NAME, state, {
      httpOnly: true,
      secure: c.req.url.startsWith('https://') || c.req.header('x-forwarded-proto') === 'https',
      sameSite: 'Lax',
      maxAge: STATE_COOKIE_MAX_AGE,
      path: '/auth',
    })

    // rm-149: the PKCE verifier cookie mirrors the state cookie exactly —
    // same TTL, path, SameSite, HttpOnly, and the same rm-604 branch-(b)
    // Secure-attribution rule (see the comment above). It is read exactly
    // once, on /auth/callback, and cleared one-time-use with the state.
    setCookie(c, PKCE_COOKIE_NAME, codeVerifier, {
      httpOnly: true,
      secure: c.req.url.startsWith('https://') || c.req.header('x-forwarded-proto') === 'https',
      sameSite: 'Lax',
      maxAge: STATE_COOKIE_MAX_AGE,
      path: '/auth',
    })

    const authURL = oauthClient.createAuthorizationURL(state, ['read:user'], codeChallenge)
    return c.redirect(authURL.toString(), 302)
  })

  /**
   * GET /auth/callback
   * Validates state (CSRF), exchanges code for token, checks operator allowlist,
   * issues session cookie.
   */
  router.get('/callback', async c => {
    const code = c.req.query('code')
    const stateParam = c.req.query('state')
    const stateCookie = getCookie(c, STATE_COOKIE_NAME)

    // Validate required params
    if (typeof code !== 'string' || code.length === 0) {
      logger.warning('OAuth callback: missing code parameter')
      return c.text('Bad Request: missing code', 400)
    }

    // CSRF: state must be present in both cookie and query, and must match.
    // Compare timing-safely: the state param is attacker-supplied input checked
    // against our opaque token, so avoid the early-exit plain string compare.
    // Length mismatch short-circuits (length is not secret — the token is a
    // fixed-size 32-hex string by construction, see randomBytes(16).toString('hex')).
    const stateMatches =
      typeof stateParam === 'string' &&
      stateParam.length > 0 &&
      typeof stateCookie === 'string' &&
      stateCookie.length > 0 &&
      stateParam.length === stateCookie.length &&
      timingSafeEqual(Buffer.from(stateParam), Buffer.from(stateCookie))

    if (!stateMatches) {
      logger.warning('OAuth callback: state mismatch (CSRF attempt or stale session)')
      return c.text('Forbidden: state mismatch', 403)
    }

    // Clear the state cookie immediately (one-time use)
    deleteCookie(c, STATE_COOKIE_NAME, {path: '/auth'})

    // rm-149 PKCE: mandatory and fail-closed. The verifier cookie must be
    // present with the exact shape /auth/login mints (43 unreserved chars —
    // a public-by-construction shape, so a plain regex is the right check;
    // there is no server-stored secret to compare against: the binding proof
    // is GitHub checking S256(code_verifier) against the challenge bound to
    // the authorization code at the exchange). A well-formed but WRONG
    // (tampered) verifier passes this gate and is rejected BY the exchange —
    // that is the mismatch rejection; it must never degrade into a
    // verifier-less exchange (no downgrade).
    const pkceCookie = getCookie(c, PKCE_COOKIE_NAME)
    if (!isWellFormedPkceVerifier(pkceCookie)) {
      logger.warning('OAuth callback: PKCE verifier missing or malformed')
      return c.text('Forbidden: PKCE verification failed', 403)
    }

    // Clear the PKCE cookie immediately (one-time use, mirrors state)
    deleteCookie(c, PKCE_COOKIE_NAME, {path: '/auth'})

    // Exchange code for access token (with the PKCE code_verifier)
    let accessToken: string
    try {
      const tokens = await oauthClient.validateAuthorizationCode(code, pkceCookie)
      accessToken = tokens.accessToken()
    } catch (error) {
      logger.error('OAuth callback: token exchange failed', {error: sanitizeErrorMessage(error instanceof Error ? error.message : String(error))})
      return c.text('Authentication failed', 401)
    }

    // Fetch GitHub user login
    let login: string
    try {
      login = await fetchUserLogin(accessToken)
    } catch (error) {
      logger.error('OAuth callback: failed to fetch user login', {error: sanitizeErrorMessage(error instanceof Error ? error.message : String(error))})
      return c.text('Authentication failed', 401)
    }

    // Operator allowlist check (exact, case-sensitive)
    if (login !== operatorLogin) {
      logger.warning('OAuth callback: login not in allowlist', {login})
      return c.text('Forbidden: not authorized', 403)
    }

    // Issue session cookie
    //
    // Secure attribution mirrors the /auth/login state cookie exactly (same
    // rm-604 branch-(b) decision-of-record — see the /login comment above):
    // request scheme OR x-forwarded-proto === 'https'. The two sites MUST NOT
    // drift apart: a proxy deployment where the session cookie loses Secure
    // while the state cookie kept it would ship the long-lived credential
    // over the plaintext hop while only protecting the short-TTL one.
    const sessionValue = sessionManager.sign(login)
    setCookie(c, SESSION_COOKIE_NAME, sessionValue, {
      httpOnly: true,
      secure: c.req.url.startsWith('https://') || c.req.header('x-forwarded-proto') === 'https',
      sameSite: 'Lax',
      maxAge: 24 * 60 * 60,
      path: '/',
    })

    logger.info('OAuth callback: session issued', {login})
    return c.redirect('/', 302)
  })

  /**
   * GET /auth/logout-csrf
   * Returns the CSRF token for the logout form POST. Requires a valid session.
   * The SPA fetches this token before submitting the logout form.
   *
   * The token is HMAC-derived (cookieKey + operatorLogin + time window) and
   * expires after at most 2 windows (~2 hours). It is safe to expose to the
   * authenticated operator — an attacker without the session cookie cannot
   * obtain it (the route is behind the auth middleware).
   */
  router.get('/logout-csrf', c => {
    const token = deriveLogoutCsrfToken(cookieKey, operatorLogin)
    // Token-bearing response: never cacheable by browsers or intermediaries
    // (rm-263 — same posture as /api/monitoring).
    c.header('Cache-Control', 'no-store')
    return c.json({csrfToken: token})
  })

  /**
   * POST /auth/logout
   * Validates the CSRF token (derived from cookieKey + operatorLogin), clears the
   * session cookie, and redirects to /auth/login.
   *
   * CSRF design: double-submit pattern using an HMAC-derived token.
   * The dashboard renders the token as a hidden form field; on POST we recompute
   * and compare with timingSafeEqual. This binds logout to the operator's session
   * and blocks cross-site POST (the attacker cannot know the HMAC value).
   *
   * Rejects with 403 on missing or mismatched CSRF token.
   */
  // rm-497: the read itself is bounded — readBodyCapped counts WIRE BYTES
  // incrementally and cancels the stream at the cap, so chunked,
  // length-less, and lying-header requests can never buffer unbounded bytes
  // on this public pre-auth path. One shared bound and code path with the
  // listener ingest route (src/read-body.ts, MAX_REQUEST_BODY_BYTES). Escalates
  // rm-268, whose cap fired only after `await c.req.text()` had buffered the
  // whole stream, and whose `.length` check counted UTF-16 code units, not
  // bytes. The real client (web/src/shell/AppShell.tsx) posts urlencoded
  // `csrf_token`; other encodings are 415, never parsed.
  router.post('/logout', async c => {
    const rawBody = await readBodyCapped(c.req.raw, MAX_REQUEST_BODY_BYTES)
    if (rawBody === null) {
      logger.warning('Logout rejected: body exceeded the shared cap', {maxBytes: MAX_REQUEST_BODY_BYTES})
      return c.text('Payload Too Large', 413)
    }
    const contentType = c.req.header('content-type') ?? ''
    if (!contentType.toLowerCase().includes('application/x-www-form-urlencoded')) {
      return c.text('Unsupported Media Type', 415)
    }
    const submittedToken = new URLSearchParams(rawBody).get('csrf_token')

    if (typeof submittedToken !== 'string' || submittedToken.length === 0) {
      logger.warning('Logout: missing CSRF token')
      return c.text('Forbidden: missing CSRF token', 403)
    }

    // Accept the current OR previous time window so a token rendered just before a
    // window boundary still validates on submit. A leaked token expires within 2 windows.
    const now = Date.now()
    const submittedBuf = Buffer.from(submittedToken, 'utf8')
    const candidates = [
      deriveLogoutCsrfToken(cookieKey, operatorLogin, now),
      deriveLogoutCsrfToken(cookieKey, operatorLogin, now - CSRF_WINDOW_MS),
    ]
    const matched = candidates.some(expected => {
      const expectedBuf = Buffer.from(expected, 'utf8')
      return submittedBuf.length === expectedBuf.length && timingSafeEqual(submittedBuf, expectedBuf)
    })

    if (!matched) {
      logger.warning('Logout: CSRF token mismatch')
      return c.text('Forbidden: invalid CSRF token', 403)
    }

    deleteCookie(c, SESSION_COOKIE_NAME, {path: '/'})
    return c.redirect('/auth/login', 302)
  })

  return router
}
