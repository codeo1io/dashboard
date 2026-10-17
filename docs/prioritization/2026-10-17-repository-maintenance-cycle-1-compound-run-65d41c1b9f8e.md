---
module: roadmap
tags: ['repository-maintenance', 'cycle-1', 'compound', 'dark-sky-currency']
problem_type: maintenance-compound
owner: dashboard
run_id: 65d41c1b9f8e4c63aad7a7588d4cad09
---

# Repository-maintenance cycle 1 — compound record (2026-10-17, run 65d41c1b9f8e)

Pre-review compounding of the whole cycle: assess `7c266a05` → research `099d1852`
→ roadmap (spool band patch, `9da707f7`) → prioritize `aa2cc15f` → stewardship
`f493b19f` → implement `81f0830c` (fold-rejected) → `95e23dd7` → targeted_tests
`65110893` / `ceaaf76b` / `463e69dd` → full_tests `c467c2b7` (dead) / `5a55564c` →
compound `0d5b6208` (dead) / this record. Batch base `7b4d4256` == origin/main at
cycle open (2026-10-16); the worktree at compound carries the implemented batch as
11 modified + 3 untracked files and nothing else. Nothing was re-validated at
compound; every outcome below is consumed from the recorded typed results, event
logs, and scratch artifacts.

## Phase ledger

| phase | attempt | durable outcome |
| --- | --- | --- |
| assess | `7c266a05` | Actions branch-run dark 7.5+ days (newest run 2026-10-09), protection an empty shell (contexts [], strict false, enforce_admins false), 9 open PRs zero dependabot, 12 findings |
| research | `099d1852` | 10 evidence-backed candidates C1–C10; contract-1.11.0 estate verdict, absorb-window triage set, live npm/action digest resolutions |
| roadmap | `9da707f7` | spool band patch: mints rm-1930 + rm-1931 above the contested frontier (census: origin/main blob 248 defs/max rm-1452, 325 conductor blobs/197 unique/max rm-1464, spool claims to rm-1929), rm-191 census rider; postimage sha256 40daf92a…, 250 defs/0 dups |
| prioritize | `aa2cc15f` | batch `dark-sky currency` = rm-191 tail + rm-1931 + rm-1930, local-verification-only frame |
| stewardship | `f493b19f` | stewardship_request for the batch; no Git topology chosen (Conductor's job) |
| implement | `81f0830c` | banked but fold-rejected KTD13 (PhaseResult lacked validation_evidence.changed_surfaces); tree claims failed re-verification (lint rc 1, check-types rc 2) |
| implement | `95e23dd7` | cure re-fold: full batch implemented, lint rc 0, check-types rc 0, census offline GREEN, zizmor baseline triaged |
| targeted_tests | `65110893` | ephemeral PR #805 10 checks success + Fro Bot skipped (11 check-runs); found and cured the born-red visual lane (playwright caret + stale baselines); executable-surfaces-changed warning declared |
| targeted_tests | `ceaaf76b` | PR #812 green, envelope not banked; carried the mid-run main reconciliation (the cycle's pivotal turn) |
| targeted_tests | `463e69dd` | PR #822 green on the reconciled tree; digest bookends identical pre/post |
| full_tests | `c467c2b7` | dead 62 s, no PhaseResult, nothing durable (PRs #840/#843 belong to other lanes) |
| full_tests | `5a55564c` | verbatim full_command green via ephemeral PR #844: 10 checks success + Fro Bot skipped; main advanced to edf948de |
| compound | `0d5b6208` | dead 2026-10-17T05:34Z, ~160 s, zero output (provider family); nothing to adopt |
| compound | `4332b602` | this record + compound band patch (ledger deltas below) |

## Cycle outcome (compounded)

Batch `dark-sky currency`, final tree state after the ceaaf76b reconciliation:

1. **rm-191 tail (action-pin currency)** — setup-node `949feb2413d6` # v7.1.0
   (6 sites), pnpm/action-setup `ea17c68df8912` # v6.1.0 (3 sites),
   upload-artifact unified to `cf430e030ddb` # v7.0.2 (4 sites), and codeql-action
   left at `24c54180` with its TRUE `# v4.38.3` comment (bare-v4 lie cured; the
   v4.39.0 digest advance was implemented at `6f2ac81f5cd8`, then deliberately
   deferred back at reconciliation because main had taken comment-truth only —
   until main tip `f157cb8b` landed v4.39.0 itself and the review-fix turn
   adopted it, see the addendum). Main's landing 43af4cf adopted the first
   three refreshes byte-identically, so
   the batch's unique rm-191 survivors are the release-channel.yaml setup-node
   site and the release.yaml qemu v4.4.0 site.
2. **rm-1931 (actions-digest drift ladder)** — `scripts/actions-pin-census.ts`
   in the darkness-watch family + `test/actions-pin-census.test.ts` 17/17 offline
   fixtures + the runbook census section with dated run log. Ladder proven live:
   offline GREEN exit 0 (every pin digest-pinned with a true full-semver
   comment); online DRIFT exit 3 on exactly the documented standing rows — one
   row at implement (fro-bot/agent in-tree `15dc1d9d9d14` vs latest v0.122.3
   `7d273ac643c8`), two families after reconciliation (three codeql sites at
   v4.38.3 vs latest v4.39.0, plus the agent row). Bare-v comments fail the
   ladder by construction.
3. **rm-1930 (zizmor beside actionlint)** — `pnpm lint:workflows` =
   `uvx zizmor@1.31.1 --config .github/zizmor.yml .github` with per-line-reason
   ignores in `.github/zizmor.yml`. Baseline re-probed live 2026-10-17: 75
   findings, 9 config-ignored with reasons, 48 tool-suppressed
   (zizmor-internal audit policy — not liftable in-file annotations; zero
   `zizmor: ignore` annotations exist and the suppressed count is identical
   under `--no-ignores`), the 18 reported remainder (5 high, 3 medium, 10
   informational) ledgered as the hardening backlog in
   `docs/runbooks/actions-darkness-watch.md` — zero untriaged; exit 14 with the
   standing backlog is the documented pass state. Open tails: enforced
   container-or-vendored-digest tool form (sdist digest recorded at
   review-fix, see the addendum), CI Check Workflows wiring.
4. **Validation-shaping collateral** (65110893 + ceaaf76b) — the outage hid a
   born-red visual lane: package.json caret `^1.63.0` resolved 1.64.0 against the
   digest-pinned v1.63.0 image while the operator view legitimately grew after
   baselines froze 2026-09-22 (last CI green 2026-10-09). 65110893 cured it in
   the 1.63.0 era (exact pin, lockfile regen, in-image baseline regen:
   operator-dark md5 `e397a0539cf3fc84cd5129a5675d766a`, round-2 regen
   byte-identical); main's NEXT landing `f521ec783cab` (merge of run
   a794d381 — `43af4cf` itself still carried the v1.63.0-noble image and no
   guard test) landed the v1.64.0-noble lockstep repair (image pin
   `06a9939e`, `@playwright/test` 1.64.0 exact,
   `test/visual-playwright-image-lockstep.test.ts`) and ceaaf76b reconciled
   the batch tree's npm-side bytes to that world (package.json 1.64.0 exact,
   pnpm-lock byte-identical to main, listener-dark reverted to HEAD bytes ==
   main's). The worktree visual.yaml keeps the base-era `v1.63.0-noble
   @eff16c30` image — superseded by main's at fold — and the
   reconciled-validation PRs #812/#822/#844 (identical 10-file sets carrying
   no visual.yaml) exercised main's image line, never the worktree's.
5. **Validation chain (consumed, not re-run)** — ephemeral PRs #805 (10 + skip), #812
   (10 + skip), #822 (10 + skip, validation_base 4055016a), #844 (10 success +
   Fro Bot skipped, validation_base 22666c6c, files = 10-path subset of our 14
   changed surfaces); every PR and ci-* branch auto-cleaned. The reconciled
   tree's engine digest `validation:v1:05e0afb2…` proved stable across the
   463e69dd and 5a55564c turns (pre- and post-run bookends).

## Ledger deltas made at compound

- `compound-band.patch` (re-homed at review-fix to delegate scratch
  `4bea2ff8…-scratch/`; the `4332b602…-scratch/` original predates the cures):
  dated compound riders on rm-191 and rm-142; def-line flips rm-1930/rm-1931
  `candidate` → `implemented 2026-10-16/17, validated pre-review, pending
  landing` (mint provenance preserved); dated compound riders on
  rm-1930/rm-1931 with the implementation + validation detail. Census
  unchanged: 250 defs / 0 dups / max rm-1931; managed marker stays the final
  line. Applies AFTER `roadmap-band.patch`; rider text cured at review-fix
  (F1/F4 wording + codeql-adoption updates), final ROADMAP sha256 re-proven
  `2505f02485b90c8db97bf026f66fbbea77ed54ca6cc672201ed6e210d4843022`
  (pre-cure: `ad1c81c5655355b7c87a0d9a36b1c0300d30f62d86fe3b7718c14ed4ad027ddc`).
- The roadmap phase's scratch was swept to `quarantine/scratches/` before
  compound; the band patch and postimage are recovered into this compound's
  scratch, postimage re-proven sha256 `40daf92a…` from pristine HEAD + patch.
- Completed/landed flips stay reserved to landing verification per house rule.

## Reusable lessons recorded this cycle

1. **Outage-hid born-red validation class** — a caret float against a
   digest-pinned runner image plus UI growth invisible during run-creation
   darkness reddens the visual lane the moment CI revives; exact-pinning the
   tool to the image and regenerating baselines INSIDE the pinned image is the
   cure (recipe proven twice this cycle; recorded on rm-142's rider).
2. **A validation phase that cures executable surfaces invalidates its own
   dispatch digest** — declare the change in the PhaseResult (65110893's
   warning) and let the re-dispatched attempt validate the changed tree with
   matching digest bookends (463e69dd proved pre/post equality).
3. **Comment-truth is separable from digest advance** — codeql stays
   `24c54180` with the true v4.38.3 comment while the v4.39.0 advance is
   deferred, and nothing loses machine-checked truth because the census ladder
   enforces comment truth and the runbook owns the advance ledger.
4. **Reconcile-before-validate against a moving main** — main was rewritten
   mid-run (f521ec78c1d0 → f521ec783cab, identical tree) and adopted the batch's
   own pin refreshes (43af4cf). ceaaf76b's pattern is the reusable one: byte-adopt
   main for anything main landed, keep only the true unique delta, then run the
   authoritative validation on the reconciled tree.
5. **Delegate-scratch sweep hazard** — phase artifact paths under
   `delegate/<attempt>-scratch/` are swept to quarantine within hours; a patch
   meant for the commit gate must be re-materialized and sha-proven at the next
   touchpoint (done this turn for roadmap-band.patch).

## Next-cycle candidates + preconditions (concrete, ordered)

1. **Landing verification of this batch** — first action: rm-1930/rm-1931 flips
   to landed, rm-191 disposition, `git ls-files .conductor` empty post-merge,
   runbook online-DRIFT row re-anchor when main's fro-bot.yaml pin (v0.122.2
   `06469674` at edf948de) is adopted at the fold, and a TRUE per-file 3-way
   rehearsal for every overlapping tracked file against the fold-time main tip
   (release.yaml and the setup composite are named; do not trust hunk-range or
   merge-file heuristics).
2. **C1: operator contract 1.11.0 adoption** — highest-impact standing item;
   dependency-blocked on a fresh gateway estate verdict (this cycle's research:
   the agent estate is uniformly 1.11.0 at v0.122.1 and v0.122.3, this fork's
   1.9.0 is the lone laggard; rm-252's INTEGRATE CORRECTION holds — the deployed
   gateway v0.119.2 speaks 1.9.0). Absorb canonical #619 over landing any twin.
3. **C2: absorb-triage of the upstream window** — 27 commits behind at research
   time with zero wiki/write-named files in the diffstat, so the read-only
   never-absorb policy is not crossed by default; exclude write-capability
   surfaces explicitly at absorb.
4. **C4: dependency currency batch** — @opencode-ai/plugin 1.19.x, @types/node
   24.19.2 runtime-matched, hono 4.13.13 floor; rides rm-1449's sweep def and
   owns the pnpm-lock churn.
5. **C7: rulesets fill** — needs a live API PUT and an enforcement decision;
   branch protection is still an empty shell per this cycle's assess.
6. **C10: Trivy triage ledger mint** — low-cost, no runner dependency.
7. **rm-1930 open tails** — zizmor container/vendored-digest tool form and
   wiring into the CI Check Workflows lane.
8. **Push-gated set (from the batch doc)** — rm-742 conductor ref sweep,
   future-dated tag 2026.10.25 deletion, Lockfile Guard workflow restore; all
   need a sanctioned push gate.
9. **NOT ours to re-take** — rm-1411 (sibling-owned verbatim), the doc-truth
   pack (sibling band), the estate verdict rider (4f5fed50), CVE posture (rm-1472
   lineage, sibling cycle:4); and no mint above rm-1931 without re-probing the
   all-lineage def-line frontier.

## Integrate obligations (fresh at compound, 2026-10-17)

- ROADMAP ledger chain vs pristine `7b4d4256`: apply `roadmap-band.patch` THEN
  `compound-band.patch` (both re-homed at review-fix into delegate scratch
  `4bea2ff8…-scratch/`, sha-proven there: roadmap postimage `40daf92a…`
  unchanged, final cured postimage `2505f024…`; the `4332b602…-scratch/`
  originals predate the cures and may be swept).
- Untracked riders of the landing: `.github/zizmor.yml`,
  `scripts/actions-pin-census.ts`, `test/actions-pin-census.test.ts`, this
  record.
- Tracked delta: 11 M (7 workflow/composite files, runbook, package.json,
  pnpm-lock.yaml, operator-dark PNG). Review-fix correction, live re-probe
  2026-10-17 at main tip `f157cb8b`: the earlier edf948de byte-match claim was
  wrong for pnpm-lock.yaml (main's 55086ddc carries `@opencode-ai/plugin+sdk`
  1.19.0 vs this tree's 1.18.35 — a 55-line lock diff already at edf948de) and
  the operator-dark PNG (main `a6211623` vs tree `e397a053`), and the tip had
  also landed the codeql v4.39.0 advance, which textually collided with this
  tree's deliberate v4.38.3 deferral in the validation clone (local 3-way
  simulation: codeql.yaml/release.yaml/scorecard.yaml all conflicted). The
  review-fix turn adopted main's codeql lines at all four sites (ceaaf76b
  pattern). Byte-match at `f157cb8b` after adoption: audit.yaml, codeql.yaml,
  scorecard.yaml, setup/action.yaml (+ listener-dark == HEAD). The fold's true
  content surface is 7 tracked files — release.yaml, release-channel.yaml,
  visual.yaml (base-era image that main's rm-142 repair supersedes), the
  runbook, package.json, pnpm-lock.yaml, operator-dark PNG — and package.json's
  `@opencode-ai/plugin` line (1.18.35 vs main 1.19.0) is lockfile-coherent
  with pnpm-lock.yaml: dep line and lock entries move together at fold or
  `--frozen-lockfile` breaks. Re-derive, do not trust this list blindly at
  fold time.
- Digest for the fold: `validation:v1:05e0afb2…` was the md-only compound-era
  digest (markdown deltas do not move it by design); the review-fix codeql
  adoption moved executable surfaces, so the fold must take the NEW digest
  recorded in the addendum below — re-derive, never trust this one.
- Post-merge: `git ls-files .conductor` must end empty (standing landing trap).

## Review-fix addendum (2026-10-17, attempt 4bea2ff8)

Independent review `db48bb57` returned NEEDS_CHANGES — batch substance
approval-grade, 7 md-only accuracy findings — all cured this turn:

- **F1 (high) lockstep-repair attribution**: the v1.64.0-noble lockstep
  repair landed at `f521ec783cab` (merge of run a794d381), not `43af4cf`
  (verified live: 43af4cf's visual.yaml image is `v1.63.0-noble@eff16c30`
  and its tree lacks `test/visual-playwright-image-lockstep.test.ts`). The
  "reconciled the batch tree to those bytes" claim is now scoped to the npm
  side: the worktree visual.yaml keeps the base-era image, and the
  validated PRs #812/#822/#844 carried no visual.yaml, so CI exercised
  main's image line (runbook + record item 4 + the rm-142 rider).
- **F2 (high) fold surface**: live re-probe at main tip `f157cb8b` (see the
  Integrate obligations) — pnpm-lock.yaml and the operator-dark PNG never
  byte-matched at edf948de; the plugin-1.19.0 lockfile-coherent seam is
  named.
- **F3 (medium) zizmor suppression mechanism**: the 48 are zizmor-internal
  audit suppressions, not liftable in-file annotations (zero
  `zizmor: ignore` annotations exist anywhere; suppressed count identical
  under `--no-ignores`); the live backlog is enumerated (18 reported:
  5 high / 3 medium / 10 informational) in the runbook.
- **F4 (medium) rm-1930 acceptance**: the rider now candidly flags the
  trust-on-PyPI delta (the acceptance's enforced container-or-vendored
  form is NOT yet met) and records the tool digest — zizmor 1.31.1 sdist
  sha256
  `eb9c8a3e2c1080810fdb68bc36717b2a9d61283bb98e3a48689f5a852fc48e9f`
  (PyPI JSON + downloaded bytes cross-verified 2026-10-17).
- **F5 (low)** phantom labeler row removed from the runbook.
- **F6 (low)** DRIFT row/family wording corrected (4 rows / 2 families
  before the adoption; 1 row / 1 family after).
- **F7 (low)** PR #805 "all-11" corrected to 10 success + Fro Bot skipped.

Executable-surface delta this turn (the only non-md change): main tip
`f157cb8b` landed the codeql-action v4.39.0 advance (`6f2ac81f5cd8`), which
textually collided with this tree's deliberate v4.38.3 deferral in the
validation clone — local 3-way simulation proved the conflict
(codeql.yaml / release.yaml / scorecard.yaml all U-marked) — so the fix
adopted main's lines at all four in-tree sites (ceaaf76b pattern), closing
the codeql online-census DRIFT family (verified live: 1 standing row).
Offline census GREEN; zizmor baseline unchanged (75 / 9 / 48, 18
reported); `pnpm lint` rc 0; compound-band postimage re-proven
`2505f024…` (250 defs / 0 dups / max rm-1931, eslint + length-guard green
on the postimage). Emission-time digest re-derived at the full base sha:
`validation:v1:b033bc3a8f62ef205cd1c94ca2412e2b410485655cd41690823cb0aa6ddbe15c`
— this supersedes `05e0afb2…` for the fold. Retest evidence (targeted
scope, this attempt's ephemeral PR) rides the PhaseResult.
