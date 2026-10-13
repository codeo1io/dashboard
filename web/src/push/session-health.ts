/**
 * Session push health — web-local read of the operator session's coarse
 * push-health report (contract 1.10.0, agent #1788).
 *
 * GET /operator/session is reverse-proxied to the Gateway in production
 * (same-origin relative path, cookie-authenticated) and served by the fixture
 * harness's operator base in dev fixture mode. The Gateway reports health as
 * last OBSERVED — no probing happens here — and omits the `push` field
 * entirely when push is not configured, so there is no `disabled` value.
 *
 * Fail-closed contract (mirrors the gateway's parseOperatorSessionInfo):
 * - a session whose `push` field is absent or MALFORMED yields `unconfigured`
 *   (a malformed diagnostic field never rejects an otherwise valid session);
 * - any transport failure, non-OK status, or body parse failure yields
 *   `unavailable` — never a fabricated `ready`;
 * - `unknown` is only ever the Gateway's own observation relayed verbatim:
 *   configured but nothing fresh observed in the last hour. "Never read as
 *   healthy."
 *
 * No oracle surface: the fetch carries only the session cookie and the
 * standard fetch metadata; the result is a coarse status with no operator
 * data, endpoint material, or error detail.
 */
import type {PushHealthStatus, SessionPushHealth} from './push-types.ts'
import {PUSH_HEALTH_STATUSES} from './push-types.ts'

export type SessionPushHealthResult =
  | {readonly kind: 'health'; readonly status: PushHealthStatus}
  | {readonly kind: 'unconfigured'}
  | {readonly kind: 'unavailable'}

export interface SessionHealthOptions {
  /**
   * Operator endpoint base. Defaults to '/operator' (production). In dev
   * fixture mode callers derive it from the fixture push base by stripping
   * the trailing '/push' (e.g. '/__fixture/operator/push' →
   * '/__fixture/operator').
   */
  readonly endpointBase?: string
  /** Fixture-mode session id, appended as a query param (never in production). */
  readonly fixtureSessionId?: string
  /** Caller-owned abort signal (e.g. the logout signal). */
  readonly signal?: AbortSignal
  /** Bound the fetch so a hung socket cannot pin the read open. */
  readonly timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 10_000

function withFixtureParam(fixtureSessionId: string | undefined, url: string): string {
  return fixtureSessionId === undefined
    ? url
    : `${url}${url.includes('?') ? '&' : '?'}fixtureSessionId=${encodeURIComponent(fixtureSessionId)}`
}

/**
 * Read the push-enabled capability flag the server bakes into the document
 * shell (`<meta name="push-enabled" content="true|false">`). Views gate any
 * push-surface rendering on this so a deployment without push configured
 * never fetches session health at all.
 */
export function readPushEnabledMeta(): boolean {
  if (typeof document === 'undefined') return false
  const meta = document.querySelector('meta[name="push-enabled"]')
  return meta?.getAttribute('content') === 'true'
}

function isValidPushHealth(value: unknown): value is SessionPushHealth {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const status = (value as Record<string, unknown>).status
  return typeof status === 'string' && (PUSH_HEALTH_STATUSES as readonly string[]).includes(status)
}

/**
 * Fetch the operator session's push health. Resolves (never rejects); every
 * failure path folds into `unavailable`, and a body without a valid `push`
 * field folds into `unconfigured` — exactly the gateway's drop-malformed
 * semantics, so a pre-1.10.0 gateway (no `push` on the session) renders
 * nothing rather than an error.
 */
export async function fetchSessionPushHealth(opts: SessionHealthOptions = {}): Promise<SessionPushHealthResult> {
  const endpointBase = opts.endpointBase ?? '/operator'
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const timeoutSignal =
    typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
      ? AbortSignal.timeout(timeoutMs)
      : undefined
  const compositeSignal =
    opts.signal === undefined
      ? timeoutSignal
      : timeoutSignal === undefined
        ? opts.signal
        : AbortSignal.any([opts.signal, timeoutSignal])
  try {
    const res = await fetch(withFixtureParam(opts.fixtureSessionId, `${endpointBase}/session`), {
      credentials: 'include',
      redirect: 'error',
      headers: {accept: 'application/json'},
      signal: compositeSignal,
    })
    if (!res.ok) return {kind: 'unavailable'}
    const body: unknown = await res.json()
    if (typeof body !== 'object' || body === null || Array.isArray(body)) return {kind: 'unavailable'}
    const push = (body as Record<string, unknown>).push
    // Mirror parseOperatorSessionInfo: a malformed push field is DROPPED, so
    // the session still reads as valid — render nothing, not an error.
    return isValidPushHealth(push) ? {kind: 'health', status: push.status} : {kind: 'unconfigured'}
  } catch {
    return {kind: 'unavailable'}
  }
}
