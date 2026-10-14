---
module: roadmap
tags: ['repository-maintenance', 'cycle-3', 'batch', 'operator-contract', 'absorb', 'push']
problem_type: workflow-issue
owner: dashboard
run_id: fcfde1ea38da4097be8b1a364594fcc1
---

# Cycle-3 implement batch — run fcfde1ea38da4097be8b1a364594fcc1

Repository-maintenance `54966db5d5254031806372d44822cf73:cycle:3` at base
5530b5e (== origin/main, re-verified at dispatch). Batch selected by the
prioritize phase (`delegate/prioritize-batch-fcfde1ea-734e7d04.md`):
**operator-contract truth, end to end**. All legs implemented in the steward
worktree; nothing committed (landing is a later phase by design).

## Design decisions recorded BEFORE implementation (rm-1408 clause)

- **Pre-landed forward tolerance, not a pin bump.** `PINNED_CONTRACT_VERSION`
  stays `1.9.0` in both `public/operator-stream.js` and
  `src/gateway/operator-contract/version.ts`: the deployed gateway
  (infra `upstream.json`) is v0.119.2 = 1.9.0, and bumping the pin before the
  gateway moves would flip the client fail-closed. Tolerance is additive sets +
  keep-and-flag parsing, safe on 1.9.0 traffic (waiting statuses simply do not
  arrive) and correct on 1.10.0/1.11.0 traffic when it does.
- **Keep-and-flag, never drop.** `parseRunSummaryItem` previously returned
  `success:false` for any status outside the 5-set — on a 1.11.0 gateway that
  silently vanishes every waiting run from the restored index. Unknown statuses
  now parse (`statusFlagged: true`), render with `statusClass: 'unknown'`
  (dashed warning chip), and never write the raw string into a `className`.
- **CSS vocabulary follows the stream** (kebab-case
  `status-waiting-for-approval`), so the index renderer and the stream renderer
  share one style surface; `status-unknown` is new, the two waiting styles were
  already present but unreachable from the index.

## Legs

| leg | item | outcome |
| --- | --- | --- |
| 0 | rm-252 rider | absorb of release 2026.10.24 executed — window re-probed FIRST and WIDENED to 4 commits (`cf4c9a7` #615 push fix, `f12fde0` #616 pin → v0.122.1, `2c25f9b` question feature + fixtures, `44ff0fd` 1.11.0-question test pins); all four `cherry-pick -n`; 6 of 7 #615 files applied byte-identical; only `sw.ts` conflicted → recorded SEVERANCE (below); CI agent pin now v0.122.1; `@vitest/expect` devDep hand-merged into `pnpm-lock.yaml` via `pnpm install`; 17 files +406/−128 |
| 1 | rm-1408 | seven-status sets in public parser + vendored server mirror + web `SUMMARY_STATUSES` mirror (d.ts union already carried both waiting statuses); keep-and-flag parse; kebab `statusClass` + `status-unknown` CSS; `Waiting for approval/question` labels; three-way parity test (public set === server set); operator-sse-reader verified already 8-status tolerant (no change owed) |
| 2 | rm-1409 | `walk()` prunes excluded dir names during recursion (26,140 → 481 traversed files, 54×); visited-with-children meta test pins no-leak + <2,000 bound; runtime 1.2s → 0.4s; original flake mode (parallel-load timeout) gone |
| 3 | rm-1412 | `APPROVAL_FETCH_TIMEOUT_MS` declared in `operator-stream.d.ts`; NEW `test/operator-stream-js-dts-parity.test.ts` guards the whole d.ts const surface against the js export surface |
| 4 | rm-1410 | clonedeps both entries → v0.122.1 + mirror re-cloned at the tag (gitignored); AGENTS.md mirror claim + disabled_manually claim re-truthed (live state: active-but-inert via HAS_FRO_BOT_PAT gate, zero secrets); fro-bot.yaml stale comment re-truthed |

## sw.ts severance record (the one absorb conflict)

Upstream's #615 `sw.ts` delta is **comment-only** — its push/notificationclick
handlers predate #615 and are wired to a *registered* SW. This fork's `sw.ts`
is a deliberate kill-switch (purge caches, unregister, reload) with no
registration anywhere (`grep '.register('` web/ = 0). Porting the handlers
would resurrect a persistent SW against the rm-249/rm-272 lineage. Resolution:
keep the kill switch; record the severance + port-later rule in the file
header — when registration is revived, port the handlers from upstream's
post-#615 sw.ts WITHOUT `precacheAndRoute`/`NavigationRoute` (never intercept
navigations). The #615 *fix* itself is registration-independent and lands
fully in `web/src/push/sw-notification.ts` (+ upstream's +317-line parity test).

## Provenance (rm-1410 clause)

Re-derived directly rather than transplanted: the unlanded rm-970 lineage
batch (run-e2fab01c) was inspected, but its file shapes no longer match HEAD
(post-absorb `fro-bot.yaml` pins v0.122.1; AGENTS.md drifted). Outcomes match
its intent (pin-truth + mirror + runbook-class state notes).

## Verification (focused budget)

- `npx vitest run test/operator-run-index-core.test.js` — 198/198
- `npx vitest run` operator/conformance/copy/fixture-harness/responses/stream/property — 1264 passed, 0 failed
- web leg (push/operator/Notifications): 119/119
- prose-residue guard: green solo AND no longer timeout-prone (pruning)
- `pnpm check-types`, `pnpm lint` — green (run at gate below)
- Full repository-wide validation (COLD test ×2, actionlint, build) is
  reserved for the full_tests/merge gate per the phase budget.

## Out of scope (this batch)

rm-1411 (out-of-band watchdog), rm-1413 (bounded drift compares), rm-1414
(ledger re-truth beyond this cycle's flips), rm-116 (protection fill — blocked
while Actions are dark), dependency majors, node v26 triad, SW registration
revival.
