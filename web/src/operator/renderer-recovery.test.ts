/**
 * Red-first seam test for the renderer-strand heal (rm-2154).
 *
 * After an autoUpdate deploy (rm-1960) the hashed markdown-output chunk a live
 * operator tab still references 404s, and the settle path leaves the renderer
 * undefined for the tab's remaining life. Recovery must live at the
 * renderer-source seam — the loader the runtime mounts — so the cure is
 * testable without a full-browser harness:
 *
 * - a chunk-load failure publishes a notice and triggers exactly ONE guarded
 *   page reload, keyed on the failing module's identity (which carries the
 *   content hash in a production build);
 * - a repeated failure of the same module never reloads twice (loop guard);
 * - a non-chunk-load rejection is notice-only (no reload);
 * - a newly failing module identity (next deploy) is allowed one fresh retry;
 * - the default loader itself routes a failing dynamic import through
 *   recovery and settles undefined instead of rejecting.
 *
 * These specs failed against the pre-cure seam (handler absent; the default
 * loader propagated its rejection) — run b6876797d0a644e7a99fd91b2734fc1c,
 * implement attempt 9f7596f1ba874db5bb510fc4cb4bb2f7, red output retained in
 * /tmp/g-b687-red.log.
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {
  handleRendererLoadFailure,
  setRendererLoadNotice,
  setOutputRendererLoader,
} from './renderer-source.ts'

const chunkFailure = (url: string): TypeError =>
  new TypeError(`Failed to fetch dynamically imported module: ${url}`)

const RECOVERY_NOTICE = '[data-renderer-recovery]'

describe('renderer-load failure recovery (rm-2154)', () => {
  let reloadCount: number

  beforeEach(() => {
    reloadCount = 0
    sessionStorage.clear()
    for (const notice of document.querySelectorAll(RECOVERY_NOTICE)) notice.remove()
    vi.stubGlobal('location', {href: window.location.href, reload: () => { reloadCount += 1 }})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.doUnmock('./markdown-output.ts')
    vi.resetModules()
    setRendererLoadNotice(undefined)
  })

  it('publishes a notice and reloads exactly once for a repeated chunk-load failure of the same module', () => {
    setRendererLoadNotice(() => {})
    const failure = chunkFailure('https://host/assets/markdown-output-D4h7kQ.js')
    handleRendererLoadFailure(failure)
    handleRendererLoadFailure(failure)
    expect(reloadCount).toBe(1)
  })

  it('publishes the recovery notice through the injectable channel on every failure', () => {
    const notices: string[] = []
    setRendererLoadNotice(message => { notices.push(message) })
    const failure = chunkFailure('https://host/assets/markdown-output-D4h7kQ.js')
    handleRendererLoadFailure(failure)
    handleRendererLoadFailure(failure)
    expect(notices).toHaveLength(2)
    expect(notices[0]).toContain('reloading once')
    expect(notices[1]).toContain('retry')
  })

  it('notices without reloading for a non-chunk-load rejection', () => {
    setRendererLoadNotice(() => {})
    handleRendererLoadFailure(new SyntaxError('Unexpected token < in JSON'))
    expect(reloadCount).toBe(0)
  })

  it('reloads again once the failing module identity changes (next deploy)', () => {
    setRendererLoadNotice(() => {})
    handleRendererLoadFailure(chunkFailure('https://host/assets/markdown-output-A1.js'))
    handleRendererLoadFailure(chunkFailure('https://host/assets/markdown-output-B2.js'))
    expect(reloadCount).toBe(2)
  })

  it('falls back to a transient inline DOM notice when no channel is injected', () => {
    handleRendererLoadFailure(chunkFailure('https://host/assets/markdown-output-C3.js'))
    const notice = document.querySelector(RECOVERY_NOTICE)
    expect(notice).not.toBeNull()
    expect(notice?.getAttribute('role')).toBe('status')
  })

  it('routes a failing default loader through recovery and settles undefined instead of rejecting', async () => {
    vi.doMock('./markdown-output.ts', () => ({
      get renderOutput() {
        throw chunkFailure('https://host/assets/markdown-output-DEAD.js')
      },
    }))
    vi.resetModules()
    const seam = await import('./renderer-source.ts')
    try {
      const renderer = await seam.loadOutputRenderer()
      expect(renderer).toBeUndefined()
      expect(reloadCount).toBe(1)
      expect(document.querySelector(RECOVERY_NOTICE)).not.toBeNull()
    } finally {
      vi.doUnmock('./markdown-output.ts')
      vi.resetModules()
      setOutputRendererLoader(undefined)
    }
  })
})
