// rm-1446: session push-health rendering. The gateway's operator session
// info carries `push: {status: 'ready' | 'degraded' | 'unknown'}` (contract
// 1.11.0, src/gateway/operator-contract/responses.ts) but the client
// consumed it nowhere. This module is the client-side vocabulary + fail-open
// parse: any malformed, missing, or unreachable session push field renders
// as absent — it must never block or break the session surface.

export const PUSH_HEALTH_STATUSES = ['ready', 'degraded', 'unknown'] as const

export type PushHealthStatus = (typeof PUSH_HEALTH_STATUSES)[number]

const PUSH_HEALTH_STATUS_SET: ReadonlySet<string> = new Set(PUSH_HEALTH_STATUSES)

/**
 * Parse the `push.status` field of an operator session body. Fail-open:
 * anything other than a known status (missing field, wrong type, empty
 * string, network-shaped garbage) returns null, meaning "render nothing".
 */
export function parseSessionPushHealth(body: unknown): PushHealthStatus | null {
  if (body === null || typeof body !== 'object') return null
  const push = (body as {push?: unknown}).push
  if (push === null || typeof push !== 'object') return null
  const status = (push as {status?: unknown}).status
  if (typeof status !== 'string') return null
  return PUSH_HEALTH_STATUS_SET.has(status) ? (status as PushHealthStatus) : null
}

export function pushHealthLabel(status: PushHealthStatus): string {
  if (status === 'ready') return 'Push delivery: ready'
  if (status === 'degraded') return 'Push delivery: degraded — notify the gateway operator'
  return 'Push delivery: unknown'
}

export interface SessionPushStatusDeps {
  readonly fetchImpl?: typeof fetch
}

/**
 * Fetch `/operator/session` and extract the push-health status. Fail-open:
 * any failure (network error, non-OK status, malformed body) resolves null.
 */
export async function fetchSessionPushStatus(
  deps: SessionPushStatusDeps = {},
  signal?: AbortSignal,
): Promise<PushHealthStatus | null> {
  const doFetch = deps.fetchImpl ?? fetch
  try {
    const res = await doFetch('/operator/session', {
      credentials: 'same-origin',
      signal,
    })
    if (!res.ok) return null
    const body = (await res.json()) as unknown
    return parseSessionPushHealth(body)
  } catch {
    return null
  }
}
