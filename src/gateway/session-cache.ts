/**
 * Gateway upstream-session cache (rm-226 cache half, authored 2026-09-29 by
 * run c670b67f implement 248a73ff).
 *
 * Why: server.ts's gateway auth middleware validated EVERY request by calling
 * the gateway's GET /operator/session through the per-request OperatorClient —
 * one upstream round-trip (10s deadline) per dashboard request, re-validating
 * the very same cookie tens of times per minute (assess finding HIGH #2 at
 * HEAD d89ffe7; src/server.ts:789). The 15s-TTL design was first drafted in
 * stranded PR #196 (head 4e5d99f, mergeable=CONFLICTING since 2026-09-24) —
 * this module re-authors that design on main; the PR stays untouched.
 *
 * Contract:
 * - Keyed by the inbound Cookie header value (the gateway's end-user
 *   principal). The key never leaves memory and is never logged.
 * - TTL 15s: within the window a cached OK result is served without an
 *   upstream call. This bounds gateway-side revocation latency to ≤15s —
 *   the documented tradeoff; the middleware's own expiresAt/identity checks
 *   still run on every request, cached or not.
 * - Single-flight: concurrent misses with the same key share one upstream
 *   call (a burst of N requests costs 1 validation, not N).
 * - Only OK results are cached. Errors are never cached — fail-closed paths
 *   re-attempt upstream rather than serving a stale denial.
 * - Memory bound: one entry per distinct cookie. A single-operator app has
 *   O(1) live cookies; entries are dropped on read once expired (lazy
 *   eviction), and the map never grows on error results.
 */
import type {Result} from '../result.ts'
import type {GatewayClientError, SessionDto} from './operator-client.ts'

export interface SessionCache {
  readonly get: (
    cookie: string,
    load: () => Promise<Result<SessionDto, GatewayClientError>>,
  ) => Promise<Result<SessionDto, GatewayClientError>>
}

export const SESSION_CACHE_TTL_MS = 15_000

export function createSessionCache(opts?: {
  readonly ttlMs?: number
  readonly now?: () => number
}): SessionCache {
  const ttlMs = opts?.ttlMs ?? SESSION_CACHE_TTL_MS
  const now = opts?.now ?? (() => Date.now())

  interface CacheEntry {
    readonly cachedAt: number
    readonly session: SessionDto
  }

  const entries = new Map<string, CacheEntry>()
  const inFlight = new Map<string, Promise<Result<SessionDto, GatewayClientError>>>()

  async function get(
    cookie: string,
    load: () => Promise<Result<SessionDto, GatewayClientError>>,
  ): Promise<Result<SessionDto, GatewayClientError>> {
    const existing = entries.get(cookie)
    if (existing !== undefined && now() - existing.cachedAt < ttlMs) {
      return {success: true, data: existing.session}
    }
    entries.delete(cookie)

    const pending = inFlight.get(cookie)
    if (pending !== undefined) return pending

    const flight = load()
      .then(result => {
        if (result.success) entries.set(cookie, {cachedAt: now(), session: result.data})
        return result
      })
      .finally(() => {
        inFlight.delete(cookie)
      })
    inFlight.set(cookie, flight)
    return flight
  }

  return {get}
}
