/**
 * Installation-resolution memoization (rm-162).
 *
 * `resolveInstallationIdForRepo` (GET /repos/{owner}/{repo}/installation,
 * App-JWT) answers a mapping that is effectively immutable — an installation
 * moves on the scale of months — yet the refresh loop re-asked it for every
 * metadata-only repo on every 60s cycle (1+N App-JWT GETs per minute, forever)
 * plus once per cycle for the codeo1io/.github metadata read itself.
 *
 * This wrapper caches owner/name → installationId for a TTL (default 24h).
 * Invalidation is explicit: ANY underlying failure evicts the cached entry and
 * rethrows — a 404 means the repo is no longer installed (the previously
 * cached id must not survive), and a transient error must not be pinned.
 * Failed lookups are never cached, so a transient outage costs one retry per
 * cycle, not a wedged wrong answer.
 *
 * Cache keys are lowercased owner/name (GitHub logins are case-insensitive).
 * Footprint is bounded by the number of distinct metadata-only repos — entries
 * are overwritten, never accumulated per cycle.
 */
import {logger} from '../logger.ts'
import {hasErrorStatus} from './conditional-request.ts'

/** Default TTL for a cached installation mapping (24h). */
export const INSTALLATION_RESOLVER_TTL_MS = 24 * 60 * 60 * 1000

export interface ResolverCacheStats {
  /** Served from cache without an upstream call. */
  readonly hits: number
  /** Required an upstream call (no entry, expired, or previously evicted). */
  readonly misses: number
  /** Total upstream calls made (misses that did not throw before dispatch). */
  readonly upstreamCalls: number
  /** Successful resolutions stored. */
  readonly stored: number
  /** Entries evicted by an upstream failure (explicit invalidation). */
  readonly evictions: number
}

export interface MemoizedInstallationResolver {
  (owner: string, name: string): Promise<number>
  /** Call-counters for tests and steady-state verification. */
  readonly stats: () => ResolverCacheStats
}

/**
 * Wraps an installation resolver with a TTL cache and fail-open-to-retry
 * invalidation. The returned function has the exact resolver signature, plus
 * a `stats()` accessor.
 */
export function createMemoizedInstallationResolver(
  underlying: (owner: string, name: string) => Promise<number>,
  options: {readonly ttlMs?: number; readonly now?: () => number} = {},
): MemoizedInstallationResolver {
  const ttlMs = options.ttlMs ?? INSTALLATION_RESOLVER_TTL_MS
  const now = options.now ?? Date.now

  interface Entry {
    id: number
    expiresAt: number
  }
  const cache = new Map<string, Entry>()
  const stats = {hits: 0, misses: 0, upstreamCalls: 0, stored: 0, evictions: 0}

  const resolver = async (owner: string, name: string): Promise<number> => {
    const key = `${owner.toLowerCase()}/${name.toLowerCase()}`
    const cached = cache.get(key)
    if (cached !== undefined && cached.expiresAt > now()) {
      stats.hits++
      return cached.id
    }

    stats.misses++
    stats.upstreamCalls++
    // Never log owner/name here — metadata-only repos can include redacted
    // entries downstream of the denylist; the cache layer stays nameless.
    logger.debug('installation resolver cache miss', {ttlMs})
    try {
      const id = await underlying(owner, name)
      cache.set(key, {id, expiresAt: now() + ttlMs})
      stats.stored++
      return id
    } catch (error) {
      // Explicit invalidation: whatever we believed about this repo is no
      // longer trustworthy (404 = uninstalled; anything else = transient).
      // Evict so the next cycle retries instead of serving a dead mapping.
      if (cache.delete(key)) stats.evictions++
      if (hasErrorStatus(error, 404)) {
        logger.debug('installation resolver: repo no longer installed (404); evicted')
      }
      throw error
    }
  }

  return Object.assign(resolver, {
    stats: (): ResolverCacheStats => ({...stats}),
  })
}
