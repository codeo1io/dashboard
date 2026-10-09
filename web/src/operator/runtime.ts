/**
 * Operator runtime seam.
 *
 * Connects the React operator shell to existing browser-direct operator runtimes
 * (public/operator-*.js) without duplicating Gateway logic or adding a proxy.
 *
 * Design:
 * - One lifecycle owner: React mounts the runtime once when the operator shell
 *   reaches ready state; cleanup is called on unmount or auth expiry.
 * - Idempotent: mounting twice (React Strict Mode) is safe — cleanup from the
 *   first mount prevents double-registration.
 * - Async runtime loading: if the runtime module is absent, the shell transitions
 *   to unavailable without crashing.
 * - CSRF and idempotency keys are memory-only; never persisted or logged.
 *
 * Security invariants:
 * - Never logs prompt, token, cookie, CSRF value, repo name, run ID, or raw payload.
 * - Repo-list failures use the canonical operator state classifier — never renders
 *   "No repositories available" for auth/rate-limit/network/protocol failures.
 * - All Gateway data flows through safe text paths only.
 * - Reload restore reads location.hash only to (a) check list-container membership
 *   and (b) build a fetch URL via encodeURIComponent; it never reaches textContent,
 *   innerHTML, a logger, or any DOM attribute other than data-run-id (setAttribute).
 *   A hash value over MAX_HASH_ID_LENGTH is rejected before any further processing.
 */

import {validateDynamicId} from './validate-dynamic-id.ts'
import type {OperatorState} from './state.ts'

/**
 * Hard cap on a location.hash-sourced runId, matching the run-summary parser's
 * MAX_ID_LENGTH (public/operator-run-index.js). location.hash is reachable via a
 * crafted/shared link, so this cap is enforced BEFORE validateDynamicId or any
 * decode/encode call — a megabyte-long hash must not reach those paths.
 */
export const MAX_HASH_ID_LENGTH = 512

/**
 * Discover the per-card render targets for a run's stream (output, coalesced
 * output hint, approval prompt, approval badge). Without these, a stream
 * handle's DOM updates only ever touch statusEl/noticeEl, leaving the card's
 * core content (output + approvals) blank.
 *
 * Exported so both production (`_attachStream`) and tests exercise the exact
 * same discovery logic — a test that re-implements this lookup proves nothing
 * about whether production actually wires the elements.
 */
export function discoverCardStreamTargets(runId: string): {
  outputEl: Element | null
  coalescedEl: Element | null
  approvalsEl: Element | null
  badgeEl: Element | null
  reasonEl: Element | null
  cancelEl: Element | null
} {
  const card = typeof document !== 'undefined'
    ? document.querySelector(`[data-run-id="${CSS.escape(runId)}"]`)
    : null
  return {
    outputEl: card?.querySelector('[data-role="run-output"]') ?? null,
    coalescedEl: card?.querySelector('[data-role="run-output-coalesced"]') ?? null,
    approvalsEl: card?.querySelector('[data-role="run-approvals"]') ?? null,
    badgeEl: card?.querySelector('[data-role="approval-badge"]') ?? null,
    reasonEl: card?.querySelector('[data-role="run-reason"]') ?? null,
    cancelEl: card?.querySelector('[data-role="run-cancel"]') ?? null,
  }
}

/**
 * Sanitize a raw location.hash fragment (with or without the leading '#') into a
 * safe runId, or null if it is absent/oversized/malformed.
 *
 * Order matters: the length cap runs first, before validateDynamicId (which itself
 * calls decodeURIComponent). Never call encodeURIComponent/decodeURIComponent on a
 * value that hasn't passed the length cap.
 */
export function sanitizeRunIdFromHash(rawHash: string): string | null {
  const candidate = rawHash.startsWith('#') ? rawHash.slice(1) : rawHash
  if (candidate.length === 0 || candidate.length > MAX_HASH_ID_LENGTH) return null
  if (!validateDynamicId(candidate)) return null
  return candidate
}

export interface RepoListError {
  readonly kind: 'http' | 'network' | 'protocol'
  readonly status?: number
}

export interface OperatorRuntimeOptions {
  readonly container: HTMLElement
  readonly onStateChange: (state: OperatorState) => void
  /**
   * Injectable runtime loader for testing.
   * In production, this dynamically imports the operator runtime modules.
   * May return a cleanup function that is called when the runtime is cleaned up.
   * If absent, the default loader is used.
   *
   * In fixture mode the loader receives {endpointBase, fixtureSessionId, getScenario}
   * so it can configure the public browser modules to use the fixture route prefix
   * and include fixture context in launch requests.
   */
  readonly _runtimeLoader?: (opts?: {
    endpointBase?: string
    fixtureSessionId?: string
    getScenario?: () => string
  }) => Promise<void | (() => void)>
  /**
   * When true, the runtime uses fixture routes instead of production routes.
   * Only active in development builds (import.meta.env.DEV).
   * Production browser bundles must not contain fixture route strings.
   */
  readonly fixtureMode?: boolean
  /**
   * The fixture endpoint base to pass to the runtime loader when fixtureMode is true.
   * Must be provided by the caller (App/fixture loader); no fallback is applied here.
   */
  readonly fixtureEndpointBase?: string
  /**
   * The fixture session ID from the fixture session response.
   * Passed to initOperatorLaunch so launch requests include it in the body.
   * Only used when fixtureMode is true.
   */
  readonly fixtureSessionId?: string
  /**
   * Returns the currently selected fixture scenario at call time.
   * Called at submit time so scenario changes after init are reflected.
   * Only used when fixtureMode is true.
   */
  readonly getScenario?: () => string
}

export interface OperatorRuntimeHandle {
  isMounted: boolean
  cleanup: () => void
}

/**
 * Classify a repo-list error into a canonical operator state.
 *
 * Never returns "No repositories available" — that string is reserved for the
 * case where the list is genuinely empty after a successful fetch.
 *
 * Auth/rate-limit/network/protocol failures map to their canonical states so
 * the UI can render the correct recovery action.
 *
 * Exported for direct testing.
 */
export function classifyRepoListError(error: RepoListError): OperatorState {
  if (error.kind === 'http') {
    const {status} = error
    if (status === 401 || status === 403) return 'auth-required'
    if (status === 429) return 'rate-limited'
    return 'unavailable'
  }
  return error.kind === 'network' ? 'offline' : 'unavailable'
}

// CSP-safe dynamic import helper.
//
// Vite's import-analysis plugin statically resolves string literals in import()
// calls, even when annotated with @vite-ignore, during Vitest's transform pass.
// Using a computed specifier (string concatenation) prevents static resolution
// while remaining CSP-safe — no eval or Function constructor is used.
//
// The ?manual=1 query param signals the public modules to skip auto-bootstrap
// on evaluation, giving the runtime seam deterministic lifecycle control.
const _streamSpecifier = '/static/operator-stream.js' + '?manual=1'
const _launchSpecifier = '/static/operator-launch.js' + '?manual=1'
const _runIndexSpecifier = '/static/operator-run-index.js' + '?manual=1'

/**
 * Write the expanded runId to location.hash. runId is used ONLY for setting the
 * hash fragment here — never interpolated into HTML, textContent, or a logger.
 */
function _writeRunHash(runId: string): void {
  if (typeof location === 'undefined') return
  try {
    location.hash = runId
  } catch {
    // ignore — hash write failures are non-fatal (e.g. unsupported environment)
  }
}

/** Clear location.hash on collapse or restore-miss. */
function _clearRunHash(): void {
  if (typeof location === 'undefined') return
  try {
    if (location.hash !== '') {
      history.replaceState(null, '', location.pathname + location.search)
    }
  } catch {
    // ignore
  }
}

/**
 * Active-stream ownership, scoped to ONE runtime instance (rm-283).
 *
 * Historically the handle and runId were module-level singletons shared by
 * every runtime instance. Under React StrictMode's double-mount, mount1's
 * late-resolving cleanup could then close the singleton handle AFTER mount2
 * had attached its own stream — closing mount2's just-opened stream. Each
 * defaultRuntimeLoader() call now creates its own owner, so a stale cleanup
 * can only ever release the stream its own instance attached.
 *
 * Within one owner the single-open accordion invariant is unchanged: only one
 * stream is active at a time, and attach() closes the prior handle first.
 * activeRunId is what lets onSelectRun distinguish "expand a new run" (attach)
 * from "select the already-expanded run again" (collapse).
 *
 * Exported for direct testing (rm-283's two-instance lifecycle test).
 */
export function createActiveStreamOwner(): {
  attach: (handle: {close(): void}, runId: string) => void
  close: () => void
  readonly activeRunId: string | null
} {
  // The stream handle currently owned by THIS runtime instance.
  let _activeStreamHandle: {close(): void} | null = null
  // The runId whose stream is currently attached (mirrors _activeStreamHandle's target).
  let _activeStreamRunId: string | null = null

  function _closeActiveStream(): void {
    if (_activeStreamHandle !== null) {
      try {
        _activeStreamHandle.close()
      } catch {
        // ignore close errors
      }
      _activeStreamHandle = null
    }
    // Clear the stale-eviction-protection marker on the previously-active card so a
    // collapsed card doesn't keep looking stream-attached until some future
    // markRunStreamAttached call happens to overwrite it (or never does).
    if (_activeStreamRunId !== null && typeof document !== 'undefined') {
      const card = document.querySelector(`[data-run-id="${CSS.escape(_activeStreamRunId)}"]`)
      if (card !== null) delete (card as HTMLElement).dataset.streamAttached
    }
    _activeStreamRunId = null
  }

  return {
    attach(handle, runId) {
      _closeActiveStream()
      _activeStreamHandle = handle
      _activeStreamRunId = runId
    },
    close: _closeActiveStream,
    get activeRunId() {
      return _activeStreamRunId
    },
  }
}

// rm-283 residue (assess F2, 2026-10-07): generation counter for the module-level
// state the loader-returned cleanup resets (bootstrap/launch/run-index). Each
// defaultRuntimeLoader call captures the current value synchronously at entry;
// the returned cleanup only resets module state while it is still the latest
// generation, so a late-resolving dead instance cannot clobber a newer live
// instance's initialized module state. Distinct from operator-run-index.js's
// own _runIndexGeneration, which invalidates that module's pending inits.
let _runtimeModuleGeneration = 0

async function defaultRuntimeLoader(opts?: {
  endpointBase?: string
  fixtureSessionId?: string
  getScenario?: () => string
  onSelectRun?: (runId: string) => void
  onRunLaunched?: (runId: string, card: HTMLElement) => void
  onStateChange?: (state: OperatorState) => void
}): Promise<() => void> {
  // rm-283 residue (assess F2, 2026-10-07): capture the module-generation counter
  // SYNCHRONOUSLY at loader entry, before any await — a newer instance that mounts
  // later must bump the counter before this instance's cleanup can observe it.
  const myModuleGeneration = ++_runtimeModuleGeneration
  // rm-283: active-stream ownership is INSTANCE-scoped — one owner per loader
  // call (one per runtime instance), never module-shared, so a stale StrictMode
  // cleanup cannot close another instance's stream. See createActiveStreamOwner.
  const streamOwner = createActiveStreamOwner()
  const streamMod = await import(/* @vite-ignore */ _streamSpecifier) as {
    bootstrapOperatorStreams?: (opts?: {endpointBase?: string; fixtureSessionId?: string}) => void
    resetBootstrapState?: () => void
    initOperatorStream?: (opts: {
      runId: string
      statusEl?: Element | null
      noticeEl?: Element | null
      outputEl?: Element | null
      coalescedEl?: Element | null
      approvalsEl?: Element | null
      badgeEl?: Element | null
      reasonEl?: Element | null
      cancelEl?: Element | null
      endpointBase?: string
      fixtureSessionId?: string
      seedStatus?: string
    }) => {close(): void}
  }
  if (typeof streamMod.resetBootstrapState === 'function') {
    streamMod.resetBootstrapState()
  }
  if (typeof streamMod.bootstrapOperatorStreams === 'function') {
    const streamOpts = opts?.endpointBase !== undefined || opts?.fixtureSessionId !== undefined
      ? {endpointBase: opts.endpointBase, fixtureSessionId: opts.fixtureSessionId}
      : undefined
    streamMod.bootstrapOperatorStreams(streamOpts)
  }

  const runIndexMod = await import(/* @vite-ignore */ _runIndexSpecifier) as {
    initOperatorRunIndex?: (opts?: {
      endpointBase?: string
      fixtureSessionId?: string
      onSelectRun?: (runId: string) => void
      restoreRunId?: string
      onRestoreRun?: (runId: string, card: Element, status: string) => void
      onRestoreMiss?: () => void
      onAuthRequired?: () => void
    }) => Promise<void>
    resetRunIndexState?: () => void
    markRunStreamAttached?: (runId: string) => void
    markCardExpandedForLaunch?: (runId: string) => void
  }

  const launchMod = await import(/* @vite-ignore */ _launchSpecifier) as {
    initOperatorLaunch?: (opts?: {endpointBase?: string; getScenario?: () => string; fixtureSessionId?: string; onRunLaunched?: (runId: string, card: HTMLElement) => void}) => Promise<void>
    resetLaunchState?: () => void
  }

  function _attachStream(runId: string, statusEl: Element | null, noticeEl: Element | null): void {
    // Release any stream THIS instance already owns before attaching. attach()
    // would close it too, but closing up front preserves the original semantics
    // where a missing or throwing initOperatorStream still releases the prior
    // stream instead of leaving it dangling as "active".
    streamOwner.close()

    if (typeof streamMod.initOperatorStream !== 'function') return

    // Discover the per-card render targets so live output, coalescing hints,
    // approval prompts, and the approval badge all render — not just status.
    const {outputEl, coalescedEl, approvalsEl, badgeEl, reasonEl, cancelEl} = discoverCardStreamTargets(runId)

    // rm-794 (#583/#584): prefer the card's own in-card stream-state notice and
    // seed the reducer from the card's known status (dataset.status, written by
    // renderRunCard and kept current by updateCardInPlace). The page-level
    // stream-status notice remains the fallback for cards without an in-card
    // region (legacy markup / fixture bootstrap); initOperatorStream ignores a
    // seedStatus that is not a terminal status.
    const card = typeof document !== 'undefined'
      ? document.querySelector(`[data-run-id="${CSS.escape(runId)}"]`)
      : null
    const inCardNoticeEl = card?.querySelector('[data-role="run-notice"]') ?? null
    const seedStatus = card instanceof HTMLElement && typeof card.dataset.status === 'string'
      ? card.dataset.status
      : undefined

    try {
      const handle = streamMod.initOperatorStream({
        runId,
        statusEl,
        noticeEl: inCardNoticeEl ?? noticeEl,
        outputEl,
        coalescedEl,
        approvalsEl,
        badgeEl,
        reasonEl,
        cancelEl,
        endpointBase: opts?.endpointBase,
        fixtureSessionId: opts?.fixtureSessionId,
        seedStatus,
      })
      streamOwner.attach(handle, runId)
      if (typeof runIndexMod.markRunStreamAttached === 'function') {
        runIndexMod.markRunStreamAttached(runId)
      }
    } catch {
      if (statusEl !== null) {
        statusEl.textContent = 'Unavailable'
        statusEl.className = 'status-unavailable'
      }
    }
  }

  // Build the active-stream coordination callbacks. These are passed to run-index and
  // launch modules so the runtime seam owns the single active stream handle.
  //
  // Single-open accordion: the run-index DOM shell calls this on every card
  // click/keydown activation, whether the card is being expanded or collapsed
  // (it decides that via data-expanded before calling here). This callback is
  // the single decision point for "attach" vs "collapse":
  // - If runId is already the active stream, the card was just collapsed —
  //   close the stream and attach nothing new.
  // - Otherwise the card was just expanded — close whichever stream is active
  //   (if any) and attach the new one. _attachStream already closes the prior
  //   handle first, so this covers both "nothing was open" and "switching cards."
  const onSelectRun = (runId: string) => {
    if (streamOwner.activeRunId === runId) {
      streamOwner.close()
      _clearRunHash()
      return
    }
    // Find the card element for this runId to get its statusEl and noticeEl.
    const card = typeof document !== 'undefined'
      ? document.querySelector(`[data-run-id="${CSS.escape(runId)}"]`)
      : null
    const statusEl = card?.querySelector('[data-role="run-status"]') ?? null
    const noticeEl = typeof document !== 'undefined'
      ? document.querySelector('[data-role="stream-status"]')
      : null
    _attachStream(runId, statusEl, noticeEl)
    _writeRunHash(runId)
  }

  // Reload restore: a hash-restored run is expanded via a distinct, non-toggle DOM
  // entry point (expandCardForRestore in operator-run-index.js), never onSelectRun —
  // onSelectRun's toggle semantics assume a prior click (re-select = collapse), which
  // a cold-boot restore is not.
  //
  // Terminal vs. non-terminal restores attach the stream the same way on purpose:
  // the "no reconnect for a terminal run" guarantee already lives in
  // initOperatorStream's own state machine (nextStreamState transitions to
  // connection: 'closed' with shouldReconnect: false once a terminal status frame
  // arrives, and the reader loop stops re-invoking itself once closed) — not in this
  // seam. A restored terminal run still opens one connection to receive the
  // replay/final frame, then closes without ever scheduling a reconnect. There is
  // nothing terminal-specific for this callback to special-case, so TERMINAL_RUN_STATUSES
  // is retained only for tests/documentation of that contract, not a branch here.
  const onRestoreRun = (runId: string, card: Element, _status: string) => {
    const statusEl = card.querySelector('[data-role="run-status"]') ?? null
    const noticeEl = typeof document !== 'undefined'
      ? document.querySelector('[data-role="stream-status"]')
      : null
    _attachStream(runId, statusEl, noticeEl)
  }

  const onRestoreMiss = () => {
    _clearRunHash()
    const noticeEl = typeof document !== 'undefined'
      ? document.querySelector('[data-role="stream-status"]')
      : null
    if (noticeEl instanceof HTMLElement) {
      // Fixed copy — no runId echoed.
      noticeEl.textContent = 'The selected run is no longer in recent history.'
      noticeEl.hidden = false
    }
  }

  const onAuthRequired = () => {
    opts?.onStateChange?.('auth-required')
  }

  const onRunLaunched = (runId: string, card: HTMLElement) => {
    const statusEl = card.querySelector('[data-role="run-status"]') ?? null
    const noticeEl = typeof document !== 'undefined'
      ? document.querySelector('[data-role="stream-status"]')
      : null
    _attachStream(runId, statusEl, noticeEl)
    _writeRunHash(runId)
    // A launched run's card must present as already-expanded/observed the moment
    // its stream attaches — otherwise the operator's first click on it is
    // misread by onSelectRun as "collapse the active stream" instead of "expand."
    if (typeof runIndexMod.markCardExpandedForLaunch === 'function') {
      runIndexMod.markCardExpandedForLaunch(runId)
    }
  }

  if (typeof runIndexMod.resetRunIndexState === 'function') {
    runIndexMod.resetRunIndexState()
  }
  if (typeof runIndexMod.initOperatorRunIndex === 'function') {
    // The hash is actually read HERE, synchronously, before initOperatorRunIndex is
    // called — it is only consulted (as restoreRunId) after that function's internal
    // /operator/runs fetch resolves. So a user click that attaches a stream during
    // the await window can race this pre-captured value; the run-index module
    // guards against that by checking for an already-attached stream for a
    // different run before honoring the restore (see initOperatorRunIndex). The
    // raw hash is sanitized here — length cap before validateDynamicId — before it
    // crosses into the run-index module at all.
    const restoreRunId = typeof location !== 'undefined'
      ? sanitizeRunIdFromHash(location.hash) ?? undefined
      : undefined
    const runIndexOpts = opts?.endpointBase !== undefined
      ? {endpointBase: opts.endpointBase, fixtureSessionId: opts.fixtureSessionId, onSelectRun, restoreRunId, onRestoreRun, onRestoreMiss, onAuthRequired}
      : {onSelectRun, restoreRunId, onRestoreRun, onRestoreMiss, onAuthRequired}
    await runIndexMod.initOperatorRunIndex(runIndexOpts)
  }

  if (typeof launchMod.resetLaunchState === 'function') {
    launchMod.resetLaunchState()
  }
  if (typeof launchMod.initOperatorLaunch === 'function') {
    const launchOpts = opts?.endpointBase !== undefined
      ? {endpointBase: opts.endpointBase, getScenario: opts.getScenario, fixtureSessionId: opts.fixtureSessionId, onRunLaunched}
      : {onRunLaunched}
    await launchMod.initOperatorLaunch(launchOpts)
  }

  return () => {
    // Close the stream handle owned by THIS runtime instance on cleanup.
    streamOwner.close()
    // rm-283 residue (assess F2): only the LATEST loader generation may reset
    // module state. A dead instance whose loader resolved late must not wipe a
    // newer live instance's freshly initialized modules (bootstrap timers, launch
    // form state, run-index selection/expansion tracking — including the
    // _onSelectRun retention the #570 absorb made load-bearing). The instance-
    // scoped streamOwner.close() above stays unconditional.
    if (myModuleGeneration !== _runtimeModuleGeneration) return
    if (typeof streamMod.resetBootstrapState === 'function') {
      streamMod.resetBootstrapState()
    }
    if (typeof launchMod.resetLaunchState === 'function') {
      launchMod.resetLaunchState()
    }
    if (typeof runIndexMod.resetRunIndexState === 'function') {
      runIndexMod.resetRunIndexState()
    }
  }
}

/**
 * Create an operator runtime handle.
 *
 * Loads or initializes existing public/operator-*.js modules after the React
 * operator shell reaches ready state. Returns a handle with a cleanup function
 * that closes streams, removes listeners, clears timers, and wipes generated DOM.
 *
 * One lifecycle owner: React calls this once when the shell is ready and calls
 * cleanup() on unmount or auth expiry. React Strict Mode double-effects are safe
 * because cleanup() is idempotent, the active-stream handle is instance-scoped
 * (rm-283, createActiveStreamOwner) — a late first-mount cleanup can never close
 * the second mount's just-attached stream — and the loader cleanup guards the
 * module-level resets behind a generation check (rm-283 residue, assess F2), so
 * a dead first mount whose loader resolves after the second mount initialized
 * cannot reset the live instance's module state either.
 *
 * @param opts - Runtime options including container, state change callback, and
 *               optional injectable runtime loader for testing.
 * @returns A handle with isMounted and cleanup().
 */
export function createOperatorRuntime(opts: OperatorRuntimeOptions): OperatorRuntimeHandle {
  const {container: _container, onStateChange, _runtimeLoader, fixtureMode, fixtureEndpointBase, fixtureSessionId, getScenario} = opts

  let mounted = true
  let cleanupFns: Array<() => void> = []

  const handle: OperatorRuntimeHandle = {
    get isMounted() {
      return mounted
    },
    cleanup() {
      if (!mounted) return
      mounted = false
      for (const fn of cleanupFns) {
        try {
          fn()
        } catch {
          // Cleanup errors are swallowed — never log sensitive context
        }
      }
      cleanupFns = []
    },
  }

  // onStateChange is bound onto the default loader only (via a thin wrapper), never
  // added to loaderOpts — existing tests assert loaderOpts is `undefined` when
  // fixtureMode is off, and an injectable test _runtimeLoader shouldn't gain an
  // unrequested field. The default loader needs it independent of fixture mode so
  // a stale-auth reload (auth re-classification on the /operator/runs restore fetch)
  // can report auth-required back to the shell.
  const loader = _runtimeLoader ?? ((loaderOpts?: Parameters<typeof defaultRuntimeLoader>[0]) => defaultRuntimeLoader({...loaderOpts, onStateChange}))

  // Build loader options: only pass fixture context in fixture mode (dev builds only).
  // Production bundles must not contain fixture route strings.
  const loaderOpts =
    fixtureMode === true
      ? {
          endpointBase: fixtureEndpointBase,
          fixtureSessionId,
          getScenario,
        }
      : undefined

  loader(loaderOpts).then(maybeCleanup => {
    if (typeof maybeCleanup !== 'function') return
    if (mounted) {
      cleanupFns.push(maybeCleanup)
    } else {
      maybeCleanup()
    }
  }).catch(() => {
    if (mounted) {
      onStateChange('unavailable')
    }
  })

  return handle
}
