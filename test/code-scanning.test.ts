/**
 * rm-117 — code-scanning REST half: bucket counter + fetcher degradation
 * matrix. All tests drive the injectable request seam; no network.
 *
 * The matrix pins the acceptance contract from the selection rider:
 * - absent permission ⇒ field omitted (null), never an error;
 * - counts paginate (per_page=100 until a short page — the API's 30-item
 *   default page has undercounted before);
 * - 404 (code scanning not enabled) ⇒ honest zeros;
 * - transport failure ⇒ null (never fails the repo row);
 * - ceiling ⇒ serve the counted floor with a warning, mirroring
 *   failingChecks' documented ceiling discipline.
 */

import type {RestRequestFn} from '../src/github/conditional-reads.ts'
import {describe, expect, it, vi} from 'vitest'
import {
  CODE_SCANNING_MAX_PAGES,
  countOpenCodeScanningAlerts,
  fetchOpenCodeScanningAlerts,
} from '../src/github/code-scanning.ts'

function alert(securitySeverityLevel: string | null | undefined): unknown {
  return {rule: {security_severity_level: securitySeverityLevel}}
}

function requestError(status: number): Error & {status: number} {
  const error = new Error(`HTTP ${status}`) as Error & {status: number}
  error.status = status
  return error
}

function pageResponse(alerts: readonly unknown[], etag = '"etag-1"'): {
  status: number
  data: unknown
  headers: Record<string, string>
} {
  return {status: 200, data: alerts, headers: {etag}}
}

describe('countOpenCodeScanningAlerts (pure bucketing)', () => {
  it('buckets by security_severity_level and defaults missing bands to unrated', () => {
    const summary = countOpenCodeScanningAlerts([
      alert('critical'),
      alert('critical'),
      alert('high'),
      alert('medium'),
      alert('low'),
      alert(null), // real alert, no CVSS band (scorecard rule)
      {rule: {}}, // rule object, no severity at all
      {}, // defensive: no rule object
      null, // defensive: garbage entry still counts toward openCount
    ])
    expect(summary.openCount).toBe(9)
    expect(summary.severity).toEqual({critical: 2, high: 1, medium: 1, low: 1, unrated: 4})
  })

  it('empty page yields all-zero buckets with openCount 0', () => {
    expect(countOpenCodeScanningAlerts([])).toEqual({
      openCount: 0,
      severity: {critical: 0, high: 0, medium: 0, low: 0, unrated: 0},
    })
  })
})

describe('fetchOpenCodeScanningAlerts (degradation matrix)', () => {
  it('single 200 page: one REST call, state=open, per_page=100', async () => {
    const request = vi.fn<(RestRequestFn)>().mockResolvedValue(pageResponse([alert('high')]))
    const summary = await fetchOpenCodeScanningAlerts(request, 'org', 'repo')
    expect(summary).toEqual({openCount: 1, severity: {critical: 0, high: 1, medium: 0, low: 0, unrated: 0}})
    expect(request).toHaveBeenCalledTimes(1)
    expect(request.mock.calls[0]?.[0]).toBe('GET /repos/{owner}/{repo}/code-scanning/alerts')
    expect(request.mock.calls[0]?.[1]).toMatchObject({owner: 'org', repo: 'repo', state: 'open', per_page: 100, page: 1})
  })

  it('paginates per_page=100 until a short page (no 30-item default undercount)', async () => {
    const full = Array.from({length: 100}, () => alert('low'))
    const short = [alert('critical'), alert(null)]
    const request = vi.fn<(RestRequestFn)>()
      .mockResolvedValueOnce(pageResponse(full, '"p1"'))
      .mockResolvedValueOnce(pageResponse(short, '"p2"'))
    const summary = await fetchOpenCodeScanningAlerts(request, 'org', 'repo')
    expect(summary?.openCount).toBe(102)
    expect(summary?.severity.critical).toBe(1)
    expect(summary?.severity.low).toBe(100)
    expect(summary?.severity.unrated).toBe(1)
    expect(request).toHaveBeenCalledTimes(2)
    expect(request.mock.calls[1]?.[1]).toMatchObject({page: 2})
  })

  it('403 (optional security_events read absent) ⇒ null, never a thrown error', async () => {
    const request = vi.fn<(RestRequestFn)>().mockRejectedValue(requestError(403))
    await expect(fetchOpenCodeScanningAlerts(request, 'org', 'repo')).resolves.toBeNull()
  })

  it('404 (code scanning not enabled on the repo) ⇒ honest zero summary', async () => {
    const request = vi.fn<(RestRequestFn)>().mockRejectedValue(requestError(404))
    await expect(fetchOpenCodeScanningAlerts(request, 'org', 'repo')).resolves.toEqual({
      openCount: 0,
      severity: {critical: 0, high: 0, medium: 0, low: 0, unrated: 0},
    })
  })

  it('transport failure (5xx) ⇒ null, never a thrown error', async () => {
    const request = vi.fn<(RestRequestFn)>().mockRejectedValue(requestError(502))
    await expect(fetchOpenCodeScanningAlerts(request, 'org', 'repo')).resolves.toBeNull()
  })

  it(`ceiling: stops at ${CODE_SCANNING_MAX_PAGES} full pages and serves the counted floor`, async () => {
    const full = Array.from({length: 100}, () => alert('high'))
    const request = vi.fn<(RestRequestFn)>().mockImplementation(async () => pageResponse(full))
    const summary = await fetchOpenCodeScanningAlerts(request, 'org', 'repo')
    expect(request).toHaveBeenCalledTimes(CODE_SCANNING_MAX_PAGES)
    expect(summary?.openCount).toBe(CODE_SCANNING_MAX_PAGES * 100)
    expect(summary?.severity.high).toBe(CODE_SCANNING_MAX_PAGES * 100)
  })

  it('defensive body shape: wraps a non-array body in {alerts: []} — empty/odd payload degrades to zeros, not a crash', async () => {
    const request = vi.fn<(RestRequestFn)>().mockResolvedValue({status: 200, data: {alerts: [alert('medium')]}, headers: {}})
    const summary = await fetchOpenCodeScanningAlerts(request, 'org', 'repo')
    expect(summary).toEqual({openCount: 1, severity: {critical: 0, high: 0, medium: 1, low: 0, unrated: 0}})
  })
})
