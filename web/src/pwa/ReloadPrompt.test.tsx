/**
 * ReloadPrompt tests — component is a no-op under the SW kill-switch.
 *
 * SW registration is disabled for this deployment (see sw.ts: the service
 * worker exists only to remove the old PWA shell from clients). ReloadPrompt
 * intentionally renders nothing and wires nothing, so these tests pin that
 * contract: no DOM output in any hook state, and no update-path callbacks
 * are ever invoked through it.
 */

import {render, screen} from '@testing-library/react'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import * as pwaRegister from 'virtual:pwa-register/react'
import {ReloadPrompt} from './ReloadPrompt.tsx'

describe('ReloadPrompt (no-op under SW kill-switch)', () => {
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
