/**
 * Fixed copy for the operator push notifications consent/settings surface.
 *
 * Maps each of the 11 permission/support states to human-readable, safe copy.
 *
 * Security invariants:
 * - NO raw endpoints, tokens, cookies, CSRF values, or HTTP status/error codes.
 * - NO API paths (like `/operator/*`).
 * - NO dynamic interpolation of sensitive values.
 */

export type NotificationUiState =
  | 'not-requested'
  | 'subscribed'
  | 'denied'
  | 'dismissed'
  | 'unsupported'
  | 'ios-not-installed'
  | 'sw-not-ready'
  | 'sw-unavailable'
  | 'subscribe-failed'
  | 'unauthenticated'
  | 'contract-drift'

export interface NotificationStateCopy {
  readonly headline: string
  readonly detail: string
  readonly privacyPolicyLinkText: string
  readonly ctaText: string | null
  readonly recoveryHint: string
}

const COPY: Record<NotificationUiState, NotificationStateCopy> = {
  'not-requested': {
    headline: 'Push Alerts',
    detail: 'Get notified of pending approvals and failed run outcomes. Sensitive keys and payloads never leave the server.',
    privacyPolicyLinkText: 'How we handle notification data',
    ctaText: 'Enable notifications',
    recoveryHint: '',
  },
  subscribed: {
    headline: 'Alerts Active',
    detail: 'Monitoring pending approvals and failed run outcomes for this device.',
    privacyPolicyLinkText: 'How we handle notification data',
    ctaText: 'Disable notifications',
    recoveryHint: '',
  },
  denied: {
    headline: 'Alerts Blocked',
    detail: 'Permission was denied at the browser level. To receive alerts, manually update site permissions in your browser settings.',
    privacyPolicyLinkText: 'How we handle notification data',
    ctaText: null,
    recoveryHint: 'Reset site permissions to resume.',
  },
  dismissed: {
    headline: 'Prompt Closed',
    detail: 'The permission request was dismissed. You can retry the setup when ready.',
    privacyPolicyLinkText: 'How we handle notification data',
    ctaText: 'Try again',
    recoveryHint: '',
  },
  unsupported: {
    headline: 'Alerts Unsupported',
    detail: 'This browser profile or environment does not support the native push and notifications engine.',
    privacyPolicyLinkText: 'How we handle notification data',
    ctaText: null,
    recoveryHint: 'Use a compatible browser or enable native system notifications.',
  },
  'ios-not-installed': {
    headline: 'Installation Required',
    detail: 'Web Push on iOS requires launching this dashboard as an installed Home Screen app.',
    privacyPolicyLinkText: 'How we handle notification data',
    ctaText: 'Install App',
    recoveryHint: 'Open the share menu and select "Add to Home Screen" to install.',
  },
  'sw-not-ready': {
    // rm-272: this state is now reached ONLY when a registration exists but
    // is not ready yet — the permanent no-registration case has its own
    // 'sw-unavailable' state, so this copy may claim transience truthfully.
    headline: 'Initializing background sync',
    detail: 'The background service worker is still initializing; this normally settles in a few seconds.',
    privacyPolicyLinkText: 'How we handle notification data',
    ctaText: 'Retry',
    recoveryHint: 'Wait a moment, or click Retry to check status again.',
  },
  'sw-unavailable': {
    // rm-272: no service-worker registration exists (nothing in the shipped
    // SPA creates one), so the ready wait can never settle. Permanent — say
    // so instead of presenting it as the temporary initializing state.
    headline: 'Background Sync Unavailable',
    detail: 'This installation has no background service worker, so push alerts cannot run here. That will not change on its own.',
    privacyPolicyLinkText: 'How we handle notification data',
    ctaText: null,
    recoveryHint: 'Updating or reinstalling the app, or switching to a supported browser profile, may restore it.',
  },
  'subscribe-failed': {
    headline: 'Setup Failed',
    detail: 'Site permission is active, but registering the subscription with the gateway failed.',
    privacyPolicyLinkText: 'How we handle notification data',
    ctaText: 'Retry Registration',
    recoveryHint: 'Verify your session and network connection, then try again.',
  },
  unauthenticated: {
    // rm-276: 401 from any /operator/push/* call — auth expiry, not a
    // registration failure. Copy mirrors the listener/monitoring surfaces'
    // session-expired affordance (rm-273 parity); the CTA re-authenticates
    // server-side at /auth/login (fail-closed), never a blind retry.
    headline: 'Session Expired',
    detail: 'Your sign-in session has expired, so this device cannot be registered for alerts.',
    privacyPolicyLinkText: 'How we handle notification data',
    ctaText: 'Sign In Again',
    recoveryHint: 'Signing in again resumes alert delivery to this device.',
  },
  'contract-drift': {
    // rm-277: the gateway answered with a body that violates its documented
    // shape — a server-side mismatch, never a device or permission problem.
    headline: 'Alert Service Changed',
    detail: 'The alerts service answered in an unexpected format, so this device cannot be registered right now.',
    privacyPolicyLinkText: 'How we handle notification data',
    ctaText: null,
    recoveryHint: 'This is a server-side mismatch. It clears automatically once the dashboard and gateway agree again.',
  },
}

export function getNotificationCopy(state: NotificationUiState): NotificationStateCopy {
  return COPY[state]
}
