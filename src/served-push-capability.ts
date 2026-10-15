import {readFileSync} from 'node:fs'
import {join} from 'node:path'

/**
 * Served-artifact push capability (rm-249 deploy-guard rider, run 61448784a089).
 *
 * The push consent surface (push-enabled meta + Notifications card) must never
 * mount against a service worker that cannot deliver push. This fork's shipped
 * `web/src/sw.ts` is a kill-switch SW: it unregisters itself on activate and
 * carries NO push/notificationclick handlers (guarded absent by
 * `web/src/sw.test.ts`). The served artifact is the truth: if `web/dist/sw.js`
 * contains no `addEventListener('push'` registration, the channel is dead and
 * the consent surface stays unreachable regardless of environment flags.
 *
 * The check is derived from the artifact on purpose: when a push-capable SW
 * ships (roadmap rm-249/rm-1420), the marker appears in the built sw.js and
 * the gate opens automatically — no manual constant to flip, no coordination.
 *
 * Both quote styles are matched so a minifier using double quotes cannot
 * false-negative the marker.
 */

export const SERVED_PUSH_HANDLER_MARKERS = [
  "addEventListener('push'",
  'addEventListener("push"',
] as const

/**
 * Read `<webDistRoot>/sw.js` and report whether it registers a push event
 * handler. Fail-closed: a missing or unreadable sw.js (or any read error)
 * reports NO capability — a deployment without a served SW cannot deliver
 * push notifications.
 *
 * Intended for ONE call at startup (not per-request); the result is a
 * build-artifact property that only changes with a rebuild + restart.
 */
export function readServedPushHandlerPresence(webDistRoot: string): boolean {
  let swSource: string
  try {
    swSource = readFileSync(join(webDistRoot, 'sw.js'), 'utf8')
  } catch {
    return false // missing/unreadable sw.js — fail closed
  }
  return SERVED_PUSH_HANDLER_MARKERS.some(marker => swSource.includes(marker))
}
