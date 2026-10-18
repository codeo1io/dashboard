---
module: dashboard
tags: [repository-maintenance, cycle-2, compound-record, rm-856, rm-740, rm-252, rm-187, rm-780]
problem_type: compound-cycle-record
owner: hermes-conductor
run_id: 77d7cc3e69bd41f997bdbe0b9b873142
attempt_id: fb9ceae7d8904337b8a4e13345eabbca
base: 5ab50da0
campaign: repository-maintenance 144ffbbcc57a4d7f98c31927b85cbc32 cycle:2
status: cycle_compounded_pre_review
---

# Dashboard repository-maintenance cycle 2 compound record — run 77d7cc3e69bd

Compounds the cycle's pre-review evidence (assess, research, roadmap,
prioritization, stewardship, implement, targeted_tests, full_tests) into the
ledger and this record. NO test execution happened at compound — every
validation statement below cites the phase that recorded it. Review and
shipping outcomes happen after this phase and ride the next cycle's assess.

- campaign: repository-maintenance 144ffbbc cycle:2, base 5ab50da0 (assessed
  clean at HEAD; origin/main advanced intra-run to 655bfe50 — all ledger
  dedup was run against the live main blob).
- phase chain: assess ebe708a7 · research 0a755e20 · roadmap 5edf35f5 ·
  prioritize 823cbc11 · stewardship c0e6a5b3 · implement 765403ef ·
  targeted_tests 9ed64c8f · full_tests 8e8aae8a · compound fb9ceae7 (this
  phase; prior compound attempt b907ec72 died provider-side ~24s in with
  zero durable trail — event log 4 lines, tree fingerprint byte-identical
  to the implement end-state — so this phase is a from-scratch redo,
  nothing adopted).
- selected batch (docs/prioritization/2026-10-18-repository-maintenance-cycle-2-batch-run-77d7cc3e69bd.md):
  'Monday-revival truth pass plus currency pair', 4 legs, all landed
  in-tree uncommitted.

## Batch composition and journey

| Leg | Def | Surface | Outcome |
| --- | --- | --- | --- |
| 1 (lead) | rm-856 | .github/workflows/base-drift.yaml | probe tag now DERIVED from Dockerfile ARG NODE_IMAGE (buildx leg, token+registry-HEAD fallback, echo, issue title/body); fail-closed on empty derivation; no literal node: alias survives outside the historical comment. numstat 24/8 at compound; review fix 2026-10-19 also de-hardcoded the fallback's repository path + ref from the SAME derived tag (library/ for official images, verbatim for namespaced, latest for colon-less) — final numstat 41/9. |
| 2 | rm-740 | scripts/release-channel-staleness.ts + test/release-channel-staleness.test.ts | parseCalverTag speaks the minter's grammar, field renamed day->patch, month range stays strict, header truthed to YYYY.MM.PATCH; at compound the third component was a 1-3-digit PATCH >= 1 — review fix 2026-10-19 widened it to the minter's actual grammar (unbounded \d+, patch >= 0: a fresh month starts at .0 and counters have no digit bound). numstat 12/9 + 24/5 at compound; final 23/9 + 49/5. |
| 3 | rm-252 (rider execution) | .github/workflows/fro-bot.yaml:313 + AGENTS.md | fro-bot/agent pin 7d273ac6 (v0.122.3) -> 1529cc2e (v0.123.0), contract 1.11.0 parity verified first-hand; AGENTS.md clonedeps truth v0.122.1 -> v0.123.0 + re-provision date 2026-10-18. numstat 1/1 + 2/2. |
| 4 | rm-187 / rm-780 family | src/listener/store.ts | parseLinksCell degradation routes through logger.warning with a bounded, non-embedding shape: strip the V8 snippet tail after the ellipsis, sanitizeErrorMessage the remainder, cap 200 chars. numstat 11/5. |

Fold-gate note (implement phase record): the implement fold-gate rejection was
cured by (a) declaring changed_surfaces and (b) fixing a real defect the
re-verification exposed; the landed leg-4 shape above is the bounded result.

## Validation record (recorded, NOT re-run at compound)

- targeted_tests 9ed64c8f: engine runner (run_repo_impacted_tests.py, mode
  fast, jobs 8) rc=0 — 319 tests over 4 files: 315 passed / 3 skipped /
  1 todo / 0 failed. The per-suite attribution originally recorded here
  (endpoint-parity 267 / listener-store 26) did not reconcile with the tree
  (endpoint-parity-guard.test.ts has 8 tests; listener-store.test.ts has 11)
  and is withdrawn per the 2026-10-19 review — the runner's own stdout
  ('selected areas: listener, release-channel') is authoritative. Runner-printed
  digests: validation:v1:1c443ec1… / impacted:v1:1f0d2a36…; dispatch digest
  declared verbatim (porcelain/numstat byte-identical before/after that phase).
- full_tests 8e8aae8a — CORRECTED 2026-10-19 (independent_review 1cffb5e0
  critical findings; original text withdrawn as materially false): the
  command returned rc=0, but the ephemeral PR story it recorded was false.
  The real ephemeral 'validation PR #976' (created 11:55:55Z, closed
  11:57:39Z) was a single commit 532c13a6 on synthetic base 5b7552db with PR
  base branch conductor/ci-base-5b7552db31ac (NOT main) and carried NONE of
  the batch's files (verified per-file via the contents API); its Test check
  FAILED (test/should-release.test.ts rm-248 parity, 3609 passed / 1 failed —
  stale-corpus seam artifact on the delta-less snapshot, not a batch defect:
  the true worktree passes that exact guard 72/72). The recorded snapshot/head
  ids (5c65d3b, 655bfe50, conductor/validation-1e39795d) never existed as a
  PR, and 'ALL required checks success' was vacuous (main's branch protection
  carries no required checks). NET: the batch has NO full-suite CI validation;
  the landing gate owes the real pass — enumerate per-check conclusions and
  assert a delta-presence marker on the ephemeral head (fro-bot.yaml pin ==
  1529cc2e), never a bare rc=0.
- Guards at the authoring phases (assess/roadmap/prioritize): 103/103
  deterministic guard tests, roadmap guards 15/15, eslint 0 problems,
  check-types rc=0 (implement).

## Prevention rules (reusable lessons)

1. Derive probe targets from the pin source, never from a parallel hardcoded
   alias: the base-drift alias broke while the pinned tag was healthy —
   the rm-856 derivation extends the rm-779 resolve pattern to
   alias-vs-digest comparisons.
2. A gate that parses what a channel emits must derive its grammar from the
   minter (scripts/compute-release-tag.ts), never from a reading of legacy
   tags — the day cap blinded newest-selection to every patch above .31.
3. Log degradation through the logger seam with a bounded, sanitized shape —
   a V8 SyntaxError message embeds a snippet of the offending source (and any
   secret-shaped runt inside it).
4. An in-tree cure does not stop a scheduled fire on origin: deadline legs
   must land before the cron or the predicted false red will fire — select
   calendar-driven legs first and record the expected first-fire outcome in
   advance (this cycle did, on rm-1437's adjudication rider).
5. Claim a registry/alias break only after a double-probed stable read (the
   research phase re-probed at 07:15Z before recording MATERIALIZED).
6. Ephemeral-CI green proves guard shape, not rider-lineage union: the
   snapshot applies dirty files wholesale onto the live head — the landing
   gate must merge riders with main's same-def additions chronologically.
7. node_modules wipes recur between phases (twice this run); the cure is a
   frozen install (~16s) and the cloud validation route is immune.
8. Record a validator's PR evidence from the PR itself — head-commit content,
   PR base branch, per-check conclusions — never from the command's rc alone;
   'required checks' language is vacuous until main's protection actually
   requires checks (rm-116). The rc=0 that never validated anything is this
   cycle's costliest lesson.

## Review fix (2026-10-19, independent_review:fix — reaped attempts 534ea459
and 33561473 authored the code + ledger corrections, provider death took
both before their result envelopes; completed and first-hand re-verified by
f87d1a0b)

Cures all 8 findings of independent_review 1cffb5e0 (NEEDS_CHANGES): the
false validation record corrected here and at the five ROADMAP locations
(rm-252/rm-856/rm-187/rm-740 compound riders + the compound cont. trailer);
parseCalverTag widened to the minter's grammar (unbounded \d+, patch >= 0,
fixtures .0/.32/.47/.1234 + three newest-selection regressions); the
base-drift fallback de-hardcoded off the derived tag; .slim/clonedeps.json
truth moved v0.78.0 -> v0.123.0 on both @fro-bot entries (pin truth now one
tag across fro-bot.yaml:313 + AGENTS.md + the manifest);
test/listener-store-degradation.test.ts gains the warning-shape pins (ONE
`[warning]`-prefixed logger line, V8 snippet tail stripped, 200-char cap);
the targeted per-suite attribution withdrawn above. First-hand retest at
this worktree: see the phase record (targeted runner rc=0 over the 4 changed
surfaces, roadmap guards, census, eslint, check-types, actionlint — all
green; per-suite numbers on the attempt record f87d1a0b).

## Next-cycle candidates (concrete, existing ledger ids only)

1. Monday-revival adjudication riders for the 2026-10-19 fires (audit 03:37,
   base-drift 04:13, upstream-drift 05:17, canary 05:23 — first-ever
   green-capable canary fire; release-channel's first scheduled fire reads
   RED BY DESIGN until the fog rm-714 dormancy decision lands).
2. Extend the rm-856 derivation to cve-tripwire.yaml — completes that def's
   full acceptance (both workflows single-sourced off the Dockerfile ARG);
   the 2026-10-10 defer trigger ('first cycle after one sibling derivation
   lands') is satisfied by this batch's landing.
3. rm-252 markdown absorb cycle: upstream #646 (33 files, display-only but
   Bun->pnpm markdown-it hand re-lock + lockfile-policy check) behind the
   gateway-estate verdict.
4. rm-139 Node-26 triple bump at the 2026-10-28 gate — fresh evidence on the
   2026-10-18 rider (node:26-trixie-slim digest live, @types/node 26.6.5 on
   npm).
5. rm-883 open window member react 19.3.1 (hono / @hono/node-server / vite
   confirmed current at research).
6. rm-1437 Fro Bot provision-or-disable decision: workflow ACTIVE with zero
   repo secrets — every scheduled run fails at checkout; the AGENTS.md:94-96
   'disabled_manually' truth flip rides whichever decision lands.

## Fold map / landing notes

- Uncommitted delta (11 tracked-file entries: base-drift.yaml, fro-bot.yaml,
  .slim/clonedeps.json, AGENTS.md, ROADMAP.md, release-channel-staleness.ts,
  store.ts, listener-store-degradation.test.ts,
  release-channel-staleness.test.ts, the cycle batch doc, this compound doc
  — clonedeps.json and the degradation test joined at the 2026-10-19 review
  fix).
- ROADMAP.md compound delta: 4 validation-outcome riders (rm-856, rm-740,
  rm-252, rm-187) + the rm-856 status flip candidate -> implemented
  (pending landing) + the cycle:2 compound trailer; the 5 roadmap-phase
  riders precede them in the same file.
- Landing gate must: merge riders with live main's same-def additions
  chronologically (NOT wholesale); re-derive the agent pin + AGENTS.md
  clonedeps truth to ONE tag — the canonical clonedeps mirror has since
  been re-provisioned at v0.123.1 (live probe at compound), so pin (v0.123.0)
  and mirror (v0.123.1) must not straddle; re-derive the validation digest
  at the gate per the emission-time rule.
- Repo hygiene: no repo-root scratch (all logs under /tmp or the delegate
  spool); tracked-file drift is exactly the cycle batch, left uncommitted
  for the commit phase.
