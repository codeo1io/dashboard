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
| 0 | rm-252 rider | absorb of release 2026.10.24 executed — window re-probed FIRST and WIDENED to 4 commits (`cf4c9a7` #615 push fix, `f12fde0` #616 pin → v0.122.1, `2c25f9b` #604 question fixture (test(operator): add a question fixture with no approval prompt; 7 files +92/−6), `44ff0fd` #618 @opencode-ai/plugin v1.19.0 chore (2 files)); all four `cherry-pick -n`; 6 of 7 #615 files applied byte-identical; only `sw.ts` conflicted → recorded SEVERANCE (below); CI agent pin now v0.122.1; the only lockfile movement is the #618 plugin+sdk 1.18.35→1.19.0 bump (`@vitest/expect` unchanged at 4.1.11 — the previously recorded devDep hand-merge never existed); 17 files +406/−128; provenance corrected 2026-10-16 review_fix 5a299bc6 |
| 1 | rm-1408 | seven-status sets in public parser + vendored server mirror + web `SUMMARY_STATUSES` mirror (d.ts union already carried both waiting statuses); keep-and-flag parse; kebab `statusClass` + `status-unknown` CSS; `Waiting for approval/question` labels; three-way parity test (public set === server set); operator-sse-reader verified already 8-status tolerant (no change owed) |
| 2 | rm-1409 | `walk()` prunes excluded dir names during recursion (26,140 → 481 traversed files, 54×); visited-with-children meta test pins no-leak + <2,000 bound; runtime 1.2s → 0.4s; original flake mode (parallel-load timeout) gone |
| 3 | rm-1412 | `APPROVAL_FETCH_TIMEOUT_MS` declared in `operator-stream.d.ts`; NEW `test/operator-stream-dts-parity.test.ts` guards the whole d.ts const surface against the js export surface |
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

## Cycle validation outcomes (compound record, 2026-10-16)

Pre-review validation of this batch is complete and recorded by the validation
phases; review and landing verify — they do not re-run suites.

- **Tree digest** (engine-derived over base 5530b5e):
  `validation:v1:9c8d98110e603f2e65df3ddc92dc932fbc16279817d8e4f76c6bf6204b499764`
  — 34 changed surfaces (33 tracked + the untracked local-mirror recipe doc,
  non-executable) / 5 executable-testable; re-derived identical before
  and after the full battery (KTD4 immutability proof; count corrected
  2026-10-16 review_fix 5a299bc6).
- **Targeted (targeted_tests 991ed344, 2026-10-14):** root 7 files / 1720
tests (engine-exact `_node_targets` selection + the operator-contract
conformance superset), web push/operator 4 files / 172 tests; `pnpm build:web`,
`pnpm check-types` (three tsc legs), `pnpm lint`, and the actionlint 1.7.12
container all green.
- **Full (full_tests 276f110b, 2026-10-16):** the remote CI route was
unrunnable — Actions hard-disabled for the repository (dispatch → 422 while
the permissions endpoint still reads enabled; run-creation freeze at day 7) —
so the suite was proven by a content-identical LOCAL mirror of all six
Main-workflow jobs: `pnpm test` root 59 files / 3067 tests + web 34 files /
1213 tests = **4280/4280 passed**, plus install, design check, check-types,
lint, scripts-load, and actionlint all green. Recipe and detection probe:
`docs/solutions/workflow-issues/actions-disabled-local-mirror-validation-2026-10-16.md`.
Durable evidence: campaign DB phase_results + spool results JSONs for attempts
991ed344 / 276f110b (the `/tmp` battery logs were swept by the time of this
record — cite the JSONs, not the logs).

## Lessons and prevention rules (this cycle)

- **Provider-reap epidemic — at least 11 attempts lost.** daa570ec
(prioritize), 0952cffa (targeted), 79c83c87 + d2590e26 + four more full_tests
attempts (34ba7b5c, the one full_tests failure that completed rather than
being reaped, is excluded from this count), 3598f524 (compound), 6b492ff9
(review), and b6ae5cc2 (review-fix) all died to provider/runtime reaps with no
typed artifact, and every one had to be redone from scratch — the original '6'
contradicted its own enumeration (count corrected 2026-10-16 review_fix
5a299bc6). Prevention: write the
typed phase-result artifact EARLY and re-write it as evidence accumulates —
the result channel is the only thing that survives a reap.
- **KTD13 attestation — 1 fold rejection.** The first implement fold was
rejected solely for a missing `validation_evidence.changed_surfaces`
attestation. Prevention: every implement-shaped fold declares exactly the
engine-derived changed-surface set — derive it with the engine's own
`validation_policy.changed_surfaces(base, worktree)` call and declare what it
returns (34 surfaces / 5 testable in this cycle).
- **CI-route discipline while Actions are disabled.** Never open the
ephemeral-PR CI-validation route without the two-sided dispatchability probe
(11m20s of zero check-runs on PR #728 plus hand-cleaned remote debris was the
cost of skipping it); see the recipe doc.

## Ready candidates for the next cycle (context)

1. **rm-1411** — out-of-band Actions watchdog; urgency escalated by the hard
disable (see its 2026-10-16 rider).
2. **rm-1414** — ledger re-truth; start from the landing-time census; the
spec baseline for its integrity-guard clause is recorded in its rider.
3. **rm-1413** — bounded ahead_by drift compares for the scheduled sentinels.
4. **rm-252 window** — closed as of this absorb (0 unabsorbed commits);
re-measure when upstream moves. The standing deployment-ordering risk is
unchanged: deployed gateway v0.119.2 speaks contract 1.9.0 while the CI agent
pin v0.122.1 speaks 1.11.0 (agent #1825 same-window deployment requirement).
5. **rm-116 / dependency majors / node v26 / SW revival** — unchanged from
the out-of-scope list above.
