/**
 * Test suite for src/github/scorecard.ts (ledger rm-1974, cycle-18 batch run
 * 743f2e47).
 *
 * Every fixture mirrors the LIVE api.securityscorecards.dev payload shape,
 * re-verified 2026-10-18 against codeo1io/dashboard (HTTP 200, repo score
 * 7.7, analyzedAt 2026-10-17T22:25:51Z, 18 checks): check objects carry
 * exactly details/documentation/name/reason/score — there is NO state field.
 * The original implementation destructured `state` and therefore dropped
 * every check (the round's P1 finding); these tests pin the name-keyed,
 * live-shape-only contract so that regression cannot return unnoticed.
 */

import type {ScorecardInfo} from '../src/github/scorecard.ts'

import {afterEach, describe, expect, it, vi} from 'vitest'
import {fetchScorecard} from '../src/github/scorecard.ts'

/**
 * Live-shaped check rows (abbreviated to the fields the module reads plus
 * the API's other documented keys, to pin that unknown keys are ignored,
 * not required). Real values from the 2026-10-18 fetch: Branch-Protection
 * scored -1 with an "internal error" reason — the informational case.
 */
function liveCheck(name: string, score: number, reason: string): Record<string, unknown> {
  return {
    details: `https://github.com/ossf/scorecard/blob/main/docs/checks.md#${name.toLowerCase()}`,
    documentation: {url: 'https://github.com/ossf/scorecard#readme', short: 'OSSF Scorecard'},
    name,
    reason,
    score,
  }
}

function livePayload(): Record<string, unknown> {
  return {
    score: 7.7,
    date: '2026-10-17T22:25:51Z',
    checks: [
      liveCheck('Maintained', 10, '30 commit(s) in the last 90 days'),
      liveCheck('Binary-Artifacts', 10, 'no binaries found in the repo'),
      liveCheck('Branch-Protection', -1, 'internal error: remote branch protection setting is disabled on purpose'),
      liveCheck('Code-Review', 0, 'found 0 unreviewed changesets'),
      liveCheck('Pinned-Dependencies', 10, 'dependency locked with lockfiles'),
      liveCheck('Security-Policy', 10, 'security policy file detected'),
      liveCheck('Token-Permissions', 9, 'GitHub workflow tokens follow principle of least privilege'),
      // A curated check with a non-number score is skipped defensively —
      // the live API always sends a number, but the module must not crash.
      {...liveCheck('CII-Best-Practices', 0, 'no badge'), score: '10'},
    ],
  }
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {status, headers: {'content-type': 'application/json'}})
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('scorecard — live payload shape (rm-1974)', () => {
  it('maps the live name/score shape name-keyed, with raw per-check scores (no state field exists)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(livePayload())))
    const info = await fetchScorecard('codeo1io', 'dashboard')
    const expected: ScorecardInfo = {
      score: 7.7,
      analyzedAt: '2026-10-17T22:25:51Z',
      checks: [
        {name: 'Binary-Artifacts', score: 10},
        {name: 'Branch-Protection', score: -1},
        {name: 'Code-Review', score: 0},
        {name: 'Pinned-Dependencies', score: 10},
        {name: 'Security-Policy', score: 10},
      ],
    }
    expect(info).toEqual(expected)
    // P1 pin: no fixture (and no code path) may introduce a state field.
    expect(JSON.stringify(info)).not.toContain('state')
  })

  it('curates only the selected checks — unselected rows are omitted, not mapped', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(livePayload())))
    const info = await fetchScorecard('codeo1io', 'dashboard')
    const names = info?.checks.map(check => check.name) ?? []
    expect(names).not.toContain('Maintained')
    expect(names).not.toContain('Token-Permissions')
    expect(names).not.toContain('CII-Best-Practices')
  })

  it('passes the informational -1 score through raw (no invented thresholds)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(livePayload())))
    const info = await fetchScorecard('codeo1io', 'dashboard')
    expect(info?.checks.find(check => check.name === 'Branch-Protection')).toEqual({name: 'Branch-Protection', score: -1})
  })
})

describe('scorecard — fail-soft absence (rm-1974)', () => {
  it('resolves undefined on 404 (private or unanalyzed repo)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not found', {status: 404})))
    await expect(fetchScorecard('codeo1io', 'private-repo')).resolves.toBeUndefined()
  })

  it('resolves undefined on transport failure (offline runner)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))
    await expect(fetchScorecard('codeo1io', 'dashboard')).resolves.toBeUndefined()
  })

  it('resolves undefined on non-JSON payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>gateway error</html>', {status: 200})))
    await expect(fetchScorecard('codeo1io', 'dashboard')).resolves.toBeUndefined()
  })

  it('resolves undefined when the repo-level score is not a number', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({score: null, date: '2026-10-17T22:25:51Z', checks: []})))
    await expect(fetchScorecard('codeo1io', 'dashboard')).resolves.toBeUndefined()
  })

  it('treats a missing checks array as an empty curated set, not a failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({score: 5.5, date: '2026-10-17T22:25:51Z'})))
    await expect(fetchScorecard('codeo1io', 'dashboard')).resolves.toEqual({score: 5.5, analyzedAt: '2026-10-17T22:25:51Z', checks: []})
  })
})

describe('scorecard — endpoint hygiene (rm-1974)', () => {
  it('requests the public zero-auth REST endpoint for the given owner/name', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(livePayload()))
    vi.stubGlobal('fetch', fetchMock)
    await fetchScorecard('codeo1io', 'dashboard')
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.securityscorecards.dev/projects/github.com/codeo1io/dashboard')
    expect(init.headers).toEqual({accept: 'application/json'})
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })
})
