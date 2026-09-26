import {generateKeyPairSync} from 'node:crypto'
/**
 * rm-156: outbound GitHub data-plane calls are timeout-bounded at the
 * transport layer.
 *
 * Uses a real TCP server that accepts connections and never responds — the
 * closest honest simulation of a hung upstream. Undici's default would hold
 * the request open for ~300s; the runtime's `@octokit/request` does not honor
 * the `timeout` option for hung upstreams, so the bound is enforced by the
 * injected bounded fetch (see `createBoundedFetch` in app-client.ts). These
 * tests prove the bound actually fires end-to-end through the real client
 * construction paths used by the aggregator.
 */
import net from 'node:net'
import {afterAll, beforeAll, describe, expect, it} from 'vitest'

import {
  createBoundedFetch,
  createDashboardAppClient,
  createInstallationGraphqlQueryFn,
  GITHUB_REQUEST_TIMEOUT_MS,
} from '../src/github/app-client.ts'

const TEST_TIMEOUT_MS = 150

let hungServer: net.Server
let hungBaseUrl: string
const sockets = new Set<net.Socket>()

beforeAll(async () => {
  hungServer = net.createServer(socket => {
    sockets.add(socket)
    socket.on('close', () => sockets.delete(socket))
    // Accept the connection and never respond: the only way these requests
    // can settle is the client-side timeout firing.
  })
  await new Promise<void>(resolve => {
    hungServer.listen(0, '127.0.0.1', () => resolve())
  })
  const address = hungServer.address() as net.AddressInfo
  hungBaseUrl = `http://127.0.0.1:${address.port}`
})

afterAll(async () => {
  for (const socket of sockets) socket.destroy()
  await new Promise<void>(resolve => {
    hungServer.close(() => resolve())
  })
})

const {privateKey} = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {type: 'spki', format: 'pem'},
  privateKeyEncoding: {type: 'pkcs8', format: 'pem'},
})

function client() {
  return createDashboardAppClient({
    appId: '123456',
    privateKey,
    requestTimeoutMs: TEST_TIMEOUT_MS,
    baseUrl: hungBaseUrl,
  })
}

/** Assert the promise settles within the timeout window (not instantly, not never). */
async function expectBoundedRejection(promise: Promise<unknown>): Promise<Error> {
  const startedAt = Date.now()
  let caught: Error
  try {
    await promise
    throw new Error('hung-upstream call unexpectedly resolved')
  } catch (error) {
    caught = error as Error
  }
  const elapsedMs = Date.now() - startedAt
  // Fast enough to prove the bound fired (well under undici's ~300s default),
  // slow enough to prove this was the timeout and not an instant refusal.
  expect(elapsedMs).toBeGreaterThanOrEqual(TEST_TIMEOUT_MS - 25)
  expect(elapsedMs).toBeLessThan(10_000)
  return caught
}

describe('rm-156 outbound data-plane timeout bounds', () => {
  it('defaults to the landed rm-197 ceiling (30s), enforced via createBoundedFetch', () => {
    // 2026-09-26 integrate: rm-156's mechanism (fetch-layer bound) was merged
    // onto rm-197's landed ceiling constant — GITHUB_HTTP_TIMEOUT_MS (15s,
    // the run's own pick) was folded into GITHUB_REQUEST_TIMEOUT_MS (30s,
    // the landed value). The seam name changed; the bound is unchanged.
    expect(GITHUB_REQUEST_TIMEOUT_MS).toBe(30_000)
    expect(typeof createBoundedFetch).toBe('function')
  })

  it('rejects a hung installation-token mint within the bound', async () => {
    const error = await expectBoundedRejection(client().mintInstallationToken(42, {metadata: 'read'}))
    expect(error).toBeInstanceOf(Error)
  })

  it('rejects a hung App-level REST request within the bound', async () => {
    const app = client()
    const error = await expectBoundedRejection(app.octokit.request('GET /app'))
    expect(error).toBeInstanceOf(Error)
  })

  it('rejects a hung installation GraphQL query within the bound', async () => {
    const query = createInstallationGraphqlQueryFn(async () => 'ghs_testtoken', {
      timeoutMs: TEST_TIMEOUT_MS,
      baseUrl: hungBaseUrl,
    })
    const error = await expectBoundedRejection(query(42, 'query { viewer { login } }', {}))
    expect(error).toBeInstanceOf(Error)
  })
})
