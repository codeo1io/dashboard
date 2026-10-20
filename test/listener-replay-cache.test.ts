/**
 * rm-2106 unit suite: the bounded ingest replay-window cache in isolation.
 *
 * TTL semantics mirror verifyIngestSignature (src/listener/ingest-auth.ts):
 * the default window IS that module's DEFAULT_WINDOW_SECONDS, and an entry
 * blocks strictly inside firstSeen + window — at exactly window seconds the
 * entry is gone, the same instant the signature window stops accepting the
 * original timestamp (see the boundary-second assertions).
 */
import {describe, expect, it} from 'vitest'

import {DEFAULT_WINDOW_SECONDS} from '../src/listener/ingest-auth.ts'
import {createIngestReplayCache, replayCacheKey} from '../src/listener/replay-cache.ts'

const NOW = 1_800_000_000

describe('ingest replay cache (rm-2106)', () => {
  it('first delivery fresh; verbatim replay within the window replay', () => {
    const cache = createIngestReplayCache()
    expect(cache.checkAndRecord('ingest-key', 'payload', NOW)).toBe('fresh')
    expect(cache.checkAndRecord('ingest-key', 'payload', NOW + 1)).toBe('replay')
  })

  it('TTL equals the ingest auth window constant — bounds exactly at the window', () => {
    const cache = createIngestReplayCache()
    cache.checkAndRecord('k', 'body', NOW)
    expect(cache.checkAndRecord('k', 'body', NOW + DEFAULT_WINDOW_SECONDS - 1)).toBe('replay')
    // At exactly window seconds the entry expires: the cache can never block
    // longer than the signature window accepts the replayed timestamp.
    expect(cache.checkAndRecord('k', 'body', NOW + DEFAULT_WINDOW_SECONDS)).toBe('fresh')
  })

  it('keyed on identity AND payload — either differing is a fresh delivery', () => {
    const cache = createIngestReplayCache()
    cache.checkAndRecord('key-a', 'body-1', NOW)
    expect(cache.checkAndRecord('key-b', 'body-1', NOW)).toBe('fresh') // different sender identity
    expect(cache.checkAndRecord('key-a', 'body-2', NOW)).toBe('fresh') // different payload
  })

  it('windowSeconds option overrides the default TTL', () => {
    const cache = createIngestReplayCache({windowSeconds: 10})
    cache.checkAndRecord('k', 'b', NOW)
    expect(cache.checkAndRecord('k', 'b', NOW + 9)).toBe('replay')
    expect(cache.checkAndRecord('k', 'b', NOW + 10)).toBe('fresh')
  })

  it('bounded: maxEntries evicts the oldest live entry, newest still replay', () => {
    const cache = createIngestReplayCache({windowSeconds: 300, maxEntries: 2})
    expect(cache.checkAndRecord('k', 'oldest', NOW)).toBe('fresh')
    expect(cache.checkAndRecord('k', 'middle', NOW)).toBe('fresh')
    expect(cache.checkAndRecord('k', 'newest', NOW)).toBe('fresh') // evicts 'oldest'
    expect(cache.checkAndRecord('k', 'oldest', NOW + 1)).toBe('fresh') // evicted → re-accepted
    expect(cache.checkAndRecord('k', 'newest', NOW + 1)).toBe('replay') // still live
  })

  it('expired entries reclaim capacity before the cap is consulted', () => {
    const cache = createIngestReplayCache({windowSeconds: 10, maxEntries: 1})
    expect(cache.checkAndRecord('k', 'first', NOW)).toBe('fresh')
    // At NOW+11 'first' is expired — pruning frees the single slot with no eviction.
    expect(cache.checkAndRecord('k', 'second', NOW + 11)).toBe('fresh')
    expect(cache.checkAndRecord('k', 'second', NOW + 12)).toBe('replay')
  })

  it('replayCacheKey digests identity and payload (raw key material never lands in the key)', () => {
    const key = replayCacheKey('secret-ingest-key', 'raw body')
    expect(key).toMatch(/^[0-9a-f]{16}:[0-9a-f]{64}$/)
    expect(key).not.toContain('secret-ingest-key')
  })
})
