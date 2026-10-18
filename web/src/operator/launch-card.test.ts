/**
 * Behavioral test for the optimistic card public/operator-launch.js builds after a
 * successful launch: it runs the real submit path, with the stream module import and
 * fetch stubbed, and inspects the card that lands in the run-index list.
 *
 * Also pins the rm-1522 browser-memory prompt echo: the prompt is echoed on the
 * optimistic card only, from in-memory submit text — never on cards built from
 * fetched run data (the echo disappears on reload).
 */

import {afterEach, describe, expect, it, vi} from 'vitest'
import {initOperatorRunIndex, resetRunIndexState} from '../../../public/operator-run-index.js'

type LaunchModule = typeof import('../../../public/operator-launch.js')

// The specifier initOperatorLaunch imports (the core test pins streamModuleSpecifier() to it).
const STREAM_SPECIFIER = '/static/operator-stream.js?manual=1'

/**
 * The module auto-starts on import when a document exists, importing the stream module.
 * That import must therefore already be mocked, and the document is still empty, so the
 * auto-start finds nothing to wire.
 */
async function importLaunchModuleWithStreamMock(): Promise<LaunchModule> {
  vi.doMock(STREAM_SPECIFIER, () => ({
    initOperatorStream: vi.fn(),
    takeUsableFinishedRun: vi.fn(() => undefined),
    pruneFinishedRuns: vi.fn(),
    clearFinishedRuns: vi.fn(),
  }))
  return import('../../../public/operator-launch.js')
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {status, headers: {'content-type': 'application/json'}})
}

let launchModule: LaunchModule | undefined

afterEach(() => {
  launchModule?.resetLaunchState()
  resetRunIndexState()
  document.body.innerHTML = ''
  vi.doUnmock(STREAM_SPECIFIER)
  vi.unstubAllGlobals()
})

/**
 * Run the real submit path and return the optimistic card it inserts, the module,
 * and the fetch mock (so tests can assert on the exact requests that were made).
 */
async function launchOptimisticCard(promptText = 'do the thing'): Promise<{module: LaunchModule, card: HTMLElement, fetchMock: ReturnType<typeof vi.fn>}> {
  launchModule = await importLaunchModuleWithStreamMock()
  const fetchMock = vi.fn(async (input: string, _init?: RequestInit) => {
    if (input.endsWith('/session/csrf')) return jsonResponse(200, {csrfToken: 'tok-card'})
    if (input.endsWith('/repos')) return jsonResponse(200, [{owner: 'fro-bot', repo: 'agent'}])
    if (input.endsWith('/runs')) return jsonResponse(202, {runId: 'run-card-001'})
    return jsonResponse(404, {})
  })
  vi.stubGlobal('fetch', fetchMock)
  document.body.innerHTML = `
    <div id="repo-picker-container"></div>
    <form id="launch-form"><textarea name="prompt"></textarea><button type="submit">Launch</button></form>
    <p id="launch-error" hidden></p>
    <div data-role="run-index-list"></div>`
  const form = document.querySelector<HTMLFormElement>('#launch-form')
  const prompt = document.querySelector<HTMLTextAreaElement>('textarea[name="prompt"]')
  expect(form).not.toBeNull()
  expect(prompt).not.toBeNull()

  const launched = new Promise<HTMLElement>(resolve => {
    launchModule?.initOperatorLaunch({onRunLaunched: (_runId: string, card: HTMLElement) => resolve(card)})?.then(() => {
      if (prompt !== null) prompt.value = promptText
      form?.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}))
    })
  })
  const card = await launched
  return {module: launchModule, card, fetchMock}
}

/** The launch POST request the stubbed fetch received, if any. */
function launchedPostCall(fetchMock: ReturnType<typeof vi.fn>): {url: string, init: RequestInit} | undefined {
  return fetchMock.mock.calls
    .map(call => ({url: String(call[0]), init: call[1] as RequestInit}))
    .find(call => call.url.endsWith('/runs') && call.init?.method === 'POST')
}

describe('optimistic launch card', () => {
  it('a successful launch inserts a card with exactly one hidden, empty checkout-detail region right after the header row', async () => {
    const {card} = await launchOptimisticCard()

    expect(card.dataset.runId).toBe('run-card-001')
    expect(document.querySelector('[data-role="run-index-list"]')?.firstElementChild).toBe(card)

    const regions = card.querySelectorAll<HTMLElement>('[data-role="run-checkout-detail"]')
    expect(regions).toHaveLength(1)
    const region = regions[0]
    expect(region?.hidden).toBe(true)
    expect(region?.textContent).toBe('')
    expect(region?.parentElement).toBe(card)

    const roles = Array.from(card.children).map(child => (child as HTMLElement).dataset.role)
    const at = roles.indexOf('run-checkout-detail')
    expect(roles[at - 1]).toBe('run-prompt') // checkout detail stays the first hidden region
    expect(roles[at + 1]).toBe('run-waiting')
  })

  it('the optimistic card has exactly one hidden, empty run-waiting region between checkout-detail and run-output', async () => {
    const {card} = await launchOptimisticCard()

    const regions = card.querySelectorAll<HTMLElement>('[data-role="run-waiting"]')
    expect(regions).toHaveLength(1)
    const region = regions[0]
    expect(region?.hidden).toBe(true)
    expect(region?.textContent).toBe('')
    expect(region?.parentElement).toBe(card)

    const roles = Array.from(card.children).map(child => (child as HTMLElement).dataset.role)
    const at = roles.indexOf('run-waiting')
    expect(roles[at - 1]).toBe('run-checkout-detail')
    expect(roles[at + 1]).toBe('run-output')
  })

  it('the optimistic card carries one launch-seeded <time> between the repo label and the first region', async () => {
    const before = Date.now()
    const {card} = await launchOptimisticCard()
    const after = Date.now()

    const times = card.querySelectorAll<HTMLElement>('time')
    expect(times).toHaveLength(1)
    const timeEl = times[0]
    expect(timeEl?.parentElement).toBe(card)
    expect(timeEl?.className).toBe('run-updated-at')
    expect(timeEl?.dataset.role).toBe('run-updated-at')
    expect(timeEl?.dataset.timeSource).toBe('launch')
    expect(timeEl?.textContent).toBe('just now')

    // The datetime is the launch instant, as a canonical ISO string.
    const datetime = timeEl?.getAttribute('datetime') ?? ''
    expect(new Date(datetime).toISOString()).toBe(datetime)
    expect(Date.parse(datetime)).toBeGreaterThanOrEqual(before)
    expect(Date.parse(datetime)).toBeLessThanOrEqual(after)

    const roles = Array.from(card.children).map(child => (child as HTMLElement).dataset.role)
    expect(roles.indexOf('run-updated-at')).toBe(roles.indexOf('run-repo') + 1)
    expect(roles.indexOf('run-prompt')).toBe(roles.indexOf('run-updated-at') + 1)
    expect(roles.indexOf('run-prompt')).toBe(roles.indexOf('run-checkout-detail') - 1)
  })

  it('the seeded <time> is plain text with no child nodes, and the card gains no other time-related attribute', async () => {
    const {card} = await launchOptimisticCard()

    const timeEl = card.querySelector<HTMLElement>('time')
    expect(timeEl?.children).toHaveLength(0)
    expect(timeEl?.childNodes).toHaveLength(1)
    expect(timeEl?.firstChild?.nodeType).toBe(Node.TEXT_NODE)
    expect(Array.from(card.attributes).map(attr => attr.name).filter(name => name.includes('time'))).toEqual([])
  })

  it('the optimistic card contains exactly one hidden, empty run-questions region directly after run-approvals', async () => {
    const {card} = await launchOptimisticCard()

    const regions = card.querySelectorAll<HTMLElement>('[data-role="run-questions"]')
    expect(regions).toHaveLength(1)
    const region = regions[0]
    expect(region?.hidden).toBe(true)
    expect(region?.textContent).toBe('')
    expect(region?.parentElement).toBe(card)

    const roles = Array.from(card.children).map(child => (child as HTMLElement).dataset.role)
    const at = roles.indexOf('run-questions')
    expect(roles[at - 1]).toBe('run-approvals')
    expect(roles[at + 1]).toBe('approval-badge')
  })
})

describe('launch-card prompt echo (rm-1522 browser-memory half)', () => {
  it('renders the prompt on the optimistic card from browser memory only', async () => {
    const {module, card, fetchMock} = await launchOptimisticCard('ship the release')
    expect(module).toBeTruthy()
    const echoes = Array.from(card.querySelectorAll('[data-role="run-prompt"]'))
    expect(echoes.length).toBe(1)
    const echo = echoes[0]
    expect(echo?.textContent).toBe('ship the release')
    expect(echo?.className).toBe('run-prompt')
    // textContent only: a single text node, never markup
    expect(echo?.childNodes.length).toBe(1)
    expect(echo?.childNodes[0]?.nodeType).toBe(Node.TEXT_NODE)
    const roles = Array.from(card.children).map((child) => (child as HTMLElement).getAttribute('data-role'))
    expect(roles.indexOf('run-prompt')).toBe(roles.indexOf('run-updated-at') + 1)
    expect(roles.indexOf('run-prompt')).toBe(roles.indexOf('run-checkout-detail') - 1)
    // The POST body stays the only other place the prompt exists, verbatim.
    const post = launchedPostCall(fetchMock)
    expect(post).toBeTruthy()
    expect(JSON.parse(String(post?.init.body)).prompt).toBe('ship the release')
    // Browser memory only: exactly one echo in the whole document
    expect(document.querySelectorAll('[data-role="run-prompt"]').length).toBe(1)
  })

  it('caps the echo for display while sending the full prompt in the POST body', async () => {
    const long = 'p'.repeat(400)
    const {card, fetchMock} = await launchOptimisticCard(long)
    const echo = card.querySelector('[data-role="run-prompt"]')
    // MAX_PROMPT_ECHO_CHARS parity with MAX_CHECKOUT_STRING_CHARS: 256 total, ellipsis included.
    expect(echo?.textContent).toBe('p'.repeat(255) + '…')
    const post = launchedPostCall(fetchMock)
    expect(JSON.parse(String(post?.init.body)).prompt).toBe(long)
  })

  it('never leaves half a surrogate pair at the cap cut', async () => {
    const prompt = 'x'.repeat(254) + '👍' + 'z'.repeat(50)
    const {card} = await launchOptimisticCard(prompt)
    // The cut lands on the high surrogate of 👍, which is dropped with the ellipsis taking its place.
    expect(card.querySelector('[data-role="run-prompt"]')?.textContent).toBe('x'.repeat(254) + '…')
  })

  it('strips control and bidi characters from the echo but not from the POST body', async () => {
    const raw = 'a\u202Eb\u0000c' + 'y'.repeat(300)
    const {card, fetchMock} = await launchOptimisticCard(raw)
    // Display: stripped, then capped at 256 including the ellipsis.
    expect(card.querySelector('[data-role="run-prompt"]')?.textContent).toBe('abc' + 'y'.repeat(252) + '…')
    // Wire: the POST body carries the prompt verbatim — sanitization is display-only.
    const post = launchedPostCall(fetchMock)
    expect(JSON.parse(String(post?.init.body)).prompt).toBe(raw)
  })

  it('a reloaded (fetched) run list renders no prompt echo — the echo is browser memory only', async () => {
    const fetchMock = vi.fn(async (input: string) => {
      if (input.endsWith('/runs')) {
        return jsonResponse(200, {runs: [{runId: 'run-fetched-001', repo: 'fro-bot/agent', status: 'running', createdAt: '2026-06-26T12:00:00.000Z'}]})
      }
      return jsonResponse(404, {})
    })
    vi.stubGlobal('fetch', fetchMock)
    document.body.innerHTML = '<section data-role="run-index"><div data-role="run-index-list"></div></section>'
    resetRunIndexState()
    await initOperatorRunIndex({endpointBase: '/operator'})

    const list = document.querySelector('[data-role="run-index-list"]')
    // Non-vacuous: the fetched run rendered a card.
    expect(list?.children.length).toBe(1)
    // The reload boundary: fetched run data never carries the prompt.
    expect(document.querySelectorAll('[data-role="run-prompt"]')).toHaveLength(0)
  })
})
