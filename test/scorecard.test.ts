/**
 * rm-229 (cycle-18, run 743f2e47) — OpenSSF Scorecard posture column source.
 *
 * The fleet panel reads per-repo Scorecard posture from the public zero-auth
 * API (api.securityscorecards.dev — proven live 2026-09-26: codeo1io/dashboard
 * 7.8 / 18 checks, push-triggered freshness). The contract this suite pins:
 *
 *   1. Every failure mode resolves to `undefined` (absent column) — the
 *      posture fetch may NEVER reject into the refresh path, never delay the
 *      snapshot past its own timeout, and never render a partially-parsed
 *      payload. Absent-tolerant is the whole design.
 *   2. Only the curated check set is carried (the selected five), not the
 *      full 18-check payload — the column is a posture signal, not a mirror.
 *   3. Defensive narrowing: no `any`, and a malformed body degrades to
 *      absent rather than throwing on a shape assumption.
 */
import {afterEach, describe, expect, it, vi} from 'vitest'

import {fetchScorecard, SCORECARD_SELECTED_CHECKS} from '../src/github/scorecard.ts'

const realFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = realFetch
  vi.restoreAllMocks()
})

function mockFetchOnce(implementation: (input: string | URL | Request, init?: RequestInit) => Promise<Response>) {
  globalThis.fetch = vi.fn(implementation)
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {status, headers: {'content-type': 'application/json'}})
}

describe('rm-229 — fetchScorecard (public OpenSSF Scorecard API)', () => {
  it('maps a well-formed payload to score/analyzedAt + the curated check states', async () => {
    mockFetchOnce(async () =>
      jsonResponse({
        repo: {name: 'dashboard', commit: 'abc'},
        score: 7.8,
        date: '2026-09-25T13:14:10Z',
        checks: [
          {name: 'Branch-Protection', state: 'pass'},
          {name: 'Code-Review', state: 'fail'},
          {name: 'Token-Permissions', state: 'pass'},
          {name: 'Something-Unselected', state: 'pass'},
          {name: 'Pinned-Dependencies', state: 'fail'},
          {name: 'Dangerous-Workflow', state: 'notApplicable'},
        ],
      }),
    )

    const info = await fetchScorecard('codeo1io', 'dashboard')

    expect(info).toEqual({
      score: 7.8,
      analyzedAt: '2026-09-25T13:14:10Z',
      checks: [
        {name: 'Branch-Protection', state: 'pass'},
        {name: 'Code-Review', state: 'fail'},
        {name: 'Token-Permissions', state: 'pass'},
        {name: 'Pinned-Dependencies', state: 'fail'},
        {name: 'Dangerous-Workflow', state: 'notApplicable'},
      ],
    })
  })

  it('404 (never analyzed / private repo) resolves absent, no throw', async () => {
    mockFetchOnce(async () => jsonResponse({message: 'Not Found'}, 404))
    await expect(fetchScorecard('org', 'never-analyzed')).resolves.toBeUndefined()
  })

  it('any non-2xx resolves absent, no throw', async () => {
    mockFetchOnce(async () => jsonResponse({}, 503))
    await expect(fetchScorecard('org', 'repo')).resolves.toBeUndefined()
  })

  it('transport rejection (DNS/network/timeout abort) resolves absent, no throw', async () => {
    mockFetchOnce(async () => {
      throw new Error('fetch failed')
    })
    await expect(fetchScorecard('org', 'repo')).resolves.toBeUndefined()
  })

  it('malformed body (non-object, missing score/date) resolves absent', async () => {
    mockFetchOnce(async () => jsonResponse('not-an-object'))
    await expect(fetchScorecard('org', 'repo')).resolves.toBeUndefined()

    mockFetchOnce(async () => jsonResponse({checks: []})) // score/date missing
    await expect(fetchScorecard('org', 'repo')).resolves.toBeUndefined()

    mockFetchOnce(async () => jsonResponse({score: 'high', date: 'yesterday'})) // wrong types
    await expect(fetchScorecard('org', 'repo')).resolves.toBeUndefined()
  })

  it('a malformed checks array degrades to no check rows but keeps the score column', async () => {
    mockFetchOnce(async () => jsonResponse({score: 5.5, date: '2026-09-01T00:00:00Z', checks: 'nope'}))
    await expect(fetchScorecard('org', 'repo')).resolves.toEqual({
      score: 5.5,
      analyzedAt: '2026-09-01T00:00:00Z',
      checks: [],
    })
  })

  it('targets the public API URL with the encoded owner/name path', async () => {
    const calls: string[] = []
    mockFetchOnce(async input => {
      calls.push(String(input))
      return jsonResponse({score: 1, date: 'd', checks: []})
    })
    await fetchScorecard('my org', 'my/repo')
    expect(calls[0]).toBe('https://api.securityscorecards.dev/projects/github.com/my%20org/my%2Frepo')
  })

  it('SCORECARD_SELECTED_CHECKS is the curated five (contract of the column)', () => {
    expect([...SCORECARD_SELECTED_CHECKS]).toEqual([
      'Branch-Protection',
      'Code-Review',
      'Pinned-Dependencies',
      'Token-Permissions',
      'Dangerous-Workflow',
    ])
  })
})
