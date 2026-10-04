// @vitest-environment jsdom
/**
 * rm-628 / rm-629 — launch submit flow: staleness guard + submit abort.
 *
 * These drive runLaunchSubmit — the extracted production submit path — with an
 * injected client (Result-shaped contracts) and a minimal operator DOM. The
 * /static/ stream-module import is never reached because every test passes an
 * onRunLaunched callback (the runtime path); auto-start is inert because the
 * module loads before this file mounts #launch-form.
 */
import {afterEach, describe, expect, it, vi} from 'vitest'
// No ?manual=1 needed: the module's auto-start is inert unless #launch-form
// is present at load time, and this file mounts the form only inside tests.
// Type-checked by web/tsconfig.json (DOM lib) per the operator-runtime.test.ts
// routing precedent; root tsconfig excludes this file.
import {resetLaunchState, runLaunchSubmit, setLaunchGeneration} from '../public/operator-launch.js'

interface LaunchOk {
  success: true
  data: {runId: string}
}

interface CsrfOk {
  success: true
  data: {csrfToken: string}
}

interface DeferredClient {
  client: {
    refreshCsrf: (signal?: AbortSignal) => Promise<CsrfOk>
    launchRun: (request: unknown, signal?: AbortSignal) => Promise<LaunchOk>
  }
  csrfSignals: (AbortSignal | undefined)[]
  launchSignals: (AbortSignal | undefined)[]
  launchRequests: unknown[]
  resolveLaunch: (value: LaunchOk) => void
}

function mountFixture() {
  document.body.innerHTML = `
    <form id="launch-form">
      <input id="launch-repo-input" name="repo" value="fro-bot/agent" />
      <textarea id="launch-prompt" name="prompt" rows="4"></textarea>
      <button type="submit">Launch</button>
      <output id="launch-error" hidden></output>
    </form>
    <div data-role="run-index-list"></div>
    <div data-role="stream-status" hidden></div>
    <aside id="shared-notice" hidden></aside>
  `
  const promptEl = document.querySelector('#launch-prompt')
  if (!(promptEl instanceof HTMLTextAreaElement)) throw new Error('fixture missing #launch-prompt')
  return {
    launchForm: document.querySelector('#launch-form'),
    launchError: document.querySelector('#launch-error'),
    runIndexList: document.querySelector('[data-role="run-index-list"]'),
    sharedNoticeEl: document.querySelector('#shared-notice'),
    promptEl,
  }
}

function makeDeferredClient(): DeferredClient {
  const csrfSignals: (AbortSignal | undefined)[] = []
  const launchSignals: (AbortSignal | undefined)[] = []
  const launchRequests: unknown[] = []
  let resolveLaunch!: (value: LaunchOk) => void
  const launchPromise = new Promise<LaunchOk>(resolve => {
    resolveLaunch = resolve
  })
  const abortError = () => Object.assign(new Error('This operation was aborted'), {name: 'AbortError'})
  const raceAbort = async <T,>(signal: AbortSignal | undefined, promise: Promise<T>): Promise<T> => {
    if (signal?.aborted) throw abortError()
    return new Promise<T>((resolve, reject) => {
      signal?.addEventListener('abort', () => reject(abortError()), {once: true})
      promise.then(resolve, reject)
    })
  }
  const client = {
    refreshCsrf: async (signal?: AbortSignal): Promise<CsrfOk> => {
      csrfSignals.push(signal)
      return {success: true, data: {csrfToken: 'test-csrf'}}
    },
    launchRun: async (request: unknown, signal?: AbortSignal): Promise<LaunchOk> => {
      launchRequests.push(request)
      launchSignals.push(signal)
      // Real-fetch semantics: reject with AbortError when the submit's signal
      // is aborted — otherwise an aborted POST would hang the test forever.
      return raceAbort(signal, launchPromise)
    },
  }
  return {client, csrfSignals, launchSignals, launchRequests, resolveLaunch}
}

async function startSubmit(
  dom: ReturnType<typeof mountFixture>,
  client: DeferredClient['client'],
  onRunLaunched: (runId: string, card: unknown) => void,
  generation: number,
): Promise<void> {
  // NOTE: returns the submit's own promise WITHOUT awaiting it — tests must
  // observe mid-flight state (validation passed, POST in flight) before they
  // resolve the deferred launch response.
  return runLaunchSubmit({
    client,
    launchForm: dom.launchForm,
    launchError: dom.launchError,
    runIndexList: dom.runIndexList,
    sharedNoticeEl: dom.sharedNoticeEl,
    onRunLaunched,
    myGeneration: generation,
    abortController: new AbortController(),
    opts: undefined,
  }) as Promise<void>
}

afterEach(() => {
  resetLaunchState()
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('runLaunchSubmit staleness guard (rm-628)', () => {
  it('applies the launched outcome on the live tree when the generation is current', async () => {
    const dom = mountFixture()
    const {client, resolveLaunch} = makeDeferredClient()
    const onRunLaunched = vi.fn()
    const launchSuccess = vi.fn()
    document.addEventListener('launch-success', launchSuccess)
    setLaunchGeneration(11)
    dom.promptEl.value = 'operator prompt'

    const pending = startSubmit(dom, client, onRunLaunched, 11)
    await vi.waitFor(() => {
      if (dom.launchError !== null && dom.launchError.textContent !== '') {
        throw new Error(`validation bailed: ${dom.launchError.textContent}`)
      }
    })
    resolveLaunch({success: true, data: {runId: 'run_1'}})
    await pending

    if (dom.runIndexList === null) throw new Error('fixture missing run-index-list')
    expect(dom.runIndexList.children.length).toBeGreaterThan(0)
    expect(dom.promptEl.value).toBe('')
    expect(onRunLaunched).toHaveBeenCalledTimes(1)
    expect(onRunLaunched.mock.calls[0]?.[0]).toBe('run_1')
    expect(launchSuccess).toHaveBeenCalled()
    document.removeEventListener('launch-success', launchSuccess)
  })

  it('does NOT mutate the live tree when a reset superseded the submit generation mid-flight', async () => {
    const dom = mountFixture()
    const {client, resolveLaunch} = makeDeferredClient()
    const onRunLaunched = vi.fn()
    const launchSuccess = vi.fn()
    document.addEventListener('launch-success', launchSuccess)
    setLaunchGeneration(21)
    dom.promptEl.value = 'prompt drafted before re-init'

    const pending = startSubmit(dom, client, onRunLaunched, 21)
    await vi.waitFor(() => {
      if (dom.launchError !== null && dom.launchError.textContent !== '') {
        throw new Error(`validation bailed: ${dom.launchError.textContent}`)
      }
    })

    // A runtime cleanup/re-init supersedes the submit's generation mid-flight.
    resetLaunchState()
    resolveLaunch({success: true, data: {runId: 'run_stale'}})
    await pending

    if (dom.runIndexList === null) throw new Error('fixture missing run-index-list')
    expect(dom.runIndexList.children.length).toBe(0)
    expect(dom.promptEl.value).toBe('prompt drafted before re-init')
    expect(onRunLaunched).not.toHaveBeenCalled()
    expect(launchSuccess).not.toHaveBeenCalled()
    document.removeEventListener('launch-success', launchSuccess)
  })
})

describe('runLaunchSubmit submit abort (rm-629)', () => {
  it('plumbs the AbortSignal into refreshCsrf and launchRun', async () => {
    const dom = mountFixture()
    const {client, csrfSignals, launchSignals, resolveLaunch} = makeDeferredClient()
    const onRunLaunched = vi.fn()
    setLaunchGeneration(31)
    dom.promptEl.value = 'signal plumbing'

    const pending = startSubmit(dom, client, onRunLaunched, 31)
    await vi.waitFor(() => expect(launchSignals.length).toBe(1))

    const csrfSignal = csrfSignals[0]
    const launchSignal = launchSignals[0]
    // One controller for the whole submit: CSRF fetch and launch POST share it
    // (the module-minted rm-629 controller — deps.abortController is the init's
    // staleness controller, a different lifecycle).
    expect(csrfSignal).toBeInstanceOf(AbortSignal)
    expect(csrfSignal).toBe(launchSignal)
    expect(launchSignal?.aborted).toBe(false)
    resolveLaunch({success: true, data: {runId: 'run_2'}})
    await pending
    expect(onRunLaunched).toHaveBeenCalledTimes(1)
    expect(onRunLaunched.mock.calls[0]?.[0]).toBe('run_2')
  })

  it('resetLaunchState aborts the in-flight submit registered for the current generation', async () => {
    const dom = mountFixture()
    const {client, launchSignals} = makeDeferredClient()
    const onRunLaunched = vi.fn()
    setLaunchGeneration(41)
    dom.promptEl.value = 'abort on reset'

    const pending = startSubmit(dom, client, onRunLaunched, 41)
    await vi.waitFor(() => expect(launchSignals.length).toBe(1))

    resetLaunchState()
    // The module-minted submit controller (whose signal the fake client
    // recorded) is aborted by the reset that owns its generation.
    expect(launchSignals[0]?.aborted).toBe(true)
    await pending
  })

  it('a superseded reset does NOT abort a newer generation submit', async () => {
    const dom = mountFixture()
    const {client, launchSignals, resolveLaunch} = makeDeferredClient()
    const onRunLaunched = vi.fn()
    setLaunchGeneration(51)
    dom.promptEl.value = 'ownership check'

    const pending = startSubmit(dom, client, onRunLaunched, 51)
    await vi.waitFor(() => expect(launchSignals.length).toBe(1))

    // A newer init already bumped the generation to 52; a reset arriving now
    // must not abort a submit registered against 51 — ownership mismatches.
    setLaunchGeneration(52)
    resetLaunchState()
    expect(launchSignals[0]?.aborted).toBe(false)

    resolveLaunch({success: true, data: {runId: 'run_3'}})
    await pending
    // Generation 51 is stale by then — guard holds; nothing applied.
    expect(onRunLaunched).not.toHaveBeenCalled()
  })
})
