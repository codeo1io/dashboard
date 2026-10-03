/**
 * Client for /api/security — the BFF security-posture DTO (rm-117).
 *
 * Mirrors web/src/api/monitoring.ts conventions: strict runtime parse of the
 * server contract, `Result`-style return, no `any`. The DTO is the minimized
 * whitelist from src/routes/api.ts — internal fields never arrive here.
 * Alert objects are shared by the OPEN drill-down and the recent-cures
 * sample (identical aggregation payload, different lifecycle state).
 */
export interface SecurityAlert {
  readonly state: string | null
  readonly createdAt: string | null
  readonly fixedAt: string | null
  readonly dismissedAt: string | null
  readonly autoDismissedAt: string | null
  readonly dismissReason: string | null
  readonly dependencyScope: string | null
  readonly manifestPath: string | null
  readonly firstPatchedVersion: string | null
  readonly vulnerableVersionRange: string | null
  readonly updatePrState: string | null
  readonly updatePrUrl: string | null
  readonly severity: string | null
  readonly classification: string | null
  readonly withdrawnAt: string | null
  readonly ghsaId: string | null
  readonly cveId: string | null
  /** Outbound advisory link as provided by the server DTO (no client-built origins — bundle privacy invariant). */
  readonly advisoryUrl: string | null
  readonly cvssV3Score: number | null
  readonly cvssV3Vector: string | null
  readonly cvssV4Score: number | null
  readonly cvssV4Vector: string | null
  readonly epssPercentage: number | null
  readonly epssPercentile: number | null
  readonly cwes: readonly string[]
  readonly identifiers: readonly {readonly type: string; readonly value: string}[]
}

export interface SecurityRepo {
  readonly fullName: string
  readonly stale: boolean
  readonly openAlertCount: number | null
  /** null = permission-degraded (token lacks the alerts scope): render the degraded notice, never half-populated data */
  readonly posture: {
    readonly openAlerts: readonly SecurityAlert[]
    readonly recentCures: readonly SecurityAlert[]
    readonly recentCureCount: number | null
    readonly curesFetchedAt: number | null
  } | null
}

export interface SecurityData {
  readonly repos: readonly SecurityRepo[]
  readonly staleBanner: boolean
  readonly refreshedAt: number | null
}

export type FetchSecurityResult =
  | { ok: true; data: SecurityData }
  | { ok: false; reason: 'timeout' | 'network' | 'unauthenticated' | 'contract-drift' }

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val)
}

function parseStringOrNull(val: unknown): string | null | undefined {
  if (val === null) return null
  if (typeof val === 'string') return val
  return undefined // invalid shape
}

function parseNumberOrNull(val: unknown): number | null | undefined {
  if (val === null) return null
  if (typeof val === 'number') return val
  return undefined // invalid shape
}

function parseAlert(item: unknown): SecurityAlert | null {
  if (!isPlainObject(item)) return null

  const state = parseStringOrNull(item.state)
  const createdAt = parseStringOrNull(item.createdAt)
  const fixedAt = parseStringOrNull(item.fixedAt)
  const dismissedAt = parseStringOrNull(item.dismissedAt)
  const autoDismissedAt = parseStringOrNull(item.autoDismissedAt)
  const dismissReason = parseStringOrNull(item.dismissReason)
  const dependencyScope = parseStringOrNull(item.dependencyScope)
  const manifestPath = parseStringOrNull(item.manifestPath)
  const firstPatchedVersion = parseStringOrNull(item.firstPatchedVersion)
  const vulnerableVersionRange = parseStringOrNull(item.vulnerableVersionRange)
  const updatePrState = parseStringOrNull(item.updatePrState)
  const updatePrUrl = parseStringOrNull(item.updatePrUrl)
  const severity = parseStringOrNull(item.severity)
  const classification = parseStringOrNull(item.classification)
  const withdrawnAt = parseStringOrNull(item.withdrawnAt)
  const ghsaId = parseStringOrNull(item.ghsaId)
  const cveId = parseStringOrNull(item.cveId)
  const advisoryUrl = parseStringOrNull(item.advisoryUrl)
  const cvssV3Vector = parseStringOrNull(item.cvssV3Vector)
  const cvssV4Vector = parseStringOrNull(item.cvssV4Vector)
  const cvssV3Score = parseNumberOrNull(item.cvssV3Score)
  const cvssV4Score = parseNumberOrNull(item.cvssV4Score)
  const epssPercentage = parseNumberOrNull(item.epssPercentage)
  const epssPercentile = parseNumberOrNull(item.epssPercentile)
  const stringResults = [state, createdAt, fixedAt, dismissedAt, autoDismissedAt, dismissReason, dependencyScope, manifestPath, firstPatchedVersion, vulnerableVersionRange, updatePrState, updatePrUrl, severity, classification, withdrawnAt, ghsaId, cveId, advisoryUrl, cvssV3Vector, cvssV4Vector]
  const numberResults = [cvssV3Score, cvssV4Score, epssPercentage, epssPercentile]
  if (stringResults.some(value => value === undefined) || numberResults.some(value => value === undefined)) {
    return null
  }

  if (!Array.isArray(item.cwes)) return null
  const cwes: string[] = []
  for (const cwe of item.cwes) {
    if (typeof cwe !== 'string') return null
    cwes.push(cwe)
  }

  if (!Array.isArray(item.identifiers)) return null
  const identifiers: {type: string; value: string}[] = []
  for (const ident of item.identifiers) {
    if (!isPlainObject(ident) || typeof ident.type !== 'string' || typeof ident.value !== 'string') return null
    identifiers.push({type: ident.type, value: ident.value})
  }

  return {
    state: state ?? null,
    createdAt: createdAt ?? null,
    fixedAt: fixedAt ?? null,
    dismissedAt: dismissedAt ?? null,
    autoDismissedAt: autoDismissedAt ?? null,
    dismissReason: dismissReason ?? null,
    dependencyScope: dependencyScope ?? null,
    manifestPath: manifestPath ?? null,
    firstPatchedVersion: firstPatchedVersion ?? null,
    vulnerableVersionRange: vulnerableVersionRange ?? null,
    updatePrState: updatePrState ?? null,
    updatePrUrl: updatePrUrl ?? null,
    severity: severity ?? null,
    classification: classification ?? null,
    withdrawnAt: withdrawnAt ?? null,
    ghsaId: ghsaId ?? null,
    cveId: cveId ?? null,
    advisoryUrl: advisoryUrl ?? null,
    cvssV3Score: cvssV3Score ?? null,
    cvssV3Vector: cvssV3Vector ?? null,
    cvssV4Score: cvssV4Score ?? null,
    cvssV4Vector: cvssV4Vector ?? null,
    epssPercentage: epssPercentage ?? null,
    epssPercentile: epssPercentile ?? null,
    cwes,
    identifiers,
  }
}

function parseAlertArray(val: unknown): readonly SecurityAlert[] | null {
  if (!Array.isArray(val)) return null
  const alerts: SecurityAlert[] = []
  for (const item of val) {
    const parsed = parseAlert(item)
    if (parsed === null) return null
    alerts.push(parsed)
  }
  return alerts
}

function parseRepo(item: unknown): SecurityRepo | null {
  if (!isPlainObject(item)) return null
  const {full_name, stale, openAlertCount, posture} = item
  if (typeof full_name !== 'string' || typeof stale !== 'boolean') return null
  if (openAlertCount !== null && typeof openAlertCount !== 'number') return null
  if (posture !== null && !isPlainObject(posture)) return null
  if (posture === null) {
    return {fullName: full_name, stale, openAlertCount, posture: null}
  }

  const openAlerts = parseAlertArray(posture.openAlerts)
  if (openAlerts === null) return null
  const recentCures = parseAlertArray(posture.recentCures)
  if (recentCures === null) return null
  if (posture.recentCureCount !== null && typeof posture.recentCureCount !== 'number') return null
  if (posture.curesFetchedAt !== null && typeof posture.curesFetchedAt !== 'number') return null

  return {
    fullName: full_name,
    stale,
    openAlertCount,
    posture: {
      openAlerts,
      recentCures,
      recentCureCount: posture.recentCureCount,
      curesFetchedAt: posture.curesFetchedAt,
    },
  }
}

export async function fetchSecurity(opts: {abortSignal?: AbortSignal} = {}): Promise<FetchSecurityResult> {
  try {
    const res = await fetch('/api/security', {
      method: 'GET',
      credentials: 'same-origin',
      signal: opts.abortSignal,
    })

    if (!res.ok) {
      // Session-expiry classification, same contract as monitoring (rm-273).
      if (res.status === 401) {
        return { ok: false, reason: 'unauthenticated' }
      }
      return { ok: false, reason: 'network' }
    }

    const data = await res.json()
    if (!isPlainObject(data) || !Array.isArray(data.repos)) return {ok: false, reason: 'contract-drift'}
    if (typeof data.staleBanner !== 'boolean') return {ok: false, reason: 'contract-drift'}
    if (data.refreshedAt !== null && typeof data.refreshedAt !== 'number') {
      return {ok: false, reason: 'contract-drift'}
    }

    const repos: SecurityRepo[] = []
    for (const item of data.repos) {
      const parsed = parseRepo(item)
      if (parsed === null) return {ok: false, reason: 'contract-drift'}
      repos.push(parsed)
    }

    return {
      ok: true,
      data: {
        repos,
        staleBanner: data.staleBanner,
        refreshedAt: data.refreshedAt,
      },
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return {ok: false, reason: 'timeout'}
    }
    return {ok: false, reason: 'network'}
  }
}
