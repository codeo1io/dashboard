---
module: dashboard
tags: [repository-maintenance, cycle-2, batch, rm-842, rm-843, rm-180]
problem_type: maintenance-batch
---

# Repository-maintenance cycle 2 — batch record (2026-10-10, run 08a0abac9453)

Batch `operator-contract 1.8.0 display completion + supply-chain hardening`, implemented at
base `88e423a` (== origin/main, re-verified at assess open and close).

## Inputs

- assess `0b1bd864` (5 findings; F3 actions-permissions, F-low port grammar; gates green at 88e423a)
- research `a2cbb8e9` (7 candidate classes; contract 1.8.0 display half verified absent first-hand)
- roadmap ext #37 `a2555fa7` (mints rm-842/rm-843, census 249/0/843, guard pin 780 → 843)
- prioritize `51f05853` (this selection; collision diligence in the decision record)
- stewardship `ec9be9d5` (file:line surfaces pinned on a clean tree)

## What landed

- **U1 `rm-842`** (operator-experience, LEAD) — contract 1.8.0 browser DISPLAY half:
  `checkoutProvenance`/`checkoutPreparation` parsed field-by-field in
  `public/operator-stream.js` (fail-open: a malformed nested field drops that field only,
  never the status frame; every free-form string stripped of control/bidi chars and capped
  at 256; lists bounded at 10 entries with an overflow count; SHAs validated 40-hex;
  timestamps validated but not carried) into closed DTOs typed in
  `public/operator-stream.d.ts`, reduced in `nextStreamState` (latest-valid-wins per field;
  provenance/preparation mutually exclusive in browser state), and rendered
  **textContent-only** in a new hidden `run-checkout-detail` region on the expanded run card
  — placed after the status/reason line and before output, in all three card shapes
  (`renderRunCard`, the optimistic launch card, `ensureRunCardAnatomy` adoption), wired
  through `web/src/operator/runtime.ts` `discoverCardStreamTargets` and styled in
  `web/src/index.css`. The `reasonEl` headline covers a preparation-only failure (and the
  `checkout-substituted` failure-kind label suppresses duplicate reason copy). Failure kinds
  `checkout-substituted` and `workspace-unavailable` surface per upstream a82871d plan R7.
  Fixture harness grows 24 checkout scenarios (5 provenance, 14 refused, 3 failed-update
  variants, workspace-unavailable, malformed-preparation) in
  `src/gateway/operator-fixture-sse.ts`, each with a recent-runs row bound to its own stream
  (`src/routes/operator-fixture-harness.ts`); the vendored
  `src/gateway/operator-contract/provenance.ts` vocabularies are pinned against the browser
  label maps by `test/operator-contract-conformance.test.ts` (label maps ARE the
  allowlists; parity with upstream shapes asserted; production-artifact no-leak guards).
  The version-window parity test (`test/operator-contract-window.test.ts`,
  `PINNED_CONTRACT_VERSION === OPERATOR_CONTRACT_VERSION`, window exactly
  `['1.6.0','1.8.0']`, no stray literals) predates this batch (89c7398) and stays green at
  the landed diff.
- **U2 `rm-843`** (security) — actions-permissions hardening, live settings (zero repo-file
  footprint beyond this doc and the ledger rider). PUT
  `/repos/codeo1io/dashboard/actions/permissions` with `allowed_actions: 'selected'`,
  pattern allowlist, `sha_pinning_required: true` (HTTP 204). Post-change readback, verbatim:

  ```bash
  gh api /repos/codeo1io/dashboard/actions/permissions
  {"enabled":true,"allowed_actions":"selected","selected_actions_url":"https://api.github.com/repositories/1329402046/actions/permissions/selected-actions","sha_pinning_required":true}
  gh api /repos/codeo1io/dashboard/actions/permissions/selected-actions
  {"github_owned_allowed":true,"patterns_allowed":["actions/*","github/*","docker/*","pnpm/*","ossf/*","aquasecurity/*","fro-bot/*"],"verified_allowed":false}
  ```

  Idempotency proven by re-issuing the identical PUT (204 again, readback byte-identical).
  Pre-change census (first-hand this batch): the only namespaces referenced by
  `.github/workflows/**` + `.github/actions/**` are `actions/`, `github/`, `docker/`,
  `pnpm/`, `ossf/`, `aquasecurity/`, `fro-bot/` and local `./` composites (always allowed
  under `selected`); all 16 external pins are full-length commit SHAs, so
  `sha_pinning_required` breaks nothing. Sibling rm-846 (same signal, 20cf2f7b lineage,
  unselected) folds per the fold map. The readback probe joins the cycle's standing probe
  set: a new-namespace workflow now requires a deliberate settings edit.
- **rm-180 rider-scope** (no def flip) — `readServerBindConfig` (`src/server.ts`) now parses
  `DASHBOARD_PORT` with the house whole-string `/^\d+$/` grammar (`Number.parseInt` after
  the regex) instead of bare `Number(rawPort)`, which accepted `'0x10'`/`'1e2'` spellings;
  fail-loud semantics preserved (valid inputs unchanged, README env table unchanged);
  pinned by a new `server.test.ts` case (`'0x10'`, `'1e2'`, `'12.5'`, `'+80'` → throw).

## Implement verification (focused battery, per phase budget)

- `pnpm build:web` rc=0 (vite 8.3.3, precache 3 entries)
- impacted server suites: `operator-stream-core`, `operator-sse-reader`,
  `operator-run-index-core`, `operator-launch-core`, `operator-contract-conformance`,
  `operator-contract-window`, `operator-fixture-harness`, `operator-fixture-sanitization`,
  `server`, `static-assets` — 10 files / **1481 tests passed**
- impacted web suites: `web/src/operator/runtime.test.ts` +
  `web/src/operator/launch-card.test.ts` (NEW) — 2 files / **54 tests passed**
- `pnpm check-types` rc=0; `pnpm lint` rc=0 (0 errors / 10 pre-existing warnings — the
  known baseline)
- ledger: census 249 defs / 0 dups / max rm-843 (staged); guard pin 843 green
- full-repo validation reserved for the full_tests gate per the phase budget

## Provenance note (attempt lineage)

The first implement attempt (`c1df55e7`) completed the code work and the U2 settings PUT but
died before writing its patch/result (0-byte spool patch; two engine repair turns failed on
the reaped session). This attempt verified that work first-hand against the acceptance
criteria above (full diff review + the whole focused battery re-run green) and completed the
phase: roadmap + selection layers applied, riders/flips recorded, cumulative spool patch
captured, tree restored pristine.

## Pre-review validation appendix (2026-10-10, compound f9a7ba3b)

Consumed from the typed phase records — nothing re-run at compound, per the
compound contract.

- **targeted_tests (attempt cda2b2fc**, redone from scratch after the 69f05d63
  transport-artifact reap): implement patch md5 re-verified
  af95b6890bd5a672529c3e913894553f over 24 paths; apply → run → reverse-apply
  round-trip left porcelain 0. 10 impacted server files / 1483 tests green;
  web pair runtime.test.ts + launch-card.test.ts 2 files / 54 tests green;
  check-types rc=0 (server + web + .opencode); install --frozen-lockfile rc=0
  after the swept-node_modules retry. Digest bookends identical across the
  round-trip and equal to the dispatch stamp at pristine 88e423a:
  `validation:v1:bf89434ed189207127f626b901c16c33641ba8f1fb0633aedad6ced77c377037`.
- **full_tests (attempt 03061b8d)** — supervisor-accepted fleet pattern under
  the still-live Actions run-creation enforcement outage:
  - prior-attempt forensics: 7ba07ea5 was a pure transport artifact (3
    lifecycle lines, zero work events, no typed result);
  - outage bracket: 422 dispatch probe ('Actions has been disabled for this
    repository'), zero runs created on or after 2026-10-10T00:00:00Z, newest
    run 37872407109 (2026-10-09T01:59:31Z) unchanged at both 07:23:03Z and
    07:29:52Z;
  - fleet burns adopted (verbatim full_command unrunnable): run 471d3910
    rc=1 after the full 3600s (timed out without registering any PR checks);
    run 159ec0eb same-day rc=1 at 2m27s ('error connecting to api.github.com');
  - content truth — six-job local content-identical Main-workflow mirror over
    the applied batch (07:23:44Z–07:28:18Z, node v24.15.0, pnpm 11.28.4):
    lint rc=0 at the pre-existing 10-warning baseline, design-check emitted
    the empty array, check-types rc=0, test rc=0 (server 65 files / 2717
    tests; web 34 files / 1216 tests), actionlint 0, scripts-load 48/48;
  - tree closed pristine (porcelain 0 at 88e423a); the dispatch digest
    re-derives verbatim.
- **post-recovery debt (recorded for later cycles):** re-run the verbatim
  GitHub-hosted gate once dispatch stops 422-ing (probe: newest run newer
  than 37872407109), then sweep stranded conductor/ci-* refs — both also
  gate rm-116's protection fill.

Statuses: rm-842 and rm-843 both `implemented 2026-10-10 … pending landing`;
landing verification owns the final flips.
