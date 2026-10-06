# Repository maintenance — cycle 2 run c026a644 (2026-10-08, compound context)

Phases: assess e76de32a · research e11fbb0e · roadmap 9a47bff0 (adopting the
infra-dead 6311d716 composition) · prioritize 5b6e7eaf · stewardship e19a0440 ·
implement f93be597 (adopting fold-rejected 2bf0b8b4's verified delta) ·
targeted_tests 2912ea97 (redoing infra-dead 9472b1eb's zero-work attempt) ·
full_tests 47d49d56 · compound 6c18f152. Status at compound: PRE-REVIEW —
review and shipping happen after compound; nothing of this run has landed.

## Selected batch (prioritize 5b6e7eaf) — outcome table

| Member | Why selected | Outcome at compound |
| --- | --- | --- |
| rm-708 release.yaml digest-readback SIGPIPE cure (P1 headliner) | 7/8 red release runs; early-exit awk SIGPIPEs `docker buildx imagetools inspect` under `bash -Eeuo pipefail` | implemented + validated pre-review: RED-proof fence (2 failed → 7/7), targeted 165/165, full battery ALL 11 checks on ephemeral PR #437; CONCURRENT CURE on main (f66e547 carries the END-block at :492/:535 from sibling run b2a3ae9b) — reconcile-by-content at integrate; live gate 0/2 (two green release runs) |
| rm-709 detailsUrl https-only at the failing-check boundary | assess F1: `javascript:` detailsUrl renders as a link | implemented + validated pre-review: aggregator boundary blanking + strict client parse + fixtures both layers; no sibling cure (surfaces byte-identical ac61ff3 ↔ f66e547) — owned solely by this candidate |
| rider: rm-166 guard third fence class | make the SIGPIPE class mechanically unrepeatable | repo-wide unguarded-early-exit detection over comment-stripped workflows + END-block pin + detector fixtures; rides the batch |

## Integrate obligations (compounded from the cycle's probes)

- Chronological union with main's landed records; this composition authored at
  base ac61ff3 while main is at f66e547 (ledger 233 defs / 0 dups / max rm-744;
  holds no rm-693/694/708/709, so the four mints append collision-free;
  post-union projection 237 defs / max rm-744).
- release.yaml: reconcile-by-content against main's landed END-block cure
  (:492/:535); the candidate's fence pins forms, not line numbers.
- Bump the integrity-guard pinned ceiling to the post-union in-file max
  atomically with the landing; this base predates the guard's own landing, so
  the pin is reconciled at integrate (precedent 14a81ea6 / 3ba1489).
- An integrate-authored same-date census comment supersedes the
  2026-10-08 claims in this file (newest-by-date / last-in-document-order).
- Riders landed at a9576e3d by run e9bc28f5 preserved verbatim; this run's
  riders at their anchors below the def evidence lines.
- Re-probe sibling worktrees for rm-7xx bands at integrate (34b02781 probed at
  compound: zero rm-7xx mints, max rm-692 — no live collision).

## Next-cycle candidates (from this run's ledger + first-hand main probe)

1. rm-708 acceptance tail — two consecutive green `release.yaml` runs past
   'Promote latest image tag' with 'Dispatch infra deploy' firing; the first
   post-landing release dispatch is the trigger. Until then the release
   pipeline is only provably cured at the form level, not end-to-end.
2. rm-252/rm-693 contract-1.8.0 absorb window — deployment-coupled deadline
   (operator-sse-reader rejects contractVersion != 1.6.0 the moment the
   deployed gateway passes v0.117.0); the delta is module-rework scale
   (provenance.ts NEW, approval decision-state machine, approval-frame
   rework); decide wire-or-fold (rm-253) BEFORE the port lands or the port is
   paid twice.
3. rm-694 upstream fro-bot/dashboard PR #570 optimistic launch-card hardening
   port — candidate since this run's research; re-probe the upstream PR state.
4. rm-139 Node 26 LTS go/no-go — 26.x LTS promotion is 2026-10-28; the
   decision lands inside the promotion week next cycle; node:26-alpine tag
   already resolves.
5. rm-116 branch protection fill — still a shell (no required checks, no admin
   enforcement) at the last probe; now that the fleet's Main/CodeQL stacks are
   green on ephemeral PRs, filling required checks is low-risk.

## Process context for the next cycle

- Full validation for this repo routes to the ephemeral-PR cloud path (public
  repo, ADMIN); PR #437 this cycle, #383 cycle 3 — both all-green, auto-closed,
  refs deleted. Transient poll failures: rerun the command verbatim.
- node_modules is swept between phases; `pnpm install --frozen-lockfile` (~7 s)
  before any local suite run.
- Dead-attempt forensics recipe and the concurrent-cure class are compounded in
  `docs/solutions/workflow-issues/maintenance-cycle-learnings-2026-10-08-concurrent-sibling-cure-and-validation-routing.md`.
