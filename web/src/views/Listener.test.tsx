import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { ListenerChannel } from './Listener.tsx'
import * as listenerApi from '../api/listener.ts'
import { LISTENER_FETCH_TIMEOUT_MS, POLL_INTERVAL_MS } from './Listener.tsx'

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
})
