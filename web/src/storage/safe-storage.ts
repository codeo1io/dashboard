/**
 * Storage-safe localStorage accessors (rm-630).
 *
 * Every SPA read/write of window.localStorage goes through these: in
 * storage-denied browsers (Safari with cookies blocked, locked-down
 * webviews) the ACCESS ITSELF throws a SecurityError. Half of the guarded
 * sites are React render-phase state initializers — an escape there, with no
 * root error boundary yet (rm-514), unmounts the whole tree behind the
 * service-worker shell and produces a deterministic blank page. These
 * accessors degrade to "no stored value" instead of throwing; the
 * containment arm (root ErrorBoundary, rm-514) lands separately on top of
 * the fixtures this module's tests establish.
 *
 * Denial semantics: read → null (no stored value); write → false (not
 * persisted). Callers never branch on the failure — the value is best-effort
 * persistence by design (theme preference, dismissal latches).
 */

export function safeStorageGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeStorageSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}
