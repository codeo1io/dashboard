/**
 * purgeOperatorCache — page-side belt-and-braces cache cleanup for logout.
 *
 * Cycle-20 truth (rm-274): the service worker is a KILL SWITCH (src/sw.ts) —
 * on activate it purges every cache and unregisters itself. It carries no
 * `message` handler, so the legacy PURGE_RUNTIME postMessage was dead code
 * and is gone. This page-side sweep remains for clients whose SW never
 * re-activates: it deletes every operator-data-bearing cache by name, plus
 * the scope-dependent workbox names left by the pre-kill-switch SW era
 * (fff198c) that a fixed list would miss.
 */

import {LEGACY_MONITORING_CACHE, OPERATOR_RUNTIME_CACHE, WORKBOX_CACHE_PREFIX_PATTERN} from './cache-names.ts'

export const purgeOperatorCache = (): void => {
  const cachesApi = globalThis.caches
  if (!cachesApi) {
    return
  }

  for (const name of [OPERATOR_RUNTIME_CACHE, LEGACY_MONITORING_CACHE]) {
    void cachesApi.delete(name)
  }

  const listCaches = cachesApi.keys?.bind(cachesApi)
  if (!listCaches) {
    return
  }

  void listCaches()
    .then((keys) => {
      for (const key of keys) {
        if (WORKBOX_CACHE_PREFIX_PATTERN.test(key)) {
          void cachesApi.delete(key)
        }
      }
    })
    .catch(() => {
      // Swallow — logout must proceed even if cache enumeration fails.
    })
}
