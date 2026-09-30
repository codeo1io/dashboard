import {afterEach, describe, expect, it, vi} from 'vitest'
import {buildLaunchClient} from '../public/operator-launch.js'
import {buildApprovalClient} from '../public/operator-stream.js'

/**
 * rm-276 hang-regression tests.
 *
 * The approval/launch browser-fetch wrappers carry AbortSignal.timeout bounds
 * (mirroring the cancel client's CANCEL_FETCH_TIMEOUT_MS). A hang used to wedge
 * interactive controls forever: the approve mutex, the launch submit latch, the
 * ackingId latch, and the logout flow all release only after the fetch settles.
 *
 * These tests prove the bounds fire. They stub globalThis.fetch with a fetch
 * that behaves like a REAL browser fetch under a server hang: it never settles
 * on its own and rejects only when its abort signal fires. (The default
 * vi.fn-based stub ignores init.signal, which would make any timeout
 * untestable.)
 */

/** Build a fetch stub that only rejects when the request's abort signal fires. */
function hangingFetch(): ReturnType<typeof vi.fn> {
  return vi.fn(
    async (_input: unknown, init?: {signal?: AbortSignal}) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted due to timeout', 'TimeoutError'))
        })
      }),
  )
}

const realFetch = globalThis.fetch

/** Resolve to 'settled' whether the promise resolves or rejects — asserts no hang. */
async function settlesWithin(promise: Promise<unknown>, ms: number): Promise<'settled' | 'hung'> {
  const deadline = new Promise<'hung'>(resolve => {
    setTimeout(() => resolve('hung'), ms)
  })
  return Promise.race([promise.then(() => 'settled' as const, () => 'settled' as const), deadline])
}

afterEach(() => {
  globalThis.fetch = realFetch
  vi.restoreAllMocks()
})

describe('rm-276: approval client fetch bounds (public/operator-stream.js)', () => {
  it('decideRunApproval settles as a network error when the POST hangs (fetchTimeoutMs seam)', async () => {
    const fetchStub = hangingFetch()
    globalThis.fetch = fetchStub as unknown as typeof globalThis.fetch

    const client = buildApprovalClient({fetchTimeoutMs: 20})
    const result = await client.decideRunApproval('run-1', 'req-1', 'approve', 'idem-key-1')

    // The transport error collapses to the network-error result, never a hang.
    expect(result).toEqual({success: false, error: {kind: 'network'}})
    // The bound fired on the stubbed transport: the request signal aborted.
    expect(fetchStub).toHaveBeenCalled()
    const init = fetchStub.mock.calls[0]?.[1] as {signal?: AbortSignal} | undefined
    expect(init?.signal?.aborted).toBe(true)
  })

  it('refreshCsrf settles as a network error when the CSRF fetch hangs', async () => {
    globalThis.fetch = hangingFetch() as unknown as typeof globalThis.fetch

    const client = buildApprovalClient({fetchTimeoutMs: 20})
    const result = await client.refreshCsrf()

    expect(result).toEqual({success: false, error: {kind: 'network'}})
  })

  it('listRunApprovals settles as a network error when the GET hangs', async () => {
    globalThis.fetch = hangingFetch() as unknown as typeof globalThis.fetch

    const client = buildApprovalClient({fetchTimeoutMs: 20})
    const result = await client.listRunApprovals('run-1')

    expect(result).toEqual({success: false, error: {kind: 'network'}})
  })
})

describe('rm-276: launch client fetch bounds (public/operator-launch.js)', () => {
  it('refreshCsrf settles within the bound when the fetch hangs (default wrapper signal)', async () => {
    const fetchStub = hangingFetch()
    globalThis.fetch = fetchStub as unknown as typeof globalThis.fetch

    // No browserFetch injection: the default wrapper (which carries the
    // AbortSignal.timeout bound) calls globalThis.fetch directly. The seam
    // keeps the regression fast; the default bound is 10s in production.
    const client = buildLaunchClient({fetchTimeoutMs: 20})
    const outcome = await settlesWithin(client.refreshCsrf(), 5000)

    expect(outcome).toBe('settled')
    // The default wrapper passed an abort signal that actually aborted.
    expect(fetchStub).toHaveBeenCalled()
    const init = fetchStub.mock.calls[0]?.[1] as {signal?: AbortSignal} | undefined
    expect(init?.signal?.aborted).toBe(true)
  })
})
