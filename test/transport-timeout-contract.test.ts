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
// AbortSignal.timeout) within its construction window.

const repoRoot = process.cwd()

const TRANSPORT_FILES = [
  'src/server.ts',
  'src/github/app-client.ts',
  'src/github/installations.ts',
  'src/github/metadata.ts',
  'src/auth/oauth.ts',
] as const

const CONSTRUCTION = /new \w*Octokit\(|graphql\.defaults\(/
const WINDOW_LINES = 8
const TIMEOUT = /timeout\s*:|AbortSignal\.timeout/

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
})

describe('rm-267 — bounded fetch at every Octokit construction site', () => {
  // A bare `request: {timeout}` is INERT on hung upstreams in this runtime
  // (rm-156 solution): only the injected fetch seam enforces the bound. So
  // every Octokit construction in the transport surface must wire
  // createBoundedFetch alongside its timeout — a timeout without the seam
  // fails this contract. installations.ts:334 regressed exactly this shape
  // while passing the TIMEOUT-only contract above (green 5/5 with the gap).
  const FETCH_SEAM = /fetch\s*:\s*createBoundedFetch/
  const OCTOKIT_CONSTRUCTION = /new \w*Octokit\(/

  it('every Octokit construction window carries the fetch seam', () => {
    const sites = collectConstructionSites()
    const octokitSites = sites.filter(({window}) => OCTOKIT_CONSTRUCTION.test(window))
    // app-client ThrottledOctokit, server installOctokit, installations installOctokit
    expect(octokitSites.length).toBeGreaterThanOrEqual(3)
    for (const {file, line, window} of octokitSites) {
      expect(
        FETCH_SEAM.test(window),
        `Octokit construction at ${file}:${line} has no fetch: createBoundedFetch seam within ${WINDOW_LINES} lines:\n${window}`,
      ).toBe(true)
    }
  })
})
