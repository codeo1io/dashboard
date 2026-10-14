import {afterEach, describe, expect, it, vi} from 'vitest'

import {
  probeServedPushCapability,
  servedPushHandlerMarkerPresent,
} from './served-sw-capability.ts'

/**
 * Served-artifact push capability probe (rm-249 rider, run 61448784a089).
 *
 * The probe is the client half of the push deploy-trap gate: the shipped
 * sw.js in this fork is a kill-switch SW with no push handler, so the probe
 * must fail closed on EVERY path — no serviceWorker API, fetch rejection,
 * non-200, or a sw.js without a `addEventListener('push'` registration.
 */

const fetchMock = vi.fn()

function stubFetch(impl: () => Promise<Response>) {
  fetchMock.mockImplementation(impl)
  vi.stubGlobal('fetch', fetchMock)
}

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

describe('servedPushHandlerMarkerPresent', () => {
  it('detects push handler registrations in both quote styles', () => {
    expect(servedPushHandlerMarkerPresent("self.addEventListener('push', () => {})\n")).toBe(true)
    expect(servedPushHandlerMarkerPresent('self.addEventListener("push", () => {})\n')).toBe(true)
  })

  it('rejects sw sources without a push handler (kill-switch SW, message-only, empty)', () => {
    expect(servedPushHandlerMarkerPresent('self.addEventListener("message", () => {})\n')).toBe(false)
    expect(servedPushHandlerMarkerPresent("self.addEventListener('pushsubscriptionchange', () => {})\n")).toBe(
      false,
    )
    expect(servedPushHandlerMarkerPresent('')).toBe(false)
  })
})

describe('probeServedPushCapability', () => {
  it('reports capability when the served sw.js registers a push handler', async () => {
    vi.stubGlobal('navigator', {serviceWorker: {}})
    stubFetch(async () => new Response("self.addEventListener('push', () => {})\n", {status: 200}))
    await expect(probeServedPushCapability()).resolves.toBe(true)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/sw.js')
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined
    expect(init?.cache).toBe('no-store')
  })

  it('fail-closed: sw.js without a push handler (this fork’s shipped kill-switch SW)', async () => {
    vi.stubGlobal('navigator', {serviceWorker: {}})
    stubFetch(async () => new Response('self.unregister()\n', {status: 200}))
    await expect(probeServedPushCapability()).resolves.toBe(false)
  })

  it('fail-closed: non-200 response', async () => {
    vi.stubGlobal('navigator', {serviceWorker: {}})
    stubFetch(async () => new Response('not found', {status: 404}))
    await expect(probeServedPushCapability()).resolves.toBe(false)
  })

  it('fail-closed: fetch rejection', async () => {
    vi.stubGlobal('navigator', {serviceWorker: {}})
    stubFetch(async () => {
      throw new TypeError('network error')
    })
    await expect(probeServedPushCapability()).resolves.toBe(false)
  })

  it('fail-closed: no serviceWorker API in the runtime', async () => {
    vi.stubGlobal('navigator', {})
    await expect(probeServedPushCapability()).resolves.toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
