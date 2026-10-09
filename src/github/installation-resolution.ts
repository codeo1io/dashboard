/**
 * Memoized installation resolution (rm-162).
 *
 * The owner/name → installation_id mapping is effectively immutable (it
 * changes only when the App is installed on / removed from a repo), yet the
 * pre-rm-162 wiring re-resolved it for every metadata-only repo on every 60s
 * cycle and for the metadata reader's codeo1io/.github lookup — 1+N
 * uncached App-JWT GET /repos/{o}/{r}/installation calls per minute forever.
 *
 * This module wraps ANY resolver (the production App-JWT resolver or a test
 * fake) with a TTL cache plus an explicit 404 invalidation path, so
 * steady-state cycles make ZERO resolver calls:
 *
 * - hit within TTL → cached id returned, resolver NOT called (debug log
 *   line per hit — a steady-state cycle's log is grep-able for resolver
 *   silence: 'installation resolution memo hit');
 * - TTL expiry → re-resolve (the TTL IS the second invalidation path — an
 *   uninstall noticed by the next cycle after expiry at the latest);
 * - resolver throws a 404-shaped error → any cached entry for that repo is
 *   DELETED (the App is gone; the stale mapping must not survive) and the
 *   error propagates to the caller's existing absence-entry handling;
 * - any other throw → propagates, cache untouched (a transient 5xx must not
 *   discard a good mapping).
 *
 * No in-flight dedupe by design: two overlapping cold-start calls for the
 * same key each hit the resolver once — the steady state (60s cycles, one
 * sequential walk) never overlaps, and promise-caching would complicate the
 * 404 invalidation path for no measurable gain.
 */

import {logger} from '../logger.ts'

export interface InstallationResolutionMemoStats {
  /** Total resolver invocations that hit the underlying resolver. */
  readonly resolverCalls: number
  /** Served-from-cache returns (the steady-state zero-call metric). */
  readonly memoHits: number
  /** Cached entries deleted because the resolver 404'd. */
  readonly invalidations: number
}

export interface MemoizedInstallationResolver {
  (owner: string, name: string): Promise<number>
  /** Cumulative counters — the "before/after per-cycle request counts" record (rm-162 acceptance). */
  readonly stats: () => InstallationResolutionMemoStats
  /** Drop one cached mapping (also used by the 404 path). */
  readonly invalidate: (owner: string, name: string) => void
  /** Drop every cached mapping (unwiring hygiene). */
  readonly clear: () => void
}

/**
 * Default TTL: 1h. Aligned with the installation-token cache cadence — long
 * enough that steady-state 60s cycles make zero resolver calls for an hour,
 * short enough that an uninstall self-heals without a restart.
 */
export const INSTALLATION_RESOLUTION_TTL_MS = 60 * 60 * 1000

function cacheKey(owner: string, name: string): string {
  // GitHub owner/repo names are case-insensitive identifiers; the resolver's
  // canonical casing is preserved in the cached VALUE, only the key folds.
  return `${owner.toLowerCase()}/${name.toLowerCase()}`
}

export function createMemoizedInstallationResolver(
  resolve: (owner: string, name: string) => Promise<number>,
  opts: {ttlMs?: number; now?: () => number} = {},
): MemoizedInstallationResolver {
  const ttlMs = opts.ttlMs ?? INSTALLATION_RESOLUTION_TTL_MS
  const now = opts.now ?? (() => Date.now())

  interface CacheEntry {
    readonly installationId: number
    readonly expiresAt: number
  }

  const cache = new Map<string, CacheEntry>()
  let resolverCalls = 0
  let memoHits = 0
  let invalidations = 0

  const memoized = async (owner: string, name: string): Promise<number> => {
    const key = cacheKey(owner, name)
    const cached = cache.get(key)
    if (cached !== undefined && now() < cached.expiresAt) {
      memoHits += 1
      logger.debug('installation resolution memo hit — zero resolver calls this cycle (rm-162)')
      return cached.installationId
    }
    resolverCalls += 1
    try {
      const installationId = await resolve(owner, name)
      cache.set(key, {installationId, expiresAt: now() + ttlMs})
      return installationId
    } catch (error) {
      // 404 = the App is no longer installed here (or never was): the
      // mapping must not survive — an expired-but-present entry would keep
      // minting tokens against a dead installation.
      if ((error as {status?: unknown} | null | undefined)?.status === 404 && cache.delete(key)) invalidations += 1
      throw error
    }
  }

  return Object.assign(memoized, {
    stats: () => ({resolverCalls, memoHits, invalidations}),
    invalidate: (owner: string, name: string) => {
      cache.delete(cacheKey(owner, name))
    },
    clear: () => {
      cache.clear()
    },
  })
}
