# Repository-maintenance cycle:2 compound record — run 31fe572fa420

module: dashboard
tags: `[repository-maintenance, compound, validation, supersession, rebase]`
problem_type: compound-cycle-record

- run: `31fe572fa4204d609b699bb2e1f08448` (repository-maintenance `fddee17a69ce4effbe5c61368b5b2f0d` cycle:2)
- compound attempt: `8291be8f65794a25b9d359da2107e5bc` (2026-10-19)
- lineage: base `64cd2f6a` (verified == origin/main at assess) → substrate ff `655bfe50` mid-full_tests (attempt `fe06a75c`, stale-base cure) → validated snapshot at base `2ba0dd4f` → worktree HEAD `24f2636f` ("conductor-salvage: run=31fe572f…", Salvage-Phase full_tests, Salvage-Touched 5 paths) carrying the batch
- scope: riders-only compound — ZERO mints, ZERO status flips, def lines untouched; no test execution (ce-compound contract; outcomes below are consumed as recorded)

## Batch (pre-review, validated, awaiting landing)

"Operator runbook truth, Monday-window timed" — docs-only, `+70/-22` tracked + 1 new lesson:

1. rm-121 leg — `docs/runbooks/outage-validation.md:82` truth-flip: Fro Bot workflow is ACTIVE with `FRO_BOT_PAT` ABSENT (nightly cron armed-to-fail, `schedule` run 39093521474 failed in 7s on required-token; PR runs skip-green), with an embedded re-probe recipe (`gh workflow list` / `gh secret list` / `gh run list --workflow=fro-bot.yaml`).
2. `docs/runbooks/security-posture.md` — scorecard posture readings refreshed (score 7.7, CI-Tests −1, Branch-Protection −1, Maintained 0) with probe citations.
3. `docs/runbooks/actions-darkness-watch.md` — true last-run tables (audit 2026-10-05 failure; cve-tripwire never ran) + the single-page probe caveat.
4. `docs/runbooks/superseded-batch-pr-disposition.md` — disposition rows aligned to live PR state.
5. New lesson `docs/solutions/workflow-issues/runbook-truth-sweep-fro-bot-armed-gate-2026-10-18.md` (frontmatter-valid, yml-quotes-safe, prose-residue clean).

## Validation record (consumed, not re-run)

- targeted (attempt `e5d7f687`): `impacted-tests: no executable surfaces changed; nothing to run`; guards `prose-residue-guard` 3/3 + `docs-solutions-frontmatter-guard` 2/2 green; eslint on the 5 changed `.md` → 0 errors; digest `validation:v1:00ce386afdef9ce9c081b393e09d26d376e5c07308e8757074217d72d9a54009` identical before and after (markdown-classed, digest-neutral).
- full (attempt `93dc2be4`, after `fe06a75c` died of a dispatch-lease expiry mid-poll): ephemeral GitHub CI round — PR #990, commit `397de4b5f63f5b373242a3d190ccd5bd37cb3b1f` on validation base `2ba0dd4f`, 8/8 checks green (Lint; Test 1m53s; Check Types; Design Check; Check Workflows; Test Scripts Load; Dependency Review SUCCESS; Fro Bot SKIPPED-by-design), 2026-10-18T15:24:18–15:26:14Z; validator `ok:true`, PR closed and refs deleted by its finally block.

## Compound outcome — lessons

1. **Stale-base path-parity red in ephemeral CI** (first observed here at PR #965 / run 39116520040): the validator grafts current-main workflows onto the candidate base; when main's `release.yaml` gained `scripts/gzip-static-sidecars.ts` (landing 389d60ef lineage) the base-era `scripts/release-paths.ts` corpus failed the parity guard — a mixed-tree artifact, not candidate drift. Cross-ref, do not duplicate — the parity-red lesson `ephemeral-ci-validator-grafts-main-workflows-old-base-path-parity-red-2026-10-18.md` under `docs/solutions/workflow-issues/` is landed ON CURRENT MAIN but ABSENT at this fork-point HEAD `24f2636f` (base `64cd2f6a` predates it): review-F2 explicit disposition, not a delivery claim — self-heals at merge. Cure variant added by this run: ff-only the substrate onto green main and re-apply the batch as a patch (alternative to the lesson's checkout-the-guard-halves move) — clean because the batch files were untouched by the drift.
2. **Live dirty-wall collision census** (prioritize method): carve maps recorded in sibling phase artifacts went stale within hours; the census `git -C ../run-*/ status --porcelain` over all 24 sibling worktrees found every code zone already claimed (lockfile-guard ×3, listener lane ×4, render-guard ×3) while the stale map showed them open. Rule: probe live walls + spool patches at prioritize time, never reuse a prior artifact's carve map.
3. **Cross-project spool fog**: this delegate spool is shared with the agenttrace/pricing project whose runs mint `rm-*` ids in the same range; frontier probes must scope to dashboard lineages (resolved rm-1964/1965 "fog" as run 25c100eb/0af378de artifacts).
4. **Reaped-attempt forensics pattern** (used 4× this run): on infra reaps, verify the dead attempt's typed artifact + worktree state, declare nothing-adoptable, and redo from scratch — never resume on unaudited state.

## Next-cycle leads (CARRIED-NOT-MINTED; liveness re-verified 2026-10-19)

1. **HIGH** `FRO_BOT_PAT` gate still absent on main (`.github/workflows/fro-bot.yaml` ungated at origin/main today; nightly `schedule` failures continue — last is run 39093521474, the delayed 2026-10-18 00:00Z fire, created 2026-10-18T03:24:43Z and failed on the required token; the compound-time "Oct-19 00:00Z failure observed" claim is corrected at review-F3 as NOT reproducible — `gh run list --workflow=fro-bot.yaml --limit 6` shows no fro-bot run of any kind created after 2026-10-18T19:54:16Z; PR runs skip-green in ≤1s). Restore the armed-gate (recovery source: `git show edf948de:.github/workflows/fro-bot.yaml`) or provision the secret; pair with the doc sites this batch already flipped.
2. **MEDIUM** Six Monday cron lanes still silent through the 2026-10-19 03:37–07:23Z window (`gh run list --created 2026-10-19` shows only fro-bot/commit-status runs) — darkness umbrella persists; `scripts/actions-darkness-watch.ts:214/:218` still single-page (no Link-header/`created>=` pagination).
3. **MEDIUM** PWA update path dead on main: README kill-switch fiction still present (1 grep hit, README.md:37 — review-F4 corrected the compound-time ×2 count), `web/src/sw.ts` expects SKIP_WAITING with no poster, `registerSW.js` is a bare register. Wiring-only inside vite-plugin-pwa 1.3.0.
4. **LOW** `openAlertCount` transported-but-unrendered; no `isArchived`/`pushedAt` handling.
5. **LOW** listener ingest dedupe fallback key (NULL `dedupe_key` bypasses the unique index within the ±300s window) + snapshot `platformStatus` validator asymmetry (`snapshot-store.ts:83`).
6. **Windows** Node 26 LTS opens 2026-10-28 (v24 maintenance entry 2026-10-20, end 2028-04-30); base-image digest == registry pin (watch, do not re-pin); upstream exactly 1 commit behind (#646, 2026.10.44) with #628 launch-prompt and #598 impeccable-v4 foresight.

Supersession: this run's roadmap-phase mints rm-1962/rm-1963 (spool patch `roadmap-delta-31fe572f-16925d03-cycle2.patch`) never landed; the managed-render renumber superseded them — their content is re-carried as leads 1/2/5 above.
