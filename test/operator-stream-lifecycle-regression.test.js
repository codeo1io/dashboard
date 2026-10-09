// @vitest-environment jsdom
/**
 * rm-794 — operator run-stream lifecycle regressions (#583/#584).
 *
 * The two verified-live lifecycle defects from the 2026-10-09 research pass:
 *
 * #583 (expired snapshots → indefinite "Connecting…"): the reducer starts EMPTY
 * per attachment, so the no-snapshot close branch — reachable only "for a run
 * the reducer knows is terminal" — cannot fire for exactly the reported case (a
 * terminal run older than the gateway's ~10-min snapshot retention); and the
 * gateway HOLDS the subscription open after the reset, so the read loop parks
 * forever with shouldReconnect never consumed. Cures under test:
 *   - seedStatus seeding: a terminal seed lands the card terminal.
 *   - reader-side close decision: a reset the reducer answered with
 *     retry releases the socket and reconnects NOW (bounded by RETRY_MAX_COUNT),
 *     instead of parking on the gateway-held-open stream.
 *
 * #584 (stale Cancel controls on detach): every attachment lazily creates its
 * own cancel control inside the card's [data-role="run-cancel"] region; dispose
 * fenced requests but did not remove the element, and terminal cards kept the
 * control. Cures under test: dispose() removes the element; a terminal frame
 * removes the control and hides the region — one control at any time, none on a
 * terminal card, across the issue's own expand → collapse → re-expand → complete
 * cycle.
 *
 * Plain .js sibling of test/operator-run-index-core.test.js (house pattern for
 * DOM-touching suites): the server tsconfig carries no DOM lib, so the suite
 * stays out of check-types while jsdom gives REAL removal/detachment semantics
 * (asserted, not faked).
 */

import {afterEach, describe, expect, it, vi} from 'vitest'
import {
  initOperatorStream,
  PINNED_CONTRACT_VERSION,
  renderCancelControl,
  RETRY_BASE_MS,
  RETRY_FACTOR,
  RETRY_MAX_COUNT,
} from '../public/operator-stream.js'

const encoder = new TextEncoder()

function sseReady() {
  return `event: ready\ndata: {"contractVersion":"${PINNED_CONTRACT_VERSION}"}\n\n`
}

function sseStatus(payload) {
  return `event: status\ndata: ${JSON.stringify(payload)}\n\n`
}

function sseReset(reason) {
  // parseSseFrame REJECTS a reset record without a runId string (frame contract),
  // so fixtures must carry it.
  return `event: reset\ndata: {"runId":"run-old","reason":"${reason}"}\n\n`
}

const RUNNING_STATUS = {
  runId: 'run-old',
  entityRef: 'fro-bot/agent',
  surface: 'github',
  phase: 'EXECUTING',
  status: 'running',
  startedAt: '2026-10-09T10:00:00Z',
  stale: false,
}

const SUCCEEDED_STATUS = {
  ...RUNNING_STATUS,
  phase: 'COMPLETED',
  status: 'succeeded',
}

/** A gateway-style SSE response body: emits chunks, then never closes (holds open). */
function heldOpenStream(initialChunks) {
  let streamController
  const body = new ReadableStream({
    start(controller) {
      streamController = controller
      for (const chunk of initialChunks) controller.enqueue(encoder.encode(chunk))
    },
  })
  if (streamController === undefined) throw new Error('stream start() must run synchronously')
  return {body, controller: streamController}
}

function sseResponse(body) {
  return new Response(body, {
    status: 200,
    headers: {'content-type': 'text/event-stream'},
  })
}

function makeTargets() {
  const statusEl = document.createElement('span')
  const noticeEl = document.createElement('div')
  const cancelEl = document.createElement('div')
  document.body.append(statusEl, noticeEl, cancelEl)
  return {statusEl, noticeEl, cancelEl}
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('rm-794 #583 — seeded terminal run lands terminal, never parks in Connecting', () => {
  it('a seeded terminal status survives a held-open no-snapshot reset: status label, hidden notice, zero reconnects', async () => {
    const {statusEl, noticeEl} = makeTargets()
    const fetchMock = vi.fn().mockImplementation(() => {
      // Gateway sends no-snapshot for the old run, then HOLDS the stream open.
      const {body} = heldOpenStream([sseReady(), sseReset('no-snapshot')])
      return Promise.resolve(sseResponse(body))
    })
    vi.stubGlobal('fetch', fetchMock)

    const handle = initOperatorStream({
      runId: 'run-old',
      statusEl,
      noticeEl,
      seedStatus: 'succeeded',
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(statusEl.textContent).toBe('Succeeded')
    expect(statusEl.className).toContain('status-succeeded')
    expect(noticeEl.hidden).toBe(true)
    expect(noticeEl.textContent).toBe('')
    // The no-snapshot close branch fired — a reconnect fetch must never happen.
    expect(fetchMock).toHaveBeenCalledTimes(1)

    handle.close()
  })

  it('a non-terminal seed is ignored: the card behaves exactly like an unseeded attach', async () => {
    const {statusEl} = makeTargets()
    const fetchMock = vi.fn().mockImplementation(() => {
      const {body} = heldOpenStream([sseReady(), sseStatus(RUNNING_STATUS)])
      return Promise.resolve(sseResponse(body))
    })
    vi.stubGlobal('fetch', fetchMock)

    const handle = initOperatorStream({
      runId: 'run-old',
      statusEl,
      noticeEl: document.createElement('div'),
      seedStatus: 'running',
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(statusEl.textContent).toBe('Running')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    handle.close()
  })

  it('an unrecognizable seedStatus string is ignored (no state pollution)', async () => {
    const {statusEl, noticeEl} = makeTargets()
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise(() => {})))

    const handle = initOperatorStream({
      runId: 'run-old',
      statusEl,
      noticeEl,
      seedStatus: 'definitely-not-a-status',
    })

    await new Promise(resolve => setTimeout(resolve, 20))
    // Still connecting (fetch never resolves, so updateDOM never ran) and the
    // seed must not have painted a terminal label or any notice text.
    expect(statusEl.textContent).toBe('')
    expect(noticeEl.textContent).toBe('')

    handle.close()
  })
})

describe('rm-794 #583 — reset while the gateway holds the subscription open is bounded, not parked', () => {
  it('an unseeded no-snapshot reset with a held-open stream reconnects promptly and fails closed after the retry cap', async () => {
    vi.useFakeTimers()
    const {statusEl, noticeEl} = makeTargets()
    let fetchCount = 0
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
      fetchCount++
      // Every connection: reset no-snapshot, then hold the stream open forever.
      const {body} = heldOpenStream([sseReset('no-snapshot')])
      return Promise.resolve(sseResponse(body))
    }))

    const handle = initOperatorStream({runId: 'run-unknown', statusEl, noticeEl})

    // Drive the full bounded retry ladder: initial connect + RETRY_MAX_COUNT
    // reconnects, each released by the reader-side close decision (pre-fix, the
    // first reset parked the reader forever and fetchCount stayed 1).
    // backoffDelay uses the POST-increment retryCount, so reconnect k (1-based)
    // waits RETRY_BASE_MS * RETRY_FACTOR ** k.
    await vi.advanceTimersByTimeAsync(10)
    expect(fetchCount).toBe(1)
    for (let attempt = 1; attempt <= RETRY_MAX_COUNT; attempt++) {
      await vi.advanceTimersByTimeAsync(RETRY_BASE_MS * RETRY_FACTOR ** attempt + 10)
    }
    expect(fetchCount).toBe(RETRY_MAX_COUNT + 1)

    expect(noticeEl.hidden).toBe(false)
    expect(noticeEl.textContent).toBe('Stream connection failed.')
    expect(statusEl.textContent).toBe('Unavailable')
    expect(statusEl.className).toContain('status-unavailable')

    handle.close()
  })

  it('a held-open no-snapshot reset for a KNOWN-terminal run (seeded) never reconnects — close branch wins', async () => {
    vi.useFakeTimers()
    const {statusEl, noticeEl} = makeTargets()
    const fetchMock = vi.fn().mockImplementation(() => {
      const {body} = heldOpenStream([sseReset('no-snapshot')])
      return Promise.resolve(sseResponse(body))
    })
    vi.stubGlobal('fetch', fetchMock)

    const handle = initOperatorStream({
      runId: 'run-old',
      statusEl,
      noticeEl,
      seedStatus: 'cancelled',
    })

    await vi.advanceTimersByTimeAsync(RETRY_BASE_MS * RETRY_FACTOR ** RETRY_MAX_COUNT + 100)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(statusEl.textContent).toBe('Cancelled')
    expect(noticeEl.hidden).toBe(true)

    handle.close()
  })
})

function fakeCancelClient() {
  return {
    cancelRun: () => new Promise(() => {}),
    refreshCsrf: () => Promise.resolve({success: true, data: {csrfToken: 'test-csrf'}}),
  }
}

describe('rm-794 #584 — cancel-control singularity across expand → collapse → re-expand → complete', () => {
  it('exactly one control at any time, none on the terminal card', async () => {
    const {statusEl, noticeEl, cancelEl} = makeTargets()

    // Attach 1 (expand): live running run → one control.
    const attach1 = heldOpenStream([sseReady(), sseStatus(RUNNING_STATUS)])
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(sseResponse(attach1.body)))
    vi.stubGlobal('fetch', fetchMock)
    const handle1 = initOperatorStream({
      runId: 'run-old',
      statusEl,
      noticeEl,
      cancelEl,
      cancelClient: fakeCancelClient(),
    })
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(cancelEl.querySelectorAll('.run-cancel-control')).toHaveLength(1)
    expect(cancelEl.hidden).toBe(false)

    // Collapse: stream teardown must remove the control element.
    handle1.close()
    expect(cancelEl.querySelectorAll('.run-cancel-control')).toHaveLength(0)

    // Re-expand (attach 2): a fresh control is created — still exactly one.
    const attach2 = heldOpenStream([sseReady(), sseStatus(RUNNING_STATUS)])
    fetchMock.mockImplementation(() => Promise.resolve(sseResponse(attach2.body)))
    const handle2 = initOperatorStream({
      runId: 'run-old',
      statusEl,
      noticeEl,
      cancelEl,
      cancelClient: fakeCancelClient(),
    })
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(cancelEl.querySelectorAll('.run-cancel-control')).toHaveLength(1)

    // Complete: the terminal status frame removes the control and hides the region.
    attach2.controller.enqueue(encoder.encode(sseStatus(SUCCEEDED_STATUS)))
    attach2.controller.close()
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(cancelEl.querySelectorAll('.run-cancel-control')).toHaveLength(0)
    expect(cancelEl.hidden).toBe(true)
    expect(statusEl.textContent).toBe('Succeeded')

    handle2.close()
  })

  it('a terminal card seeded at attach never creates a cancel control', async () => {
    const {statusEl, noticeEl, cancelEl} = makeTargets()
    const {body} = heldOpenStream([sseReset('no-snapshot')])
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(sseResponse(body))))

    const handle = initOperatorStream({
      runId: 'run-old',
      statusEl,
      noticeEl,
      cancelEl,
      cancelClient: fakeCancelClient(),
      seedStatus: 'failed',
    })
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(cancelEl.querySelectorAll('.run-cancel-control')).toHaveLength(0)
    expect(cancelEl.hidden).toBe(true)
    expect(statusEl.textContent).toBe('Failed')
    // A failed run announces itself via the notice (existing failed-status
    // notice contract) — still no control and no reconnect.
    expect(noticeEl.textContent).toBe('Run failed')

    handle.close()
  })
})

describe('rm-794 #584 — renderCancelControl disposal removes its element', () => {
  it('dispose() detaches the control element from its parent', () => {
    const parent = document.createElement('div')
    document.body.append(parent)
    const {el, dispose} = renderCancelControl('run-x', fakeCancelClient(), () => {})
    parent.append(el)
    expect(el.parentNode).toBe(parent)

    dispose()

    expect(el.parentNode).toBeNull()
    expect(parent.children).toHaveLength(0)
  })
})
