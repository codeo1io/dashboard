import {generateKeyPairSync} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'
import {Octokit} from '@octokit/core'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {GITHUB_API_VERSION, pinGitHubApiVersion} from '../src/github/api-version.ts'
import {createDashboardAppClient} from '../src/github/app-client.ts'

/**
 * rm-855: every GitHub REST egress path must carry the pinned
 * X-GitHub-Api-Version header, set once at Octokit construction (single
 * source: src/github/api-version.ts).
 *
 * BEHAVIORAL legs are wire-level, not cosmetic: @octokit/core 7.0.8 reads no
 * `defaultHeaders` constructor option (verified against its dist-src — a
 * `defaultHeaders` key is silently dropped), so the pin is written into
 * `request.endpoint.DEFAULTS.headers`, the merge base shared by direct
 * requests, the hook pipeline, and auth-strategy token mints. These legs pin
 * that mechanism: if a future @octokit/core makes the pin ineffective, the
 * wire observation here goes red.
 */

const repoRoot = process.cwd()

function read(rel: string): string {
  return readFileSync(resolve(repoRoot, rel), 'utf8')
}

describe('pinGitHubApiVersion (rm-855)', () => {
  const realFetch = globalThis.fetch
  afterEach(() => {
    globalThis.fetch = realFetch
    vi.restoreAllMocks()
  })

  it('a pinned client carries the header on the endpoint merge of every REST request', () => {
    const octokit = pinGitHubApiVersion(new Octokit())
    const resolved = octokit.request.endpoint('GET /repos/o/r')
    expect(resolved.headers['x-github-api-version']).toBe(GITHUB_API_VERSION)
  })

  it('a pinned client sends the header on the wire for REST requests', async () => {
    const observed: Record<string, string>[] = []
    const fetchFn = vi.fn(async (_input: string | URL, init?: RequestInit) => {
      observed.push(Object.fromEntries(Object.entries(init?.headers ?? {})))
      return new Response(JSON.stringify({}), {status: 200, headers: {'content-type': 'application/json'}})
    }) as unknown as typeof fetch
    globalThis.fetch = fetchFn
    const octokit = pinGitHubApiVersion(new Octokit({auth: 'tok_test'}))
    await octokit.request('GET /repos/o/r')
    expect(observed).toHaveLength(1)
    expect(observed[0]?.['x-github-api-version']).toBe(GITHUB_API_VERSION)
  })

  it('the pin survives the auth hook pipeline (header observed inside the request hook)', async () => {
    const octokit = pinGitHubApiVersion(new Octokit({auth: 'tok_test'}))
    let hookHeader: string | undefined
    octokit.hook.wrap(
      'request',
      async (_request, options) => {
        const observed = options.headers['x-github-api-version']
        hookHeader = typeof observed === 'string' ? observed : undefined
        return {status: 200, headers: {}, data: {}, url: options.url ?? ''}
      },
    )
    await octokit.request('GET /repos/o/r')
    expect(hookHeader).toBe(GITHUB_API_VERSION)
  })

  it('an unpinned client does NOT carry the header (guard against a vacuous pin)', () => {
    const resolved = new Octokit().request.endpoint('GET /repos/o/r')
    expect(resolved.headers['x-github-api-version']).toBeUndefined()
  })
})

describe('createDashboardAppClient (rm-855)', () => {
  it('is pinned: every REST request resolves the version header', () => {
    const {privateKey} = generateTestKey()
    const client = createDashboardAppClient({appId: '123456', privateKey, requestTimeoutMs: 100})
    const resolved = client.octokit.request.endpoint('GET /app/installations')
    expect(resolved.headers['x-github-api-version']).toBe(GITHUB_API_VERSION)
  })
})

const SITES = [
  {file: 'src/github/app-client.ts', pattern: /pinGitHubApiVersion\([\t\v\f\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]*\n\s*new ThrottledOctokit\(/},
  {file: 'src/github/installations.ts', pattern: /pinGitHubApiVersion\([\t\v\f\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]*\n\s*new Octokit\(/},
  {file: 'src/server.ts', pattern: /pinGitHubApiVersion\([\t\v\f\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]*\n\s*new Octokit\(/},
] as const

describe('API-version construction sites (rm-855, source pin)', () => {
  it('every Octokit construction is pinned at its site', () => {
    for (const {file, pattern} of SITES) {
      expect(pattern.test(read(file)), `${file} must construct via pinGitHubApiVersion`).toBe(true)
    }
  })

  it('no dead `defaultHeaders:` option remains (silently dropped by @octokit/core 7)', () => {
    for (const rel of ['src/github/app-client.ts', 'src/github/installations.ts', 'src/server.ts']) {
      // Only the constructor-option USAGE is banned; prose explaining the
      // absence is the point and stays.
      expect(read(rel)).not.toMatch(/defaultHeaders\s*:/)
    }
  })

  it('the manual OAuth token-exchange fetch reads the same constant (single source)', () => {
    const oauth = read('src/auth/oauth.ts')
    expect(oauth).toContain(`'X-GitHub-Api-Version': GITHUB_API_VERSION`)
    expect(oauth).toContain("from '../github/api-version.ts'")
  })

  it('GraphQL stays versionless with the documented rationale at its site', () => {
    const appClient = read('src/github/app-client.ts')
    const site = appClient.slice(appClient.indexOf('graphql.defaults'))
    expect(site).toContain('DOCUMENTED VERSIONLESS')
  })
})

function generateTestKey(): {privateKey: string} {
  // Throwaway keypair generated per run — never a real App credential.
  return generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: {type: 'pkcs8', format: 'pem'},
    publicKeyEncoding: {type: 'spki', format: 'pem'},
  })
}
