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
    it("reports unauthenticated when the fetch follows a redirect to the login surface (session expiry)", async () => {
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
      expect(res).toEqual({ ok: false, reason: 'unauthenticated' })
    })

    it("returns 'timeout' when the caller's abort signal fires (branch armed by the view's FETCH_TIMEOUT_MS)", async () => {
      // rm-421c regression: the AbortSignal was previously constructed but
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
        // rm-243: the dropped item is counted, not silently ignored.
        expect(res.data.droppedCount).toBe(1)
        // rm-244: absent prunedCount tolerates an older server → 0.
        expect(res.data.prunedCount).toBe(0)
      }
    })

    it('rm-244/rm-243: surfaces server prunedCount alongside client droppedCount', async () => {
      const mockData = {
        messages: [],
        unreadCount: 3,
        prunedCount: 42
      }

      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(mockData), { status: 200 }))
      const res = await fetchListenerMessages()
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.data.prunedCount).toBe(42)
        expect(res.data.droppedCount).toBe(0)
        expect(res.data.unreadCount).toBe(3)
      }
    })

    it('handles timeout/abort', async () => {
      const abortError = new DOMException('Aborted', 'AbortError')
      vi.mocked(fetch).mockRejectedValueOnce(abortError)
      const res = await fetchListenerMessages()
      expect(res).toEqual({ ok: false, reason: 'timeout' })
    })

    it("rm-1487: AbortSignal.timeout rejections (TimeoutError) classify 'timeout', not 'network'", async () => {
      // Latent-bug pin: the pre-rm-1487 catch matched only AbortError, so
      // every api-layer budget expiry was misfiled as a transport fault and
      // the timeout reason was unreachable for default-signal calls.
      vi.mocked(fetch).mockRejectedValueOnce(new DOMException('The operation was aborted due to timeout', 'TimeoutError'))
      const res = await fetchListenerMessages()
      expect(res).toEqual({ ok: false, reason: 'timeout' })
    })

    it('rm-1487: 429 maps to rate-limited (the limiter answering, not a transport fault)', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('slow down', { status: 429 }))
      const res = await fetchListenerMessages()
      expect(res).toEqual({ ok: false, reason: 'rate-limited' })
    })

    it('rm-1487: bounds the GET with the api-layer default signal when the caller passes none', async () => {
      // Backstop under the view-layer 15s budget: a caller signal still
      // wins, but an un-signaled call must never hang past its budget.
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ messages: [], unreadCount: 0 }), { status: 200 }))
      await fetchListenerMessages()
      expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ signal: expect.any(AbortSignal) }))
    })

    it('rm-1487: honors a caller-provided signal over the api-layer default', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ messages: [], unreadCount: 0 }), { status: 200 }))
      const controller = new AbortController()
      await fetchListenerMessages({ abortSignal: controller.signal })
      expect(vi.mocked(fetch).mock.calls[0]?.[1]?.signal).toBe(controller.signal)
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

    it('rm-273: 401 maps to unauthenticated, not network (session expiry is not a transport failure)', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('unauthorized', { status: 401 }))
      const res = await fetchListenerMessages()
      expect(res).toEqual({ ok: false, reason: 'unauthenticated' })
    })
  })

  describe('ackListenerMessage', () => {
    it('returns true on 202, submitting the fetched CSRF token header', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: 'tok-abc' }), { status: 200 }))
      vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 202 }))
      const res = await ackListenerMessage('test-id')
      expect(res).toBe(true)
      expect(fetch).toHaveBeenCalledWith('/api/listener/csrf', expect.objectContaining({ method: 'GET' }))
      expect(fetch).toHaveBeenCalledWith('/api/listener/messages/test-id/ack', expect.objectContaining({
        method: 'POST',
        headers: { 'x-csrf-token': 'tok-abc' },
      }))
    })

    it('returns false on other statuses', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: 'tok-abc' }), { status: 200 }))
      vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 404 }))
      const res = await ackListenerMessage('test-id')
      expect(res).toBe(false)
    })

    it('fails closed without posting when the CSRF token fetch fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('error', { status: 500 }))
      const res = await ackListenerMessage('test-id')
      expect(res).toBe(false)
      expect(fetch).toHaveBeenCalledTimes(1)
    })

    it('fails closed on a contract-drift CSRF payload', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ bad: 'shape' }), { status: 200 }))
      const res = await ackListenerMessage('test-id')
      expect(res).toBe(false)
      expect(fetch).toHaveBeenCalledTimes(1)
    })

    it('rm-1487: both ack legs carry the api-layer default timeout signal (acks were fully unbounded)', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: 'tok-abc' }), { status: 200 }))
      vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 202 }))
      const res = await ackListenerMessage('test-id')
      expect(res).toBe(true)
      expect(fetch).toHaveBeenCalledWith('/api/listener/csrf', expect.objectContaining({ method: 'GET', signal: expect.any(AbortSignal) }))
      expect(fetch).toHaveBeenCalledWith('/api/listener/messages/test-id/ack', expect.objectContaining({ method: 'POST', signal: expect.any(AbortSignal) }))
    })
  })

  describe('ackAllListenerMessages', () => {
    it('returns true on 202, submitting the fetched CSRF token header', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: 'tok-xyz' }), { status: 200 }))
      vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 202 }))
      const res = await ackAllListenerMessages()
      expect(res).toBe(true)
      expect(fetch).toHaveBeenCalledWith('/api/listener/csrf', expect.objectContaining({ method: 'GET' }))
      expect(fetch).toHaveBeenCalledWith('/api/listener/ack-all', expect.objectContaining({
        method: 'POST',
        headers: { 'x-csrf-token': 'tok-xyz' },
      }))
    })

    it('rm-1487: the ack-all POST carries the api-layer default timeout signal too', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: 'tok-xyz' }), { status: 200 }))
      vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 202 }))
      await ackAllListenerMessages()
      expect(fetch).toHaveBeenCalledWith('/api/listener/ack-all', expect.objectContaining({ method: 'POST', signal: expect.any(AbortSignal) }))
    })
  })
})