import http from 'node:http'
import {generateKeyPairSync} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'
import {afterAll, beforeAll, describe, expect, it} from 'vitest'

import {createDashboardAppClient, GITHUB_API_VERSION} from '../src/github/app-client.ts'

/**
 * rm-855: X-GitHub-Api-Version pinned at every GitHub REST egress seam.
 *
 * Two legs, mirroring the transport-timeout contract gate:
 *
 * 1. Source census — every `new *Octokit(` construction in the transport
 *    tree must carry the pin (an `octokit.request = octokit.request.defaults(
 *    {headers})` reassignment — @octokit/core 7.x DROPS constructor-level
 *    default headers, so the reassignment is the only honored seam); every
 *    `graphql.defaults(` site must carry the versionless note (GraphQL has
 *    no calendar-version header); oauth.ts must pin the api.github.com fetch
 *    via GITHUB_API_VERSION and document why the login/oauth/* endpoints are
 *    unpinned. Unit tests inject fakes for the private closures (metadata
 *    reader, per-install REST walker), so source-level pinning is the only
 *    honest guard for those two sites.
 * 2. On-the-wire — the exported client factory is exercised against a real
 *    local HTTP fixture: the header must arrive on both a REST request AND
 *    the auth-app installation-token mint (which rides octokit.request).
 */

const repoRoot = process.cwd()

const TRANSPORT_FILES = [
  'src/server.ts',
  'src/github/app-client.ts',
  'src/github/installations.ts',
  'src/auth/oauth.ts',
] as const

const OCTOKIT_CONSTRUCTION = /new \w*Octokit\(/
const GRAPHQL_CONSTRUCTION = /graphql\.defaults\(/
const PIN_REASSIGN = /\.request\s*=\s*\w+\.request\.defaults\(/
// The reassignment lands AFTER the (multi-line) constructor call — 60 lines
// covers the widest construction site in the tree (app-client's ThrottledOctokit)
// without accepting a pin parked at an unrelated construction.
const PIN_WINDOW_LINES = 60
const GRAPHQL_WINDOW_LINES = 8

function readLines(rel: string): string[] {
  return readFileSync(resolve(repoRoot, rel), 'utf8').split('\n')
}

describe('GitHub REST api-version pin — source census (rm-855)', () => {
  it('every Octokit construction site carries the request.defaults pin', () => {
    const failures: string[] = []
    for (const rel of TRANSPORT_FILES) {
      const lines = readLines(rel)
      lines.forEach((line, index) => {
        if (!OCTOKIT_CONSTRUCTION.test(line)) return
        const window = lines.slice(index, index + PIN_WINDOW_LINES).join('\n')
        const pinned = PIN_REASSIGN.test(window) && window.includes('GITHUB_API_VERSION')
        if (!pinned) failures.push(`${rel}:${index + 1} — no request.defaults({headers: GITHUB_API_VERSION}) within ${PIN_WINDOW_LINES} lines`)
      })
    }
    expect(failures).toEqual([])
  })

  it('every graphql.defaults site documents GraphQL as versionless (no header owed)', () => {
    const failures: string[] = []
    for (const rel of TRANSPORT_FILES) {
      const lines = readLines(rel)
      lines.forEach((line, index) => {
        if (!GRAPHQL_CONSTRUCTION.test(line)) return
        const window = lines
          .slice(Math.max(0, index - GRAPHQL_WINDOW_LINES), index + GRAPHQL_WINDOW_LINES)
          .join('\n')
        if (!/versionless/i.test(window)) failures.push(`${rel}:${index + 1} — no versionless note near graphql.defaults`)
      })
    }
    expect(failures).toEqual([])
  })

  it('oauth.ts pins the api.github.com REST fetch and documents the OAuth web-flow exemption', () => {
    const source = readLines('src/auth/oauth.ts').join('\n')
    expect(source, 'api.github.com fetch uses the shared constant').toMatch(
      /api\.github\.com[\s\S]*X-GitHub-Api-Version': GITHUB_API_VERSION/,
    )
    expect(source, 'login/oauth token exchange documents rm-855 exemption').toMatch(
      /no X-GitHub-Api-Version here by design[\s\S]{0,600}login\/oauth\/access_token/,
    )
  })

  it('the constant is the pinned calendar version', () => {
    expect(GITHUB_API_VERSION).toBe('2022-11-28')
  })
})

describe('GitHub REST api-version pin — on the wire (rm-855)', () => {
  const received: {url: string; version: string | null}[] = []
  let server: http.Server
  let baseUrl: string

  const {privateKey} = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {type: 'spki', format: 'pem'},
    privateKeyEncoding: {type: 'pkcs8', format: 'pem'},
  })

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      const raw = req.headers['x-github-api-version']
      const version = Array.isArray(raw) ? raw[0] ?? null : raw ?? null
      received.push({url: req.url ?? '', version})
      res.writeHead(200, {'content-type': 'application/json'})
      res.end(JSON.stringify({ok: true, token: 'ghs_fixturetoken', expires_at: '2026-10-19T12:00:00Z'}))
    })
    await new Promise<void>(resolve => {
      server.listen(0, '127.0.0.1', () => resolve())
    })
    baseUrl = `http://127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}`
  })

  afterAll(async () => {
    await new Promise<void>(resolve => {
      server.close(() => resolve())
    })
  })

  it('sends the header on a REST request through the real client factory', async () => {
    const client = createDashboardAppClient({appId: '123456', privateKey, baseUrl})
    await client.octokit.request('GET /app')
    const hit = received.find(r => r.url === '/app')
    expect(received, 'request reached the fixture server').not.toHaveLength(0)
    expect(hit?.version).toBe(GITHUB_API_VERSION)
  })

  it('sends the header on the auth-app installation-token mint (rides octokit.request)', async () => {
    const client = createDashboardAppClient({appId: '123456', privateKey, baseUrl})
    const minted = await client.mintInstallationToken(42, {metadata: 'read'})
    expect(minted.token).toBe('ghs_fixturetoken')
    const hit = received.find(r => r.url === '/app/installations/42/access_tokens')
    expect(hit, 'mint reached the fixture server').toBeDefined()
    expect(hit?.version).toBe(GITHUB_API_VERSION)
  })
})
