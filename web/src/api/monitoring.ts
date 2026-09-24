/**
 * Monitoring API client (rm-112 cycle-10).
 *
 * Minimal typed view of GET /api/monitoring — the fail-visible degradation
 * signal surfaced by the server snapshot. Defensive parsing only: the SPA is
 * display-only and must never throw on contract drift (the banner simply
 * stays hidden if the payload cannot be trusted).
 */

export interface AbsentRepo {
  readonly full_name: string
  readonly reason: string
}

export interface MonitoringDegradation {
  readonly warmEmpty: boolean
  readonly failedInstallations: number
  readonly absentRepos: readonly AbsentRepo[]
}

export interface MonitoringSnapshot {
  readonly staleBanner: boolean
  readonly driftCount: number
  readonly degradation: MonitoringDegradation
}

export type FetchMonitoringResult =
  | {ok: true; data: MonitoringSnapshot}
  | {ok: false; reason: 'network' | 'contract-drift'}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val)
}

function parseDegradation(val: unknown): MonitoringDegradation | null {
  if (!isPlainObject(val)) return null
  if (typeof val.warmEmpty !== 'boolean') return null
  if (typeof val.failedInstallations !== 'number') return null
  if (!Array.isArray(val.absentRepos)) return null

  const absentRepos: AbsentRepo[] = []
  for (const item of val.absentRepos) {
    if (!isPlainObject(item)) return null
    if (typeof item.full_name !== 'string' || typeof item.reason !== 'string') return null
    absentRepos.push({full_name: item.full_name, reason: item.reason})
  }

  return {warmEmpty: val.warmEmpty, failedInstallations: val.failedInstallations, absentRepos}
}

export function parseMonitoringSnapshot(body: unknown): MonitoringSnapshot | null {
  if (!isPlainObject(body)) return null
  if (typeof body.staleBanner !== 'boolean') return null
  if (typeof body.driftCount !== 'number') return null
  const degradation = parseDegradation(body.degradation)
  if (degradation === null) return null
  return {staleBanner: body.staleBanner, driftCount: body.driftCount, degradation}
}

export async function fetchMonitoring(opts: {abortSignal?: AbortSignal} = {}): Promise<FetchMonitoringResult> {
  try {
    const res = await fetch('/api/monitoring', {
      method: 'GET',
      credentials: 'same-origin',
      signal: opts.abortSignal,
    })

    if (!res.ok) {
      return {ok: false, reason: 'network'}
    }

    const parsed = parseMonitoringSnapshot(await res.json())
    if (parsed === null) {
      return {ok: false, reason: 'contract-drift'}
    }
    return {ok: true, data: parsed}
  } catch {
    // Untrusted display surface: any transport error leaves the banner
    // hidden rather than raising a spurious degradation state.
    return {ok: false, reason: 'network'}
  }
}
