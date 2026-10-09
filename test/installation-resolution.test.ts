/**
 * rm-162 — memoized installation resolution: hit / miss / TTL expiry / 404
 * invalidation matrix, plus the bounded conditional-read cache primitives.
 * All tests inject fakes and a controllable clock; no network.
 *
 * The headline acceptance pinned here: a steady-state cycle makes ZERO
 * resolver calls (memo hit) — the pre-rm-162 wiring paid one
 * GET /repos/{o}/{r}/installation per metadata-only repo per 60s cycle
 * forever, plus one for the metadata reader's codeo1io/.github lookup.
 */

import {describe, expect, it, vi} from 'vitest'
import {
  createConditionalContentCache,
  ifNoneMatchHeader,
  normalizeEtag,
} from '../src/github/conditional-reads.ts'
import {createMemoizedInstallationResolver} from '../src/github/installation-resolution.ts'

function notFound(): Error & {status: number} {
  const error = new Error('Not Found') as Error & {status: number}
  error.status = 404
  return error
}

function serverError(): Error & {status: number} {
  const error = new Error('Server Error') as Error & {status: number}
  error.status = 500
  return error
}

describe('createMemoizedInstallationResolver', () => {
  it('cold call hits the resolver once; the next cycle is a memo hit with ZERO resolver calls', async () => {
    const resolve = vi.fn(async () => 7)
    const now = vi.fn(() => 1_000)
    const memoized = createMemoizedInstallationResolver(resolve, {now})

    await expect(memoized('Org', 'Repo')).resolves.toBe(7) // miss
    await expect(memoized('org', 'repo')).resolves.toBe(7) // hit — case-insensitive key

    expect(resolve).toHaveBeenCalledTimes(1)
    expect(memoized.stats()).toEqual({resolverCalls: 1, memoHits: 1, invalidations: 0})
  })

  it('TTL expiry re-resolves and refreshes the entry (the second invalidation path)', async () => {
    let time = 1_000
    const now = vi.fn(() => time)
    let id = 7
    const resolve = vi.fn(async () => id)
    const memoized = createMemoizedInstallationResolver(resolve, {ttlMs: 60_000, now})

    await expect(memoized('org', 'repo')).resolves.toBe(7)
    time += 59_999 // still inside the TTL
    await expect(memoized('org', 'repo')).resolves.toBe(7)
    expect(resolve).toHaveBeenCalledTimes(1)

    id = 9
    time += 2 // now past expiry
    await expect(memoized('org', 'repo')).resolves.toBe(9)
    expect(resolve).toHaveBeenCalledTimes(2)
  })

  it('a 404 from the resolver deletes the cached mapping (an uninstall cannot keep minting tokens against a dead installation)', async () => {
    let time = 1_000
    const now = vi.fn(() => time)
    const resolve = vi.fn<(owner: string, name: string) => Promise<number>>()
      .mockResolvedValueOnce(7)
      .mockRejectedValueOnce(notFound())
    const memoized = createMemoizedInstallationResolver(resolve, {ttlMs: 60_000, now})

    await expect(memoized('org', 'repo')).resolves.toBe(7)
    time += 10 * 60_000 // expiry forces a re-resolve, which 404s
    await expect(memoized('org', 'repo')).rejects.toThrow('Not Found')

    expect(memoized.stats()).toEqual({resolverCalls: 2, memoHits: 0, invalidations: 1})
    // And the entry is gone: the next call is a fresh resolver call, not a
    // poisoned cache hit.
    resolve.mockResolvedValue(11)
    await expect(memoized('org', 'repo')).resolves.toBe(11)
    expect(resolve).toHaveBeenCalledTimes(3)
  })

  it('a transient 5xx propagates but does NOT discard a good mapping', async () => {
    let time = 1_000
    const now = vi.fn(() => time)
    const resolve = vi.fn<(owner: string, name: string) => Promise<number>>()
      .mockResolvedValueOnce(7)
      .mockRejectedValueOnce(serverError())
    const memoized = createMemoizedInstallationResolver(resolve, {ttlMs: 60_000, now})

    await expect(memoized('org', 'repo')).resolves.toBe(7)
    time += 60_000 // expiry → re-resolve → 500
    await expect(memoized('org', 'repo')).rejects.toThrow('Server Error')

    // The stale-but-good entry was kept (404-only invalidation): a retry
    // inside a fresh TTL window re-populates cleanly, and the invalidation
    // counter proves nothing was deleted.
    expect(memoized.stats().invalidations).toBe(0)
    resolve.mockResolvedValue(7)
    await expect(memoized('org', 'repo')).resolves.toBe(7)
  })

  it('different repos memoize independently; explicit invalidate/clear work', async () => {
    const resolve = vi.fn(async (_owner: string, name: string) => (name === 'a' ? 1 : 2))
    const memoized = createMemoizedInstallationResolver(resolve, {now: () => 0})

    await expect(memoized('org', 'a')).resolves.toBe(1)
    await expect(memoized('org', 'b')).resolves.toBe(2)
    await expect(memoized('org', 'a')).resolves.toBe(1)
    expect(resolve).toHaveBeenCalledTimes(2)

    memoized.invalidate('org', 'a')
    await expect(memoized('org', 'a')).resolves.toBe(1)
    expect(resolve).toHaveBeenCalledTimes(3) // re-resolved after explicit invalidation

    memoized.clear()
    await expect(memoized('org', 'b')).resolves.toBe(2)
    expect(resolve).toHaveBeenCalledTimes(4)
  })
})

describe('conditional-reads primitives (rm-162)', () => {
  it('ifNoneMatchHeader carries the stored ETag verbatim (weak validators included) and is empty without one', () => {
    expect(ifNoneMatchHeader(null)).toEqual({})
    expect(ifNoneMatchHeader('')).toEqual({})
    expect(ifNoneMatchHeader('W/"deadbeef"')).toEqual({'If-None-Match': 'W/"deadbeef"'})
  })

  it('normalizeEtag: blank/absent → null; whitespace trimmed', () => {
    expect(normalizeEtag(undefined)).toBeNull()
    expect(normalizeEtag('')).toBeNull()
    expect(normalizeEtag('   ')).toBeNull()
    expect(normalizeEtag(' "x" ')).toBe('"x"')
    expect(normalizeEtag(42)).toBeNull()
  })

  it('createConditionalContentCache: insert-order eviction at the bound; store refreshes recency; invalidate drops one', () => {
    const cache = createConditionalContentCache(2)
    cache.store('a', '"1"', 'content-a')
    cache.store('b', '"2"', 'content-b')
    expect(cache.get('a')).toEqual({etag: '"1"', content: 'content-a'})

    cache.store('c', '"3"', 'content-c') // bound hit → 'a' (oldest) evicted
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toEqual({etag: '"2"', content: 'content-b'})
    expect(cache.get('c')).toEqual({etag: '"3"', content: 'content-c'})

    cache.store('b', '"2b"', 'content-b2') // re-store refreshes recency
    cache.store('d', '"4"', 'content-d') // evicts 'c' now, not 'b'
    expect(cache.get('c')).toBeUndefined()
    expect(cache.get('b')).toEqual({etag: '"2b"', content: 'content-b2'})

    cache.invalidate('b')
    expect(cache.get('b')).toBeUndefined()
  })
})
