import {describe, expect, it, vi} from 'vitest'
import {
  fetchPlatformStatus,
  PLATFORM_STATUS_BASE_URL,
  PLATFORM_STATUS_DESCRIPTION_MAX_CHARS,
} from '../src/github/platform-status.ts'

/**
 * rm-1447: the platform-status reader must be fail-open in BOTH directions —
 * any failure degrades to null (annotation absent), never throws, and never
 * lets a third-party vocabulary change fabricate a verdict. All network
 * surface is injected; this suite never touches the wire.
 */

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {status, headers: {'content-type': 'application/json'}})
}

const HEALTHY_STATUS = {page: {}, status: {indicator: 'none', description: 'All Systems Operational'}}
const HEALTHY_COMPONENTS = {
  components: [
    {id: 'c1', name: 'Git Operations', status: 'operational'},
    {id: 'c2', name: 'Actions', status: 'operational'},
  ],
}

function healthyFetch(): typeof fetch {
  return vi.fn(async (input: string | URL) => {
    const url = String(input)
    if (url.endsWith('/status.json')) return jsonResponse(HEALTHY_STATUS)
    if (url.endsWith('/components.json')) return jsonResponse(HEALTHY_COMPONENTS)
    return jsonResponse({message: 'not found'}, 404)
  }) as unknown as typeof fetch
}

describe('fetchPlatformStatus (rm-1447)', () => {
  it('healthy feed → full annotation (overall + Actions + fetchedAt)', async () => {
    const now = vi.fn(() => 1_700_000_123_456)
    const status = await fetchPlatformStatus({fetchFn: healthyFetch(), now})
    expect(status).toEqual({
      overall: 'none',
      overallDescription: 'All Systems Operational',
      actions: 'operational',
      fetchedAt: 1_700_000_123_456,
    })
  })

  it('Actions component degraded → the annotation carries the component verdict', async () => {
    const fetchFn = vi.fn(async (input: string | URL) => {
      const url = String(input)
      if (url.endsWith('/status.json')) {
        return jsonResponse({status: {indicator: 'minor', description: 'Investigating Actions run creation delays'}})
      }
      return jsonResponse({
        components: [{name: 'Actions', status: 'major_outage'}],
      })
    }) as unknown as typeof fetch
    const status = await fetchPlatformStatus({fetchFn})
    expect(status?.overall).toBe('minor')
    expect(status?.actions).toBe('major_outage')
    expect(status?.overallDescription).toBe('Investigating Actions run creation delays')
  })

  it('both reads reject → null (annotation absent, fail-open)', async () => {
    const fetchFn = vi.fn(async () => {
      throw new TypeError('fetch failed')
    }) as unknown as typeof fetch
    expect(await fetchPlatformStatus({fetchFn})).toBeNull()
  })

  it('fetchFn throws synchronously → null, never propagates', async () => {
    const fetchFn = (() => {
      throw new Error('boom before promise')
    }) as unknown as typeof fetch
    expect(await fetchPlatformStatus({fetchFn})).toBeNull()
  })

  it('status read fails, components read succeeds → partial annotation (overall unknown, actions real)', async () => {
    const fetchFn = vi.fn(async (input: string | URL) => {
      if (String(input).endsWith('/status.json')) return jsonResponse({message: 'server error'}, 500)
      return jsonResponse({components: [{name: 'Actions', status: 'degraded_performance'}]})
    }) as unknown as typeof fetch
    const status = await fetchPlatformStatus({fetchFn})
    expect(status).not.toBeNull()
    expect(status?.overall).toBe('unknown')
    expect(status?.overallDescription).toBe('')
    expect(status?.actions).toBe('degraded_performance')
  })

  it('components read fails, status read succeeds → overall present, actions null', async () => {
    const fetchFn = vi.fn(async (input: string | URL) => {
      if (String(input).endsWith('/components.json')) return jsonResponse({}, 503)
      return jsonResponse(HEALTHY_STATUS)
    }) as unknown as typeof fetch
    const status = await fetchPlatformStatus({fetchFn})
    expect(status?.overall).toBe('none')
    expect(status?.actions).toBeNull()
  })

  it('a never-settling fetch resolves null at the timeout ceiling (both reads)', async () => {
    const fetchFn = vi.fn(async () => new Promise<Response>(() => {})) as unknown as typeof fetch
    const status = await fetchPlatformStatus({fetchFn, timeoutMs: 50})
    expect(status).toBeNull()
  })

  it('non-JSON 200 body counts as a failed read (captive-portal shape)', async () => {
    const fetchFn = vi.fn(async () => {
      return new Response('<html>login</html>', {status: 200, headers: {'content-type': 'text/html'}})
    }) as unknown as typeof fetch
    expect(await fetchPlatformStatus({fetchFn})).toBeNull()
  })

  it('unknown third-party vocabulary clamps server-side, but BOTH holes unusable → null (rm-1985)', async () => {
    const fetchFn = vi.fn(async (input: string | URL) => {
      if (String(input).endsWith('/status.json')) {
        return jsonResponse({status: {indicator: 'brand-new-severity', description: 'future value'}})
      }
      return jsonResponse({components: [{name: 'Actions', status: 'novel-outage-kind'}]})
    }) as unknown as typeof fetch
    // rm-1985: "usable" means a FIELD was extracted, not that a 200 body
    // arrived — unknown vocabulary on BOTH feeds leaves nothing usable, so
    // the annotation is absent rather than all-unknown.
    expect(await fetchPlatformStatus({fetchFn})).toBeNull()
  })

  it('one-sided unknown vocabulary still clamps into a present annotation with a clamped hole', async () => {
    const fetchFn = vi.fn(async (input: string | URL) => {
      if (String(input).endsWith('/status.json')) {
        return jsonResponse({status: {indicator: 'brand-new-severity', description: 'future value'}})
      }
      return jsonResponse(HEALTHY_COMPONENTS)
    }) as unknown as typeof fetch
    const status = await fetchPlatformStatus({fetchFn})
    // The Actions field IS usable, so the annotation is present — with the
    // clamped overall hole (this is the rm-1447 clamp, preserved by rm-1985).
    expect(status).not.toBeNull()
    expect(status?.overall).toBe('unknown')
    expect(status?.actions).toBe('operational')
  })

  it('rm-1985: a 200 status.json with an unrecognized shape (no field extracted) → null', async () => {
    // The status feed answered 200 with a JSON object, but the shape is not
    // the Statuspage contract — indicator unparseable, description absent —
    // and the components read failed, so Actions is absent too. The old
    // guard's `statusBody !== null` term kept an all-unknown annotation
    // alive here; the documented "nothing usable → absent" contract wins.
    const fetchFn = vi.fn(async (input: string | URL) => {
      if (String(input).endsWith('/status.json')) {
        return jsonResponse({hello: 'world', meta: {unexpected: true}})
      }
      return jsonResponse({message: 'server error'}, 503)
    }) as unknown as typeof fetch
    expect(await fetchPlatformStatus({fetchFn})).toBeNull()
  })

  it('rm-1985: empty-but-shaped status body with Actions absent → null', async () => {
    const fetchFn = vi.fn(async (input: string | URL) => {
      if (String(input).endsWith('/status.json')) {
        return jsonResponse({status: {}})
      }
      return jsonResponse({components: [{name: 'API', status: 'operational'}]})
    }) as unknown as typeof fetch
    expect(await fetchPlatformStatus({fetchFn})).toBeNull()
  })

  it('Actions component absent from the components list → actions null, overall still served', async () => {
    const fetchFn = vi.fn(async (input: string | URL) => {
      if (String(input).endsWith('/components.json')) return jsonResponse({components: [{name: 'API', status: 'operational'}]})
      return jsonResponse(HEALTHY_STATUS)
    }) as unknown as typeof fetch
    const status = await fetchPlatformStatus({fetchFn})
    expect(status?.overall).toBe('none')
    expect(status?.actions).toBeNull()
  })

  it('description is capped at PLATFORM_STATUS_DESCRIPTION_MAX_CHARS', async () => {
    const long = 'x'.repeat(PLATFORM_STATUS_DESCRIPTION_MAX_CHARS + 500)
    const fetchFn = vi.fn(async (input: string | URL) => {
      if (String(input).endsWith('/status.json')) return jsonResponse({status: {indicator: 'minor', description: long}})
      return jsonResponse(HEALTHY_COMPONENTS)
    }) as unknown as typeof fetch
    const status = await fetchPlatformStatus({fetchFn})
    expect(status?.overallDescription).toHaveLength(PLATFORM_STATUS_DESCRIPTION_MAX_CHARS)
  })

  it('requests the two documented endpoints under the base URL (trailing slashes stripped)', async () => {
    const fetchFn = healthyFetch()
    await fetchPlatformStatus({fetchFn, baseUrl: 'https://status.example.test/api/v2///'})
    const calls = (fetchFn as unknown as {mock: {calls: unknown[][]}}).mock.calls.map(call => String(call[0]))
    expect(calls).toContain('https://status.example.test/api/v2/status.json')
    expect(calls).toContain('https://status.example.test/api/v2/components.json')
    expect(calls).toHaveLength(2)
  })

  it('defaults match the public feed contract (base URL constant exported for ops)', () => {
    expect(PLATFORM_STATUS_BASE_URL).toBe('https://www.githubstatus.com/api/v2')
  })
})
