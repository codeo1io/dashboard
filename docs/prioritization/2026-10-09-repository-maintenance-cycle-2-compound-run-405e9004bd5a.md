# Dashboard maintenance — cycle 2 compound (2026-10-09, run 405e9004bd5a)

module: dashboard
tags: `[repository-maintenance, cycle-2, compound, pre-review, attempt-forensics, next-cycle-candidates]`
problem_type: compound-record
base: a9576e3 (workspace base) → implemented at 9aceea8 · origin/main at compound 364272b6 (moved twice since base) · evidence is the uncommitted in-tree batch (13-entry porcelain) plus the markdown-only compound layer.

## Frame

Repository-maintenance cycle 2, run `405e9004bd5a424aad06019cc342efa6`, campaign `b42e91b89ba14e448ece916db2e339e7` at `/work/projects/dashboard`. Phase lineage: assess `bb2ab9f0`, research `bcff3968`, roadmap `a50c74b1` (ext#21, mints rm-740..743), prioritize `f813aadc`, stewardship `a4acaacb`, implement `ef47317c` → re-filed `e3e009f1` (fold-rejected on envelope shape; tree adopted byte-stable), targeted_tests `71ace59a`, full_tests `37f87e37`, compound `f44a7749` (reaped mid-turn) → this record `07d7d954`. **Pre-review evidence only** — review and shipping outcomes happen after this step and are carried forward by the next cycle's assessment. No test or validation command was executed at compound; every outcome below is consumed from the recorded durable records.

## Validated-batch record (targeted 71ace59a + full 37f87e37)

- Targeted: the work-order `targeted_command` executed VERBATIM (engine `run_repo_impacted_tests.py --mode fast --jobs 8`, release 0a4b2d5a) over the six engine-named executable surfaces; `--print-only` first proved a 23-file node selection (no shared-config fallback), then the real run executed 22 files (759/759 tests pass; the 23rd target lives outside the root vitest `include`), `pnpm build:web` green, porcelain byte-stable pre/post, pipeline rc=0 (log `/tmp/71ace59a-targeted.log`).
- Full: the work-order `full_command` executed VERBATIM (`github_ci_validate.py`, release 435d7def). Ephemeral draft PR #456 (head `conductor/ci-a5f226b73f1c` = worktree snapshot over `conductor/ci-base-87bf5f613ec4` = base lineage + live main workflows), ALL 10 checks SUCCESS (Analyze, CodeQL, Check Types, Check Workflows, Dependency Review, Design Check, Lint, Lockfile Guard, Test, Test Scripts Load); PR closed unmerged 2026-10-09T01:57:01Z and both refs force-deleted — teardown re-verified at compound 03:55Z (PR state CLOSED, refs absent from ls-remote).
- Digest discipline: dispatch digest `validation:v1:b0988520d1902284026a1cd2df15f51a93d64a1e7da1e76a651aa967614f067a` (base a9576e3) re-derived equal with the dispatch engine BEFORE and AFTER the full run, and re-derived equal again at this compound attempt after all markdown-only additions (riders, canopy comment, three docs) — the six testable surfaces are byte-stable since full_tests; markdown compounding moved no executable surface.
- Ledger state: census re-derived at compound `node scripts/roadmap-census.ts` → 239 defs / 0 dups / max rm-744; guard pin in `test/roadmap-integrity-guard.test.ts` reads 744 (the guard vitest suite itself is not run at compound per the no-test mandate — pin and census verified textually); `eslint ROADMAP.md` rc=0.

## Attempt forensics (adoption record)

- `ef47317c` (implement): fold-rejected purely because `validation_evidence` sat as a top-level SIBLING of `phase_result`, so the KTD13 gate read `changed_surfaces` absent. No re-implementation: `e3e009f1` adopted the identical 13-entry tree and re-filed with the evidence nested. Lesson recorded in the sibling variant doc `docs/solutions/workflow-issues/phase-result-validation-evidence-missing-implement-fold-rejection-2026-10-07.md` and re-stated in this cycle's learnings doc.
- `f44a7749` (compound, reaped ~16 min in, provider failure): durable trail shows it COMPLETED the ROADMAP layer — four validation riders (one per def, correct block placement verified), the cycle-2 canopy comment with census claim 239/0/rm-744 (matches live census; newest-dated claim, first-parseable per the guard's regex discipline), and the lessons doc — but died before the compound durable records and the typed artifact. This attempt verified that inherited work first-hand (unstaged diff attribution: riders/comment pure additions; the staged ROADMAP/guard content is implement's `cherry-pick -n` fold; census, eslint, digest parity, spool statuses for 71ace59a/37f87e37/e3e009f1/f813aadc all `succeeded`) and adopted it rather than redoing. Adoption rule reaffirmed: a reaped attempt's phase state follows `delegate_turn_completed`, never artifact presence or absence; verify lineage, then adopt or redo.
- The implement phase omitted the in-tree batch-doc copy the prioritize guidance called for; this phase landed it (`2026-10-08-repository-maintenance-cycle-2-batch-run-405e9004bd5a.md`) from the recorded selection content, disclosed in that doc's header.

## Reusable lessons / prevention rules (this cycle's compound yield)

Condensed in `docs/solutions/workflow-issues/maintenance-cycle-learnings-2026-10-09-calver-sort-ephemeral-ci-scope-envelope.md`:

1. Calver staleness must crown numerically (`v2026.10.2 > v2026.9.14`); lexical sort silently misreports. The batch's staleness module implements the numeric crown; any future consumer of tag age must too.
2. An ephemeral-PR green run proves only PR-triggered workflow legs; schedule-only and push-only legs never fire there. Their first real fire is BY DESIGN untested at validation time — triage Monday-morning reds against the leg's trigger class before suspecting regression.
3. The KTD13 envelope variant: `validation_evidence` must be INSIDE `phase_result`; a sibling placement fold-rejects an otherwise-complete attempt. Envelope shape, not work state.
4. Ephemeral validation PRs carry no `pr_number` on failure JSON and run alongside sibling lanes' identical-shaped PRs — attribute by head sha + creation time before flagging fleet residue.

## Next-cycle candidates & context (carried to the next assessment)

1. **rm-714 dormant-vs-active release decision** — owns the durable release channel. rm-740's weekly check (Mon 07:23Z) is red-by-design until decided; the first fire post-landing is the observability proof, not a regression.
2. **rm-252 absorb decision (due 2026-10-13) — STATE CHANGED**: sibling PR #448 (run 9289efaac79f, title "operator contract 1.8.0 window + a82871d reader absorb, rm-703 ledger") is MERGED; main at 364272b6 carries the contract window and reader absorb. Re-read main's twins and ledger before scoping the remaining absorb surface (the 34b02781 collision that forced deferral is gone — it landed).
3. **Post-landing push gate**: execute rm-742 `--apply` with re-derived counts (52 `conductor/ci*` heads at 2026-10-09T03:55Z, 163 total `conductor/` heads; whitelisting <24h refs and open-PR heads — open at probe: #455 run cbe70604af06, #459 `conductor/ci-ba54628d01ca`, #460 ci-trigger-probe of run 84133641).
4. **Integrate obligations for the landing**: union-resolve the ROADMAP against live main (it moved 5aab7c7 → e8d220c → 364272b6 during the cycle; PR #448's ledger is in the union); main's trixie base-image migration touched the Dockerfile before our HEALTHCHECK tail landed — disjoint hunks, no add/add; re-derive census at integrate (239/0/rm-744 at compound); guard pin already at 744; next free id rm-745 (fleet sibling ceiling ~rm-796 — re-run the id audit before minting).
5. **Repo-level watches (sibling-lane-owned)**: cve-tripwire first scheduled fire Mon 2026-10-12 06:53Z is red-by-construction until the sibling NODE_IMAGE tag fix lands; base-drift Monday 04:13Z expected green (digest verified current 2026-10-09). Fro Bot pin v0.117.5→v0.118.2 inert while the workflow stays disabled_manually.
6. **Standing deferred items** hold with recorded reasons (publication-path switch behind rm-714; node digest refresh behind rm-647; rm-116 protection fill post-landing; toolchain majors behind their evaluation windows).

## Review-fix record (2026-10-09, independent_review 4ca46997 → fix bf4dbff9)

Adversarial review verdict NEEDS_CHANGES; all four findings cured this turn, none deferred:

1. **F1 (medium) cured** — `.github/workflows/release-channel.yaml` cron `'17 5 * * 1'` → `'23 7 * * 1'` (Monday 07:23 UTC) + comment aligned to the real Monday cluster (03:37 audit, 04:13 base-drift, 05:17 upstream-drift, 05:23 canary, 06:27 scorecard, 06:53 cve-tripwire on main). The committed minute had been byte-identical to upstream-drift's slot — a template-copy artifact contradicting the workflow's own simultaneous-failure-cliff avoidance and the rm-674 contention datum.
2. **F2 (low) cured by F1** — all five "Mon 07:23Z" records (ROADMAP riders ×2, batch doc, this doc, learnings doc) became true with zero doc edits; the ledger's designed intent and the artifact now agree.
3. **F3 (low) cured** — rm-743 implement-rider test enumeration corrected in place (no USER-node-ordering assertion exists; true seven listed); provenance in a review-fix rider on the def.
4. **F4 (low) cured** — rm-740 rider's "permissions read-all" → "contents: read" (the actual, narrower grant).

**Digest consequence**: the yaml is an executable surface, so the executable-surface digest moved off `validation:v1:b0988520…` — re-derived with the dispatch engine after the fix and re-validated at targeted scope (the work order's required_scope); final_validation must expect the post-fix digest, not the dispatch-time one. Ledger battery re-run after the rider edits (census/guards via the targeted selection, eslint ROADMAP.md). Review's non-finding note carried for rm-714: parseCalverTag excludes 4-part calver tags (origin's 2026.06.15.1/.2 are older than the crown) — revisit if the channel ever mints a 4-part tag as newest.
