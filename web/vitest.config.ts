import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import {defineConfig} from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: 'web',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Mirror the root vitest.config.ts rationale: a contended runner regularly
    // needs more than vitest's 5000ms default per test (sized 2026-09 on the
    // then-shared self-hosted runner), which produced full-suite timeout
    // flakes while isolated runs passed.
    testTimeout: 30_000,
    // rm-502: cap the worker pool (see root vitest.config.ts for the full
    // rationale + solutions doc). The web suite is jsdom-heavy; two workers
    // bound its memory + thread footprint under fleet load while keeping the
    // 30-file suite comfortably parallel. EPIPE crashes in
    // ForksPoolWorker.send under load (run 6e3689681bd0, 2026-10-02) were
    // transient pool/IPC failures — infra, not regression.
    maxWorkers: 2,
    // vite-plugin-pwa virtual modules are not resolvable in the test environment.
    // Alias them to stub files so tests that import components using useRegisterSW
    // don't fail with "Cannot find module 'virtual:pwa-register/react'".
    alias: {
      'virtual:pwa-register/react': new URL('./src/pwa/__mocks__/virtual-pwa-register-react.ts', import.meta.url).pathname,
    },
  },
})
