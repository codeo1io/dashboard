/**
 * Dashboard app factory + server binding.
 *
 * `buildDashboardApp(opts?)` — constructs the Hono app with all middleware and routes.
 * Accepts an optional config object for testability (inject fake OAuth client,
 * cookie key, operator login). When called with no args, reads from env.
 *
 * `createDashboardServer()` — binds the app to `DASHBOARD_HOST:DASHBOARD_PORT`
 * (default `0.0.0.0:3000`) so a sibling reverse-proxy container can reach it.
 *
 * Auth middleware protects every route EXCEPT:
 * - `/api/healthz` (public health check)
 * - `/auth/*` (login/callback/logout)
 */
import type {ServerType} from '@hono/node-server'
import type {GitHubOAuthClient} from './auth/oauth.ts'
import type {OperatorClient, SessionDto} from './gateway/operator-client.ts'
import type {GatewaySessionCache} from './gateway/session-cache.ts'
import type {AggregatorSnapshot, SnapshotStore} from './github/aggregator.ts'
import type {MetadataReader} from './github/metadata.ts'
import type {ListenerStore} from './listener/store.ts'
import {Buffer} from 'node:buffer'
import {createHash} from 'node:crypto'
import {existsSync, readFileSync, statSync} from 'node:fs'
import {readFile} from 'node:fs/promises'
import {join} from 'node:path'
import process from 'node:process'
import {pathToFileURL} from 'node:url'
import {serve} from '@hono/node-server'
import {getConnInfo} from '@hono/node-server/conninfo'
import {serveStatic} from '@hono/node-server/serve-static'
import {Octokit} from '@octokit/core'
import {Hono, type Context} from 'hono'
import {getCookie, setCookie} from 'hono/cookie'
import {secureHeaders} from 'hono/secure-headers'
import {fetchGitHubUserLogin, makeGitHubOAuthClient} from './auth/oauth.ts'
import {createOperatorClient} from './gateway/operator-client.ts'
import {
  readGatewayOperatorOrigin,
  readGatewayOperatorSessionConfig,
  readOperatorUiConfig,
  readPushNotificationsConfig,
} from './gateway/operator-config.ts'
import {readFixtureHarnessConfig} from './gateway/operator-fixture-config.ts'
import {FIXTURE_OPERATOR_PREFIX} from './gateway/operator-fixture-routes.ts'
import {createOperatorServerFetch} from './gateway/operator-server-fetch.ts'
import {createGatewaySessionCache} from './gateway/session-cache.ts'
import {COLD_START_SNAPSHOT, createAggregator} from './github/aggregator.ts'
import {
  createBoundedFetch,
  createDashboardAppClient,
  createInstallationGraphqlQueryFn,
  GITHUB_REQUEST_TIMEOUT_MS,
} from './github/app-client.ts'
import {buildInstallationsClient, enumerateRepos, mintReadOnlyToken} from './github/installations.ts'
import {makeNotFoundError, readRepoMetadata} from './github/metadata.ts'
import {createFileSnapshotStore} from './github/snapshot-store.ts'
import {readListenerDbPath, readListenerIngestKey} from './listener/config.ts'
import {createListenerStore} from './listener/store.ts'
import {logger, sanitizeErrorMessage} from './logger.ts'
import {isOk} from './result.ts'
import {buildApiRouter} from './routes/api.ts'
import {buildAuthRouter} from './routes/auth.ts'
import {buildListenerRouter} from './routes/listener.ts'
import {readOptionalMultilineSecret, readOptionalSecret} from './secrets.ts'
import {loadCookieKey, SessionManager} from './session.ts'
import {installShutdownHandlers} from './shutdown.ts'

/**
 * rm-172: cache TTL for the injected SPA shell served at '/'. The shell is read
 * asynchronously once and cached; a rebuilt web/dist/index.html is picked up
 * within this bound of the next request (or at process restart). Keeps the '/'
 * hot path free of per-request synchronous file I/O.
 */
const SPA_SHELL_CACHE_TTL_MS = 5_000

/** Hono context variables set by auth middleware */
interface Variables {
  /**
   * Set by the Arctic branch only. Optional because the gateway branch does not
   * set this value — it sets gatewaySession instead.
   */
  sessionLogin?: string
  /**
   * Set by the gateway branch only. Contains the validated operator session from
   * the gateway's /operator/session endpoint. Never set by the Arctic branch.
   */
  gatewaySession?: SessionDto
}

/**
 * Rate-limit path classes. Independent per-class budgets so a flood on one
 * class (the public pre-auth surface) cannot starve another (the authenticated
 * operator API or the listener ingest route). See classifyRateLimitPath.
 */
export type RateLimitClass = 'public' | 'operator' | 'ingest'
const RATE_LIMIT_CLASSES = ['public', 'operator', 'ingest'] as const

/** Per-IP rate limiter state: one shared window, per-class counters. */
interface RateLimitEntry {
  windowStart: number
  counts: Record<RateLimitClass, number>
}

/**
 * RFC 9116 security contact document served at /.well-known/security.txt.
 *
 * Contact policy (rm-699, verified live 2026-10-07): the sole Contact is the
 * fork's GitHub advisory form — private vulnerability reporting is now
 * ENABLED on codeo1io/dashboard (private-vulnerability-reporting →
 * enabled:true, probed 2026-10-07), and has_issues stays false by deliberate
 * fork stance (rm-258). The 2026-09-24 fallback Contact pointing at the
 * upstream repo's public issue tracker ("the one channel verified working"
 * while the fork's advisory surface was dark) is retired: its premise
 * expired when the advisory channel went live, and it routed reporters to a
 * public tracker on a repo that cannot act on the fork's disclosures —
 * under-privatizing and misrouting them. Do not re-add a public-tracker
 * Contact without a fresh live probe showing the advisory channel dead.
 * Expires is a hard requirement of RFC 9116 and must stay under a year out;
 * refresh it on the maintenance cadence (rm-245 in ROADMAP.md owns it).
 */
const SECURITY_TXT = `Contact: https://github.com/codeo1io/dashboard/security/advisories/new
Expires: 2026-12-24T00:00:00.000Z
Preferred-Languages: en
`

/** Simple fixed-window in-memory rate limiter */
const rateLimitMap = new Map<string, RateLimitEntry>()
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const RATE_LIMIT_MAX = 60 // requests per window per IP (per-class default)

const envIntOrDefault = (name: string, fallback: number): number => {
  const raw = process.env[name]
  if (raw === undefined) return fallback
  const trimmed = raw.trim()
  if (trimmed === '' || !/^\d+$/.test(trimmed)) return fallback
  const parsed = Number.parseInt(trimmed, 10)
  return parsed > 0 ? parsed : fallback
}

/**
 * Per-class maxima. Each defaults to RATE_LIMIT_MAX; override via env when one
 * class needs a different budget (e.g. a chatty health prober).
 */
const RATE_LIMIT_MAX_PER_CLASS: Record<RateLimitClass, number> = {
  public: envIntOrDefault('RATE_LIMIT_MAX_PUBLIC', RATE_LIMIT_MAX),
  operator: envIntOrDefault('RATE_LIMIT_MAX_OPERATOR', RATE_LIMIT_MAX),
  ingest: envIntOrDefault('RATE_LIMIT_MAX_INGEST', RATE_LIMIT_MAX),
}

/**
 * Hard cap on distinct keys (unique client addresses) in the in-memory
 * rate-limit store — a resource-exhaustion guard for the per-path-class
 * keying surface: a sustained flood of unique addresses (spoofable first
 * XFF hop when the proxy is trusted) would otherwise grow `rateLimitMap`
 * without bound. At capacity the store first sweeps stale windows; if it is
 * still full, admission fails CLOSED — a new key gets a 429 — trading a
 * moment of availability for a bounded memory footprint (rm-286).
 */
const RATE_LIMIT_MAX_KEYS = envIntOrDefault('RATE_LIMIT_MAX_KEYS', 10_000)

/**
 * Default for the trusted-proxy opt-in: RATE_LIMIT_TRUSTED_PROXY in
 * {1,true,yes} (case-insensitive). Off unless explicitly enabled.
 */
const defaultRateLimitTrustedProxy = (): boolean =>
  ['1', 'true', 'yes'].includes((process.env.RATE_LIMIT_TRUSTED_PROXY ?? '').trim().toLowerCase())

/**
 * Classify a sensitive path into its rate-limit budget class.
 * Related to — but deliberately NOT identical to — the isPublicPath auth
 * allowlist defined in the middleware below; the two knowledge sets diverge
 * on purpose (rm-129 divergence note):
 * - '/' is rate-limit public (the SPA shell and its client-side auth redirect
 *   must never be throttled away) yet is NOT in isPublicPath — the shell
 *   itself passes through session auth like every other protected route.
 * - '/auth/*' matches by prefix here; isPublicPath lists the exact auth
 *   endpoints (/auth/login, /auth/callback, /auth/logout).
 * - isPublicPath's public static assets (/assets/*, /static/*, /privacy, …)
 * fall through to the operator class in this PURE function, but that
 * classification is latent: the limiter middleware only consults this
 * classifier on the sensitive surface (sensitiveRoutes + /api/* +
 * /operator/* — see isSensitive below), so static asset paths are never
 * rate-limited at this layer and consume no class budget. That is
 * deliberate (rm-262): bulk-asset abuse control belongs to the edge proxy
 * (Caddy) in front of this app, and pinning the unthrottled behavior keeps
 * the middleware honest — rate-limit-class.test.ts 'rm-262' fails this
 * contract if the gate ever starts classifying static paths.
 * (rider 2026-09-29, ex rm-263 of the convergent run-995ad0e1 batch,
 * superseded as rm-269 at integrate case 709f024e: the divergence from
 * README's three-class table is recorded, not accidental — pinned twice
 * more by test/rate-limit-class.test.ts 'rm-269' at the classifier level
 * and test/auth.test.ts 'rm-269' at the middleware level.)
 * (rider 2026-09-29, integrate case 33e48330: that divergence is now
 * resolved in the doc, not only pinned — rm-275 trued README's
 * RATE_LIMIT_MAX_PUBLIC row to name this exact sensitive-path gate, so
 * README, this docstring, and the two 'rm-269' pins now agree.)
 * - ingest: the machine-write listener route (HMAC-gated by the route itself).
 */
export function classifyRateLimitPath(path: string): RateLimitClass {
  if (path === '/api/listener/ingest') return 'ingest'
  if (path === '/' || path === '/api/healthz' || path.startsWith('/auth/')) return 'public'
  return 'operator'
}

/**
 * Eviction sweep counter. Every EVICT_INTERVAL calls we sweep the map for
 * entries older than 2× the window. This is cheap, non-blocking, and avoids
 * unbounded memory growth without a module-level setInterval.
 */
let rateLimitCallCount = 0
const EVICT_INTERVAL = 500 // sweep every 500 calls
const EVICT_STALE_AGE = 2 * RATE_LIMIT_WINDOW_MS

/**
 * Reset the rate limiter state. Tests only — prevents bleed between test cases.
 * @internal
 */
export function resetRateLimitForTesting(): void {
  rateLimitMap.clear()
  rateLimitCallCount = 0
}

// Gateway operator-session mode: unauthenticated/invalid requests must recover through
// the GATEWAY operator login (which mints the __Host-session the gateway requires),
// never the dashboard's Arctic flow (which mints a `session` cookie the gateway
// rejects, causing a re-auth loop on gateway restart — see issue #70).
//
// INVARIANT: return_to MUST be /operator — Gateway validates return_to against an
// exact allowlist and rejects any other value. Do NOT derive from the request.
// After gateway returns to /operator, the dashboard redirects to / server-side
// (see app.get('/operator', c => c.redirect('/', 302)) below), so the user lands
// on / as intended. return_to=/ is NOT on the Gateway allowlist.
const GATEWAY_LOGIN_REDIRECT = '/operator/auth/github/start?return_to=/operator'

/**
 * rm-165: optional operator-session login allowlist for the gateway-session
 * auth branch. The single configured gateway origin is fully trusted, but the
 * accounts that can hold a gateway session may need to be restricted to a
 * subset (e.g. only dashboard operators). Set GATEWAY_ALLOWED_OPERATOR_LOGINS
 * to a comma-separated login list; a session whose login is not in the list
 * is denied (403, fail closed) AFTER validation.
 *
 * Returns null when unset/blank — no restriction (single-trusted-gateway
 * behavior preserved). DASHBOARD_OPERATOR_LOGIN is NEVER consulted on this
 * branch: the gateway session IS the identity source here.
 */
function parseGatewayAllowedOperatorLogins(): ReadonlySet<string> | null {
  const raw = process.env.GATEWAY_ALLOWED_OPERATOR_LOGINS
  if (raw === undefined) return null
  const entries = raw
    .split(',')
    .map(entry => entry.trim())
    .filter(entry => entry !== '')
  if (entries.length === 0) return null
  return new Set(entries)
}

function sweepRateLimitMap(now: number): void {
  for (const [key, entry] of rateLimitMap) {
    if (now - entry.windowStart > EVICT_STALE_AGE) {
      rateLimitMap.delete(key)
    }
  }
}

/**
 * Store size accessor — test/observability only (no production callers).
 */
export function rateLimitStoreSize(): number {
  return rateLimitMap.size
}

/**
 * Admission control for a NEW store key (rm-286). Below capacity: admit. At
 * capacity: sweep stale windows once; if the store is STILL full, fail closed
 * (log + deny). Existing keys are never evicted by this path — only stale
 * windows are, so a hot key keeps its budget regardless of churn.
 */
function admitRateLimitKey(now: number): boolean {
  if (rateLimitMap.size < RATE_LIMIT_MAX_KEYS) return true
  sweepRateLimitMap(now)
  if (rateLimitMap.size < RATE_LIMIT_MAX_KEYS) return true
  logger.warning('Rate limit store at key capacity — failing closed', {
    keys: rateLimitMap.size,
    cap: RATE_LIMIT_MAX_KEYS,
  })
  return false
}

/**
 * Check rate limit for the given IP.
 * Accepts an optional `now` for testability (defaults to Date.now()).
 * Returns true if the request is allowed, false if rate-limited.
 */
export function checkRateLimit(ip: string, now: number = Date.now(), pathClass?: RateLimitClass): boolean {
  rateLimitCallCount++
  if (rateLimitCallCount >= EVICT_INTERVAL) {
    rateLimitCallCount = 0
    sweepRateLimitMap(now)
  }

  let entry = rateLimitMap.get(ip)

  // rm-286 admission control: only a NEW key grows the store, so only the
  // new-key branch is capacity-gated; an expired window reuses the existing
  // slot (store size unchanged).
  if (entry === undefined) {
    if (!admitRateLimitKey(now)) return false
    entry = {windowStart: now, counts: {public: 0, operator: 0, ingest: 0}}
    rateLimitMap.set(ip, entry)
  } else if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry = {windowStart: now, counts: {public: 0, operator: 0, ingest: 0}}
    rateLimitMap.set(ip, entry)
  }
  const current = entry

  if (pathClass === undefined) {
    // Unclassified call: count against EVERY class budget. This preserves the
    // pre-class-split global-bucket semantics (an unclassified request could be
    // any class, so conservatively consume all of them).
    for (const cls of RATE_LIMIT_CLASSES) current.counts[cls]++
    return RATE_LIMIT_CLASSES.every(cls => current.counts[cls] <= RATE_LIMIT_MAX_PER_CLASS[cls])
  }

  current.counts[pathClass]++
  return current.counts[pathClass] <= RATE_LIMIT_MAX_PER_CLASS[pathClass]
}

/**
 * Injectable config for `buildDashboardApp`.
 * All fields optional — production reads from env; tests inject fakes.
 */
export interface DashboardAppConfig {
  /**
   * Exact GitHub login allowed to authenticate.
   * If undefined, reads from `DASHBOARD_OPERATOR_LOGIN` env.
   * If whitespace-only → throws (fail-closed).
   */
  operatorLogin?: string | undefined
  /**
   * Cookie signing key (≥32 bytes).
   * Required when `operatorLogin` is set (auth active). Throws at construction if absent.
   * When `operatorLogin` is unset (deny-all mode), no SessionManager is constructed
   * and this field is ignored.
   * Production: use `createDashboardServer()` which calls `loadCookieKey()`.
   */
  cookieKey?: Buffer | undefined
  /**
   * GitHub OAuth client. If undefined, constructs from env vars.
   */
  oauthClient?: GitHubOAuthClient | undefined
  /**
   * Fetches the GitHub login for an access token.
   * If undefined, uses the real GitHub API.
   */
  fetchUserLogin?: ((accessToken: string) => Promise<string>) | undefined
  /**
   * Key the rate limiter on the first X-Forwarded-For hop instead of the
   * direct remote address. Off by default — XFF is client-spoofable; enable
   * only when the app sits behind a proxy that OVERWRITES XFF. Production
   * default reads RATE_LIMIT_TRUSTED_PROXY.
   */
  rateLimitTrustedProxy?: boolean | undefined
  /**
   * Aggregator snapshot provider. Both the SPA monitoring view and /api/status
   * read from this same provider so they always serve the same data.
   *
   * If undefined, defaults to a provider returning an empty snapshot
   * {repos:[], staleBanner:false, driftCount:0, refreshedAt:null}.
   * The real aggregator is wired here in production via createDashboardServer.
   * Tests inject a fake snapshot provider.
   */
  getSnapshot?: (() => AggregatorSnapshot) | undefined
  /**
   * Whether to mount the operator UI skeleton at /operator.
   * If undefined, reads from DASHBOARD_OPERATOR_UI_ENABLED env (default: false).
   * When false, /operator is not mounted — zero operator objects are constructed.
   */
  operatorUiEnabled?: boolean | undefined
  /**
   * Whether to use the gateway operator session for auth instead of Arctic.
   * If undefined, reads from DASHBOARD_GATEWAY_OPERATOR_SESSION_ENABLED env (default: false).
   * Independent of operatorUiEnabled.
   */
  gatewayOperatorSessionEnabled?: boolean | undefined
  /**
   * Explicit acknowledgement that a same-origin reverse proxy maps /operator/*
   * to the gateway (rm-127 topology guard). If undefined, reads from the
   * DASHBOARD_GATEWAY_PROXY_ACK env: gateway operator-session mode REFUSES to
   * start unless it is exactly 'same-origin'.
   *
   * Rationale: GATEWAY_LOGIN_REDIRECT is a RELATIVE path and this server
   * registers no /operator/auth/* handlers — the login redirect only
   * terminates on the gateway when the proxy fronts both. A standalone
   * deployment mis-set into gateway mode would otherwise browser-loop with
   * zero server-side diagnostics. Fail fast at startup instead (throw), and
   * additionally break the loop at request time (see the /operator/auth/*
   * misroute guard in the gateway middleware branch).
   */
  gatewayProxyAcknowledged?: boolean | undefined
  /**
   * Whether the operator push-notifications consent surface is enabled.
   * If undefined, reads from DASHBOARD_OPERATOR_PUSH_ENABLED env (default: false).
   * When true, a `<meta name="push-enabled" content="true">` tag is injected
   * into the `/` HTML response so the SPA can render the consent surface.
   * The dashboard NEVER mounts /operator/push/* routes regardless of this flag —
   * those are reverse-proxied to the Gateway (see the no-dashboard-proxy invariant).
   */
  pushNotificationsEnabled?: boolean | undefined
  /**
   * Injectable OperatorClient for the gateway auth branch.
   * If undefined, a real client is built per-request from the server-side fetch adapter.
   * Never constructed when gatewayOperatorSessionEnabled is false.
   */
  operatorClient?: OperatorClient | undefined
  /**
   * Trusted gateway operator origin for the /operator/session endpoint.
   * If undefined, reads from DASHBOARD_GATEWAY_OPERATOR_ORIGIN env (default:
   * 'https://dashboard.fro.bot'). Must be an absolute http(s) origin.
   * On invalid/parse-failure the middleware fails closed (denies all requests).
   *
   * SECURITY: this must NEVER be derived from the inbound request Host header.
   * The Host header is attacker-influenceable; a spoofed Host could redirect the
   * forwarded cookie to an attacker-controlled server. This field is the seam
   * that lets tests set a known-good origin without touching env.
   */
  gatewayOperatorOrigin?: string | undefined
  /**
   * Injectable fetch implementation for the production gateway client path.
   * Only used when operatorClient is undefined. Ignored when operatorClient is injected.
   */
  gatewayFetchImpl?: ((url: string, init?: RequestInit) => Promise<Response>) | undefined
  /**
   * Injectable positive-result cache for gateway session validation (rm-419).
   * If undefined, a per-app cache with the documented 15s TTL is constructed.
   * Only positive verdicts are cached; failures are never cached (fail closed
   * stays per-request). Tests inject a cache to pin TTL/expiry behavior.
   */
  gatewaySessionCache?: GatewaySessionCache | undefined
  /**
   * DEV-ONLY auto-login bypass. Skips OAuth and mints a real signed session for
   * the configured operatorLogin (Arctic branch only).
   *
   * SECURITY INVARIANTS (load-bearing):
   * - THROWS at startup if NODE_ENV === 'production' (fail loud, never silent).
   * - ENV-driven path (DASHBOARD_DEV_AUTOLOGIN) ALSO throws if DASHBOARD_HOST is
   *   not a loopback address (127.0.0.1/localhost/::1). Default host 0.0.0.0 fails.
   * - NEVER mints a session when operatorLogin is undefined.
   * - Only active in the Arctic branch (not gateway-session mode).
   *
   * If undefined, reads from DASHBOARD_DEV_AUTOLOGIN env. Default: OFF.
   */
  devAutoLogin?: boolean | undefined
  /**
   * DEV-ONLY fixture harness. Mounts synthetic operator routes under
   * /__fixture/operator/* for local development without a live Gateway.
   *
   * SECURITY INVARIANTS (load-bearing):
   * - THROWS at startup if NODE_ENV === 'production' (fail loud, never silent).
   * - THROWS if fixtureBindHost is not a loopback address (127.0.0.1/localhost/::1).
   *   Default host 0.0.0.0 fails — fixture mode must never be reachable on a
   *   network-accessible address.
   * - Fixture routes are public-before-auth ONLY when this flag is active.
   * - Independent of devAutoLogin, operatorUiEnabled, and gatewayOperatorSessionEnabled.
   *
   * If undefined, reads from DASHBOARD_FIXTURE_HARNESS_ENABLED env. Default: OFF.
   */
  fixtureHarnessEnabled?: boolean | undefined
  /**
   * The bind host to validate for fixture harness safety.
   * Only used when fixtureHarnessEnabled is true (or env-driven path).
   * Must be a loopback address (127.0.0.1, localhost, ::1) for fixture mode to engage.
   * If undefined (injected path), reads from DASHBOARD_HOST env.
   */
  fixtureBindHost?: string | undefined
  /**
   * Root directory for SPA static assets (index.html, /assets/*, /icon-*,
   * /manifest.webmanifest, /sw.js, /registerSW.js).
   * If undefined, reads from DASHBOARD_WEB_DIST env, defaulting to './web/dist'.
   * Set to './web/dist-fixture' for local fixture verification.
   */
  webDistRoot?: string | undefined
  /**
   * Injectable listener message store. When provided, mounts the operator
   * listener channel router at /api/listener. When undefined, the channel is
   * not mounted at all (no listener routes exist).
   */
  listenerStore?: ListenerStore | undefined
  /**
   * Shared HMAC key for the listener ingest path. When null (or undefined),
   * the /api/listener/ingest sub-route returns 404 (not mounted publicly) —
   * the read/ack routes still work if listenerStore is provided.
   */
  listenerIngestKey?: string | null | undefined
}

/**
 * Constructs the Hono app with all middleware and routes mounted.
 * Separated from port binding so tests can call app.request() without a live server.
 *
 * Throws at construction time if:
 * - `operatorLogin` is whitespace-only or empty (fail-closed)
 * - `operatorLogin` is set but `cookieKey` is undefined (fail-closed — zero key is forgeable)
 * - `cookieKey` is <32 bytes (fail-closed)
 */
async function buildDashboardApp(opts?: DashboardAppConfig): Promise<Hono<{Variables: Variables}>> {
  // Resolve operator login (fail-closed)
  const rawOperatorLogin = opts?.operatorLogin ?? process.env.DASHBOARD_OPERATOR_LOGIN
  if (typeof rawOperatorLogin === 'string' && rawOperatorLogin.trim() === '') {
    throw new Error('DASHBOARD_OPERATOR_LOGIN must not be whitespace-only (fail-closed)')
  }
  const operatorLogin = typeof rawOperatorLogin === 'string' ? rawOperatorLogin.trim() : undefined

  // Resolve cookie key — only construct SessionManager when auth is active.
  // When operatorLogin is set, a real key is MANDATORY (fail-closed).
  // When operatorLogin is unset (deny-all mode), no SessionManager is needed.
  let sessionManager: SessionManager | undefined
  if (operatorLogin !== undefined) {
    if (opts?.cookieKey === undefined) {
      throw new Error(
        'cookie key required when DASHBOARD_OPERATOR_LOGIN is set (pass cookieKey or use createDashboardServer which calls loadCookieKey)',
      )
    }
    // SessionManager constructor validates key length (throws if <32 bytes)
    sessionManager = new SessionManager(opts.cookieKey)
  }

  // Resolve OAuth client
  const oauthClient =
    opts?.oauthClient ??
    makeGitHubOAuthClient(
      process.env.DASHBOARD_OAUTH_CLIENT_ID ?? '',
      process.env.DASHBOARD_OAUTH_CLIENT_SECRET ?? '',
      process.env.DASHBOARD_OAUTH_REDIRECT_URI ?? 'http://localhost:3000/auth/callback',
    )

  const fetchUserLogin = opts?.fetchUserLogin ?? fetchGitHubUserLogin

  // Resolve snapshot provider — default empty; production wires the real aggregator.
  // rm-197: the no-provider default carries the stale banner — an empty payload
  // must never read as "authoritatively verified empty". Single shared
  // constant (review fix F3): the same literal lived in routes/api.ts until
  // this cycle's banner flip had to edit both. The rm-156 watchdog fields
  // (refreshDurationMs/refreshDegraded) ride the shared constant from
  // aggregator.ts.
  const getSnapshot = opts?.getSnapshot ?? (() => COLD_START_SNAPSHOT)

  // Resolve operator UI flag — default OFF (fail-closed).
  const operatorUiEnabled =
    opts?.operatorUiEnabled === undefined ? readOperatorUiConfig().enabled : opts.operatorUiEnabled

  // Resolve gateway operator session flag — default OFF (fail-closed).
  const gatewayOperatorSessionEnabled =
    opts?.gatewayOperatorSessionEnabled === undefined
      ? readGatewayOperatorSessionConfig().enabled
      : opts.gatewayOperatorSessionEnabled

  // Resolve the rm-127 same-origin-proxy acknowledgement (gateway mode only).
  const gatewayProxyAcknowledged =
    opts?.gatewayProxyAcknowledged === undefined
      ? process.env.DASHBOARD_GATEWAY_PROXY_ACK?.trim() === 'same-origin'
      : opts.gatewayProxyAcknowledged
  if (gatewayOperatorSessionEnabled && !gatewayProxyAcknowledged) {
    // Fail fast, never silent (rm-127): without the acknowledgement the
    // gateway login redirect cannot be proven to terminate on the gateway.
    throw new Error(
      'gateway operator-session mode requires an explicit same-origin-proxy acknowledgement: ' +
      'set DASHBOARD_GATEWAY_PROXY_ACK=same-origin (a reverse proxy must map /operator/* on THIS ' +
      'origin to the gateway — see docs/runbooks/gateway-access.md). Without it, unauthenticated ' +
      'requests redirect to /operator/auth/github/start, which this server does not serve, ' +
      'producing an undiagnosable browser redirect loop on a standalone deployment.',
    )
  }

  // Resolve push notifications flag — default OFF (fail-closed). Gates only the
  // consent-surface meta tag; the dashboard never mounts /operator/push/* routes.
  const pushNotificationsEnabled =
    opts?.pushNotificationsEnabled === undefined
      ? readPushNotificationsConfig().enabled
      : opts.pushNotificationsEnabled

  // Resolve devAutoLogin — DEV-ONLY auth bypass. Default OFF (fail-closed).
  //
  // SECURITY: Two independent guards must BOTH pass for the bypass to be effective.
  // If requested but either guard fails, THROW at startup (fail loud, never silent).
  //
  // Guard A — NODE_ENV must be explicitly 'development' or 'test' (applies to both paths).
  // Guard B — DASHBOARD_HOST must be a loopback address (ENV-driven path only).
  //   The injected opts.devAutoLogin path (test seam) bypasses the host check
  //   but still honors Guard A.
  const devAutoLoginRequested: boolean =
    opts?.devAutoLogin === undefined
      ? process.env.DASHBOARD_DEV_AUTOLOGIN?.trim().toLowerCase() === 'true'
      : opts.devAutoLogin

  const isEnvDrivenPath = opts?.devAutoLogin === undefined

  if (devAutoLoginRequested) {
    // Guard A: NODE_ENV must be EXPLICITLY 'development' or 'test' (never unset —
    // an unset NODE_ENV must not silently satisfy a dev-only auth bypass).
    const nodeEnv = process.env.NODE_ENV
    if (nodeEnv !== 'development' && nodeEnv !== 'test') {
      throw new Error(
        'DASHBOARD_DEV_AUTOLOGIN refused: requires NODE_ENV=development|test and DASHBOARD_HOST=127.0.0.1/localhost/::1 (dev-only auth bypass must never run outside an explicit dev/test environment)',
      )
    }

    // Guard B: loopback bind host check (ENV-driven path only)
    if (isEnvDrivenPath) {
      const configuredHost = process.env.DASHBOARD_HOST?.trim()
      if (!isLoopbackBindHost(configuredHost)) {
        throw new Error(
          'DASHBOARD_DEV_AUTOLOGIN refused: requires NODE_ENV=development|test and DASHBOARD_HOST=127.0.0.1/localhost/::1 (dev-only auth bypass must never run outside an explicit dev/test environment)',
        )
      }
    }
  }

  const devAutoLogin = devAutoLoginRequested

  if (devAutoLogin) {
    logger.warning('DEV AUTO-LOGIN ENABLED — auth is bypassed; never use in production')
  }

  // Resolve fixture harness flag — DEV-ONLY fixture route mount. Default OFF (fail-closed).
  //
  // SECURITY: Two independent guards must BOTH pass for fixture routes to be mounted.
  // If requested but either guard fails, THROW at startup (fail loud, never silent).
  //
  // Guard A — NODE_ENV must NOT be 'production' (applies to both paths).
  // Guard B — bind host must be a loopback address (both injected and ENV-driven paths).
  const fixtureHarnessRequested: boolean =
    opts?.fixtureHarnessEnabled === undefined
      ? readFixtureHarnessConfig().enabled
      : opts.fixtureHarnessEnabled

  let fixtureHarnessActive = false

  if (fixtureHarnessRequested) {
    // Guard A: NODE_ENV must be explicitly 'development' or 'test' (fail closed).
    // Rejecting anything other than these two known-safe values prevents accidental
    // fixture exposure in staging, CI, or any other non-dev environment.
    const nodeEnv = process.env.NODE_ENV
    if (nodeEnv !== 'development' && nodeEnv !== 'test') {
      throw new Error(
        'DASHBOARD_FIXTURE_HARNESS_ENABLED refused: requires NODE_ENV=development or NODE_ENV=test and a loopback bind host (fixture harness must never run in production or unknown environments)',
      )
    }

    // Guard B: loopback bind host check (both injected and ENV-driven paths)
    const configuredHost =
      opts?.fixtureBindHost === undefined
        ? process.env.DASHBOARD_HOST?.trim()
        : opts.fixtureBindHost.trim()

    const isLoopback = isLoopbackBindHost(configuredHost)
    if (!isLoopback) {
      throw new Error(
        'DASHBOARD_FIXTURE_HARNESS_ENABLED refused: requires a loopback bind host (127.0.0.1, localhost, or ::1). ' +
        'Set DASHBOARD_HOST=127.0.0.1 to enable fixture mode on a loopback address.',
      )
    }

    fixtureHarnessActive = true
    logger.warning('FIXTURE HARNESS ENABLED — synthetic operator routes mounted; never use in production')
  }

  // Resolve SPA static asset root — defaults to ./web/dist; override via DASHBOARD_WEB_DIST or opts.
  const webDistRoot = opts?.webDistRoot ?? process.env.DASHBOARD_WEB_DIST?.trim() ?? './web/dist'

  // Guard: dist-fixture must never be served in production. Fail loudly at construction.
  // dist-fixture contains fixture-mode JS that bypasses real auth flows.
  if (webDistRoot.includes('dist-fixture') && process.env.NODE_ENV === 'production') {
    throw new Error(
      'DASHBOARD_WEB_DIST=./web/dist-fixture is not allowed in production (dist-fixture is a dev-only build artifact)',
    )
  }

  // Resolve the trusted gateway operator origin — SECURITY CRITICAL.
  // Must be a configured, trusted value; never derived from the inbound request Host.
  // null means the configured value is invalid → fail closed at middleware time.
  let resolvedGatewayOrigin: string | null = null
  if (gatewayOperatorSessionEnabled) {
    if (opts?.gatewayOperatorOrigin === undefined) {
      resolvedGatewayOrigin = readGatewayOperatorOrigin()
    } else {
      try {
        const parsed = new URL(opts.gatewayOperatorOrigin)
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          resolvedGatewayOrigin = parsed.origin
          // else: invalid scheme → stays null → fail closed
        }
      } catch {
        // Invalid URL → stays null → fail closed
      }
    }
  }

  const app = new Hono<{Variables: Variables}>()

  // ── Global error handler (redaction chokepoint) ─────────────────────────────
  // Hono's default onError does `console.error(err)` — a RAW, unredacted Error
  // object (message + stack + any custom properties) straight to the log sink,
  // bypassing logger.ts's single redacting chokepoint. Any handler that throws
  // outside a local try/catch would fall through to that raw path. Route it
  // through logger.error + sanitizeErrorMessage instead so every log line goes
  // through the same redaction regardless of where the throw originated. The
  // HTTP response stays generic (matches Hono's own default body/status) — this
  // only changes where the error text is logged, not what a client can see.
  // Ported from upstream PR #481 (876a02a, 2026-09-19).
  app.onError((error, c) => {
    logger.error('Unhandled request error', {
      error: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)),
    })
    return c.text('Internal Server Error', 500)
  })

  // ── PWA service worker CSP bypass (registered BEFORE secureHeaders) ──────────
  // Must be registered before secureHeaders (which runs post-next()) so this
  // middleware wraps it and can delete the CSP after secureHeaders sets it.
  // Workers do not inherit the page CSP; a too-restrictive CSP can block Workbox.
  app.use('/sw.js', async (c, next) => {
    await next()
    c.res.headers.delete('content-security-policy')
    // No-cache so the browser re-fetches on every load and detects SW updates.
    c.res.headers.set('cache-control', 'no-cache, no-store, must-revalidate')
  })

  // ── Security headers + CSP (applied to all responses) ──────────────────────
  // style-src allows 'unsafe-inline' because SSR pages use inline style attributes.
  // script-src stays strict ('self', no inline) — inline script is the XSS vector.
  app.use(
    '*',
    secureHeaders({
      // rm-613: HSTS max-age ramped 180d → 1y (OWASP/MDN posture; this domain has
      // served HSTS continuously since this middleware landed, so the ramp-up
      // rationale has expired). Preload is DELIBERATELY DECLINED: this repo serves
      // behind a reverse proxy and preload submission is a deployment-owner
      // decision — do not add the `preload` token here.
      strictTransportSecurity: 'max-age=31536000; includeSubDomains',
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        workerSrc: ["'self'"],
        manifestSrc: ["'self'"],
        connectSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
      // rm-557: Permissions-Policy deny-by-default. Hono's secureHeaders skips
      // the header entirely for an empty policy object, and every other baseline
      // header (CSP/HSTS/nosniff/Referrer-Policy/XFO/COOP/CORP/OAC) was already
      // emitted — this closed the last gap in the MDN/OWASP baseline set.
      // Deny list (each directive serializes to `()` — disabled everywhere):
      //   accelerometer, camera, display-capture, geolocation, gyroscope,
      //   magnetometer, microphone, payment, usb
      // Verified safe for this client: grep over web/src + public + web/*.ts for
      // every denied feature (getUserMedia/geolocation/clipboard/share/bluetooth/
      // usb/vibrate/payment/EME/wake-lock/gamepad) is zero-hit; the PWA's Web
      // Notifications usage is NOT policy-controlled and is unaffected.
      permissionsPolicy: {
        accelerometer: [],
        camera: [],
        displayCapture: [],
        geolocation: [],
        gyroscope: [],
        magnetometer: [],
        microphone: [],
        payment: [],
        usb: [],
      },
    }),
  )

  // ── Rate limiting middleware (defense-in-depth; real limiting belongs at Caddy) ──
  // Keyed on the direct connection remote address. X-Forwarded-For is client-
  // spoofable and is IGNORED unless rateLimitTrustedProxy is explicitly enabled —
  // enable that only when the app sits behind a proxy that OVERWRITES XFF.
  // Budgets are per path class (public / operator / ingest — see
  // classifyRateLimitPath) so a flood on one class cannot starve the others.
  // Static/asset paths (/assets/*, /static/*, /privacy, /registerSW.js, …)
  // sit OUTSIDE isSensitive by design: they never reach this limiter and
  // consume no class budget (rm-262) — asset flooding is the edge proxy's
  // problem, not this middleware's.
  const rateLimitTrustedProxy = opts?.rateLimitTrustedProxy ?? defaultRateLimitTrustedProxy()
  app.use('*', async (c: Context, next) => {
    const path = new URL(c.req.url).pathname
    // rm-500 (2026-09-30): the logout pair joins the sensitive set — POST
    // /auth/logout runs a (bounded) body read and GET /auth/logout-csrf
    // mints an HMAC token, both on pre-auth public paths, so leaving them
    // budget-free handed an unauthenticated client an unthrottled CPU/log
    // vector (recorded decision, superseding rm-275's outside-the-limiter
    // narration). They classify into the PUBLIC budget via
    // classifyRateLimitPath's /auth/ branch, which this gate now makes
    // reachable; README's RATE_LIMIT_MAX_PUBLIC row cross-references this.
    const sensitiveRoutes = ['/', '/auth/login', '/auth/callback', '/operator', '/auth/logout', '/auth/logout-csrf']
    const isSensitive = sensitiveRoutes.includes(path) || path.startsWith('/api/') || path.startsWith('/operator/')

    if (isSensitive) {
      // getConnInfo throws in test context (app.request()); fall back to 'unknown'.
      let ip: string
      try {
        ip = getConnInfo(c).remote.address ?? 'unknown'
      } catch {
        ip = 'unknown'
      }
      if (rateLimitTrustedProxy) {
        // Trusted-proxy mode: key on the FIRST X-Forwarded-For hop. That hop
        // is the real client ONLY when the proxy OVERWRITES XFF (see the
        // opts comment above: enable only for an overwriting proxy). A proxy
        // that APPENDS puts the real client LAST — first-hop keying there
        // would let callers pick their own throttle keys.
        const firstHop = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
        // Cap the key: a plain IP/host is ≤45 chars, so anything longer is
        // not an address, and an unbounded token alphabet would grow
        // rateLimitMap without bound inside the sweep window. A
        // deterministic prefix cap keeps each spoofed token on ONE key.
        if (firstHop !== undefined && firstHop !== '') ip = firstHop.slice(0, 64)
      }

      if (!checkRateLimit(ip, Date.now(), classifyRateLimitPath(path))) {
        logger.warning('Rate limit exceeded', {ip, path})
        return c.text('Too Many Requests', 429)
      }
    }

    return next()
  })

  // ── Auth middleware (deny-by-default, fail-closed) ──────────────────────────
  // Public routes: /api/healthz, /auth/*, SPA static assets (see isPublicPath).
  // Every other route requires a valid operator session.
  // When operatorLogin is unset, the app fails closed: every protected route is
  // denied (401) and no session can ever be issued.
  //
  // Strategy branch: the flag selects exactly ONE branch. The two branches never
  // union and never fall back to each other. Each branch runs its OWN isPublicPath
  // check — a path added to one mode's allowlist cannot silently bypass the other.
  const isPublicPath = (path: string): boolean =>
    path === '/api/healthz' ||
    path === '/auth/login' ||
    path === '/auth/callback' ||
    path === '/auth/logout' ||
    // SPA static assets — public pre-auth so the PWA shell loads before the auth
    // redirect. JS/CSS/manifest/icons carry no sensitive data.
    path.startsWith('/assets/') ||
    path === '/manifest.webmanifest' ||
    path.startsWith('/icon-') ||
    path === '/sw.js' ||
    path === '/registerSW.js' ||
    // Public privacy policy — a compliance document, unconditional in every
    // deployment posture (not gated behind operatorUiEnabled, the fixture
    // harness, or the push flag). Exact match only (plus the trailing-slash
    // variant) — no startsWith/prefix match, so a future /privacy-* path
    // does not silently become public.
    path === '/privacy' ||
    path === '/privacy/' ||
    // RFC 9116 security contact — public in every deployment posture, like
    // /privacy above. Exact match only (plus the trailing-slash variant) so no
    // /.well-known/* sibling silently inherits public access.
    path === '/.well-known/security.txt' ||
    path === '/.well-known/security.txt/' ||
    // Listener machine-write path — public-before-session; HMAC-gated by the
    // route itself (see routes/listener.ts). The read/ack paths
    // (/api/listener/messages*, /api/listener/ack-all) are intentionally NOT
    // listed here and stay behind the session auth in both branches.
    path === '/api/listener/ingest' ||
    // Operator runtime JS modules — always public because root / owns the operator
    // shell and always depends on these assets, regardless of operatorUiEnabled.
    path === '/static/operator-stream.js' ||
    path === '/static/operator-launch.js' ||
    path === '/static/operator-run-index.js' ||
    (operatorUiEnabled && path.startsWith('/static/')) ||
    // Fixture harness routes — public ONLY when the full fixture gate is active
    // (non-production + loopback bind + flag enabled). Otherwise not in public list.
    (fixtureHarnessActive && path.startsWith(FIXTURE_OPERATOR_PREFIX))

  // rm-419: per-app positive cache for gateway session validation (15s TTL,
  // cookie-keyed; failures never cached). Injectable via opts for tests.
  const gatewaySessionCache = opts?.gatewaySessionCache ?? createGatewaySessionCache()

  app.use('*', async (c: Context, next) => {
    const path = new URL(c.req.url).pathname

    if (gatewayOperatorSessionEnabled) {
      // ── GATEWAY BRANCH ────────────────────────────────────────────────────
      // rm-127 misroute guard: /operator/auth/* reaching THIS server means the
      // same-origin proxy did not intercept it. Redirecting would send the
      // browser right back here — the classic silent loop. Refuse with a
      // diagnosable 502 instead. In the correct topology this arm is
      // unreachable (the proxy owns /operator/*).
      if (path.startsWith('/operator/auth/')) {
        logger.error(
          'gateway-auth: /operator/auth/* reached the dashboard itself — same-origin proxy is not mapping /operator/* to the gateway (rm-127 misroute); refusing to redirect',
          {path},
        )
        return c.text(
          'dashboard misconfigured: /operator/auth/* reached the dashboard, but gateway login paths must be reverse-proxied to the gateway (DASHBOARD_GATEWAY_PROXY_ACK topology). See docs/runbooks/gateway-access.md',
          502,
        )
      }

      if (isPublicPath(path)) {
        return next()
      }

      // Require an inbound cookie to forward as the end-user principal.
      const inboundCookie = c.req.header('cookie')
      if (inboundCookie === undefined || inboundCookie.trim() === '') {
        return c.redirect(GATEWAY_LOGIN_REDIRECT, 302)
      }

      // Fail closed if the configured gateway origin is invalid or unparseable.
      if (resolvedGatewayOrigin === null) {
        logger.warning('gateway-auth: configured gateway origin is invalid or missing', {path})
        return c.redirect(GATEWAY_LOGIN_REDIRECT, 302)
      }

      // rm-419: consult the positive cache first. A still-fresh entry for this
      // exact cookie header (age < TTL AND session.expiresAt in the future)
      // vouches for the session without the upstream roundtrip. Failures are
      // never cached, so this branch only ever short-circuits KNOWN-good
      // sessions; the revocation bound is the documented 15s TTL.
      const cachedSession = gatewaySessionCache.get(inboundCookie)
      if (cachedSession !== undefined) {
        // rm-165: the allowlist is a local check (env read + Set lookup, no
        // upstream roundtrip), so it still runs on cache hits — an operator
        // dropped from the allowlist is denied immediately, not after the TTL.
        const cachedAllowlist = parseGatewayAllowedOperatorLogins()
        if (cachedAllowlist !== null && !cachedAllowlist.has(cachedSession.login)) {
          logger.warning('gateway-auth: session login is not in the gateway operator allowlist; denying', {
            path,
            login: cachedSession.login,
          })
          return c.text('Forbidden', 403)
        }
        c.set('gatewaySession', cachedSession)
        return next()
      }

      // Build the OperatorClient: use injected client (tests) or build per-request (production).
      // SECURITY: origin is always resolvedGatewayOrigin (configured), never from the request Host.
      let client: OperatorClient
      if (opts?.operatorClient === undefined) {
        const serverFetch = createOperatorServerFetch({
          origin: resolvedGatewayOrigin,
          cookie: inboundCookie,
          fetchImpl: opts?.gatewayFetchImpl,
        })
        // No-op SSE stub — getCurrentSession does not use SSE; throws if called.
        const noopEventStream = (_streamPath: string) => ({
          start: () => {
            throw new Error('SSE transport not available in server-side auth middleware')
          },
          close: () => undefined,
        })
        client = createOperatorClient({
          fetch: serverFetch,
          createEventStream: noopEventStream,
          logger,
        })
      } else {
        client = opts.operatorClient
      }

      // Call the gateway session endpoint. Fail closed on every non-success path.
      // Log only the path — never the cookie value or error detail (may contain identity info).
      const result = await client.getCurrentSession()
      if (!isOk(result)) {
        logger.warning('gateway-auth: session validation failed', {path})
        return c.redirect(GATEWAY_LOGIN_REDIRECT, 302)
      }

      // Expired-session defense — even on a 2xx, a non-future expiresAt → deny.
      if (result.data.expiresAt <= Date.now()) {
        logger.warning('gateway-auth: session expired', {path})
        return c.redirect(GATEWAY_LOGIN_REDIRECT, 302)
      }

      // Nonsensical identity defense — non-positive operatorId or blank login → deny.
      if (result.data.operatorId <= 0) {
        logger.warning('gateway-auth: session has non-positive operatorId', {path})
        return c.redirect(GATEWAY_LOGIN_REDIRECT, 302)
      }
      if (result.data.login.trim() === '') {
        logger.warning('gateway-auth: session has empty login', {path})
        return c.redirect(GATEWAY_LOGIN_REDIRECT, 302)
      }

      // rm-165: optional allowlist — deny validated gateway sessions whose
      // login is not an allowed operator (403, fail closed). Skipped entirely
      // when GATEWAY_ALLOWED_OPERATOR_LOGINS is unset/blank.
      const gatewayAllowlist = parseGatewayAllowedOperatorLogins()
      if (gatewayAllowlist !== null && !gatewayAllowlist.has(result.data.login)) {
        logger.warning('gateway-auth: session login is not in the gateway operator allowlist; denying', {
          path,
          login: result.data.login,
        })
        return c.text('Forbidden', 403)
      }

      // Valid gateway session: attach to context and remember it for the TTL.
      // Set runs after ALL defenses (identity, expiry, allowlist) so only
      // fully approved sessions are ever cached.
      gatewaySessionCache.set(inboundCookie, result.data)
      c.set('gatewaySession', result.data)
      return next()
    } else {
      // ── ARCTIC BRANCH ────────────────────────────────────────────────────
      if (isPublicPath(path)) {
        return next()
      }

      // Fail closed: with no configured operator, no protected route is served.
      if (operatorLogin === undefined) {
        return c.text('Unauthorized', 401)
      }

      const cookieValue = getCookie(c, 'session')
      const sm = sessionManager as SessionManager

      const session =
        typeof cookieValue === 'string' && cookieValue.length > 0 ? sm.verify(cookieValue) : null

      // Reject sessions minted for a different operator login (stale session guard).
      const validSession = session !== null && session.login === operatorLogin ? session : null

      if (validSession === null) {
        if (devAutoLogin) {
          const sessionValue = sm.sign(operatorLogin)
          // secure:false — dev-only path runs over http://localhost; a Secure cookie
          // would be dropped by the browser. Production /auth/callback still sets Secure.
          setCookie(c, 'session', sessionValue, {
            httpOnly: true,
            secure: false,
            sameSite: 'Lax',
            maxAge: 24 * 60 * 60,
            path: '/',
          })
          c.set('sessionLogin', operatorLogin)
          return next()
        }

        return c.redirect('/auth/login', 302)
      }

      c.set('sessionLogin', validSession.login)
      return next()
    }
  })

  if (gatewayOperatorSessionEnabled) {
    // Gateway mode: /auth/login → gateway operator login. Do NOT mount /auth/callback
    // or any Arctic path — the dashboard session-minting flow must not be reachable
    // (a dashboard `session` cookie cannot satisfy the gateway; see issue #70).
    const gatewayAuthRouter = new Hono()
    gatewayAuthRouter.get('/login', c => c.redirect(GATEWAY_LOGIN_REDIRECT, 302))
    app.route('/auth', gatewayAuthRouter)
  } else if (operatorLogin === undefined) {
    // Fail-closed: no operator login → deny all auth routes; no session can be minted.
    const deniedRouter = new Hono()
    deniedRouter.all('*', c => c.text('Unauthorized', 401))
    app.route('/auth', deniedRouter)
  } else {
    const authRouter = buildAuthRouter({
      operatorLogin,
      sessionManager: sessionManager as SessionManager,
      oauthClient,
      fetchUserLogin,
      cookieKey: opts?.cookieKey as Buffer,
    })
    app.route('/auth', authRouter)
  }

  // ── API routes ───────────────────────────────────────────────────────────────
  app.route('/api', buildApiRouter(getSnapshot))

  // ── Operator listener channel ───────────────────────────────────────────────
  // Only mounted when a store is injected. /ingest is public-before-session
  // (isPublicPath above) and HMAC-gated inside the route; /messages*/ack-all
  // stay behind the session auth middleware registered above.
  if (opts?.listenerStore !== undefined) {
    app.route(
      '/api/listener',
      buildListenerRouter({
        store: opts.listenerStore,
        ingestKey: opts.listenerIngestKey ?? null,
        // Ack CSRF is active whenever an operator session is in scope. Derive
        // from the RESOLVED operatorLogin (opts with env fallback — see the
        // resolution above), never raw opts: createDashboardServer and
        // env-configured deployments pass no explicit operatorLogin, but auth
        // is still active via DASHBOARD_OPERATOR_LOGIN, and the session cookie
        // is always minted for the resolved login, so the CSRF HMAC must bind
        // to the same identity. When auth is unconfigured, the middleware
        // already denies every protected route (fail-closed), and the router's
        // null config refuses mutations independently — belt and suspenders.
        ackCsrf:
          operatorLogin !== undefined && sessionManager !== undefined
            ? {cookieKey: opts?.cookieKey as Buffer, operatorLogin}
            : null,
      }),
    )
  }

  // Serve the React SPA at /. index.html requires a session; shell assets are public.
  // When pushNotificationsEnabled, inject a <meta name="push-enabled" content="true">
  // tag so the SPA can render the push consent surface without a separate flag fetch.
  if (pushNotificationsEnabled) {
    // Serve the SPA shell inline (not via serveStatic) so the injected body's
    // length is computed correctly. Post-processing a streamed serveStatic
    // response leaves a stale Content-Length that truncates the injected HTML
    // and drops the <div id="root"> mount target. Reading + injecting + c.html()
    // recomputes the length. Fall through to c.notFound() if the file is missing.
    //
    // rm-172: the shell is READ ASYNCHRONOUSLY ONCE and cached — this handler
    // runs on every authenticated '/' request and must not pay synchronous
    // file I/O each time (a blocking readFileSync on the hot path stalls the
    // event loop under load). Cache flip bound: a rebuilt web/dist/index.html
    // is picked up within SPA_SHELL_CACHE_TTL_MS of the next request (or at
    // process restart) — strictly better than never, which was the previous
    // serveStatic behavior for the injected variant.
    const indexHtmlPath = join(webDistRoot, 'index.html')
    let spaShellCache: {injected: string; at: number} | null = null
    const loadSpaShell = async (): Promise<string | null> => {
      try {
        const html = await readFile(indexHtmlPath, 'utf8')
        return html.includes('<meta name="push-enabled"')
          ? html
          : html.replace('</head>', '<meta name="push-enabled" content="true"></head>')
      } catch {
        return null // missing/unreadable shell — keep the notFound fallback
      }
    }
    app.get('/', async c => {
      // rm-166 (cycle-10, landed as a rider on rm-172): the injected shell is
      // identity-reflecting (the push-enabled flag is operator-gated), so no
      // intermediary may cache it — same no-store posture as /api/monitoring.
      c.header('Cache-Control', 'no-store')
      if (spaShellCache === null || Date.now() - spaShellCache.at >= SPA_SHELL_CACHE_TTL_MS) {
        const injected = await loadSpaShell()
        if (injected === null) return c.notFound()
        spaShellCache = {injected, at: Date.now()}
        return c.html(injected)
      }
      return c.html(spaShellCache.injected)
    })
  } else {
    app.get('/', serveStatic({root: webDistRoot, path: 'index.html'}))
  }

  // ── /operator and /operator/ → / redirect (unconditional, flag-independent) ──
  // / is the canonical operator launch route. Old /operator and /operator/ links
  // redirect here. Both are mounted before the operatorUiEnabled-gated handler so
  // the flag has no effect. /operator/ is handled separately because Hono's
  // app.route('/operator', router) does not strip the trailing slash — router.get('/')
  // inside the sub-router never fires for /operator/.
  app.get('/operator', c => c.redirect('/', 302))
  app.get('/operator/', c => c.redirect('/', 302))

  // ── Operator runtime JS assets — always served (flag-independent) ────────────
  // Root / owns the operator shell and always depends on these modules.
  // Mounted unconditionally so they are available regardless of operatorUiEnabled.
  // isPublicPath already allows these paths so auth middleware passes them through.
  //
  // rm-478: explicit revalidation policy for these three unversioned assets —
  // their URLs are load-bearing import strings in the operator shell (unhashable
  // without a loader change) and the service worker is a self-purging kill-switch,
  // so without an explicit policy there is NO client caching layer at all: every
  // operator launch refetched ~150KB on heuristic caching alone. no-cache + a
  // content-hash ETag (recomputed only when mtime moves) lets browsers revalidate
  // cheaply; a matching If-None-Match short-circuits the transfer with a 304.
  const operatorRuntimeAssetCache = new Map<string, {etag: string; mtimeMs: number}>()
  const operatorRuntimeCaching = async (c: Context, next: () => Promise<void>): Promise<void | Response> => {
    await next()
    if (c.res.status !== 200) return
    let etag: string | undefined
    try {
      const absolutePath = join('./public', c.req.path.replace(/^\/static\//, ''))
      const stats = statSync(absolutePath)
      const cached = operatorRuntimeAssetCache.get(absolutePath)
      if (cached !== undefined && cached.mtimeMs === stats.mtimeMs) {
        etag = cached.etag
      } else {
        etag = `"${createHash('sha256').update(readFileSync(absolutePath)).digest('hex').slice(0, 32)}"`
        operatorRuntimeAssetCache.set(absolutePath, {etag, mtimeMs: stats.mtimeMs})
      }
    } catch {
      return // unreadable file — serveStatic's own not-found path already ran
    }
    c.res.headers.set('Cache-Control', 'no-cache')
    c.res.headers.set('ETag', etag)
    if (c.req.header('If-None-Match') === etag) {
      c.res = new Response(null, {status: 304, headers: c.res.headers})
    }
  }
  app.use(
    '/static/operator-stream.js',
    operatorRuntimeCaching,
    serveStatic({root: './public', rewriteRequestPath: path => path.replace(/^\/static/, '')}),
  )
  app.use(
    '/static/operator-launch.js',
    operatorRuntimeCaching,
    serveStatic({root: './public', rewriteRequestPath: path => path.replace(/^\/static/, '')}),
  )
  app.use(
    '/static/operator-run-index.js',
    operatorRuntimeCaching,
    serveStatic({root: './public', rewriteRequestPath: path => path.replace(/^\/static/, '')}),
  )

  // ── Operator UI skeleton route ────────────────────────────────────────────────
  // Only mounted when operatorUiEnabled is true (default: false).
  // rm-270: the dead compatibility router that used to mount at /operator
  // (src/routes/operator.ts) is deleted — the unconditional redirects at
  // app.get('/operator') and app.get('/operator/') above always won, and
  // every other sub-path 404'd; only the /static/* catch-all below is live.
  if (operatorUiEnabled) {
    // Serves public/ at /static/* — flag-gated alongside the operator UI flag.
    // /static/ is in isPublicPath so unauthenticated browsers can load assets.
    // Note: operator-stream.js and operator-launch.js are already mounted above;
    // this catch-all additionally serves operator.css and any other static assets.
    app.use('/static/*', serveStatic({root: './public', rewriteRequestPath: path => path.replace(/^\/static/, '')}))
  }

  // ── Fixture harness routes (DEV-ONLY) ─────────────────────────────────────
  // Only mounted when fixtureHarnessActive is true (development/test + loopback + flag).
  // isPublicPath already allows FIXTURE_OPERATOR_PREFIX/* when active, so auth
  // middleware passes these requests through before they reach these handlers.
  if (fixtureHarnessActive) {
    const {buildFixtureHarnessRouter} = await import('./routes/operator-fixture-harness.ts')
    app.route(FIXTURE_OPERATOR_PREFIX, buildFixtureHarnessRouter())
  }

  // ── SPA static asset serving ─────────────────────────────────────────────
  // rm-690 (2026-10-07, repository-maintenance cycle:1 run b2a3ae9bf75b):
  // cache policy for the static surfaces. Vite content-hashes everything under
  // /assets/* (index-Dy_WXR3M.js style), so a given URL's bytes can never
  // change — RFC 8246 (HTTP Immutable Responses) and the MDN Cache-Control
  // `immutable` entry make a one-year public lifetime sound; the status guard
  // keeps a missed 404 from being pinned for a year. The unhashed surfaces
  // (/icon-*, manifest.webmanifest) revalidate every load via an explicit
  // no-cache; sw.js and /registerSW.js already carry a stronger no-store
  // family (the pre-secureHeaders CSP-bypass middleware and the wrapper
  // below). Adapter note for the next @hono/node-server bump: 2.1.3's
  // serveStatic sets ONLY Last-Modified and has no ETag /
  // If-Modified-Since handling (no 304s), so these headers are the entire
  // caching story — re-derive.
  app.use('/assets/*', async (c, next) => {
    await next()
    if (c.res.status === 200) {
      c.res.headers.set('cache-control', 'public, max-age=31536000, immutable')
    }
  })
  app.use('/assets/*', serveStatic({root: webDistRoot}))
  app.use('/icon-*', async (c, next) => {
    await next()
    if (c.res.status === 200) {
      c.res.headers.set('cache-control', 'no-cache')
    }
  })
  app.use('/icon-*', serveStatic({root: webDistRoot}))

  // ── PWA manifest ─────────────────────────────────────────────────────────
  // serveStatic serves .webmanifest as application/octet-stream by default.
  // This middleware must be registered BEFORE serveStatic to override Content-Type.
  // application/manifest+json is required for PWA installability.
  // rm-690: the manifest is unhashed, so it revalidates every load (no-cache).
  app.use('/manifest.webmanifest', async (c, next) => {
    await next()
    c.res.headers.set('content-type', 'application/manifest+json; charset=UTF-8')
    c.res.headers.set('cache-control', 'no-cache')
  })
  app.use('/manifest.webmanifest', serveStatic({root: webDistRoot}))

  // ── PWA service worker + registration helper ──────────────────────────────
  // /sw.js and /registerSW.js must be served at root scope so the SW covers the
  // entire origin. CSP is removed from /sw.js by the pre-secureHeaders middleware.
  app.use('/sw.js', serveStatic({root: webDistRoot}))

  app.use('/registerSW.js', async (c, next) => {
    await next()
    c.res.headers.set('cache-control', 'no-cache, no-store, must-revalidate')
  })
  app.use('/registerSW.js', serveStatic({root: webDistRoot}))

  // ── Public privacy policy — unconditional, flag-independent ────────────────
  // Reads no cookie and validates no session (registered outside both auth
  // branches via isPublicPath above), so authenticated and unauthenticated
  // visitors get byte-identical responses. Serves ONLY the clean /privacy
  // path (plus its trailing-slash variant, matching isPublicPath above) —
  // /privacy.html itself is never registered as a route, which is what keeps
  // the service worker's precache exclusion correct (see sw.ts). NOTE: unlike
  // upstream, this fork's service worker is a cacheless SW-off switch that
  // never serves navigations, so no SW denylist exemption is needed here.
  app.get('/privacy', serveStatic({root: webDistRoot, path: 'privacy.html'}))
  app.get('/privacy/', serveStatic({root: webDistRoot, path: 'privacy.html'}))

  // ── RFC 9116 security contact ────────────────────────────────────────────────
  // Served inline (not via serveStatic) so it carries no dependency on the SPA
  // build and stays byte-identical across deployment postures. Public via
  // isPublicPath in both auth branches; Content-Type is text/plain per RFC 9116.
  // Expires: refresh on the maintenance cadence (quarterly) — see rm-245.
  app.get('/.well-known/security.txt', c =>
    c.text(SECURITY_TXT, 200, {'Content-Type': 'text/plain; charset=utf-8'}),
  )
  app.get('/.well-known/security.txt/', c =>
    c.text(SECURITY_TXT, 200, {'Content-Type': 'text/plain; charset=utf-8'}),
  )

  // Warn early if the SPA build artifact is missing (GET / will 404 silently).
  if (!existsSync(`${webDistRoot}/index.html`)) {
    logger.warning(
      `${webDistRoot}/index.html not found — GET / will return 404. Run \`pnpm build:web\` to build the SPA.`,
    )
  }

  return app
}

// ---------------------------------------------------------------------------
// Snapshot provider (testable wiring helper)
// ---------------------------------------------------------------------------

/**
 * Injectable deps for `buildSnapshotProvider` — allows tests to inject fakes
 * for the app client, enumerate fn, metadata reader, and graphql fn without
 * touching the network.
 */
export interface SnapshotProviderDeps {
  readonly appId: string
  readonly privateKey: string
  /** Override the enumerate function (default: real enumerateRepos) */
  readonly enumerateFn?: typeof enumerateRepos
  /** Override the metadata reader (default: real Octokit-backed reader) */
  readonly metadataReader?: MetadataReader
  /**
   * Override the per-installation graphql query function (default: real @octokit/graphql).
   * Signature: (installationId, query, variables) => Promise<unknown>
   */
  readonly graphqlQueryFn?: (installationId: number, query: string, variables: Record<string, unknown>) => Promise<unknown>
  /**
   * Override the installation resolver (default: real App JWT endpoint).
   * Used to find the installation ID for a repo by owner/name.
   */
  readonly resolveInstallationIdForRepo?: (owner: string, name: string) => Promise<number>
  /**
   * Optional snapshot persistence (rm-198). Default: file-backed store at
   * `DASHBOARD_SNAPSHOT_CACHE` when that env is set, disabled otherwise.
   */
  readonly snapshotStore?: SnapshotStore
}

/**
 * Build the real aggregator snapshot provider from GitHub App credentials.
 *
 * Extracted from `createDashboardServer` so tests can assert the production
 * path uses the REAL aggregator (not the empty default). Inject fakes via
 * `deps` to avoid network calls in tests.
 *
 * Returns `{ getSnapshot, start, stop }` — the same shape as the aggregator.
 */
export function buildSnapshotProvider(deps: SnapshotProviderDeps): {
  getSnapshot: () => AggregatorSnapshot
  start: () => Promise<void>
  stop: () => void
} {
  const {appId, privateKey} = deps

  const appClient = createDashboardAppClient({appId, privateKey})
  const installationsClient = buildInstallationsClient(appClient)

  /**
   * Get a cached read-only token for the given installation.
   * Routes through mintReadOnlyToken (cache + optional-scope graceful fallback).
   * server.ts MUST NOT call appClient.mintInstallationToken directly.
   */
  async function getReadOnlyToken(installationId: number): Promise<string> {
    return mintReadOnlyToken(installationId, appClient.mintInstallationToken)
  }

  /**
   * Resolve the installation ID for a repo using the App JWT endpoint
   * GET /repos/{owner}/{repo}/installation — the only App-JWT endpoint valid
   * for this purpose (App JWT IS valid here per GitHub docs).
   */
  const resolveInstallationIdForRepo =
    deps.resolveInstallationIdForRepo ??
    (async (owner: string, name: string): Promise<number> => {
      const response = await appClient.octokit.request('GET /repos/{owner}/{repo}/installation', {
        owner,
        repo: name,
      })
      const data = response.data as unknown as {id: number}
      return data.id
    })

  // Real Octokit-backed metadata reader: fetches metadata/repos.yaml from
  // codeo1io/.github at ref=data via an INSTALLATION token (not App JWT).
  // The installation is resolved via resolveInstallationIdForRepo('codeo1io', '.github').
  const metadataReader: MetadataReader =
    deps.metadataReader ??
    (async (path: string, ref: string): Promise<string> => {
      // Resolve the installation for codeo1io/.github and mint a read-only token.
      // This uses an installation token (not App JWT) — App JWT cannot read repo contents.
      const installationId = await resolveInstallationIdForRepo('codeo1io', '.github')
      const token = await getReadOnlyToken(installationId)

      // rm-197 (review fix): time-bounded like every other GitHub transport —
      // the metadata reader sits on the refresh path and must honor the 30s
      // request contract, not undici's ~300s default.
      // rm-156 (merged 2026-09-26): the ceiling is ENFORCED at the fetch
      // layer (createBoundedFetch) — this runtime's @octokit/request does not
      // honor the `timeout` option against hung upstreams — while the
      // `timeout` key stays pinned so the rm-197 transport-contract gate
      // (test/transport-timeout-contract.test.ts) keeps matching this site.
      const installOctokit = new Octokit({
        auth: token,
        request: {timeout: GITHUB_REQUEST_TIMEOUT_MS, fetch: createBoundedFetch(GITHUB_REQUEST_TIMEOUT_MS)},
      })
      const response = await installOctokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner: 'codeo1io',
        repo: '.github',
        path,
        ref,
      })
      const data = response.data as unknown as {type: string; encoding: string; content: string}
      if (data.type !== 'file' || data.encoding !== 'base64') {
        throw makeNotFoundError(`${path} at ref=${ref} is not a base64-encoded file`)
      }
      // base64-decode the content (GitHub wraps at 60 chars with newlines)
      return Buffer.from(data.content.replaceAll('\n', ''), 'base64').toString('utf8')
    })

  // Real per-installation graphql query function: mints a read-only token for
  // the given installationId and authenticates the graphql client with it.
  // NO "first installation" logic — each repo uses its own installation's token.
  const graphqlQueryFn =
    // rm-197: the per-repo GraphQL client is the dominant transport of the
    // serial first walk — it carries the same 30s bound. rm-156: the
    // construction now lives in app-client.ts's createInstallationGraphqlQueryFn
    // (bounded fetch + timeout key — the transport-contract gate pins it there).
    deps.graphqlQueryFn ?? createInstallationGraphqlQueryFn(getReadOnlyToken)

  const aggregator = createAggregator(installationsClient, metadataReader, {
    enumerate: deps.enumerateFn ?? enumerateRepos,
    readMetadata: readRepoMetadata,
    graphqlQueryForInstallation: graphqlQueryFn,
    resolveInstallationIdForRepo,
    snapshotStore: deps.snapshotStore ?? createFileSnapshotStore(process.env.DASHBOARD_SNAPSHOT_CACHE),
  })

  return {
    getSnapshot: aggregator.getSnapshot,
    start: aggregator.start,
    stop: aggregator.stop,
  }
}

/**
 * Returns true if the given bind host is a loopback address.
 * Accepts '127.0.0.1', 'localhost', and '::1'.
 * undefined or any other value (including '0.0.0.0') returns false.
 *
 * Used by the devAutoLogin guard: the ENV-driven bypass requires an explicit
 * loopback bind host so it cannot engage on a network-accessible address.
 */
export function isLoopbackBindHost(host: string | undefined): boolean {
  return host === '127.0.0.1' || host === 'localhost' || host === '::1'
}

/** Resolved server bind address. */
export interface ServerBindConfig {
  readonly host: string
  readonly port: number
}

/**
 * Resolve whether the consumerless monitoring refresh loop should run.
 *
 * rm-223 monitoring-refresh gate: readMonitoringRefreshConfig resolves
 * DASHBOARD_MONITORING_REFRESH (default ON) so the consumerless
 * aggregator loop can be skipped without removing credentials.
 */
export interface MonitoringRefreshConfig {
  readonly enabled: boolean
}

export function readMonitoringRefreshConfig(env: NodeJS.ProcessEnv = process.env): MonitoringRefreshConfig {
  const raw = env.DASHBOARD_MONITORING_REFRESH?.trim().toLowerCase()
  const disabled = raw === 'false' || raw === '0' || raw === 'off' || raw === 'no'
  return {enabled: !disabled}
}

/**
 * Resolve the server bind host/port from the environment.
 *
 * Defaults to `0.0.0.0:3000`. The dashboard runs inside a container behind a
 * reverse proxy (Caddy) in a sibling container, so it MUST bind a non-loopback
 * address to be reachable across the Compose network — `127.0.0.1` only accepts
 * connections from inside the app's own network namespace, which makes the
 * container's own healthcheck pass while every proxied request 502s.
 *
 * Binding `0.0.0.0` does not expose the app publicly: the container only
 * publishes the port to the internal Compose network, and Caddy terminates TLS
 * and fronts auth. Override with `DASHBOARD_HOST` (e.g. `127.0.0.1` for a
 * non-containerized local run) and `DASHBOARD_PORT`.
 *
 * Extracted so the bind behavior is testable without opening a real port.
 * Throws on an invalid `DASHBOARD_PORT` (fail loud rather than bind a surprise port).
 */
export function readServerBindConfig(env: NodeJS.ProcessEnv = process.env): ServerBindConfig {
  const rawHost = env.DASHBOARD_HOST?.trim()
  const host = rawHost !== undefined && rawHost !== '' ? rawHost : '0.0.0.0'

  const rawPort = env.DASHBOARD_PORT?.trim()
  let port = 3000
  if (rawPort !== undefined && rawPort !== '') {
    const parsed = Number(rawPort)
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
      throw new Error(`DASHBOARD_PORT must be an integer in 1-65535, got: ${rawPort}`)
    }
    port = parsed
  }

  return {host, port}
}

/**
 * Binds the app to `DASHBOARD_HOST:DASHBOARD_PORT` (default `0.0.0.0:3000`) via
 * @hono/node-server. Loads the cookie key asynchronously before starting.
 *
 * Non-blocking startup: the server begins listening immediately after the cookie
 * key is loaded. The first aggregation refresh runs in the background — the
 * snapshot provider returns an empty snapshot until the first refresh completes,
 * and the UI handles the empty/loading state. This means the server is ready to
 * serve requests (including /api/healthz) within ~1-2s, not 15-20s.
 */
async function createDashboardServer(): Promise<ServerType> {
  const cookieKey = await loadCookieKey()

  // Wire the real GitHub data layer when credentials are present.
  // If creds are absent (dev/test context), fall back to the empty provider
  // with a clear warning — the server still boots, just serves empty data.
  let getSnapshot: (() => AggregatorSnapshot) | undefined
  let stopAggregator: (() => void) | undefined

  const appId = readOptionalSecret('DASHBOARD_GITHUB_APP_ID')
  const privateKey = readOptionalMultilineSecret('DASHBOARD_GITHUB_APP_KEY')

  let provider: ReturnType<typeof buildSnapshotProvider> | undefined

  if (appId !== null && privateKey !== null) {
    // Construct the provider synchronously — no network calls yet.
    // start() (which triggers the first refresh) runs in the background after
    // the server is already listening.
    provider = buildSnapshotProvider({appId, privateKey})
    getSnapshot = provider.getSnapshot
    stopAggregator = provider.stop
  } else {
    logger.warning(
      'DASHBOARD_GITHUB_APP_ID or DASHBOARD_GITHUB_APP_KEY not set — GitHub data layer disabled; serving empty snapshot',
    )
  }

  // Wire the operator listener channel. Guarded independently: a failure to
  // construct the store (e.g. missing /data volume) must not crash the whole
  // dashboard — fail-closed by leaving the channel unmounted.
  let listenerStore: ListenerStore | undefined
  const listenerIngestKey = readListenerIngestKey()
  try {
    listenerStore = createListenerStore(readListenerDbPath())
  } catch (error) {
    logger.warning('Failed to initialize listener store; operator listener channel disabled', {
      error: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)),
    })
  }

  const app = await buildDashboardApp({cookieKey, getSnapshot, listenerStore, listenerIngestKey})

  const {host, port} = readServerBindConfig()

  // Bind and listen FIRST — the server is immediately ready to serve requests.
  // The snapshot provider returns an empty snapshot until the first refresh
  // completes; the UI handles the loading state gracefully.
  const server = serve(
    {
      fetch: app.fetch,
      hostname: host,
      port,
    },
    info => {
      // rm-229 (landed at this integrate; the sibling cycle-7 batch's rm-146
      // banner half): route the bind banner through the structured logger so it
      // carries the repo's redaction discipline and level formatting instead of
      // a bare console.warn. stdout stays reserved for structured output.
      logger.info(`Dashboard listening on http://${info.address}:${info.port}`)
    },
  )

  // Attach stop handler for graceful shutdown: the 'close' listener cancels
  // the aggregator interval whenever the server closes (including via the
  // signal handlers below); installShutdownHandlers turns SIGTERM/SIGINT —
  // which as PID 1 have no default dispositions — into an orderly drain
  // with a bounded force-exit deadline (rm-171).
  if (stopAggregator !== undefined) {
    const stop = stopAggregator
    server.addListener('close', () => {
      stop()
    })
  }
  // rm-171: ServerType's union includes http2 variants whose typings lack
  // the socket-drain APIs; @hono/node-server's serve() always returns a plain
  // node:http Server at runtime, so narrow once at the seam.
  const httpServer = server as import('node:http').Server
  installShutdownHandlers({
    closeServer: callback => server.close(callback),
    // rm-171: idle keep-alive sockets otherwise hold close() open through the
    // whole grace deadline; long-lived streams are destroyed at the deadline.
    closeIdleConnections: () => httpServer.closeIdleConnections(),
    closeAllConnections: () => httpServer.closeAllConnections(),
    stopAggregator,
    closeListenerStore: () => listenerStore?.close(),
    log: (message, context) => logger.warning(message, context ?? {}),
  })

  // Kick the first aggregation refresh in the background — does NOT block the
  // server from accepting requests. Failures are logged but do NOT crash the
  // server; the interval set by start() will retry on the next cycle.
  // rm-223: DASHBOARD_MONITORING_REFRESH=false skips the loop entirely — no
  // token mint, no per-repo queries; the empty bannered snapshot IS the
  // fail-closed behavior (identical to running without credentials).
  const monitoringRefresh = readMonitoringRefreshConfig()
  if (provider !== undefined && monitoringRefresh.enabled) {
    const p = provider
    p.start().catch((error: unknown) => {
      logger.warning('Failed to start GitHub aggregator; serving empty snapshot until next retry', {
        error: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)),
      })
    })
  } else if (provider !== undefined) {
    logger.warning(
      'DASHBOARD_MONITORING_REFRESH disabled — aggregator refresh loop not started; serving empty snapshot without querying GitHub (rm-223)',
    )
  }

  return server
}

// Only start the server when this module is the entry point.

/**
 * Entry-point detection for ESM (rm-702).
 *
 * Compares file URLs, not a literal `file://${process.argv[1]}` template: the
 * template breaks whenever the entry path contains characters that URL-encode
 * (a space, or anything outside the unreserved set) because `import.meta.url`
 * percent-encodes while argv[1] does not — under such paths the template
 * silently evaluated false and the server booted WITHOUT its listener.
 */
export function isMainEntryPoint(metaUrl: string, argv1: string | undefined): boolean {
  if (argv1 === undefined || argv1 === '') return false
  try {
    return pathToFileURL(argv1).href === metaUrl
  } catch {
    // Unencodable argv (e.g. invalid path characters) — never autostart.
    return false
  }
}

if (isMainEntryPoint(import.meta.url, process.argv[1])) {
  createDashboardServer().catch((error: unknown) => {
    logger.error('Failed to start dashboard server', {
      error: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)),
    })
    process.exit(1)
  })
}

export {buildDashboardApp, createDashboardServer}
