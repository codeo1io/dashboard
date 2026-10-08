import { useState } from 'react'
import {
  fetchListenerMessages,
  ackListenerMessage,
  ackAllListenerMessages,
  type FetchListenerResult,
  type ListenerMessagesResponse,
  type ListenerMessage,
} from '../api/listener.ts'
import {useBoundedPoll} from '../hooks/useBoundedPoll.ts'

type ViewState =
  | { state: 'loading' }
  | { state: 'error'; reason: string }
  | { state: 'auth-expired' }
  | { state: 'empty' }
  | { state: 'ready'; data: ListenerMessagesResponse }

export const POLL_INTERVAL_MS = 30000
/**
 * rm-155: hard ceiling on a single poll — releases the latch even if the transport
 * never settles, and aborts the in-flight request when the signal is honored.
 *
 * rm-421c: this is the value that actually ARMS the AbortSignal handed to
 * fetchListenerMessages. Before it existed the controller was constructed but
 * never aborted, leaving the api's 'timeout' branch dead code — useBoundedPoll
 * (rm-251) now drives the race+abort, and this is the per-poll ceiling it uses.
 */
export const LISTENER_FETCH_TIMEOUT_MS = 15000

export function ListenerChannel() {
  const [viewState, setViewState] = useState<ViewState>({ state: 'loading' })
  const [ackingId, setAckingId] = useState<string | 'all' | null>(null)
  /**
   * rm-501: visible failed-ack feedback. An ack that settles false (bounded
   * timeout, rejection, non-202) must not vanish silently — the banner stays
   * until the operator retries, and every new attempt clears it first, so the
   * ack buttons themselves are the retry affordance.
   */
  const [ackFailed, setAckFailed] = useState(false)

  // rm-251: the rm-155 lifecycle now lives in the shared useBoundedPoll hook
  // (extracted when Monitoring.tsx was fixed); this view keeps only its own
  // result semantics (Inbox Zero vs ready, integrity notices).
  const { poll } = useBoundedPoll<FetchListenerResult>({
    fetcher: abortSignal => fetchListenerMessages({ limit: 100, abortSignal }),
    timeoutMs: LISTENER_FETCH_TIMEOUT_MS,
    intervalMs: POLL_INTERVAL_MS,
    timeoutResult: { ok: false, reason: 'timeout' },
    onInitialStart: () => {
      setViewState({ state: 'loading' })
    },
    onResult: result => {
      if (!result.ok) {
        // rm-273: 401 is session expiry, not a network failure — render the
        // sign-in affordance instead of the retry copy. The poll keeps
        // running, so a re-login (this tab or another) recovers automatically.
        if (result.reason === 'unauthenticated') {
          setViewState({ state: 'auth-expired' })
          return
        }
        setViewState(prev => (prev.state === 'ready' ? prev : { state: 'error', reason: result.reason }))
        return
      }

      if (result.data.messages.length === 0 && result.data.droppedCount === 0 && result.data.prunedCount === 0) {
        setViewState({ state: 'empty' })
      } else {
        // Still 'ready' when the parsed list is empty but drift/retention
        // notices exist (rm-243/rm-244): those signals must render, not be
        // swallowed by the Inbox Zero state.
        setViewState({ state: 'ready', data: result.data })
      }
    },
    refetchOnFocus: true,
    refetchOnVisibility: true,
  })

  const handleAck = async (id: string) => {
    if (ackingId) return
    setAckingId(id)
    setAckFailed(false)
    const success = await ackListenerMessage(id)
    setAckingId(null)
    if (success) {
      void poll(false)
    } else {
      // rm-501: surface the failure — the api's rm-501 bound guarantees this
      // path is reached even when the transport never settles.
      setAckFailed(true)
    }
  }

  const handleAckAll = async () => {
    if (ackingId) return
    setAckingId('all')
    setAckFailed(false)
    const success = await ackAllListenerMessages()
    setAckingId(null)
    if (success) {
      void poll(false)
    } else {
      // rm-501: same visible-failure contract as the per-message ack.
      setAckFailed(true)
    }
  }

  return (
    <div className="operator-panel" data-testid="listener-channel">
      <div className="listener-header" style={{ marginBottom: 'var(--space-4)', alignItems: 'center' }}>
        <h2 className="operator-section-heading" style={{ marginBottom: 0 }}>
          Operator Inbox
        </h2>
        {viewState.state === 'ready' && viewState.data.unreadCount > 0 && (
          <button
            type="button"
            className="run-cancel-btn-dismiss"
            onClick={handleAckAll}
            disabled={ackingId === 'all'}
            style={{ minHeight: '36px', padding: 'var(--space-1) var(--space-3)' }}
          >
            {ackingId === 'all' ? 'Marking...' : 'Mark all read'}
          </button>
        )}
      </div>

      {ackFailed && (
        <div data-testid="listener-ack-failure" className="operator-warning-panel" role="alert" style={{ marginBottom: 'var(--space-3)' }}>
          Couldn't mark as read — the request timed out or was rejected. Try again.
        </div>
      )}

      {viewState.state === 'loading' && (
        <div data-testid="listener-loading" className="run-index-skeleton-container" aria-live="polite">
          {[1, 2, 3].map((i) => (
            <div key={i} className="run-card-skeleton">
              <span className="skeleton-item skeleton-pill" aria-hidden="true" />
              <span className="skeleton-item skeleton-repo" aria-hidden="true" />
              <span className="skeleton-item skeleton-time" aria-hidden="true" />
            </div>
          ))}
        </div>
      )}

      {viewState.state === 'error' && (
        <div data-testid="listener-error" className="operator-warning-panel operator-failure-state-unavailable" role="alert">
          Failed to load messages ({viewState.reason}). Will retry.
        </div>
      )}

      {viewState.state === 'auth-expired' && (
        <div data-testid="listener-auth-expired" className="operator-warning-panel" role="alert">
          Session expired — sign in again to load messages.{' '}
          <a href="/auth/login">Sign in</a>
        </div>
      )}

      {viewState.state === 'empty' && (
        <div data-testid="listener-empty" className="operator-empty-state">
          <div className="operator-empty-icon" aria-hidden="true" style={{ opacity: 0.2 }}>✓</div>
          <p className="operator-empty-title">Inbox Zero</p>
          <p className="operator-empty-desc">No messages from infra or agent.</p>
        </div>
      )}

      {viewState.state === 'ready' && (
        <div data-testid="listener-list" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {(viewState.data.droppedCount > 0 || viewState.data.prunedCount > 0) && (
            <div data-testid="listener-integrity-notices" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {viewState.data.droppedCount > 0 && (
                <div data-testid="listener-drift-notice" className="operator-warning-panel" role="status">
                  {viewState.data.droppedCount}{' '}
                  {viewState.data.droppedCount === 1 ? 'message was' : 'messages were'} skipped — incompatible
                  format (server/client contract drift). The unread count can differ from this list.
                </div>
              )}
              {viewState.data.prunedCount > 0 && (
                <div data-testid="listener-pruned-notice" className="operator-warning-panel" role="status">
                  {viewState.data.prunedCount} older{' '}
                  {viewState.data.prunedCount === 1 ? 'message' : 'messages'} removed by retention (500
                  messages / 30 days). This list is a truncated view of channel history.
                </div>
              )}
            </div>
          )}
          {viewState.data.messages.map(msg => (
            <MessageCard
              key={msg.id}
              msg={msg}
              isAcking={ackingId === msg.id}
              onAck={() => handleAck(msg.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function getSeverityClass(severity: string) {
  switch (severity) {
    case 'critical': return 'severity-critical'
    case 'warning': return 'severity-warning'
    case 'info': return 'severity-info'
    default: return 'severity-default'
  }
}

function MessageCard({ msg, isAcking, onAck }: { msg: ListenerMessage; isAcking: boolean; onAck: () => void }) {
  const isUnread = !msg.read
  
  return (
    <div
      data-testid="listener-message-card"
      className={`listener-message-card ${isUnread ? 'is-unread' : ''}`}
    >
      <div className="listener-header">
        <div className="listener-meta">
          <span
            aria-label={`Severity: ${msg.severity}`}
            className={`listener-severity ${getSeverityClass(msg.severity)}`}
          >
            {msg.severity}
          </span>
          <span className="listener-source">
            {msg.source}/{msg.kind}
          </span>
          {isUnread && (
            <span
              title="Unread"
              className="listener-unread-dot"
            >
              <span className="sr-only">Unread</span>
            </span>
          )}
        </div>
        <div className="listener-time">
          {new Date(msg.createdAt).toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
          })}
        </div>
      </div>
      
      <div className="listener-body-container">
        <h3 className="listener-title">
          {msg.title}
        </h3>
        <p className="listener-body-text">
          {msg.body}
        </p>
      </div>
      
      {(msg.links.length > 0 || isUnread) && (
        <div className="listener-footer">
          <div className="listener-links">
            {msg.links.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="listener-link"
              >
                {link.label} ↗
              </a>
            ))}
          </div>
          {isUnread && (
            <button
              type="button"
              className="run-cancel-btn-dismiss"
              onClick={onAck}
              disabled={isAcking}
              style={{ minHeight: '32px', padding: 'var(--space-1) var(--space-2)' }}
            >
              {isAcking ? 'Marking...' : 'Mark read'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}