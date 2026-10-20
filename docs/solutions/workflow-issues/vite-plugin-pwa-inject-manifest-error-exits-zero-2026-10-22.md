---
title: vite-plugin-pwa inject-manifest failure prints "error during build" but vite exits 0 — assert the SW after the build
date: 2026-10-22
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: medium
applies_when:
  - '`vite build web` output contains "error during build: Error: Unable to find a place to inject the manifest" but the command exits 0'
  - Suspecting a broken offline shell (unsubstituted self.__WB_MANIFEST) in web/dist/sw.js
  - 'Chaining post-build steps (gzip sidecars, deploy) behind `vite build` and needing the SW state to be trustworthy'
symptoms:
  - Build log shows a vite-plugin-pwa inject-manifest error from workbox-build while the overall build still reports success
  - web/dist artifacts are produced anyway; gzip sidecars run; CI is green
  - Reproduction is intermittent — rerunning the same clean build usually succeeds
problem: >-
  vite-plugin-pwa performs the service-worker manifest injection in a
  `closeBundle` hook. When workbox-build's inject-manifest rejects there, the
  rejection surfaces in the vite console as "error during build: Error: Unable
  to find a place to inject the manifest", but it is fire-and-forget relative
  to the vite CLI's exit code: `vite build` still exits 0 and every chained
  step (gzip sidecars, CI) proceeds. Observed first-hand 2026-10-22 at this
  fork on vite 8.3.4 (rolldown) + vite-plugin-pwa 1.3.0 — one failure in five
  clean rebuilds, artifacts correct every time (race in the plugin's
  closeBundle double-invocation). The class survives the 2.0.0 plugin bump
  adopted on main (2026.10.59): the masking is structural, so a genuinely
  broken offline shell (residual `self.__WB_MANIFEST`, missing or empty
  precacheAndRoute manifest) would also ship green.
solution: >-
  Do not trust the vite exit code alone for the SW lane. The `build:web`
  script chain now ends with `node scripts/verify-sw-manifest.ts`
  (minted as rm-2300-band rm-2301), which re-reads the emitted
  web/dist/sw.js (or sw.mjs) and fails the lane on the three observable
  broken states: a residual `self.__WB_MANIFEST` token, a missing
  `precacheAndRoute(` call, or an empty manifest array. The unit-suite side
  (token-substitution pinning) already lives at web/src/sw.test.ts. If the
  assertion ever fires, rerun the clean build first to distinguish the
  intermittent plugin race from a real manifest break, then inspect the
  emitted SW before retrying.
verification: >-
  scripts/verify-sw-manifest.ts exits 1 with a named failure when pointed at
  a doctored SW (token left in, or precacheAndRoute stripped) and exits 0 on
  a healthy build; `bun run build:web` carries the check in its chain
  (package.json). Reproduction history: /tmp/assess-test.log head (the
  original masked failure), /tmp/assess-vite-rebuild.log and
  /tmp/assess-build-1..3.log (four clean rebuilds, no repro).
related:
  - rm-2301 (dashboard ROADMAP.md)
  - web/src/sw.test.ts
  - 'docs/solutions/workflow-issues/ — actionlint entry for the container-form pattern this repo uses for pinned tooling'
tags:
  - vite
  - vite-plugin-pwa
  - service-worker
  - build-lane
  - exit-code-masking
---
