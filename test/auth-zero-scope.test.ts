import {Buffer} from 'node:buffer'
import {describe, expect, it} from 'vitest'
import {makeGitHubOAuthClient} from '../src/auth/oauth.ts'
import {buildDashboardApp} from '../src/server.ts'

/**
 * rm-2092: zero-scope operator sign-in (upstream fro-bot/agent v0.123.1
 * #1856, verbatim adoption).
 *
 * The dashboard's OAuth app is a single-operator sign-in: the access token is
 * spent ONLY on fetching the operator's own id/login (the allowlist check),
 * which needs NO OAuth scope. 'read:user' was the last scope requested — a
 * standing over-grant the upstream gateway already dropped. Two legs, both
 * red-first against the ['read:user'] call site:
 *
 *  1. route leg: GET /auth/login must hand the OAuth seam an EMPTY scope
 *     list (the recorded over-grant is ['read:user']);
 *  2. client leg: the production client must omit the scope parameter
 *     entirely for an empty list (a 'scope=' empty-value parameter is not
 *     the documented zero-scope request shape).
 *
 * Caveat recorded with the change (README names it too): existing grants are
 * NOT auto-revoked by GitHub — the zero-scope posture holds for NEW
 * authorizations; previously-authorized operators keep their existing grant
 * scopes until re-authorized.
 */

const TEST_KEY = Buffer.from('testkey-ABCDEFGHIJKLMNOPQRSTUV12', 'utf8')

function makeRecordingOauthClient(scopesLog: string[][]) {
  return {
    createAuthorizationURL: (state: string, scopes: string[]) => {
      scopesLog.push(scopes)
      return new URL(`https://github.com/login/oauth/authorize?state=${state}`)
    },
    validateAuthorizationCode: async () => ({accessToken: () => 'fake-access-token'}),
  }
}

describe('zero-scope operator OAuth (rm-2092)', () => {
  it('GET /auth/login requests an EMPTY scope list (no read:user over-grant)', async () => {
    const scopesLog: string[][] = []
    const app = await buildDashboardApp({
      operatorLogin: 'octocat',
      cookieKey: TEST_KEY,
      oauthClient: makeRecordingOauthClient(scopesLog),
      fetchUserLogin: async () => 'octocat',
    })
    const res = await app.request('/auth/login')
    expect(res.status).toBe(302)
    expect(
      scopesLog,
      'the authorize call must hand the OAuth seam an empty scope array — upstream v0.123.1 #1856 dropped read:user; any scope here is a standing over-grant the single-operator sign-in never spends',
    ).toEqual([[]])
  })

  it('production client: an empty scope list OMITS the scope parameter (no scope= empty value)', () => {
    const client = makeGitHubOAuthClient(
      'client-id',
      'client-secret',
      'https://dashboard.example.com/auth/callback',
    )
    const url = client.createAuthorizationURL('state value', [], {
      codeChallenge: 'challenge-value',
      codeChallengeMethod: 'S256',
    })
    expect(
      url.searchParams.has('scope'),
      'a zero-scope authorize request must omit the scope parameter entirely (GitHub documents no-scope as the absent parameter; scope= is an empty-value parameter, a different request shape)',
    ).toBe(false)
    expect(url.searchParams.get('client_id')).toBe('client-id')
    expect(url.searchParams.get('code_challenge')).toBe('challenge-value')
  })

  it('production client: non-empty scope lists still join into one scope parameter (regression pin)', () => {
    const client = makeGitHubOAuthClient(
      'client-id',
      'client-secret',
      'https://dashboard.example.com/auth/callback',
    )
    const url = client.createAuthorizationURL('state value', ['read:user', 'repo:status'], {
      codeChallenge: 'challenge-value',
      codeChallengeMethod: 'S256',
    })
    expect(url.searchParams.get('scope')).toBe('read:user repo:status')
  })
})
