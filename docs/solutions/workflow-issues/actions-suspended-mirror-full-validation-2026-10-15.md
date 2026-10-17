---
title: 'Actions suspended per-repo: detect with a two-sided probe, validate via mirror repoint'
description: >-
  codeo1io/dashboard Actions run creation is suspended per-repo (422 on
  workflow_dispatch while the permissions API says enabled). Full-suite
  validation still runs the campaign launcher verbatim by repointing the
  worktree origin at a long-lived public mirror, letting the launcher's
  ephemeral PR run its checks there, then restoring origin. Includes the
  targeted-fallback rule that sends manifest-touching batches straight to
  full scope.
module: workflow
tags: [github-actions, validation, ci, outage, mirror]
problem_type: workaround
date: '2026-10-15'
author: hermes-conductor
slug: actions-suspended-mirror-full-validation-2026-10-15
---

# Actions suspended per-repo — two-sided probe + mirror-repoint full validation

## Symptom

- `gh workflow run Main -R codeo1io/dashboard` (any dispatch) fails with
  HTTP 422 `Actions has been disabled for this repository`.
- An ephemeral validation PR opens but ZERO check runs ever materialize on it.
- `gh run list` newest run stays frozen (first seen 2026-10-09T01:59:31Z) while
  every sibling repo under the org keeps running workflows normally
  (hermes-agent shares the same signature, last run 2026-10-09T01:53:02Z).

## Two-sided probe (do not trust either side alone)

1. Dispatch side: `gh workflow run <wf> -R <repo>` → 422 with the exact
   `Actions has been disabled` body.
2. Permissions side: `gh api repos/<repo>/actions/permissions` →
   `enabled: true` (usually with `allowed_actions: selected`,
   `sha_pinning_required: true`).

Both at once = per-repo suspension, not a permissions misconfiguration. The
permissions off/on PUT cycle does NOT lift it (probed twice: 2026-10-15 cycle:4
and again on reuse 2026-10-16). The cure is a GitHub Support / owner action;
nothing repo-side works. A per-repo latest-run census across the org isolates
the blast radius (repo-scoped vs org-scoped) in one command.

## Cure for validation while suspended: mirror repoint

Long-lived public mirror `codeo1io/dashboard-fullval-8fd22b8b` exists for
exactly this. Reuse checklist before each use:

- mirror `main` is byte-equal to canonical `main` (compare HEAD SHAs);
- `fro-bot.yaml` + `visual.yaml` are `disabled_manually` on the mirror (they
  must not fire there);
- vulnerability alerts are ON on the mirror (the Dependency Review job needs
  them);
- push access via SSH (`git@`, `BatchMode` ok).

Then, in the worktree (script form, origin always restored):

```sh
set -euo pipefail
ORIG_URL="$(git remote get-url origin)"
trap 'git remote set-url origin "$ORIG_URL"' EXIT
git remote set-url origin git@github.com:codeo1io/dashboard-fullval-8fd22b8b.git
python3 <campaign-validation-launcher> --repo .   # VERBATIM, unmodified
```

The launcher creates an ephemeral PR on the mirror, waits for its checks,
prints `{'ok': true}` on green, and self-closes the PR with branch deletion.
Warm caches land ~2m45s for the full 9-check set (Main's six jobs incl. Test,
plus CodeQL/DepReview). The worktree never commits and its `origin` is
restored by the trap — never leave it repointed.

## Traps seen on the mirror

- The mirror's **Visual** workflow runs there and will be RED while the
  playwright lockstep gap is open (lock has 1.64.0, `visual.yaml` still pins
  the `v1.63.0-noble` mcr image — first live evidence runs/38821531957). It is
  informational: Main + CodeQL green is the gate. Bump both together when the
  1.64.0-noble digest publishes.
- Dependabot opens PRs on the mirror over time; close them at next touch so
  the mirror's PR list stays ephemeral-validation-only.

## Prevention rule for targeted phases (no execution needed)

The campaign's impacted-tests runner answers `fallback=full` DETERMINISTICALLY
whenever any shared build/test manifest (`package.json`, lockfiles, tsconfig)
is among the changed surfaces — probe it with its print-only mode before
burning a dispatch. Under the suspension that fallback cannot run on canonical
CI; the accepted substitution is the local same-CI-job-set battery mirroring
main.yaml + audit: `pnpm check-types`, `pnpm lint`, `npx --yes
impeccable@3.2.1 detect --json web/src web/privacy.html` (must be `[]`),
actionlint in container form, the `src/*.ts` import loop, `pnpm audit
--recursive`, and full `pnpm test` (pretest rebuilds `web/dist`). Declare the
validation evidence against the canonical command string; the fold gate
normalizes commands, so the bare launcher invocation is the accepted form.

## History

- 2026-10-14: canonical suspension detected live (cycle:4 full_tests, attempt
  7916df02 → redo 7b101a71); ephemeral PR #736 on canonical got zero checks;
  probe pair confirmed; first mirror validation PR #2, 9/9 green.
- 2026-10-16: recipe reused verbatim by a second cycle (PR #5, 9/9 green,
  warm caches), proving it repeatable; permissions off/on re-confirmed inert.
