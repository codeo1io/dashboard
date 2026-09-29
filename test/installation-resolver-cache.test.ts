import {describe, expect, it, vi} from 'vitest'
import {createMemoizedInstallationResolver, INSTALLATION_RESOLVER_TTL_MS} from '../src/github/installation-resolver-cache.ts'

function makeUnderlying() {
  return vi.fn(async (owner: string, name: string) => {
    // Deterministic installation id per repo so hits/misses are observable
    return 1000 + (owner.length + name.length)
  })
}

describe('createMemoizedInstallationResolver', () => {
  it('miss then hit: the second resolve makes zero upstream calls', async () => {
    const underlying = makeUnderlying()
    let clock = 1_000_000
    const resolver = createMemoizedInstallationResolver(underlying, {now: () => clock})

    const first = await resolver('codeo1io', '.github')
    expect(first).toBe(1000 + 'codeo1io'.length + '.github'.length)
    expect(underlying).toHaveBeenCalledTimes(1)

    const second = await resolver('codeo1io', '.github')
    expect(second).toBe(first)
    expect(underlying).toHaveBeenCalledTimes(1) // served from cache

    const stats = resolver.stats()
    expect(stats.hits).toBe(1)
    expect(stats.misses).toBe(1)
    expect(stats.upstreamCalls).toBe(1)
    expect(stats.stored).toBe(1)
  })

  it('keys are case-insensitive (GitHub logins)', async () => {
    const underlying = makeUnderlying()
    const resolver = createMemoizedInstallationResolver(underlying, {now: () => 1})
    await resolver('CodeO1IO', '.github')
    await resolver('codeo1io', '.GITHUB')
    expect(underlying).toHaveBeenCalledTimes(1)
  })

  it('distinct repos are cached independently', async () => {
    const underlying = makeUnderlying()
    const resolver = createMemoizedInstallationResolver(underlying, {now: () => 1})
    await resolver('codeo1io', 'dashboard')
    await resolver('codeo1io', 'infra')
    expect(underlying).toHaveBeenCalledTimes(2)
    // Repeat both — both now served from cache
    await resolver('codeo1io', 'dashboard')
    await resolver('codeo1io', 'infra')
    expect(underlying).toHaveBeenCalledTimes(2)
    expect(resolver.stats().hits).toBe(2)
  })

  it('TTL expiry forces a fresh upstream call', async () => {
    const underlying = makeUnderlying()
    let clock = 0
    const resolver = createMemoizedInstallationResolver(underlying, {ttlMs: 1_000, now: () => clock})

    await resolver('codeo1io', '.github')
    expect(underlying).toHaveBeenCalledTimes(1)

    clock += 999 // still fresh
    await resolver('codeo1io', '.github')
    expect(underlying).toHaveBeenCalledTimes(1)

    clock += 2 // now expired
    await resolver('codeo1io', '.github')
    expect(underlying).toHaveBeenCalledTimes(2)
    expect(resolver.stats().misses).toBe(2)
  })

  it('default TTL is 24h', () => {
    expect(INSTALLATION_RESOLVER_TTL_MS).toBe(24 * 60 * 60 * 1000)
  })

  it('failures are never cached: a rejected lookup retries next call', async () => {
    let calls = 0
    const underlying = vi.fn(async () => {
      calls++
      if (calls === 1) throw new Error('transient')
      return 42
    })
    const resolver = createMemoizedInstallationResolver(underlying, {now: () => 1})

    await expect(resolver('codeo1io', 'flake')).rejects.toThrow('transient')
    await expect(resolver('codeo1io', 'flake')).resolves.toBe(42)
    expect(underlying).toHaveBeenCalledTimes(2)
  })

  it('explicit invalidation: a 404 AFTER a successful cached lookup evicts the mapping', async () => {
    let calls = 0
    const underlying = vi.fn(async () => {
      calls++
      if (calls === 1) return 7 // cycle 1 stores id 7; every later call 404s
      const error = new Error('Not Found') as Error & {status: number}
      error.status = 404
      throw error
    })
    let clock = 0
    const resolver = createMemoizedInstallationResolver(underlying, {ttlMs: 10_000, now: () => clock})

    // Cycle 1: store id 7
    await expect(resolver('codeo1io', 'gone')).resolves.toBe(7)
    // Cycle 2: TTL still fresh — served from cache, upstream untouched
    clock += 5_000
    await expect(resolver('codeo1io', 'gone')).resolves.toBe(7)
    expect(underlying).toHaveBeenCalledTimes(1)
    // Cycle 3: TTL expired, upstream now 404s (repo uninstalled) — error
    // propagates AND the stale mapping is evicted
    clock += 10_000
    await expect(resolver('codeo1io', 'gone')).rejects.toThrow('Not Found')
    // Cycle 4: not silently resurrected from the evicted cache — upstream asked again
    await expect(resolver('codeo1io', 'gone')).rejects.toThrow('Not Found')
    expect(underlying).toHaveBeenCalledTimes(3)
    expect(resolver.stats().evictions).toBe(1)
  })
})
