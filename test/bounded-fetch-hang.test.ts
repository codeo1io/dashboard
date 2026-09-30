import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {createBoundedFetch} from '../src/github/app-client.ts'

// rm-251 (cycle-18): regression fixture for the hung-upstream failure mode
// documented in
// docs/solutions/runtime-errors/octokit-timeout-option-inert-on-hung-upstreams-bind-at-fetch-layer-2026-09-24.md.
// Octokit's `request.timeout` option never rejects a socket that accepts the
// connection and then stops responding — only the fetch-layer seam
// (createBoundedFetch racing AbortSignal.timeout against the underlying
// fetch) aborts. Before rm-251, the installation pagination transport
// (src/github/installations.ts) carried only the inert timeout key, so a
// single hung `GET /installation/repositories` page could hold an un-aborted
// socket while the aggregator's whole-enumeration deadline failed the refresh.
// These fixtures pin the seam's behavioral contract: a never-resolving
// upstream is aborted within the bound, a caller abort wins immediately, and
// the bound composes with an outer signal.

const realFetch = globalThis.fetch

describe('createBoundedFetch hung-upstream contract (rm-251)', () => {
  beforeEach(() => {
    // A hung upstream: accepts the request, never responds, and only gives up
    // when the abort signal fires — exactly the undici hang from the
    // solution doc.
    globalThis.fetch = vi.fn(
      async (_input: unknown, init?: RequestInit) =>
        await new Promise<Response>((_, reject) => {
          const signal = init?.signal
          if (signal) {
            signal.addEventListener('abort', () => reject(signal.reason), {once: true})
          }
        }),
    ) as unknown as typeof globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = realFetch
  })

  it('aborts a never-resolving upstream within the bound', async () => {
    const bounded = createBoundedFetch(50)
    const startedAt = Date.now()
    await expect(
      bounded('https://github.example.invalid/installation/repositories'),
    ).rejects.toThrow()
    const elapsed = Date.now() - startedAt
    // Generous ceiling (CI jitter): the seam must reject in bounded time, not
    // hang for undici's ~300s default.
    expect(elapsed).toBeLessThan(5_000)
    // And not instantaneously either: the upstream really did hang until the
    // abort fired.
    expect(elapsed).toBeGreaterThanOrEqual(45)
  })

  it('rejects with a timeout-shaped error the aggregator can surface', async () => {
    const bounded = createBoundedFetch(25)
    const rejection = await bounded('https://github.example.invalid/').then(
      () => undefined,
      (error: unknown) => error,
    )
    expect(rejection).toBeInstanceOf(Error)
  })

  it('lets an immediate caller abort win over the bound', async () => {
    const bounded = createBoundedFetch(60_000)
    const controller = new AbortController()
    const startedAt = Date.now()
    const pending = bounded('https://github.example.invalid/', {signal: controller.signal})
    controller.abort(new Error('caller deadline elapsed'))
    await expect(pending).rejects.toThrow('caller deadline elapsed')
    expect(Date.now() - startedAt).toBeLessThan(5_000)
  })
})
