/**
 * DegradationBanner — fail-visible operator signal (rm-112 cycle-10).
 *
 * Polls /api/monitoring (once a minute by default) and renders a banner
 * when the snapshot is degraded:
 *   - stale: serving stale data — a refresh did not complete cleanly
 *     (fail-closed metadata, or total installation-enumeration failure)
 *   - warm-empty: a GOOD refresh emptied a previously non-empty snapshot —
 *     data loss, not quiet
 *   - failedInstallations: installations whose token mint/repo list failed
 *     are missing from the repo union
 *   - absentRepos: metadata-listed public repos dropped from the working set
 *     (resolver failure, or no resolver configured)
 *
 * Renders nothing when healthy, when the endpoint is unreachable, or when
 * the payload fails contract parsing — the shell must never be blocked by
 * the signal that reports on it. All colors come from CSS vars (tokens.css).
 */

import {useEffect, useState} from 'react'
import {fetchMonitoring, type MonitoringSnapshot} from '../api/monitoring.ts'

export function DegradationBanner({intervalMs = 60_000}: {readonly intervalMs?: number} = {}) {
  const [snapshot, setSnapshot] = useState<MonitoringSnapshot | null>(null)

  useEffect(() => {
    let cancelled = false
    const tick = async (): Promise<void> => {
      const result = await fetchMonitoring()
      if (!cancelled && result.ok) {
        setSnapshot(result.data)
      }
    }
    tick().catch(() => undefined)
    const handle = window.setInterval(() => {
      tick().catch(() => undefined)
    }, intervalMs)
    return () => {
      cancelled = true
      window.clearInterval(handle)
    }
  }, [intervalMs])

  if (snapshot === null) return null

  const absent = snapshot.degradation.absentRepos
  const reasons: string[] = []
  if (snapshot.staleBanner) {
    reasons.push(
      snapshot.degradation.warmEmpty
        ? 'Snapshot went empty on a successful refresh — data loss, not quiet.'
        : 'Serving stale data — the last refresh did not complete cleanly.',
    )
  }
  if (snapshot.degradation.failedInstallations > 0) {
    reasons.push(
      `${snapshot.degradation.failedInstallations} installation${
        snapshot.degradation.failedInstallations === 1 ? '' : 's'
      } missing from the repo union (token mint or repo list failed).`,
    )
  }
  if (absent.length > 0) {
    const shown = absent.slice(0, 3).map((a) => a.full_name).join(', ')
    const suffix = absent.length > 3 ? ', …' : ''
    reasons.push(
      `${absent.length} metadata-listed repo${absent.length === 1 ? '' : 's'} absent from the working set: ${shown}${suffix}`,
    )
  }
  if (reasons.length === 0) return null

  return (
    <div
      data-testid="degradation-banner"
      role="status"
      style={{
        border: '1px solid var(--color-warning)',
        background: 'var(--color-surface-raised)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-3) var(--space-4)',
        marginBottom: 'var(--space-4)',
      }}
    >
      <strong style={{color: 'var(--color-warning)'}}>Monitoring degraded</strong>
      <ul style={{margin: 'var(--space-2) 0 0', paddingLeft: 'var(--space-5)'}}>
        {reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    </div>
  )
}
