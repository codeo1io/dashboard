// Sign-in redirect recovery: redirect the tab to the gateway sign-in page at most
// once per tab when the operator shell first goes signed-out (#637 upstream,
// bcdcb46): the guard flag has no expiry and is only cleared by a successful
// run-list load, replacing the earlier 60-second re-arm window (#633).
import type {OperatorState} from './state.ts'

export const GATEWAY_SIGN_IN_URL = '/operator/auth/github/start?return_to=/operator'
const SIGN_IN_REDIRECT_GUARD_KEY = 'fro-bot.operator-sign-in-redirect'

export function navigateToGatewaySignIn(assign: (url: string) => void = url => globalThis.location.assign(url)): void {
  assign(GATEWAY_SIGN_IN_URL)
}

export function maybeAutoRedirectToGatewaySignIn(
  state: OperatorState,
  navigate: () => void = navigateToGatewaySignIn,
): void {
  if (state !== 'auth-required') return

  try {
    // One-shot per tab: the flag is a presence marker with no expiry. Only a successful run-list
    // load clears it (clearGatewaySignInRedirectGuard), so a signed-out tab that still has the flag
    // shows the manual sign-in button instead of looping through the gateway.
    if (sessionStorage.getItem(SIGN_IN_REDIRECT_GUARD_KEY) !== null) return

    sessionStorage.setItem(SIGN_IN_REDIRECT_GUARD_KEY, '1')
    navigate()
  } catch {
    // Without a reliable tab-scoped loop guard, leave the manual sign-in action available.
  }
}

export function clearGatewaySignInRedirectGuard(): void {
  try {
    sessionStorage.removeItem(SIGN_IN_REDIRECT_GUARD_KEY)
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}
