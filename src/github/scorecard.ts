/**
 * rm-229 fleet Scorecard columns — read-only OpenSSF Scorecard posture.
 *
 * Source: the public zero-auth Scorecard REST API
 * (api.securityscorecards.dev), live-verified 2026-09-26 (codeo1io/dashboard
 * 7.8 analyzed 2026-09-25T13:14:10Z; fro-bot/dashboard 8.1). No GitHub
 * scopes, no secrets, no new dependencies.
 *
 * Discipline (mirrors the aggregator's read-only invariants):
 * - Called ONLY for repos already in the denylist-filtered public working
 *   set — the fetch itself is never a leak vector for redacted repos.
 * - Strictly fail-soft: 404 (unanalyzed), any HTTP/network error, or a
 *   malformed payload returns undefined and the dashboard repo simply
 *   carries no scorecard column. Posture never blocks the snapshot.
 * - Deadline-bounded via AbortSignal.timeout so a hung API cannot stall a
 *   refresh worker.
 * - The raw `checks` array is narrowed to a small curated set (the five
 *   posture signals the fleet's conventions key on); the rest of the API's
 *   payload is not copied into the snapshot.
 */
export interface ScorecardCheckState {
  readonly name: string
  /** Raw Scorecard verdict token ('pass' | 'fail' | 'notApplicable'); kept verbatim. */
  readonly state: string
}

export interface ScorecardInfo {
  readonly score: number
  /** ISO-8601 analysis date from the API's `date` field. */
  readonly analyzedAt: string
  /** Curated subset of checks (SCORECARD_SELECTED_CHECKS), absent checks omitted. */
  readonly checks: readonly ScorecardCheckState[]
}

/** The five posture signals surfaced as columns (others stay un-fetched intent). */
export const SCORECARD_SELECTED_CHECKS = [
  'Branch-Protection',
  'Code-Review',
  'Pinned-Dependencies',
  'Token-Permissions',
  'Dangerous-Workflow',
] as const

const SCORECARD_API_BASE = 'https://api.securityscorecards.dev/projects/github.com'
const SCORECARD_TIMEOUT_MS = 4_000

export async function fetchScorecard(
  owner: string,
  name: string,
  timeoutMs: number = SCORECARD_TIMEOUT_MS,
): Promise<ScorecardInfo | undefined> {
  const url = `${SCORECARD_API_BASE}/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`
  try {
    const response = await fetch(url, {
      headers: {accept: 'application/json'},
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!response.ok) {
      // 404/403: repo unanalyzed or not public — absent, not an error.
      return undefined
    }
    const raw: unknown = await response.json()
    if (typeof raw !== 'object' || raw === null) return undefined
    const {score, date, checks} = raw as {score?: unknown; date?: unknown; checks?: unknown}
    if (typeof score !== 'number' || typeof date !== 'string') return undefined
    const selected: ScorecardCheckState[] = []
    if (Array.isArray(checks)) {
      for (const check of checks) {
        if (typeof check !== 'object' || check === null) continue
        const {name: checkName, state} = check as {name?: unknown; state?: unknown}
        if (typeof checkName !== 'string' || typeof state !== 'string') continue
        if ((SCORECARD_SELECTED_CHECKS as readonly string[]).includes(checkName)) {
          selected.push({name: checkName, state})
        }
      }
    }
    return {score, analyzedAt: date, checks: selected}
  } catch {
    // Timeout, network failure, or payload error — strictly fail-soft.
    return undefined
  }
}
