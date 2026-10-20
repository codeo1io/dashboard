/**
 * rm-419: short-TTL positive cache for gateway session validation.
 *
 * Decision record (revocation bound, pre-authorized by the roadmap item's
 * acceptance): the gateway auth branch previously paid a synchronous upstream
 * `getCurrentSession` roundtrip (10s transport cap) on EVERY protected request.
 * This module lets a validated session be reused for at most
 * GATEWAY_SESSION_CACHE_TTL_MS (15s), keyed by the full inbound cookie header
 * (cookie-keyed: a rotated or replaced cookie is a different key and therefore
 * revalidates immediately — no cross-cookie reuse is possible).
 *
 * Semantics — deliberately narrow:
 * - ONLY positive verdicts are cached. Upstream errors and rejected sessions
 *   are never cached, so fail-closed behavior remains per-request and a
 *   transient upstream failure can never wedge a permanent deny (or grant).
 * - An entry is valid only while BOTH hold: age < TTL AND the session's own
 *   expiresAt is still in the future. A cached verdict never outlives the
 *   session it vouches for.
 * - Memory bound: at most GATEWAY_SESSION_CACHE_MAX_ENTRIES keys; exceeding
 *   the cap drops the whole map (a fresh validation repopulates). Cookie
 *   rotation by a hostile client can therefore not grow the map unboundedly.
 * - Revocation bound: a session revoked upstream may still pass for up to the
 *   15s TTL. This is the accepted trade (the gateway's own session expiry and
 *   the 302 redirect on the next miss are the recovery paths).
 */
import type {SessionDto} from './operator-client.ts'

/** Positive-verdict TTL. Decision: 15s (see module doc). */
export const GATEWAY_SESSION_CACHE_TTL_MS = 15_000

/** Hard cap on tracked cookie keys; exceeding it drops the map. */
export const GATEWAY_SESSION_CACHE_MAX_ENTRIES = 256

export interface GatewaySessionCacheEntry {
  readonly session: SessionDto
  readonly storedAt: number
}

export interface GatewaySessionCache {
  /** Returns a still-valid cached session for this cookie, else undefined. */
  get: (cookie: string) => SessionDto | undefined
  /** Records a positive verdict. Never call for failures. */
  set: (cookie: string, session: SessionDto) => void
  /** Drops every entry (tests; manual invalidation seam). */
  clear: () => void
  /** Number of tracked keys (diagnostics/tests). */
  readonly size: number
}

/**
 * Create a cache. `now` is injectable so tests pin TTL/expiry behavior without
 * fake timers.
 */
export function createGatewaySessionCache(
  now: () => number = Date.now,
  ttlMs: number = GATEWAY_SESSION_CACHE_TTL_MS,
  maxEntries: number = GATEWAY_SESSION_CACHE_MAX_ENTRIES,
): GatewaySessionCache {
  const entries = new Map<string, GatewaySessionCacheEntry>()

  const get = (cookie: string): SessionDto | undefined => {
    const entry = entries.get(cookie)
    if (entry === undefined) {
      return undefined
    }
    const fresh = now() - entry.storedAt < ttlMs && entry.session.expiresAt > now()
    if (!fresh) {
      entries.delete(cookie)
      return undefined
    }
    return entry.session
  }

  const set = (cookie: string, session: SessionDto): void => {
    if (entries.size >= maxEntries) {
      // rm-2078 decision of record: cap overflow flushes EVERY entry, not one
      // victim. Deliberate trade-off, accepted for this app's single-operator
      // persona: entries are short-TTL positive verdicts only, so a flush
      // costs at most one extra upstream validation per live session
      // (repopulated on that session's next request) — churn, never a
      // correctness or security loss. The cap exists to bound hostile cookie
      // rotation, where evicting one entry per set() would not keep the map
      // bounded anyway. Per-identity eviction is rejected as unearned
      // bookkeeping: it would only matter in a multi-operator deployment,
      // where one operator's sign-in past the cap would otherwise evict every
      // other operator's cached session.
      entries.clear()
    }
    entries.set(cookie, {session, storedAt: now()})
  }

  return {
    get,
    set,
    clear: () => {
      // rm-2078: same flush-all trade-off as the cap-overflow path in set() —
      // the whole-map wipe is the contract of this invalidation seam (tests,
      // manual invalidation), not an accident.
      entries.clear()
    },
    get size(): number {
      return entries.size
    },
  }
}
