/**
 * Operator data cache names. Single source of truth for page-side logout
 * purge and tests.
 */

export const OPERATOR_RUNTIME_CACHE = 'operator-runtime-v1'

/**
 * Cache name from the pre-operator monitoring era. Kept in the logout purge
 * so clients that installed that era's caches are cleaned too.
 */
export const LEGACY_MONITORING_CACHE = 'monitoring-v1'

/**
 * Cache name pattern from the workbox service-worker era (pre-kill-switch).
 * Workbox built names like `workbox-precache-v2-<scope>` and
 * `workbox-runtime-v2-<scope>` — scope-dependent, so they can only be
 * matched by prefix, never listed exhaustively.
 */
export const WORKBOX_CACHE_PREFIX_PATTERN = /^workbox-(?:precache|runtime)-/
