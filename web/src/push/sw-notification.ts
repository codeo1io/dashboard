/**
 * Pure payload → safe-notification mapping, imported by `sw.ts`.
 *
 * Wire shape (upstream #615, absorbed 2026-10-15 rm-1420): the gateway sends
 * `{title, body, data: {type, route, failureLabel?}}`. The type/failureLabel
 * controls live in the `data` envelope; the pre-#615 top-level
 * `{type, failureLabel}` shape this fork previously pinned is no longer read.
 *
 * SW no-leak discipline: this module performs no I/O, has no `console.*`
 * calls, and never echoes payload free-text into rendered copy or into an
 * error/reason string. For the three known trigger kinds the copy is fixed
 * dashboard-owned text — the payload's `title`/`body` are NOT rendered for
 * known kinds. Only the fallback path (an event kind the dashboard does not
 * recognize) surfaces the gateway's own `title`/`body` strings, so a new
 * gateway-side event kind stays readable instead of collapsing into the
 * generic card; every other payload field is discarded on every path.
 * `route` is pinned to `'/'` — click-through always lands on the dashboard
 * root, never on a payload-supplied route.
 */

export type PushNotificationType = 'approval' | 'run_failed' | 'question'

/**
 * Allowlisted `failureLabel` values. An unrecognized label (including any
 * attacker-controlled string from the push payload) is never rendered —
 * only membership in this set unlocks the specific copy variant.
 *
 * rm-1420 parity: this set mirrors exactly the keys of
 * `FAILURE_REASON_LABELS` in `public/operator-stream.js` — the eight
 * failure kinds the served client actually emits. The pair is pinned by a
 * source-parity test in `sw-notification.test.ts`; add a kind there first.
 */
export const KNOWN_FAILURE_LABELS: ReadonlySet<string> = new Set([
  'inactivity-timeout',
  'max-duration-timeout',
  'stream-ended',
  'workspace-unreachable',
  'session-error',
  'checkout-substituted',
  'workspace-unavailable',
  'unknown',
])

export interface SafeNotification {
  readonly title: string
  readonly body: string
  readonly data: {readonly type: string; readonly route: '/'}
}

const GENERIC_FALLBACK: SafeNotification = {
  title: 'Fro Bot',
  body: 'You have a new notification.',
  data: {type: 'unknown', route: '/'},
}

const RUN_FAILED_GENERIC_BODY = 'A run failed.'

/** Exhaustive over known `type` values — every entry must produce copy without reading raw payload text. */
const COPY_MAP: Record<PushNotificationType, (failureLabel: string | undefined) => SafeNotification> = {
  approval: () => ({
    title: 'Approval needed',
    body: 'A run is waiting for your approval.',
    data: {type: 'approval', route: '/'},
  }),
  run_failed: failureLabel => ({
    title: 'Run failed',
    body:
      failureLabel !== undefined && KNOWN_FAILURE_LABELS.has(failureLabel)
        ? `A run failed: ${failureLabel}.`
        : RUN_FAILED_GENERIC_BODY,
    data: {type: 'run_failed', route: '/'},
  }),
  question: () => ({
    title: 'Answer needed',
    body: 'A run is waiting for your answer.',
    data: {type: 'question', route: '/'},
  }),
}

function isKnownType(value: unknown): value is PushNotificationType {
  return value === 'approval' || value === 'run_failed' || value === 'question'
}

/** The gateway's `data` envelope: `{type, route, failureLabel?}`. Absent/non-object → `{}`. */
function readDataEnvelope(payload: Record<string, unknown>): Record<string, unknown> {
  const {data} = payload
  if (typeof data === 'object' && data !== null && Array.isArray(data) === false) {
    return data as Record<string, unknown>
  }
  return {}
}

/** A non-blank trimmed string from the gateway's own copy — else undefined. */
function readCopyText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

/**
 * Build a safe notification descriptor from a raw, untrusted push payload
 * (`{title, body, data: {type, route, failureLabel?}}`).
 *
 * Always returns a notification — never throws, never returns null/undefined
 * — so callers can unconditionally `showNotification`. Known trigger kinds
 * render fixed copy and ignore the payload's `title`/`body`. Unrecognized
 * kinds surface the gateway's own `title`/`body` (#615), falling back to the
 * generic strings when they are missing or blank. `failureLabel` is only
 * ever rendered if it is a member of `KNOWN_FAILURE_LABELS`; otherwise it is
 * discarded.
 */
export function buildNotification(rawPayload: unknown): SafeNotification {
  if (typeof rawPayload !== 'object' || rawPayload === null || Array.isArray(rawPayload)) {
    return GENERIC_FALLBACK
  }

  const payload = rawPayload as Record<string, unknown>
  const data = readDataEnvelope(payload)
  const {type} = data

  if (isKnownType(type) === false) {
    return {
      title: readCopyText(payload.title) ?? GENERIC_FALLBACK.title,
      body: readCopyText(payload.body) ?? GENERIC_FALLBACK.body,
      data: GENERIC_FALLBACK.data,
    }
  }

  const rawFailureLabel = data.failureLabel
  const failureLabel = typeof rawFailureLabel === 'string' ? rawFailureLabel : undefined

  switch (type) {
    case 'approval':
      return COPY_MAP.approval(failureLabel)
    case 'run_failed':
      return COPY_MAP.run_failed(failureLabel)
    case 'question':
      return COPY_MAP.question(failureLabel)
    default: {
      const exhaustiveType: never = type
      return exhaustiveType
    }
  }
}
