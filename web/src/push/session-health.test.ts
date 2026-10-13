/**
 * Session push health fetch matrix (rm-980, contract 1.10.0, agent #1788).
 *
 * Every case folds a failure into a quiet, fail-closed result:
 * - `unconfigured` for a session whose `push` field is absent or malformed
 *   (mirrors the gateway parseOperatorSessionInfo drop-malformed semantics);
 * - `unavailable` for any transport / non-OK / body-parse failure — never a
 *   fabricated `ready`.
 *
 * No oracle surface: assertions cover the resolved kind only, never echoed
 * error detail.
 */
import {afterEach, describe, expect, it, vi} from 'vitest'
import {fetchSessionPushHealth} from './session-health.ts'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {status, headers: {'content-type': 'application/json'}})
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchSessionPushHealth — URL construction', () => {
  it('defaults to the production /operator/session path with credentials', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe('/operator/session')
      expect(init?.credentials).toBe('include')
      expect(init?.redirect).toBe('error')
      return jsonResponse({operatorId: 1, login: 'x', expiresAt: 1, push: {status: 'ready'}})
    })
    vi.stubGlobal('fetch', fetchMock)
    const result = await fetchSessionPushHealth()
    expect(result).toEqual({kind: 'health', status: 'ready'})
  })

  it('derives the fixture operator base by stripping /push and forwards the fixture session id', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe('/__fixture/operator/session?fixtureSessionId=s-7')
      return jsonResponse({operatorId: 1, login: 'x', expiresAt: 1})
    })
    vi.stubGlobal('fetch', fetchMock)
    const result = await fetchSessionPushHealth({
      endpointBase: '/__fixture/operator/push'.replace(/\/+push\/?$/, ''),
      fixtureSessionId: 's-7',
    })
    expect(result).toEqual({kind: 'unconfigured'})
  })
})

describe('fetchSessionPushHealth — body semantics (gateway 1.10.0)', () => {
  it.each(['ready', 'degraded', 'unknown'] as const)('relays an observed %s status verbatim', async status => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({operatorId: 1, login: 'x', expiresAt: 1, push: {status}})))
    const result = await fetchSessionPushHealth()
    expect(result).toEqual({kind: 'health', status})
  })

  it('a session with no push field (pre-1.10.0 gateway) is unconfigured, not an error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({operatorId: 1, login: 'x', expiresAt: 1})))
    expect(await fetchSessionPushHealth()).toEqual({kind: 'unconfigured'})
  })

  it.each([
    ['string push', {push: 'ready'}],
    ['array push', {push: [{status: 'ready'}]}],
    ['null push', {push: null}],
    ['unknown status value', {push: {status: 'fixture-not-a-status'}}],
    ['non-string status', {push: {status: 1}}],
    ['empty push object', {push: {}}],
    ['extra fields are ignored (health still read)', {push: {status: 'ready', detail: 'ignored'}, extra: 1}],
  ])('malformed/absent push folds to the quiet shape: %s', async (_name, body) => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(body)))
    const result = await fetchSessionPushHealth()
    if (_name.startsWith('extra fields')) {
      expect(result).toEqual({kind: 'health', status: 'ready'})
    } else {
      expect(result).toEqual({kind: 'unconfigured'})
    }
  })
})

describe('fetchSessionPushHealth — fail-closed transport matrix', () => {
  it('non-OK statuses (401 signed-out, 404 pre-route, 500) are unavailable, never health', async () => {
    for (const status of [401, 403, 404, 500, 502]) {
      vi.stubGlobal('fetch', vi.fn(async () => new Response('', {status})))
      expect(await fetchSessionPushHealth(), `status=${status}`).toEqual({kind: 'unavailable'})
    }
  })

  it('a rejected fetch (network error) is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fixture network down') }))
    expect(await fetchSessionPushHealth()).toEqual({kind: 'unavailable'})
  })

  it('a non-JSON body is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>not json</html>', {status: 200})))
    expect(await fetchSessionPushHealth()).toEqual({kind: 'unavailable'})
  })

  it('a JSON body that is not an object (array / string / null) is unavailable', async () => {
    for (const body of [[], 'nope', null]) {
      vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(body)))
      expect(await fetchSessionPushHealth(), `body=${JSON.stringify(body)}`).toEqual({kind: 'unavailable'})
    }
  })

  it('an abort (caller signal) resolves unavailable rather than rejecting', async () => {
    const controller = new AbortController()
    controller.abort()
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal)
      throw new DOMException('Aborted', 'AbortError')
    }))
    expect(await fetchSessionPushHealth({signal: controller.signal})).toEqual({kind: 'unavailable'})
  })
})
