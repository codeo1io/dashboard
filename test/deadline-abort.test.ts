import {describe, expect, it} from 'vitest'
import {deadlineOrWithAbort} from '../src/github/aggregator.ts'

// rm-221 (2026-09-29): `deadlineOr` raced a timer against the work promise but
// never aborted the loser — a hung transport kept its socket open past the
// deadline until its own per-request ceiling (or the ~300s undici default;
// see the rm-156 solution doc). The installation enumeration now runs under
// `deadlineOrWithAbort`, which aborts the signal at the deadline boundary and
// lets `createBoundedFetch` tear the socket down. These tests pin the abort
// semantics with fast deadlines and real scheduler timing (no fake timers —
// the point is that the abort wiring fires on the live event loop).

describe('deadlineOrWithAbort (rm-221)', () => {
  it('returns the work value and never aborts when the work settles in time', async () => {
    const aborts: string[] = []
    const value = await deadlineOrWithAbort(async signal => {
      return new Promise<string>(resolve => {
        signal.addEventListener('abort', () => aborts.push('aborted'))
        setTimeout(() => resolve('done'), 10)
      })
    }, 5_000, 'fast work')
    expect(value).toBe('done')
    expect(aborts).toEqual([])
  })

  it('aborts the in-flight work at the deadline and surfaces the deadline marker', async () => {
    let abortObserved = false
    const result = await deadlineOrWithAbort(async signal => {
      return new Promise<string>(_resolve => {
        // A transport that never settles on its own — mirrors a hung
        // upstream page. Only the deadline's abort can move it.
        signal.addEventListener('abort', () => {
          abortObserved = true
        })
      })
    }, 40, 'hung enumeration')

    expect((result as Error).name).toBe('DeadlineExceededError')
    expect((result as Error).message).toContain('hung enumeration')
    // abort() fires listeners synchronously; give the event loop one turn
    // before asserting so the listener can run.
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(abortObserved).toBe(true)
  })

  it('the deadline value wins even when the loser then rejects', async () => {
    const result = await deadlineOrWithAbort(async signal => {
      return new Promise<string>((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          // The aborted loser surfaces as a transport rejection AFTER the
          // deadline already settled — it must not reach the caller.
          setTimeout(() => reject(new Error('transport aborted')), 5)
        })
      })
    }, 40, 'loser rejects late')
    expect((result as Error).name).toBe('DeadlineExceededError')
    // Give the late rejection time to land unobserved.
    await new Promise(resolve => setTimeout(resolve, 30))
  })
})
