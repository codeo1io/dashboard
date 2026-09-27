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
// rm-221 (cycle-18): the refresh path was CENTRALIZED — every per-token
// transport (repo pagination, metadata contents reads, per-repo GraphQL)
// now constructs via createInstallationOctokit in src/github/app-client.ts
// instead of scattering bare Octokit/graphql.defaults clients across
// server.ts / installations.ts. The contract therefore evolved from
// "each of four scattered construction sites carries an inline timeout" to
// the strictly stronger centralization invariant:
//   A. NO direct transport construction outside the app-client module
//      (any new one must either route through the factory or re-justify
//      itself here with an inline timeout);
//   B. every construction inside app-client (the two bounded factories)
//      carries an explicit timeout within its construction window;
//   C. the former direct-construction surfaces still reach the factory
//      (server.ts: GraphQL + metadata reader; installations.ts: pagination);
//   D. auth/oauth.ts raw fetches (the one transport family outside Octokit)
//      stay bounded by AbortSignal.timeout per call.
// auth/oauth.ts is bounded inside its fetch paths rather than at a
// construction site — that is family D, checked explicitly.

const repoRoot = process.cwd()

const TRANSPORT_FILES = [
  'src/server.ts',
  'src/github/app-client.ts',
  'src/github/installations.ts',
  'src/github/metadata.ts',
  'src/auth/oauth.ts',
] as const

const FACTORY_MODULE = 'src/github/app-client.ts'

const CONSTRUCTION = /new \w*Octokit\(|graphql\.defaults\(/
const FACTORY_CALL = /createInstallationOctokit\(|createDashboardAppClient\(/
const OAUTH_FETCH = /await fetch\('/
const WINDOW_LINES = 8
const TIMEOUT = /timeout\s*:|AbortSignal\.timeout/

interface Site {
  file: string
  line: number
  window: string
}

function scanFiles(rel: string, pattern: RegExp): Site[] {
  const lines = readFileSync(resolve(repoRoot, rel), 'utf8').split('\n')
  const sites: Site[] = []
  lines.forEach((line, index) => {
    if (pattern.test(line)) {
      sites.push({file: rel, line: index + 1, window: lines.slice(index, index + WINDOW_LINES).join('\n')})
    }
  })
  return sites
}

describe('GitHub transport timeout contract (rm-197 review fix, rm-221 centralization)', () => {
  const constructions: Site[] = TRANSPORT_FILES.flatMap(rel => scanFiles(rel, CONSTRUCTION))

  it('A: constructs transports ONLY inside the app-client factory module', () => {
    // rm-221: the two remaining `new ThrottledOctokit(` sites ARE the
    // factories every transport routes through. A construction appearing
    // anywhere else is an untracked new transport — route it through the
    // factory or give it an inline timeout and extend this contract.
    expect(
      constructions.filter(site => site.file !== FACTORY_MODULE),
      'direct transport constructions outside the factory module',
    ).toEqual([])
  })

  it('factory module still constructs the two bounded transports (guard against silent pattern drift)', () => {
    // Was "4 sites" pre-rm-221 (server graphql + metadata Octokit +
    // installations Octokit + app-client). The count did not silently drift:
    // the three non-factory sites became factory CALLS (family C) and their
    // construction moved here. If this floor fails, the CONSTRUCTION regex
    // drifted — fix the regex, do not lower the floor.
    expect(constructions.filter(site => site.file === FACTORY_MODULE).length).toBeGreaterThanOrEqual(2)
  })

  it.each(
    constructions
      .filter(site => site.file === FACTORY_MODULE)
      .map(site => [`${site.file}:${site.line}`, site] as const),
  )('%s carries an explicit request timeout', (_, site) => {
    expect(
      TIMEOUT.test(site.window),
      `transport construction at ${site.file}:${site.line} has no timeout within ${WINDOW_LINES} lines:\n${site.window}`,
    ).toBe(true)
  })

  it('C: the former direct-construction surfaces still route through the factory', () => {
    const expectations: readonly (readonly [string, number])[] = [
      // server.ts: per-repo GraphQL + the metadata reader (>=2 factory calls)
      ['src/server.ts', 2],
      // installations.ts: repo-list pagination (>=1 factory call)
      ['src/github/installations.ts', 1],
    ]
    for (const [rel, floor] of expectations) {
      const calls = scanFiles(rel, FACTORY_CALL).length
      expect(calls, `factory-routed transports in ${rel}`).toBeGreaterThanOrEqual(floor)
    }
  })

  it('D: every auth/oauth.ts raw fetch is bounded by AbortSignal.timeout', () => {
    const fetches = scanFiles('src/auth/oauth.ts', OAUTH_FETCH)
    expect(fetches.length).toBeGreaterThanOrEqual(2)
    // The oauth option blocks are longer than the construction window, so a
    // per-site window check mis-measures; the exact invariant is equality:
    // every raw fetch in the module has its own AbortSignal.timeout signal.
    const bounds = scanFiles('src/auth/oauth.ts', /AbortSignal\.timeout/)
    expect(bounds.length, 'one AbortSignal.timeout per raw fetch in src/auth/oauth.ts').toBe(fetches.length)
  })
})
