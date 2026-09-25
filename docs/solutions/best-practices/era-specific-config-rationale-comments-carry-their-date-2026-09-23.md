---
title: Era-specific rationale comments in config must carry their era and be re-truthed on infra migration
date: 2026-09-23
category: best-practices
module: dashboard
problem_type: best_practice
component: ci-setup-composite
severity: low
applies_when:
  - A config file comment justifies a deliberate non-default choice (e.g. skipping a cache, pinning a version, disabling a check)
  - An infrastructure migration changes the environment the rationale depends on (self-hosted → GitHub-hosted runners, single-node → distributed, persistent disk → ephemeral)
  - Sweeping a repo for stale references after a migration
  - Writing a comment that explains WHY instead of WHAT

## Context

`.github/actions/setup/action.yaml` (the single install seam for all fork CI jobs) carried this
comment from 2026-09-19:

> the pnpm-store actions/cache round-trip was removed. This action runs on a self-hosted runner
> whose pnpm store persists on local disk across jobs, so the GitHub cache-service upload/download
> was pure overhead.

It was true when written. Four days later, d73fbe7/aa9937f moved every fork CI job to ephemeral
GitHub-hosted `ubuntu-latest` runners — and the comment survived the migration, now false, still
actively arguing against the exact fix the new environment needed. Result measured 2026-09-23
(cycle-7): every Main job cold-installed from the registry; the `test` job's "Install dependencies"
step alone was **5m0s of an 11m15s run** (run 27610828410) — roughly 45% of CI time paying a cost a
one-line `cache: pnpm` removes. The stale rationale had also suppressed the fix through two prior
reviews because the comment *looked like* current, deliberate reasoning.

The same migration left a family of era-stale claims behind (`main.yaml:132` pipx note,
`codeql.yaml:42`, `release.yaml:438` buildx note, `AGENTS.md:47`, `dependabot.yml:10` grouping
rationale) — each individually harmless, collectively a false map of how CI actually runs.

## Guidance

1. **Date every rationale comment.** A comment that argues for a non-default choice should start
   with the date and the environment it measured: "2026-09-19 (self-hosted runner era): …". Undated
   rationale reads as eternally true; dated rationale invites re-truthing.
2. **Re-truth rationale in the migration that falsifies it.** The runner-migration PRs that made the
   store-persistence claim false should have updated or deleted it in the same change. A migration
   sweep is not done when the jobs pass — it is done when the *comments describing the old world*
   are gone. Sweep WITHOUT file-extension filters (see the related Dockerfile lesson: extension-less
   files hid `COPY wiki-writer/` lines from every extension-filtered grep).
3. **Measure, don't assume, when a comment blocks a fix.** The decisive evidence was a live CI run
   (install step 5m0s), not the comment's plausibility. When a comment and a measurement disagree,
   the comment loses.
4. **Replaced, not appended.** When fixing, rewrite the stale comment to state the new measurement
   (done in cycle-7 — rm-145 on the landed tree; the batch authored it as rm-142 — where the comment
   now cites live ubuntu-latest install timings) instead of stacking a second comment on top of the
   corpse of the first.

## Why This Matters

Comments are load-bearing for reviewers: a confident false comment out-argues a correct instinct in
every later review. The cost here was measured in ~5 minutes × 6 jobs × every CI run for four days.
The pattern generalizes to any environment-dependent choice (caches, concurrency limits, timeouts,
runner types, single-instance assumptions).

## When to Apply

- Writing any `# <date>: we do X because <environment fact>` comment.
- Executing or reviewing an infra migration's cleanup pass.
- Finding a comment that justifies a choice you're about to reverse — verify the environment fact
  live before trusting the comment either way.

## Related

- `docs/solutions/workflow-issues/truth-claims-must-be-scoped-to-origin-main-2026-09-23.md` —
  same-cycle sibling lesson (prose claims needing explicit measurement scope)
- `ROADMAP.md` rm-145 — the fix and its post-merge timing-evidence acceptance (this doc was
  authored under the sibling cycle-7 batch's id rm-142, which main had already given to the visual
  deterministic-gate item; renumbered at the 2026-09-26 integrate, conflict case a911e1e1)
- Migration-era context: PRs d73fbe7 (#11) and aa9937f (#12), self-hosted → ubuntu-latest
