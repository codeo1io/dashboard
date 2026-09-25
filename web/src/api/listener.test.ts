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
    it('reports session-expired when the fetch follows a redirect to the login surface', async () => {
      // A real Response cannot have `redirected` set manually — emulate the
      // post-redirect shape the browser produces when the session cookie
      // expired and the server bounced the API call to the login page.
      const redirectedResponse = {
        ok: true,
        redirected: true,
        url: 'http://localhost/auth/login',
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON')
        },
      } as unknown as Response
      vi.mocked(fetch).mockResolvedValueOnce(redirectedResponse)
      const res = await fetchListenerMessages()
      expect(res).toEqual({ ok: false, reason: 'session-expired' })
    })

    it("returns 'timeout' when the caller's abort signal fires (branch armed by the view's FETCH_TIMEOUT_MS)", async () => {
      // rm-224c regression: the AbortSignal was previously constructed but
      // never aborted, making this branch dead code.
      vi.mocked(fetch).mockImplementationOnce((_input: RequestInfo | URL, init?: RequestInit) => {
        const signal = init?.signal ?? undefined
        return new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'))
          })
        }) as Promise<Response>
      })
      const controller = new AbortController()
      const pending = fetchListenerMessages({ abortSignal: controller.signal })
      await Promise.resolve() // let the fetch's abort listener attach
      controller.abort()
      await expect(pending).resolves.toEqual({ ok: false, reason: 'timeout' })
    })

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

    it('handles network error', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'))
      const res = await fetchListenerMessages()
      expect(res).toEqual({ ok: false, reason: 'network' })
    })

    it('handles non-ok status', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('error', { status: 500 }))
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
  })

  describe('ackAllListenerMessages', () => {
    it('returns true on 202', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 202 }))
      const res = await ackAllListenerMessages()
      expect(res).toBe(true)
      expect(fetch).toHaveBeenCalledWith('/api/listener/ack-all', expect.objectContaining({ method: 'POST' }))
    })
  })
})