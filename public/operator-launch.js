/**
 * Operator launch entrypoint — pure core + thin DOM shell.
 *
 * This file is valid plain ES module that runs in a browser as-is (no TS syntax,
 * no imports of Node/TS modules). It is also directly importable by Vitest (Node 24
 * ESM) because it uses only standard JS. DOM-touching code lives exclusively inside
 * initOperatorLaunch() and is never executed at module top-level.
 *
 * Architecture: pure exports (mintIdempotencyKey, submitLaunch, buildPendingCardHooks)
 * are tested by test/operator-launch-core.test.ts without a browser.
 * The DOM shell (initOperatorLaunch) is the only part that touches document.*.
 *
 * Security invariants:
 * - Never console.log/console.error/console.warn prompt, csrf, idempotency key,
 *   runId (except in the data-run-id attribute), or repo names.
 * - Render only safe fields; no data-* / error-copy / analytics that echoes
 *   prompt/csrf/idempotency/runId in logs.
 * - All 400s collapse to one generic failure; 404 → one uniform unavailable state.
 * - No cause inference from body or timing.
 * - credentials:'include', redirect:'error' on all fetch calls.
 * - The prompt is user-typed and goes only in the POST body — never in logs or DOM.
 * - runId appears only in the data-run-id attribute and the stream URL.
 */

// Mirrors RUN_INDEX_CAP in operator-run-index.js. Not imported directly: this module
// and operator-run-index.js are loaded as separate dynamic-import instances (each
// carries its own ?manual=1 query string keyed module identity in the runtime seam),
// so a static import here would create a second, uncoordinated module instance with
// its own singleton state rather than sharing the runtime seam's instance.
const LAUNCH_RUN_INDEX_CAP = 100

// ---------------------------------------------------------------------------
// Pure: repo item validation
// ---------------------------------------------------------------------------

/**
 * Validate a single repo item from the listRepos response.
 *
 * A valid item must be a non-null object with string owner and string repo.
 * channelName is optional but must be a string if present.
 *
 * Returns true if the item is valid, false otherwise.
 * Exported so tests can exercise the validation logic directly.
 */
export function validateRepoItem(item) {
  if (item === null || typeof item !== 'object' || Array.isArray(item)) {
    return false
  }
  if (typeof item.owner !== 'string' || typeof item.repo !== 'string') {
    return false
  }
  if (item.channelName !== undefined && typeof item.channelName !== 'string') {
    return false
  }
  return true
}

// ---------------------------------------------------------------------------
// Pure: idempotency key minting
// ---------------------------------------------------------------------------

/**
 * Mint a fresh unique idempotency key for a launch submission.
 * Uses crypto.randomUUID() with a fallback for environments that lack it.
 * Browser-valid: crypto.randomUUID is available in all modern browsers.
 */
export function mintIdempotencyKey() {
  if (
    globalThis.crypto !== undefined &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID()
  }
  // Fallback: timestamp + random hex (not cryptographically strong, but unique enough)
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2)
  return `${ts}-${rand}`
}

// ---------------------------------------------------------------------------
// Pure: launch outcome state machine
// ---------------------------------------------------------------------------

/**
 * Submit a launch request through the injected client.
 *
 * State machine:
 *   1. refreshCsrf → on failure → {kind:'failure'}
 *   2. launchRun({repo, prompt, csrfToken, idempotencyKey})
 *      - 202 {runId} → {kind:'launched', runId}
 *      - 400 (post-selection) → refreshCsrf ONCE + retry ONCE reusing the SAME key
 *        - retry 202 → {kind:'launched', runId}
 *        - retry 400 → {kind:'failure'} (no third attempt)
 *      - 404 → {kind:'not-found'} (uniform, no cause)
 *      - 429 → {kind:'rate-limited'}
 *      - any other error → {kind:'failure'}
 *
 * The idempotency key is passed in (not minted here) so the caller can reuse it
 * across retries and the function remains pure/testable.
 *
 * @param {object} client - An object with refreshCsrf() and launchRun() methods
 * @param {{repo: string, prompt: string}} params - Launch parameters
 * @param {string} idempotencyKey - The idempotency key to use (reused on retry)
 * @param {AbortSignal} [signal] - rm-629: optional abort signal threaded through
 *   every fetch of the submit (initial CSRF, the POST, and the 400-retry pair).
 *   Aborting rejects the in-flight fetch so a superseded mount's POST never
 *   resolves onto a stale DOM tail; clients that ignore the extra argument are
 *   unaffected (backward compatible).
 * @returns {Promise<LaunchOutcome>} The launch outcome discriminated union.
 */
export async function submitLaunch(client, params, idempotencyKey, signal) {
  const {repo, prompt} = params

  // Step 1: Get initial CSRF token
  const csrfResult = await client.refreshCsrf(signal)
  if (!csrfResult.success) {
    return {kind: 'failure'}
  }
  const csrfToken = csrfResult.data.csrfToken

  // Step 2: Attempt launch
  const launchResult = await client.launchRun({repo, prompt, csrfToken, idempotencyKey}, signal)

  if (launchResult.success) {
    return {kind: 'launched', runId: launchResult.data.runId}
  }

  const error = launchResult.error

  // 404 → uniform not-found (no cause, no retry)
  if (error.kind === 'http' && error.status === 404) {
    return {kind: 'not-found'}
  }

  // 429 → rate-limited (no retry)
  if (error.kind === 'http' && error.status === 429) {
    return {kind: 'rate-limited'}
  }

  // 400 → refresh CSRF once and retry ONCE reusing the SAME idempotency key
  if (error.kind === 'http' && error.status === 400) {
    const retrycsrfResult = await client.refreshCsrf(signal)
    if (!retrycsrfResult.success) {
      return {kind: 'failure'}
    }
    const retryCsrfToken = retrycsrfResult.data.csrfToken

    const retryResult = await client.launchRun({
      repo,
      prompt,
      csrfToken: retryCsrfToken,
      idempotencyKey, // SAME key — dedupes a lost-response retry
    }, signal)

    if (retryResult.success) {
      return {kind: 'launched', runId: retryResult.data.runId}
    }

    // Second failure (any status) → generic failure, no further retry
    return {kind: 'failure'}
  }

  // Any other error (network, protocol, non-400/404/429 http) → failure
  return {kind: 'failure'}
}

// ---------------------------------------------------------------------------
// Pure: pending card hook descriptor
// ---------------------------------------------------------------------------

/**
 * Build the hook descriptor for an optimistic pending run card.
 *
 * Returns the runId and the CSS selectors needed to find the status element
 * and the shared stream-status notice element after the card is inserted.
 *
 * @param {string} runId
 * @returns {{runId: string, statusElSelector: string, noticeElSelector: string}} The hook descriptor.
 */
export function buildPendingCardHooks(runId) {
  return {
    runId,
    // Selector for the per-card run-status element (inside the card)
    statusElSelector: '[data-role="run-status"]',
    // Selector for the shared stream-status notice (in the run-status section)
    noticeElSelector: '[data-role="stream-status"]',
  }
}

// ---------------------------------------------------------------------------
// Pure: stream module specifier
// ---------------------------------------------------------------------------

/**
 * Returns the module specifier for operator-stream that includes ?manual=1.
 *
 * Using ?manual=1 ensures operator-stream's top-level auto-bootstrap guard
 * treats the import as a manual (React runtime) load and skips auto-bootstrap,
 * preventing double lifecycle ownership when launch imports stream.
 *
 * Exported so tests can assert the correct specifier without intercepting
 * dynamic imports.
 */
export function streamModuleSpecifier() {
  return '/static/operator-stream.js?manual=1'
}

// ---------------------------------------------------------------------------
// Pure: browser launch client builder
// ---------------------------------------------------------------------------

/**
 * Build a browser-direct launch client.
 *
 * Accepts an optional endpointBase (default: '/operator') so the runtime-loader
 * seam can configure a different endpoint base in dev mode without modifying
 * production behavior. The default is always '/operator'.
 *
 * Also accepts optional getScenario and fixtureSessionId for dev-mode launches.
 * These are included in the launch request body only when provided.
 *
 * Security:
 * - Never logs prompt, csrf, idempotency key, runId, or endpoint base.
 * - All 400s → one generic failure; 404 → one uniform unavailable.
 * - credentials:'include', redirect:'error' on all fetch calls.
 *
 * @param {object} [opts] - Optional configuration.
 * @param {string} [opts.endpointBase] - The endpoint base path. Defaults to '/operator'.
 * @param {() => string} [opts.getScenario] - Fixture scenario source (fixture mode only).
 * @param {string} [opts.fixtureSessionId] - Fixture session ID (fixture mode only).
 * @returns {object} A client with refreshCsrf, listRepos, and launchRun methods.
 */
export function buildLaunchClient(opts) {
  const endpointBase = opts?.endpointBase ?? '/operator'
  const getScenario = opts?.getScenario
  const fixtureSessionId = opts?.fixtureSessionId

  const browserFetch = (input, init) =>
    globalThis.fetch(input, {
      ...init,
      credentials: 'include',
      redirect: 'error',
    })

  return {
    async refreshCsrf(signal) {
      try {
        const res = await browserFetch(`${endpointBase}/session/csrf`, {
          headers: {'content-type': 'application/json'},
          signal,
        })
        if (!res.ok) return {success: false, error: {kind: 'http', status: res.status}}
        const data = await res.json()
        if (data === null || typeof data !== 'object' || typeof data.csrfToken !== 'string') {
          return {success: false, error: {kind: 'protocol', message: 'invalid csrf response'}}
        }
        return {success: true, data: {csrfToken: data.csrfToken}}
      } catch {
        return {success: false, error: {kind: 'network', message: 'network error'}}
      }
    },

    async listRepos() {
      try {
        const res = await browserFetch(`${endpointBase}/repos`, {
          headers: {'content-type': 'application/json'},
        })
        if (!res.ok) return {success: false, error: {kind: 'http', status: res.status}}
        const data = await res.json()
        if (!Array.isArray(data)) {
          return {success: false, error: {kind: 'protocol', message: 'invalid repos response'}}
        }
        for (const item of data) {
          if (!validateRepoItem(item)) {
            return {success: false, error: {kind: 'protocol', message: 'invalid repos response'}}
          }
        }
        return {success: true, data}
      } catch {
        return {success: false, error: {kind: 'network', message: 'network error'}}
      }
    },

    async launchRun(req, signal) {
      if (!req.csrfToken || req.csrfToken.trim() === '') {
        return {success: false, error: {kind: 'validation', code: 'missing_csrf', message: 'CSRF token required'}}
      }
      if (!req.idempotencyKey || req.idempotencyKey.trim() === '') {
        return {success: false, error: {kind: 'validation', code: 'missing_idempotency_key', message: 'Idempotency key required'}}
      }
      try {
        // Build the request body — include fixture fields only when provided.
        // getScenario() is called at submit time so scenario changes after init are reflected.
        const bodyObj = {repo: req.repo, prompt: req.prompt}
        const currentScenario = typeof getScenario === 'function' ? getScenario() : undefined
        if (currentScenario !== undefined) bodyObj.scenario = currentScenario
        if (fixtureSessionId !== undefined) bodyObj.fixtureSessionId = fixtureSessionId
        // idempotencyKey goes in the header for all requests (see below).
        // It is also included in the body only for fixture mode so the fixture
        // harness can correlate requests without reading headers.
        const isFixtureMode = currentScenario !== undefined || fixtureSessionId !== undefined
        if (isFixtureMode && req.idempotencyKey !== undefined) bodyObj.idempotencyKey = req.idempotencyKey

        const res = await browserFetch(`${endpointBase}/runs`, {
          method: 'POST',
          signal,
          redirect: 'error',
          headers: {
            'content-type': 'application/json',
            'x-csrf-token': req.csrfToken,
            'idempotency-key': req.idempotencyKey,
          },
          body: JSON.stringify(bodyObj),
        })
        if (res.status === 200 || res.status === 202) {
          const data = await res.json()
          if (typeof data.runId !== 'string' || data.runId === '') {
            return {success: false, error: {kind: 'protocol', message: 'invalid runId in launch response'}}
          }
          return {success: true, data: {runId: data.runId}}
        }
        return {success: false, error: {kind: 'http', status: res.status}}
      } catch {
        return {success: false, error: {kind: 'network', message: 'network error'}}
      }
    },
  }
}

// ---------------------------------------------------------------------------
// DOM shell — only runs in a browser (document must exist)
// ---------------------------------------------------------------------------

// Module-level state for the DOM shell lifecycle.
// _launchGeneration is a monotonically increasing counter. Each initOperatorLaunch()
// call captures its own generation at entry; resetLaunchState() increments the counter
// to invalidate all pending inits without clearing it to null (which would cause a
// fresh init resuming after reset to see a null mismatch and bail incorrectly).
// _launchListenerController is the AbortController passed to the active submit listener.
// _launchListenerGeneration is the generation value at the time the controller was set.
// resetLaunchState() only aborts the controller if _launchListenerGeneration matches
// the pre-increment generation — this prevents stale cleanup from aborting a listener
// registered by a newer init that started after the stale reset.
// _launchSubmitController (rm-629) is the AbortController for the in-flight launch
// POST (refreshCsrf + launchRun + the one CSRF-retry fetch). Same ownership pattern:
// resetLaunchState() aborts it only when _launchSubmitGeneration matches the
// pre-increment generation, so a stale reset never aborts a newer mount's submit.
// Aborting the POST makes a mid-submit re-init moot — the fetch rejects with
// AbortError instead of resolving onto a superseded generation's DOM tail.
let _launchGeneration = 0
let _launchListenerController = null
let _launchListenerGeneration = -1
let _launchSubmitController = null
let _launchSubmitGeneration = -1
// Tracks the stream handle returned by initOperatorStream for launch-created runs.
// resetLaunchState() closes this handle to prevent leaked connections/timers.
let _launchStreamHandle = null
// Idempotency flag: prevents double-init when auto-start fires before DOMContentLoaded.
let _launchInitialized = false
// In-flight submit mutex: persists across unmount/remount to prevent double-submit
// WITHIN the same mount. Guarded by generation (see _launching/_launchingGeneration
// below) so a submit that never reaches its `finally` (e.g. React tears the
// component down mid-submit) cannot permanently wedge every future mount.
let _launching = false
// The generation that owns the current _launching=true lock, or null when no
// submit is in flight. resetLaunchState() bumps _launchGeneration on every
// unmount/remount; a stale lock whose generation no longer matches the current
// generation is no longer honored, so a fresh mount is never blocked by a
// torn-down mount's abandoned in-flight submit. A live submit within the SAME
// mount still blocks a double-fire, because its generation still matches.
let _launchingGeneration = null

/**
 * Returns true if the given init is no longer the active init.
 *
 * An init is stale when either:
 * - Its AbortController signal has been aborted (resetLaunchState() was called
 *   and the controller was the active listener controller at that time), or
 * - Its captured generation no longer matches the current generation (a newer
 *   init has started, or resetLaunchState() incremented the counter).
 *
 * Call this after every await in initOperatorLaunch to bail out of stale inits
 * before they register listeners or mutate the DOM.
 *
 * Using a generation counter (rather than controller identity) means that
 * resetLaunchState() can increment the counter without setting it to null,
 * so a fresh init that starts after reset gets a new generation and its
 * isInitStale checks pass correctly even if stale cleanup runs concurrently.
 *
 * Exported for testing.
 *
 * @param {AbortController} controller - The AbortController created at init entry.
 * @param {number} generation - The generation captured at init entry.
 */
export function isInitStale(controller, generation) {
  return controller.signal.aborted || generation !== _launchGeneration
}

/**
 * Test-only seam: directly set _launchGeneration.
 *
 * Allows tests to simulate the race condition (reset mid-async) without
 * calling the DOM-touching initOperatorLaunch. Never call this in production code.
 *
 * @param {number} gen - The generation value to set.
 */
export function setLaunchGeneration(gen) {
  _launchGeneration = gen
}

/**
 * Test-only seam: directly set _launchListenerController and its owning generation.
 *
 * Allows tests to simulate the listener registration step of initOperatorLaunch
 * without calling the DOM-touching function. The generation parameter must match
 * the generation that "owns" this controller — resetLaunchState() will only abort
 * the controller if _launchListenerGeneration matches the pre-increment generation.
 *
 * Never call this in production code.
 *
 * @param {AbortController} controller - The controller to set as the active listener controller.
 * @param {number} generation - The generation that owns this controller.
 */
export function setLaunchListenerController(controller, generation) {
  _launchListenerController = controller
  _launchListenerGeneration = generation
}

/**
 * Set the launch-created stream handle.
 *
 * Called internally by initOperatorLaunch after a successful launch to track
 * the stream handle so resetLaunchState() can close it. Exported for testing
 * so tests can inject a fake handle without calling the DOM-touching initOperatorLaunch.
 *
 * @param {{close(): void}} handle - The stream handle returned by initOperatorStream.
 */
export function setLaunchStreamHandle(handle) {
  _launchStreamHandle = handle
}

// rm-628/rm-629: the submit flow as an exported function. All init-time closure
// state is injected via `deps`, so jsdom tests (test/operator-launch-submit.test.ts)
// drive the EXACT production path — including the staleness guard after the
// submitLaunch await and the AbortController registration — without mounting
// initOperatorLaunch (whose /static/ dynamic stream import cannot resolve outside
// a browser). initOperatorLaunch's listener is now a thin wrapper.
export async function runLaunchSubmit({
  client,
  launchForm,
  launchError,
  runIndexList,
  sharedNoticeEl,
  onRunLaunched,
  myGeneration,
  abortController,
  opts,
}) {
  // Mutex guard — re-entry is impossible regardless of how submit is triggered,
  // but only within the SAME mount: a lock held by a generation that is no
  // longer current (its mount was torn down mid-submit, e.g. by resetLaunchState)
  // is stale and must not block a fresh mount's submits.
  if (_launching && _launchingGeneration === myGeneration) return
  _launching = true
  _launchingGeneration = myGeneration

  // Pre-fetch validation: empty prompt
  const formData = new FormData(launchForm)
  const prompt = (formData.get('prompt') ?? '').toString().trim()
  if (prompt === '') {
    _launching = false
    if (launchError !== null) {
      launchError.textContent = 'Please enter a prompt before launching.'
      launchError.hidden = false
    }
    return
  }

  // Get selected repo from the select element (rendered by picker) or fallback
  const repoSelectEl = document.querySelector('#launch-repo-select')
  const repo = repoSelectEl?.value ?? formData.get('repo')?.toString() ?? ''
  if (repo === '') {
    _launching = false
    if (launchError !== null) {
      launchError.textContent = 'Please select a repository.'
      launchError.hidden = false
    }
    return
  }

  // Clear previous error
  if (launchError !== null) {
    launchError.textContent = ''
    launchError.hidden = true
  }

  // Disable submit during in-flight request
  const submitBtn = launchForm.querySelector('[type="submit"]')
  if (submitBtn !== null) submitBtn.disabled = true

  // Mint a fresh idempotency key for this submission
  const idempotencyKey = mintIdempotencyKey()

  // rm-629: dedicated AbortController for this submit's fetches. Registered in
  // module state (with generation ownership) so resetLaunchState() can abort an
  // in-flight POST on unmount/re-init instead of stranding it. Cleared in the
  // finally below under the same ownership check. The signal is threaded through
  // submitLaunch to every fetch of the submit (CSRF, POST, 400-retry pair).
  const submitController = new AbortController()
  _launchSubmitController = submitController
  _launchSubmitGeneration = myGeneration

  let outcome
  try {
    outcome = await submitLaunch(client, {repo, prompt}, idempotencyKey, submitController.signal)
  } catch {
    // rm-628: if a reset or newer init superseded this one while we were in
    // flight, do not write failure copy into the live tree — bail silently;
    // the finally below still releases what this generation owns.
    if (isInitStale(abortController, myGeneration)) return
    // Unexpected throw (e.g. mintIdempotencyKey or submitLaunch itself throws) —
    // set generic failure copy so the form is never stuck.
    if (launchError !== null) {
      launchError.textContent = 'Launch failed. Please try again.'
      launchError.hidden = false
    }
    return
  } finally {
    // Always re-enable the button and clear the mutex, even on throw — but only
    // if this generation still owns the lock. If a stale generation somehow
    // reached this finally (it shouldn't, since isInitStale-guarded code paths
    // return earlier), it must not clear a newer generation's active lock.
    if (submitBtn !== null) submitBtn.disabled = false
    if (_launchingGeneration === myGeneration) {
      _launching = false
      _launchingGeneration = null
    }
    // rm-629: release this submit's controller registration under the same
    // generation ownership rule — a stale finally must not clear a newer
    // submit's controller.
    if (_launchSubmitController === submitController && _launchSubmitGeneration === myGeneration) {
      _launchSubmitController = null
      _launchSubmitGeneration = -1
    }
  }

  // rm-628: bail before ANY post-await mutation if this init is stale. A reset
  // or newer init (remount/re-init mid-submit) owns the live tree now: inserting
  // the optimistic card, resetting the form, dispatching 'launch-success', or
  // attaching a stream from here would mutate the new instance's DOM with stale
  // state — wiping a re-drafted prompt, closing the drawer and focus-stealing,
  // and attaching an SSE stream the current runtime does not own (leaked
  // connection + cross-instance DOM writes). The failure branches below are
  // equally covered: no stale error copy reaches the live tree either.
  if (isInitStale(abortController, myGeneration)) return

  if (outcome.kind === 'launched') {
    const {runId} = outcome

    // Insert an optimistic pending card into the unified run-index list.
    // Marked data-optimistic="true" so the run-index diff preserves it
    // across a background refresh that hasn't indexed this run yet — preservation
    // is tied to live stream state (this flag + the stream's own terminal
    // resolution), not to a fetch cycle count. The diff clears this flag itself
    // once the run appears in a fetched view.
    if (runIndexList !== null) {
      const card = document.createElement('div')
      card.className = 'run-card'
      card.tabIndex = 0
      card.setAttribute('aria-label', 'New run, status: Pending')
      card.dataset.testid = 'run-card'
      card.dataset.runId = runId
      card.dataset.optimistic = 'true'

      // Same card anatomy as the run-index renderer.
      const statusGroup = document.createElement('span')
      statusGroup.className = 'run-status-group'
      statusGroup.dataset.role = 'run-status-group'

      const statusSpan = document.createElement('span')
      statusSpan.className = 'run-status status-pending'
      statusSpan.dataset.role = 'run-status'
      statusSpan.textContent = 'Pending'
      statusGroup.append(statusSpan)

      const reasonSpan = document.createElement('span')
      reasonSpan.className = 'run-reason'
      reasonSpan.dataset.role = 'run-reason'
      statusGroup.append(reasonSpan)

      card.append(statusGroup)

      // Hidden per-card substructure for the stream renderer.
      const outputEl = document.createElement('div')
      outputEl.dataset.role = 'run-output'
      outputEl.hidden = true
      card.append(outputEl)

      const coalescedEl = document.createElement('div')
      coalescedEl.dataset.role = 'run-output-coalesced'
      coalescedEl.hidden = true
      card.append(coalescedEl)

      const approvalsEl = document.createElement('div')
      approvalsEl.dataset.role = 'run-approvals'
      approvalsEl.hidden = true
      card.append(approvalsEl)

      const badgeEl = document.createElement('span')
      badgeEl.dataset.role = 'approval-badge'
      badgeEl.hidden = true
      card.append(badgeEl)

      // Prepend — a fresh launch is the newest active run and belongs at the top
      // of the unified list, ahead of the fetched cards.
      if (runIndexList.firstChild !== undefined && runIndexList.firstChild !== null) {
        runIndexList.insertBefore(card, runIndexList.firstChild)
      } else {
        runIndexList.append(card)
      }

      // Cap hygiene: evict the oldest terminal card if we're now over RUN_INDEX_CAP.
      // Never evict the card we just inserted, and never evict the active-stream card.
      const allCards = Array.from(runIndexList.children ?? [])
      if (allCards.length > LAUNCH_RUN_INDEX_CAP) {
        for (let i = allCards.length - 1; i >= 0; i--) {
          const candidate = allCards[i]
          if (candidate === card) continue
          if (candidate.dataset.streamAttached === 'true') continue
          const statusEl = candidate.querySelector?.('[data-role="run-status"]')
          const className = statusEl?.className ?? ''
          const isTerminal = ['status-succeeded', 'status-failed', 'status-cancelled'].some(c => className.includes(c))
          if (isTerminal) {
            candidate.remove()
            break
          }
        }
      }

      if (typeof onRunLaunched === 'function') {
        // Delegate stream attachment to the runtime seam (centralized ownership).
        // The runtime seam will close any prior stream and attach the new one.
        onRunLaunched(runId, card)
      } else {
        // Legacy path: no runtime callback — attach stream directly and store handle.
        // (Local dynamic import: this function is module-scope, not an
        // initOperatorLaunch closure — kept lazy so jsdom tests that always
        // pass onRunLaunched never hit it.)
        const statusEl = card.querySelector('[data-role="run-status"]')
        const {initOperatorStream} = await import(streamModuleSpecifier())
        const streamHandle = initOperatorStream({runId, statusEl, noticeEl: sharedNoticeEl, endpointBase: opts?.endpointBase, fixtureSessionId: opts?.fixtureSessionId})
        setLaunchStreamHandle(streamHandle)
      }
    }

    // Reset the form
    launchForm.reset()

    // Dispatch success event to the form so React components/drawers can react (e.g. close drawer and focus card)
    launchForm.dispatchEvent(new CustomEvent('launch-success', {
      bubbles: true,
      detail: {runId},
    }))
  } else if (outcome.kind === 'not-found') {
    if (launchError !== null) {
      launchError.textContent = 'The selected repository is not available for launch.'
      launchError.hidden = false
    }
  } else if (outcome.kind === 'rate-limited') {
    if (launchError !== null) {
      launchError.textContent = 'Too many launch requests. Please wait before trying again.'
      launchError.hidden = false
    }
  } else if (launchError !== null) {
    // failure — generic, no cause inference
    launchError.textContent = 'Launch failed. Please try again.'
    launchError.hidden = false
  }
}

/**
 * Initialize the operator launch UI.
 *
 * Builds a browser client with credentials:'include', renders the repo picker
 * from listRepos(), wires the launch form submit, and on a successful launch
 * inserts an optimistic pending card and calls initOperatorStream directly.
 *
 * This function touches the DOM and must only be called from a browser context.
 * It is never called at module top-level, so Vitest can import this file safely.
 *
 * Security:
 * - Never logs prompt, csrf, idempotency key, or runId.
 * - Renders only safe fields; no error-copy that echoes sensitive values.
 * - runId appears only in data-run-id attribute and the stream URL (via initOperatorStream).
 * - All 400s → one generic failure message; 404 → one uniform unavailable message.
 */
export async function initOperatorLaunch(opts) {
  // Capture this init's generation at entry. Each call increments the counter so
  // that any concurrent or prior init with a different generation is considered stale.
  // resetLaunchState() also increments the counter, invalidating pending inits without
  // setting it to null (which would cause a fresh post-reset init to fail its own guard).
  const myGeneration = ++_launchGeneration
  // Create a per-init AbortController used only as a staleness signal for this init's
  // async steps. The listener controller (_launchListenerController) is separate and
  // is only set once this init wins the generation race and registers its listener.
  const abortController = new AbortController()

  // onRunLaunched: optional callback from the runtime seam. When provided, the runtime
  // seam owns stream attachment and the launch module delegates to it instead of calling
  // initOperatorStream directly. This centralizes active-stream ownership in the runtime.
  const onRunLaunched = opts?.onRunLaunched

  // Warm the stream module eagerly at init (also an init-race checkpoint —
  // the staleness guard directly below covers the await). The launch module
  // itself imports initOperatorStream lazily at its legacy call site.
  await import(streamModuleSpecifier())

  // Guard: bail if a reset or newer init has superseded this one while we awaited.
  if (isInitStale(abortController, myGeneration)) return

  // Build the client using the optional endpointBase from opts.
  // Default is '/operator' (production path). Dev mode may pass a different base
  // through the runtime-loader seam.
  // These same-origin relative paths are owned by the public reverse proxy
  // (production) or the dev harness. The dashboard app deliberately
  // does NOT mount or proxy them — serving them here would make this read-only
  // app a credential-forwarding component.
  const client = buildLaunchClient(opts)

  // -------------------------------------------------------------------------
  // Render repo picker
  // -------------------------------------------------------------------------

  const pickerContainer = document.querySelector('#repo-picker-container')

  if (pickerContainer !== null) {
    const reposResult = await client.listRepos()

    // Guard: bail if reset/replaced while awaiting listRepos.
    if (isInitStale(abortController, myGeneration)) return

    if (!reposResult.success) {
      // Failure — classify into a neutral operator failure state.
      // Never render a generic failure message for auth/rate-limit/network/protocol failures.
      // The copy is fixed and coarse — no raw error details, status codes, or paths.
      const error = reposResult.error
      let failureCopy
      if (error.kind === 'http') {
        const status = error.status ?? 0
        if (status === 401 || status === 403) {
          failureCopy = 'Sign in required to load repositories.'
        } else if (status === 429) {
          failureCopy = 'Repository list temporarily unavailable. Try again shortly.'
        } else {
          failureCopy = 'Repository list unavailable.'
        }
      } else if (error.kind === 'network') {
        failureCopy = 'Repository list unavailable \u2014 check your connection.'
      } else {
        // protocol or unknown
        failureCopy = 'Repository list unavailable.'
      }
      pickerContainer.textContent = failureCopy
    } else if (reposResult.data.length === 0) {
      // Successful fetch but empty list — this is the only case where "no repos" is accurate.
      pickerContainer.textContent = 'No repositories configured.'
    } else {
      // Render a <select> with the available repos
      const select = document.createElement('select')
      select.id = 'launch-repo-select'
      select.name = 'repo'
      select.setAttribute('aria-label', 'Select repository')
      select.style.cssText = 'width:100%;max-width:400px;padding:6px 10px;border:1px solid #d1d5db;border-radius:4px;font-size:0.875rem;'

      for (const repo of reposResult.data) {
        // Render only the safe owner/repo display string — no channelName or other fields
        const repoStr = `${repo.owner}/${repo.repo}`
        const option = document.createElement('option')
        option.value = repoStr
        option.textContent = repoStr
        select.append(option)
      }

      pickerContainer.textContent = ''
      pickerContainer.append(select)
    }
  }

  // -------------------------------------------------------------------------
  // Wire launch form submit
  // -------------------------------------------------------------------------

  const launchForm = document.querySelector('#launch-form')
  const launchError = document.querySelector('#launch-error')
  const runIndexList = document.querySelector('[data-role="run-index-list"]')
  const sharedNoticeEl = document.querySelector('[data-role="stream-status"]')

  if (launchForm !== null) {
    // Create a dedicated AbortController for the submit listener. This is separate
    // from the per-init abortController used for staleness guards above, so that
    // resetLaunchState() can abort only the active listener without interfering with
    // the init-guard controller of a concurrently-running newer init.
    // Record the generation that owns this controller so resetLaunchState() can
    // verify ownership before aborting — stale cleanup must not abort a newer listener.
    const listenerController = new AbortController()
    _launchListenerController = listenerController
    _launchListenerGeneration = myGeneration

    launchForm.addEventListener('submit', async event => {
      event.preventDefault()
      await runLaunchSubmit({client, launchForm, launchError, runIndexList, sharedNoticeEl, onRunLaunched, myGeneration, abortController, opts})
    }, {signal: listenerController.signal})
  }
}

/**
 * Reset the launch state.
 *
 * Increments the generation counter to invalidate all pending inits, then aborts
 * the active submit listener controller (removing the listener from the form).
 * Called by the React runtime seam cleanup so that a remount can re-initialize
 * the launch UI without double-registering submit handlers. Also used in tests.
 *
 * Incrementing (not nulling) the generation means a fresh init that starts after
 * this reset will capture a new generation and pass its own staleness guards,
 * even if stale cleanup from an older init runs concurrently.
 */
export function resetLaunchState() {
  // Capture the pre-increment generation to check listener ownership.
  const preIncrementGeneration = _launchGeneration
  // Increment generation to invalidate all pending inits.
  _launchGeneration++
  // Abort and clear the active listener controller only if it was set during the
  // pre-increment generation. This prevents stale cleanup from aborting a listener
  // registered by a newer init that started after the stale reset fired.
  if (_launchListenerController !== null && _launchListenerGeneration === preIncrementGeneration) {
    _launchListenerController.abort()
    _launchListenerController = null
    _launchListenerGeneration = -1
  }
  // rm-629: abort the in-flight launch POST under the same ownership rule. A
  // mid-submit reset/re-init would otherwise leave the old POST running to
  // completion while the new mount's mutex (deliberately non-blocking across
  // mounts) admits a concurrent second submit with a fresh idempotency key —
  // two server-side runs for one operator intent. Aborting makes the stale
  // submit reject immediately; its catch sees the generation guard (rm-628) and
  // never touches the live tree.
  if (_launchSubmitController !== null && _launchSubmitGeneration === preIncrementGeneration) {
    _launchSubmitController.abort()
    _launchSubmitController = null
    _launchSubmitGeneration = -1
  }
  // Close the launch-created stream handle to prevent leaked connections/timers.
  if (_launchStreamHandle !== null) {
    try {
      _launchStreamHandle.close()
    } catch {
      // ignore close errors
    }
    _launchStreamHandle = null
  }
  _launchInitialized = false
}

// Wrap initOperatorLaunch to be idempotent.
const _initOperatorLaunchOnce = async () => {
  if (_launchInitialized) return
  _launchInitialized = true
  await initOperatorLaunch()
}

// Auto-start in the browser. Guarded so a Node/test import never touches the DOM.
// When imported with ?manual=1 (by the React runtime seam), auto-start is skipped
// so the seam has deterministic lifecycle control. Normal /static/operator-launch.js
// loads (without ?manual=1) retain the legacy auto-start behavior.
if (typeof document !== 'undefined') {
  const isManual = (() => {
    try {
      return new URL(import.meta.url).searchParams.has('manual')
    } catch {
      return false
    }
  })()
  if (!isManual) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        _initOperatorLaunchOnce()
      })
    } else if (
      typeof document.querySelector === 'function' &&
      document.querySelector('#launch-form') !== null
    ) {
      // rm-628 test surface: only auto-start when the page actually carries the
      // launch form (the operator page). A bare import into a DOM-bearing test
      // environment — or a page that merely links this script — otherwise runs a
      // pointless init (whose eager stream-module warm-up import cannot resolve
      // outside a real browser) and surfaces as an unhandled rejection.
      _initOperatorLaunchOnce()
    }
  }
}
