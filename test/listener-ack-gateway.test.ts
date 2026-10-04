/**
 * rm-644: gateway-mode listener ack CSRF integration tests.
 *
 * The ack CSRF config binds in two forms now (routes/listener.ts):
 *  - static: Arctic deployments ({cookieKey, operatorLogin});
 *  - resolver: gateway deployments — the token binds to the request's
 *    VALIDATED gateway session login (server.ts ackCsrf binding), failing
 *    closed when the session carries no usable login or the request never
 *    authenticated via the gateway.
 *
 * Full-app tests below boot buildDashboardApp with
 * gatewayOperatorSessionEnabled + a fake OperatorClient (the gateway-auth.test.ts
 * harness pattern) and drive /api/listener/csrf + /ack-all through the real
 * auth middleware. A direct-router block covers the resolver's fail-closed
 * arms without the full app.
 */
import type {GatewayClientError, OperatorClient, SessionDto} from '../src/gateway/operator-client.ts'
import type {ListenerStore} from '../src/listener/store.ts'
import type {Result} from '../src/result.ts'
import {Buffer} from 'node:buffer'
import {Hono} from 'hono'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {createListenerStore} from '../src/listener/store.ts'
import {ok} from '../src/result.ts'
import {buildListenerRouter, deriveAckCsrfToken} from '../src/routes/listener.ts'
import {buildDashboardApp} from '../src/server.ts'

const TEST_KEY = Buffer.from('testkey-ABCDEFGHIJKLMNOPQRSTUV12', 'utf8') // 32 bytes
const FUTURE_EXPIRES_AT = Date.now() + 60 * 60 * 1000

const VALID_SESSION: SessionDto = {
  operatorId: 12345,
  login: 'octocat',
  expiresAt: FUTURE_EXPIRES_AT,
}

const BLANK_LOGIN_SESSION: SessionDto = {
  operatorId: 12345,
  login: '',
  expiresAt: FUTURE_EXPIRES_AT,
}

/**
 * Minimal fake OperatorClient with a controllable getCurrentSession — the
 * gateway-auth.test.ts harness pattern; every other method throws.
 */
function makeFakeOperatorClient(
  getCurrentSessionImpl: () => Promise<Result<SessionDto, GatewayClientError>>,
): OperatorClient {
  const spy = vi.fn(getCurrentSessionImpl)
  return {
    getCurrentSession: spy,
    refreshCsrf: () => {
      throw new Error('refreshCsrf must not be called here')
    },
    launchRun: () => {
      throw new Error('launchRun must not be called here')
    },
    getRunSnapshot: () => {
      throw new Error('getRunSnapshot must not be called here')
    },
    connectRunStream: () => {
      throw new Error('connectRunStream must not be called here')
    },
    listRepos: () => {
      throw new Error('listRepos must not be called here')
    },
    listRunApprovals: () => {
      throw new Error('listRunApprovals must not be called here')
    },
    decideRunApproval: () => {
      throw new Error('decideRunApproval must not be called here')
    },
    getVapidKey: () => {
      throw new Error('getVapidKey must not be called here')
    },
    getPushSubscriptionMetadata: () => {
      throw new Error('getPushSubscriptionMetadata must not be called here')
    },
    subscribePush: () => {
      throw new Error('subscribePush must not be called here')
    },
    unsubscribePush: () => {
      throw new Error('unsubscribePush must not be called here')
    },
  }
}

describe('rm-644: gateway-mode listener ack CSRF (full app)', () => {
  let store: ListenerStore

  beforeEach(() => {
    store = createListenerStore(':memory:')
  })

  it('GET /api/listener/csrf behind a valid gateway session → 200, token bound to the gateway login', async () => {
    const app = await buildDashboardApp({
      cookieKey: TEST_KEY,
      gatewayOperatorSessionEnabled: true,
      gatewayProxyAcknowledged: true, // rm-127: gateway mode refuses to start without the same-origin-proxy ack
      operatorClient: makeFakeOperatorClient(async () => ok(VALID_SESSION)),
      listenerStore: store,
      listenerIngestKey: null,
    })

    const res = await app.request('/api/listener/csrf', {
      headers: {cookie: 'gateway_session=some-gateway-cookie-value'},
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store') // rm-263
    const json = (await res.json()) as {csrfToken: string}
    expect(json.csrfToken).toBe(
      deriveAckCsrfToken({cookieKey: TEST_KEY, operatorLogin: 'octocat'}),
    )
  })

  it('POST /api/listener/ack-all with the gateway-minted token → 202; without → 403', async () => {
    const app = await buildDashboardApp({
      cookieKey: TEST_KEY,
      gatewayOperatorSessionEnabled: true,
      gatewayProxyAcknowledged: true,
      operatorClient: makeFakeOperatorClient(async () => ok(VALID_SESSION)),
      listenerStore: store,
      listenerIngestKey: null,
    })

    // Mint through the route under test, then replay it on the mutation.
    const mintRes = await app.request('/api/listener/csrf', {
      headers: {cookie: 'gateway_session=some-gateway-cookie-value'},
    })
    const {csrfToken} = (await mintRes.json()) as {csrfToken: string}

    const ackRes = await app.request('/api/listener/ack-all', {
      method: 'POST',
      headers: {
        cookie: 'gateway_session=some-gateway-cookie-value',
        'x-csrf-token': csrfToken,
      },
    })
    expect(ackRes.status).toBe(202)
    const ackJson = (await ackRes.json()) as {acked: number}
    expect(ackJson.acked).toBe(0)

    const noTokenRes = await app.request('/api/listener/ack-all', {
      method: 'POST',
      headers: {cookie: 'gateway_session=some-gateway-cookie-value'},
    })
    expect(noTokenRes.status).toBe(403)
    const errJson = (await noTokenRes.json()) as {error: string}
    expect(errJson.error).toBe('csrf missing')
  })

  it('a token minted for one gateway login does not validate for another (identity binding)', async () => {
    const otherSession: SessionDto = {operatorId: 999, login: 'mona', expiresAt: FUTURE_EXPIRES_AT}
    let current = VALID_SESSION
    const app = await buildDashboardApp({
      cookieKey: TEST_KEY,
      gatewayOperatorSessionEnabled: true,
      gatewayProxyAcknowledged: true,
      operatorClient: makeFakeOperatorClient(async () => ok(current)),
      listenerStore: store,
      listenerIngestKey: null,
    })

    const mintRes = await app.request('/api/listener/csrf', {
      headers: {cookie: 'gateway_session=cookie-for-octocat'},
    })
    const {csrfToken} = (await mintRes.json()) as {csrfToken: string}

    current = otherSession
    // Different cookie value: the default gatewaySessionCache keys the cached
    // session by cookie — a different value forces a fresh lookup so the
    // resolver sees the new login.
    const crossRes = await app.request('/api/listener/ack-all', {
      method: 'POST',
      headers: {
        cookie: 'gateway_session=cookie-for-mona',
        'x-csrf-token': csrfToken,
      },
    })
    expect(crossRes.status).toBe(403)
    const errJson = (await crossRes.json()) as {error: string}
    expect(errJson.error).toBe('csrf invalid')
  })
})

describe('rm-644: resolver-form ack CSRF (direct router)', () => {
  let store: ListenerStore

  beforeEach(() => {
    store = createListenerStore(':memory:')
  })

  /** Mount the router under a middleware that sets the gateway session variable — the server.ts auth middleware's job in the full app. */
  function buildApp(session: SessionDto | undefined) {
    interface Env {
      Variables: {gatewaySession?: SessionDto | undefined}
    }
    const app = new Hono<Env>()
    app.use('*', async (c, next) => {
      if (session !== undefined) {
        c.set('gatewaySession', session)
      }
      await next()
    })
    app.route(
      '/',
      buildListenerRouter({
        store,
        ingestKey: null,
        ackCsrf: gatewaySession =>
          gatewaySession.login.trim() === ''
            ? null
            : {cookieKey: TEST_KEY, operatorLogin: gatewaySession.login},
      }),
    )
    return app
  }

  it('valid gateway session → mint 200 + ack 202', async () => {
    const app = buildApp(VALID_SESSION)
    const mintRes = await app.request('/csrf')
    expect(mintRes.status).toBe(200)
    const {csrfToken} = (await mintRes.json()) as {csrfToken: string}
    expect(csrfToken).toBe(deriveAckCsrfToken({cookieKey: TEST_KEY, operatorLogin: 'octocat'}))

    const ackRes = await app.request('/ack-all', {
      method: 'POST',
      headers: {'x-csrf-token': csrfToken},
    })
    expect(ackRes.status).toBe(202)
  })

  it('blank gateway login → fail closed: mint 503, mutation 403 unavailable', async () => {
    const app = buildApp(BLANK_LOGIN_SESSION)
    const mintRes = await app.request('/csrf')
    expect(mintRes.status).toBe(503)
    const errJson = (await mintRes.json()) as {error: string}
    expect(errJson.error).toBe('csrf unavailable')

    const ackRes = await app.request('/ack-all', {method: 'POST'})
    expect(ackRes.status).toBe(403)
    const ackErr = (await ackRes.json()) as {error: string}
    expect(ackErr.error).toBe('csrf unavailable')
  })

  it('no gateway session in scope → fail closed (503 / 403 unavailable)', async () => {
    const app = buildApp(undefined)
    const mintRes = await app.request('/csrf')
    expect(mintRes.status).toBe(503)
    const ackRes = await app.request('/ack-all', {method: 'POST'})
    expect(ackRes.status).toBe(403)
  })
})
