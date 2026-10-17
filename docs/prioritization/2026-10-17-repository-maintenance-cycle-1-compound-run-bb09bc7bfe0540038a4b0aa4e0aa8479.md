# Repository maintenance cycle 1 — compound record, run bb09bc7bfe05

- run: bb09bc7bfe0540038a4b0aa4e0aa479 · repository-maintenance 513b2f42 · cycle:1 · dashboard
- compound attempt: 0211c2c19e8a4cd59f80b92811bda307 · 2026-10-17
- pre-review scope: this record consumes assessment/research/roadmap/prioritize/stewardship/
  implement/targeted/full_tests evidence only — review and shipping outcomes land after.

## Batch: rm-884 — operator-contract catch-up to 1.11.0 (waiting overlays unified)

**Status: implemented, validated, pending landing.**

- What shipped: vendored contract core from upstream 3b2f774, selected per commit —
  #619 (c13d4ef: contract 1.11.0, run-list refresh, summary allowlist gains
  waiting_for_approval/waiting_for_question), #623 (c936d85: waiting line + run time on
  cards, operator-time sidecar), #630 (baa0e48), #631 (8470f86: wire fix), #639
  (9d590cd: run-list ordering fix). Both version labels (version.ts:16,
  operator-stream.js:33) at 1.11.0. New test/operator-contract-allowlist-guard.test.ts
  asserts the summary/stream allowlist RELATION (summary = five lifecycle + two waiting
  overlays; stream superset) — not naive equality.
- The core inversion: conformance :1360 "rejects stream-only status:
  waiting_for_approval" codified 1.9.0's deliberate stream-only scoping; 1.11.0
  redefines summaries to carry waiting overlays, so the test inverted red-first.
- Excluded by stewardship boundary (recorded, not lost): #633/#634/#637 UX riders
  (Operator copy/nav), #640 notification-jump UI (web/src/push/* + Notifications* are
  rm-1454-owned), #629 iOS install steps (Notifications/copy files, same owner). These
  remain the standing not-yet-absorbed set for rm-252's next window.
- Fork-keep adaptations: index.ts barrel KEEPS re-exporting run-responses.ts (consumed
  by operator-client.ts:28; upstream dropped it); run-index.js keeps the fork-only
  run-output-gap feature; upstream's onListApplied hook arrived unused.

## Validation record (pre-review, authoritative)

- targeted (attempt 782383c0): verbatim engine targeted command — run 1 exit 1 (one
  REAL failure: endpoint-parity-guard row for the new subscriptions route), fixed
  (route row added), run 2 exit 0; 40 engine-selected node targets + web gap closure
  (no-server-imports, privacy/content, push-types, vapid-key) all green; check-types
  exit 0; digest stable pre==post.
- full (attempt 53999550): verbatim github_ci_validate.py (release 01d80a42) —
  ephemeral PR #845, 11 check-runs: CodeQL/Analyze/Dependency Review/Lint/
  Check Types/Design Check/Test/Check Workflows/Test Scripts Load/visual = SUCCESS,
  Fro Bot SKIPPED (no FRO_BOT_PAT — expected gate skip); PR auto-closed, refs cleaned;
  digest validation:v1:2b80d47dd17d77cc3c2139123103f78897cd9564ebed73db25d26a5824a510b7
  (re-derived from base 3e3664c full-sha — the short-sha form yields a different value;
  notation, not drift).
- Earlier same-phase attempt (76ac8bec) validated PR #837 before the visual baseline
  regen; its digest 0eddaa04 predates the baseline change and is superseded by 2b80d47d.

## Lessons (durable, prevention-grade)

1. **Visual baselines gate on contract allowlists.** The operator-dark fixture page's
   content is filtered by the summary validator: 1.9.0's rejection HID the harness's
   question/approval scenario rows; 1.11.0 acceptance made ~15 rows + an approval group
   render (966px → 3410px). Cure: regenerate baseline deterministically (two regens
   byte-identical), and ALWAYS ride the regenerated PNG with the batch — visual CI
   stays red without it. Full lesson: docs/solutions/workflow-issues/
   contract-allowlist-change-invalidates-visual-baselines-2026-10-17.md
2. **Upstream mega-commits mix scopes.** #619 bundles contract core WITH
   rm-1454-owned notification-jump files. Absorb per-commit, per-file, against the
   stewardship must_remain_separate list — never wholesale.
3. **Salvage-adoption beats redo.** The stranded implement attempt's 47-path tree was
   verified then adopted (curing TS6133/TS2339 at runtime.test.ts:27/:866), saving a
   full re-port; the salvage rider already inside rm-252's evidence is part of this
   record.
4. **origin/main races are the norm, not the exception.** Base moved 3e3664c → 06095e9
   (mid-run ff) → c01946ea → 339f9470 → current during validation. Ephemeral-PR
   validation against current main (with a ci-base lineage commit) is the only form
   that answers "would this land green".
5. **Digest discipline.** Screenshot regens DO shift the tree digest (0eddaa04 →
   2b80d47d) even though src testable surfaces are unchanged; re-derive at emission
   time with the FULL 40-char base sha. Test-file-only edits do NOT shift it.
6. **Id lanes drift across runs.** This run's mints rm-884..890 were spool-side at a
   237-def base while main independently minted to 244 defs; the compound band re-mints
   the authored items into the CURRENT tree roadmap (251 defs, 0 dups), superseding the
   stale-base extension patch. First-landed-wins at the fold.

## Ledger state after this compound

- ROADMAP.md: rm-252 acceptance ceiling re-derived 1.8.0 → 1.11.0 (in-tree, with
  2026-10-17 provenance); rm-884..rm-890 minted into tree (rm-884 flipped
  implemented-pending-landing with evidence rider); census 251 defs / 0 duplicates.
- Band patch for the fold: delegate/0211c2c19…-scratch/compound-roadmap-band.patch
  (100 lines; applies to the a91db62-lineage ROADMAP; supersedes
  roadmap-extension-2026-10-16.patch).

## Next-cycle candidates (priority-ordered, with owners/notes)

1. rm-885 Main-CI run-creation silence — Hermes/GitHub-side root cause needed; the
   batch-doc acceptance demands the mechanism restored and explained.
2. rm-886 Dockerfile digest re-derivation (upstream anchor 7f486cab; verify live);
   blocks on the 88a9f6ed batch's Dockerfile ownership clearing.
3. rm-887 label-ref render cure — blocked while ROADMAP.md is 3-way contested; the
   renderer fix itself is hermes-autonomy-side.
4. rm-888 codeql-action digest + stale PR 508/509 disposition (precondition-first).
5. rm-889 Fro Bot cron re-slot + FRO_BOT_PAT decision (operator decision fork) +
   AGENTS.md:94 truth fix.
6. rm-890 ghost closure rm-131/177/178/285 + ephemeral-PR sweep.
7. New from this cycle: #633/#634/#637/#640/#629 remain the recorded not-yet-absorbed
   upstream set (rm-252 window); upstream's unused onListApplied hook is a
   removal-or-adoption candidate; Node 26 LTS lands 2026-10-28 (rm-139 decision).
