/**
 * Tests for the DegradationBanner fail-visible signal (rm-112 cycle-10).
 *
 * The banner must appear for every degraded state and stay hidden for
 * healthy snapshots, unreachable endpoints, and contract-drift payloads —
 * the shell is never blocked by its own monitoring signal.
 */

import {cleanup, render, screen} from '@testing-library/react'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {DegradationBanner} from './DegradationBanner.tsx'

function monitoringBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    staleBanner: false,
    driftCount: 0,
    degradation: {
      warmEmpty: false,
      failedInstallations: 0,
      absentRepos: [],
    },
    ...overrides,
  }
}

function okResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {'content-type': 'application/json'},
  })
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('DegradationBanner — render rules', () => {
  it('renders nothing for a healthy snapshot', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse(monitoringBody())))
    render(<DegradationBanner />)
    expect(screen.queryByTestId('degradation-banner')).toBeNull()
  })

  it('renders nothing when the endpoint is unreachable', () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    render(<DegradationBanner />)
    expect(screen.queryByTestId('degradation-banner')).toBeNull()
  })

  it('renders nothing on contract drift (missing degradation field)', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(okResponse({staleBanner: false, driftCount: 0})),
    )
    render(<DegradationBanner />)
    expect(screen.queryByTestId('degradation-banner')).toBeNull()
  })

  it('banners a stale (fail-closed) snapshot with the stale reason', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        okResponse(monitoringBody({staleBanner: true})),
      ),
    )
    render(<DegradationBanner />)
    const banner = await screen.findByTestId('degradation-banner')
    expect(banner.textContent).toContain('Monitoring degraded')
    expect(banner.textContent).toContain('Serving stale data')
    // warm-empty wording must NOT appear when warmEmpty is false
    expect(banner.textContent).not.toContain('data loss')
  })

  it('banners warm-empty with the data-loss wording', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        okResponse(
          monitoringBody({staleBanner: true, degradation: {warmEmpty: true, failedInstallations: 0, absentRepos: []}}),
        ),
      ),
    )
    render(<DegradationBanner />)
    const banner = await screen.findByTestId('degradation-banner')
    expect(banner.textContent).toContain('data loss, not quiet')
  })

  it('banners partial enumeration failure with the installation count', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        okResponse(
          monitoringBody({degradation: {warmEmpty: false, failedInstallations: 2, absentRepos: []}}),
        ),
      ),
    )
    render(<DegradationBanner />)
    const banner = await screen.findByTestId('degradation-banner')
    expect(banner.textContent).toContain('2 installations missing from the repo union')
  })

  it('banners absent repos by full_name and truncates beyond three', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        okResponse(
          monitoringBody({
            degradation: {
              warmEmpty: false,
              failedInstallations: 0,
              absentRepos: [
                {full_name: 'org/one', reason: 'resolver-failed'},
                {full_name: 'org/two', reason: 'no-resolver'},
                {full_name: 'org/three', reason: 'resolver-failed'},
                {full_name: 'org/four', reason: 'resolver-failed'},
              ],
            },
          }),
        ),
      ),
    )
    render(<DegradationBanner />)
    const banner = await screen.findByTestId('degradation-banner')
    expect(banner.textContent).toContain('4 metadata-listed repos absent from the working set')
    expect(banner.textContent).toContain('org/one')
    expect(banner.textContent).toContain('org/three')
    expect(banner.textContent).not.toContain('org/four')
    expect(banner.textContent).toContain('…')
  })

  it('banners a single absent repo with singular wording', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        okResponse(
          monitoringBody({
            degradation: {
              warmEmpty: false,
              failedInstallations: 0,
              absentRepos: [{full_name: 'org/only', reason: 'no-resolver'}],
            },
          }),
        ),
      ),
    )
    render(<DegradationBanner />)
    const banner = await screen.findByTestId('degradation-banner')
    expect(banner.textContent).toContain('1 metadata-listed repo absent from the working set')
    expect(banner.textContent).toContain('org/only')
  })
})

describe('DegradationBanner — polling', () => {
  it('re-fetches on the configured interval and clears when the snapshot recovers', async () => {
    const degraded = okResponse(monitoringBody({staleBanner: true}))
    const healthy = okResponse(monitoringBody())
    const fetchMock = vi.fn().mockResolvedValueOnce(degraded).mockResolvedValue(healthy)
    vi.stubGlobal('fetch', fetchMock)

    render(<DegradationBanner intervalMs={50} />)
    expect(await screen.findByTestId('degradation-banner')).toBeDefined()

    // After the next poll resolves a healthy snapshot the banner disappears.
    await vi.waitFor(() => {
      expect(screen.queryByTestId('degradation-banner')).toBeNull()
    }, {timeout: 5_000})
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('stops polling after unmount', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(monitoringBody()))
    vi.stubGlobal('fetch', fetchMock)
    const {unmount} = render(<DegradationBanner intervalMs={50} />)
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled(), {timeout: 5_000})
    unmount()
    const callsAtUnmount = fetchMock.mock.calls.length
    await new Promise((resolve) => setTimeout(resolve, 250))
    expect(fetchMock.mock.calls.length).toBe(callsAtUnmount)
  })
})
