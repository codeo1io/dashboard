import {useEffect, useState} from 'react'

/**
 * Served-artifact push capability probe (rm-249 rider, run 61448784a089;
 * marker made quote-agnostic at the 2026-10-18 integrate of that run).
 *
 * Mirrors the server-side gate (`src/served-push-capability.ts`): the push
 * consent card must only mount when the SERVED `/sw.js` actually registers a
 * push event handler, so a deployment whose served worker cannot deliver
 * push never renders a consent card whose every opt-in could only dead-end.
 *
 * When a push-capable SW ships, the handler marker appears in the built sw.js
 * and the gate opens with no code change. That self-opening fired at the
 * 2026.10.43 upstream adoption: the built sw.js now registers the push,
 * notificationclick, and pushsubscriptionchange handlers (guarded present by
 * web/src/sw.test.ts), so the probe reports capability on this estate.
 *
 * The marker matches any of the three quote styles — the Vite PWA build emits
 * the registration with backtick string literals (the form web/src/sw.test.ts
 * pins), while sources and minifiers may use single or double quotes.
 */

export const SERVED_PUSH_HANDLER_MARKER_RE = /addEventListener\(\s*(['"`])push\1/

/** Pure marker check, shared shape with the server-side gate. */
export function servedPushHandlerMarkerPresent(swSource: string): boolean {
  return SERVED_PUSH_HANDLER_MARKER_RE.test(swSource)
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
