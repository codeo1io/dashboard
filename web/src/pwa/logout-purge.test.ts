/**
 * logout-purge tests — verifies the page-side SW cache cleanup.
 *
 * Cycle-20 (rm-274): the kill-switch service worker has no message handler,
 * so the PURGE_RUNTIME postMessage is gone. The purge is name-list +
 * workbox-prefix sweep. Mocks caches.delete/keys to assert both paths.
 */

import {beforeEach, describe, expect, it, vi} from 'vitest'
import {purgeOperatorCache} from './logout-purge.ts'
import {OPERATOR_RUNTIME_CACHE, LEGACY_MONITORING_CACHE} from './cache-names.ts'

describe('purgeOperatorCache', () => {
  const mockCachesDelete = vi.fn().mockResolvedValue(true)
  const mockCachesKeys = vi.fn().mockResolvedValue([])

  const installCaches = (keys: typeof mockCachesKeys | undefined): void => {
    Object.defineProperty(globalThis, 'caches', {
      writable: true,
      configurable: true,
      value: keys
        ? {delete: mockCachesDelete, keys}
        : {delete: mockCachesDelete},
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    installCaches(mockCachesKeys)
  })

  it('calls caches.delete with the operator runtime cache name', () => {
    purgeOperatorCache()
    expect(mockCachesDelete).toHaveBeenCalledWith(OPERATOR_RUNTIME_CACHE)
  })

  it('LEGACY PURGE: also calls caches.delete with the old monitoring-v1 cache name', () => {
    purgeOperatorCache()
    expect(mockCachesDelete).toHaveBeenCalledWith(LEGACY_MONITORING_CACHE)
  })

  it('WORKBOX PURGE: deletes scope-dependent workbox cache names from the pre-kill-switch era', async () => {
    mockCachesKeys.mockResolvedValue([
      'workbox-precache-v2-https://dashboard.example.com/',
      'workbox-runtime-v2-https://dashboard.example.com/',
      'unrelated-cache-v9',
    ])
    purgeOperatorCache()
    await vi.waitFor(() => {
      expect(mockCachesDelete).toHaveBeenCalledWith('workbox-precache-v2-https://dashboard.example.com/')
      expect(mockCachesDelete).toHaveBeenCalledWith('workbox-runtime-v2-https://dashboard.example.com/')
    })
    expect(mockCachesDelete).not.toHaveBeenCalledWith('unrelated-cache-v9')
  })

  it('does not post messages to the SW controller (kill-switch SW has no message handler)', () => {
    const postMessage = vi.fn()
    Object.defineProperty(navigator, 'serviceWorker', {
      writable: true,
      configurable: true,
      value: {controller: {postMessage}},
    })
    purgeOperatorCache()
    expect(postMessage).not.toHaveBeenCalled()
  })

  it('does not throw when caches is undefined', () => {
    Object.defineProperty(globalThis, 'caches', {
      writable: true,
      configurable: true,
      value: undefined,
    })
    expect(() => purgeOperatorCache()).not.toThrow()
  })

  it('does not throw when caches.keys is absent (delete-only environment)', () => {
    installCaches(undefined)
    expect(() => purgeOperatorCache()).not.toThrow()
    expect(mockCachesDelete).toHaveBeenCalledTimes(2)
  })

  it('does not throw when keys() rejects', async () => {
    mockCachesKeys.mockRejectedValue(new Error('quota'))
    purgeOperatorCache()
    await vi.waitFor(() => {
      expect(mockCachesKeys).toHaveBeenCalledTimes(1)
    })
    // Name-list deletions still happened before the sweep failed.
    expect(mockCachesDelete).toHaveBeenCalledTimes(2)
  })
})
