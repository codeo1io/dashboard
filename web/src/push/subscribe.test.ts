import {afterEach, describe, expect, it, vi} from 'vitest'
import {ensurePushServiceWorker} from './subscribe.ts'

/**
 * rm-1420(b): the app-owned registration default. The views previously
 * injected a bare `navigator.serviceWorker.ready` wait, which can never
 * settle while no worker is registered — every subscribe attempt
 * dead-ended 'sw-not-ready'. `ensurePushServiceWorker` must register
 * /sw.js when absent, reuse an existing registration, survive a failed
 * register, and stay pending (never reject) with no SW container so the
 * subscribe timeout + classifySwReadiness report 'sw-unavailable'.
 */

const readyRegistration = {pushManager: {}}

function stubContainer(overrides: {
  getRegistration?: ReturnType<typeof vi.fn>
  register?: ReturnType<typeof vi.fn>
}): {getRegistration: ReturnType<typeof vi.fn>; register: ReturnType<typeof vi.fn>} {
  const container = {
    getRegistration: overrides.getRegistration ?? vi.fn().mockResolvedValue(undefined),
    register: overrides.register ?? vi.fn().mockResolvedValue({}),
    ready: Promise.resolve(readyRegistration),
  }
  vi.stubGlobal('navigator', {serviceWorker: container})
  return container
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ensurePushServiceWorker (app-owned push SW registration)', () => {
  it('registers /sw.js when no registration exists, then waits for ready', async () => {
    const container = stubContainer({})

    await expect(ensurePushServiceWorker()).resolves.toBe(readyRegistration)

    expect(container.getRegistration).toHaveBeenCalledWith('/sw.js')
    expect(container.register).toHaveBeenCalledTimes(1)
    expect(container.register).toHaveBeenCalledWith('/sw.js')
  })

  it('reuses an existing /sw.js registration instead of re-registering', async () => {
    const existing = {pushManager: {}}
    const container = stubContainer({getRegistration: vi.fn().mockResolvedValue(existing)})

    await expect(ensurePushServiceWorker()).resolves.toBe(readyRegistration)

    expect(container.register).not.toHaveBeenCalled()
  })

  it('a failed register is not fatal — the ready wait still settles', async () => {
    stubContainer({register: vi.fn().mockRejectedValue(new Error('register failed'))})

    await expect(ensurePushServiceWorker()).resolves.toBe(readyRegistration)
  })

  it('with no service-worker container the promise never settles (permanent outcome)', async () => {
    vi.stubGlobal('navigator', {})

    const outcome = await Promise.race([
      ensurePushServiceWorker().then(
        () => 'settled' as const,
        () => 'settled' as const,
      ),
      new Promise<'pending'>((resolve) => {
        setTimeout(() => resolve('pending'), 25)
      }),
    ])

    expect(outcome).toBe('pending')
  })
})
