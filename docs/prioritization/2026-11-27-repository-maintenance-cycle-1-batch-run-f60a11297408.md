# 2026-11-27 · repository-maintenance cycle:1 · selected batch — run f60a11297408

**Batch name:** `config truth and release-path safety`
**Selected by:** prioritize attempt 36eed57d8de744c6a1abcf5ae10777d4, composing on this run's research (attempt 9edec7e9a3ad459ca4535c6e15a31172) + assess (attempt ed8abef9ab204b80b4dee0b1b1f53869, findings F1–F27) + roadmap extension (attempt b9324d6c74a640f9a37e119508d8dec3, mints rm-2135–rm-2146).
**Implemented by:** implement attempt 8fda5dcb43ca45aab7611ee49d76fbac in the run worktree (branch `conductor/run-f60a11297408`, base af26a5e71), under the stewardship request (attempts b26563962d6c476f8472892cfc97e2ac / 6dd6f2b24e144accb17f48ecb495638b).

**Design constraint (decisive):** this delegate runs OFFLINE (no route to host, empty node_modules, no bun) — the batch was selected as Tier A: five units of pure YAML/docs with zero `src/`, `web/src/`, or `public/` changes, each statically verifiable in-tree, with actionlint/lint/green-run proofs landing in CI.

## Members

| # | id | file set | change |
|---|----|----------|--------|
| 1 | rm-2135 | `.github/workflows/release-pending.yaml` | execute-job App-token mint gains `owner:` + `repositories:` narrowing (mirrors release.yaml's publication mint), closing installation-wide write-token breadth; permission-* inputs unchanged |
| 2 | rm-2136 | `.github/workflows/release.yaml` | failure-path cleanup (the `if: failure()` step) additionally removes the promoted `$CALVER`/`sha-$SHORT_SHA` GHCR image tags via `docker buildx imagetools rm` — best-effort, tolerant of already-absent tags and of GHCR refusing, never masking the original failure; step order and every happy-path step untouched; a completed Promote-latest flip is a recorded residual (the def's reorder variant is the full cure for that inversion) |
| 3 | rm-2142 | `AGENTS.md`, `.github/workflows/dependency-review.yaml`, `.github/workflows/audit.yaml`, `.github/workflows/canary.yaml`, `playwright.config.ts`, `test/static-assets.test.ts` | docs-truth micro-batch 4: impeccable pin text made source-of-truth-named (no literal, drift-proof); pnpm-citation cluster corrected to the real control (bunfig.toml `minimumReleaseAge = 259200`, seconds) and package.json's undici floor override; canary/audit timeout rationale prose migrated off pnpm terms; the six pnpm-prose sites (playwright 5/8/29, static-assets 82/139/1665/1716) → `bun run …` |
| 4 | rm-2140 | NEW `.github/workflows/hygiene.yaml` | weekly (cron `43 5 * * 1`) + dispatch report-only job (timeout-minutes 10, contents:read + pull-requests:read) running the three landed-unscheduled scripts — sweep (dry-run default, rm-742), janitor (report mode, no `--execute`), ledger-check last so its designed-red exit cannot mask the other reports; every report bubbled into `$GITHUB_STEP_SUMMARY`; `--apply`/`--execute` never scheduled |
| 5 | rm-603 (close-out rider) | `.github/workflows/scorecard.yaml` | `timeout-minutes: 10` + house-ceiling rationale comment — the last unbounded workflow (15/15 now bounded); closes the def |

Rationale (five axes): both P2s land (security token breadth + release rollback symmetry, additive cures only); risk bounded (no runtime code, failure-path-only pipeline change, report-only new workflow); effort XS–S per unit, no file overlaps; dependencies none (scripts import only node builtins — no install step needed in hygiene.yaml); strategic — kills the twice-recurred pin-drift trap class, closes prior-research C2 (standing since run 9ff7524f), and closes rm-603 entirely.

Excluded (deferred with blockers): rm-220+rm-2137 (needs runnable timing tests), rm-601 (property tests), rm-2139/rm-2138 (code+test), rm-2141 (tests are the deliverable), rm-2144 (guard test in-landing), rm-139/rm-878 (networked), Tier-B riders. Full ranking: `…/evidence/36eed57d8de744c6a1abcf5ae10777d4/prioritization.md`.

## Deliverables

- `.github/workflows/release-pending.yaml`
- `.github/workflows/release.yaml`
- `AGENTS.md`
- `.github/workflows/dependency-review.yaml`
- `.github/workflows/audit.yaml`
- `.github/workflows/canary.yaml`
- `playwright.config.ts`
- `test/static-assets.test.ts`
- `.github/workflows/hygiene.yaml`
- `.github/workflows/scorecard.yaml`
- `ROADMAP.md` (ledger carrier — the 12-mint extension rm-2135–rm-2146 from the roadmap phase, riding this batch's landing as its own doc-of-record unit, never squashed into a member commit)
- `docs/prioritization/2026-11-27-repository-maintenance-cycle-1-batch-run-f60a11297408.md` (this document)

## Census claim (roadmap-integrity-guard carrier)

Live ledger after the roadmap-phase extension, unchanged by this implement phase: **351 defs / 0 dups / max rm-2146** (`node scripts/roadmap-census.ts`, render-tail marker intact). First-recorded by this run's roadmap attempt; this batch adds no ledger lines and deletes none.

## Verification

Offline static (done, in-tree, this attempt):

- YAML parse of all seven touched/new workflow files: jobs resolve (hygiene→report, scorecard→analysis, release-pending→route/execute, release→guard/release/dispatch-deploy, canary/dependency-review/audit intact).
- rm-2135: mint `with:` keys = app-id, owner, permission-contents, permission-pull-requests, private-key, repositories — sibling-parity with release.yaml's narrowing.
- rm-2136: `docker buildx imagetools rm` present in the failure-path cleanup only (line 673); promote/promote-latest steps untouched (git diff confirms single-step region).
- rm-2142: pnpm-prose sweep — the six named sites now read `bun run …`; the citation now names bunfig.toml `minimumReleaseAge = 259200` (verified against the live bunfig.toml:5) and package.json's undici floor; residual mentions are functional (release.yaml's tool-removal loop, `pnpm-lock.yaml` filename in should-release) or deliberate historical notes (audit's migration records), consistent with the rm-2134 landed set.
- rm-2140: hygiene.yaml parses; job perms contents:read + pull-requests:read; timeout 10; 5 steps; cron single-quoted `43 5 * * 1`; `--apply`/`--execute` absent (grep).
- rm-603: scorecard job timeout-minutes 10 present.

CI-at-landing expectations: actionlint clean (all workflows, hygiene.yaml included); `pnpm lint` → lint green including the yml/quotes rule on the new file; `bun run test` full suite green (the two test-file edits are comment-only — no behavior change); census 351/0/rm-2146 on main; roadmap-integrity-guard green with this doc's Deliverables. Live proofs: rm-2135/rm-2136 ride the next real release-pending/release fires (rm-708's two-green-runs gates watch those); hygiene.yaml's first scheduled Monday fire produces the drift report.

## Honest limitations

- actionlint/eslint/vitest could not run here (offline, no node_modules, no bun) — the YAML parse check (python3 pyyaml) and greps stand in; CI at landing is the binding proof.
- `docker buildx imagetools rm` GHCR semantics: best-effort by design — if GHCR refuses tag deletion with the job's GITHUB_TOKEN packages:write, the step logs the residual and continues; that outcome is recorded in the step comment and acceptable per the def's tolerance clause.
- The promote-latest inversion residual is documented, not cured (the def records the reorder variant as the alternative cure).
