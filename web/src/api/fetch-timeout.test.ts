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

describe('rm-847: the seam bound kills the transport (withGetSeamTimeout + controller)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('aborts the caller-owned controller at the bound — the underlying signal flips aborted, not just the await racing to "timeout"', async () => {
    const controller = new AbortController()
    let transportAborted = false
    controller.signal.addEventListener('abort', () => {
      transportAborted = true
    })
    // Never-resolving transport: only the seam's abort can end it — the
    // hung-GET shape that used to leak its connection past the race when
    // the equal-duration poll bound disarmed useBoundedPoll's abort.
    const wedged = new Promise<never>(() => {})
    void withGetSeamTimeout(wedged, controller)

    await vi.advanceTimersByTimeAsync(GET_SEAM_TIMEOUT_MS - 1)
    expect(controller.signal.aborted).toBe(false)
    expect(transportAborted).toBe(false)

    await vi.advanceTimersByTimeAsync(1)
    expect(controller.signal.aborted).toBe(true)
    expect(transportAborted).toBe(true)
  })

  it('a seam-aborted transport rejects AbortError after the race settled "timeout" — handled by the seam, never reclassified as network', async () => {
    const controller = new AbortController()
    const transport = new Promise<never>((_, reject) => {
      controller.signal.addEventListener('abort', () => {
        reject(new DOMException('The operation was aborted.', 'AbortError'))
      })
    })
    const bounded = withGetSeamTimeout(transport, controller)

    await vi.advanceTimersByTimeAsync(GET_SEAM_TIMEOUT_MS)
    await expect(bounded).resolves.toBe('timeout')
    // The killed transport still rejects (fetch/json observe the abort); the
    // seam's then() already handled it, so the late rejection is not
    // unhandled and classifyAborts never maps the seam's OWN abort to a
    // network fault.
    await expect(transport).rejects.toMatchObject({name: 'AbortError'})
  })

  it('keeps the no-controller form working for non-fetch uses of the seam', async () => {
    const bounded = withGetSeamTimeout(new Promise<never>(() => {}))
    await vi.advanceTimersByTimeAsync(GET_SEAM_TIMEOUT_MS)
    await expect(bounded).resolves.toBe('timeout')
  })
})
