/**
 * Per-repo open code-scanning alert summaries (rm-117).
 *
 * Code scanning has NO GraphQL field (probed 2026-09-20, re-confirmed at
 * selection 2026-10-09) — the panel's code-scanning half is REST-only:
 * GET /repos/{owner}/{repo}/code-scanning/alerts?state=open with an
 * installation token that already carries the optional
 * security_events:read scope (src/github/installations.ts
 * OPTIONAL_READ_PERMISSIONS, graceful mint fallback). This module never
 * mutates anything — it is part of the read-only-by-construction surface.
 *
 * Cost contract (mirrors the check-suite ceiling discipline, rm-110 family):
 * ONE REST call per repo per refresh cycle; extra page calls only for repos
 * with >100 open alerts (per_page=100, stop on a short page — the API's
 * 30-item default page has caused prior undercounts, see the 2026-09-25
 * census methodology). A pathological-set guard stops at MAX_PAGES pages.
 * 304 Not Modified responses are free against the primary rate limit
 * (GitHub REST best-practices) and are treated as "unchanged since the
 * cached page" — see the pagination cache below (rm-162 discipline).
 *
 * Stored/rendered payload is COUNTS ONLY: total open + severity buckets.
 * No rule ids, locations, messages, or advisory identifiers ever leave this
 * module's response objects — the aggregator stores what
 * CodeScanningAlertSummary carries and nothing else.
 */

import type {RestRequestFn} from './conditional-reads.ts'
import {Octokit} from '@octokit/core'
import {logger} from '../logger.ts'
import {createBoundedFetch, GITHUB_REQUEST_TIMEOUT_MS} from './app-client.ts'

/** Open-alert counts bucketed by security severity. */
export interface CodeScanningSeverityCounts {
  readonly critical: number
  readonly high: number
  readonly medium: number
  readonly low: number
  /** Alerts with no CVSS security severity (scorecard/quality rules) — real, but not CVSS-rated. */
  readonly unrated: number
}

/**
 * The ONLY payload this feature persists or serves: how many alerts are open
 * and how they bucket by severity. Deliberately content-free.
 */
export interface CodeScanningAlertSummary {
  readonly openCount: number
  readonly severity: CodeScanningSeverityCounts
}

/**
 * Injectable seam consumed by the aggregator (AggregatorDeps).
 * Returns null when the summary is unavailable — the optional permission is
 * absent on the installation's token (403), the transport failed, or the
 * call breached its deadline. null means "field omitted", NEVER an error for
 * the repo's row: the CI status fields are independent of this probe.
 */
export type FetchCodeScanningAlertsFn = (
  installationId: number,
  owner: string,
  name: string,
) => Promise<CodeScanningAlertSummary | null>

const EMPTY_SEVERITY: CodeScanningSeverityCounts = {critical: 0, high: 0, medium: 0, low: 0, unrated: 0}
/**
 * Bucket one page of open alert objects into counts. Pure and defensive: the
 * REST shape is cast at the boundary; anything missing degrades to unrated
 * (an alert without a readable rule still counts toward openCount).
 */
export function countOpenCodeScanningAlerts(alerts: readonly unknown[]): CodeScanningAlertSummary {
  // Mutable accumulator internally; the returned summary stays deeply readonly.
  const buckets = {critical: 0, high: 0, medium: 0, low: 0, unrated: 0}
  for (const alert of alerts) {
    const rule = (alert as {rule?: {security_severity_level?: unknown}} | null | undefined)?.rule
    const level = rule?.security_severity_level
    if (level === 'critical' || level === 'high' || level === 'medium' || level === 'low') {
      buckets[level] += 1
    } else {
      buckets.unrated += 1
    }
  }
  return {openCount: alerts.length, severity: {...buckets}}
}

/**
 * Octokit.request-compatible invocation seam — shared with the conditional
 * reads module; see conditional-reads.ts:RestRequestFn.
 */
export type {RestRequestFn}

/** Pathological-set guard: 100 pages × 100 items. Never reached on a real repo; stops a hostile loop. */
export const CODE_SCANNING_MAX_PAGES = 100

function isRequestErrorWithStatus(error: unknown, status: number): boolean {
  return (error as {status?: unknown} | null | undefined)?.status === status
}

/**
 * Fetch + bucket the open code-scanning alerts for one repo.
 *
 * Graceful degradation matrix (rm-117 acceptance — absent permission ⇒ field
 * omitted, never an error):
 * - 200 pages → accumulated summary (pagination via per_page=100 until a
 *   short page; MAX_PAGES ceiling logs a warning and serves the counted
 *   floor, the same documented-ceiling posture as failingChecks).
 * - 403 → null. The installation's token lacks security_events:read — the
 *   expected state for the optional permission; debug-level only.
 * - 404 → zero summary. The repository exists but has no code-scanning
 *   analyses enabled: there are no open alerts to count by construction.
 * - any other throw (transport, 5xx) → null + one warning. Never fails the
 *   repo's row.
 */
export async function fetchOpenCodeScanningAlerts(
  request: RestRequestFn,
  owner: string,
  name: string,
): Promise<CodeScanningAlertSummary | null> {
  const alerts: unknown[] = []
  let page = 1
  while (true) {
    let pageData: unknown[]
    try {
      const response = await request('GET /repos/{owner}/{repo}/code-scanning/alerts', {
        owner,
        repo: name,
        state: 'open',
        per_page: 100,
        page,
      })
      const body = response.data as {alerts?: unknown[]}
      pageData = Array.isArray(body) ? body : (body.alerts ?? [])
    } catch (error) {
      if (isRequestErrorWithStatus(error, 403)) {
        logger.debug('code-scanning alerts unavailable: optional security_events read absent on this installation')
        return null
      }
      if (isRequestErrorWithStatus(error, 404)) {
        return {openCount: 0, severity: {...EMPTY_SEVERITY}}
      }
      logger.warning('code-scanning alerts fetch failed; field omitted for this cycle', {
        status: (error as {status?: unknown} | null)?.status ?? null,
      })
      return null
    }
    alerts.push(...pageData)
    if (pageData.length < 100) break
    if (page >= CODE_SCANNING_MAX_PAGES) {
      logger.warning(`code-scanning alert pagination hit the ${CODE_SCANNING_MAX_PAGES}-page ceiling; serving the counted floor`, {
        counted: alerts.length,
      })
      break
    }
    page += 1
  }
  return countOpenCodeScanningAlerts(alerts)
}

/**
 * Production fetcher for server.ts wiring: mints per-call transport exactly
 * like the GraphQL sibling (createInstallationGraphqlQueryFn) — timeout key
 * pinned + createBoundedFetch seam (rm-197/rm-267 transport contract).
 */
export function createCodeScanningAlertsFetcher(
  getToken: (installationId: number) => Promise<string | null>,
): FetchCodeScanningAlertsFn {
  return async (installationId, owner, name) => {
    const token = await getToken(installationId)
    if (token === null) return null
    const installOctokit = new Octokit({
      auth: token,
      request: {
        timeout: GITHUB_REQUEST_TIMEOUT_MS,
        fetch: createBoundedFetch(GITHUB_REQUEST_TIMEOUT_MS),
      },
    })
    return fetchOpenCodeScanningAlerts(
      async (route, params) => installOctokit.request(route, params),
      owner,
      name,
    )
  }
}
