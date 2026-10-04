/**
 * No-op — SW registration is pinned OFF at build level (rm-138 branch (a)):
 * web/vite.config.ts sets injectRegister: false and
 * test/pwa-registration-guard.test.ts guards the built output. This component
 * stays as the seam where a future deliberate registration decision
 * (rm-249 push substrate / rm-106) would be wired.
 */
export function ReloadPrompt() {
  return null
}
