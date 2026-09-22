---
title: visual screenshot gates are only deterministic when baselines are captured in the same pinned image that compares them
date: 2026-09-22
module: dashboard
problem_type: workflow_issue
component: ci_visual_gate
severity: high
applies_when:
  - adding or modifying Playwright screenshot tests or their baselines
  - moving the visual job between runner types (self-hosted, hosted, container)
---

## Problem

A screenshot comparison asserts equality between pixels rendered at BASELINE
time and pixels rendered at COMPARE time. If those two renders happen in
different environments, the test measures environment drift, not UI drift.

Concretely (2026-09-22): the visual job moved to GitHub-hosted `ubuntu-latest`
(a rolling image) while the three dark baselines had mixed provenance —
`privacy-dark` was cloud-regenerated at aa9937f but `dashboard-listener-dark`
and `dashboard-operator-dark` were still workstation-captured at 4b1b406. The
mismatch went red on run 35678222963 (at 7809df6) and was "fixed" by another
regen on the rolling image — which only re-rolled the dice, since
`ubuntu-latest` itself drifts (font stacks, chromium builds) without any
commit touching the repo.

## Fix

Pin the ENTIRE render environment to one container image and regenerate every
baseline inside it (rm-142, landed with the cycle-7 batch):

- Job container: `mcr.microsoft.com/playwright:v1.63.0-noble` (digest-pinned
  in `.github/workflows/visual.yaml`; playwright and its chromium move
  together with the image, so the separate runtime chromium-install step was
  removed).
- Job containers run as root: chromium refuses to launch without
  `--no-sandbox`, provided via `launchOptions` in `playwright.config.ts`
  (harmless on other runners).
- Baseline regen procedure (also documented in the `tests/visual/dashboard.spec.ts`
  header): delete the baseline PNGs and run, inside that image,

  ```bash
  docker run --rm -v "$PWD:/repo" -w /repo \
    -e PLAYWRIGHT_BROWSERS_PATH=/ms-playwright -e CI=1 \
    mcr.microsoft.com/playwright:v1.63.0-noble bash -Eeuo pipefail -c '
      npm install -g pnpm@11.27.0 && pnpm install --frozen-lockfile
      pnpm exec playwright test --update-snapshots'
  ```

- Then verify with the same command minus `--update-snapshots` — a regen that
  cannot reproduce itself is not a baseline.

Bump the image digest the way any other dependency pin moves (dependabot
owns it; never a moving tag). The in-container install poisons host
node_modules — see
`docs/solutions/workflow-issues/container-pnpm-install-poisons-host-node-modules-2026-09-22.md`
before running the procedure locally.

## Detection

Mixed-provenance baselines are visible in history: `git log --oneline -1 --
tests/visual/__screenshots__/...` per baseline file. If the last-touch
commits disagree, or the job's runner description differs from the baseline
capture environment, the gate is nondeterministic by construction.
