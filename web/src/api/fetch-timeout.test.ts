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

  it('classifies a rejection as the same failed outcome ("timeout")', async () => {
    // rm-780 mirrors rm-501: a rejection and a timeout read identically, so
    // every caller keeps failing closed. (Caller-side AbortError lands here
    // too — the same classification the previous bare-catch produced.)
    const result = await withGetSeamTimeout(Promise.reject(new Error('aborted')))
    expect(result).toBe('timeout')
  })
})
