/**
 * rm-1440 + rm-1441 composed behavioral battery (upstream fro-bot/dashboard
 * #586 + #585): the run card's output truth, end to end, on the real modules —
 *
 * - the optimistic launch card ships a creation timestamp (<time
 *   data-role="run-updated-at">) and hidden empty substructure regions;
 * - the stream paints a compact in-card waiting state (the effective status's
 *   own class + label) while a live non-terminal run has no output yet;
 * - output renders through the allowlist Markdown builder: real strong/em/
 *   code/list/code-fence DOM, injection payloads degraded to literal text;
 * - the DOM rebuild is change-guarded (status-only frames never rebuild it);
 * - the card's timestamp advances only on effective-status transitions and is
 *   monotonic (never moves backwards).
 *
 * Launch and stream are the REAL public modules: the launch module's dynamic
 * stream import is mocked only to the real stream namespace so its internal
 * attach is exercised, and frames are fed through a stubbed fetch SSE body
 * (same shape as stream-reattach.test.ts).
 */

import {afterEach, describe, expect, it, vi} from 'vitest'
import * as streamNamespace from '../../../public/operator-stream.js'

type LaunchModule = typeof import('../../../public/operator-launch.js')

const STREAM_SPECIFIER = '/static/operator-stream.js?manual=1'
const RUN_ID = 'run-card-001'

const PINNED_CONTRACT_VERSION = streamNamespace.PINNED_CONTRACT_VERSION

function frame(event: string, payload: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`
}

const BASE_STATUS = {
  runId: RUN_ID,
  entityRef: 'fro-bot/agent',
  surface: 'github',
  phase: 'EXECUTING',
  startedAt: '2026-06-20T10:00:00Z',
  stale: false,
}
const READY = frame('ready', {contractVersion: PINNED_CONTRACT_VERSION})
const RUNNING = frame('status', {...BASE_STATUS, status: 'running'})
const WAITING_APPROVAL = frame('status', {...BASE_STATUS, status: 'waiting_for_approval'})
const SUCCEEDED = frame('status', {
  ...BASE_STATUS,
  status: 'succeeded',
  phase: 'COMPLETED',
  completedAt: '2026-06-20T10:05:00Z',
})

function outputFrame(text: string, seq: number, final: boolean) {
  return frame('output', {runId: RUN_ID, text, final, seq})
}

/**
 * One fetch stub for the whole flow: launch-phase JSON endpoints first, then
 * the stream SSE read (a push-fed body, stream-reattach style).
 */
function stubFlowFetch() {
  const pushes: Array<(text: string) => void> = []
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async (input: string | URL, init?: {method?: string}) => {
    const url = typeof input === 'string' ? input : input.toString()
    const method = init?.method ?? 'GET'
    if (url.endsWith('/session/csrf')) {
      return new Response(JSON.stringify({csrfToken: 'tok-card'}), {status: 200, headers: {'content-type': 'application/json'}})
    }
    if (url.endsWith('/repos')) {
      return new Response(JSON.stringify([{owner: 'fro-bot', repo: 'agent'}]), {status: 200, headers: {'content-type': 'application/json'}})
    }
    if (url.endsWith('/runs') && method === 'POST') {
      return new Response(JSON.stringify({runId: RUN_ID}), {status: 202, headers: {'content-type': 'application/json'}})
    }
    if (url.includes('/stream')) {
      const queue: string[] = []
      let wake: (() => void) | null = null
      pushes.push(text => {
        queue.push(text)
        wake?.()
      })
      return {
        status: 200,
        headers: {get: () => 'text/event-stream'},
        body: {
          getReader: () => ({
            read: async () => {
              while (queue.length === 0) {
                await new Promise<void>(resolve => {
                  wake = resolve
                })
              }
              return {done: false, value: new TextEncoder().encode(queue.shift() as string)}
            },
          }),
        },
      } as unknown as Response
    }
    return new Response(JSON.stringify({}), {status: 404, headers: {'content-type': 'application/json'}})
  }))
  return {pushToLatest: (text: string) => pushes.at(-1)?.(text)}
}

const handles: Array<{close: () => void}> = []

/** Import the launch module with its dynamic stream import pointed at the real stream. */
async function importLaunchWithRealStream(): Promise<LaunchModule> {
  vi.doMock(STREAM_SPECIFIER, () => ({
    ...streamNamespace,
    initOperatorStream: (opts: Parameters<typeof streamNamespace.initOperatorStream>[0]) => {
      const handle = streamNamespace.initOperatorStream(opts)
      handles.push(handle)
      return handle
    },
  }))
  return import('../../../public/operator-launch.js')
}

function setLaunchDom() {
  document.body.innerHTML = `
    <div id="repo-picker-container"></div>
    <form id="launch-form"><textarea name="prompt"></textarea><button type="submit">Launch</button></form>
    <p id="launch-error" hidden></p>
    <p data-role="stream-status" hidden></p>
    <div data-role="run-index-list"></div>`
}

/** Run the real launch path (legacy attach — no runtime callback); resolves with the optimistic card. */
async function launchCard(launchModule: LaunchModule): Promise<HTMLElement> {
  setLaunchDom()
  const form = document.querySelector<HTMLFormElement>('#launch-form')
  const prompt = document.querySelector<HTMLTextAreaElement>('textarea[name="prompt"]')
  expect(form).not.toBeNull()
  expect(prompt).not.toBeNull()

  const cardPromise = vi.waitFor(() => {
    const card = document.querySelector<HTMLElement>(`[data-run-id="${RUN_ID}"]`)
    expect(card).not.toBeNull()
    return card as HTMLElement
  })

  await launchModule.initOperatorLaunch()
  if (prompt !== null) prompt.value = 'do the thing'
  form?.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}))
  return cardPromise
}

describe('run-card output truth (rm-1440 + rm-1441, upstream #586 + #585)', () => {
  afterEach(() => {
    for (const handle of handles.splice(0)) handle.close()
    handles.length = 0
    streamNamespace.resetQuestionPageStore()
    vi.doUnmock(STREAM_SPECIFIER)
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('the optimistic launch card ships a creation timestamp and hidden empty substructure regions (rm-1441)', async () => {
    stubFlowFetch()
    const launchModule = await importLaunchWithRealStream()
    const card = await launchCard(launchModule)

    expect(card.dataset.runId).toBe(RUN_ID)
    expect(card.dataset.optimistic).toBe('true')

    const timeEl = card.querySelector<HTMLElement>('[data-role="run-updated-at"]')
    expect(timeEl).not.toBeNull()
    expect(timeEl?.tagName).toBe('TIME')
    const createdAt = Date.parse(timeEl?.getAttribute('datetime') ?? '')
    expect(Number.isFinite(createdAt)).toBe(true)
    // From launch: the age is ~zero relative to real now.
    expect(Math.abs(Date.now() - createdAt)).toBeLessThan(60_000)
    expect(timeEl?.textContent).toBe('just now')

    // Empty regions ship hidden: no tall empty body before the first frame.
    for (const role of ['run-output', 'run-approvals', 'run-questions', 'run-cancel', 'run-checkout-detail']) {
      const region = card.querySelector<HTMLElement>(`[data-role="${role}"]`)
      expect(region, role).not.toBeNull()
      expect(region?.hidden, role).toBe(true)
      expect(region?.textContent, role).toBe('')
    }
    expect(card.querySelector('[data-role="run-waiting"]')).toBeNull()
  })

  it('a live run with no output shows the compact waiting state and collapses empty regions; the timestamp advances on transition (rm-1441)', async () => {
    const {pushToLatest} = stubFlowFetch()
    const launchModule = await importLaunchWithRealStream()
    const card = await launchCard(launchModule)

    const timeEl = card.querySelector<HTMLElement>('[data-role="run-updated-at"]')
    const launchDatetime = timeEl?.getAttribute('datetime') ?? ''
    const outputEl = card.querySelector<HTMLElement>('[data-role="run-output"]')

    pushToLatest(READY + RUNNING)
    await vi.waitFor(() => expect(card.querySelector('[data-role="run-status"]')?.textContent).toBe('Running'))

    // Waiting state: the effective status's own class + label, in the output region.
    const waiting = outputEl?.querySelector<HTMLElement>('[data-role="run-waiting"]') ?? null
    expect(waiting).not.toBeNull()
    expect(waiting?.className).toContain('status-running')
    expect(waiting?.textContent).toBe('Running')
    expect(outputEl?.hidden).toBe(false)

    // Empty regions stay collapsed while there is nothing to show.
    expect(card.querySelector<HTMLElement>('[data-role="run-approvals"]')?.hidden).toBe(true)
    expect(card.querySelector<HTMLElement>('[data-role="run-questions"]')?.hidden).toBe(true)

    // Timestamp: creation → first observed status is a transition; it advanced.
    const afterFirst = timeEl?.getAttribute('datetime') ?? ''
    expect(Date.parse(afterFirst)).toBeGreaterThanOrEqual(Date.parse(launchDatetime))
    expect(timeEl?.textContent).toBe('just now')

    // A repeat status frame is NOT a transition: the timestamp holds.
    const heldBeforeRepeat = timeEl?.getAttribute('datetime')
    pushToLatest(RUNNING)
    await new Promise(resolve => setTimeout(resolve, 30))
    expect(timeEl?.getAttribute('datetime')).toBe(heldBeforeRepeat)

    // waiting_for_approval: the same compact line, its own vocabulary.
    pushToLatest(WAITING_APPROVAL)
    await vi.waitFor(() => expect(card.querySelector('[data-role="run-status"]')?.textContent).toBe('Waiting for approval'))
    const waitingApproval = outputEl?.querySelector<HTMLElement>('[data-role="run-waiting"]')
    expect(waitingApproval?.className).toContain('status-waiting-for-approval')
    expect(waitingApproval?.textContent).toBe('Waiting for approval')
    expect(Date.parse(timeEl?.getAttribute('datetime') ?? '')).toBeGreaterThanOrEqual(Date.parse(afterFirst))
  })

  it('output renders as allowlist Markdown DOM; injection payloads degrade to literal text (rm-1440)', async () => {
    const {pushToLatest} = stubFlowFetch()
    const launchModule = await importLaunchWithRealStream()
    const card = await launchCard(launchModule)
    const outputEl = card.querySelector<HTMLElement>('[data-role="run-output"]')

    pushToLatest(READY + RUNNING)
    await vi.waitFor(() => expect(outputEl?.querySelector('[data-role="run-waiting"]')).not.toBeNull())

    pushToLatest(outputFrame('Deployed **v1.2.3** to `prod`\n<script>alert(1)</script> and <img src=x onerror=alert(1)>', 0, false))
    await vi.waitFor(() => expect(outputEl?.querySelector('strong')).not.toBeNull())

    // Waiting state is gone once real output exists.
    expect(outputEl?.querySelector('[data-role="run-waiting"]')).toBeNull()

    // Markdown allowlist built real DOM.
    expect(outputEl?.querySelector('strong')?.textContent).toBe('v1.2.3')
    expect(outputEl?.querySelector('code')?.textContent).toBe('prod')

    // Injection safety: no script/img elements ever; payload text is literal.
    expect(outputEl?.querySelector('script')).toBeNull()
    expect(outputEl?.querySelector('img')).toBeNull()
    expect(outputEl?.textContent).toContain('<script>alert(1)</script>')
    expect(outputEl?.textContent).toContain('<img src=x onerror=alert(1)>')

    // Change-guard: a status-only frame (no transition, no new text) must not
    // rebuild the output DOM — the same strong node stays attached.
    const strongEl = outputEl?.querySelector('strong') ?? null
    expect(strongEl).not.toBeNull()
    pushToLatest(RUNNING)
    await new Promise(resolve => setTimeout(resolve, 30))
    expect(outputEl?.contains(strongEl as Node)).toBe(true)
    expect(outputEl?.querySelector('strong')).toBe(strongEl)
  })

  it('lists, code fences and finals render; a terminal frame keeps output and stops the waiting state (rm-1440)', async () => {
    const {pushToLatest} = stubFlowFetch()
    const launchModule = await importLaunchWithRealStream()
    const card = await launchCard(launchModule)
    const outputEl = card.querySelector<HTMLElement>('[data-role="run-output"]')

    pushToLatest(READY + RUNNING)
    await vi.waitFor(() => expect(outputEl?.querySelector('[data-role="run-waiting"]')).not.toBeNull())

    pushToLatest(outputFrame('- one\n- two\n\n```js\nconst ok = 1\n```', 0, false))
    await vi.waitFor(() => expect(outputEl?.querySelectorAll('li')).toHaveLength(2))

    expect(outputEl?.querySelectorAll('li')[0]?.textContent).toBe('one')
    expect(outputEl?.querySelectorAll('li')[1]?.textContent).toBe('two')
    expect(outputEl?.querySelectorAll('li')[0]?.querySelector('strong')).toBeNull()
    const pre = outputEl?.querySelector('pre')
    expect(pre?.dataset.role).toBe('run-output-code')
    expect(pre?.dataset.streamPartial).toBeUndefined()
    expect(pre?.querySelector('code')?.textContent).toBe('const ok = 1')

    // Terminal: output persists, no waiting line, output stays visible.
    pushToLatest(outputFrame('final **answer**', 1, true) + SUCCEEDED)
    await vi.waitFor(() => expect(card.querySelector('[data-role="run-status"]')?.textContent).toBe('Succeeded'))
    expect(outputEl?.querySelector('[data-role="run-waiting"]')).toBeNull()
    expect(outputEl?.querySelector('strong')?.textContent).toBe('answer')
    expect(outputEl?.hidden).toBe(false)
  })

  it('a terminal run with an authoritative empty final collapses the output region instead of waiting (rm-1441)', async () => {
    const {pushToLatest} = stubFlowFetch()
    const launchModule = await importLaunchWithRealStream()
    const card = await launchCard(launchModule)
    const outputEl = card.querySelector<HTMLElement>('[data-role="run-output"]')

    pushToLatest(READY + RUNNING)
    await vi.waitFor(() => expect(outputEl?.querySelector('[data-role="run-waiting"]')).not.toBeNull())

    pushToLatest(outputFrame('', 0, true) + SUCCEEDED)
    await vi.waitFor(() => expect(card.querySelector('[data-role="run-status"]')?.textContent).toBe('Succeeded'))

    // Terminal + authoritative no-output: hidden and empty, never a waiting line.
    expect(outputEl?.hidden).toBe(true)
    expect(outputEl?.textContent).toBe('')
    expect(outputEl?.querySelector('[data-role="run-waiting"]')).toBeNull()
  })
})
