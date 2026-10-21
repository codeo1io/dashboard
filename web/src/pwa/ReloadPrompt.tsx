/**
 * No-op update-banner stub (rm-274 truthing: the old kill-switch comment was
 * false — SW registration IS live, auto-injected by vite-plugin-pwa as
 * /registerSW.js in web/dist/index.html). registerType 'prompt' means a new SW
 * stays waiting until updateServiceWorker(true) is called, which no current
 * surface calls; upstream's solved useRegisterSW banner is the rm-1935 absorb.
 */
export function ReloadPrompt() {
  return null
}
