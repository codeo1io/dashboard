import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

// rm-197 (review fix): unit tests inject graphqlQueryFn/metadataReader fakes,
// so the REAL GitHub transport constructions are never exercised — which is
// exactly how the independent review (attempt 6f4e6190, finding F1) caught
// two constructions in server.ts carrying no request timeout while the
// in-diff comments asserted every transport was bounded. This gate pins the
// wiring at the source level: every Octokit/graphql construction site in the
// server tree must carry an explicit timeout (request.timeout or
// AbortSignal.timeout) within its construction window, and — since the
// rm-156 finding proved `request.timeout` alone is inert against hung
// upstreams — an enforced fetch seam (`fetch: createBoundedFetch`) in the
// same window.

const repoRoot = process.cwd()

const TRANSPORT_FILES = [
  'src/server.ts',
  'src/github/app-client.ts',
  'src/github/installations.ts',
  'src/github/metadata.ts',
  'src/auth/oauth.ts',
] as const

const CONSTRUCTION = /new \w*Octokit\(|graphql\.defaults\(/
const WINDOW_LINES = 12
const TIMEOUT = /timeout\s*:|AbortSignal\.timeout/
// rm-221 (2026-09-29): the timeout key alone does not bound hung upstreams —
// only the fetch seam does. The gate previously accepted a bare `timeout:`
// and stayed green while installations.ts ran an unbounded enumeration
// transport; this second assertion closes that blind spot.
const FETCH_BOUND = /fetch\s*:\s*createBoundedFetch|AbortSignal\.timeout/

interface ConstructionSite {
  file: string
  line: number
  window: string
}

function collectConstructionSites(): ConstructionSite[] {
  const sites: ConstructionSite[] = []
  for (const rel of TRANSPORT_FILES) {
    const lines = readFileSync(resolve(repoRoot, rel), 'utf8').split('\n')
    lines.forEach((line, index) => {
      if (CONSTRUCTION.test(line)) {
        sites.push({file: rel, line: index + 1, window: lines.slice(index, index + WINDOW_LINES).join('\n')})
      }
    })
  }
  return sites
}

describe('GitHub transport timeout contract (rm-197 review fix)', () => {
  const sites = collectConstructionSites()

  it('found transport construction sites to pin (guard against silent pattern drift)', () => {
    // Four construction sites at the time of writing (server.ts metadata
    // Octokit + per-repo graphql.defaults, app-client ThrottledOctokit,
    // installations Octokit); auth/oauth.ts is bounded by AbortSignal.timeout
    // inside its fetch path rather than a matching construction site.
    // If this floor fails, the CONSTRUCTION regex drifted — fix the regex,
    // do not lower the floor.
    expect(sites.length).toBeGreaterThanOrEqual(4)
  })

  it.each(sites.map(site => [`${site.file}:${site.line}`, site] as const))(
    '%s carries an explicit request timeout',
    (_, site) => {
      expect(
        TIMEOUT.test(site.window),
        `transport construction at ${site.file}:${site.line} has no timeout within ${WINDOW_LINES} lines:\n${site.window}`,
      ).toBe(true)
    },
  )

  it.each(sites.map(site => [`${site.file}:${site.line}`, site] as const))(
    '%s enforces the bound at the fetch layer (rm-221)',
    (_, site) => {
      expect(
        FETCH_BOUND.test(site.window),
        `transport construction at ${site.file}:${site.line} carries no enforced fetch seam (fetch: createBoundedFetch / AbortSignal.timeout) within ${WINDOW_LINES} lines — a bare request.timeout is inert against hung upstreams (rm-156):\n${site.window}`,
      ).toBe(true)
    },
  )
})
