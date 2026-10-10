/**
 * Operator listener channel routes.
 *
 * See docs/contracts/operator-listener-channel.md — mounted at `/api/listener`
 * by server.ts. `/ingest` is HMAC-gated and public-before-session; `/messages*`
 * and `/ack-all` sit behind the operator session (server.ts auth middleware)
 * and, being session-authenticated mutations, additionally require a
 * listener-ack CSRF token (double-submit via the `x-csrf-token` header,
 * derived HMAC-style from the cookie key — mirroring the logout CSRF pattern
 * in routes/auth.ts).
 */
import type {ListenerStore} from '../listener/store.ts'

import {Buffer} from 'node:buffer'
import {createHmac, timingSafeEqual} from 'node:crypto'
import {Hono, type Context} from 'hono'
import {parseIngestBody} from '../listener/contract.ts'
import {verifyIngestSignature} from '../listener/ingest-auth.ts'
import {logger} from '../logger.ts'
import {MAX_REQUEST_BODY_BYTES, readBodyCapped} from '../read-body.ts'

// Body bound: shared MAX_REQUEST_BODY_BYTES / readBodyCapped (src/read-body.ts),
// hoisted at rm-497 so ingest and /auth/logout enforce one bound, one code path.

const ACK_CSRF_WINDOW_MS = 60 * 60 * 1000
const ACK_CSRF_HEADER = 'x-csrf-token'

/** CSRF enforcement config for the operator ack mutations. */
export interface AckCsrfConfig {
  /** Cookie signing key — used as the HMAC key for the derived token. */
  readonly cookieKey: Buffer
  /** Operator login bound into the token (operator-specific, like logout CSRF). */
  readonly operatorLogin: string
}

/**
 * Derives the listener-ack CSRF token for the current window: the first 32
 * hex chars of HMAC-SHA256(cookieKey, `<login>:listener-ack:<window>`).
 *
 * The token is fetched by the operator UI from GET /api/listener/csrf (behind
 * the session middleware) and submitted on every ack mutation via the
 * `x-csrf-token` header. A fresh fetch also rotates the token because the
 * operator login is bound in — matching the logout CSRF derivation shape
 * (routes/auth.ts deriveLogoutCsrfToken) so the two surfaces stay symmetric.
 */
export function deriveAckCsrfToken(config: AckCsrfConfig, now: number = Date.now()): string {
  const window = Math.floor(now / ACK_CSRF_WINDOW_MS)
  return createHmac('sha256', config.cookieKey)
    .update(`${config.operatorLogin}:listener-ack:${window}`)
    .digest('hex')
    .slice(0, 32)
}

/** Verdicts for {@link checkAckCsrf}. */
export type AckCsrfVerdict = 'ok' | 'missing' | 'invalid' | 'unavailable'

/**
 * Validates a submitted ack CSRF token against the current and previous
 * window (a token fetched near a window boundary stays valid for one window
 * of clock skew). Constant-time comparison via timingSafeEqual; length is
 * compared first because timingSafeEqual throws on mismatched lengths.
 *
 * 'unavailable' is fail-closed: when the router is built without CSRF config
 * (no operator session material in scope), mutations are refused outright.
 */
export function checkAckCsrf(
  submitted: string | undefined,
  config: AckCsrfConfig | null,
  now: number = Date.now(),
): AckCsrfVerdict {
  if (config === null) return 'unavailable'
  if (submitted === undefined || submitted.length === 0) return 'missing'

  const submittedBuf = Buffer.from(submitted, 'utf8')
  const candidates = [deriveAckCsrfToken(config, now), deriveAckCsrfToken(config, now - ACK_CSRF_WINDOW_MS)]
  for (const candidate of candidates) {
    const candidateBuf = Buffer.from(candidate, 'utf8')
    if (submittedBuf.length === candidateBuf.length && timingSafeEqual(submittedBuf, candidateBuf)) {
      return 'ok'
    }
  }
  return 'invalid'
}

/**
 * Bounded body reader — hoisted to src/read-body.ts at rm-497 (shared with
 * routes/auth.ts); that module carries the full defense-in-depth doc.
 */

export interface ListenerRouterDeps {
  readonly store: ListenerStore
  readonly ingestKey: string | null
  /**
   * CSRF config for the ack mutations. Null fails closed: mutations return
   * 403 and the /csrf token endpoint returns 503. server.ts always supplies
   * it whenever an operator session is in scope (auth active).
   */
  readonly ackCsrf: AckCsrfConfig | null
  /**
   * rm-904: post-verification ingest budget admission. Counts a VERIFIED
   * request against the ingest path-class budget (server.ts's checkRateLimit,
   * keyed identically to the pre-auth middleware) and returns false when the
   * budget is exhausted. Optional so direct test constructions can omit it;
   * the real app always supplies it (absent === admit — the auth seam itself
   * never fails closed on a bookkeeping dependency).
   */
  readonly ingestRateLimit?: {consume: (c: Context) => boolean}
}

export function buildListenerRouter(deps: ListenerRouterDeps): Hono {
  const router = new Hono()

  router.post('/ingest', async c => {
    if (deps.ingestKey === null) {
      return c.notFound()
    }

    const rawBody = await readBodyCapped(c.req.raw, MAX_REQUEST_BODY_BYTES)
    if (rawBody === null) {
      return c.json({error: 'payload too large'}, 413)
    }

    const authResult = verifyIngestSignature({
      key: deps.ingestKey,
      rawBody,
      timestampHeader: c.req.header('x-listener-timestamp') ?? null,
      signatureHeader: c.req.header('x-listener-signature') ?? null,
      nowSeconds: Math.floor(Date.now() / 1000),
    })
    if (!authResult.success) {
      return c.json({error: 'unauthorized'}, 401)
    }

    // rm-904: budget admission only for VERIFIED requests — auth-failed
    // admissions no longer consume the ingest budget anywhere (the pre-auth
    // middleware skips the ingest class), so an unsigned flood cannot evict
    // or block the legitimate producer's key.
    if (deps.ingestRateLimit !== undefined && !deps.ingestRateLimit.consume(c)) {
      return c.text('Too Many Requests', 429)
    }

    let parsedJson: unknown
    try {
      parsedJson = JSON.parse(rawBody)
    } catch {
      return c.json({error: 'invalid request body'}, 400)
    }

    const parseResult = parseIngestBody(parsedJson)
    if (!parseResult.success) {
      return c.json({error: parseResult.error.message}, 400)
    }

    const {id, receivedAt} = deps.store.insert(parseResult.data)
    return c.json({id, receivedAt}, 202)
  })

  router.get('/messages', c => {
    const unreadOnly = c.req.query('unreadOnly') === 'true'
    const rawLimit = c.req.query('limit')
    const limit = rawLimit === undefined ? undefined : Number.parseInt(rawLimit, 10)

    const response = deps.store.list({
      unreadOnly,
      limit: limit !== undefined && Number.isFinite(limit) ? limit : undefined,
    })
    // Operator-visible message feed: never cacheable (rm-263).
    c.header('Cache-Control', 'no-store')
    return c.json(response, 200)
  })

  router.get('/csrf', c => {
    if (deps.ackCsrf === null) {
      return c.json({error: 'csrf unavailable'}, 503)
    }
    // Token-bearing response: never cacheable (rm-263).
    c.header('Cache-Control', 'no-store')
    return c.json({csrfToken: deriveAckCsrfToken(deps.ackCsrf)}, 200)
  })

  router.post('/messages/:id/ack', c => {
    const verdict = checkAckCsrf(c.req.header(ACK_CSRF_HEADER), deps.ackCsrf)
    if (verdict !== 'ok') {
      logger.warning(`listener ack rejected: csrf ${verdict}`)
      return c.json({error: `csrf ${verdict}`}, 403)
    }

    const id = c.req.param('id')
    const result = deps.store.ack(id)
    if (!result.acked) {
      return c.json({error: 'not found'}, 404)
    }
    return c.json({id, readAt: result.readAt}, 202)
  })

  router.post('/ack-all', c => {
    const verdict = checkAckCsrf(c.req.header(ACK_CSRF_HEADER), deps.ackCsrf)
    if (verdict !== 'ok') {
      logger.warning(`listener ack-all rejected: csrf ${verdict}`)
      return c.json({error: `csrf ${verdict}`}, 403)
    }

    const acked = deps.store.ackAll()
    return c.json({acked}, 202)
  })

  return router
}
