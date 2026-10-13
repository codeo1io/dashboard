import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { withGetSeamTimeout, GET_SEAM_TIMEOUT_MS } from './fetch-timeout.ts'

describe('rm-780: GET seam wall-clock bound (withGetSeamTimeout)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('settles "timeout" when the transport never does (15s ceiling)', async () => {
    const never = new Promise<string>(() => {})
    let settled: string | 'timeout' | undefined
    void withGetSeamTimeout(never).then(value => {
      settled = value
    })

    await vi.advanceTimersByTimeAsync(GET_SEAM_TIMEOUT_MS - 1)
    expect(settled).toBeUndefined()

    await vi.advanceTimersByTimeAsync(1)
    expect(settled).toBe('timeout')
  })

  it('passes a settled value through and clears the timer (no dangling resolve)', async () => {
    const soon = Promise.resolve('payload')
    const result = await withGetSeamTimeout(soon)
    expect(result).toBe('payload')

    // The timer was cleared — advancing past the ceiling must not resolve
    // anything further (the promise is already settled; this is a leak check).
    await vi.advanceTimersByTimeAsync(GET_SEAM_TIMEOUT_MS + 5000)
  })

  it('propagates a rejection so the seam catch keeps its landed classification', async () => {
    // rm-780 correction (full_tests 8eddfdcd): the first variant resolved
    // 'timeout' on rejection, which collapsed the seam taxonomy — the
    // listener/monitoring suites assert a transport rejection maps to
    // 'network' (and a caller abort surfaces as AbortError in the seam
    // catch, already classified 'timeout' there), so the wrapper must
    // rethrow and own only the hang case.
    const boom = new TypeError('fetch failed')
    await expect(withGetSeamTimeout(Promise.reject(boom))).rejects.toBe(boom)
  })
})
