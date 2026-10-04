---
module: web/operator
tags: [testing, operator-runtime, idempotency, localstorage, vitest]
problem_type: testing methodology
---

# Operator runtime loader test seam, idempotency-wedge analysis, and the web localStorage recipe

2026-10-04, run 86c2dd13503b cycle 1 (rm-619). Two durable testing lessons
from landing the partial-boot teardown fix.

## 1. The `OperatorRuntimeModuleLoaders` injection seam

`web/src/operator/runtime.ts` `defaultRuntimeLoader` gets its three
dependency modules (`public/operator-stream.js`, `public/operator-run-index.js`,
`public/operator-launch.js`) via dynamic `/static/` imports that only resolve
against a BUILT bundle — unit tests cannot load them. Since rm-619 the loader
accepts an optional second argument:

```ts
defaultRuntimeLoader(opts?, moduleLoaders?: OperatorRuntimeModuleLoaders)
```

with `loadStreamMod` / `loadRunIndexMod` / `loadLaunchMod` overrides
(production behavior byte-identical when omitted). Use it to inject contract
twins when testing the loader's own control flow — especially failure paths
(reject `initOperatorRunIndex` after a successful bootstrap to pin teardown
semantics; see the `rm-619 partial-boot teardown` describe in
`web/src/operator/runtime.test.ts`).

Before minting "permanent leak" claims from a module-scoped wedge, TRACE THE
RESET CALLER, not just the wedge setter. The rm-619 story: operator-stream.js
has an idempotency wedge (`_bootstrapCalled`), and reading the module alone
suggests a failed boot wedges forever. But `defaultRuntimeLoader` itself calls
`resetBootstrapState()` at the START of every invocation — so any later mount
heals the wedge. The real defect was narrower: a failed instance's own
`cleanup()` was a no-op (the cleanup closure is only returned on success),
leaking the pagehide listener + wedge until some FUTURE mount or page unload.
The original ledger claim ("no recovery short of a full reload") was corrected
by a dated rider at implement time — designing the red test forced the
correction before the acceptance was validated against a false premise.

## 2. Running web unit tests under Node 26 (rm-548 class)

Web suites that touch `localStorage` fail under Node 26 (jsdom no longer
polyfills it) unless Node's flag routes storage to a file. Two working
invocations (both verified 2026-10-04):

```sh
# from the repo root — root vitest.config.ts picks the file up by repo path
NODE_OPTIONS='--localstorage-file=/tmp/ls' pnpm exec vitest run web/src/operator/runtime.test.ts

# or explicitly with the web config and web-relative paths
NODE_OPTIONS='--localstorage-file=/tmp/ls' pnpm exec vitest run --config web/vitest.config.ts src/operator/runtime.test.ts
```

Without the `NODE_OPTIONS` flag, exactly the known four-file class goes red
(App / AppShell / Notifications / InstallPrompt, ~100 tests). CI does not need
this — the Main Test job pins Node 24, where jsdom's localStorage still works.
