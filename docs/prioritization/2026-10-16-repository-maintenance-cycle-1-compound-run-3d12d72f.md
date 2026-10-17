---
module: dashboard
tags: [repository-maintenance, cycle-1, compound, rm-862, rm-863, rm-022]
problem_type: maintenance-compound
---

# Repository-maintenance cycle 1 — compound record (2026-10-16, run 3d12d72f)

Pre-review compounding of the whole cycle: assess `12f9adb1` (prior attempt
`e491595f` was a zero-work reap, redone from scratch) → research `c435d524` →
roadmap ext (`c2764dd6`, mints rm-862/rm-863, census 235→237/0 dups, dangling
23 unchanged) → prioritize `a250f8b6` → stewardship `6f7bcafe` → implement
`ea91c989`+`b0f1dd2b` → targeted_tests `9517bf25` → full_tests `f5629f7f`
(green ephemeral CI PR #788) → compound → independent review → this fix.
Not recorded here: review/shipping outcomes — the next cycle's assessment
carries them.

## What the cycle selected and why

Selected batch: operator click-fidelity + enforcement refresh = rm-862 core
(port upstream #636 approval-click containment) + rm-863 rider
(eslint-plugin-erasable-syntax-only 0.4.2 → 0.7.2). Rationale: highest live
user-visible correctness available with no dependency on unverifiable
deployment state — approval/cancel decision clicks bubbled to the run card's
collapse listener (public/operator-run-index.js:782 → toggleCardExpansion
:876), collapsing the card mid-decision. Not selected, with reasons recorded
in the selection artifact: full 1.11.0 absorb (gateway ≥v0.122 dependency
unverifiable from this repo; sequenced after the parallel restore batch
lands), restore batch + rm-860 + rm-482 rider (claimed by the parallel
campaign's selection a66b3d94), rm-251 (overlaps the claimed restore's
Monitoring.tsx hunks), rm-279/rm-284 (CI-blocked), rm-135 (PR action),
rm-647 (docker-dark), and two fresh staleness adjudications: rm-285
STALE-FIXED (fast-uri resolves 3.1.8, floors raised cycle 2, zero open
Dependabot alerts) and rm-177 STALE-FIXED (standing).

## What shipped (six modified files + this doc + the solutions rule)

+162/−71 against base 5d5f9be:

- public/operator-stream.js — rm-862 port: container-level click containment
  (stopPropagation) on renderApprovalPrompt and renderCancelControl,
  semantically identical to upstream #636 (5581a49), question-region
  precedent copied.
- test/operator-stream-core.test.ts — adapted approval-click containment
  describe on the DOM-stub seam (2 tests; upstream's 288-line e2e does not
  port — fork web/src/operator/runtime.ts is a minimal topic runner that
  skips approval-request; recorded NA).
- package.json + pnpm-lock.yaml — rm-863: eslint-plugin-erasable-syntax-only
  exact 0.7.2; and the playwright trio cure adopted from the dead fd2fef4c
  attempt (1.63.0-era, all-green on CI PR #788 against the main of that day),
  reconciled forward at review fix to main's rm-142 lockstep truth:
  @playwright/test exact 1.64.0 with the playwright-family lock blocks
  byte-identical to origin/main's lock (details in the review-fix section).
- ROADMAP.md — rm-862/rm-863 defs minted, then flipped done with landing
  evidence; plus the adopted lint cure (rm-022 array-literal escapes and
  trailing-whitespace cleanup) taking the file from 48 lint errors to 0.
- tests/visual/__screenshots__/dashboard.spec.ts-snapshots/
  dashboard-operator-dark-chromium-linux.png — regenerated operator-dark
  baseline, md5 e397a0539cf3fc84cd5129a5675d766a, byte-reproduced across two
  consecutive in-image rounds and a no-flag passing third round.
- docs/solutions/workflow-issues/playwright-caret-lock-desync-visual-baseline-stale-2026-10-16.md
  — the reusable prevention rule for the caret/lock/baseline trio desync.

This record is the merged form of two parallel compound attempts' twin docs
(the sibling's `…compound-record-run-3d12d72f.md` was reconciled into this
file at review-fix time; its unique sections — KTD13 lesson, landing notes,
full digest chain — are folded in below).

## Validation record (pre-review evidence, verbatim digests)

- Targeted: impacted-tests 12 files / 1822 tests green (76s) +
  web-impacted 5 files / 91 tests green + check-types RC 0 + scoped lint
  48-error baseline parity at bump time (all ROADMAP.md).
- Full: authoritative github_ci_validate.py → ephemeral CI PR #788, all
  checks SUCCESS (Main Test/Lint/Check Types, visual, CodeQL, dependency
  review; Fro Bot SKIPPED as expected on this fork).
- Digest chain: dispatch `validation:v1:c98237835a4c89991679ec3446adef14cac85f9146dbde120313997f7be22387`
  == pre-work re-derivation `f116a02e…` on the inherited tree (adoption
  proof) → post-PNG-regen emission `validation:v1:88497dcb5533e2d1cfc8aea05dc70c921bda38473754c95fe1e41cee5dff66b1`
  (compound-time emission; .md-only edits did not move it) → review-fix
  emission `validation:v1:8e49a08f28bfd26afeebed99a9f04c980d5868fde78fd31d0ce2573df5294518`
  after the playwright-family reconciliation changed executable surfaces —
  THIS is the digest the fold gate must carry.

## Review fix (2026-10-17, attempt 8ca2790a)

The independent review (attempt 9f35a700) returned NEEDS_CHANGES with five
findings; all fixed (the provider-died attempt 27bd29f5 had already applied
the five content cures — frontmatter/multiple-H1, twin-doc reconciliation
into this file, the rm-862 deferral scope note, the rm-682 cross-reference,
and the dead baseline path — verified content-level before adoption):

1. markdown/no-multiple-h1 on both cycle docs — the surviving doc's
   frontmatter now carries module/tags/problem_type only (house shape,
   lint rc 0), single H1.
2. Twin compound docs — the sibling record was merged into this file (KTD13
   lesson, landing notes, full digest chain folded in; merge note in the
   shipment section) and deleted; one canonical record remains.
3. ROADMAP.md:170 — rm-862's acceptance carries an explicit scope note: done
   for the #636 containment port + the #637 NA record only; the waiting-run
   fail-visible rider deferred to the 1.11.0 absorb-family spools.
4. ROADMAP.md:870 — rm-682 cross-references rm-863 (plugin-bump half
   satisfied); the export-aliases remainder is next-cycle candidate 9.
5. Dead path tests/visual/operator-dark.png — both docs cite the real
   snapshot path now.

The mandated retest then went RED for an environmental reason, not a review
finding: the targeted runner escalated (package.json is shared config) to
the authoritative ephemeral full validation, and the visual job failed
(run 38989770697, job 117269333362) with `browserType.launch: Executable
doesn't exist at /ms-playwright/chromium_headless_shell-1243/…` — main had
advanced 19 commits past the batch base and its rm-142 lockstep repair now
pins the visual image at v1.64.0-noble@sha256:06a9939e…, against which the
batch's (yesterday-green, PR #788) 1.63.0 npm pin cannot launch browsers.
Cure, per the standing supersession rule: package.json @playwright/test →
1.64.0 exact (main's shape); pnpm-lock playwright family → origin/main's
bytes (the only remaining lock delta vs main is the rm-863 plugin 0.7.2
hunks); baseline PNG untouched — md5 e397a053… is byte-identical to main's
current baseline. Retest round 2: ephemeral PR #821 (commit 0081e60c,
validation base b85244e4), ALL checks SUCCESS including visual; Fro Bot
SKIPPED per the fork PAT gate; PR and branch auto-cleaned. Fold diff after
the fix: 6 files, +148/−57 (smaller than the pre-fix +162/−71 — the lock's
playwright-family hunks returned to base/main bytes).

## Review-fix continuation (2026-10-17, attempt 2588f3fe)

The 8ca2790a retest was rejected by the fold gate for a declaration defect,
not an evidence gap: the evidence had run the authoritative full suite
(ephemeral PR #821, all checks SUCCESS) but was declared scope targeted,
while the run's risk escalation (package.json is shared config) requires a
declared scope of full (engine 01d80a42 validation_policy: risk escalation
forces required=full and only a full declaration satisfies it).

This attempt first mis-cured a real supersession: main advanced
b85244e4 → c01946e (second visual regen 55086dd for the #619 absorb,
operator fixture page 3178 → 3294 px, baseline md5 a6211623;
public/operator-stream.js +42 and its test +182 — the 1.11.0 waiting-status
evolution), so the shared surfaces were reconciled toward main's bytes
(runtime/test = main + containment; PNG = main's current). The full
validation burn (head 1f3931b4, run 38998003128) then failed Check Types
with 9 × TS2339 getConnectionStatus missing on StreamHandle. Composition
lesson: the ephemeral validation PR is built from the RUN-BASE tree
(5d5f9be) with only .github/workflows overlaid from current main
(validation_base_commit 83d17c24 = synthetic run-base + main workflows), so
every non-workflow surface must stay BASE-era consistent; origin/main
reconciliation of shared surfaces belongs to the landing fold, never to the
validation tree. The tell was visible in the worktree all along: 13 suite
failures plus 9 lint no-unsafe-call at exactly the base-era seams.

Cure: reverted the reconciliation — runtime rebuilt from base plus the two
containment blocks (md5 74b77274, byte-identical to the review-verified
bytes), test rebuilt as base plus the 68-line containment describe, PNG
restored to e397a053 (via 55086dd^). The tree delta returned to 6 files
+148/−57 — identical to the PR #821-proven shape — and the emission digest
re-derived to the dispatch value (net-zero executable change this turn).
Local proof: seam suite 795/795, scoped lint rc 0.

Full validation, declared scope full: ephemeral PR #839, commit 748764457,
validation_base 83d17c24 — all 10 executed checks SUCCESS (Lint, visual,
Check Types, Test, Check Workflows, Design Check, Test Scripts Load,
Dependency Review, CodeQL Analyze), Fro Bot SKIPPED per the fork PAT gate;
PR auto-closed and its ci refs cleaned. Visual passed against main's
current v1.64.0-noble image with the pw 1.64.0 exact pin and the e397a053
baseline — main's second regen is invisible to the run-base composition.

Landing note for the fold: origin/main's evolution of
public/operator-stream.js (+42), its test (+182), the visual spec provenance
header, and both baseline regens (f521ec7 then 55086dd) are real
supersessions the FOLD must reconcile (take main's bytes and re-apply the
containment substance on top), the same prescription the 2026-10-17
run-9d5c156d review recorded for its own lane; the validation-green tree
above is deliberately base-era to satisfy the ephemeral-PR contract.

## Adoption forensics (reusable pattern)

Three attempts in this cycle died without a typed PhaseResult (session
reaps and one provider death) after doing real tree work. The adoption
pattern that kept their work: (1) re-derive the validation digest on the
inherited tree and byte-compare against the dispatch digest — equality
proves the tree is the one the digest described; (2) re-run the cheap gates
(seam test file, scoped lint, check-types) rather than trusting claims;
(3) only then declare the work adopted, and re-run the authoritative
command yourself for the record. The provider-dead fd2fef4c attempt's
ROADMAP lint cure and playwright trio cure both entered the batch this way.

KTD13 lesson: fold rejections can be purely attestational — implement
attempt `ea91c989` completed the whole batch and was rejected solely for a
missing changed-surfaces attestation (engine validation_policy.py reads
phase_result.validation_evidence.changed_surfaces and rejects an empty
list when the validation block lists surfaces). Fix-by-adoption, not redo:
verify the inherited tree is byte-identical to the fold-time delta, then
emit the attestation.

## Landing notes

Expected fold diff: 6 modified files (+148/−57 after the review-fix
playwright reconciliation) plus two new docs (this record and the solutions
rule). The waiting-run fail-visible rider clause
of rm-862 stays explicitly deferred to the 1.11.0 absorb-family spools
(bcf66a14/453f6c9b chains) — the def's done-flip records the deferral, it
does not close it. If this batch lands first, rm-862/863 ids are consumed
on main and the sibling spool families (453f6c9b, bcf66a14, d0d355ed,
e7650185) must renumber to the next free band; baseline arbitration when
absorbing any sibling visual work is by md5-equal bytes, not commit
recency.

## Landing record (2026-10-18, integrate cases 59f7d08d then b21ecdf5; restored verbatim at case 905f64db after a pass re-derivation dropped it)

What actually met main (64cd2f6a) at the integrate, supersessions first:

1. Ids renumbered: rm-862 → rm-1457 and rm-863 → rm-1458. Main's landed
   render already held run d0d355ed's rm-862/rm-863 (integrate f23b0f87);
   first-landed-wins, next-free band re-derived from main's max rm-1456.
2. Runtime half superseded: main adopted upstream 2026.10.43 (c51597ad),
   which carries #636 (5581a49) — both container-level containment
   listeners were already live on main at :2784-2786/:3066-3068. The
   batch's port (authored at base 5d5f9be, before that adoption) duplicated
   them and was dropped at the merge; public/operator-stream.js lands
   byte-identical to HEAD. The containment describe survives and stays
   green — its contract is at-least-one container listener.
3. Visual baseline: main's own 341452 B baseline (a6211623, captured at
   55086dd) went stale against main's post-adoption DOM — the 2026.10.43
   UI changes plus the AppShell release-link union grew the operator page
   3294px → 3410px, and every visual run composed on main's tip after that
   (39035335916, 39039230117, 39053384731 — three independent
   integrations) failed with byte-identical 153655-px diffs while listener
   and privacy stayed green. Resolution case b21ecdf5 regenerated
   dashboard-operator-dark.png inside the same digest-pinned
   v1.64.0-noble image per rm-142; provenance recorded in
   tests/visual/dashboard.spec.ts. This also time-bounds the two
   present-tense claims above: "only remaining lock delta vs main is the
   rm-863 plugin hunks" and "e397a053 is byte-identical to main's current
   baseline" were true at PR-#821 time (main b85244e4) and were overtaken
   by 1c7f74a (@opencode-ai 1.19.0) and the 55086dd → c51597ad DOM
   growth — exactly the landing-notes supersession rule this doc set.
4. Surviving code deltas from the batch: the containment regression pair
   (test/operator-stream-core.test.ts, describe renumbered to rm-1457),
   the eslint-plugin-erasable-syntax-only 0.7.2 exact pin (rm-1458,
   package.json + lock only), and this doc pair. The batch's ROADMAP lint
   cure was superseded by main's landed rm-1454 repair (same 0-error
   outcome).

## Next-cycle candidates (concrete, evidence already gathered)

1. Absorb window: operator contract 1.9.0 → 1.11.0, tip bcdcb46+, drift
   21+ commits and live-moving; #631 push-subscription wire-shape fix first
   (live sweep-skip bug), then waiting runs + notification jumps + run-card
   UX batch. Owner: absorb family.
2. Waiting-run fail-visible rider (run-summary.ts:49/:72/:135-175 skip
   semantics) — deferred clause of rm-862, rides candidate 1.
3. Renovate-vs-Dependabot standing disposition (upstream added renovate.yaml
   on bfra-me shared workflow v4.39.0; fork keeps Dependabot + 5 fork-native
   workflows). Owner: absorb family or next roadmap pass.
4. Stale-fixed ledger flips: rm-285 and rm-177 (evidence in the a250f8b6
   selection artifact).
5. Five-spool rm-857+ id-collision resolution once any family lands.
6. Node 26 LTS watch (lts:false at v26.12.0, 2026-10-14; upstream CI holds
   24) — fold into the dependency-majors item when it flips.
7. rm-251 bounded-poll port to Monitoring.tsx after the parallel restore
   batch lands.
8. Hygiene riders that ride the absorb: agent pin v0.122.3 (security
   release), codeql-action digest 6f2ac81 (4 sites), Node-26 types.
9. rm-682 export-aliases half (strip-only migration): the plugin-bump half
   was satisfied by rm-863 this cycle; what remains is the export-alias
   sweep of src/ — re-score before scheduling.

## Lesson documented

The reusable prevention rule for this cycle's only infra failure mode lives
at docs/solutions/workflow-issues/playwright-caret-lock-desync-visual-baseline-stale-2026-10-16.md:
a caret pin, a floated lockfile, and a stale pixel baseline drift together,
fail only in CI, and are cured only as one change (exact-pin → in-image
byte-identical regen → no-flag pass → emission-digest re-declare).
