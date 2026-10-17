/**
 * OpenSSF Scorecard posture columns (ledger rm-1974; cycle-18 batch run
 * 743f2e47, rebuilt on the main tip by the 2026-10-18 review-fix round
 * after the original 2026-09-26 tree was lost).
 *
 * Reads the public zero-auth REST surface
 * https://api.securityscorecards.dev/projects/github.com/{owner}/{name}.
 * No GitHub credential is involved and private repos simply 404, so the
 * aggregator column is absent-by-design (never null, never an error
 * surface) whenever the API has nothing to say about a repo.
 *
 * LIVE SHAPE (re-verified 2026-10-18 against codeo1io/dashboard — HTTP
 * 200, repo score 7.7, analyzedAt 2026-10-17T22:25:51Z, 18 checks): every
 * check object carries exactly details/documentation/name/reason/score
 * and there is NO state field. The original implementation destructured a
 * `state` property that the live API never returns and therefore dropped
 * every check (the round's P1 finding); this module is name-keyed and
 * reads only fields the live API actually returns. Per-check scores are
 * passed through RAW — 0-10 where scored, -1 for informational results
 * (e.g. Branch-Protection returned -1 with a scorer-side "internal error"
 * reason on the verified fetch) — so no invented thresholds sit between
 * the API and the DTO.
 */

/** Score range: 0-10 scored, -1 informational/not-scored. */
export interface ScorecardCheck {
  readonly name: string
  readonly score: number
}

export interface ScorecardInfo {
  readonly score: number
  readonly analyzedAt: string
  readonly checks: readonly ScorecardCheck[]
}

/** The compact posture column curates these; the API returns 18 checks. */
export const SCORECARD_SELECTED_CHECKS: readonly string[] = [
  'Binary-Artifacts',
  'Branch-Protection',
  'Code-Review',
  'Pinned-Dependencies',
  'Security-Policy',
]

const SCORECARD_TIMEOUT_MS = 5000

interface LiveScorecardCheck {
  readonly name?: unknown
  readonly score?: unknown
}

interface LiveScorecardResponse {
  readonly score?: unknown
  readonly date?: unknown
  readonly checks?: unknown
}

function scorecardEndpoint(owner: string, name: string): string {
  return `https://api.securityscorecards.dev/projects/github.com/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`
}

/**
 * One public repo's Scorecard posture, fail-soft by construction: any
 * transport failure, non-200, malformed payload, or wrong-typed field
 * resolves to `undefined` so the aggregator can omit the column for that
 * cycle instead of degrading the whole refresh.
 */
export async function fetchScorecard(owner: string, name: string): Promise<ScorecardInfo | undefined> {
  let response: Response
  try {
    response = await fetch(scorecardEndpoint(owner, name), {
      headers: {accept: 'application/json'},
      signal: AbortSignal.timeout(SCORECARD_TIMEOUT_MS),
    })
  } catch {
    return undefined
  }
  if (!response.ok) {
    return undefined
  }
  let payload: LiveScorecardResponse
  try {
    payload = (await response.json()) as LiveScorecardResponse
  } catch {
    return undefined
  }
  if (typeof payload.score !== 'number' || typeof payload.date !== 'string') {
    return undefined
  }
  const liveChecks = Array.isArray(payload.checks) ? (payload.checks as readonly LiveScorecardCheck[]) : []
  const selected = new Set(SCORECARD_SELECTED_CHECKS)
  const checks: ScorecardCheck[] = []
  for (const check of liveChecks) {
    if (typeof check.name !== 'string' || typeof check.score !== 'number') {
      continue
    }
    if (selected.has(check.name)) {
      checks.push({name: check.name, score: check.score})
    }
  }
  return {score: payload.score, analyzedAt: payload.date, checks}
}
