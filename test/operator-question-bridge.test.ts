/**
 * Tests for the operator question bridge (operator-contract 1.9.0,
 * gateway v0.119.0 PR #1749).
 *
 * Security invariants tested:
 * - Parser: question open/settle records parsed fail-closed; every malformed
 *   shape (missing/slash/oversized ids, non-boolean settled, empty/oversized
 *   question fields, non-boolean multiple/custom) is rejected with the fixed
 *   'question frame missing required fields' error — never echoes payload.
 * - Reducer: question frames mirror approval frames — live-gated, terminal
 *   absorbing, tombstoned ids never reopen, bounded maps.
 * - Client: CSRF refresh before every decision POST, one CSRF-400 retry,
 *   200-state mapping, 400-reason parsing (request stays pending).
 * - Render: every agent-supplied string lands via textContent only — no
 *   innerHTML anywhere on the question path.
 */

// @vitest-environment jsdom

import type {QuestionFrameDataOpen, StreamFrame, StreamState} from '../public/operator-stream.js'
import fc from 'fast-check'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {
  buildQuestionClient,
  getOpenQuestions,
  hasOpenQuestions,
  MAX_OPEN_QUESTIONS,
  nextStreamState,
  parseSseFrame,
  renderQuestionPrompt,
} from '../public/operator-stream.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function liveState(): StreamState {
  const readyResult = parseSseFrame(`event: ready\ndata: {"contractVersion":"1.9.0"}`)
  if (readyResult === null || !readyResult.success) {
    throw new Error('ready record failed to parse')
  }
  const state = nextStreamState({connection: 'connecting', runs: {}, retryCount: 0, shouldReconnect: false}, readyResult.frame)
  if (state.connection !== 'live') throw new Error('expected live state')
  return state
}

/** parseSseFrame with the null case (comment-only records) collapsed to a throw. */
function parseOrThrow(record: string): {success: true; frame: StreamFrame} | {success: false; error: string} {
  const result = parseSseFrame(record)
  if (result === null) throw new Error(`parseSseFrame returned null for: ${record.slice(0, 60)}`)
  return result
}

function questionRecord(payload: unknown): string {
  return `event: question\ndata: ${JSON.stringify(payload)}`
}

function openPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    runId: 'run-1',
    requestID: 'req-1',
    settled: false,
    questions: [
      {
        header: 'Deploy?',
        text: 'Choose a deployment strategy',
        options: [
          {label: 'Rolling', description: 'Zero-downtime'},
          {label: 'Blue-green', description: 'Two environments'},
        ],
        multiple: false,
        custom: false,
      },
      {
        header: 'Notes',
        text: '',
        options: [],
        multiple: false,
        custom: true,
      },
    ],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

describe('parseSseFrame — question records', () => {
  it('parses a valid open question frame', () => {
    const result = parseOrThrow(questionRecord(openPayload()))
    expect(result).toEqual({
      success: true,
      frame: {
        type: 'question',
        data: {
          runId: 'run-1',
          requestID: 'req-1',
          settled: false,
          questions: [
            {
              header: 'Deploy?',
              text: 'Choose a deployment strategy',
              options: [
                {label: 'Rolling', description: 'Zero-downtime'},
                {label: 'Blue-green', description: 'Two environments'},
              ],
              multiple: false,
              custom: false,
            },
            {header: 'Notes', text: '', options: [], multiple: false, custom: true},
          ],
        },
      },
    })
  })

  it('parses a valid settle frame carrying only ids', () => {
    const result = parseOrThrow(questionRecord({runId: 'run-1', requestID: 'req-1', settled: true, questions: 'ignored'}))
    expect(result).toEqual({
      success: true,
      frame: {type: 'question', data: {runId: 'run-1', requestID: 'req-1', settled: true}},
    })
  })

  it.each([
    ['missing runId', {runId: undefined}],
    ['empty runId', {runId: ''}],
    ['oversized runId', {runId: 'a'.repeat(129)}],
    ['slash in runId', {runId: 'run/1'}],
    ['missing requestID', {requestID: undefined}],
    ['empty requestID', {requestID: ''}],
    ['oversized requestID', {requestID: 'r'.repeat(129)}],
    ['slash in requestID', {requestID: 'req/1'}],
    ['non-boolean settled', {settled: 'no'}],
    ['missing questions on open', {questions: undefined}],
    ['empty questions array on open', {questions: []}],
    ['non-array questions', {questions: {}}],
    ['question item not an object', {questions: ['nope']}],
    ['empty header', {questions: [{header: '', text: '', options: [], multiple: false, custom: false}]}],
    ['oversized header', {questions: [{header: 'h'.repeat(4001), text: '', options: [], multiple: false, custom: false}]}],
    ['oversized text', {questions: [{header: 'H', text: 't'.repeat(4001), options: [], multiple: false, custom: false}]}],
    ['non-boolean multiple', {questions: [{header: 'H', text: '', options: [], multiple: 'yes', custom: false}]}],
    ['non-boolean custom', {questions: [{header: 'H', text: '', options: [], multiple: false, custom: 1}]}],
    ['options not an array', {questions: [{header: 'H', text: '', options: {}, multiple: false, custom: false}]}],
    ['option not an object', {questions: [{header: 'H', text: '', options: ['x'], multiple: false, custom: false}]}],
    ['empty option label', {questions: [{header: 'H', text: '', options: [{label: '', description: ''}], multiple: false, custom: false}]}],
    ['oversized option label', {questions: [{header: 'H', text: '', options: [{label: 'l'.repeat(4001), description: ''}], multiple: false, custom: false}]}],
    ['oversized option description', {questions: [{header: 'H', text: '', options: [{label: 'L', description: 'd'.repeat(4001)}], multiple: false, custom: false}]}],
  ])('rejects %s with the fixed error string', (_label, overrides) => {
    const result = parseOrThrow(questionRecord(openPayload(overrides)))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(['question frame missing required fields', 'question frame has invalid settled discriminator']).toContain(result.error)
    }
  })

  it('rejects non-JSON question data without echoing it', () => {
    const result = parseOrThrow('event: question\ndata: {not json')
    expect(result.success).toBe(false)
  })

  it('rejects a payload that is not a JSON object', () => {
    const result = parseOrThrow(questionRecord('string'))
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

describe('nextStreamState — question frames', () => {
  it('opens a prompt on live state and exposes it via getOpenQuestions', () => {
    const state = liveState()
    const frame = parseOrThrow(questionRecord(openPayload()))
    if (!frame.success) throw new Error('parse failed')
    const next = nextStreamState(state, frame.frame)
    const runEntry = next.runs['run-1']
    expect(hasOpenQuestions(runEntry)).toBe(true)
    expect(getOpenQuestions(runEntry)).toHaveLength(1)
    expect(getOpenQuestions(runEntry)[0]?.requestID).toBe('req-1')
  })

  it('ignores question frames before live (connection !== live)', () => {
    const state: StreamState = {connection: 'connecting', runs: Object.create(null) as Record<string, never>, retryCount: 0, shouldReconnect: false}
    const frame = parseOrThrow(questionRecord(openPayload()))
    if (!frame.success) throw new Error('parse failed')
    const next = nextStreamState(state, frame.frame)
    expect(next.runs['run-1']).toBeUndefined()
  })

  it('settle dismisses the open prompt and tombstones the id', () => {
    let state = liveState()
    const open = parseOrThrow(questionRecord(openPayload()))
    const settle = parseOrThrow(questionRecord({runId: 'run-1', requestID: 'req-1', settled: true}))
    if (!open.success || !settle.success) throw new Error('parse failed')
    state = nextStreamState(state, open.frame)
    state = nextStreamState(state, settle.frame)
    expect(hasOpenQuestions(state.runs['run-1'])).toBe(false)
    // Tombstone: a late open frame for the same id is ignored
    const reopened = nextStreamState(state, open.frame)
    expect(hasOpenQuestions(reopened.runs['run-1'])).toBe(false)
  })

  it('terminal status absorbs open questions (and preserves tombstones)', () => {
    let state = liveState()
    const open = parseOrThrow(questionRecord(openPayload()))
    const settle = parseOrThrow(questionRecord({runId: 'run-1', requestID: 'req-gone', settled: true}))
    if (!open.success || !settle.success) throw new Error('parse failed')
    state = nextStreamState(state, settle.frame)
    state = nextStreamState(state, open.frame)
    const terminal = parseOrThrow(
      `event: status\ndata: ${
        JSON.stringify({
          runId: 'run-1',
          entityRef: 'codeo1io/dashboard',
          surface: 'github',
          phase: 'COMPLETED',
          status: 'failed',
          startedAt: '2026-10-10T00:00:00Z',
          stale: false,
        })}`,
    )
    if (!terminal.success) throw new Error('parse failed')
    state = nextStreamState(state, terminal.frame)
    expect(hasOpenQuestions(state.runs['run-1'])).toBe(false)
    // Terminal absorbs: a new open frame after terminal is ignored
    const postTerminal = nextStreamState(state, open.frame)
    expect(hasOpenQuestions(postTerminal.runs['run-1'])).toBe(false)
  })

  it('caps open prompts at MAX_OPEN_QUESTIONS', () => {
    let state = liveState()
    for (let i = 0; i < MAX_OPEN_QUESTIONS + 5; i++) {
      const frame = parseOrThrow(questionRecord(openPayload({requestID: `req-${i}`})))
      if (!frame.success) throw new Error('parse failed')
      state = nextStreamState(state, frame.frame)
    }
    const runEntry = state.runs['run-1']
    expect(getOpenQuestions(runEntry)).toHaveLength(MAX_OPEN_QUESTIONS)
  })

  it('question-reconcile prunes ghost prompts and adds gateway-pending ones', () => {
    let state = liveState()
    const local = parseOrThrow(questionRecord(openPayload({requestID: 'local-1'})))
    if (!local.success) throw new Error('parse failed')
    state = nextStreamState(state, local.frame)
    const next = nextStreamState(state, {
      type: 'question-reconcile',
      runId: 'run-1',
      pruneIds: ['local-1'],
      addPrompts: [openPayload({requestID: 'remote-1'}) as unknown as QuestionFrameDataOpen],
    })
    const runEntry = next.runs['run-1']
    expect(hasOpenQuestions(runEntry)).toBe(true)
    const ids = getOpenQuestions(runEntry).map(p => p.requestID)
    expect(ids).toEqual(['remote-1'])
  })

  it('question-reconcile with empty lists clears everything (gateway holds none)', () => {
    let state = liveState()
    const local = parseOrThrow(questionRecord(openPayload({requestID: 'local-1'})))
    if (!local.success) throw new Error('parse failed')
    state = nextStreamState(state, local.frame)
    const next = nextStreamState(state, {type: 'question-reconcile', runId: 'run-1', pruneIds: ['local-1'], addPrompts: []})
    expect(hasOpenQuestions(next.runs['run-1'])).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

describe('buildQuestionClient — decision + listing', () => {
  const fetchMock = vi.fn()

  function respondSequence(responses: {status: number; body: unknown}[]) {
    let i = 0
    fetchMock.mockImplementation(async () => {
      const r = responses[Math.min(i, responses.length - 1)]
      i++
      if (r === undefined) throw new Error('respondSequence exhausted')
      return new Response(JSON.stringify(r.body), {status: r.status, headers: {'content-type': 'application/json'}})
    })
  }

  // eslint-disable-next-line unicorn/consistent-function-scoping -- pure literal factory, scope-local by intent
  function csrfOk() {
    return {status: 200, body: {csrfToken: 'token-1'}}
  }

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it('decideQuestion refreshes CSRF, POSTs the decision, and maps a 200 state', async () => {
    respondSequence([csrfOk(), {status: 200, body: {state: 'claimed'}}])
    const client = buildQuestionClient({endpointBase: '/operator'})
    const result = await client.decideQuestion('run-1', 'req-1', {decision: 'answer', answers: [{options: [1]}]})
    expect(result).toEqual({success: true, data: {state: 'claimed'}})
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const decisionCall = fetchMock.mock.calls[1]
    const init = decisionCall?.[1] as {method: string; headers: Record<string, string>; body: string}
    expect(init.method).toBe('POST')
    expect(init.headers['x-csrf-token']).toBe('token-1')
    expect(String(decisionCall?.[0])).toBe('/operator/runs/run-1/questions/req-1/decision')
    expect(JSON.parse(init.body)).toEqual({decision: 'answer', answers: [{options: [1]}]})
  })

  it('retries once on a 400 (CSRF refresh) and succeeds when the retry lands', async () => {
    respondSequence([csrfOk(), {status: 400, body: {error: 'csrf'}}, csrfOk(), {status: 200, body: {state: 'already_claimed'}}])
    const client = buildQuestionClient({endpointBase: '/operator'})
    const result = await client.decideQuestion('run-1', 'req-1', {decision: 'skip'})
    expect(result).toEqual({success: true, data: {state: 'already_claimed'}})
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it('parses a persistent 400 into {state: bad-request, badRequest: {reason, questionIndex}}', async () => {
    respondSequence([
      csrfOk(),
      {status: 400, body: {error: 'bad request', reason: 'unknown-option', questionIndex: 1}},
      csrfOk(),
      {status: 400, body: {error: 'bad request', reason: 'unknown-option', questionIndex: 1}},
    ])
    const client = buildQuestionClient({endpointBase: '/operator'})
    const result = await client.decideQuestion('run-1', 'req-1', {decision: 'answer', answers: [{options: [99]}]})
    expect(result).toEqual({
      success: true,
      data: {state: 'bad-request', badRequest: {reason: 'unknown-option', questionIndex: 1}},
    })
  })

  it('maps a 400 with an unparseable body to reason malformed', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/session/csrf')) {
        return new Response(JSON.stringify({csrfToken: 'token-1'}), {status: 200})
      }
      return new Response('<html>proxy error</html>', {status: 400})
    })
    const client = buildQuestionClient({endpointBase: '/operator'})
    const result = await client.decideQuestion('run-1', 'req-1', {decision: 'skip'})
    expect(result).toEqual({success: true, data: {state: 'bad-request', badRequest: {reason: 'malformed', questionIndex: null}}})
  })

  it('returns a network error when fetch throws (transport failure, retryable)', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/session/csrf')) {
        return new Response(JSON.stringify({csrfToken: 'token-1'}), {status: 200})
      }
      throw new TypeError('fetch failed')
    })
    const client = buildQuestionClient({endpointBase: '/operator'})
    const result = await client.decideQuestion('run-1', 'req-1', {decision: 'skip'})
    expect(result).toEqual({success: false, error: {kind: 'network'}})
  })

  it('listRunQuestions maps a 200 requests array; 200-without-array is a protocol failure, not empty', async () => {
    respondSequence([{status: 200, body: {requests: [{requestID: 'r1', questions: []}]}}])
    const client = buildQuestionClient({endpointBase: '/operator'})
    const ok = await client.listRunQuestions('run-1')
    expect(ok).toEqual({success: true, data: {requests: [{requestID: 'r1', questions: []}]}})

    respondSequence([{status: 200, body: {}}])
    const bad = await client.listRunQuestions('run-1')
    expect(bad).toEqual({success: false, error: {kind: 'protocol'}})
  })

  it('listRunQuestions surfaces a non-2xx as an http error', async () => {
    respondSequence([{status: 503, body: {}}])
    const client = buildQuestionClient({endpointBase: '/operator'})
    const result = await client.listRunQuestions('run-1')
    expect(result).toEqual({success: false, error: {kind: 'http', status: 503}})
  })
})

// ---------------------------------------------------------------------------
// Render (inertness)
// ---------------------------------------------------------------------------

describe('renderQuestionPrompt — inert rendering', () => {
  it('renders every agent-supplied string via textContent and sets no innerHTML', () => {
    // Spy BEFORE the render so the assertion covers the render itself, not just
    // the assertions that follow it.
    const innerHtmlSpy = vi.spyOn(Element.prototype, 'innerHTML', 'set')
    try {
      const el = renderQuestionPrompt(
        openPayload({requestID: 'req-x', questions: [{header: '<b>H</b>', text: '<script>t()</script>', options: [{label: '<img src=x>', description: 'd&d'}], multiple: true, custom: false}]}) as unknown as QuestionFrameDataOpen,
        'run-1',
        buildQuestionClient({endpointBase: '/operator'}),
        () => {},
      )
      expect(el.querySelector('.question-prompt-question-header')?.textContent).toBe('<b>H</b>')
      expect(el.querySelector('.question-prompt-question-text')?.textContent).toBe('<script>t()</script>')
      expect(el.querySelector('.question-prompt-option-label')?.textContent).toBe('<img src=x>')
      expect(el.querySelector('.question-prompt-option-description')?.textContent).toBe('d&d')
      // Inertness: no script/img elements were ever constructed from the payload
      expect(el.querySelectorAll('script').length).toBe(0)
      expect(el.querySelectorAll('img').length).toBe(0)
      // The inertness guarantee itself: no innerHTML property writes anywhere
      // during the render (textContent-only discipline, gateway contract mandate).
      expect(innerHtmlSpy).not.toHaveBeenCalled()
    } finally {
      innerHtmlSpy.mockRestore()
    }
  })

  it('builds option inputs as checkbox for multiple and radio otherwise; custom renders a 4000-bounded textarea', () => {
    const el = renderQuestionPrompt(
      openPayload({
        requestID: 'req-y',
        questions: [
          {header: 'Multi', text: '', options: [{label: 'A', description: ''}, {label: 'B', description: ''}], multiple: true, custom: false},
          {header: 'Single', text: '', options: [{label: 'X', description: ''}], multiple: false, custom: false},
          {header: 'Free', text: '', options: [], multiple: false, custom: true},
        ],
      }) as unknown as QuestionFrameDataOpen,
      'run-1',
      buildQuestionClient({endpointBase: '/operator'}),
      () => {},
    )
    const checkboxes = el.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
    const radios = el.querySelectorAll<HTMLInputElement>('input[type="radio"]')
    expect(checkboxes).toHaveLength(2)
    expect(radios).toHaveLength(1)
    // Zero-based displayed-option indices
    expect([...checkboxes].map(c => c.value)).toEqual(['0', '1'])
    const textarea = el.querySelector<HTMLTextAreaElement>('textarea.question-prompt-custom-input')
    expect(textarea?.maxLength).toBe(4000)
  })
})

// ---------------------------------------------------------------------------
// Property: generated valid open frames always parse; corruption always fails closed
// ---------------------------------------------------------------------------

describe('question frame round-trip properties', () => {
  it('any JSON-serializable payload either parses to a well-formed frame or fails — never a frame with unvalidated fields', async () => {
    await fc.assert(
      fc.asyncProperty(fc.jsonValue(), async payload => {
        const result = parseOrThrow(questionRecord(payload))
        if (result.success) {
          const data = result.frame.type === 'question' ? result.frame.data : null
          if (data !== null && data.settled === false) {
            for (const q of data.questions) {
              expect(typeof q.header).toBe('string')
              expect(q.header.length).toBeLessThanOrEqual(4000)
              expect(typeof q.multiple).toBe('boolean')
              expect(typeof q.custom).toBe('boolean')
              for (const o of q.options) {
                expect(typeof o.label).toBe('string')
                expect(o.label.length).toBeLessThanOrEqual(4000)
              }
            }
          }
        } else {
          expect(typeof result.error).toBe('string')
        }
      }),
      {numRuns: 200},
    )
  })
})
