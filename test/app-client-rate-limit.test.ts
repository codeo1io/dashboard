import type {AddressInfo} from 'node:net'
/**
 * rm-107: the app client's throttling hooks feed the rate-limit counters of
 * the /api/monitoring system block.
 *
 * Drives the REAL Octokit construction path (ThrottledOctokit + auth-app +
 * throttling plugin) against a local HTTP fixture answering 403 with
 * rate-limit headers, and asserts both sinks:
 * - the injected `onRateLimitEvent` override (test isolation), and
 * - the DEFAULT sink (process-level compose registry) that production uses
 *   with zero wiring in server.ts.
 *
 * Primary hits answer `x-ratelimit-remaining: 0`; secondary hits answer a
 * `retry-after` header (the plugin's secondary detection signature).
 * retry-after is pinned to ~1s so the plugin's bounded retries keep the test
 * fast.
 */
import {generateKeyPairSync} from 'node:crypto'
import http from 'node:http'
import {afterAll, beforeAll, describe, expect, it} from 'vitest'

import {createDashboardAppClient} from '../src/github/app-client.ts'
import {composeSystemStatus, resetSystemStatusForTests} from '../src/status/compose.ts'

const {privateKey} = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {type: 'spki', format: 'pem'},
  privateKeyEncoding: {type: 'pkcs8', format: 'pem'},
})

interface Fixture {
  kind: 'primary' | 'secondary'
}

let server: http.Server
let baseUrl = ''

/** Server-side mode switch — the mint API takes no per-request headers. */
let fixtureMode: Fixture['kind'] = 'primary'

beforeAll(async () => {
  server = http.createServer((_req, res) => {
    const mode = fixtureMode
    res.writeHead(403, {
      'content-type': 'application/json',
      'x-ratelimit-limit': '5000',
      'x-ratelimit-remaining': mode === 'primary' ? '0' : '4999',
      'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 1),
      ...(mode === 'primary' ? {} : {'retry-after': '1'}),
    })
    res.end(JSON.stringify({message: mode === 'primary' ? 'API rate limit exceeded' : 'You have exceeded a secondary rate limit'}))
  })
  await new Promise<void>(resolve => {
    server.listen(0, '127.0.0.1', () => resolve())
  })
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(async () => {
  await new Promise<void>(resolve => {
    server.close(() => resolve())
  })
})

/** The plugin classifies secondary limits from the ERROR MESSAGE — the body carries the canonical phrase. */
function setMode(kind: Fixture['kind']): void {
  fixtureMode = kind
}

describe('app client — rate-limit hooks feed the status counters (rm-107)', () => {
  it(
    'a primary rate limit surfaces on the INJECTED sink (override fully replaces the registry)',
    async () => {
      const events: {secondary: boolean; retryAfterSeconds: number}[] = []
      const client = createDashboardAppClient({
        appId: '123456',
        privateKey,
        requestTimeoutMs: 10_000,
        baseUrl,
        onRateLimitEvent: event => events.push(event),
      })
      resetSystemStatusForTests()
      setMode('primary')
      await expect(client.mintInstallationToken(42, {'issues:read': 'read'})).rejects.toThrow()
      expect(events.length).toBeGreaterThanOrEqual(1)
      expect(events.every(event => event.secondary === false)).toBe(true)
      expect(events[0]?.retryAfterSeconds).toBeTypeOf('number')
      // The registry must stay untouched — the override REPLACED the default sink
      expect(composeSystemStatus({refreshedAt: null, staleBanner: false, refreshDurationMs: null, refreshDegraded: false}).rateLimit.primaryCount).toBe(0)
    },
    20_000,
  )

  it(
    'a secondary rate limit surfaces on the injected sink with secondary=true',
    async () => {
      const events: {secondary: boolean; retryAfterSeconds: number}[] = []
      const client = createDashboardAppClient({
        appId: '123456',
        privateKey,
        requestTimeoutMs: 10_000,
        baseUrl,
        onRateLimitEvent: event => events.push(event),
      })
      setMode('secondary')
      await expect(client.mintInstallationToken(42, {'issues:read': 'read'})).rejects.toThrow()
      expect(events.length).toBeGreaterThanOrEqual(1)
      // The secondary hit is CLASSIFIED secondary (the classification is the
      // wiring claim; the plugin may additionally co-report a primary event
      // on its retry pass when the reset header already elapsed).
      expect(events.some(event => event.secondary === true)).toBe(true)
    },
    20_000,
  )

  it(
    'with NO override, events flow to the process-level compose registry (the production default)',
    async () => {
      resetSystemStatusForTests()
      setMode('primary')
      const client = createDashboardAppClient({
        appId: '123456',
        privateKey,
        requestTimeoutMs: 10_000,
        baseUrl,
      })
      await expect(client.mintInstallationToken(42, {'issues:read': 'read'})).rejects.toThrow()
      const view = composeSystemStatus({refreshedAt: null, staleBanner: false, refreshDurationMs: null, refreshDegraded: false})
      expect(view.rateLimit.primaryCount).toBeGreaterThanOrEqual(1)
      expect(view.rateLimit.lastEventAt).not.toBe(null)
      expect(view.rateLimit.lastRetryAfterSeconds).not.toBe(null)
    },
    20_000,
  )
})
