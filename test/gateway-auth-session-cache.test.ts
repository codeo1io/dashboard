/**
 * rm-207: gateway session-validation cache focused tests.
 *
 * Four acceptance cases from the roadmap item, plus cache-unit tests:
 *  1. cached-hit — a second request within the TTL performs NO upstream call
 *  2. TTL expiry — after the TTL the next request re-validates upstream
 *  3. upstream error during (re)validation fails closed (302 redirect)
 *  4. cookie-rotation invalidation — a different cookie re-validates upstream
 *     even while the first cookie's entry is still fresh
 *
 * Mirrors the gateway-auth.test.ts harness: buildDashboardApp with an injected
 * fake OperatorClient whose getCurrentSession spy counts upstream calls. No
 * real network. The TTL is pinned by injecting a controllable `now` into the
 * cache (via the opts seam), not by fake timers.
 */
import type {GatewayClientError, OperatorClient, SessionDto} from '../src/gateway/operator-client.ts'
import type {Result} from '../src/result.ts'
import {Buffer} from 'node:buffer'
import {describe, expect, it, vi} from 'vitest'
import {buildDashboardApp} from '../src/server.ts'
import {createGatewaySessionCache} from '../src/gateway/session-cache.ts'
import {err, ok} from '../src/result.ts'

const TEST_KEY = Buffer.from('testkey-ABCDEFGHIJKLMNOPQRSTUV12', 'utf8') // 32 bytes
const COOKIE_A = 'gateway_session=cookie-a'
const COOKIE_B = 'gateway_session=cookie-b'
const GATEWAY_ERROR: GatewayClientError = {kind: 'network', message: 'fake upstream failure'}

let fakeNow = Date.now() // must sit near the real clock: the middleware's own
// expiresAt defense uses real Date.now() (only the cache uses the injected now)

function makeFakeOperatorClient(
  getCurrentSessionImpl: () => Promise<Result<SessionDto, GatewayClientError>>,
): {client: OperatorClient; getCurrentSessionSpy: ReturnType<typeof vi.fn>} {
  const getCurrentSessionSpy = vi.fn(getCurrentSessionImpl)
  const client: OperatorClient = {
    getCurrentSession: getCurrentSessionSpy,
    refreshCsrf: () => {
      throw new Error('refreshCsrf must not be called in auth middleware')
    },
    launchRun: () => {
      throw new Error('launchRun must not be called in auth middleware')
    },
    getRunSnapshot: () => {
      throw new Error('getRunSnapshot must not be called in auth middleware')
    },
    connectRunStream: () => {
      throw new Error('connectRunStream must not be called in auth middleware')
    },
  } as unknown as OperatorClient
  return {client, getCurrentSessionSpy}
}

async function buildApp(operatorClient: OperatorClient) {
  return buildDashboardApp({
    cookieKey: TEST_KEY,
    gatewayOperatorSessionEnabled: true,
    operatorClient,
    gatewaySessionCache: createGatewaySessionCache(() => fakeNow),
  })
}

function validSession(): SessionDto {
  return {operatorId: 12345, login: 'octocat', expiresAt: fakeNow + 60 * 60 * 1000}
}

// ---------------------------------------------------------------------------
// cache unit behavior
// ---------------------------------------------------------------------------

describe('createGatewaySessionCache (unit)', () => {
  it('expires entries by TTL age', () => {
    const cache = createGatewaySessionCache(() => fakeNow)
    const session = validSession()
    cache.set(COOKIE_A, session)
    expect(cache.get(COOKIE_A)).toBe(session)
    fakeNow += 14_999
    expect(cache.get(COOKIE_A)).toBe(session)
    fakeNow += 1
    expect(cache.get(COOKIE_A)).toBeUndefined()
  })

  it('never lets a cached verdict outlive the session itself', () => {
    const cache = createGatewaySessionCache(() => fakeNow)
    const shortSession: SessionDto = {operatorId: 1, login: 'octocat', expiresAt: fakeNow + 5_000}
    cache.set(COOKIE_A, shortSession)
    fakeNow += 5_001 // past the session's own expiresAt, still inside the TTL
    expect(cache.get(COOKIE_A)).toBeUndefined()
  })

  it('drops the whole map past the entry cap', () => {
    const cache = createGatewaySessionCache(() => fakeNow, 15_000, 3)
    for (let i = 0; i < 3; i += 1) {
      cache.set(`k${i}`, validSession())
    }
    expect(cache.size).toBe(3)
    cache.set('k3', validSession())
    expect(cache.size).toBe(1)
    expect(cache.get('k3')).toBeDefined()
    expect(cache.get('k0')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// middleware integration — the four acceptance cases
// ---------------------------------------------------------------------------

describe('rm-207 gateway session-validation cache (middleware)', () => {
  it('case 1: second request within the TTL performs no upstream call', async () => {
    const {client, getCurrentSessionSpy} = makeFakeOperatorClient(async () => ok(validSession()))
    const app = await buildApp(client)

    const first = await app.request('/', {headers: {cookie: COOKIE_A}})
    expect(first.status).toBe(200)
    expect(getCurrentSessionSpy).toHaveBeenCalledTimes(1)

    const second = await app.request('/', {headers: {cookie: COOKIE_A}})
    expect(second.status).toBe(200)
    expect(getCurrentSessionSpy).toHaveBeenCalledTimes(1) // cached hit
  })

  it('case 2: past the TTL the next request re-validates upstream', async () => {
    const {client, getCurrentSessionSpy} = makeFakeOperatorClient(async () => ok(validSession()))
    const app = await buildApp(client)

    await app.request('/', {headers: {cookie: COOKIE_A}})
    expect(getCurrentSessionSpy).toHaveBeenCalledTimes(1)
    fakeNow += 15_001 // past the TTL
    const second = await app.request('/', {headers: {cookie: COOKIE_A}})
    expect(second.status).toBe(200)
    expect(getCurrentSessionSpy).toHaveBeenCalledTimes(2) // re-validated
  })

  it('case 3: upstream error during re-validation fails closed (302)', async () => {
    let fail = false
    const {client, getCurrentSessionSpy} = makeFakeOperatorClient(async () =>
      fail ? err(GATEWAY_ERROR) : ok(validSession()),
    )
    const app = await buildApp(client)

    const first = await app.request('/', {headers: {cookie: COOKIE_A}})
    expect(first.status).toBe(200)

    fakeNow += 15_001 // TTL expired → upstream again, this time failing
    fail = true
    const second = await app.request('/', {headers: {cookie: COOKIE_A}})
    expect(second.status).toBe(302)
    expect(getCurrentSessionSpy).toHaveBeenCalledTimes(2)

    // Failures are never cached: the very next request re-validates.
    const third = await app.request('/', {headers: {cookie: COOKIE_A}})
    expect(third.status).toBe(302)
    expect(getCurrentSessionSpy).toHaveBeenCalledTimes(3)
  })

  it('case 4: a rotated cookie re-validates even while the first entry is fresh', async () => {
    const {client, getCurrentSessionSpy} = makeFakeOperatorClient(async () => ok(validSession()))
    const app = await buildApp(client)

    await app.request('/', {headers: {cookie: COOKIE_A}})
    expect(getCurrentSessionSpy).toHaveBeenCalledTimes(1)

    // Same wall-clock (inside the TTL) but a different cookie → upstream call.
    const rotated = await app.request('/', {headers: {cookie: COOKIE_B}})
    expect(rotated.status).toBe(200)
    expect(getCurrentSessionSpy).toHaveBeenCalledTimes(2)
  })
})
