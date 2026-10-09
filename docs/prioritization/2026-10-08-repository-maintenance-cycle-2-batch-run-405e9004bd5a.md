# Dashboard maintenance — cycle 2 batch (2026-10-08, run 405e9004bd5a)

module: dashboard
tags: `[repository-maintenance, cycle-2, batch-record, prioritize, selection, compound]`
problem_type: batch-record
base: 5aab7c7 (work-order base a9576e3 ff-advanced at roadmap; selection raced live main e8d220c) · batch implemented at 9aceea8 (ext#21 folded over the moved main) · in-tree copy landed by the compound phase on 2026-10-09 from the recorded prioritize artifact (spool f813aadc) — the implement phase omitted this copy; selection content below is the recorded selection, unchanged.

## Selection context (2026-10-08, prioritize f813aadc)

Inputs consumed (not redone): assess bb2ab9f0 (five findings at 5aab7c7), research bcff3968 (six candidates), roadmap a50c74b1 ext#21 (rm-740..743 minted in-tree at 5aab7c7). Live-base race re-probed first-hand at selection: origin/main had moved 5aab7c7 → e8d220c (three landings); main census 233 defs / 0 dups / max rm-744 (the #570 absorb), worktree 236 / 0 / rm-743 — the 8abe5d21 integrate had explicitly honored this run's rm-740..743 claims, so no def-id collision; none of the batch surfaces (src/server.ts, Dockerfile, README.md, .github/workflows, scripts/) were touched since base.

## Batch selected — "Operational truth: make silent-failure surfaces loud"

All four defs this cycle minted itself (ext#21), implemented end-to-end; every surface that can fail silently gets a loud, testable signal. No new mints, no secrets, no push, no PR inside the cycle.

- U0 (fold) — carry ext#21 onto live main: ROADMAP.md + guard test; guard pin resolves to 744 (landed-main-wins; no mint above the ceiling in this batch).
- U1 rm-741 (assess F4, DX contract) — Retry-After on every 429 from the shared limiter: integer ceil-seconds-to-window-reset exported from src/server.ts, focused red-first suite over all three path classes, README rate-limit table row.
- U2 rm-743 (assess F3, reliability) — Dockerfile HEALTHCHECK probing /api/healthz gated on r.ok ONLY (liveness, never lastFetch staleness — a slow upstream must not restart-loop); NEW guard test; runbook orchestration note; local docker build/run smoke with a healthy inspect AND an unhealthy red-proof.
- U3 rm-740 (assess F1 HIGH + research C2, reliability) — release-channel staleness check: NEW weekly + workflow_dispatch workflow + testable verdict module under scripts/; step summary names the decision-owning def rm-714; red while the dormant-vs-active decision is undecided, by design.
- U4 rm-742 (assess F5, maintainability) — stale remote-ref sweep script, --dry-run default, --apply explicit; fixture unit test; live dry-run capture against origin; execution reserved to a sanctioned push gate.

Why this batch: the run's four highest-impact unowned findings, none deferred; touch-set disjoint from everything landed since base and from all unlanded sibling lanes (34b02781 gateway twins, 9289a4ac run-index kinds, 530bd1a9 web client, c026a644 riders/docs); no write paths added (read-only invariant untouched). rm-740 deliberately does NOT take rm-714's dormant-vs-active decision and rm-743 deliberately does NOT take rm-708's healthz FIELD truth — acceptance scopes kept disjoint as minted.

## Considered and deferred (do not re-litigate without new evidence)

1. rm-157 operator-contract 1.6.0→1.8.0 catch-up + gateway pin v0.117.5→v0.118.2 — head-on collision with unlanded sibling 34b02781 at selection; rm-252's absorb decision is due 2026-10-13 and is the natural gate. (Compound 2026-10-09 update: sibling PR #448, run 9289efaac79f, is MERGED — the contract 1.8.0 window + a82871d reader absorb + an rm-703 ledger landed on main; re-read main's twins/ledger before scoping the remainder.)
2. Release publication-path switch (GITHUB_TOKEN contents:write) — owned by rm-714's decision lane, not ours to preempt.
3. Node base digest refresh 0e0ff40→d6aa754 — rm-647's audit lane owns it; the 2026-10-12 designed-red is a deliberate signal.
4. rm-116 branch-protection fill — repo-settings mutation, standing first-post-landing watch item, not a code batch.
5. Toolchain majors (typescript 7.0.2 / vitest 5.0.3 / pnpm 12.10.1) and patch regens — landed evaluation windows hold; dated riders only.

## Verification expectations (recorded pre-implement; outcomes below)

- U1: red-first focused suite (header absent on main) then green; check-types, lint, test green; no dependency movement.
- U2: guard test green; local docker smoke with inspect showing healthy; red-side proof that a failing probe flips the state unhealthy.
- U3: actionlint container-form clean; unit tests over fixture inputs (fresh pass, stale fail, retired-with-owner pass, malformed throws); the scheduled run cannot fire pre-landing — red-while-undecided is by design.
- U4: fixture unit test green; live dry-run output against origin captured; zero deletions without --apply.

## Cycle outcomes (compound record, pre-review, 2026-10-09)

Recorded by the compound phase from already-recorded cycle evidence; no validation was executed at compound. Ledger riders and canopy comment were authored by attempt f44a7749 (reaped mid-turn); this copy and the compound record doc were completed by the re-filed attempt 07d7d954 after verifying that inherited work.

- Delivered in-tree pending landing: rm-740 (scripts/release-channel-staleness.ts + .github/workflows/release-channel.yaml + 19-test suite), rm-741 (rateLimitRetryAfterSeconds at the single shared 429 site + 8-test red-first suite + README row), rm-742 (scripts/sweep-stale-conductor-refs.ts + 13-test suite + live dry-run capture), rm-743 (Dockerfile HEALTHCHECK + 7-test guard suite + runbook note + docker smoke with healthy and unhealthy proofs). Tracked delta +112/-1 over 6 files at implement close, plus 7 new files; statuses flipped candidate → implemented (pending landing) with in-band riders disclosing every acceptance delta.
- Validation record: targeted_tests 71ace59a — work-order targeted_command VERBATIM, engine-derived 23-file selection (22 executed: 759/759 pass; the 23rd target sits outside the root vitest include), porcelain byte-stable pre/post. full_tests 37f87e37 — full_command VERBATIM, ephemeral draft PR #456 (head `conductor/ci-a5f226b73f1c` over `conductor/ci-base-87bf5f613ec4`), ALL 10 checks SUCCESS, PR closed and both validation refs deleted (teardown re-probed at compound). Dispatch digest `validation:v1:b0988520…` re-derived equal before and after every post-implement phase — the executable surface is byte-stable since full_tests.
- Process record: implement's first attempt ef47317c was fold-rejected on result-envelope shape only (validation_evidence placed as a top-level sibling of phase_result); the completed tree was adopted byte-stable and re-filed at e3e009f1. The first compound attempt f44a7749 was reaped mid-turn after completing the ROADMAP riders, canopy comment, and lessons doc; the re-file verified that work (census 239/0/rm-744, eslint clean, digest parity, rider placement per def block) and added the missing durable records.
- New solution doc: `docs/solutions/workflow-issues/maintenance-cycle-learnings-2026-10-09-calver-sort-ephemeral-ci-scope-envelope.md` (calver must be crowned numerically; ephemeral-PR green proves PR-triggered workflows only; the result-envelope sibling fold-rejection variant; ephemeral-PR attribution by head sha + creation time).

### Next-cycle entry points

- rm-714 dormant-vs-active release decision owns the channel; the rm-740 weekly fire (Mon 07:23Z) reads RED by design until it lands — do not re-triage as a regression.
- rm-252 absorb decision due 2026-10-13 — PR #448 already landed the contract 1.8.0 window + reader absorb on main; re-read main first.
- Post-landing push gate owes rm-742 --apply with re-derived counts (52 `conductor/ci*` remote heads at the 2026-10-09T03:55Z compound probe, 163 total `conductor/` heads; origin/main 364272b6 — moved twice since the batch base).
- fro-bot.yaml pin v0.117.5 → v0.118.2 stays inert while Fro Bot remains disabled_manually (no FRO_BOT_PAT provisioned).
- Next free id in this ledger rm-745; sibling lineages have minted far above (fleet ceiling ~rm-796 at the 2026-10-09 audit) — re-run the id-ceiling audit before any mint.
- Repo-level watch (sibling-lane-owned): cve-tripwire's first scheduled fire (Mon 2026-10-12 06:53Z) is red-by-construction until the sibling lane's NODE_IMAGE tag fix lands; base-drift's Monday 04:13Z fire should be green.
