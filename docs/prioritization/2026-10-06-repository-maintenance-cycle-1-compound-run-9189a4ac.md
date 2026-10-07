# Dashboard maintenance — cycle 1 compound (2026-10-06, run 9189a4ac)

module: dashboard
tags: `[repository-maintenance, compound, full-validation, ledger-integrity, prevention-rules, next-cycle-candidates]`
problem_type: compound-record
base: 3d07cf9 (work-order base) · validated at ephemeral PR #403 · origin/main
at validation time c210933 · delivered as spool patch over the 12-surface
uncommitted batch (work-order hygiene clause — no tracked drift this phase).

## Frame

Repository-maintenance cycle 1, run `9189a4ac596b462e9bc4971b3a94f0c0`,
campaign `3dbaa478b7ce452ab1306e191a629314`. Phase lineage: assess `bc717b84`,
research `26e5188833cf`, roadmap `e36ee40cfb23`, prioritize `9aea259f`,
stewardship `585b2c0d`, implement `230e55e6` (adopting reaped `0828510109`'s
verified composition), targeted_tests `7ea318d7`, full_tests `a109f87c`,
compound `b30382c7` (this record). **Pre-review evidence only** — review and
shipping outcomes happen after this step and are carried forward by the next
cycle's assessment.

## Validated-batch record (full_tests a109f87c)

- Work-order `full_command` (`github_ci_validate.py --repo .`) executed
  VERBATIM; run 1 aborted **pre-push** on the fleet-62 vs main-58
  `lockfile-guard.yaml` add/add in the validation clone's `git apply --3way`;
  fixed in-phase by comment-only byte harmonization (blob `c3f7b6d9` →
  `97a8ebf6`, 20 changed lines all `#`, actionlint rc=0); run 2 passed.
- Ephemeral draft **PR #403**: head `conductor/ci-fc208986b5f4`, base
  `conductor/ci-base-5ec0a05bc3f` (= 3d07cf9 lineage + c210933's workflows),
  **11/11 checks success** 11:43:44–11:45:23Z (Lockfile Guard, Lint, Test,
  Check Types, Test Scripts Load, Design Check, Check Workflows, CodeQL/
  Analyze, Dependency Review, visual), PR closed unmerged 11:45:52Z, both
  `conductor/ci-*` refs deleted — zero debris, no landing actions.
- Tree identity proven: worktree snapshot tree `6216448e` ≡ `fc208986` outside
  `.github/workflows` (empty diff); the validated tree's only workflow delta
  vs the batch is current main's audit/codeql/release/scorecard (by design).
- Emission digest discipline: dispatch digest `validation:v1:2a43a82d…`
  reproduced by re-derivation (method proof), then legitimately moved to
  **`validation:v1:9546ab8552c4366917eea930294b82890bf3ec7ae2588e1ab02b97a5a0055107`**
  @ base 3d07cf9 by the comment-only guard byte change (the digest is a
  content hash over ALL executable surfaces). Stable pre/post run.

## Reusable lessons / prevention rules (this cycle's compound yield)

1. **Pre-push workflow add/add** — see
   `docs/solutions/workflow-issues/ci-validate-prepush-workflow-add-add-harmonization-2026-10-06.md`
   (new, delivered with this patch). Batch workflow files must byte-match
   current main where main also carries them; comment-only divergence is
   enough to abort the authoritative validation route. Re-check the main tip
   before every route; harmonize comment-only; re-derive the digest.
2. **Reaped-attempt adoption works when forensics lead** — three provider
   reaps this run (`fefd2690` ~23s, `0828510109` ~9.5min, `ebc42873` ~45s).
   Sweep `events/<attempt>.jsonl` + typed artifact + remote debris BEFORE
   redoing; verify inherited work surface-by-surface (blob identity vs
   contract) before adopting. Implement recovered 8 verified surfaces this
   way; full_tests correctly determined 45s < any CI record and redid.
3. **The digest is content-wide** — comment-only byte changes move it, and
   untracked non-ignored repo-root files both ride the validation clone and
   move it. Keep scratch in the spool; declare the digest you re-derived.
4. **`github_ci_validate` prints no digest** — derive it from
   `hermes_conductor.validation_policy.validation_digest`; prove the method by
   reproducing the dispatch digest once before trusting it.
5. **In-worktree writes need same-call verification** (re-read + hash) —
   applied here (`cp` + `git hash-object` + `diff -q`).

## Next-cycle candidates & context (carried to the next assessment)

- **rm-116 protection fill** (top open security-adjacent item): fresh datum
  @3d07cf9 — protection object exists, required contexts `[]`,
  `enforce_admins` false; the same-day ledger render landed by direct push.
  Post-landing fill: required contexts := Main job set + CodeQL + **Lockfile
  Guard** (proven green in PR #403's battery), strict, admin-enforced; never
  recreate the object body-less. rm-146 (dependabot automerge) stays sequenced
  behind it.
- **Unlanded-lineage union at integrate**: add by id — fe928ca-era claims
  `rm-660..rm-675`, 67868217's `rm-676/677`, 85e37a8b's `rm-678/679` (this
  batch implements rm-678's both halves; our ledger carries the renumbered
  carve `rm-680`), e9bc28f5's `rm-674` schedule-consolidation layer (rides in
  this batch's B3 base). Parameterize any Closed-section census guard on the
  chosen base shape. Next free id: **rm-681**.
- **Upstream/ecosystem refresh window** (research 26e518883, dated 2026-10-06):
  upstream tip `da0528f3` (+4 dep chores: eslint 10.12.0 #564, agent
  v0.117.2→v0.117.4 #562/#563, bfra 4.36.0 #560); open upstream PRs #549
  (undici 7.30.0) and #538 (fast-uri 3.1.8); agent v0.117.5 released
  2026-10-06T03:29Z + dual-tag `1.18.34-harness…`; Node v24 maintenance
  starts 2026-10-20, v26 LTS 2026-10-28 (engines/CI image window); pnpm
  12.9.1 exists (major window; batch pins 11.28.4). Re-derive all facts fresh
  next cycle — advisory/registry metadata drifts hourly.
- **Ship-lane reconciliation (post review-fix 51d2a6d8, vs live tip ac61ff3):**
  resolved this cycle — guard/Dockerfile/pnpm-workspace/cfa9f94b-doc now
  BYTE-EQUAL to main (R1/R3/R4), package.json/lockfile/fork-exclusion/
  frozen-install-doc already were; residual merge surface = the ROADMAP
  additive union (224 defs) + four genuinely new files (B4 pair, this run's
  batch doc + compound record) — no add/add remains on any shared path.
  Re-check the main tip before every route regardless (it moved three times
  during this campaign: fe928ca, c210933, ac61ff3).
- **PR #389 custody**: closed unmerged 2026-10-06T07:54:36Z, ref deleted;
  the cure content survives only in fleet worktrees/pinned snapshots (this
  batch's B1 is one such carrier, provenance verified by blob identity).

## Fold record + review-fix update (2026-10-06, attempt 51d2a6d8)

The compound layer was FOLDED in-phase at the independent_review:fix turn
(this phase is sanctioned to mutate; the compound turn's spool-patch-only
posture was turn-specific hygiene): this record + the prevention doc + the
ROADMAP annotation/rider layer now ride the batch directly, refreshed per
review 176de71b R5 (stale c210933-era ship-lane framing replaced above).

Review-fix amendments folded alongside (full list in the batch doc's
"Review-fix amendments" section): R1 guard byte-adopted from main (1ab27c9);
R2 ROADMAP re-united onto ac61ff3's canopy — 224 defs / 0 dups / max rm-680,
union-complete vs both parents; R3 cfa9f94b record byte-adopted from main;
R4 Dockerfile/pnpm-workspace byte-adopted from main; R6 corruption-fixture
fetch-on-demand. Emission digest after these changes: see this phase result's
validation_evidence (executable surfaces changed: guard, Dockerfile,
pnpm-workspace, test fixture — all byte-equal to main's own green-landed
content except the fixture fetch).
