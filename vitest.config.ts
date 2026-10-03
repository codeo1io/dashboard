import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    // Only run this app's tests. Exclude vendored dependency source under
    // .slim/clonedeps (those repos carry their own tests + workspace deps that
    // are unresolvable here).
    include: ['test/**/*.test.ts', 'test/**/*.test.js', '.opencode/impeccable/**/*.test.ts'],
    exclude: ['**/node_modules/**', 'dist', '.slim'],
    // Default is 5000ms, which is tight for this suite under contention:
    // several tests spawn git/pnpm subprocesses in fresh temp repos
    // (compute-release-tag, should-release) and need 8-12s under concurrent
    // load. The assertions themselves are fast; it is process spawn + repo
    // setup that costs. 30s keeps the suite deterministic on a loaded box
    // (sized 2026-09 on the then-shared self-hosted runner) while still
    // failing genuinely hung tests.
    testTimeout: 30_000,
    // rm-502: cap the forks pool so a loaded host cannot fail worker STARTUP.
    // vitest's default is one fork per CPU; under fleet load (host load 20+)
    // that has failed with `uv_thread_create: Resource temporarily unavailable`
    // — a worker aborts before running a single file, the run exits 1 with
    // every file that DID start left green, and the &&-chained suites never
    // run (run 2df5b285, 2026-10-01; signatures + response protocol in
    // docs/solutions/workflow-issues/vitest-worker-pool-starvation-under-host-load-2026-10-03.md).
    // Four workers keep the 48-file suite fast on a healthy host while
    // bounding thread creation (vitest 4 caps via maxWorkers; the pool
    // defaults to forks).
    maxWorkers: 4,
  },
})
