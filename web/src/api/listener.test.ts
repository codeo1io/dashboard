import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchListenerMessages, ackListenerMessage, ackAllListenerMessages } from './listener.ts'

describe('listener API', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('fetchListenerMessages', () => {
    it('returns messages on success', async () => {
      const mockData = {
        messages: [
          {
            id: '1',
            source: 'infra',
            kind: 'deploy-health',
            severity: 'warning',
            title: 'Test',
            body: 'body',
            createdAt: '2026-07-11T12:00:00Z',
            receivedAt: '2026-07-11T12:00:01Z',
            read: false,
            links: [{ label: 'View', url: 'https://example.com' }]
          }
        ],
        unreadCount: 1
      }

      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(mockData), { status: 200 }))

      const res = await fetchListenerMessages()
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.data.messages).toHaveLength(1)
        expect(res.data.unreadCount).toBe(1)
        expect(res.data.messages[0]?.title).toBe('Test')
      }
    })

    it('handles query parameters', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ messages: [], unreadCount: 0 }), { status: 200 }))
      await fetchListenerMessages({ unreadOnly: true, limit: 50 })

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('unreadOnly=true'),
        expect.any(Object)
      )
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=50'),
        expect.any(Object)
      )
    })

    it('fails closed on contract drift (invalid root shape)', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ bad: 'shape' }), { status: 200 }))
      const res = await fetchListenerMessages()
      expect(res).toEqual({ ok: false, reason: 'contract-drift' })
    })

    it('skips malformed items but keeps valid ones', async () => {
      const mockData = {
        messages: [
          { bad: 'item' },
          {
            id: '2',
            source: 'agent',
            kind: 'report',
            severity: 'info',
            title: 'Valid',
            body: 'body',
            createdAt: '2026-07-11T12:00:00Z',
            receivedAt: '2026-07-11T12:00:01Z',
            read: true,
            links: []
          }
        ],
        unreadCount: 0
      }

      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(mockData), { status: 200 }))
      const res = await fetchListenerMessages()
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.data.messages).toHaveLength(1)
        expect(res.data.messages[0]?.id).toBe('2')
      }
    })

    it('handles timeout/abort', async () => {
      const abortError = new DOMException('Aborted', 'AbortError')
      vi.mocked(fetch).mockRejectedValueOnce(abortError)
      const res = await fetchListenerMessages()
      expect(res).toEqual({ ok: false, reason: 'timeout' })
    })

    it('maps AbortSignal.timeout rejection (TimeoutError) to timeout — rm-184', async () => {
      // AbortSignal.timeout() rejects with a DOMException named 'TimeoutError',
      // not 'AbortError'; the poll budget relies on this mapping.
      vi.mocked(fetch).mockRejectedValueOnce(new DOMException('Signal timed out', 'TimeoutError'))
      const res = await fetchListenerMessages()
      expect(res).toEqual({ ok: false, reason: 'timeout' })
    })

    it('maps 401 to auth — rm-184', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }))
      const res = await fetchListenerMessages()
      expect(res).toEqual({ ok: false, reason: 'auth' })
    })

    it('maps 429 to rate-limit — rm-184', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('slow down', { status: 429 }))
      const res = await fetchListenerMessages()
      expect(res).toEqual({ ok: false, reason: 'rate-limit' })
    })

    it('maps 500 to network — rm-184', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('error', { status: 500 }))
      const res = await fetchListenerMessages()
      expect(res).toEqual({ ok: false, reason: 'network' })
    })

    it('handles network error', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'))
      const res = await fetchListenerMessages()
      expect(res).toEqual({ ok: false, reason: 'network' })
    })

    it('handles non-ok status', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('error', { status: 502 }))
      const res = await fetchListenerMessages()
      expect(res).toEqual({ ok: false, reason: 'network' })
    })
  })

  describe('ackListenerMessage', () => {
    it('returns true on 202', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 202 }))
      const res = await ackListenerMessage('test-id')
      expect(res).toBe(true)
      expect(fetch).toHaveBeenCalledWith('/api/listener/messages/test-id/ack', expect.objectContaining({ method: 'POST' }))
    })

    it('returns false on other statuses', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 404 }))
      const res = await ackListenerMessage('test-id')
      expect(res).toBe(false)
    })

    it('defaults a timeout signal when none is passed — rm-184', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 202 }))
      await ackListenerMessage('test-id')
      const init = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit
      expect(init.signal).toBeInstanceOf(AbortSignal)
    })

    it('honors a caller-provided signal — rm-184', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 202 }))
      const controller = new AbortController()
      await ackListenerMessage('test-id', { abortSignal: controller.signal })
      const init = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit
      expect(init.signal).toBe(controller.signal)
    })
  })

  describe('ackAllListenerMessages', () => {
    it('returns true on 202', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 202 }))
      const res = await ackAllListenerMessages()
      expect(res).toBe(true)
      expect(fetch).toHaveBeenCalledWith('/api/listener/ack-all', expect.objectContaining({ method: 'POST' }))
    })

    it('defaults a timeout signal when none is passed — rm-184', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 202 }))
      await ackAllListenerMessages()
      const init = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit
      expect(init.signal).toBeInstanceOf(AbortSignal)
    })
  })
})