/**
 * ReloadPrompt tests — component is a deliberate no-op stub.
 *
 * rm-274 truthing: the old kill-switch premise was false — SW registration is
 * live (vite-plugin-pwa auto-injects /registerSW.js; see sw.ts). With
 * registerType 'prompt' and no update-banner surface wired yet, ReloadPrompt
 * intentionally renders nothing and wires nothing, so these tests pin that
 * contract: no DOM output in any hook state, and no update-path callbacks
 * are ever invoked through it. The solved upstream banner is the rm-1935 absorb.
 */

import {render, screen} from '@testing-library/react'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import * as pwaRegister from 'virtual:pwa-register/react'
import {ReloadPrompt} from './ReloadPrompt.tsx'

describe('ReloadPrompt (deliberate no-op update-banner stub)', () => {
  const mockUpdateServiceWorker = vi.fn()
  const mockSetNeedRefresh = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(pwaRegister.useRegisterSW).mockReturnValue({
      needRefresh: [false, mockSetNeedRefresh],
      offlineReady: [false, vi.fn()],
      updateServiceWorker: mockUpdateServiceWorker,
    })
  })

  it('renders nothing regardless of needRefresh state', () => {
    vi.mocked(pwaRegister.useRegisterSW).mockReturnValue({
      needRefresh: [true, mockSetNeedRefresh],
      offlineReady: [false, vi.fn()],
      updateServiceWorker: mockUpdateServiceWorker,
    })
    render(<ReloadPrompt />)
    expect(screen.queryByTestId('reload-prompt')).toBeNull()
  })

  it('never invokes updateServiceWorker — the update path is gone with the SW', () => {
    render(<ReloadPrompt />)
    expect(mockUpdateServiceWorker).not.toHaveBeenCalled()
  })

  it('never invokes setNeedRefresh — no banner state is wired', () => {
    render(<ReloadPrompt />)
    expect(mockSetNeedRefresh).not.toHaveBeenCalled()
  })
})
