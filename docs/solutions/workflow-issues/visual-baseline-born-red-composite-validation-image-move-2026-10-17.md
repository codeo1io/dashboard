---
title: composite full-validation goes born-red when main's pinned visual image advances past a run's base — regenerate only the stale baseline inside the exact pinned image, and remember PNG swaps move the validation digest
date: 2026-10-17
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: ci_visual_gate
severity: high
applies_when:
  - the detached full validator (github_ci_validate.py) returns ok:false with exactly one red: the visual job's toHaveScreenshot on one baseline
  - the run's base predates origin/main's visual.yaml pw-image pin advance (the rm-142 playwright lockstep line)
  - the batch itself touches zero visual/UI surfaces
---

## Problem

The composite validator builds its validation tree as worktree HEAD **plus a
current-origin/main workflow overlay**. When main advances the visual job's
pinned image — here the rm-142 lockstep moved
`mcr.microsoft.com/playwright:v1.63.0-noble` to
`v1.64.0-noble@sha256:06a9939e57531807f8d5fd76ce44b53165ffb7d7501d87ab10e285c20b1e971f`
— every later validation tree renders compares in the NEW image against
baselines captured under the OLD image. The visual job then reddens even for
batches that never touch a UI surface. First-hand 2026-10-17, run
`34bc202620e5` full-validation prior attempt (`ec7ec6f4` family): ephemeral
validation branch `conductor/ci-ecd9654d1fd1` returned `ok:false` with exactly
ONE failing check — visual, `dashboard-operator-dark-chromium-linux`, 2 of 3
baselines green — on a repository-maintenance batch with no UI change.

The failure is deceptive because it does not look like an environment problem:
the caret pin (`^1.63.0`) with the lockfile already resolving
`@playwright/test 1.64.0` launches the browser fine. There is no version error
— only silent pixel drift between baseline-era and compare-era rendering. It
rides on top of the older provenance rule
(`visual-baseline-provenance-pinned-image-2026-09-22.md`): that entry pinned
the render environment so BASELINE and COMPARE agree; this one covers the case
where an *external* pin advance re-invalidates an already-proven baseline
*after* the fact, mid-run.

## Fix

Regenerate ONLY the stale baseline, inside the EXACT pinned image, with CI
parity:

```
docker run --rm -v "$PWD:/repo" -w /repo \
  -e CI=true -u 1001:1001 \
  mcr.microsoft.com/playwright:v1.64.0-noble@sha256:06a9939e... \
  npm exec --yes pnpm@11.28.5 exec playwright test tests/visual \
  --update-snapshots --project=chromium
```

- `CI=true` keeps Playwright in CI mode; pnpm invoked via `npm exec` so the
  container needs no corepack; mount at the same path CI uses and run non-root
  (font cache/config parity); the webServer step builds `web/dist` itself.
- **Prove determinism before trusting the capture**: run the regen TWICE,
  independently, and `cmp` the two artifacts — they must be byte-identical
  (run 34bc2026: two captures of `dashboard-operator-dark.png` identical, md5
  `e397a0539cf3fc84cd5129a5675d766a`, 316204 bytes). Then run a clean compare
  pass (no `--update-snapshots`) — all suites green including axe.
- **Sanity-check the result against lineage**: the fresh capture equaled the
  fleet-proven CI-green baseline of that UI era. A regen that lands on the
  era-proven bytes recovered truth; a regen that lands on novel bytes is a new
  roll of the dice (the 2026-09-22 entry's failure mode) — re-examine before
  keeping it.
- Re-run the detached validator to confirm `ok:true` end-to-end (run
  34bc2026: PR #843, 11 checks green including visual).

## Digest and landing-fold rules

- **PNG baseline swaps are validation-digest-relevant** (engine release
  `01d80a427ec3`): A/B proven by revert-and-re-derive — committing the regen'd
  PNG moved `validation:v1:6c35b55a…` to
  `validation:v1:2d9c25dabf9e0eab933f1a01fcead122a1926494bb986aaacbc3d731f090a25f`.
  This supersedes any older "PNG regen is digest-neutral" note. Any turn that
  touches a baseline must re-derive and re-declare the digest.
- **Validation-era PNGs do not ride the landing fold.** A batch that changes no
  UI must not carry validation-era baselines into main: at the fold take
  MAIN's current baseline for that surface, and keep the PNG byte-stable or
  re-derive and re-declare the digest. Never hand-resolve a baseline conflict
  to the validation-era capture.
- Related jitter fact (same run): `dashboard-listener-dark` renders
  run-to-run at different sizes (26323B committed vs 24741B fresh) while
  passing inside the 1% `maxDiffPixelRatio` — if CI reddens there, suspect
  time-dependent fixture rendering first, not baseline provenance.
