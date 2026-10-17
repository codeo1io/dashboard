---
module: dashboard
tags: [repository-maintenance, cycle-3, compound, rm-862, rm-863, rm-864, rm-865, rm-650, rm-142, rm-284]
problem_type: maintenance-compound
---

# Repository-maintenance cycle 3 — compound record (2026-10-17, run d0d355ed1832)

Pre-review compounding of the whole cycle, base `3e3664c` (== origin/main at
cycle open, porcelain-clean both ends): assess `5245aeeb` → research `d9980782`
→ roadmap ext (minted rm-862..rm-865, +28/-8) → prioritize `d717b858` →
stewardship `986968a1` → implement `f1f53393` (batch completed; fold rejected on
an evidence-channel defect) + `65e5b9c9` (KTD13 cure: zero tree edits, gates
re-run, changed-surfaces attestation re-emitted from the engine derivation) →
targeted_tests `46f1f4f3` → full_tests `fa9b5560` → compound `bcc6f8ae` (this
record). Nothing was re-validated at compound; every outcome below is consumed
from the recorded typed results and logs.

Attempt-death ledger (provider-instability context, all first-hand from event
logs): stewardship `a84075b8` (~25s, zero work, redone from scratch);
targeted_tests `95be8b10` (~2.7min, no PhaseResult, redone); full_tests
`a4173c9e` (31min, reaped mid-turn — its curative residue was re-proven live
and ADOPTED, see below); compound `47bff659` (~47s, zero work, zero tree drift —
redone by this attempt). Plus the non-death fold rejection at implement
(`f1f53393`): batch complete, result folded without
`validation_evidence.changed_surfaces` — a transport defect, not a work defect.

## Cycle outcome (compounded)

Batch at `3e3664c`: 23 modified tracked files +702/−295 plus NEW untracked
`test/operator-contract-push.test.ts` (24 status entries), all covered by
validation digest `validation:v1:dacf1ce20151bd188a79d33eef91aab31f98daf88cbd1080fc138d2e56af06ad`
(24 changed surfaces / 9 testable).

- **rm-862 — upstream #631 subscription-list wire fix (focused absorb).** The
  gateway returns a shaped `{subscriptions: [...]}` envelope with numeric
  epoch-ms timestamps while the fork parsed one flat string-date record, so
  every reply read as unsubscribed. Landed: `PushSubscriptionListResponse` +
  `PushInactiveReason` in `src/gateway/operator-contract/push.ts` with
  `isTimestamp`-guarded dates, `operator-client.ts` single-record parse
  replaced, shaped fixture in `operator-fixture-harness.ts`, NEW
  `test/operator-contract-push.test.ts`, and the web mirror
  (`web/src/push/{push-types,reconcile,subscribe}.ts` + `Notifications.test.tsx`);
  a docs/solutions truth rider removed the stale `notSubscribedConfirmed`
  option note. Rider dispositions: #629/#630 NOT carried (public/ operator
  modules untouched), #634 DROPPED (de2ce7f did not apply to the fork tree —
  re-port next cycle), open PR #636 still open at cycle close.
- **rm-865 — prose-residue guard de-flake.** `walk()` prunes
  EXCLUDED_DIRS/EXCLUDED_DIR_SUFFIXES at readdir time (~26.7k enumerated
  entries never touched again) with a temp-dir parity test asserting the visited
  set equals full-enumeration-then-filter on a fixture tree carrying
  excluded-class bait.
- **rm-650 — codeql-action v4.39.0.** All four refs (codeql init+analyze,
  scorecard + release upload-sarif) at digest `6f2ac81f…` with matching version
  comments — one digest, no split pin.
- **rm-864 repair half (def stays candidate).** ROADMAP census cured 50 → 0 at
  the batch tree: bracket escapes on the rm-022 acceptance array, ~50
  trailing-whitespace and empty-acceptance lines, quote-wraps on the rm-802
  stringified-token prose (the second, distinct renderer emission mechanism
  found at :878/:880). The census TEST itself remains unimplemented.
- **rm-142 advance (def stays in_progress).** `@playwright/test` exact-pinned
  `1.63.0` package+lock (the caret float resolved 1.64.0 against visual image
  `v1.63.0-noble@eff16c30`); operator-dark baseline regenerated in-image —
  316204 B, md5 `e397a0539cf3fc84cd5129a5675d766a`, byte-equal to the dead
  `a4173c9e` attempt's own CI actual (arbitration bytes adopted from its
  `visregen/` residue). Remaining: the other two dark baselines + spec-header
  provenance.
- **rm-284 masked-errors half (def stays in_progress).** CI Lint green on the
  batch tree (base was RC=1 with 50 ROADMAP errors); standing re-trip defense
  transfers to the rm-864 census test.

Validation chain (consumed, not re-run): targeted_tests `46f1f4f3` — engine
impacted-tests fast mode green plus explicit legs for the NEW untracked test
(22/22 root-new-and-guard, 140/140 web-focused), actionlint 0 findings,
check-types rc=0, eslint on 18 changed code surfaces 0 errors, digest
re-derived byte-identical after all gates. full_tests `fa9b5560` — the
authoritative `github_ci_validate.py` command executed verbatim, RC=0 on the
FIRST cloud round: ephemeral PR #786 all 11 checks green (CodeQL, Lint, Analyze,
Dependency Review, visual, Design Check, Check Types, Test — root 3091/3091 +
web 1231/1231, Check Workflows, Test Scripts Load, Fro Bot skipped-by-design);
PR auto-closed, both `conductor/ci-*` refs verified deleted. Clone rehearsal
before the cloud round proved the delta applies clean onto `9fead352`
workflows (origin/main had advanced mid-run with its own ROADMAP lint cure and
the rm-691 awk fix — the landing reconcile must UNION those equivalent cures,
not revert either side).

## Ledger deltas made at compound

- Status flips candidate/in_progress → `implemented 2026-10-17, validated
  pre-review, pending landing`: **rm-862**, **rm-865**, **rm-650** (full
  validation pointers inline in each def line). rm-863 and rm-864 stay
  candidate; rm-142 and rm-284 stay in_progress — halves landed, acceptance
  still open.
- Evidence riders appended to rm-862 (implementation shape + rider
  dispositions + digest), rm-863 (deployment-gated, next-cycle), rm-864
  (repair half done, census test is the head candidate), rm-142 (exact-pin +
  baseline provenance + remainder), rm-650 (four-site verification), rm-865
  (prune + parity test), rm-284 (census 50→0 in-batch).
- Compound tail comment before the managed-render marker restating the live
  truth: 241 defs / 0 dups / max rm-865. Zero mints, zero def-count change;
  the roadmap-length-guard line ceiling is untouched (max line 1428 chars).

## Prevention rules (reusable)

1. **Forensics before redo.** An absent typed envelope is not evidence no work
   happened — read the event log, scratch, and tree drift first; adopt residue
   only after live re-proof (`a4173c9e`'s five cures all re-proven, then rode
   the batch).
2. **Evidence-channel ≠ work defect.** A fold rejected for a missing
   `changed_surfaces` attestation is cured with ZERO tree edits: re-prove
   intactness, re-derive the attestation programmatically from the engine's
   own `changed_surfaces()`. Never redo landed work to fix a transport gap.
3. **Dead-attempt CI artifacts are arbitration bytes.** A reaped attempt's
   downloaded/scratch artifacts (baseline PNGs, logs) can pin the exact bytes
   the live round must reproduce — adopt by byte-compare plus render-relevant
   file identity, not by re-burning a cloud round.
4. **Exact-pin the test runner to the CI image tag.** A caret float on
   `@playwright/test` silently resolves past the pinned visual image and
   manifests as unexplainable baseline churn; pin package+lock exactly.
5. **Digest discipline.** Reproduce the dispatch digest byte-exact before any
   adoption claim; if the attempt changes zero tracked files, the emission
   keeps the dispatch digest verbatim.
6. **Probe Actions liveness at dispatch time.** The cycle read Actions dark
   (newest run 2026-10-09) at prioritize; the full_tests round days later
   succeeded first try — route decisions must key off a fresh probe, not a
   days-old reading.
7. **The impacted-tests runner is blind to untracked files.** A NEW test file
   invisible to the git-ls-files universe needs an explicit vitest leg.
8. **Lint cures ride the batch that touches the render surface.** The batch
   that edits ROADMAP carries the census cure with it (50→0), never sequences
   it separately.
9. **Landing reconcile unions equivalent cures.** origin/main moved under this
   run (its own lint cure + rm-691 awk fix); the clone-rehearsal transplant
   proved both sides coexist — reconcile by updating pins/content to the union,
   never by reverting a sibling cure.

## Next-cycle candidates (ranked, existing ids only)

1. **rm-864** — the render-guard census test (def minted; acceptance open).
   The standing defense against renderer re-trips; pairs with rule 8.
2. **rm-863** — operator contract 1.11.0 flip, deployment-gated on a gateway
   1.11.0 deploy schedule (drift-proofs every stream; R1-R8 plan upstream).
3. **rm-862 remainder** — re-port #634 (jumped-card scroll; de2ce7f needs a
   fork-tree re-derivation), fold #636 if merged, #629/#630 riders.
4. **rm-142 remainder** — the other two dark baselines in-image + spec-header
   provenance note.
5. **rm-139** — Node 26 LTS gate opens 2026-10-28 (schedule confirmed;
   ubuntu-26.04 images published — precondition already met).
6. **rm-482** — the public/ operator-decision idempotency keys still fall open
   (operator-launch.js:66-80, operator-stream.js:2744-2748/:3080-3084).
7. **rm-137** — unify the split-pinned upload-artifact at v7.0.2; setup-node
   v7.0.0 → v7.1.0 (five sites).
8. **rm-271** — toolchain majors window (TS 7.0.2 / vitest 5.0.5 / jsdom 30.1.3
   all live as of 2026-10-15).
9. **Absorb-window remainder** — 19-commit window, five releases 2026.10.31-.35;
   only #631 absorbed this cycle (see also hono supersession at rm-111).
