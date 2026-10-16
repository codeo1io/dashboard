---
module: workflow-issues
tags: ['visual-gate', 'ci', 'playwright', 'lockfile', 'conductor']
problem_type: environment-drift
---

# Visual gate red before any test runs: Playwright npm/image lockstep drift

Date: 2026-10-17 · Resolved across conductor conflict cases 58e759a5 →
982d51f9 (run f2821fb57c34, integration item 6524c8367131 — CI validation
runs 38968814103 then 38970619626). Two stacked failure modes, one per case:
first the npm/image skew below, then — once the suite could actually run — a
stale `dashboard-operator-dark` baseline (see "Second failure mode").

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

## Second failure mode — the red that remained after the skew was cured

With the exact pin in place the suite ran again (run 38970619626) and two of
three tests passed, but `dashboard home — operator view (dark theme)` failed:

```
Expected an image 1280px by 966px, received 1280px by 3178px.
```

That is NOT environment skew and NOT a regression of the batch under
validation — it is baseline debt on main itself. The operator home render
evolved on main (upstream-adoption lineage: always-current run list / waiting
overlays) after the last baseline regen (c4404af era), and because the visual
gate is report-only by design, merges continued while the baseline went
stale. Any change touching a visual trigger path (`package.json`,
`pnpm-lock.yaml` per rm-420) then surfaces the debt as a fresh red.

Diagnosis discipline: the received height (3178px) matching the current
fixture render while listener/privacy baselines still pass isolates the drift
to the operator-home baseline alone; a batch that touches no `web/src/**` or
`public/*.js` runtime file cannot have caused it (verify with
`git diff --name-only <base>` against those paths before touching anything).

Cure: regenerate the stale baseline in the pinned image and land it with the
batch. Provenance rule (rm-142): baselines are captured by the
`visual` workflow's `update-baselines` dispatch (ephemeral
`conductor/visual-capture-*` branch), never on a workstation. The regen used
here was captured 2026-10-16T18:38Z (run 38948990327, capture commit
cbbc4375) inside the same digest-pinned `v1.63.0-noble` image on a tree whose
render-relevant content is identical to origin/main — adopted byte-identically
(git blob `793964ba…`, 1280×3178) rather than rebuilt, per the fleet's
fold-by-content rule. Sibling lanes validating the same artifact ran green
(run 38969720403).

Prevention: when a landing knowingly changes operator-home rendering, regen
the baseline in the same change; the report-only design converts silent debt
into a red gate the moment an unrelated batch touches a trigger path.
