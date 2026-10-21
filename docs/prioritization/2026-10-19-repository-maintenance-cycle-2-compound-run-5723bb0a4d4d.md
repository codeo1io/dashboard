---
module: dashboard
tags: [repository-maintenance, cycle-2, compound, rm-252, rm-1501, rm-1502, rm-1503, rm-1504, rm-1505]
problem_type: maintenance-compound
---

# Repository-maintenance cycle 2 — compound record (2026-10-19, run 5723bb0a4d4d)

Pre-review compounding for the repository-maintenance cycle-2 run
(roadmap-maintenance lineage, run 5723bb0a4d4d48f0bcf9b34d90d7675e). Nothing
was re-validated at compound: every outcome below is consumed from the
recorded typed results, dispatch logs, and scratch ledgers of the earlier
phases. Review and shipping happen after this record.

## Phase chain (attempt ids, all first-hand)

- assess 5d4641ee — base edf948de == origin/main, clean tree; frozen-install
  gates green (server 72 files / 3372 tests, web 36 files / 1410 tests,
  check-types, lint zero warnings); 9-dimension adversarial read.
- research 23460fb1 — 12 candidates C1-C12; headline: upstream PR #646
  (render run output as Markdown) merged 2026-10-17T08:41Z and shipped in
  tag 2026.10.44 (a957b59b): 32 files, +6075/-60, markdown-it 15.0.3 with a
  token-only renderer (html:false by construction, MAX_OUTPUT_NODES cap,
  acceptLink allow-list).
- roadmap f542ee6b — 5 purely additive mints rm-1501..rm-1505 above the
  all-lineage unlanded def-line frontier (rm-1500 collision census across
  every live sibling worktree), +50 insertions / 0 deletions, guards green.
- prioritize ec80547e — batch selected: '2026.10.43 absorb-fallout
  reconciliation + security-posture pinning', 5 legs. Decisive live input:
  origin/main advanced to 64cd2f6a mid-run — the .43 absorb had landed
  ~10:24Z and DELETED the fork's fro-bot.yaml hardenings while leaving the
  nightly cron armed with zero repo secrets.
- stewardship 40f14a33 — structured stewardship_request; no Git topology.
- implement e91f8c03 — full batch implemented (salvage commit 2044334e on
  64cd2f6a; 83 delta paths, 13 executable changed surfaces); folded WITHOUT
  the changed-surfaces attestation.
- implement bbbc37f7 — KTD13 cure: adopted the validated tree verbatim,
  changed zero content, re-proved integrity, re-emitted the attestation
  (digest validation:v1:0ba36f0237fb489856474c3c2cb882747069dc877cd0e20e0de
  c4e7b884b87ef).
- targeted_tests 9d8e717f — dispatched command run verbatim twice over the
  40-path impacted set (see validation ledger).
- full_tests 24a6032e — full-suite validation SUCCEEDED on the ephemeral-PR
  route (see validation ledger).
- compound 1024ad8f — this record.

## Attempt-death ledger (provider-instability context)

Four deaths this run, four different verdicts — each read from the durable
trail, never from the absence of an envelope:

- research 0a0ee241 — reaped at message_count 13; no typed artifact, no
  scratch, no durable work. Verdict: redo from scratch (done, as 23460fb1).
- implement e91f8c03 — batch COMPLETED and folded, then the fold was
  REJECTED for a missing changed-surfaces attestation. A transport defect,
  not a work defect. Verdict: cure with zero tree edits (bbbc37f7).
- full_tests 715b9a6f — reaped after ~30min with no typed result; its trail
  showed real curative work (era-qualified comment + describe.skipIf
  carve-out in the workflow-hardening guard; the should-release rm-248
  parity pair) plus two CI-red findings it had already diagnosed. Verdict:
  live re-prove the residue, adopt it, then run the authoritative route.
- compound 4e436fe9 — reaped 03:53-04:14Z at message 18; zero artifacts,
  zero scratch, zero tree drift (every tracked-file mtime predates the
  attempt start; nothing newer anywhere in the worktree). Verdict: redo
  from scratch (done, as 1024ad8f — this record).

## Cycle outcome (compounded, pre-review)

Tree at compound close: salvage commit 2044334e (on origin/main 64cd2f6a)
plus four working-tree adoptions — ROADMAP.md riders (the rm-1503 stance
rider and this compound's riders), the era-qualifications in
test/workflow-hardening-guard.test.ts, and the full_tests-phase canonical
adoptions of .github/workflows/release.yaml + scripts/release-paths.ts
(byte-equal to origin/main, which advanced to c9f4220e mid-run).

Def-grounded outcomes:

- **Workflow restorations + the standing pin (rm-252 ledger record).**
  fro-bot.yaml: 5 gate sites, ubuntu-24.04, timeout-minutes 20, checkout
  v7.0.1; codeql.yaml: ci-base-PR trigger, SEMMLE override, Setup step;
  the absorb's genuine upgrades KEPT (agent pin v0.122.3 at digest
  7d273ac6, codeql-action 6f2ac81f = v4.39.0). NEW
  test/workflow-hardening-guard.test.ts pins every restored site so the
  NEXT absorb fails a check instead of silently regressing; the adoption
  record main never carried (grep '2026.10.43' at 64cd2f6a = 0) is the
  rm-252 rider.
- **rm-1502 — HTML-sink ban widened** in test/static-assets.test.ts:
  comment-stripped scans, write/call forms, href policy across web/src
  AND public/; 42 modules, zero baseline hits at the folded base.
- **rm-1503 — #637/#643 stance riders recorded** (ADOPT-UPSTREAM both;
  keep-fork reverts exercisable until the markdown absorb lands). #643's
  fork tombstone was silently overridden by the absorb —
  clearFinishedRuns now lives at public/operator-stream.js:1110; #637's
  divergent copy is web/src/operator/sign-in-recovery.ts. Owed, gating
  rm-1501: the absorb-time twin-divergence re-measure (+491 bytes
  baseline) and the #643 keep-fork revert decision.
- **rm-1505 — redaction ladder pinned** by NEW test/redaction.test.ts
  (every sanitizeErrorMessage rung incl. the over-redaction edge, object
  walking, override/immutability, DEFAULT_SENSITIVE_FIELDS).
- **rm-1504 — base-image bump binding** documented in NEW
  docs/runbooks/node-sqlite-base-image-revalidation.md; the next-bump
  citation obligation carries to the next cycle.

## Validation ledger (consumed, not re-run)

Targeted (targeted_tests 9d8e717f): dispatched command run VERBATIM twice
over the engine-derived 40-path impacted set (37 test files, from the 13
changed surfaces). Run 1: 36/37 files, 3016/3017 tests, one failure at
test/operator-stream-core.test.ts:13175 — adjudicated a FLAKE by
diff-identity (git diff 64cd2f6a..HEAD over the touched operator-stream,
public/, and web/src paths is EMPTY; the isolated rerun went 931/931
green). Run 2 (verbatim): 37/37 files, 3017/3017 tests, RC=0. Deliverable
suites (workflow-hardening-guard + redaction + static-assets): 3 files /
207 tests RC=0. actionlint 1.7.12 (container) rc=0 over the four touched
workflows. Roadmap guards green. The live-tree derivation digest stayed
equal to the dispatch stamp — zero executable change in the targeted turn.

Full (full_tests 24a6032e): attempt 1 rc=1 in 5s — the validation clone's
3-way apply tripped on .github/workflows/release.yaml because origin/main
advanced to c9f4220e mid-run and landed the same sidecars path entry with
different wording (the clone substitutes origin/main's workflow files by
construction). Cure: adopt origin/main's canonical bytes for release.yaml
and its rm-248 twin scripts/release-paths.ts — zero diff vs origin/main
afterwards, so the landing merge for both is trivial. Attempt 2 rc=0
ok:true on ephemeral draft PR #1016 (snapshot commit b00f3f7b, base
6fe77a06, 03:10-03:13Z): Test / Lint / Check Types / Design Check / Check
Workflows / Test Scripts Load and Dependency Review all SUCCESS (runs
39193428026, 39193428021); Fro Bot SKIPPED by the restored gate (run
39193428023). PR auto-closed, ephemeral refs cleaned. Final digest over
the adopted tree: validation:v1:2ba566b0a637401c8cd1fdf5c83f3709f02196f88
b3fe08c2d3ee2bf1d969378.

## Prevention rules (reusable)

1. **Absorbs delete fork hardenings silently.** Workflow files are
   executable surfaces no application test observes; an upstream absorb
   rewrote fro-bot.yaml wholesale and left the cron armed against a
   secretless repo. The cure is a standing guard that pins the fork's
   hardened workflow SHAPE (sites, runners, timeouts, pins) so the next
   absorb fails a check instead of skipping silently. Generalizes: every
   deliberate fork divergence inside an absorb corridor needs a shape pin
   or it dies quietly on the next merge.
2. **Re-probe origin/main at every phase; reconcile neutral files before
   the full-validation dispatch.** This run watched main advance three
   times (f157cb8b at research, 64cd2f6a mid-prioritize, c9f4220e
   mid-full-tests). The validation clone substitutes origin/main's
   workflow files by construction, so a batch hunk touching those files
   can 3-way-conflict at validation time even though the tree applied
   cleanly at implement. Cure pattern: adopt main's canonical bytes for
   any file the batch did not semantically change BEFORE dispatching.
3. **A fold rejected for a missing attestation is cured with zero tree
   edits.** Recurred pattern (KTD13): re-prove tree integrity (digest,
   drift census), re-derive the changed-surfaces list programmatically
   from the engine's own delta, re-emit. Never redo landed work to fix a
   transport gap.
4. **Adjudicate flakes by diff-identity, not rerun-until-green.** The
   run-1 failure lived in code byte-identical to main; prove identity
   with a git diff over the touched paths plus one isolated rerun of the
   failing suite, then one verbatim rerun for the record.
5. **Forensics before redo.** An absent typed envelope is not evidence no
   work happened: read the event log, the scratch trail, and the tracked
   mtimes first. This run's four deaths split cleanly — nothing durable
   (redo), completed-but-rejected (cure), partial residue (re-prove and
   adopt), zero drift (redo) — and each verdict came from the trail.
6. **Secretless cron + step-level gate = clean skip, not failure.** With
   no FRO_BOT_PAT secret in the repo, an armed nightly cron under the
   job-env gate skips with a warning. After ANY absorb, grep the gate
   before assuming cron health; the operator-facing truth lives in
   AGENTS.md and the pin in the workflow-hardening guard.

## Next-cycle candidates (ranked, existing ids only)

1. **rm-1503 owed arms** — twin-divergence re-measure + #643 keep-fork
   revert decision. These gate everything below.
2. **rm-1501 — absorb upstream #646** (markdown render, tag 2026.10.44,
   absorb-reviewed safe; the rm-1502 guard half is already live, so the
   sink-ban acceptance arm is pre-proven).
3. **rm-196 digest lane** — the .43 absorb carried the agent pin forward
   to v0.122.3@7d273ac6; verify the pin-advance obligation (workflow
   digest bump policy) still tracks the currency lane.
4. **rm-1451 remainder** — setup-node v7.0.0 straggler + setup-qemu
   v4.4.0 (fro-bot.yaml only site).
5. **rm-1504 acceptance arm 2** — the next base-image bump must cite the
   runbook binding in its batch doc.
6. **rm-498 currency** — react 19.3.1, @hono/node-server 2.1.5, and the
   action pins probed live at research (plugin 1.19.3).
7. **Landing-verification duties** — the batch is uncommitted-at-fold;
   statuses move only after landing verification. Re-probe origin/main
   first (already c9f4220e, past the batch base 64cd2f6a): the landing
   merge must reconcile release.yaml + scripts/release-paths.ts against
   the true tip, and the workflow-hardening guard must be re-run green on
   the landed main before the implemented statuses flip.

## Ledger truth at compound close

273 defs / 0 dups / max rm-1505 — unchanged by compound (riders only,
zero mints, zero status flips, no def-line edits; the 4000-char
non-comment line ceiling untouched). Census re-derived statically at
compound; the roadmap guard suites were NOT re-run (no-test constraint).
