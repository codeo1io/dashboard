---
module: workflow-issues
tags: ['visual-gate', 'ci', 'playwright', 'lockfile', 'conductor']
problem_type: environment-drift
---

# Visual gate red before any test runs: Playwright npm/image lockstep drift

Date: 2026-10-17 · Resolved in conductor conflict case 58e759a5 (run
f2821fb57c34, integration item 6524c8367131 — CI validation run 38968814103)

## Problem

The `visual` workflow (report-only visual-regression + axe gate) fails with
every test erroring in ~1 ms and no browser ever launching:

```
Error: browserType.launch: Executable doesn't exist at
/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell
Looks like Playwright was just updated to 1.64.0.
Please update docker image as well.
- current: mcr.microsoft.com/playwright:v1.63.0-noble
- required: mcr.microsoft.com/playwright:v1.64.0-noble
```

The failure looks like a rendering regression (screenshots! baselines!) but is
pure environment skew: the npm-resolved `@playwright/test` does not match the
digest-pinned render container in `.github/workflows/visual.yaml` (rm-142), so
Playwright refuses to launch against the image's `/ms-playwright` browser set.

## Root cause

`.github/workflows/visual.yaml` pins the render container
(`mcr.microsoft.com/playwright:v1.63.0-noble@sha256:eff16c30…`) while
`package.json` declared `"@playwright/test": "^1.63.0"`. The Oct-11 lockfile
regen doctrine (`pnpm --lockfile-only`, used when adopting upstream releases)
floats range specifiers to the newest in-range version, so the regen at commit
2d67bd59 (2026-10-12 upstream adoption) silently moved the lockfile to
`@playwright/test@1.64.0` — one minor ahead of the image. The gate went red on
the next run that touched a visual trigger path, including origin/main's own
push of 9fead35 (run 38968814103-era; every visual run 2026-10-16 with the
caret spec in tree failed this way).

This is exactly the drift class rm-760's riders hold closed:
`@playwright/test 1.64.0 stays double-gated (mcr digest unverifiable + visual
lockstep)`.

## Diagnosis

- `gh run view <visual-run-id> --log-failed` → the
  `browserType.launch: Executable doesn't exist` + "Please update docker image"
  banner names BOTH versions; the newer one is the npm side, the older one is
  the image.
- Confirm the skew in-tree: `grep -n "playwright/test" package.json
  pnpm-lock.yaml` vs `grep -n "image: mcr.microsoft.com/playwright"
  .github/workflows/visual.yaml`.
- If the two agree and the gate is still red, this is NOT the problem — keep
  looking (baseline diff, fixture data, font stack).

## Cure

Restore lockstep in the same direction the standing decision holds (the image
side is authoritative until rm-760's double gate lifts):

1. Pin the npm side exactly — `"@playwright/test": "1.63.0"` in
   `package.json` (no `^`/`~`), so a future `pnpm --lockfile-only` regen cannot
   float it again.
2. Regenerate/repair `pnpm-lock.yaml` to resolve
   `@playwright/test@1.63.0` / `playwright@1.63.0` / `playwright-core@1.63.0`
   (and the `@axe-core/playwright` peer suffix
   `4.13.0(playwright-core@1.63.0)`).

Bumping to a NEWER Playwright is a three-part move, never a lockfile-only
accident: mcr image tag + digest first (rm-142 — verify the digest is
publishable), then the npm exact pin, then regenerate every baseline under
`tests/visual/__screenshots__/` in the new image.

## Prevention

`test/visual-playwright-image-lockstep.test.ts` pins the invariant at
`pnpm test` time (a required Main check) instead of at visual-run time
(report-only by design): the specifier must be an exact pin, and
`package.json`, `pnpm-lock.yaml` and the `visual.yaml` image must agree on one
version, with the image still digest-pinned.
