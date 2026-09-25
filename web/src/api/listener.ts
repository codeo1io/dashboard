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
  /** Messages present in the response but dropped CLIENT-SIDE because they failed the parse contract (rm-198 drift signal). */
  readonly droppedCount: number
}

export type FetchListenerResult =
  | { ok: true; data: ListenerMessagesResponse }
  | { ok: false; reason: 'timeout' | 'network' | 'contract-drift' }

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
      signal: opts.abortSignal,
    })

    if (!res.ok) {
      return { ok: false, reason: 'network' }
    }

    const data = await res.json()
    if (!isPlainObject(data) || !Array.isArray(data.messages) || typeof data.unreadCount !== 'number') {
      return { ok: false, reason: 'contract-drift' }
    }

    // rm-198: per-message parse failures are no longer silent. Messages that
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

    // rm-199: retention-eviction count — tolerate absence from an older
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

export async function ackListenerMessage(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/listener/messages/${encodeURIComponent(id)}/ack`, {
      method: 'POST',
      credentials: 'same-origin',
    })
    return res.status === 202
  } catch {
    return false
  }
}

export async function ackAllListenerMessages(): Promise<boolean> {
  try {
    const res = await fetch('/api/listener/ack-all', {
      method: 'POST',
      credentials: 'same-origin',
    })
    return res.status === 202
  } catch {
    return false
  }
}