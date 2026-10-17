---
title: Visual lane dies when a caret pin, the lockfile, and the snapshot baseline drift apart — exact-pin, regenerate, re-declare the digest together
date: 2026-10-16
category: workflow-issues
module: dashboard
problem_type: dependency_desync
component: continuous_integration
severity: high
applies_when:
  - Playwright visual job fails on a clean tree with a snapshot mismatch that does not reproduce after a plain pnpm install
  - package.json carries a caret range for @playwright/test while pnpm-lock.yaml has already floated to a newer minor
  - CI visual baseline PNG predates the last @playwright/test minor bump (check the baseline's last-touch commit)
---

## Problem

The visual job (`tests/visual/dashboard.spec.ts`) compared the served operator
page against the Playwright snapshot baseline at
tests/visual/__screenshots__/dashboard.spec.ts-snapshots/dashboard-operator-dark-chromium-linux.png
using a Playwright version whose
rendering had shifted, while the repo thought everything was pinned. Three
drifts had traveled together and none of them failed a local gate on its own:

1. `package.json` declared `@playwright/test: ^1.63.0` (a caret, not a pin).
2. `pnpm-lock.yaml` had re-resolved the range to 1.64.x, so CI installed a
   different minor than anyone had verified.
3. The baseline PNG still contained pixels from the last verified render
   (last touched at commit c4404af), so the comparison failed on a
   character of the operator page even though no source change was at fault.

The failure signature was one red chromium job on a tree where every other
check passed, and the same spec passed locally for anyone whose lockfile had
not floated yet. That asymmetry — red in CI, green locally — is the tell that
the toolchain and the baseline disagree, not the source.

## Root cause

A caret range silently delegates toolchain selection to whichever `pnpm install`
re-resolves first. Playwright minors legitimately shift font rasterization and
box metrics, so any minor drift invalidates every pixel baseline produced by
the previous minor. Once the lock floats, the baseline is stale by definition,
and nothing in the repo connects the two files to notice.

## Cure (do these in order, as one change)

1. Pin exactly — `"@playwright/test": "<exact version>"`, no caret — to the
   version whose browsers the visual job's pinned image bundles (1.63.0 for
   the original incident, 1.64.0 after main's rm-142 lockstep repair), and
   re-resolve the lockfile so playwright, playwright-core, and any
   `@axe-core/playwright` peer chain settle on matching versions.
2. Regenerate the baseline inside the same image CI uses. Outside that image,
   node version and fontconfig differ and the bytes differ; regeneration
   proof requires two consecutive rounds producing byte-identical output
   (md5 equal) plus one no-flag round passing against the regenerated file.
3. Re-declare the validation digest. A regenerated PNG is an executable
   surface change for digest purposes — the emission-time digest after the
   regen is the one the fold must carry, not the digest computed at dispatch.

Supersession (2026-10-17): the incident's original cure pinned 1.63.0 exact;
one day later main's rm-142 lockstep repair moved the visual image
(v1.64.0-noble@sha256:06a9939e…) and the npm pin (1.64.0) forward together,
and any tree still pinning 1.63.0 became born-red against current main with
`browserType.launch: Executable doesn't exist at
/ms-playwright/chromium_headless_shell-1243/…` — npm 1.63.0 cannot use the
1.64.0 image's browsers. The durable invariant is the three-way pairing —
package.json pin == visual image version == the lock's playwright family —
with the baseline regenerated inside that image. The operator-dark baseline
bytes (md5 e397a053…) survived the 1.63.0 → 1.64.0 move unchanged; main
runs 1.64.0 against these exact bytes green (re-verified on ephemeral
validation PR #821, 2026-10-17).

For this repo the winning baseline bytes were md5
e397a0539cf3fc84cd5129a5675d766a (316204 bytes), reproduced byte-identically
from four independent regenerations across node 22 and node 24 hosts. When a
sibling branch carries a competing baseline, md5-equal bytes are the
arbitration test, not commit recency.

## Prevention

- Keep the exact pin forever for pixel-comparing toolchains; treat a caret on
  `@playwright/test` as a defect, not a convenience. Dependabot/Renovate majors
  must pair with a baseline regeneration in the same PR.
- When CI is the only place the suite runs the pinned image, regenerate there
  (or in the documented pinned-image recipe) and record the md5 in the PR
  description so the next maintainer can tell a real pixel regression from a
  stale baseline at a glance.
- If a provider-died or aborted attempt left the regen half-done in a shared
  worktree, verify adoption by re-deriving the tree digest before trusting any
  claimed regeneration.
