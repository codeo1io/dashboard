---
module: roadmap
tags: ['repository-maintenance', 'cycle-1', 'compound', 'operator-contract', 'playwright-pins']
problem_type: workflow-issue
owner: dashboard
run_id: 74d2adffdc534ae2a12084413829d1bc
---

# Cycle-1 compound record — run 74d2adffdc534ae2a12084413829d1bc

Repository-maintenance `1ee43152f5c748958879964566d30157:cycle:1` at base
5d5f9be (conductor worktree; ancestor of origin/main 3e3664c — landing
reconciles base-forward). This record compounds the cycle's pre-review
evidence into durable context for the next cycle; review/shipping outcomes
are out of scope here by design.

## Phase ledger

| phase | attempt | durable outcome |
| --- | --- | --- |
| assess | fcf81220 | fresh adversarial pass redone from scratch after 093980369 was provider-killed with no typed result; local battery green (check-types 0, lint 48 pre-existing, 58/3057 + 34/1213); F1-F10 findings all mapped to unlanded sibling bands (no re-mint) |
| research | 5ff32425 | read-only: upstream b16d061, window 21 past cf4c9a7; 8 evidence-backed candidates C1-C8 (absorb core, sign-in recovery, parity tripwire, PWA decision, majors pins, pin riders); registry + agent-release cadence live-probed |
| roadmap | 476690f8 | extension mints rm-1452→renumbered rm-1493 at review-fix (main landed a foreign rm-1452 first — see ADOPTED-ON-MAIN) + riders rm-252/rm-249/rm-271/rm-693; eslint parity 48=48; length-guard green; delivered spool-side (diff later swept — regenerated in-tree at compound) |
| prioritize | d4c7791d | batch 'parity tripwire + run-list ordering fidelity' = rm-1452 (now rm-1493) + #639 port — the only high-value unclaimed surfaces; deferral map covers F1-F10/C1-C8 with named owners |
| stewardship | 51538780 | structured stewardship_request (6 surfaces, 5 must_remain_separate pairs encoding the sibling-fleet boundary) |
| implement | 33aa0a64 | adopted provider-killed 0941b65f tree work, fixed pre-gating defects, gated fresh: 5 paths; 216/216 + 655/655; actionlint clean; parity script red-first LIVE (1.9.0 vs 1.11.0 / v0.122.1 vs v0.122.3) |
| targeted_tests | d0e18298 | verbatim impacted-tests command via temporary GIT_INDEX_FILE (untracked files invisible to discovery — root cause recorded): 12/12 green, runner rc=0 |
| full_tests | aae2fcda | PASSED scope-full via ephemeral PR #797 (commit dfd64653, base 0096217f), ALL checks green 2026-10-16T22:04Z; digest chain dispatch 7f6423f1 → emission d0f08eb0; PR+refs auto-deleted |
| compound | 258cba1c | this layer — rm-1452 (now rm-1493) landed in-tree as implemented with evidence chain, 4 riders + 2 compound annotations, this record |

Dead/superseded attempts (forensics recorded, nothing else durable):
093980369 (assess, reaped), 0941b65f (implement, reaped — tree work adopted),
f29ab23b (targeted_tests, 43s reap), 10c30e9b (full_tests, reaped),
f9ea757 (full_tests — parallel iteration that converged on the same cures;
14-check green on its own ephemeral dispatch; superseded by the PR-#797
attempt as the fold record), e8cf6d4f (implement dispatch with no durable
tree state).

## Batch identity (for review / final_validation)

Everything rides the worktree tree in-place (no patch files this cycle):
8 paths = `.github/workflows/upstream-drift.yaml`, `public/operator-run-index.js`,
`test/operator-run-index-core.test.js`, `scripts/check-gateway-contract-parity.ts` (new),
`test/check-gateway-contract-parity.test.ts` (new), `ROADMAP.md` (lint cure +
rm-1493 mint-as-implemented + riders), `package.json` + `pnpm-lock.yaml`, and
`tests/visual/__screenshots__/…/dashboard-operator-dark-chromium-linux.png`.
The pw pair + PNG were validated by this batch (exact-pin 1.63.0, in-image
baseline e397a053…/316204 B — byte-equal to the failed round's own CI actual;
round2 update byte-identical, round3 no-flag 3/3; PR #797 10/10 green) and
then SUPERSEDED: at review-fix all three are resolved byte-exact to
origin/main's side (see ADOPTED-ON-MAIN) — main landed the 1.64.0 lockstep
trio and regenerated the operator-dark baseline (341452 B) after the #619
operator-view growth. visual.yaml is net-zero (image bumped to 1.64.0-noble
mid-diagnosis, then reverted to the eff16c30 pin as part of the trio cure
below).

## ADOPTED-ON-MAIN riders (review-fix cdf60aa4, 2026-10-17)

Independent review 6f5f9ede returned NEEDS_CHANGES; every actionable cure
was executed at this attempt against a freshly fetched origin/main that had
advanced AGAIN (f521ec7 → c01946e: run 8fd22b8b landed rm-1453, run 85d97dc8
landed the renumbered band rm-1454..rm-1456, and the #619 absorb grew
`public/operator-run-index.js` by 43/45 files' worth of operator-view work —
main regenerated `dashboard-operator-dark-chromium-linux.png` 316204→341452 B
inside 1c7f74a). Riders, all verifiable in-tree:

1. **F1 executed — rm-1452 renumbered to rm-1493.** Main's landed rm-1452 is
   a foreign def (the outage-validation runbook, run ccde661ea990); this
   batch's tripwire def now lands as rm-1493, derived above BOTH the live
   main max (rm-1456 at c01946e) and the sibling-worktree fog ceiling
   (rm-1492 — 80-worktree probe, leader run-65d56bdd). Every in-tree
   reference carries the new numeral (script, test, workflow, this doc,
   ROADMAP def + annotation). The landing gate re-derives if main advances
   past rm-1492 before the fold.
2. **F2 executed, scope widened by main's advance — pw pair AND PNG resolved
   to main's side** (`git checkout origin/main -- package.json pnpm-lock.yaml
   <png>`): our validated-then-superseded 1.63.0 exact-pin is dropped for
   main's landed 1.64.0 lockstep, and the review's "PNG rides neutral"
   premise died with main's post-#619 baseline regen (e397a053/316204 B →
   a6211623/341452 B). Folding the old baseline would regress visual.
3. **Port pair is still load-bearing but no longer merges content-clean.**
   Main's #619-grown `operator-run-index.js` STILL carries the expanded-card
   re-sort lock and has no `isUnlistedOptimisticCard` (verified at c01946e),
   so the #639 port is not absorbed upstream-of-us yet; but ours-vs-main on
   the pair is now a 203+/1279− textual delta, so the fold must rebase the
   port onto main's shape (the landing gate's re-derivation point, recorded
   here because the review verified merge-cleanliness only at f521ec7).
4. **F4/F5/F7 executed in-code** — the rm-252 rider no longer claims the
   port "landed" (and its 'index.. comparator family' mis-description is
   corrected to re-sort-lock removal); `readForkPins` refuses a workflow with
   a second agent pin (exactly-one matchAll, exit-2 resolution failure); the
   latest-tip watch reads `/releases?per_page=10` (prereleases included)
   via the new exported `newestReleaseTag` picker. F6 needed no artifact
   change (evidence-count bookkeeping only).

## Prevention rules (reusable, evidence-backed)

1. **Playwright moves as a coordinated trio** — package exact-pin +
   `visual.yaml` image digest + baselines. Proven this cycle: a caret float
   (`^1.63.0`→lockfile 1.64.0, landed mid-freeze 6179cb7) against a
   digest-pinned 1.63.0 image killed the visual lane at browser launch
   (`chromium_headless_shell-1248` missing); after an image-only bump the
   failure class flipped to snapshot-name mismatch because 1.63↔1.64 also
   changed the default suffix convention (`-chromium-linux` → `-chromium`).
   Cure, proven twice over: land the trio together and adopt main's side
   byte-exact at fold (main has since landed 1.64.0 + the v1.64.0-noble
   @06a9939e image + in-image baselines; never resurrect the 1.63.0 pin),
   and regenerate a drifted baseline in-image. Baseline filenames encode the
   capture era — a suffix mismatch means capture/runtime version skew, not
   pixel drift.
2. **Cross-PR parity probe before self-attribution** — when a check fails on
   an ephemeral PR, pull a sibling PR's same-check result first (PR #762 was
   byte-identical on both Lint and visual): it cleanly separated pre-existing
   main-red from the batch delta and prevented misfixing working code.
3. **Emission-time digest derivation** — `github_ci_validate.py` prints no
   digest; the fold digest is `hermes_conductor.validation_policy
   .validation_digest(base, worktree)`. Derive it directly when a phase must
   declare the post-change digest; never restate the dispatch-time value
   after executable changes.
4. **MCR digest resolution recipe** — anonymous token + registry v2 HEAD with
   `Accept: application/vnd.oci.image.index.v1+json`. Tags get re-pushed, so
   today's tag digest can differ from the digest pinned in the workflow;
   reproduce the existing pin with the same method before trusting a new one.
5. **Dark-window lint debt** — landings during an Actions dark window ship
   ungated (origin/main carried 48 lint problems through the freeze); the
   first revived-CI PR pays the whole debt. Cures must be content-free
   (whitespace + bracket escapes) and pairwise-auditable (`git diff -U0`,
   every pair rstrip-equal except the intended substantive one).
6. **Dead-attempt adoption protocol** — a reaped attempt with no typed result
   but present tree work is adoptable only after verification against the
   authoritative prior-phase payloads; then fix pre-gating defects and gate
   everything fresh (0941b65f → 33aa0a64 this cycle).

## Next-cycle candidates (ranked; existing ids first)

1. **rm-1493 first live weekly run** — the tripwire is born red (1.9.0 pins
   vs 1.11.0 contract, v0.122.1 vs v0.122.3 tip); confirm the alert surfaces,
   then let the absorb batch retire the drift it watches.
2. **rm-252 absorb batch** — window at 3dd78ee (23 commits); re-check sibling
   occupancy (rm-873 shape-tolerant #631, rm-874 waiting-overlay half) before
   selecting; the probe-path family (1.11.0 pin flip, run-responses.ts
   retirement) stays deployment-gated while `marcusrbrown/infra` is absent.
3. **Playwright trio bump policy** — mint the coordinated-bump rule (this
   record's rule 1) as a ledger item under the rm-271/rm-142 lineage, plus a
   `snapshotPathTemplate` pin for naming determinism across bumps.
4. **rm-271 majors one-pass** — scheduled against the in-repo hooks:
   dependabot majors re-evaluate 2026-10-21, rm-139 Node-26 window 2026-10-28.
5. **Lint-debt recurrence guard** — fold this cycle's cure evidence into the
   unlanded sibling items (rm-1448/rm-849/rm-864) so the next freeze exit
   doesn't re-accumulate ungated whitespace debt.

## Dangling-reference note

The riders deliberately cite unlanded sibling-band ids (rm-873, rm-874,
rm-1408, rm-1451) as occupancy pointers; they stop dangling at the gate
when those bands reconcile by title. The ledger's own def now cites rm-1493
(defined in this tree; above the rm-1492 fog ceiling probed at renumber
time, so later-minted sibling bands at ≥rm-1493 are expected to co-exist —
first-landed-wins renumbering is the recorded reconciliation). No guard at
this base enforces def-or-trace for prose citations; the later-main
citation-guard family (#18831) will need its ALLOWED map extended at that
fold if these bands have not landed by then.
