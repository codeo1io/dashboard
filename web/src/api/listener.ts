export type ListenerSource = 'infra' | 'agent'
export type ListenerSeverity = 'info' | 'warning' | 'critical'

export interface ListenerLink {
  readonly label: string
  readonly url: string
}

export interface ListenerMessage {
  readonly id: string
  readonly source: ListenerSource
  readonly kind: string
  readonly severity: ListenerSeverity
  readonly title: string
  readonly body: string
  readonly links: readonly ListenerLink[]
  readonly createdAt: string
  readonly receivedAt: string
  readonly read: boolean
}

export interface ListenerMessagesResponse {
  readonly messages: readonly ListenerMessage[]
  readonly unreadCount: number
  /** Messages evicted by server-side retention (500 rows / 30 days) since the server process started. 0 when absent (older server). */
  readonly prunedCount: number
  /** Messages present in the response but dropped CLIENT-SIDE because they failed the parse contract (rm-243 drift signal). */
  readonly droppedCount: number
}

export type FetchListenerResult =
  | { ok: true; data: ListenerMessagesResponse }
  | { ok: false; reason: 'timeout' | 'network' | 'unauthenticated' | 'rate-limited' | 'contract-drift' }

/**
 * rm-1487: hard budget for every listener API call that is not already
 * bounded by a caller-supplied abort signal. The App.tsx unread poll and the
 * view loads are bounded at the view layer (useBoundedPoll's timeoutMs race
 * + per-call abort, LISTENER_FETCH_TIMEOUT_MS 15s), but the ack CSRF GET and
 * both ack POSTs passed NO signal at all — unbounded fetches an abandoned
 * tab could hold open forever. 10s keeps this a backstop strictly below the
 * view-layer 15s budget and the web testTimeout (30s), so jsdom suites never
 * inherit a hang and the view's own tighter race still fires first.
 */
export const LISTENER_CALL_TIMEOUT_MS = 10_000

/**
 * rm-1487: caller aborts reject as AbortError while AbortSignal.timeout()
 * rejects as TimeoutError — both mean "the call did not complete in its
 * budget" and must classify as `timeout`, never `network`. (The run-9c8505bc
 * implement phase surfaced this as a latent bug: the old catch matched only
 * AbortError, so every api-layer budget expiry was misfiled as a transport
 * fault and the `timeout` reason was unreachable for default-signal calls.)
 */
function isAbortClassError(err: unknown): boolean {
  return err instanceof DOMException && (err.name === 'AbortError' || err.name === 'TimeoutError')
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val)
}

function parseMessage(item: unknown): ListenerMessage | null {
  if (!isPlainObject(item)) return null

  const { id, source, kind, severity, title, body, createdAt, receivedAt, read, links } = item

  if (typeof id !== 'string') return null
  if (source !== 'infra' && source !== 'agent') return null
  if (typeof kind !== 'string') return null
  if (severity !== 'info' && severity !== 'warning' && severity !== 'critical') return null
  if (typeof title !== 'string') return null
  if (typeof body !== 'string') return null
  if (typeof createdAt !== 'string') return null
  if (typeof receivedAt !== 'string') return null
  if (typeof read !== 'boolean') return null

  const parsedLinks: ListenerLink[] = []
  if (Array.isArray(links)) {
    for (const link of links) {
      if (isPlainObject(link) && typeof link.label === 'string' && typeof link.url === 'string') {
        if (link.url.startsWith('https://')) {
          parsedLinks.push({ label: link.label, url: link.url })
        }
      }
    }
  }

  return {
    id,
    source,
    kind,
    severity,
    title,
    body,
    createdAt,
    receivedAt,
    read,
    links: parsedLinks,
  }
}

export async function fetchListenerMessages(opts: {
  unreadOnly?: boolean
  limit?: number
  abortSignal?: AbortSignal
} = {}): Promise<FetchListenerResult> {
  const url = new URL('/api/listener/messages', window.location.origin)
  if (opts.unreadOnly) {
    url.searchParams.set('unreadOnly', 'true')
  }
  if (opts.limit) {
    url.searchParams.set('limit', String(opts.limit))
  }

  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      credentials: 'same-origin',
      // rm-1487: api-layer default bound — a caller signal still wins, so
      // the view-layer 15s budget keeps its meaning.
      signal: opts.abortSignal ?? AbortSignal.timeout(LISTENER_CALL_TIMEOUT_MS),
    })

    if (!res.ok) {
      // rm-273: 401 is session expiry, not a transport failure — classify it
      // so the UI can offer a sign-in affordance instead of blaming the
      // network (the operator's session expired, the dashboard did not break).
      if (res.status === 401) {
        return { ok: false, reason: 'unauthenticated' }
      }
      // rm-1487: 429 is the per-path-class rate limiter answering, not a
      // transport fault — surface it distinctly (named like the operator
      // runtime's canonical 'rate-limited' state, web/src/operator/state.ts)
      // so "slow down" never renders as "broken".
      if (res.status === 429) {
        return { ok: false, reason: 'rate-limited' }
      }
      return { ok: false, reason: 'network' }
    }

    // rm-421b: a followed redirect means the server bounced the request to the
    // login surface — the SPA session expired. This is the same session-expiry
    // class as rm-273's 401 above (gateway-mode auth returns a 302 that fetch
    // follows onto the login page with a 200), so it reports the SAME
    // `unauthenticated` reason — a distinct name here would fall through every
    // consumer's expiry branch (App.tsx / Listener.tsx / Monitoring.tsx) and
    // blame the network instead of offering the sign-in affordance.
    if (res.redirected) {
      return { ok: false, reason: 'unauthenticated' }
    }

    const data = await res.json()
    if (!isPlainObject(data) || !Array.isArray(data.messages) || typeof data.unreadCount !== 'number') {
      return { ok: false, reason: 'contract-drift' }
    }

    // rm-243: per-message parse failures are no longer silent. Messages that
    // fail the client contract are counted so the UI can surface drift (the
    // server's unreadCount includes them — a growing gap between badge and
    // list is the drift tell) instead of quietly rendering a shorter list.
    const messages: ListenerMessage[] = []
    let droppedCount = 0
    for (const item of data.messages) {
      const parsed = parseMessage(item)
      if (parsed !== null) {
        messages.push(parsed)
      } else {
        droppedCount++
      }
    }

    // rm-244: retention-eviction count — tolerate absence from an older
    // server build (treat missing as 0) since the field is additive.
    const prunedCount = typeof data.prunedCount === 'number' ? data.prunedCount : 0

    return { ok: true, data: { messages, unreadCount: data.unreadCount, prunedCount, droppedCount } }
  } catch (err) {
    if (isAbortClassError(err)) {
      return { ok: false, reason: 'timeout' }
    }
    return { ok: false, reason: 'network' }
  }
}

/** Header carrying the listener-ack CSRF token (mirrors src/routes/listener.ts). */
const ACK_CSRF_HEADER = 'x-csrf-token'

/**
 * Fetches the session-scoped ack CSRF token from GET /api/listener/csrf.
 * Returns null on any failure so callers fail closed (no token → no POST).
 */
async function fetchAckCsrfToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/listener/csrf', {
      method: 'GET',
      credentials: 'same-origin',
      // rm-1487: this leg had no bound at all before the ack POST could run.
      signal: AbortSignal.timeout(LISTENER_CALL_TIMEOUT_MS),
    })
    if (!res.ok) return null
    const data: unknown = await res.json()
    if (!isPlainObject(data) || typeof data.csrfToken !== 'string' || data.csrfToken.length === 0) {
      return null
    }
    return data.csrfToken
  } catch {
    return null
  }
}

export async function ackListenerMessage(id: string): Promise<boolean> {
  const csrfToken = await fetchAckCsrfToken()
  if (csrfToken === null) return false
  try {
    const res = await fetch(`/api/listener/messages/${encodeURIComponent(id)}/ack`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { [ACK_CSRF_HEADER]: csrfToken },
      // rm-1487: every listener fetch bounded at the api layer, acks included.
      signal: AbortSignal.timeout(LISTENER_CALL_TIMEOUT_MS),
    })
    return res.status === 202
  } catch {
    return false
  }
}

export async function ackAllListenerMessages(): Promise<boolean> {
  const csrfToken = await fetchAckCsrfToken()
  if (csrfToken === null) return false
  try {
    const res = await fetch('/api/listener/ack-all', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { [ACK_CSRF_HEADER]: csrfToken },
      // rm-1487: every listener fetch bounded at the api layer, acks included.
      signal: AbortSignal.timeout(LISTENER_CALL_TIMEOUT_MS),
    })
    return res.status === 202
  } catch {
    return false
  }
}