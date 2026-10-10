---
title: Operator-contract browser display twins must land with the window bump
date: 2026-10-10
category: best-practices
module: dashboard
problem_type: prevention-rule
component: operator-contract
severity: medium
applies_when:
  - Extending the gateway operator contract with new frame fields or failure kinds
  - Adding or changing entries in the supported contract version window
  - Rebasing or absorbing upstream operator-contract work (e.g. the 1.9.0 lane)
  - Reviewing a batch that touches public/operator-stream.js or its .d.ts twin
symptoms:
  - New contract fields parse on the server but never render anywhere
  - PINNED_CONTRACT_VERSION and OPERATOR_CONTRACT_VERSION agree yet the operator
    UI shows nothing new
  - Upstream plan steps R5-R8 (browser validation + display) exist but no fork
    surface consumes the new fields
---

# Operator-contract browser display twins must land with the window bump

## Problem

The gateway operator contract is consumed in three hand-maintained places that no
build step keeps in sync: the vendored server-side vocabulary
(`src/gateway/operator-contract/*.ts`), the hand-written browser twins
(`public/operator-stream.js` + `public/operator-stream.d.ts`, mirrored label maps
in `public/operator-run-index.js` and `public/operator-launch.js`), and the React
runtime (`web/src/operator/*`).

On 2026-10-08 the fork landed the 1.8.0 half-measure (`89c7398`): the version
window grew to include 1.8.0 and failure-kind labels were rendered — but the
provenance/preparation fields that upstream's `a82871d` plan (R5-R8) specified were
never parsed into the browser state nor rendered. The gateway dutifully streamed
them; `public/operator-stream.js` dropped them; nothing anywhere errored. Two days
of operator-visible checkout provenance were silently missing until `rm-842`
(run 08a0abac9453, 2026-10-10) landed the display half.

## Why it stays silent

- Contract parsing is fail-open by design: unknown frame fields are skipped, not
  rejected, so a missing consumer raises no signal at any layer.
- The window parity test (`test/operator-contract-window.test.ts`) pins
  `PINNED_CONTRACT_VERSION === OPERATOR_CONTRACT_VERSION` and window membership —
  it stays green when both sides agree on the version string while the display
  half is absent.
- `grep -rn 'provenance|preparation' web/src public/operator-stream.js` returning
  zero consumption sites was the only cheap tell (found by the cycle-2 research
  phase).

## The rule

An operator-contract extension is ONE batch across all six surfaces — landing any
subset silently degrades the others:

1. Vendored vocabulary/types under `src/gateway/operator-contract/`.
2. Public parser + closed DTO: `public/operator-stream.js` frame parsing plus
   `public/operator-stream.d.ts` declarations with sanitization rules
   (control/bidi-stripped and capped free-form strings, bounded lists, 40-hex
   SHA validation).
3. All three card shapes: `public/operator-run-index.js` `renderRunCard` +
   `ensureRunCardAnatomy`, and `public/operator-launch.js` optimistic card.
4. Label maps in `public/operator-run-index.js` and `public/operator-launch.js` —
   these ARE the allowlists for what may render.
5. Tests: extend `test/operator-contract-conformance.test.ts` (label-map pins
   against the vendored vocabularies + production-artifact no-leak guards) and the
   window/parity suites in the same batch.
6. Fixture scenarios in `src/gateway/operator-fixture-sse.ts` bound to recent-runs
   rows via `src/routes/operator-fixture-harness.ts` — this is how a
   gateway-gated feature gets acceptance without a deployed gateway (24 checkout
   scenarios for the 1.8.0 fields).

## Enforcement already in tree

`test/operator-contract-conformance.test.ts` pins the browser label maps against
the vendored vocabularies, so a new failure kind or field that skips the label map
(or the vendored vocabulary) reds the suite instead of shipping silent. Any future
extension must extend the conformance pins in the same batch or it fails CI by
design.

## Rendering safety (carried from the 1.8.0 work)

The checkout-detail region renders untrusted gateway strings textContent-only —
control/bidi characters stripped, 256-char cap, lists bounded, SHAs validated
40-hex before display. Keep that shape for every new field family.

## References

- `rm-842` and its riders in `ROADMAP.md` (implement + validation riders,
  2026-10-10).
- Cycle record:
  `docs/prioritization/2026-10-10-repository-maintenance-cycle-2-compound-run-08a0abac9453.md`.
- Upstream plan: `fro-bot/dashboard` `a82871d`, `docs/plans/2026-10-06-001`
  (provenance/preparation fields, failure kinds, R5-R8).
- Fork half-measure: `89c7398` (2026-10-08, window + labels only).
