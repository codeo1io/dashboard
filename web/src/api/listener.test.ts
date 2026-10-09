import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchListenerMessages, ackListenerMessage, ackAllListenerMessages, ACK_FETCH_TIMEOUT_MS } from './listener.ts'

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

    describe('rm-790: malformed-JSON 2xx classification (drift, not network)', () => {
      it('a 200 whose body is not valid JSON → contract-drift', async () => {
        // An intercepting proxy or wrong-route handler answering 200 with an
        // HTML page: res.json() throws and the pre-rm-790 code blamed the
        // network, routing a contract regression through the retry channel.
        vi.mocked(fetch).mockResolvedValueOnce(
          new Response('<html>interception page</html>', { status: 200, headers: { 'content-type': 'text/html' } }),
        )
        const res = await fetchListenerMessages()
        expect(res).toEqual({ ok: false, reason: 'contract-drift' })
      })

      it('a 200 with a valid body still parses (classification regression guard)', async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
          new Response(JSON.stringify({ messages: [], unreadCount: 0 }), { status: 200 }),
        )
        const res = await fetchListenerMessages()
        expect(res.ok).toBe(true)
      })

      it('a client-side abort DURING the body read stays timeout, not drift', async () => {
        // The inner try/catch around res.json() must not swallow the caller's
        // AbortError into the drift branch.
        const abortingBody = {
          ok: true,
          redirected: false,
          json: async () => {
            throw new DOMException('Aborted', 'AbortError')
          },
        } as unknown as Response
        vi.mocked(fetch).mockResolvedValueOnce(abortingBody)
        const res = await fetchListenerMessages()
        expect(res).toEqual({ ok: false, reason: 'timeout' })
      })
    })

    describe('rm-215: delivery-evidence fields on parsed messages', () => {
      const baseMessage = {
        id: 'ev-1',
        source: 'infra',
        kind: 'deploy-health',
        severity: 'warning',
        title: 'Evidence',
        body: 'body',
        createdAt: '2026-10-09T00:00:00Z',
        receivedAt: '2026-10-09T00:00:01Z',
        read: false,
        links: [],
      }

      it('carries ingestVariant/rawDigest through the parse (golden round-trip shape)', async () => {
        const digest = 'a'.repeat(64)
        vi.mocked(fetch).mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              messages: [{ ...baseMessage, ingestVariant: 'hmac-sha256-v1', rawDigest: digest }],
              unreadCount: 1,
            }),
            { status: 200 },
          ),
        )
        const res = await fetchListenerMessages()
        expect(res.ok).toBe(true)
        if (res.ok) {
          expect(res.data.messages[0]?.ingestVariant).toBe('hmac-sha256-v1')
          expect(res.data.messages[0]?.rawDigest).toBe(digest)
          expect(res.data.droppedCount).toBe(0)
        }
      })

      it('absent evidence fields (older server) are tolerated and normalized to null', async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
          new Response(JSON.stringify({ messages: [baseMessage], unreadCount: 1 }), { status: 200 }),
        )
        const res = await fetchListenerMessages()
        expect(res.ok).toBe(true)
        if (res.ok) {
          expect(res.data.messages[0]?.ingestVariant).toBeNull()
          expect(res.data.messages[0]?.rawDigest).toBeNull()
        }
      })

      it('a wrong-typed evidence field is a counted drop, not a silent pass-through', async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
          new Response(
            JSON.stringify({ messages: [{ ...baseMessage, ingestVariant: 42 }], unreadCount: 1 }),
            { status: 200 },
          ),
        )
        const res = await fetchListenerMessages()
        expect(res.ok).toBe(true)
        if (res.ok) {
          expect(res.data.messages).toHaveLength(0)
          expect(res.data.droppedCount).toBe(1)
        }
      })
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
  })

  describe('rm-501: bounded ack-trio fetches', () => {
    it('ackListenerMessage settles false when the CSRF GET never resolves (no POST attempted — fails closed)', async () => {
      vi.useFakeTimers()
      try {
        vi.mocked(fetch).mockImplementation(() => new Promise(() => {}))
        const promise = ackListenerMessage('msg-1')
        await vi.advanceTimersByTimeAsync(ACK_FETCH_TIMEOUT_MS + 1)
        await expect(promise).resolves.toBe(false)
        // fail closed: the never-settling CSRF fetch means the POST never happened
        expect(fetch).toHaveBeenCalledTimes(1)
        expect(fetch).toHaveBeenCalledWith('/api/listener/csrf', expect.anything())
      } finally {
        vi.useRealTimers()
      }
    })

    it('ackListenerMessage settles false when the ack POST never resolves (CSRF ok)', async () => {
      vi.useFakeTimers()
      try {
        vi.mocked(fetch)
          .mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: 'tok' }), { status: 200 }))
          .mockImplementation(() => new Promise(() => {}))
        const promise = ackListenerMessage('msg-1')
        await vi.advanceTimersByTimeAsync(ACK_FETCH_TIMEOUT_MS + 1)
        await expect(promise).resolves.toBe(false)
        expect(fetch).toHaveBeenCalledTimes(2)
      } finally {
        vi.useRealTimers()
      }
    })

    it('ackAllListenerMessages settles false when the ack-all POST never resolves', async () => {
      vi.useFakeTimers()
      try {
        vi.mocked(fetch)
          .mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: 'tok' }), { status: 200 }))
          .mockImplementation(() => new Promise(() => {}))
        const promise = ackAllListenerMessages()
        await vi.advanceTimersByTimeAsync(ACK_FETCH_TIMEOUT_MS + 1)
        await expect(promise).resolves.toBe(false)
        expect(fetch).toHaveBeenCalledTimes(2)
      } finally {
        vi.useRealTimers()
      }
    })

    it('a CSRF response whose body read never resolves settles false (the bound covers the stream, not just the request)', async () => {
      vi.useFakeTimers()
      try {
        vi.mocked(fetch).mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () => new Promise<unknown>(() => {}),
          } as unknown as Response),
        )
        const promise = ackListenerMessage('msg-1')
        await vi.advanceTimersByTimeAsync(ACK_FETCH_TIMEOUT_MS + 1)
        await expect(promise).resolves.toBe(false)
        expect(fetch).toHaveBeenCalledTimes(1)
      } finally {
        vi.useRealTimers()
      }
    })

    it('a rejected ack POST settles false instead of surfacing an unhandled rejection', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: 'tok' }), { status: 200 }))
        .mockRejectedValueOnce(new TypeError('network went away'))
      await expect(ackListenerMessage('msg-1')).resolves.toBe(false)
    })
  })
})