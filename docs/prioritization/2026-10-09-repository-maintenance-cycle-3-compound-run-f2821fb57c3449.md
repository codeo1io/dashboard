---
kind: compound-cycle-record
campaign: repository-maintenance a8c6e19df7df46c4aec73a64303eb8f3
cycle: '3'
run: f2821fb57c34497c9e0316c924287533
attempt: 613eaa63274a4711a9909cb395be2593
base: 88e423a6c53a8e81a7eb4ab121ef66c57bfab9c7 (== origin/main)
date: '2026-10-09'
---

# Repository-maintenance cycle:3 compound record — run f2821fb57c34

Pre-review compound: consumes the recorded outcomes of this cycle's assess,
research, roadmap, prioritize, stewardship, implement, targeted_tests, and
full_tests phases. No test execution at compound (work-order ban); all numbers
below are cited from the recorded phase evidence, re-verified only by
read-only greps.

## Cycle outcome

- Batch selected (prioritize 119de0db): **operator traffic path hardening** —
  rm-183 (limiter XFF-collapse log-once detector + runbook two-source
  verification step + unit suite) + rm-602 (static response compression;
  decision-first gate discharged by a first-hand read of
  `marcusrbrown/infra@3216bb06` `apps/dashboard/config/Caddyfile` — no
  `encode` directive, so the production proxy compresses nothing and the
  app-layer branch per acceptance proceeds).
- Delivered (implement fefe82be) as ONE cumulative spool patch
  `delegate/implement-f2821fb57c34-fefe82be.patch` (866 lines, 7 files,
  +658/−13, md5 `dc44958a3ae30c22bc1162982b3fe2a2`), tree restored pristine.
  Files: `src/server.ts` (detector + precompressed serving), `package.json`
  (build hooks), `scripts/gzip-static-sidecars.ts` (new, 9/9 sidecars,
  −41.4% bytes), `test/rate-limit-xff-collapse.test.ts` (new, 10 tests),
  `test/static-assets.test.ts` (+155), `docs/runbooks/gateway-access.md`
  (+47), `ROADMAP.md` (this run's roadmap/prioritize/implement layer).
- This compound phase adds (spool patch
  `delegate/compound-f2821fb57c34-613eaa63.patch`, applies AFTER the implement
  patch): validation-outcome riders on rm-183 + rm-602, tail comment
  `cycle:3 compound #13`, this record, and one solutions lesson. Zero mints,
  zero status flips.

## Validation ledger (recorded outcomes, consumed)

| phase | outcome |
|---|---|
| targeted_tests 52b86391 (scope none — report-only implement, derived changed_testable_surfaces []) | apply→battery→restore round-trip: 7 suites 158/158 (xff-collapse 10/10, static-assets 115/115, limiter neighbors, roadmap guards 9/9); census-equivalent census 247/0/780 implemented:126 open:2; eslint rc=0; check-types rc=0; digest reproduced byte-exact pre-battery and post-restore |
| full_tests 657a965a (verbatim, attempt 1) | REJECTED fold ("phase_result reports the phase failed") — executed `validation.full_command` byte-exact; GitHub repo-scoped Actions disable (probe 422) meant the ephemeral PR #502 registered ZERO checks after a 60-min burn; self-cleaned; folded honest-failed |
| full_tests 2645588d (authorized deviation, attempt 2) | SUCCEEDED per fleet protocol #17583 with supervisor authorization: fresh 422 probe at 21:29Z, newest run still 37872407109 (2026-10-09T01:59:31Z); local content-identical six-job Main-workflow mirror ALL GREEN — `pnpm install --frozen-lockfile` rc=0; `TIMING=1 pnpm lint` 0 errors/10 baseline warnings; `impeccable@3.2.1` findings `[]`; `pnpm check-types` rc=0 (tsc ×3); `pnpm test` root 65 files/2478 + web 33 files/1212 = 3690/3690; actionlint 1.7.12 container clean; strip-only import loop 48/48; digest re-derived VERBATIM `validation:v1:bf89434ed189207127f626b901c16c33641ba8f1fb0633aedad6ced77c377037` |

## Reusable lessons (this cycle, first-hand)

1. **Fold gate rejects honest-failed for outage-blocked verbatim commands.**
   The accepted completion route while the Actions disable persists is the
   supervisor-authorized local six-job mirror with the dispatch
   `full_command` recorded byte-exact and its digest re-derived verbatim.
   Full prevention rule + probe-first protocol:
   `docs/solutions/workflow-issues/full-tests-actions-disable-supervisor-authorized-local-mirror-2026-10-09.md`.
2. **Decision-first gates are discharged by reading production config, not by
   assuming.** rm-602 sat gated on "maybe the proxy already compresses"; one
   `gh api` read of the live Caddyfile (no `encode` directive) resolved it.
3. **Report-only runs derive zero changed surfaces.** With the tree restored
   pristine after implement, targeted_tests correctly derives scope `none`
   (`changed_testable_surfaces: []`) and validates via apply→battery→restore
   round-trips instead — record the digest both before and after to prove the
   tree returned byte-identical.

## Next-cycle candidates (ordered)

1. **Landing verification for this batch** — at the land event, flip
   rm-183/rm-602 `implemented pending landing` statuses per house wording
   rules, and run the **deferred verbatim CI validation**
   (`github_ci_validate.py`) at the first authorized push-gate turn after the
   Actions suspension lifts (probe: any run newer than 37872407109, or
   dispatch stops returning 422).
2. **Prioritize floor-walk deferred classes** stay live: CI-gated action
   re-pins, decision-gated absorb window (rm-252/253 due 2026-10-13),
   unlanded-claimed SSO/dashboard ids — re-walk the spool before selecting
   (memory #17599 discipline: grep every unlanded implement patch for
   content, hunk-level).
3. **Reconcile-by-content watch at integrate** — sibling unlanded lanes may
   carry convergent limiter/compression hunks (the fleet's high-value space
   is multi-claimed); fold by content, never rebuild.

## Artifact map

- Implement (authoritative cumulative patch, apply first):
  `delegate/implement-f2821fb57c34-fefe82be.patch`
- Compound increment (this phase, apply after implement):
  `delegate/compound-f2821fb57c34-613eaa63.patch`
- Staged composed ROADMAP copy:
  `delegate/roadmap-613eaa63-staged.md`
- Full-tests attempt evidence:
  `delegate/2645588d375d4847b89ebbacfab37fa2-scratch/` (verification-log.md,
  local-mirror.log + six per-job logs)
- Prioritize floor walk: `delegate/119de0db025e42b98db331e6eecd0a18-prioritize.md`
