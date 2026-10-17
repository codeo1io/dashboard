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
      maintenances: [],
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

  it('requests the three documented endpoints under the base URL (trailing slashes stripped)', async () => {
    const fetchFn = healthyFetch()
    await fetchPlatformStatus({fetchFn, baseUrl: 'https://status.example.test/api/v2///'})
    const calls = (fetchFn as unknown as {mock: {calls: unknown[][]}}).mock.calls.map(call => String(call[0]))
    expect(calls).toContain('https://status.example.test/api/v2/status.json')
    expect(calls).toContain('https://status.example.test/api/v2/components.json')
    expect(calls).toContain('https://status.example.test/api/v2/scheduled-maintenances.json')
    expect(calls).toHaveLength(3)
  })

  it('defaults match the public feed contract (base URL constant exported for ops)', () => {
    expect(PLATFORM_STATUS_BASE_URL).toBe('https://www.githubstatus.com/api/v2')
  })
})

/** rm-1467: a feed-shaped scheduled-maintenance entry with per-test overrides. */
function maintenanceEntry(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    name: 'Scheduled database maintenance',
    status: 'scheduled',
    scheduled_for: '2026-10-20T14:00:00Z',
    scheduled_until: '2026-10-20T16:00:00Z',
    ...overrides,
  }
}

describe('fetchPlatformStatus maintenance windows (rm-1467)', () => {
  it('live windows are surfaced, completed ones filtered, soonest first', async () => {
    const fetchFn = vi.fn(async (input: string | URL) => {
      const url = String(input)
      if (url.endsWith('/status.json')) return jsonResponse(HEALTHY_STATUS)
      if (url.endsWith('/components.json')) return jsonResponse(HEALTHY_COMPONENTS)
      return jsonResponse({
        scheduled_maintenances: [
          maintenanceEntry({name: 'Completed window', status: 'completed', scheduled_for: '2026-10-01T00:00:00Z'}),
          maintenanceEntry({name: 'Later window', scheduled_for: '2026-10-25T02:00:00Z', scheduled_until: '2026-10-25T04:00:00Z'}),
          maintenanceEntry({name: 'Underway window', status: 'in_progress', scheduled_for: '2026-10-17T09:00:00Z', scheduled_until: '2026-10-17T11:00:00Z'}),
        ],
      })
    }) as unknown as typeof fetch
    const status = await fetchPlatformStatus({fetchFn})
    expect(status?.maintenances).toEqual([
      {
        name: 'Underway window',
        status: 'in_progress',
        scheduledFor: '2026-10-17T09:00:00Z',
        scheduledUntil: '2026-10-17T11:00:00Z',
      },
      {
        name: 'Later window',
        status: 'scheduled',
        scheduledFor: '2026-10-25T02:00:00Z',
        scheduledUntil: '2026-10-25T04:00:00Z',
      },
    ])
  })

  it('caps the list at PLATFORM_STATUS_MAINTENANCE_MAX_ITEMS keeping the soonest', async () => {
    const fetchFn = vi.fn(async (input: string | URL) => {
      const url = String(input)
      if (url.endsWith('/scheduled-maintenances.json')) {
        return jsonResponse({
          scheduled_maintenances: [5, 4, 3, 2, 1].map(day =>
            maintenanceEntry({name: `Window ${day}`, scheduled_for: `2026-11-0${day}T10:00:00Z`}),
          ),
        })
      }
      return jsonResponse(HEALTHY_STATUS)
    }) as unknown as typeof fetch
    const status = await fetchPlatformStatus({fetchFn})
    expect(status?.maintenances.map(m => m.name)).toEqual(['Window 1', 'Window 2', 'Window 3'])
  })

  it('malformed entries are skipped without breaking the healthy ones', async () => {
    const fetchFn = vi.fn(async (input: string | URL) => {
      const url = String(input)
      if (url.endsWith('/scheduled-maintenances.json')) {
        return jsonResponse({
          scheduled_maintenances: [
            'not-an-object',
            maintenanceEntry({name: 123}),
            maintenanceEntry({status: 'novel-status'}),
            maintenanceEntry({scheduled_for: null}),
            maintenanceEntry({name: 'Healthy entry'}),
          ],
        })
      }
      return jsonResponse(HEALTHY_STATUS)
    }) as unknown as typeof fetch
    const status = await fetchPlatformStatus({fetchFn})
    expect(status?.maintenances.map(m => m.name)).toEqual(['Healthy entry'])
  })

  it('maintenance read failure leaves the annotation otherwise intact (fail-open)', async () => {
    const fetchFn = vi.fn(async (input: string | URL) => {
      if (String(input).endsWith('/scheduled-maintenances.json')) return jsonResponse({message: 'gone'}, 404)
      if (String(input).endsWith('/components.json')) return jsonResponse(HEALTHY_COMPONENTS)
      return jsonResponse(HEALTHY_STATUS)
    }) as unknown as typeof fetch
    const status = await fetchPlatformStatus({fetchFn})
    expect(status?.overall).toBe('none')
    expect(status?.actions).toBe('operational')
    expect(status?.maintenances).toEqual([])
  })

  it('non-object maintenance body degrades to an empty list', async () => {
    const fetchFn = vi.fn(async (input: string | URL) => {
      if (String(input).endsWith('/scheduled-maintenances.json')) return jsonResponse(['array', 'body'])
      return jsonResponse(HEALTHY_STATUS)
    }) as unknown as typeof fetch
    const status = await fetchPlatformStatus({fetchFn})
    expect(status?.maintenances).toEqual([])
  })

  it('maintenance names are clamped to the description bound', async () => {
    const long = 'y'.repeat(PLATFORM_STATUS_DESCRIPTION_MAX_CHARS + 10)
    const fetchFn = vi.fn(async (input: string | URL) => {
      if (String(input).endsWith('/scheduled-maintenances.json')) {
        return jsonResponse({scheduled_maintenances: [maintenanceEntry({name: long})]})
      }
      return jsonResponse(HEALTHY_STATUS)
    }) as unknown as typeof fetch
    const status = await fetchPlatformStatus({fetchFn})
    expect(status?.maintenances[0]?.name).toHaveLength(PLATFORM_STATUS_DESCRIPTION_MAX_CHARS)
  })
})
