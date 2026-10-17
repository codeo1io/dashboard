/**
 * rm-022 slice — direct module coverage for src/github/app-client.ts.
 *
 * The module's transport edges each already have a dedicated partial suite:
 * test/app-client-timeout.test.ts proves the rm-156 bound fires against a
 * HUNG upstream (rejection paths only), test/bounded-fetch-redirect.test.ts
 * pins createBoundedFetch's rm-528 redirect refusal, and
 * test/transport-timeout-contract.test.ts statically scans construction
 * sites. None of them exercise the module's SUCCESS contracts against a
 * well-behaved GitHub. This suite does, through the documented baseUrl seam
 * (AppClientOptions: tests point it at a local fixture server): the
 * installation-token mint's wire shape (route, App-JWT bearer, and the exact
 * read-only permissions body — the read-only invariant observed at the
 * wire), the rm-185 expiresAt normalization (ISO string parsed into a Date;
 * ill-formed value yields null), and createInstallationGraphqlQueryFn's
 * token-getter/header/body plumbing on the success path.
 */
import type {AddressInfo} from 'node:net'
import {Buffer} from 'node:buffer'
import {generateKeyPairSync} from 'node:crypto'
import http from 'node:http'
import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'vitest'

import {
  createDashboardAppClient,
  createInstallationGraphqlQueryFn,
  safeErrorMessage,
} from '../src/github/app-client.ts'
import {CORE_READ_PERMISSIONS} from '../src/github/installations.ts'

interface CapturedRequest {
  readonly method: string
  readonly url: string
  readonly authorization: string
  readonly body: Record<string, unknown>
}

let server: http.Server
let baseUrl: string
let captured: CapturedRequest[] = []
/** Mutable per-test response; the fixture answers every request with it. */
let respondWith: () => {status: number; body: unknown} = () => ({status: 404, body: {}})

beforeAll(async () => {
  server = http.createServer((request, response) => {
    const chunks: Buffer[] = []
    request.on('data', (chunk: Buffer) => chunks.push(chunk))
    request.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      let body: Record<string, unknown> = {}
      if (raw.length > 0) {
        try {
          body = JSON.parse(raw) as Record<string, unknown>
        } catch {
          body = {unparsed: raw}
        }
      }
      captured.push({
        method: request.method ?? '',
        url: request.url ?? '',
        authorization: request.headers.authorization ?? '',
        body,
      })
      const answer = respondWith()
      response.writeHead(answer.status, {'content-type': 'application/json'})
      response.end(JSON.stringify(answer.body))
    })
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

beforeEach(() => {
  captured = []
})

// A real RSA key: auth-app signs the App JWT locally before any request is
// sent (same pattern as test/app-client-timeout.test.ts).
const {privateKey} = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {type: 'spki', format: 'pem'},
  privateKeyEncoding: {type: 'pkcs8', format: 'pem'},
})

describe('createDashboardAppClient (rm-022 direct coverage)', () => {
  it('returns the documented App-level shape', () => {
    const client = createDashboardAppClient({appId: '123456', privateKey, baseUrl})
    expect(typeof client.octokit.request).toBe('function')
    expect(typeof client.mintInstallationToken).toBe('function')
  })

  it('mintInstallationToken POSTs the installation route with an App JWT and EXACTLY the read-only permissions (the invariant at the wire)', async () => {
    const expiresIso = '2026-10-17T12:00:00Z'
    respondWith = () => ({status: 201, body: {token: 'ghs_wireproof0001', expires_at: expiresIso}})
    const client = createDashboardAppClient({appId: '123456', privateKey, baseUrl})

    const minted = await client.mintInstallationToken(4242, CORE_READ_PERMISSIONS)

    expect(minted.token).toBe('ghs_wireproof0001')
    // rm-185: the API-provided expiry is threaded through as a real Date.
    expect(minted.expiresAt).toBeInstanceOf(Date)
    expect(minted.expiresAt?.getTime()).toBe(Date.parse(expiresIso))

    expect(captured.length).toBe(1)
    const wire = captured[0]
    expect(wire?.method).toBe('POST')
    expect(wire?.url).toBe('/app/installations/4242/access_tokens')
    // App-level auth: a JWT — 'bearer' scheme (observed lowercase in
    // @octokit/auth-app's emission) over three dot-separated base64url
    // segments, the first being the base64url JSON JWT header (eyJ...).
    expect(wire?.authorization.startsWith('bearer eyJ')).toBe(true)
    expect(wire?.authorization.split('.')).toHaveLength(3)
    // The read-only invariant observed on the wire: the mint body carries
    // EXACTLY the caller's permission subset — every value 'read', nothing
    // widened, nothing synthesized.
    const permissions = (wire?.body.permissions ?? {}) as Record<string, string>
    expect(permissions).toEqual({...CORE_READ_PERMISSIONS})
    for (const value of Object.values(permissions)) {
      expect(value).toBe('read')
    }
  })

  it('mintInstallationToken yields null expiresAt on an ill-formed API date (rm-185 defensive normalization)', async () => {
    respondWith = () => ({status: 201, body: {token: 'ghs_illformed002', expires_at: 'not-a-date'}})
    const client = createDashboardAppClient({appId: '123456', privateKey, baseUrl})

    const minted = await client.mintInstallationToken(7, {metadata: 'read'})

    expect(minted.token).toBe('ghs_illformed002')
    expect(minted.expiresAt).toBeNull()
  })
})

describe('createInstallationGraphqlQueryFn (rm-022 direct coverage)', () => {
  it('forwards the token, query, and variables and resolves the served data (getToken seam)', async () => {
    respondWith = () => ({status: 200, body: {data: {repository: {name: 'dashboard'}}}})
    const requestedInstallationIds: number[] = []
    const query = createInstallationGraphqlQueryFn(async installationId => {
      requestedInstallationIds.push(installationId)
      return 'ghs_graphqltoken'
    }, {baseUrl})

    const queryText = 'query RepoStatus($owner: String!) { repository(owner: $owner) { name } }'
    const result = await query(4242, queryText, {owner: 'fro-bot'})

    expect(result).toEqual({repository: {name: 'dashboard'}})
    expect(requestedInstallationIds).toEqual([4242])

    expect(captured.length).toBe(1)
    const wire = captured[0]
    expect(wire?.method).toBe('POST')
    expect(wire?.url).toBe('/graphql')
    expect(wire?.authorization).toBe('token ghs_graphqltoken')
    expect(wire?.body.query).toBe(queryText)
    expect(wire?.body.variables).toEqual({owner: 'fro-bot'})
  })
})

describe('safeErrorMessage (rm-022 direct coverage)', () => {
  it('non-Error input degrades to the stable placeholder instead of throwing', () => {
    expect(safeErrorMessage('just a string')).toBe('Unknown error')
    expect(safeErrorMessage({odd: true})).toBe('Unknown error')
    expect(safeErrorMessage(undefined)).toBe('Unknown error')
  })
})
