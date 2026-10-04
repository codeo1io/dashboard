/**
 * Persistent dev-auth marker (rm-642).
 *
 * When the server boots with devAutoLogin active (DASHBOARD_DEV_AUTOLOGIN /
 * opts.devAutoLogin — dev/fixture boots only), it injects
 * `<meta name="dev-auto-login" content="true">` into the served index.html
 * (same injected-config-meta pattern as push-enabled, server.ts). This marker
 * reads that flag ONCE at mount and renders a persistent, unmissable badge so
 * an operator looking at the browser can tell the session is auto-
 * authenticated — evidence produced under the bypass is dev/fixture evidence,
 * not production-auth evidence.
 *
 * Production boots never inject the meta, so the marker renders nothing there.
 */
export function DevAuthMarker(): React.JSX.Element | null {
  if (typeof document === 'undefined') return null
  const enabled =
    document.querySelector('meta[name="dev-auto-login"]')?.getAttribute('content') === 'true'
  if (!enabled) return null
  return (
    <div
      aria-label="dev auto-login active"
      className="fixed bottom-3 left-3 z-50 rounded-md border border-warning bg-surface px-3 py-1.5 font-mono text-label uppercase tracking-label text-warning shadow-lg select-none"
      data-testid="dev-auth-marker"
    >
      dev auto-login · auth bypassed
    </div>
  )
}
