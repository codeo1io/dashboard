export type ListenerSource = 'infra' | 'agent'
export type ListenerSeverity = 'info' | 'warning' | 'critical'

import {withGetSeamTimeout} from './fetch-timeout.ts'

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
  | { ok: false; reason: 'timeout' | 'network' | 'unauthenticated' | 'contract-drift' }

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
    // rm-780: the seam carries its own wall-clock bound (see fetch-timeout.ts)
    // — the view-level `useBoundedPoll` bound only protects poll callers
    // (App's rm-487 focus re-probe calls this directly, unbounded before).
    // rm-847: the seam also OWNS the transport abort now — the controller is
    // composed with the caller's poll signal (either side aborting cancels
    // the request), so a bound fire releases the connection instead of
    // racing 'timeout' over a live request.
    const controller = new AbortController()
    const signal =
      opts.abortSignal === undefined
        ? controller.signal
        : AbortSignal.any([opts.abortSignal, controller.signal])
    const res = await withGetSeamTimeout(
      fetch(url.toString(), {
        method: 'GET',
        credentials: 'same-origin',
        signal,
      }),
      controller,
    )
    if (res === 'timeout') return {ok: false, reason: 'timeout'}

    if (!res.ok) {
      // rm-273: 401 is session expiry, not a transport failure — classify it
      // so the UI can offer a sign-in affordance instead of blaming the
      // network (the operator's session expired, the dashboard did not break).
      if (res.status === 401) {
        return { ok: false, reason: 'unauthenticated' }
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

    const data = await withGetSeamTimeout(res.json(), controller)
    if (data === 'timeout') return {ok: false, reason: 'timeout'}
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
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { ok: false, reason: 'timeout' }
    }
    return { ok: false, reason: 'network' }
  }
}

/** Header carrying the listener-ack CSRF token (mirrors src/routes/listener.ts). */
const ACK_CSRF_HEADER = 'x-csrf-token'

/**
 * rm-501: hard ceiling on every ack-trio fetch (GET /csrf, POST /ack,
 * POST /ack-all). The trio previously had no bound — a request that never
 * settles left the view's `ackingId` gate latched forever (every ack button
 * dead) with no failure surfaced. Mirrors rm-272's sweep bound: the race
 * alone settles the await even against a transport that ignores aborts, and
 * a timeout and a rejection both read as the same failed outcome, so every
 * caller keeps failing closed (no token → no POST; no response → false).
 */
export const ACK_FETCH_TIMEOUT_MS = 15_000

function withAckTimeout<T>(promise: Promise<T>): Promise<T | 'timeout'> {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve('timeout'), ACK_FETCH_TIMEOUT_MS)
    promise.then(
      value => {
        clearTimeout(timer)
        resolve(value)
      },
      () => {
        clearTimeout(timer)
        resolve('timeout')
      },
    )
  })
}

/**
 * Fetches the session-scoped ack CSRF token from GET /api/listener/csrf.
 * Returns null on any failure so callers fail closed (no token → no POST).
 */
async function fetchAckCsrfToken(): Promise<string | null> {
  const res = await withAckTimeout(
    fetch('/api/listener/csrf', {
      method: 'GET',
      credentials: 'same-origin',
    }),
  )
  if (res === 'timeout' || !res.ok) return null
  // rm-501: the body read is inside the bound too — a response whose stream
  // never ends is the same hang as a request that never settles.
  const data: unknown = await withAckTimeout(res.json())
  if (data === 'timeout' || !isPlainObject(data) || typeof data.csrfToken !== 'string' || data.csrfToken.length === 0) {
    return null
  }
  return data.csrfToken
}

export async function ackListenerMessage(id: string): Promise<boolean> {
  const csrfToken = await fetchAckCsrfToken()
  if (csrfToken === null) return false
  const res = await withAckTimeout(
    fetch(`/api/listener/messages/${encodeURIComponent(id)}/ack`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { [ACK_CSRF_HEADER]: csrfToken },
    }),
  )
  return res !== 'timeout' && res.status === 202
}

export async function ackAllListenerMessages(): Promise<boolean> {
  const csrfToken = await fetchAckCsrfToken()
  if (csrfToken === null) return false
  const res = await withAckTimeout(
    fetch('/api/listener/ack-all', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { [ACK_CSRF_HEADER]: csrfToken },
    }),
  )
  return res !== 'timeout' && res.status === 202
}