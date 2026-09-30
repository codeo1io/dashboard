import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

// rm-197 (review fix): unit tests inject graphqlQueryFn/metadataReader fakes,
// so the REAL GitHub transport constructions are never exercised — which is
// exactly how the independent review (attempt 6f4e6190, finding F1) caught
// two constructions in server.ts carrying no request timeout while the
// in-diff comments asserted every transport was bounded. This gate pins the
// wiring at the source level.
//
// rm-251 (cycle-18 tightening): a bare `request.timeout` key is NOT a bound.
// docs/solutions/runtime-errors/octokit-timeout-option-inert-on-hung-upstreams-bind-at-fetch-layer-2026-09-24.md
// proves undici never rejects a hung upstream on the timeout option — only a
// fetch-layer seam (fetch: createBoundedFetch(...), which races
// AbortSignal.timeout against the socket) actually aborts. The gate previously
// accepted the inert key, which is how src/github/installations.ts shipped an
// unbounded pagination transport while this suite stayed green. Every
// construction site must now carry the fetch seam in its window.

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
const FETCH_SEAM = /fetch\s*:\s*createBoundedFetch/

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

describe('GitHub transport timeout contract (rm-197 review fix, rm-251 tightening)', () => {
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
    '%s binds the fetch layer (createBoundedFetch) — a bare timeout key is inert on hung upstreams',
    (_, site) => {
      expect(
        FETCH_SEAM.test(site.window),
        `transport construction at ${site.file}:${site.line} lacks fetch: createBoundedFetch within ${WINDOW_LINES} lines — the Octokit timeout option does not abort hung upstreams (see docs/solutions/runtime-errors/octokit-timeout-option-inert-on-hung-upstreams-bind-at-fetch-layer-2026-09-24.md):\n${site.window}`,
      ).toBe(true)
    },
  )
})
