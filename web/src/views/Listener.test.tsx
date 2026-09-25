import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { ListenerChannel } from './Listener.tsx'
import * as listenerApi from '../api/listener.ts'

vi.mock('../api/listener.ts')

describe('ListenerChannel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(listenerApi.fetchListenerMessages).mockResolvedValue({
      ok: true,
      data: { messages: [], unreadCount: 0 }
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
        unreadCount: 1
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
      data: { messages: [], unreadCount: 0 }
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
        unreadCount: 1
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
        unreadCount: 0
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
        unreadCount: 1
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
      data: { messages: [], unreadCount: 0 }
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
      data: { messages: [], unreadCount: 0 }
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

  it('rm-224c: a hung list fetch holds the poll guard — overlapping triggers do not stack requests', async () => {
    // The initial load never resolves. Focus-triggered reloads must be dropped
    // while the in-flight guard is held — without it every focus event stacks
    // another fetch. The FETCH_TIMEOUT_MS wiring keeps this hold bounded: a
    // wedged fetch aborts after 10s, releasing the guard (armed at :36).
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
})