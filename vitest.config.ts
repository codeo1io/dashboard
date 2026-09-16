import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    // Only run this app's tests. Exclude vendored dependency source under
    // .slim/clonedeps (those repos carry their own tests + workspace deps that
    // are unresolvable here).
    include: ['test/**/*.test.ts', 'test/**/*.test.js', '.opencode/impeccable/**/*.test.ts'],
    exclude: ['**/node_modules/**', 'dist', '.slim'],
    // Default is 5000ms, which is tight for this suite on a shared self-hosted
    // runner: several tests spawn git/pnpm subprocesses in fresh temp repos
    // (compute-release-tag, should-release) and need 8-12s under concurrent
    // load. The assertions themselves are fast; it is process spawn + repo
    // setup that costs. 30s keeps the suite deterministic on a loaded box
    // while still failing genuinely hung tests.
    testTimeout: 30_000,
  },
})
