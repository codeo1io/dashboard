/**
 * rm-479/rm-251 contract tests for the shared bounded-poll hook.
 *
 * Pins the wiring-level contracts that views rely on by construction:
 * - config captured at MOUNT (intervalMs/refetch flags) — module-constant
 *   configs are the contract; late changes must not reschedule timers,
 * - pauseWhenHidden: hidden tabs poll nothing, returning to visible polls
 *   immediately; default (false) keeps polling hidden tabs,
 * - enabled=false (rm-208): a disabled loop issues no fetch from any trigger
 *   (interval, focus, visibility); re-enabling resumes on the next trigger,
 * - timeout race delivers timeoutResult AND releases the latch,
 * - unmount aborts the in-flight fetch.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useBoundedPoll } from './useBoundedPoll.ts'

interface PollResult {
  readonly tag: 'ok' | 'timeout'
}

interface HarnessConfig {
  readonly intervalMs?: number
  readonly pauseWhenHidden?: boolean
  readonly fetcher?: (abortSignal: AbortSignal) => Promise<PollResult>
}

function makeConfig(overrides: HarnessConfig = {}) {
  return {
    fetcher:
      overrides.fetcher ??
      vi.fn(async _abortSignal => ({tag: 'ok'} as PollResult)),
    timeoutMs: 5000,
    intervalMs: overrides.intervalMs ?? 30000,
    timeoutResult: {tag: 'timeout'} as PollResult,
    onResult: vi.fn(),
    pauseWhenHidden: overrides.pauseWhenHidden,
  }
}

function setHidden(hidden: boolean): void {
  Object.defineProperty(document, 'hidden', {value: hidden, configurable: true})
  Object.defineProperty(document, 'visibilityState', {
    value: hidden ? 'hidden' : 'visible',
    configurable: true,
  })
}

describe('useBoundedPoll — mount-time wiring', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setHidden(false)
  })
  afterEach(() => {
    vi.useRealTimers()
    setHidden(false)
  })

  it('polls once on mount and again on each interval tick', async () => {
    const config = makeConfig()
    const {result} = renderHook(() => useBoundedPoll<PollResult>(config))
    expect(result.current.poll).toBeTypeOf('function')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(config.fetcher).toHaveBeenCalledTimes(1)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000)
    })
    expect(config.fetcher).toHaveBeenCalledTimes(2)
  })

  it('rm-479 contract: intervalMs is captured at mount — a later change never reschedules', async () => {
    const config = makeConfig({intervalMs: 30000})
    const {rerender} = renderHook(() => useBoundedPoll<PollResult>(config))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(config.fetcher).toHaveBeenCalledTimes(1)

    // Simulate a re-render whose config carries a shorter interval.
    rerender()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    // The old 30s cadence still governs: no poll at t+5s...
    expect(config.fetcher).toHaveBeenCalledTimes(1)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(25000)
    })
    // ...and exactly one fires at t+30s.
    expect(config.fetcher).toHaveBeenCalledTimes(2)
  })

  it('rm-479: pauseWhenHidden skips polls while hidden and resumes immediately on visible', async () => {
    const config = makeConfig({pauseWhenHidden: true})
    renderHook(() => useBoundedPoll<PollResult>(config))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(config.fetcher).toHaveBeenCalledTimes(1)

    setHidden(true)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000)
      await vi.advanceTimersByTimeAsync(30000)
    })
    // Hidden tab: interval keeps ticking but no poll is issued.
    expect(config.fetcher).toHaveBeenCalledTimes(1)

    await act(async () => {
      setHidden(false)
      document.dispatchEvent(new Event('visibilitychange'))
      await vi.advanceTimersByTimeAsync(0)
    })
    // Returning to visible resumes with an immediate poll.
    expect(config.fetcher).toHaveBeenCalledTimes(2)
  })

  it('default semantics (pauseWhenHidden unset): hidden tabs keep polling', async () => {
    const config = makeConfig()
    renderHook(() => useBoundedPoll<PollResult>(config))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    setHidden(true)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000)
    })
    expect(config.fetcher).toHaveBeenCalledTimes(2)
  })

  it('rm-208: enabled=false (read live) stops the loop — ticks, focus and visibility issue no fetch', async () => {
    const config = {...makeConfig({pauseWhenHidden: true}), enabled: true}
    const {rerender} = renderHook(() => useBoundedPoll<PollResult>(config))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(config.fetcher).toHaveBeenCalledTimes(1)

    // A terminal condition flips the gate off; the next render captures it.
    config.enabled = false
    rerender()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000)
    })
    // The interval keeps ticking but a disabled loop issues no poll.
    expect(config.fetcher).toHaveBeenCalledTimes(1)

    // Neither focus nor visibility may resume a disabled loop.
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      document.dispatchEvent(new Event('visibilitychange'))
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(config.fetcher).toHaveBeenCalledTimes(1)

    // Re-enabling resumes on the next trigger (interval tick here).
    config.enabled = true
    rerender()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000)
    })
    expect(config.fetcher).toHaveBeenCalledTimes(2)
  })

  it('a hung fetch loses the timeout race: timeoutResult is delivered and the latch frees', async () => {
    const neverSettles = vi.fn((): Promise<PollResult> => new Promise<PollResult>(() => {}))
    const config = makeConfig({fetcher: neverSettles})
    renderHook(() => useBoundedPoll<PollResult>(config))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(config.onResult).toHaveBeenCalledWith({tag: 'timeout'})
    // Latch released: the next interval tick issues a fresh poll.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(25000)
    })
    expect(neverSettles).toHaveBeenCalledTimes(2)
  })

  it('unmount aborts the in-flight fetch', async () => {
    let observedSignal: AbortSignal | undefined
    const hanging = vi.fn((signal: AbortSignal): Promise<PollResult> => {
      observedSignal = signal
      return new Promise<PollResult>(() => {})
    })
    const {unmount} = renderHook(() =>
      useBoundedPoll<PollResult>(makeConfig({fetcher: hanging})),
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(observedSignal?.aborted).toBe(false)
    unmount()
    expect(observedSignal?.aborted).toBe(true)
  })
})
