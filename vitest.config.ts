import {fileURLToPath} from 'node:url'
import {defineConfig} from 'vitest/config'

export default defineConfig({
  plugins: [{
    // rm-1983: public/operator-launch.js's DOM shell dynamically imports the
    // browser-absolute '/static/operator-stream.js?manual=1' (the real browser
    // resolves it through the server's /static mount). The Vitest module runner
    // externalizes absolute-path imports before resolve.alias is consulted, so
    // resolveId is the interception point. Without it, jsdom-driven
    // initOperatorLaunch tests cannot execute the real submit path — bounded-
    // wait fetch + form recovery — and that surface stays pinned at the
    // source-contract level only.
    name: 'rm-1983-static-stream-alias',
    enforce: 'pre',
    resolveId(source) {
      if (source === '/static/operator-stream.js?manual=1') {
        return `${fileURLToPath(new URL('./public/operator-stream.js', import.meta.url))}?manual=1`
      }
      return null
    },
  }],
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
  },
})
