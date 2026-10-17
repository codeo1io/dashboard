/**
 * Behavioral test for the optimistic card public/operator-launch.js builds after a
 * successful launch: it runs the real submit path, with the stream module import and
 * fetch stubbed, and inspects the card that lands in the run-index list.
 */

import {afterEach, describe, expect, it, vi} from 'vitest'

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

describe('optimistic launch card', () => {
  let launchModule: LaunchModule | undefined

  afterEach(() => {
    launchModule?.resetLaunchState()
    document.body.innerHTML = ''
    vi.doUnmock(STREAM_SPECIFIER)
    vi.unstubAllGlobals()
  })

  /** Run the real submit path and return the optimistic card it inserts. */
  async function launchOptimisticCard(): Promise<HTMLElement> {
    launchModule = await importLaunchModuleWithStreamMock()
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      if (input.endsWith('/session/csrf')) return jsonResponse(200, {csrfToken: 'tok-card'})
      if (input.endsWith('/repos')) return jsonResponse(200, [{owner: 'fro-bot', repo: 'agent'}])
      if (input.endsWith('/runs')) return jsonResponse(202, {runId: 'run-card-001'})
      return jsonResponse(404, {})
    }))
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
        if (prompt !== null) prompt.value = 'do the thing'
        form?.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}))
      })
    })
    return launched
  }

  it('a successful launch inserts a card with exactly one hidden, empty checkout-detail region right after the header row', async () => {
    const card = await launchOptimisticCard()

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
    const card = await launchOptimisticCard()

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
    const card = await launchOptimisticCard()
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
    const card = await launchOptimisticCard()

    const timeEl = card.querySelector<HTMLElement>('time')
    expect(timeEl?.children).toHaveLength(0)
    expect(timeEl?.childNodes).toHaveLength(1)
    expect(timeEl?.firstChild?.nodeType).toBe(Node.TEXT_NODE)
    expect(Array.from(card.attributes).map(attr => attr.name).filter(name => name.includes('time'))).toEqual([])
  })

  it('the optimistic card contains exactly one hidden, empty run-questions region directly after run-approvals', async () => {
    const card = await launchOptimisticCard()

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
    const { module, card, fetchMock } = await launchOptimisticCard('ship the release')
    expect(module).toBeTruthy()
    const echoes = Array.from(card.querySelectorAll('[data-role="run-prompt"]'))
    expect(echoes.length).toBe(1)
    const echo = echoes[0]
    expect(echo.textContent).toBe('ship the release')
    expect(echo.className).toBe('run-prompt')
    // textContent only: a single text node, never markup
    expect(echo.childNodes.length).toBe(1)
    expect(echo.childNodes[0].nodeType).toBe(Node.TEXT_NODE)
    const roles = Array.from(card.children).map((child) => child.getAttribute('data-role'))
    expect(roles.indexOf('run-prompt')).toBe(roles.indexOf('run-updated-at') + 1)
    expect(roles.indexOf('run-prompt')).toBe(roles.indexOf('run-checkout-detail') - 1)
    // The POST body stays the only other place the prompt exists
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ repo: 'demo-repo', prompt: 'ship the release' }))
    // Browser memory only: exactly one echo in the whole document
    expect(document.querySelectorAll('[data-role="run-prompt"]').length).toBe(1)
  })

  it('caps the echo for display while sending the full prompt in the POST body', async () => {
    const long = 'p'.repeat(400)
    const { card, fetchMock } = await launchOptimisticCard(long)
    const echo = card.querySelector('[data-role="run-prompt"]')
    expect(echo.textContent).toBe('p'.repeat(300) + '\u2026')
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ repo: 'demo-repo', prompt: long }))
  })
})
