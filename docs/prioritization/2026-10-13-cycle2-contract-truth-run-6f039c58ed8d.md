# Cycle 2 batch — contract truth at the live split (run 6f039c58ed8d)

Date: 2026-10-13 · Phase: implement (attempt 810a539074ac4e918219844677ccf36a) ·
Base: worktree 6ec2328 reconciled to origin/main 6acea88 (40 files adopted in place; adoption
semantics per the landing-pipeline traps — see `git status` census below).

## Problem

PR #612 (d42b978) advanced `.github/workflows/fro-bot.yaml:347` to
`fro-bot/agent@50b5dd41297f8a928914006b8f8c872c4ab3bb14 # v0.121.0` while both contract
readers stayed at `'1.9.0'` (`src/gateway/operator-contract/version.ts:15`,
`public/operator-stream.js:33`). v0.121.0's gateway speaks OPERATOR_CONTRACT_VERSION
`'1.10.0'` — the repo parses 1.9.0. Nothing tied the three legs together, so the split landed
green (Actions has been dark since 2026-10-09T01:59:31Z, so no CI could catch it either).

## Changes

### rm-987 substance — adopt contract 1.10.0 (semantic port of the v0.119.1→v0.121.0 delta, fork style)

Vendored `src/gateway/operator-contract/` (upstream deltas are additive; ported byte-faithful
where the fork carries the code, adapted where the fork trims):

- `version.ts` — literal `'1.9.0'` → `'1.10.0'`. Upstream's changelog block is deliberately
  NOT ported: the fork's conformance test enforces "no version literal in any vendored comment"
  (single-source guarantee; the changelog lives upstream).
- `responses.ts` — `OperatorSessionInfo.push?: OperatorPushHealth`; new
  `OPERATOR_PUSH_HEALTH_STATUSES` tuple (`ready | degraded | unknown`), `OperatorPushHealthStatus`,
  `OperatorPushHealth` (coarse, observed-only semantics per the v0.121.0 operator wiki);
  new `OPERATOR_PUSH_TRIGGER_KINDS` tuple (`approval | question | run_failed`) +
  `OperatorPushTriggerKind` (the wire `data.type` set).
- `index.ts` — re-exports for all of the above (types + the two tuples).
- `parse.ts` — `hasValidOperatorPushHealthShape` (closed-set status check);
  `hasValidOperatorSessionInfoShape` narrowed to `Omit<OperatorSessionInfo, 'push'> &
  {readonly push?: unknown}`; `parseOperatorSessionInfo` now RECONSTRUCTS the value and drops a
  malformed optional `push` instead of rejecting the session (field-policy doc updated to match).
- `output.ts` — doc-only delta-note (delta-arrival blank-line semantics), ported.

Browser client: `public/operator-stream.js:33` `PINNED_CONTRACT_VERSION` → `'1.10.0'`
(fail-closed ready-frame compare at the `verifyContractVersion` seam unchanged — the two sides
now agree again).

### rm-1015 — contract-pin triad guard test (NEW)

`test/operator-contract-pin-triad.test.ts`: offline vitest tying the three legs —
vendored `OPERATOR_CONTRACT_VERSION` == browser `PINNED_CONTRACT_VERSION` == the published
contract of the release pinned at `fro-bot.yaml` (parsed live from the workflow text), via the
probed fixture map `v0.119.1→1.9.0, v0.120.0→1.10.0, v0.121.0→1.10.0`. An unknown pinned tag
fails with the re-derivation recipe (`gh api …/operator-contract/version.ts?ref=<tag>`), never
a guess.

**Red-path proof** (script `/tmp/impl-810a5390/redpath.sh`, logs `/tmp/impl-810a5390/redpath.*.log`,
run 2026-10-13): baseline rc=0; flipping leg 1 (version.ts) rc=1; leg 2
(operator-stream.js PINNED) rc=1; leg 3 (fro-bot.yaml tag → v0.119.1) rc=1; post-restore rc=0.
Each single-leg flip fails the suite — a half-landed adoption is unmergeable-green no longer.

### Reconcile prerequisites (red-gate repairs, verified still-red at the reconciled base)

- `web/src/index.css:792` — stray dangling `[data-role="run-output-coalesced"] {` opener removed
  (invisible to check-types/lint; fixed on objective grounds — it was making the rule below it
  a dead selector block).
- `web/src/operator/runtime.ts:378` — `gapEl` added to the `discoverCardStreamTargets`
  destructure (was used at :392, never destructured → TS18004 `Cannot find name 'gapEl'`).
- `public/operator-stream.js` — `APPROVAL_FETCH_TIMEOUT_MS` + its rm-594 doc block hoisted
  above `buildApprovalClient` (was defined at :2160, first used at :2015 → 4×
  `no-use-before-define`).

### Riding coverage

`test/operator-contract-conformance.test.ts` — three new `parseOperatorSessionInfo` cases:
valid `push` preserved; malformed `push` dropped (session still ok); push-less session stays
push-less (`'push' in data` false).

## Roadmap carrier

`ROADMAP.md` — the b6cf1eb6 carrier applied semantically over the reconciled ledger:
rm-1015 item + riders on rm-100/rm-157/rm-271 + census comment (229→236 defs, max rm-1015).
Applied by `/tmp/apply-carrier-810a5390.py`; ledger render re-synced per the render-daemon rule.

## Rider NOT applied (decision)

rm-970 clonedeps refresh (`.slim/clonedeps.json` v0.78.0 → v0.121.0): the stewardship decision
rule was "unclaimed at implement time" — first-hand re-probe found lane run-e2fab01c2e44 now
holds an uncommitted claim on that file. Skipped; the rider re-binds to whoever lands first.

## Verification

Focused battery (implement-phase budget; full sweep reserved for the validation gate),
TMPDIR=/tmp, node v24.21.0, pnpm 11.28.5:

- `pnpm install --frozen-lockfile` rc=0
- `pnpm check-types` rc=0 (3 legs)
- `pnpm lint` rc=0
- `vitest run` focused: pin-triad 3/3 · conformance 160/160 (incl. 3 new) ·
  fixture-harness + sse-reader + stream-core + client 1531/1531 total at the six-file run
- `vitest run test/operator-contract-conformance.test.ts test/roadmap-length-guard.test.ts
  test/fork-exclusion-guard.test.ts` 181/181
- web leg: `vitest run --config web/vitest.config.ts src/operator/runtime.test.ts
  src/operator/stream-reattach.test.ts` 62/62

## Follow-ups surfaced (not this batch)

- `web/src/push/sw-notification.ts:16` hand-duplicates the trigger-kind set
  (`'approval' | 'run_failed' | 'question'`) — now that `OPERATOR_PUSH_TRIGGER_KINDS` is the
  canonical export, a single-sourcing pass belongs with the push-health UI work (rm-985 lane).
- The vendored `responses.ts` still omits the 1.9.0-era push-subscribe DTOs (subscription
  request/response shapes); harmless while the dashboard's push surface is fork-local, but the
  next contract bump should port them to keep the vendored surface honest.
