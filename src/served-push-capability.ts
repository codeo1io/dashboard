import {readFileSync} from 'node:fs'
import {join} from 'node:path'

/**
 * Served-artifact push capability (rm-249 deploy-guard rider, run 61448784a089;
 * marker made quote-agnostic at the 2026-10-18 integrate of that run).
 *
 * The push consent surface (push-enabled meta + Notifications card) must never
 * mount against a service worker that cannot deliver push. The served artifact
 * is the truth: if `web/dist/sw.js` contains no push event-listener
 * registration, the channel is dead and the consent surface stays unreachable
 * regardless of environment flags.
 *
 * The check is derived from the artifact on purpose: when a push-capable SW
 * ships, the marker appears in the built sw.js and the gate opens
 * automatically — no manual constant to flip, no coordination. That
 * self-opening fired for real at the 2026.10.43 upstream adoption, which
 * restored a service worker with push/notificationclick/
 * pushsubscriptionchange handlers (guarded present by web/src/sw.test.ts), so
 * on this estate the gate is OPEN: flag + artifact together enable the surface.
 *
 * The quote style around the event name is NOT stable across build modes —
 * the Vite PWA injectManifest build emits the registration with backtick
 * string literals (the exact form web/src/sw.test.ts pins in the built
 * artifact), hand-written sources use single quotes, and a minifier may emit
 * double quotes — so the marker accepts any of the three quote characters,
 * matched pairwise via a backreference.
 */

export const SERVED_PUSH_HANDLER_MARKER_RE = /addEventListener\(\s*(['"`])push\1/

/** Pure marker check (quote-agnostic; see {@link SERVED_PUSH_HANDLER_MARKER_RE}). */
export function servedPushHandlerMarkerPresent(swSource: string): boolean {
  return SERVED_PUSH_HANDLER_MARKER_RE.test(swSource)
}

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
  return servedPushHandlerMarkerPresent(swSource)
}
