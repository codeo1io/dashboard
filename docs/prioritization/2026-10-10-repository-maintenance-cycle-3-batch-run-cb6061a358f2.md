---
module: dashboard
tags: [operator-runtime, contract-window, developer-experience, dependency-ride]
problem_type: batch-record
---

# Batch record — gateway contract completion + onboarding truth
Run `cb6061a358f24c6d85936f0035d8d0f` (repository-maintenance cycle:3) · implement attempt
`0805faf12ea14279acdbdfad2c0c6e6c` · base 88e423a · 2026-10-10.

Selected by prioritize (no-double-claim sweep over all 17 unlanded implement lanes) —
decision doc `delegate/f1e8887b796c4533ae7a27438f6f1dc1-scratch/prioritize-decision.md`.

## U1 — Fro Bot agent pin (`.github/workflows/fro-bot.yaml`)
v0.117.5 (378bc287) → **v0.119.0 (2f020b40)**. The prioritize target was v0.118.3; while
implementing, upstream moved (v0.118.3 published 2026-10-09T22:57Z, superseded by v0.119.0 at
23:07Z the same day). Re-verified first-hand: `gh api repos/fro-bot/agent/git/ref/tags/v0.119.0`
→ 2f020b40 (commit tag), and `fro-bot.yaml` at upstream/main pins the same digest. Runtime-inert
(the workflow is `disabled_manually`; no `FRO_BOT_PAT` secret — see AGENTS.md).

## U1b (discovered, required by the pin) — contract window 1.9.0
Pinning v0.119.0 without widening `SUPPORTED_OPERATOR_CONTRACT_VERSIONS` would have the stream
fail closed on a 1.9.0 ready frame (window was 1.6.0+1.8.0). Upstream `version.ts` at v0.119.0
documents 1.9.0 as additive-only: `question` SSE frame + `waiting_for_question` status overlay.
Widened in both layers (`src/gateway/operator-contract/version.ts` primary unchanged, JS client
`SUPPORTED_CONTRACT_VERSIONS`), vendored `waiting_for_question` in every stream-status allowlist
(`run-responses.ts` + exported `OPERATOR_WEB_STATUSES`, `operator-sse-reader.ts` set + cast,
client `VALID_STATUSES` + status label, `operator-copy.ts` label). Summary-list allowlists
deliberately unchanged (upstream's run-summary projector excludes stream-only statuses).
Contract-window test flipped to pin the three-version window.

## U2 — checkout-detail display (rm-157's deferred display half)
Ground truth first (this changed the plan): at v0.119.0 the checkout provenance/preparation
fields ride the **status SSE frame projection** (`run-status.ts` 1.9.0), NOT the run-summary
list (the projector drops `details` by construction). The dashboard's server side already
parsed them (`operator-sse-reader.ts`); the display gap was the page. Delivered end-to-end:

- `public/operator-stream.js`: vendored allowlist validators (fail closed: malformed →
  label absent, run entry still valid; array CONTENTS never rendered — counts only),
  `checkoutLabel` on run entries (sticky like `reasonLabel`, provenance wins when both
  present), safe-view passthrough, render into the `data-role="run-checkout"` target.
- `public/operator-run-index.js`: hidden `run-checkout` line in the run card (beside the
  failure-reason line it can coexist with).
- `web/src/operator/runtime.ts`: discovers the card target and passes it to the stream.
- `web/src/index.css` + `public/operator-stream.d.ts`: styling + types.
- 22 new `operator-stream-core` tests: label shapes (attached/detached, dirty counts,
  conflicted-only-when-nonzero, operation-in-progress, unavailable, refusal/failure with
  count-derived detail), content-leak guard, precedence, 10 malformed-fail-closed cases,
  stickiness, safe-view presence/absence.

## U3 — dev-server recipe env contract (rm-862)
Boot warning when `DASHBOARD_DEV_AUTOLOGIN` is requested without `DASHBOARD_OPERATOR_LOGIN`
(the silent-401 wedge: deny-all precedes the autologin mint — assess F2, both arms reproduced
live); recipe env table + `NODE_ENV=development` in the documented command; README row notes
the prerequisite. Pinned by new `dashboard.test.ts` describe (warning fires; no warning when
login set; autologin refusal unaffected).

## U4 — @playwright/test ride
`^1.63.0` → `^1.64.0` (root `package.json` + `pnpm-lock.yaml`, rider-scoped lockfile movement).
The other four ride-list patches are built unlanded by sibling lanes (493bbbf2 / b0ad7444 /
ba5f6d7ddd67) — reconcile-by-content at integrate, do not rebuild.

## Ledger (this patch rides ext#39 already applied)
Riders: rm-157 (pin + window + display half delivered), rm-102 (re-probe datum + manual ride),
rm-862 status → implemented 2026-10-10 pending landing.

## Focused verification (this phase; full battery reserved for the full_tests gate)
`operator-contract-window` + `operator-stream-core` + `operator-run-index-core` +
`dashboard.test` = **618/618**; web operator suites (`--config web/vitest.config.ts operator`)
= **353/353**; roadmap guards 9/9; census 250/0/863 healthy; `pnpm check-types` rc=0 (server +
web + .opencode); `pnpm lint` rc=0; `node --check` on both touched public modules.
