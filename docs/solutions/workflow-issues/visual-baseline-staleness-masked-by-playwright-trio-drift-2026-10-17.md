---
title: Visual baseline staleness masked by Playwright trio drift
date: 2026-10-17
category: workflow-issue
module: ci
component: visual
problem_type: latent-failure
severity: high
tags:
  - playwright
  - visual-regression
  - snapshots
  - ci
solution: attribute-then-regenerate
related:
  - docs/solutions/workflow-issues/visual-baseline-provenance-pinned-image-2026-09-22.md
lesson: a lane that dies before the comparison cannot tell you your baseline is stale
---

# Visual baseline staleness masked by Playwright trio drift

## Symptom

Full validation (ephemeral PR) reported the visual check red:

```
dashboard-operator-dark: expected 1280x966, actual 1280x3178 (diff 1280x3178)
```

The batch under test was operator-surface JS/TSX ports — nothing that plausibly
changes a 69% pixel rectangle. The other two specs stayed green.

## Root cause — two stacked failures, only one visible

1. **The mask (long-standing):** the Playwright trio is internally inconsistent
   — `package.json` declares a caret range, the lockfile resolves `1.64.0`, and
   `.github/workflows/visual.yaml` pins the browser image at `1.63.0`. The lane
   dies at browser launch with

   ```
   Looks like Playwright was just updated to 1.64.0.
   current: mcr.microsoft.com/playwright:v1.63.0-noble required: v1.64.0-noble
   ```

   A launch kill is a **green-looking** state in history logs (the job fails
   fast, every run fails identically) and it means **zero pixel comparisons have
   run for weeks** — the lane was red for a boring reason, so nobody noticed it
   had also stopped protecting anything.

2. **The hidden staleness:** the operator-dark baseline (966px tall) predates
   fixture-harness scenario growth (new rows in the operator fixture harness,
   ~3178px of rendered content). Curing the trio exposes the stale baseline
   immediately: the very first successful comparison fails on geometry, not on
   any regression.

## Attribution (prove the batch is visually neutral before touching baselines)

Do NOT regenerate a baseline to make a full-suite red go away without first
attributing the diff:

- **Pristine base** (untouched `3e3664c` in the pinned container): the visual
  lane dies at browser launch — the trio kill is base-inherent, not batch-caused.
- **Control tree** (pristine + ONLY the pin cure, exact `1.63.0` for
  `@playwright/test`): 1 failed — the identical 966-vs-3178 geometry diff.
- **Full delta pre-regen**: the identical failure, and the actual PNG md5
  (`e397a0539cf3fc84cd5129a5675d766a`) is **byte-identical to the control's**
  actual → the batch ports render pixel-for-pixel identically to the pin-cured
  base; the red belongs to the baseline, not the batch.

## Cure

Regenerate exactly the stale baseline, inside the pinned image, with a
frozen-lockfile install:

```sh
docker run --rm -it \
  -v "$PWD":/repo -w /repo \
  -v ~/.nvm/versions/node/v24.21.0:/opt/node24:ro \
  mcr.microsoft.com/playwright:v1.63.0-noble@sha256:eff16c30e6f3f4af0a03fa4b706120d5e9b0891c344a27d64559aff5900a4a27 \
  bash -lc 'export PATH=/tmp/pnpm-bin:/opt/node24/bin:$PATH; \
    npm i -g pnpm@11.28.5 --prefix /tmp/pnpm-bin; \
    pnpm install --frozen-lockfile; \
    rm tests/visual/__screenshots__/<spec>/dashboard-operator-dark-chromium-linux.png; \
    pnpm exec playwright test --config tests/visual/playwright.config.ts --update-snapshots <spec>'
```

- Deterministic: regen'd baseline md5 == the failing actual md5.
- Census the other baselines before/after (md5 both sides) — only the one PNG
  may move.
- In-image verify afterwards: the full visual spec file passes (3 passed) with
  no CI needed (~1-2 min local).

## Traps

- **Regenerating a baseline MOVES the validation digest.** Baseline PNGs
  classify as executable surfaces in the engine's validation policy, so the
  digest changes (`97716cf6…` → `a659ee49…` here). Declare the emission-time
  digest at the review gate; a stale copy from dispatch time is rejected.
- **The trio fix and the baseline regen are separable claims.** The trio
  (caret-range lockfile vs image pin) is still structurally wrong — this fix
  pins `@playwright/test` to exactly `1.63.0` in the lockfile as the minimal
  cure; aligning the range/image to a newer minor belongs to dependency
  maintenance, not to a correctness batch.

## Prevention

- When a scheduled lane fails identically for N consecutive runs, check whether
  it is failing **before** its core assertion (launch kill = zero protection).
- Any change that grows rendered fixture content must regenerate the affected
  baseline in the pinned image in the same change — or the lane (once cured)
  goes red on geometry.
- `--update-snapshots` only ever inside the image the workflow pins, with a
  before/after md5 census of every sibling baseline.
