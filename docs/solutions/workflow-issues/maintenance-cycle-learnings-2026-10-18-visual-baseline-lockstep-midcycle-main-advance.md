---
module: cicd
tags: ['visual-baselines', 'ephemeral-pr', 'fold-forward', 'upstream-absorb', 'release-signal']
problem_type: workflow-issue
---

# Maintenance-cycle learnings 2026-10-18: visual-baseline lockstep, mid-cycle main advance, signal truth

Three first-hand lessons from repository-maintenance cycle
`6f9b600fdfc34bafb1e868d17e058871` (cycle:2, batch rm-1465 + rm-1467 + rm-1468, base
7042635). All evidence is pre-review cycle evidence: targeted tests (attempt 64d1dd7d) and
full validation (attempt ca95a30f, ephemeral PR #885) were green at write time.

## L1 — visual-baseline lockstep: a mixed-tree validation PR fails visual on a stale baseline even when the candidate code is innocent

**Problem.** `github_ci_validate.py` builds its ephemeral validation PR as a MIXED tree:
`.github/workflows/` comes wholesale from CURRENT origin/main, every other file from the
run's base HEAD. When main lands a workflow change that REQUIRES co-changed non-workflow
companions, any run based before that repair fails `visual` with a stale-baseline compare.
This cycle: main's `visual.yaml` moved Playwright to `mcr.microsoft.com/playwright:v1.64.0-noble`
(image digest 06a9939e…) together with regenerated baselines (rm-142 lockstep repair); our
run-based-pre-repair tree compared a runner-captured 1280x3178 render against the
worktree's stale 1280x966 baseline — `dashboard-operator-dark` grew 86215B → 309843B.

**Solution (sanctioned cure, verified this cycle).** Build the EXACT validation tree with
the engine's own `_prepare_validation_clone` (this also serves as the `git apply --3way`
pre-check), push its head as `conductor/ci-baselines-<attempt>`, run
`gh workflow run visual.yaml --ref <branch> -f update-baselines=true`, harvest the
`visual-baselines` artifact into the worktree (`tests/visual/__screenshots__/…`), then
delete the branch. Runner-captured baselines then pass the PR compare byte-exact. FOUR
earlier full_tests attempts on this run died failing into this trap or on transport; the
cured attempt went green first try.

**Prevention.**
- NEVER capture or edit baselines on the workstation — fonts and rendering differ (the
  cloud-font-stack lesson); baselines are only valid runner-captured via the regen lane.
- Before diagnosing a visual failure as candidate-caused, diff the baseline dimensions vs
  the runner's render; a dimension/size jump with green logic tests is the lockstep
  signature, not a regression.
- Digest note: `tests/` is executable-classed, so a harvested baseline PNG changes the
  validation digest — re-derive and declare it (this cycle's post-harvest digest was
  recorded in the full_tests phase result).

## L2 — mid-cycle main advance breaks the ephemeral-PR apply; fold forward by content, never by base

**Problem.** The validator applies the worktree's delta (vs the run base) onto CURRENT
origin/main. Sibling runs landed 4 commits mid-cycle that touched the SAME four workflows
this batch edited: agent pin moved to v0.122.2 (we had v0.122.3), codeql digest comments
rewritten, setup-node bumped to v7.1.0. The 3-way apply hard-failed on every retry until
reconciled.

**Solution.** `git fetch origin` first; for every overlapping surface, `git checkout
origin/main -- <file>` and re-apply only the run's UNIQUE hunks onto it (here: the #641
version step + build-args, the rm-1465 header rewrite, and a 1-line re-anchor
v0.122.2@06469674 → v0.122.3@7d273ac643c8f9c0dc8615222677693dc337adef). The re-run
applied cleanly and validated green.

**Prevention.**
- In any cycle spanning many hours, re-fetch origin/main immediately before EVERY
  validation dispatch and diff the changed-surface set against main's new delta; overlap
  found = reconcile by content before dispatching.
- Take main's version for any hunk whose semantic content main already carries (digests,
  action bumps); re-assert only strictly-newer or unique content (version re-anchors must
  cite the re-derived tag sha, not the old research note).

## L3 — a health check must measure the channel it guards; absorb windows must be counted by content

**Problem.** rm-740's release-channel staleness check measured the calver TAG stream (a
secondary, foreign-polluted namespace — origin max 2026.10.25 is foreign-born, local refs
carry upstream-born tags) and parsed it under a day-scheme that silently discarded 11 real
tags, so it reported `healthy` while the actual release lane (GitHub Releases) was absent:
`HAS_RELEASE_APP` false, empty secrets, `releases/latest` 404. Separately, the research
phase classified upstream PR #604 as unabsorbed when its commit was already inside the
release content the fork had adopted.

**Solution.** The check now probes the primary signal (`gh api repos/:repo/releases/latest`
— 404 = absence = red BY DESIGN with the decision owner rm-714 named in the step summary),
demotes tags to a labeled secondary, parses PATCH as the unbounded `max(N)+1` counter
`scripts/compute-release-tag.ts` defines, and treats malformed decision records and empty
evidence as extraction errors (never green). The absorb map was corrected by content-diff:
#604 rides the adopted release; windows are counted by content, not PR lists.

**Prevention.**
- When a check exists to detect a dead channel, its verdict must come from the channel
  itself; proxies need explicit "secondary, non-verdict" labels or they will lie.
- "Absence of signal" (404/empty) is a DESIGNED red with a named decision owner — never
  convert it to green, and never "fix" the red by re-widening the threshold.
- Before porting an upstream PR, diff its files' content at the fork's absorb point;
  PR-level window arithmetic double-counts anything that rode an adopted release.
