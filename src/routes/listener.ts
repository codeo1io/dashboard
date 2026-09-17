/**
 * Operator listener channel routes.
 *
 * See docs/contracts/operator-listener-channel.md — mounted at `/api/listener`
 * by server.ts. `/ingest` is HMAC-gated and public-before-session; `/messages*`
 * and `/ack-all` sit behind the operator session (server.ts auth middleware).
 */
import type {ListenerStore} from '../listener/store.ts'

import {Hono} from 'hono'
import {parseIngestBody} from '../listener/contract.ts'
import {verifyIngestSignature} from '../listener/ingest-auth.ts'

const MAX_INGEST_BODY_BYTES = 16384

/**
 * Reads at most `maxBytes` of the request body, returning null when the cap is
 * exceeded — never buffering an unbounded attacker-controlled stream.
 *
 * Defense in depth against a memory-DoS on the unauthenticated ingest route:
 * 1. A declared Content-Length above the cap is rejected before a single byte
 *    is read from the wire.
 * 2. An undeclared (chunked) body is read incrementally; the reader is
 *    cancelled as soon as the running total crosses the cap, so at most one
 *    chunk beyond the limit is ever pulled.
 *
 * The cap is on wire bytes (UTF-8 octets), matching the previous
 * Buffer.byteLength semantics for well-formed payloads.
 */
/**
 * Minimal shape of ReadableStreamDefaultReader.read() — the DOM global type
 * is not resolvable in this TS lib configuration.
 */
type ChunkResult = {readonly done: true} | {readonly done: false; readonly value: Uint8Array}

async function readBodyCapped(req: Request, maxBytes: number): Promise<string | null> {
  const contentLength = req.headers.get('content-length')
  if (contentLength !== null) {
    const declared = Number.parseInt(contentLength, 10)
    if (Number.isFinite(declared) && declared > maxBytes) return null
  }

  const body = req.body
  if (body === null) return ''

  const reader = body.getReader()
  const decoder = new TextDecoder()
  let received = 0
  let text = ''
  for (;;) {
    const result = (await reader.read()) as ChunkResult
    if (result.done) break
    const value = result.value
    received += value.byteLength
    if (received > maxBytes) {
      await reader.cancel().catch(() => undefined)
      return null
    }
    text += decoder.decode(value, {stream: true})
  }
  return text + decoder.decode()
}

export interface ListenerRouterDeps {
  readonly store: ListenerStore
  readonly ingestKey: string | null
}

export function buildListenerRouter(deps: ListenerRouterDeps): Hono {
  const router = new Hono()

  router.post('/ingest', async c => {
    if (deps.ingestKey === null) {
      return c.notFound()
    }

    const rawBody = await readBodyCapped(c.req.raw, MAX_INGEST_BODY_BYTES)
    if (rawBody === null) {
      return c.json({error: 'payload too large'}, 413)
    }

    const authResult = verifyIngestSignature({
      key: deps.ingestKey,
      rawBody,
      timestampHeader: c.req.header('x-listener-timestamp') ?? null,
      signatureHeader: c.req.header('x-listener-signature') ?? null,
      nowSeconds: Math.floor(Date.now() / 1000),
    })
    if (!authResult.success) {
      return c.json({error: 'unauthorized'}, 401)
    }

    let parsedJson: unknown
    try {
      parsedJson = JSON.parse(rawBody)
    } catch {
      return c.json({error: 'invalid request body'}, 400)
    }

    const parseResult = parseIngestBody(parsedJson)
    if (!parseResult.success) {
      return c.json({error: parseResult.error.message}, 400)
    }

    const {id, receivedAt} = deps.store.insert(parseResult.data)
    return c.json({id, receivedAt}, 202)
  })

  router.get('/messages', c => {
    const unreadOnly = c.req.query('unreadOnly') === 'true'
    const rawLimit = c.req.query('limit')
    const limit = rawLimit === undefined ? undefined : Number.parseInt(rawLimit, 10)

    const response = deps.store.list({
      unreadOnly,
      limit: limit !== undefined && Number.isFinite(limit) ? limit : undefined,
    })
    return c.json(response, 200)
  })

  router.post('/messages/:id/ack', c => {
    const id = c.req.param('id')
    const result = deps.store.ack(id)
    if (!result.acked) {
      return c.json({error: 'not found'}, 404)
    }
    return c.json({id, readAt: result.readAt}, 202)
  })

  router.post('/ack-all', c => {
    const acked = deps.store.ackAll()
    return c.json({acked}, 202)
  })

  return router
}
