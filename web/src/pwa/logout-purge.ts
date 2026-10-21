/**
 * Logout cache purge — page-side SW cache cleanup.
 *
 * The purge is sweep-only: no runtime caches exist at head (operator responses
 * are network-only/no-store; rm-274 truthing), so the only cache with an owner
 * to clear is the legacy monitoring-era orphan below. The direct Cache Storage
 * delete works even if the SW is mid-update or the tab is closing, and the
 * PURGE_RUNTIME message tells the SW to sweep the same cache as a race guard.
 *
 * The precache is NOT purged — the app shell must survive logout so the next
 * user gets an instant load.
 *
 * All calls are guarded for environments without caches/serviceWorker (e.g.
 * non-HTTPS, old browsers, test environments).
 */

/**
 * Legacy cache name from the monitoring-era SW. Clients that installed the old
 * SW may still have this cache on disk. Purge it so stale monitoring data does
 * not linger after migration.
 */
const LEGACY_MONITORING_CACHE = 'monitoring-v1'

/**
 * Purge operator-side caches on logout or auth change. Clears the legacy
 * MONITORING_CACHE orphan without touching the precache (shell continuity).
 * Safe to call without awaiting — errors are swallowed (best-effort).
 */
export function purgeOperatorCache(): void {
  // Direct Cache Storage delete — robust even if SW is mid-update.
  if (typeof caches !== 'undefined') {
    // Legacy purge: remove orphaned monitoring-v1 cache from pre-migration clients.
    caches.delete(LEGACY_MONITORING_CACHE).catch(() => {
      // Best-effort — ignore errors (quota, permissions, etc.)
    })
  }

  // Tell the SW to also purge — backup for race conditions.
  if (typeof navigator !== 'undefined' && navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({type: 'PURGE_RUNTIME'})
  }
}
