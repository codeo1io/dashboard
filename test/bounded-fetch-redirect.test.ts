import type {AddressInfo} from 'node:net'
import http from 'node:http'
import {Octokit} from '@octokit/core'
import {afterAll, beforeAll, describe, expect, it} from 'vitest'

import {createBoundedFetch} from '../src/github/app-client.ts'

const TEST_TIMEOUT_MS = 2_000

// rm-528 redirect-refusal contract. `createBoundedFetch` is the seam injected
// as Octokit's `request.fetch` for every installation-token API call, so its
// default redirect posture governs all authenticated GitHub traffic. The
// fixture server answers `/redirect` with a 302 to `/landed` (200): following
// the redirect RESOLVES, refusing it REJECTS — so these tests are red exactly
// while the seam passes `redirect` through to undici's default ('follow').
let redirectServer: http.Server
let redirectBaseUrl: string

beforeAll(async () => {
  redirectServer = http.createServer((req, res) => {
    if (req.url === '/redirect') {
      res.writeHead(302, {Location: '/landed'})
      res.end()
      return
    }
    res.writeHead(200, {'Content-Type': 'application/json'})
    res.end(JSON.stringify({ok: true, url: req.url}))
  })
  await new Promise<void>(resolve => redirectServer.listen(0, '127.0.0.1', resolve))
  redirectBaseUrl = `http://127.0.0.1:${(redirectServer.address() as AddressInfo).port}`
})

afterAll(async () => {
  await new Promise<void>(resolve => redirectServer.close(() => resolve()))
})

describe('rm-528 bounded-fetch redirect refusal', () => {
  it('rejects (does not follow) a 302 by default at the transport seam', async () => {
    const boundedFetch = createBoundedFetch(TEST_TIMEOUT_MS)
    await expect(boundedFetch(`${redirectBaseUrl}/redirect`)).rejects.toThrow()
  })

  it('honors an explicit caller override (redirect: manual still works)', async () => {
    const boundedFetch = createBoundedFetch(TEST_TIMEOUT_MS)
    const res = await boundedFetch(`${redirectBaseUrl}/redirect`, {redirect: 'manual'})
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/landed')
  })

  it('rejects a redirected installation-token Octokit request (auth-header seam)', async () => {
    const octokit = new Octokit({
      baseUrl: redirectBaseUrl,
      request: {fetch: createBoundedFetch(TEST_TIMEOUT_MS)},
    })
    await expect(octokit.request('GET /redirect')).rejects.toThrow()
  })

  it('still serves a non-redirecting authenticated request normally', async () => {
    const octokit = new Octokit({
      baseUrl: redirectBaseUrl,
      request: {fetch: createBoundedFetch(TEST_TIMEOUT_MS)},
    })
    const res = await octokit.request('GET /landed')
    expect(res.status).toBe(200)
    expect(res.data).toMatchObject({ok: true})
  })
})
