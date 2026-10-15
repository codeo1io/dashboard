import {useEffect, useState} from 'react'

/**
 * Served-artifact push capability probe (rm-249 rider, run 61448784a089).
 *
 * Mirrors the server-side gate (`src/served-push-capability.ts`): the push
 * consent card must only mount when the SERVED `/sw.js` actually registers a
 * push event handler. This fork's shipped service worker is a kill-switch SW
 * (no push/notificationclick handlers; self-unregisters on activate), so
 * without this gate every consent interaction can only end in the terminal
 * 'sw-not-ready' state — a dead-end UI for a channel that cannot deliver.
 *
 * When a push-capable SW ships (rm-249/rm-1420), the handler marker appears
 * in the built sw.js and the gate opens with no code change.
 */

export const SERVED_PUSH_HANDLER_MARKERS = [
  "addEventListener('push'",
  'addEventListener("push"',
] as const

/** Pure marker check, shared shape with the server-side gate. */
export function servedPushHandlerMarkerPresent(swSource: string): boolean {
  return SERVED_PUSH_HANDLER_MARKERS.some(marker => swSource.includes(marker))
}

/**
 * Probe the served service worker for a push event handler. Fail-closed on
 * every failure mode: no serviceWorker API, fetch error, non-200 response,
 * or a sw.js without a push-handler registration.
 */
export async function probeServedPushCapability(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false
  try {
    const res = await fetch('/sw.js', {cache: 'no-store'})
    if (!res.ok) return false
    return servedPushHandlerMarkerPresent(await res.text())
  } catch {
    return false
  }
}

/**
 * One-shot capability probe for gating the push consent surface at mount
 * time. Returns false until the probe resolves; stays false on any failure.
 */
export function useServedPushCapability(): boolean {
  const [capable, setCapable] = useState(false)
  useEffect(() => {
    let cancelled = false
    void probeServedPushCapability().then(present => {
      if (!cancelled) setCapable(present)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return capable
}
