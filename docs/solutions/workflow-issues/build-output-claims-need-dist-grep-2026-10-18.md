---
title: Claims about build output must be verified against web/dist, not source — vite-plugin-pwa injects at build time
date: 2026-10-18
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: medium
applies_when:
  - 'A module doc, test note, or roadmap claim asserts what the BUILT shell does or does not contain (e.g. "registerSW.js is NOT emitted", "the service worker has no push handlers")'
  - 'The claim is derived from reading `web/src/**` or `web/index.html` source only'
  - 'The claim concerns anything vite-plugin-pwa owns (registerSW emission/injection, the generated `sw.js`, the virtual `virtual:pwa-register` module)'
resolution: |
  Rebuild and grep the artifact:

    pnpm build:web
    grep -n "vite-plugin-pwa:register-sw" web/dist/index.html
    ls web/dist/registerSW.js
    grep -c "addEventListener('push'\|notificationclick" web/dist/sw.js

  Source-only greps are structurally blind here: with the plugin's default
  `injectRegister: 'auto'`, registration is emitted at BUILD time — there is no
  call site in `web/src` to find, so "no registration call site in source" and
  "every page load registers the SW" were BOTH true simultaneously (assess F2,
  2026-10-17). Test notes about emission go stale the same way: assert them
  against `web/dist` after a fresh build, never against intent.
prevention: |
  Any review or assessment finding that depends on build output ("is X
  emitted", "is Y in the bundle") must carry a dist grep as evidence. A
  doc-vs-artifact contradiction is invisible to source-only review AND to
  source-text string-match test guards — pin artifact assertions in tests that
  run against a freshly built `web/dist` (see the static-assets suite).
evidence: |
  Assess phase 2026-10-17 (run ed8f47e0): three in-repo claims said SW
  registration was stopped/disabled, while a fresh `pnpm build:web` showed
  `dist/index.html` carrying the injected `vite-plugin-pwa:register-sw` script
  tag plus `dist/registerSW.js` — the plugin default emitted and injected
  registration with zero source call sites.
see_also:
  - 'docs/solutions/workflow-issues/targeted-vitest-without-pretest-build-webdist-404s-2026-09-24.md (build web/dist before suites that hit the served surface)'
