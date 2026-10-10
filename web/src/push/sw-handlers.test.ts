import {describe, expect, it, vi} from 'vitest'
import {
  handleNotificationclick,
  handlePush,
  handlePushsubscriptionchange,
  safeNotificationRoute,
  type PushEventLike,
  type PushManagerLike,
  type PushSubscriptionLike,
  type RotationDeps,
} from './sw-handlers.ts'
import {buildNotification} from './sw-notification.ts'

// ---------------------------------------------------------------------------
// fakes
// ---------------------------------------------------------------------------

function makePushEvent(payloadJson: unknown | 'throw' | null): {event: PushEventLike; waited: Promise<unknown>} {
  let waitedResolve: (value: unknown) => void = () => {}
  const waited = new Promise<unknown>(resolve => {
    waitedResolve = resolve
  })
  const event: PushEventLike = {
    data:
      payloadJson === null
        ? null
        : {
            json: () => {
              if (payloadJson === 'throw') throw new SyntaxError('not json')
              return payloadJson
            },
          },
    waitUntil: promise => {
      void promise.then(waitedResolve, waitedResolve)
    },
  }
  return {event, waited}
}

// ---------------------------------------------------------------------------
// push
// ---------------------------------------------------------------------------

describe('handlePush', () => {
  it('maps a valid approval payload through buildNotification and shows it', async () => {
    const {event, waited} = makePushEvent({type: 'approval'})
    const show = vi.fn(async () => {})

    handlePush(event, show)
    await waited

    expect(show).toHaveBeenCalledExactlyOnceWith(buildNotification({type: 'approval'}))
  })

  it('silent push (data null) still shows the generic notification — userVisibleOnly contract', async () => {
    const {event, waited} = makePushEvent(null)
    const show = vi.fn(async () => {})

    handlePush(event, show)
    await waited

    expect(show).toHaveBeenCalledExactlyOnceWith(buildNotification(undefined))
  })

  it('malformed (non-JSON) payload still shows the generic notification', async () => {
    const {event, waited} = makePushEvent('throw')
    const shown: Array<ReturnType<typeof buildNotification>> = []

    handlePush(event, async notification => {
      shown.push(notification)
    })
    await waited

    expect(shown).toHaveLength(1)
    expect(shown[0]).toEqual(buildNotification(undefined))
    expect(shown[0]!.data).toEqual({type: 'unknown', route: '/'})
  })
})

// ---------------------------------------------------------------------------
// notificationclick
// ---------------------------------------------------------------------------

describe('safeNotificationRoute', () => {
  it('accepts a same-origin relative route', () => {
    expect(safeNotificationRoute({route: '/'})).toBe('/')
  })

  it('rejects protocol-relative, absolute-URL, and non-string routes', () => {
    expect(safeNotificationRoute({route: '//evil.example'})).toBe('/')
    expect(safeNotificationRoute({route: 'https://evil.example'})).toBe('/')
    expect(safeNotificationRoute({route: 42})).toBe('/')
    expect(safeNotificationRoute('string-not-object')).toBe('/')
    expect(safeNotificationRoute(null)).toBe('/')
    expect(safeNotificationRoute([{}])).toBe('/')
  })
})

describe('handleNotificationclick', () => {
  function makeClickEvent(data: unknown) {
    let waitedResolve: (value: unknown) => void = () => {}
    const waited = new Promise<unknown>(resolve => {
      waitedResolve = resolve
    })
    const close = vi.fn()
    const event = {
      notification: {data, close},
      waitUntil: (promise: Promise<unknown>) => {
        void promise.then(waitedResolve, waitedResolve)
      },
    }
    return {event, waited, close}
  }

  it('focuses an existing window client and closes the notification', async () => {
    const {event, waited, close} = makeClickEvent({type: 'approval', route: '/'})
    const focus = vi.fn(async () => {})
    const clients = {
      matchAll: vi.fn(async () => [{focus}]),
      openWindow: vi.fn(async () => {}),
    }

    handleNotificationclick(event, clients)
    await waited

    expect(close).toHaveBeenCalledExactlyOnceWith()
    expect(focus).toHaveBeenCalledExactlyOnceWith()
    expect(clients.openWindow).not.toHaveBeenCalled()
    expect(clients.matchAll).toHaveBeenCalledExactlyOnceWith({type: 'window', includeUncontrolled: true})
  })

  it('opens the dashboard route when no window client exists', async () => {
    const {event, waited, close} = makeClickEvent({type: 'run_failed', route: '/'})
    const clients = {
      matchAll: vi.fn(async () => []),
      openWindow: vi.fn(async () => {}),
    }

    handleNotificationclick(event, clients)
    await waited

    expect(close).toHaveBeenCalledExactlyOnceWith()
    expect(clients.openWindow).toHaveBeenCalledExactlyOnceWith('/')
  })

  it('a hostile data.route never reaches openWindow — falls back to /', async () => {
    const {event, waited} = makeClickEvent({type: 'unknown', route: '//evil.example/phish'})
    const clients = {
      matchAll: vi.fn(async () => []),
      openWindow: vi.fn(async () => {}),
    }

    handleNotificationclick(event, clients)
    await waited

    expect(clients.openWindow).toHaveBeenCalledExactlyOnceWith('/')
  })
})

// ---------------------------------------------------------------------------
// pushsubscriptionchange
// ---------------------------------------------------------------------------

function ok<T>(value: T): {success: true; data: T} {
  return {success: true, data: value}
}

function makeRotationDeps(
  overrides: Partial<RotationDeps> = {},
): {deps: RotationDeps; subscribeCalls: Array<{userVisibleOnly: boolean; applicationServerKey: Uint8Array}>; posted: unknown[]; unsubscribed: () => number} {
  const subscribeCalls: Array<{userVisibleOnly: boolean; applicationServerKey: Uint8Array}> = []
  const posted: unknown[] = []
  let unsubscribed = 0
  const subscription: PushSubscriptionLike = {
    toJSON: () => ({endpoint: 'https://push.example/fixture-sub', keys: {}}),
    unsubscribe: async () => {
      unsubscribed += 1
      return true
    },
  }
  const pushManager: PushManagerLike = {
    subscribe: async options => {
      subscribeCalls.push(options)
      return subscription
    },
  }
  const deps: RotationDeps = {
    pushManager,
    getVapidKey: async () => ok({pushDisabled: false, vapidKey: {publicKey: 'B pubkey-fixture', keyVersion: 'v1'}}),
    refreshCsrf: async () => ok('csrf-token-fixture'),
    subscribePush: async (subscriptionJson: unknown) => {
      posted.push(subscriptionJson)
      return {success: true as const, data: undefined}
    },
    mintIdempotencyKey: () => 'idem-fixture',
    urlB64ToUint8Array: (key: string) => new TextEncoder().encode(key),
    ...overrides,
  }
  return {deps, subscribeCalls, posted, unsubscribed: () => unsubscribed}
}

describe('handlePushsubscriptionchange', () => {
  async function run(deps: RotationDeps): Promise<unknown> {
    let waitedResolve: (value: unknown) => void = () => {}
    const waited = new Promise<unknown>(resolve => {
      waitedResolve = resolve
    })
    handlePushsubscriptionchange({waitUntil: promise => void promise.then(waitedResolve, waitedResolve)}, deps)
    return waited
  }

  it('happy path: re-subscribes with the current VAPID key and posts the replacement', async () => {
    const {deps, subscribeCalls, posted, unsubscribed} = makeRotationDeps()
    await run(deps)

    expect(subscribeCalls).toHaveLength(1)
    expect(subscribeCalls[0]!.userVisibleOnly).toBe(true)
    expect(subscribeCalls[0]!.applicationServerKey).toEqual(new TextEncoder().encode('B pubkey-fixture'))
    expect(posted).toEqual([{endpoint: 'https://push.example/fixture-sub', keys: {}}])
    expect(unsubscribed()).toBe(0)
  })

  it('no crypto.randomUUID → no rotation attempt at all', async () => {
    const {deps, subscribeCalls, posted} = makeRotationDeps({mintIdempotencyKey: () => null})
    await run(deps)

    expect(subscribeCalls).toHaveLength(0)
    expect(posted).toHaveLength(0)
  })

  it('push disabled (gateway 404 translation) → no rotation attempt', async () => {
    const {deps, subscribeCalls} = makeRotationDeps({getVapidKey: async () => ok({pushDisabled: true, vapidKey: undefined})})
    await run(deps)

    expect(subscribeCalls).toHaveLength(0)
  })

  it('vapid-key fetch failed → no rotation attempt', async () => {
    const {deps, subscribeCalls} = makeRotationDeps({getVapidKey: async () => ({success: false as const, error: {kind: 'network' as const}})})
    await run(deps)

    expect(subscribeCalls).toHaveLength(0)
  })

  it('pushManager.subscribe rejection → no orphan, no post', async () => {
    const {deps, posted, unsubscribed} = makeRotationDeps({
      pushManager: {subscribe: async () => Promise.reject(new Error('denied'))},
    })
    await run(deps)

    expect(posted).toHaveLength(0)
    expect(unsubscribed()).toBe(0) // subscribe threw — nothing local to clean up
  })

  it('csrf refresh failure → freshly minted subscription is unsubscribed (no local orphan)', async () => {
    const {deps, posted, unsubscribed} = makeRotationDeps({refreshCsrf: async () => ({success: false as const, error: {kind: 'http' as const, status: 403}})})
    await run(deps)

    expect(posted).toHaveLength(0)
    expect(unsubscribed()).toBe(1)
  })

  it('gateway post failure → freshly minted subscription is unsubscribed (no local orphan)', async () => {
    const {deps, subscribeCalls, unsubscribed} = makeRotationDeps({
      subscribePush: async () => ({success: false as const, error: {kind: 'network' as const}}),
    })
    await run(deps)

    expect(subscribeCalls).toHaveLength(1) // the rotation did attempt
    expect(unsubscribed()).toBe(1)
  })
})
