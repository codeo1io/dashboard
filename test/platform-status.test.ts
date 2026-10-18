import type {PlatformStatusEtagMemo} from '../src/github/platform-status.ts'
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

  it('unknown third-party vocabulary clamps server-side: indicator → unknown, component status → null', async () => {
    const fetchFn = vi.fn(async (input: string | URL) => {
      if (String(input).endsWith('/status.json')) {
        return jsonResponse({status: {indicator: 'brand-new-severity', description: 'future value'}})
      }
      return jsonResponse({components: [{name: 'Actions', status: 'novel-outage-kind'}]})
    }) as unknown as typeof fetch
    const status = await fetchPlatformStatus({fetchFn})
    // A usable read happened, so the annotation is present — with clamped holes.
    expect(status?.overall).toBe('unknown')
    expect(status?.actions).toBeNull()
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

describe('overallDescription truncation boundary (rm-1491)', () => {
  // Lone-surrogate detector: a high surrogate not followed by a low, or a low
  // surrogate not preceded by a high — exactly what a UTF-16-code-unit slice
  // can produce when the cut lands inside an astral character.
  const loneSurrogate = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/

  it('an emoji straddling the cap is kept whole — no lone surrogate reaches the DTO', async () => {
    // 199 BMP chars + a 2-code-unit emoji as the 200th code point + a tail that
    // must be dropped. The old slice(0, 200) cut INSIDE the surrogate pair.
    const description = `${'x'.repeat(199)}\u{1F6A8}` + `tail-that-must-go`
    const fetchFn = vi.fn(async (input: string | URL) => {
      if (String(input).endsWith('/status.json')) return jsonResponse({status: {indicator: 'minor', description}})
      return jsonResponse(HEALTHY_COMPONENTS)
    }) as unknown as typeof fetch
    const status = await fetchPlatformStatus({fetchFn})

    const truncated = status?.overallDescription ?? ''
    // Exactly PLATFORM_STATUS_DESCRIPTION_MAX_CHARS code points, ending on the
    // complete emoji — the serialized DTO carries no lone surrogate.
    expect(Array.from(truncated)).toHaveLength(PLATFORM_STATUS_DESCRIPTION_MAX_CHARS)
    expect(truncated.endsWith('\u{1F6A8}')).toBe(true)
    expect(truncated).not.toContain('tail-that-must-go')
    expect(loneSurrogate.test(truncated)).toBe(false)
    expect(JSON.stringify(truncated)).not.toContain(String.raw`\ud`)
  })

  it('BMP-only text still truncates identically to the old slice semantics', async () => {
    const description = 'é'.repeat(PLATFORM_STATUS_DESCRIPTION_MAX_CHARS + 10)
    const fetchFn = vi.fn(async (input: string | URL) => {
      if (String(input).endsWith('/status.json')) return jsonResponse({status: {indicator: 'none', description}})
      return jsonResponse(HEALTHY_COMPONENTS)
    }) as unknown as typeof fetch
    const status = await fetchPlatformStatus({fetchFn})
    expect(status?.overallDescription).toBe('é'.repeat(PLATFORM_STATUS_DESCRIPTION_MAX_CHARS))
  })

  it('text shorter than the cap passes through unmodified (astral included)', async () => {
    const description = 'short \u{1F9EA} status'
    const fetchFn = vi.fn(async (input: string | URL) => {
      if (String(input).endsWith('/status.json')) return jsonResponse({status: {indicator: 'none', description}})
      return jsonResponse(HEALTHY_COMPONENTS)
    }) as unknown as typeof fetch
    const status = await fetchPlatformStatus({fetchFn})
    expect(status?.overallDescription).toBe(description)
  })
})

describe('conditional GET revalidation (rm-1447 follow-up)', () => {
  interface Recorded {
    url: string
    headers: Record<string, string>
  }

  function conditionalFetch(cycle1: (call: Recorded) => Response, cycle2?: (call: Recorded) => Response): typeof fetch {
    // Each fetchPlatformStatus cycle issues exactly two fetches (status.json +
    // components.json) — dispatch the responder per CYCLE, not per call.
    let call = 0
    const fetchFn = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const recorded: Recorded = {
        url: String(input),
        headers: (init?.headers ?? {}) as Record<string, string>,
      }
      const responder = call >= 2 && cycle2 !== undefined ? cycle2 : cycle1
      call += 1
      return responder(recorded)
    }) as unknown as typeof fetch
    return fetchFn
  }

  function statusResponse(body: unknown, etag?: string): Response {
    const headers: Record<string, string> = {'content-type': 'application/json'}
    if (etag !== undefined) headers.etag = etag
    return new Response(JSON.stringify(body), {status: 200, headers})
  }

  it('second cycle sends If-None-Match and a 304 reuses the stored body per endpoint', async () => {
    const memo: PlatformStatusEtagMemo = {}
    const fetchFn = conditionalFetch(
      ({url}) =>
        url.endsWith('/status.json')
          ? statusResponse({status: {indicator: 'minor', description: 'Investigating'}}, '"status-v1"')
          : statusResponse({components: [{name: 'Actions', status: 'operational'}]}, '"components-v1"'),
      ({url, headers}) => {
        // Cycle 2 must carry the stored etag for THIS endpoint only.
        expect(headers['if-none-match']).toBe(url.endsWith('/status.json') ? '"status-v1"' : '"components-v1"')
        return new Response(null, {status: 304})
      },
    )

    const first = await fetchPlatformStatus({fetchFn, etagMemo: memo, now: () => 1_000})
    expect(first).toEqual({overall: 'minor', overallDescription: 'Investigating', actions: 'operational', fetchedAt: 1_000})

    const second = await fetchPlatformStatus({fetchFn, etagMemo: memo, now: () => 2_000})
    // Identical fidelity from the memoized bodies; only fetchedAt moves.
    expect(second).toEqual({overall: 'minor', overallDescription: 'Investigating', actions: 'operational', fetchedAt: 2_000})
  })

  it('a 304 with no stored body degrades to a failed read (fail-open paths intact)', async () => {
    const memo: PlatformStatusEtagMemo = {}
    const fetchFn = conditionalFetch(
      () => new Response(null, {status: 304}), // server answers 304 on a cold memo
    )
    // status 304-with-nothing → null body → failed read; components likewise
    const status = await fetchPlatformStatus({fetchFn, etagMemo: memo})
    expect(status).toBeNull()
  })

  it('a 200 without an ETag header is not memoized — the next cycle is unconditional', async () => {
    const memo: PlatformStatusEtagMemo = {}
    const fetchFn = conditionalFetch(
      ({url}) =>
        url.endsWith('/status.json')
          ? statusResponse({status: {indicator: 'none', description: 'ok'}})
          : statusResponse({components: [{name: 'Actions', status: 'operational'}]}),
      ({headers}) => {
        expect(headers['if-none-match']).toBeUndefined()
        return jsonResponse(HEALTHY_STATUS)
      },
    )
    const first = await fetchPlatformStatus({fetchFn, etagMemo: memo})
    expect(first?.overall).toBe('none')
    const second = await fetchPlatformStatus({fetchFn, etagMemo: memo})
    expect(second?.overall).toBe('none')
  })

  it('the module-level default memo persists across calls when none is injected', async () => {
    // One fetchFn whose cycle-2 responses are 304s: the DEFAULT memo must have
    // stored cycle 1's etags, so cycle 2 sends If-None-Match and still resolves.
    const fetchFn = conditionalFetch(
      ({url}) =>
        url.endsWith('/status.json')
          ? statusResponse({status: {indicator: 'major', description: 'Major'}}, '"s1"')
          : statusResponse({components: [{name: 'Actions', status: 'major_outage'}]}, '"c1"'),
      ({url, headers}) => {
        expect(headers['if-none-match']).toBe(url.endsWith('/status.json') ? '"s1"' : '"c1"')
        return new Response(null, {status: 304})
      },
    )
    const first = await fetchPlatformStatus({fetchFn})
    expect(first?.overall).toBe('major')
    const second = await fetchPlatformStatus({fetchFn})
    expect(second?.actions).toBe('major_outage')
    expect(second?.overall).toBe('major')
  })
})
