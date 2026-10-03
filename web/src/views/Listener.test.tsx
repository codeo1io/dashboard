import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { ListenerChannel } from './Listener.tsx'
import * as listenerApi from '../api/listener.ts'
import type { ListenerMessage } from '../api/listener.ts'
import { LISTENER_FETCH_TIMEOUT_MS, POLL_INTERVAL_MS, orderListenerMessages, listenerAgeBucket } from './Listener.tsx'

vi.mock('../api/listener.ts')

describe('ListenerChannel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(listenerApi.fetchListenerMessages).mockResolvedValue({
      ok: true,
      data: { messages: [], unreadCount: 0, prunedCount: 0, droppedCount: 0 }
    })
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders loading state initially and then ready state', async () => {
    const mockMessages = {
      ok: true,
      data: {
        messages: [
          {
            id: 'msg-1',
            source: 'infra' as const,
            kind: 'deploy-health',
            severity: 'warning' as const,
            title: 'Gateway issue',
            body: 'Body text',
            createdAt: '2026-07-11T12:00:00Z',
            receivedAt: '2026-07-11T12:00:01Z',
            read: false,
            links: [{ label: 'Log', url: 'https://example.com' }]
          }
        ],
        unreadCount: 1, prunedCount: 0, droppedCount: 0
      }
    } as const

    vi.mocked(listenerApi.fetchListenerMessages).mockResolvedValueOnce(mockMessages)

    render(<ListenerChannel />)
    
    expect(screen.getByTestId('listener-loading')).toBeInTheDocument()
    
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(screen.getByTestId('listener-list')).toBeInTheDocument()
    expect(screen.getByText('Gateway issue')).toBeInTheDocument()
    expect(screen.getByText('Body text')).toBeInTheDocument()
    expect(screen.getByText('Log ↗')).toHaveAttribute('href', 'https://example.com')
  })

  it('renders empty state', async () => {
    vi.mocked(listenerApi.fetchListenerMessages).mockResolvedValueOnce({
      ok: true,
      data: { messages: [], unreadCount: 0, prunedCount: 0, droppedCount: 0 }
    })

    render(<ListenerChannel />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(screen.getByTestId('listener-empty')).toBeInTheDocument()
    expect(screen.getByText('Inbox Zero')).toBeInTheDocument()
  })

  it('renders error state', async () => {
    vi.mocked(listenerApi.fetchListenerMessages).mockResolvedValueOnce({
      ok: false,
      reason: 'network'
    })

    render(<ListenerChannel />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(screen.getByTestId('listener-error')).toBeInTheDocument()
    expect(screen.getByText(/Failed to load messages/)).toBeInTheDocument()
  })

  it('rm-273: renders the auth-expired affordance on 401 instead of the network error', async () => {
    vi.mocked(listenerApi.fetchListenerMessages).mockResolvedValueOnce({
      ok: false,
      reason: 'unauthenticated'
    })

    render(<ListenerChannel />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(screen.getByTestId('listener-auth-expired')).toBeInTheDocument()
    expect(screen.getByText(/Session expired/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/auth/login')
    // The network-error retry copy must NOT be shown for session expiry.
    expect(screen.queryByTestId('listener-error')).not.toBeInTheDocument()
  })

  it('calls ack API when "Mark read" is clicked', async () => {
    const mockMessages = {
      ok: true,
      data: {
        messages: [
          {
            id: 'msg-1',
            source: 'infra' as const,
            kind: 'deploy-health',
            severity: 'warning' as const,
            title: 'Gateway issue',
            body: 'Body text',
            createdAt: '2026-07-11T12:00:00Z',
            receivedAt: '2026-07-11T12:00:01Z',
            read: false,
            links: []
          }
        ],
        unreadCount: 1, prunedCount: 0, droppedCount: 0
      }
    } as const

    vi.mocked(listenerApi.fetchListenerMessages).mockResolvedValueOnce(mockMessages)
    vi.mocked(listenerApi.ackListenerMessage).mockResolvedValueOnce(true)

    render(<ListenerChannel />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    const ackBtn = screen.getByText('Mark read')
    
    // Setup fetch mock for the refresh call after ack
    vi.mocked(listenerApi.fetchListenerMessages).mockResolvedValueOnce({
      ok: true,
      data: {
        messages: [{ ...mockMessages.data.messages[0], read: true }],
        unreadCount: 0, prunedCount: 0, droppedCount: 0
      }
    })

    vi.mocked(listenerApi.fetchListenerMessages).mockClear()

    await act(async () => {
      fireEvent.click(ackBtn)
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(listenerApi.ackListenerMessage).toHaveBeenCalledWith('msg-1')
    expect(listenerApi.fetchListenerMessages).toHaveBeenCalled() // at least once
  })

  it('calls ackAll API when "Mark all read" is clicked', async () => {
    const mockMessages = {
      ok: true,
      data: {
        messages: [
          {
            id: 'msg-1',
            source: 'infra' as const,
            kind: 'deploy-health',
            severity: 'warning' as const,
            title: 'Gateway issue',
            body: 'Body',
            createdAt: '2026-07-11T12:00:00Z',
            receivedAt: '2026-07-11T12:00:01Z',
            read: false,
            links: []
          }
        ],
        unreadCount: 1, prunedCount: 0, droppedCount: 0
      }
    } as const

    vi.mocked(listenerApi.fetchListenerMessages).mockResolvedValueOnce(mockMessages)
    vi.mocked(listenerApi.ackAllListenerMessages).mockResolvedValueOnce(true)

    render(<ListenerChannel />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    const ackAllBtn = screen.getByText('Mark all read')
    
    vi.mocked(listenerApi.fetchListenerMessages).mockResolvedValueOnce({
      ok: true,
      data: { messages: [], unreadCount: 0, prunedCount: 0, droppedCount: 0 }
    })

    await act(async () => {
      fireEvent.click(ackAllBtn)
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(listenerApi.ackAllListenerMessages).toHaveBeenCalled()
  })

  it('polls on interval', async () => {
    vi.mocked(listenerApi.fetchListenerMessages).mockResolvedValue({
      ok: true,
      data: { messages: [], unreadCount: 0, prunedCount: 0, droppedCount: 0 }
    })

    render(<ListenerChannel />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    vi.mocked(listenerApi.fetchListenerMessages).mockClear()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000)
    })

    expect(listenerApi.fetchListenerMessages).toHaveBeenCalled() // at least once
  })

  it('rm-243: shows the contract-drift notice when the client drops a malformed message', async () => {
    vi.mocked(listenerApi.fetchListenerMessages).mockResolvedValueOnce({
      ok: true,
      data: {
        messages: [
          {
            id: 'msg-1',
            source: 'infra' as const,
            kind: 'deploy-health',
            severity: 'warning' as const,
            title: 'Valid message',
            body: 'Body',
            createdAt: '2026-07-11T12:00:00Z',
            receivedAt: '2026-07-11T12:00:01Z',
            read: false,
            links: []
          }
        ],
        unreadCount: 1, prunedCount: 0, droppedCount: 2
      }
    })

    render(<ListenerChannel />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(screen.getByTestId('listener-drift-notice')).toHaveTextContent('2 messages were skipped')
    expect(screen.getByTestId('listener-drift-notice')).toHaveTextContent('contract drift')
  })

  it('rm-244: shows the retention notice when the server reports pruned rows', async () => {
    vi.mocked(listenerApi.fetchListenerMessages).mockResolvedValueOnce({
      ok: true,
      data: { messages: [], unreadCount: 0, prunedCount: 7, droppedCount: 0 }
    })

    render(<ListenerChannel />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(screen.getByTestId('listener-pruned-notice')).toHaveTextContent('7 older messages removed')
    expect(screen.getByTestId('listener-pruned-notice')).toHaveTextContent('retention (500')
  })

  // rm-155 regressions: the poll latch must release even when the transport
  // never settles, and the in-flight request must be aborted on unmount.
  describe('rm-155 poll hygiene', () => {
    it('releases the poll latch when a fetch hangs past the timeout, then polls again', async () => {
      vi.mocked(listenerApi.fetchListenerMessages).mockImplementation(
        () => new Promise(() => {}) as ReturnType<typeof listenerApi.fetchListenerMessages>
      )
      vi.mocked(listenerApi.fetchListenerMessages).mockClear()

      const { unmount } = render(<ListenerChannel />)

      // Initial poll starts and hangs.
      await act(async () => { await vi.advanceTimersByTimeAsync(10) })
      expect(vi.mocked(listenerApi.fetchListenerMessages).mock.calls.length).toBe(1)

      // Timeout fires: the race settles with the timeout result, the latch is
      // released, and the error view appears ("Will retry").
      await act(async () => { await vi.advanceTimersByTimeAsync(LISTENER_FETCH_TIMEOUT_MS) })
      expect(screen.getByTestId('listener-error')).toBeInTheDocument()

      // No fetch retry before the next interval tick.
      vi.mocked(listenerApi.fetchListenerMessages).mockClear()
      expect(vi.mocked(listenerApi.fetchListenerMessages).mock.calls.length).toBe(0)

      // Next 30s interval tick: the latch is free, so the poll fires again.
      await act(async () => { await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS) })
      expect(vi.mocked(listenerApi.fetchListenerMessages).mock.calls.length).toBe(1)

      unmount()
    })

    it('aborts the in-flight fetch when the view unmounts', async () => {
      let capturedSignal: AbortSignal | undefined
      vi.mocked(listenerApi.fetchListenerMessages).mockImplementation((req) => {
        capturedSignal = req?.abortSignal
        return new Promise(() => {}) as ReturnType<typeof listenerApi.fetchListenerMessages>
      })

      const { unmount } = render(<ListenerChannel />)
      await act(async () => { await vi.advanceTimersByTimeAsync(10) })
      expect(capturedSignal).toBeDefined()
      expect(capturedSignal!.aborted).toBe(false)

      unmount()
      expect(capturedSignal!.aborted).toBe(true)
    })
  })

  // rm-421c: the in-flight guard must also cover focus-triggered reloads — a
  // hung list fetch holds the poll latch, so overlapping triggers do not stack
  // requests. Since rm-251 the guard lives in useBoundedPoll; the hold stays
  // bounded because LISTENER_FETCH_TIMEOUT_MS aborts a wedged fetch.
  it('rm-421c: a hung list fetch holds the poll guard — overlapping triggers do not stack requests', async () => {
    let resolveFetch: (v: Awaited<ReturnType<typeof listenerApi.fetchListenerMessages>>) => void = () => {}
    const hang = new Promise<Awaited<ReturnType<typeof listenerApi.fetchListenerMessages>>>(resolve => {
      resolveFetch = resolve
    })
    vi.mocked(listenerApi.fetchListenerMessages).mockImplementationOnce(() => hang)
    // The module mock is shared across every test in this file — isolate the
    // call count to this test's own invocations (mockClear keeps the queued
    // once-implementation; it only resets recorded calls).
    vi.mocked(listenerApi.fetchListenerMessages).mockClear()

    render(<ListenerChannel />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })
    expect(listenerApi.fetchListenerMessages).toHaveBeenCalledTimes(1) // mount poll, hung

    // Focus while hung: dropped by the guard.
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await Promise.resolve()
    })
    expect(listenerApi.fetchListenerMessages).toHaveBeenCalledTimes(1)

    // Settle the hung fetch; the guard releases and the next focus polls again.
    await act(async () => {
      resolveFetch({ ok: false, reason: 'network' })
      await Promise.resolve()
      await Promise.resolve()
    })
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await Promise.resolve()
    })
    expect(listenerApi.fetchListenerMessages).toHaveBeenCalledTimes(2)
  })

  // rm-194: attention ordering + age bucketing — pure helpers first, then render invariants.
  const msg = (overrides: Partial<ListenerMessage>): ListenerMessage => ({
    id: 'm',
    source: 'infra',
    kind: 'approval',
    severity: 'info',
    title: 't',
    body: 'b',
    createdAt: '2026-07-11T12:00:00Z',
    receivedAt: '2026-07-11T12:00:01Z',
    read: false,
    links: [],
    ...overrides,
  })

  it('orderListenerMessages: unread first, newest first within each group, deterministic ties', () => {
    const unreadOld = msg({id: 'b', read: false, createdAt: '2026-07-10T00:00:00Z'})
    const unreadNew = msg({id: 'c', read: false, createdAt: '2026-07-11T00:00:00Z'})
    const readNewest = msg({id: 'a', read: true, createdAt: '2026-07-12T00:00:00Z'})
    const readOld = msg({id: 'd', read: true, createdAt: '2026-07-01T00:00:00Z'})

    const ordered = orderListenerMessages([readNewest, readOld, unreadOld, unreadNew])

    expect(ordered.map(m => m.id)).toEqual(['c', 'b', 'a', 'd']) // unread newest, unread oldest, then read by age desc
  })

  it('orderListenerMessages: equal read+createdAt falls back to id; unknown dates sort last in group; empty and single lists pass through', () => {
    const tieA = msg({id: 'a', read: false, createdAt: '2026-07-11T00:00:00Z'})
    const tieB = msg({id: 'b', read: false, createdAt: '2026-07-11T00:00:00Z'})
    const badDate = msg({id: 'z', read: false, createdAt: 'not-a-date'})

    expect(orderListenerMessages([badDate, tieB, tieA]).map(m => m.id)).toEqual(['a', 'b', 'z'])
    expect(orderListenerMessages([])).toEqual([])
    expect(orderListenerMessages([tieA]).map(m => m.id)).toEqual(['a'])
  })

  it('listenerAgeBucket: 24h/72h boundaries, future timestamps clamp to fresh, invalid dates are unknown', () => {
    const now = Date.parse('2026-07-12T12:00:00Z')
    expect(listenerAgeBucket('2026-07-12T11:00:00Z', now)).toBe('fresh') // 1h old
    expect(listenerAgeBucket('2026-07-11T12:00:01Z', now)).toBe('fresh') // exactly under 24h
    expect(listenerAgeBucket('2026-07-11T11:59:00Z', now)).toBe('aging') // just over 24h
    expect(listenerAgeBucket('2026-07-09T12:00:01Z', now)).toBe('aging') // just under 72h
    expect(listenerAgeBucket('2026-07-09T11:59:00Z', now)).toBe('stale') // just over 72h
    expect(listenerAgeBucket('2026-07-13T00:00:00Z', now)).toBe('fresh') // clock skew: future clamps to fresh
    expect(listenerAgeBucket('not-a-date', now)).toBe('unknown')
  })

  it('renders the feed ordered: unread newest first, stale read items last, with age badges', async () => {
    const hours = (h: number) => new Date(Date.now() - h * 3600_000).toISOString()
    const unreadNew = msg({id: 'm1', read: false, title: 'unread new approval', createdAt: hours(2)})
    const unreadStale = msg({id: 'm2', read: false, title: 'unread stale approval', createdAt: hours(80)})
    const readNew = msg({id: 'm3', read: true, title: 'read recent', createdAt: hours(1)})

    vi.mocked(listenerApi.fetchListenerMessages).mockResolvedValueOnce({
      ok: true,
      data: {
        // Server order deliberately scrambles the expected attention order.
        messages: [readNew, unreadStale, unreadNew],
        unreadCount: 2, prunedCount: 0, droppedCount: 0,
      },
    })

    render(<ListenerChannel />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    const cards = screen.getAllByTestId('listener-message-card')
    expect(cards).toHaveLength(3)
    expect(cards[0]).toHaveTextContent('unread new approval')
    expect(cards[1]).toHaveTextContent('unread stale approval') // unread beats age even when stale
    expect(cards[2]).toHaveTextContent('read recent') // read never outranks unread, regardless of age

    const badges = screen.getAllByTestId('listener-age-bucket')
    expect(badges[0]).toHaveAttribute('aria-label', 'Age: fresh')
    expect(badges[0]).toHaveTextContent('new')
    expect(badges[1]).toHaveAttribute('aria-label', 'Age: stale')
    expect(badges[2]).toHaveAttribute('aria-label', 'Age: fresh')
  })

  it('poll refresh that appends a new message preserves the ordering invariant', async () => {
    const hours = (h: number) => new Date(Date.now() - h * 3600_000).toISOString()
    const staleUnread = msg({id: 'm1', read: false, title: 'old pending approval', createdAt: hours(80)})
    const freshRead = msg({id: 'm2', read: true, title: 'read yesterday', createdAt: hours(30)})

    vi.mocked(listenerApi.fetchListenerMessages).mockResolvedValueOnce({
      ok: true,
      data: { messages: [freshRead, staleUnread], unreadCount: 1, prunedCount: 0, droppedCount: 0 },
    })
    render(<ListenerChannel />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })
    expect(screen.getAllByTestId('listener-message-card')[0]).toHaveTextContent('old pending approval')

    // Next poll: server appends a brand-new unread approval at the END of its list.
    const justArrived = msg({id: 'm3', read: false, title: 'approval just landed', createdAt: hours(0.1)})
    vi.mocked(listenerApi.fetchListenerMessages).mockResolvedValueOnce({
      ok: true,
      data: { messages: [freshRead, staleUnread, justArrived], unreadCount: 2, prunedCount: 0, droppedCount: 0 },
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    })

    const cards = screen.getAllByTestId('listener-message-card')
    expect(cards.map(c => c.textContent)).toEqual([
      expect.stringContaining('approval just landed'),
      expect.stringContaining('old pending approval'),
      expect.stringContaining('read yesterday'),
    ])
  })
})
