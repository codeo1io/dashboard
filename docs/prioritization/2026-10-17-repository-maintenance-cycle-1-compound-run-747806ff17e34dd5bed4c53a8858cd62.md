---
module: roadmap
tags: ['repository-maintenance', 'cycle-1', 'compound', 'ci-dark', 'lint-baseline', 'dead-attempt-adoption']
problem_type: workflow-issue
owner: dashboard
run_id: 747806ff17e34dd5bed4c53a8858cd62
---

# Cycle-1 compound record — run 747806ff17e34dd5bed4c53a8858cd62

Repository-maintenance `41d299b0355a4434ae4bc4b4da8a2d91:cycle:1` at base
3e3664c (== origin/main at dispatch; porcelain clean). This record compounds
the cycle's pre-review evidence into durable context for the next cycle;
review/shipping outcomes are out of scope here by design. No validation was
re-executed for this record — it consumes the targeted/full records below.

Fold-time census (review-corrected 2026-10-17): the batch delta is 9 entries
— 6 modified (package.json, pnpm-lock.yaml, ROADMAP.md,
tests/visual/__screenshots__/dashboard.spec.ts-snapshots/dashboard-operator-dark-chromium-linux.png,
web/privacy.html, web/src/privacy/claims.ts) + 3 untracked
(docs/runbooks/local-gates.md, scripts/lint-baseline.ts, this file). The
visual baseline is a TRACKED modification; no `tests/operator-dark.png`
exists.

## Phase ledger

| phase | attempt | durable outcome |
| --- | --- | --- |
| assess | 5e61c084 | 8 live-verified findings at 3e3664c; gates cold: CT green, test 59f/3068t + 34f/1213t, lint RED 50 stable, audit clean |
| research | 1d9619d6 | upstream grew DURING the run to 3dd78ee (24 commits, releases .26–.40); #639 port candidate + #640 SW-gated; contract 1.11.0 verified from gateway source; majors/pins/digest live-probed |
| roadmap | c57cc967 | spool-side extension minting rm-1453..rm-1455 + 9 dated riders; census 237→240/0 dups; eslint parity 50=50 |
| prioritize | 8322b270 | batch 'truth under dark CI' (rm-1454 + rm-1455 + ledger ride); full deferral map vs in-flight sibling families |
| stewardship | ab81a167 | structured stewardship_request, 3 change units, 4 must_remain_separate pairs |
| implement | 14c5880b→d520e935 | batch applied (8 tree entries); KTD13 attestation fix adopted the dead-attempt tree byte-identically |
| targeted_tests | 4cd7c97e | scope targeted; derivation proofs (impacted-tests fell back to full; shared build/test); local sentinels green; digest dcff330c re-derived |
| full_tests | 16b62a11 (adopting 574c2dc8) | PASSED scope full via PR #793 all-green (11 checks) under revived Actions; dead-attempt cures adopted: rm-100 lint debt 50→0 with baseline re-frozen, @playwright/test exact-pin 1.63.0 (superseded at review-fix 2026-10-17 — aligned to main's rm-142 triple: exact 1.64.0 + lock byte-identical to main; local visual suite 3/3 green under 1.64.0/chromium-1248), operator-dark baseline regen md5 e397a053/316204B |

## Cycle learnings (prevention rules)

1. **Dead-attempt adoption protocol (twice-proven this run).** A reaped
   attempt can leave its full work product in the tree. Before redoing a
   phase: read the event log under `.hermes/conductor-delegate-spool/events/`
   (reap time vs progress events), check for the typed PhaseResult JSON, and
   if absent, compare the tree delta against any recorded diff byte-for-byte
   (strip `diff --git` headers before comparing). Adopt only with a digest
   proof: re-run `validation_digest('<base>', '.')` from the engine release
   source and show it matches pre- and post-adoption. Redoing instead of
   adopting burns hours and can silently fork the batch.
2. **Lint-baseline pairing invariant.** `FROZEN_LINT_ERRORS` in
   `scripts/lint-baseline.ts`, the count quoted in
   `docs/runbooks/local-gates.md`, and the actual ROADMAP lint state MUST move
   in one change. This band carries baseline=0 + a lint-clean ROADMAP;
   sibling unlanded bands may still assume 50. Any landing that re-dirts
   ROADMAP without re-freezing breaks the gates step loudly — that is by
   design, fix the pairing, not the gate.
3. **Playwright pin discipline.** `@playwright/test` must be EXACT-PINNED to
   whatever npm version main's pinned visual image ships (since the
   2026-10-17 review fix: 1.64.0 in package.json AND pnpm-lock, matching
   main's rm-142 triple — image v1.64.0-noble@06a9939e + npm 1.64.0 +
   test/visual-playwright-image-lockstep.test.ts; the earlier 1.63.0 exact
   pin matched the pre-rm-142 image and is superseded — a 1.63.0 npm pin
   under the 1.64.0 image cannot launch browsers). A caret re-introduces
   float that desyncs snapshot rendering and kills the visual lane.
   The operator-dark baseline is arbitration bytes md5
   `e397a0539cf3fc84cd5129a5675d766a` (316204B); sibling bands reproducing
   the same bytes make landing collisions a no-op. Regen only inside the
   digest-pinned image (two `--update-snapshots` rounds byte-identical, then
   a no-flag round 3/3).
4. **Never ride a dark window; detect revival two-sided.** The suspension
   (2026-10-09 → 2026-10-16) was repo-scoped and invisible to the
   permissions API; the only reliable probes are "newest run repo-wide" AND
   a manual dispatch. Sequencing after revival: fill branch protection only
   once checks can start, then sweep the stranded `ci-*` PRs — recorded in
   `docs/runbooks/local-gates.md`.
5. **Emission-time digest rule is load-bearing.** Fix/test-bearing phases
   must re-run the validation command after touching executable surfaces and
   declare the CURRENT digest; the fold gate re-derives and rejects stale
   declarations. KTD13: changed-surfaces attestation must name every
   executable surface the tree delta holds.

## Status decisions recorded in ROADMAP (this phase)

- `rm-1454` → implemented (gates script + runbook + baseline 0 ride the batch;
  PR #793 all-green).
- `rm-1455` → implemented (claims.ts byte-parity with upstream 3dd78ee;
  privacy.html prose + footer; 25/25 claims suites).
- `rm-1453` stays candidate — fold-map collision with the sibling band that
  selected the #639 port first; fork evidence lines unchanged.
- `rm-177` / `rm-178` stay in_progress BY DESIGN: full-suite green does not
  satisfy their live-query canary / manual-dispatch parity clauses; both are
  now runnable again post-revival and are the cheapest completions left.

## Next-cycle candidates (evidence already banked)

1. rm-178 parity dispatch + rm-177 canary — one remote round each, now
   possible; flip both ledger rows on green.
2. rm-1453 (#639 ordering port) — first-landed-wins vs the sibling band; the
   research artifact carries the diff decomposition.
3. Contract 1.11.0 absorb (waiting statuses; cures the silently-vanishing
   waiting runs) — gateway ≥v0.122.2 deployment probe first.
4. Upstream ports: #631 push-subscription list read and #636 approval-click containment port.
5. Dockerfile base digest re-pin (173f1258 → 7f486cab, live-verified) +
   agent v0.122.3 + codeql 6f2ac81 pin riders.
6. Push-surface decision (rm-249/rm-138): kill-switch SW leaves
   `sw-notification.ts` unreachable — either flag-off permanently with a
   guard test or restore the handler deliberately.
7. Time-gated: Node 26 LTS window (2026-10-28), npm majors (TS 7, vitest 5,
   jsdom 30; vite-plugin-pwa 2 only with the SW decision).
