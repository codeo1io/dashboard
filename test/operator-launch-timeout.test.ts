// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {
  buildLaunchClient,
  initOperatorLaunch,
  resetLaunchState,
} from '../public/operator-launch.js'

// ---------------------------------------------------------------------------
// rm-1983 — hung-fetch fixtures proving the operator-launch client's bounded
// waits (browserFetch per-call timeouts) and the DOM form's recovery.
//
// globalThis.fetch is stubbed to a promise that NEVER settles on its own — it
// rejects only when the request's abort signal fires (or fired). AbortSignal
// .timeout is spied to controllable signals, so no test ever waits real
// seconds. What is under test is the wiring itself: without browserFetch's
// timeout binding, these promises would never settle and every assertion here
// would hang until the Vitest timeout — the bound failing IS the regression
// signal (an operator's form wedging forever on a hung gateway).
// ---------------------------------------------------------------------------

/**
 * Install a fetch stub that never resolves by itself. It rejects with a
 * TimeoutError-named Error only via the request's abort signal.
 */
function installHungFetch(resolveImmediately?: (input: unknown) => Response | undefined): {
  urls: string[]
} {
  const urls: string[] = []
  vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    urls.push(String(input))
    const immediate = resolveImmediately?.(input)
    if (immediate !== undefined) return Promise.resolve(immediate)
    return new Promise<Response>((_resolve, reject) => {
      const rejectWithTimeout = () => {
        const err = new Error('The operation was aborted due to timeout')
        err.name = 'TimeoutError'
        reject(err)
      }
      const signal = init?.signal
      if (signal?.aborted) rejectWithTimeout()
      else signal?.addEventListener('abort', () => rejectWithTimeout(), {once: true})
    })
  }))
  return {urls}
}

/** Spy AbortSignal.timeout to a fresh controllable signal per call. */
function installControllableTimeout(): {controllers: AbortController[]; firePending: () => void} {
  const controllers: AbortController[] = []
  vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => {
    const controller = new AbortController()
    controllers.push(controller)
    return controller.signal
  })
  return {controllers, firePending: () => { for (const c of controllers) c.abort() }}
}

const LAUNCH_TIMEOUT_COPY = 'Launch timed out. Please try again.'
const PICKER_TIMEOUT_COPY = 'Repository list unavailable — the gateway did not respond.'

function mountLaunchDom(): void {
  document.body.innerHTML = `
    <div id="repo-picker-container"></div>
    <form id="launch-form">
      <input name="repo" value="fro-bot/agent" />
      <input name="prompt" value="ship it" />
      <button type="submit" id="launch-submit">Launch</button>
    </form>
    <div id="launch-error" hidden></div>`
}

beforeEach(() => {
  resetLaunchState()
  mountLaunchDom()
})

afterEach(() => {
  resetLaunchState()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('operator-launch browserFetch — bounded waits (rm-1983)', () => {
  it('a hung fetch rejects with kind "timeout" once the bound elapses — never hangs', async () => {
    installHungFetch()
    const {controllers, firePending} = installControllableTimeout()
    const client = buildLaunchClient()

    const pending = client.refreshCsrf()
    // The fetch is in flight (signal registered) — abort it as the bound would.
    await vi.waitFor(() => expect(controllers.length).toBe(1))
    firePending()

    await expect(pending).resolves.toEqual({success: false, error: {kind: 'timeout', message: 'network error'}})
  })

  it('listRepos timeout renders the coarse picker copy (no cause inference)', async () => {
    installHungFetch()
    const {controllers, firePending} = installControllableTimeout()

    const initPromise = initOperatorLaunch()
    // The hung listRepos fetch registered its timeout signal — fire it so init can finish.
    await vi.waitFor(() => expect(controllers.length).toBeGreaterThanOrEqual(1))
    firePending()
    await initPromise

    expect(document.querySelector('#repo-picker-container')?.textContent).toBe(PICKER_TIMEOUT_COPY)
  })
})

describe('operator-launch form recovery within the bound (rm-1983)', () => {
  it('hung refreshCsrf → button re-enabled, timeout copy, no wedge', async () => {
    installHungFetch()
    const {controllers, firePending} = installControllableTimeout()

    const initPromise = initOperatorLaunch()
    await vi.waitFor(() => expect(controllers.length).toBeGreaterThanOrEqual(1))
    firePending()
    await initPromise

    const form = document.querySelector('#launch-form') as HTMLFormElement
    const button = form.querySelector<HTMLButtonElement>('[type="submit"]')

    form.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}))
    // Handler disables the submit button before the first await.
    expect(button?.disabled).toBe(true)

    await vi.waitFor(() => expect(controllers.length).toBeGreaterThanOrEqual(2))
    firePending()

    await vi.waitFor(() => {
      expect(button?.disabled).toBe(false)
      expect(document.querySelector('#launch-error')?.textContent).toBe(LAUNCH_TIMEOUT_COPY)
    })
    expect((document.querySelector('#launch-error') as HTMLElement).hidden).toBe(false)
  })

  it('hung launchRun (csrf instant) → same bounded recovery', async () => {
    installHungFetch((input) => String(input).endsWith('/session/csrf')
      ? new Response(JSON.stringify({csrfToken: 'tok-hung'}), {status: 200, headers: {'content-type': 'application/json'}})
      : undefined)
    const {controllers, firePending} = installControllableTimeout()

    const initPromise = initOperatorLaunch()
    await vi.waitFor(() => expect(controllers.length).toBeGreaterThanOrEqual(1))
    firePending()
    await initPromise

    const form = document.querySelector('#launch-form') as HTMLFormElement
    const button = form.querySelector<HTMLButtonElement>('[type="submit"]')

    form.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}))
    expect(button?.disabled).toBe(true)

    // csrf resolved instantly; the launch POST is the hung one — abort it.
    await vi.waitFor(() => expect(controllers.length).toBeGreaterThanOrEqual(3))
    firePending()

    await vi.waitFor(() => {
      expect(button?.disabled).toBe(false)
      expect(document.querySelector('#launch-error')?.textContent).toBe(LAUNCH_TIMEOUT_COPY)
    })
  })
})
