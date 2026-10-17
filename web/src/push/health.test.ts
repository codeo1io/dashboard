import {beforeEach, describe, expect, it, vi} from 'vitest'
import {
  PUSH_HEALTH_STATUSES,
  fetchSessionPushStatus,
  parseSessionPushHealth,
  pushHealthLabel,
} from './health.ts'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {'content-type': 'application/json'},
  })
}

describe('session push-health vocabulary (rm-1446)', () => {
  it('exposes the contract vocabulary', () => {
    expect(PUSH_HEALTH_STATUSES).toEqual(['ready', 'degraded', 'unknown'])
  })

  it('labels each status distinctly', () => {
    expect(pushHealthLabel('ready')).toContain('ready')
    expect(pushHealthLabel('degraded')).toContain('degraded')
    expect(pushHealthLabel('unknown')).toContain('unknown')
  })
})

describe('parseSessionPushHealth (rm-1446 fail-open)', () => {
  it.each(['ready', 'degraded', 'unknown'] as const)('accepts %s', status => {
    expect(parseSessionPushHealth({push: {status}})).toBe(status)
  })

  it.each([
    ['null body', null],
    ['non-object body', 42],
    ['missing push field', {expiresAt: 1}],
    ['push not an object', {push: 'ready'}],
    ['push null', {push: null}],
    ['status wrong type', {push: {status: 7}}],
    ['status unknown string', {push: {status: 'exploded'}}],
    ['status empty string', {push: {status: ''}}],
  ])('fail-open: %s -> null', (_name, body) => {
    expect(parseSessionPushHealth(body)).toBeNull()
  })
})

describe('fetchSessionPushStatus (rm-1446 fail-open)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('extracts the status from a 200 session body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {push: {status: 'degraded'}}))
    vi.stubGlobal('fetch', fetchMock)

    expect(await fetchSessionPushStatus({fetchImpl: fetchMock as unknown as typeof fetch})).toBe(
      'degraded',
    )
    expect(fetchMock).toHaveBeenCalledWith(
      '/operator/session',
      expect.objectContaining({credentials: 'same-origin'}),
    )
  })

  it.each([
    ['network error', () => Promise.reject(new Error('offline'))],
    ['HTTP 500', () => Promise.resolve(jsonResponse(500, {message: 'boom'}))],
    ['HTTP 401', () => Promise.resolve(jsonResponse(401, {}))],
    ['malformed JSON', () => Promise.resolve(new Response('not json', {status: 200}))],
    ['body without push', () => Promise.resolve(jsonResponse(200, {expiresAt: 1}))],
  ])('fail-open: %s -> null', async (_name, impl) => {
    const fetchMock = vi.fn().mockImplementation(impl)
    expect(await fetchSessionPushStatus({fetchImpl: fetchMock as unknown as typeof fetch})).toBeNull()
  })

  it('honors the abort signal contract', async () => {
    const controller = new AbortController()
    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      expect(init?.signal).toBe(controller.signal)
      return Promise.resolve(jsonResponse(200, {push: {status: 'ready'}}))
    })
    controller.abort()
    expect(
      await fetchSessionPushStatus({fetchImpl: fetchMock as unknown as typeof fetch}, controller.signal),
    ).toBe('ready')
  })
})
