import type {GatewayClientError, SessionDto} from '../src/gateway/operator-client.ts'
import assert from 'node:assert/strict'

import {beforeEach, describe, test} from 'vitest'
import {createSessionCache} from '../src/gateway/session-cache.ts'

const VALID_SESSION: SessionDto = {
  operatorId: 12345,
  login: 'octocat',
  expiresAt: new Date('2030-01-01T00:00:00Z').getTime(),
}

type Result<T> = {readonly success: true; readonly data: T} | {readonly success: false; readonly error: GatewayClientError}

function ok<T>(data: T): Result<T> {
  return {success: true, data}
}

function err(error: GatewayClientError): Result<SessionDto> {
  return {success: false, error}
}

describe('gateway session cache (rm-226 cache half)', () => {
  let fakeNow: number
  const clock = () => fakeNow

  beforeEach(() => {
    fakeNow = 1_000_000
  })

  test('second getSession call with the same cookie hits the cache', async () => {
    const cache = createSessionCache({now: clock})
    let loads = 0
    const load = async () => {
      loads++
      return ok(VALID_SESSION)
    }
    const first = await cache.get('cookie-a', load)
    const second = await cache.get('cookie-a', load)
    assert.equal(loads, 1)
    assert.deepEqual(second, first)
  })

  test('entries expire after the TTL and reload', async () => {
    const cache = createSessionCache({ttlMs: 15_000, now: clock})
    let loads = 0
    const load = async () => {
      loads++
      return ok(VALID_SESSION)
    }
    await cache.get('cookie-a', load)
    fakeNow += 14_999
    await cache.get('cookie-a', load)
    assert.equal(loads, 1, 'still inside the TTL window')
    fakeNow += 1
    await cache.get('cookie-a', load)
    assert.equal(loads, 2, 'expired after 15s')
  })

  test('concurrent getSession calls single-flight one load', async () => {
    const cache = createSessionCache({now: clock})
    let loads = 0
    let release: (() => void) | undefined
    const load = async () => {
      loads++
      await new Promise<void>(resolve => {
        release = resolve
      })
      return ok(VALID_SESSION)
    }
    const first = cache.get('cookie-a', load)
    const second = cache.get('cookie-a', load)
    release?.()
    const [a, b] = await Promise.all([first, second])
    assert.equal(loads, 1)
    assert.deepEqual(a, b)
  })

  test('failed loads are never cached (fail-closed)', async () => {
    const cache = createSessionCache({now: clock})
    let loads = 0
    const failing = async (): Promise<Result<SessionDto>> => {
      loads++
      return err({kind: 'network', message: 'gateway unavailable'})
    }
    await cache.get('cookie-a', failing)
    await cache.get('cookie-a', failing)
    assert.equal(loads, 2, 'each failure retries the upstream call')
  })

  test('distinct cookie keys never share cache entries', async () => {
    const cache = createSessionCache({now: clock})
    const seen: string[] = []
    const load = async () => {
      seen.push('hit')
      return ok(VALID_SESSION)
    }
    await cache.get('cookie-a', load)
    await cache.get('cookie-b', load)
    assert.equal(seen.length, 2)
  })
})
