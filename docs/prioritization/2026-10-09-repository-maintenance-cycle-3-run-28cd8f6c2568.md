# Repository maintenance — cycle 3 run 28cd8f6c2568 (2026-10-09, compound context)

Phases: assess c5196420 (redo of reaped 4bf00daa) · research fd78929b ·
roadmap 032a73d1 · prioritize 381e3a7e (this doc). Status: implement and
later phases follow; nothing of this run has landed. Authored at base
88e423a == origin/main with the roadmap phase's uncommitted ledger extension
(rm-832 mint + 7 riders + guard pin 780 → 832) in-tree.

## Selected batch (prioritize 381e3a7e) — operator contract 1.8.0 consumer completion

**Theme:** finish the 1.8.0 operator-contract adoption where it is actually
live — the browser operator surface. The server half is already landed
(verified first-hand this session): `src/gateway/operator-contract/version.ts`
carries the SUPPORTED-VERSIONS window `['1.6.0','1.7.0','1.8.0']` (rm-157,
implemented 2026-10-08 run 9289efaac79f), `provenance.ts` (469 lines) +
`run-status.ts` + `operator-sse-reader.ts` parse checkout fields, and three
1.8.0 fixture files were BELIEVED to exist
(`test/sse/parser-evidence/accept-contract-1-8-0-*.json`) — CORRECTED by review
3b6cf864: no such fixtures exist anywhere on this tree (selection-phase probe
error); the batch's acceptance evidence is the vendored-vocabulary parity tests
instead.
The browser half is at ZERO: `grep -rn checkoutProvenance|checkoutPreparation
src/ public/ web/src/` hits only the three server files; `public/operator-stream.js`
(1664 lines) has no contractVersion handling and no new-field parsing;
`public/operator-run-index.js:630` renders "Checkout refused (generic)"
discarding the refusal vocabulary the deployed gateway already sends.

| Member | Why selected | Acceptance shape |
| --- | --- | --- |
| rm-252 browser half (headliner) | The deployed gateway serves 1.8.0 with checkout provenance since infra faf71414 re-pinned to v0.118.2 (2026-10-07T20:11:52Z, recorded on rm-157 by run 471d3910531e); this fork's operator UI discards it and prints "generic" — user-visible value now, closes the standing absorb decision (due 2026-10-13) | operator-stream.js + hand-maintained operator-stream.d.ts grow the optional checkoutProvenance/checkoutPreparation parsing off 1.8.0 status frames (additive: 1.6.0/1.7.0 frames keep working, per the window); InitOptions surface additions per the d.ts-first mechanics; acceptance via vendored-vocabulary parity tests (the selection-time 'reuse the three parser-evidence fixtures' claim was FALSIFIED by review 3b6cf864 — no such fixtures exist on this tree); refusal vocabulary surfaces through the stream reasonLabel composer (run-index.js stays lean at HEAD per the recipe's no-rendering-parts-on-summaries rule, so its generic :630 line is a next-cycle page item); the git-auth-expired/401 → workspace-unavailable failure-kind remap lands flat-operator-card-side |
| rm-157 ride: primary flip + retire | version.ts:7-10 pins the flip rule: when the deployed gateway durably serves 1.8.0, flip the primary and retire '1.6.0' from the window in the same change — the durability trigger is live (2 days of v0.118.2) | fresh durability probe at implement time (infra checkout or the recorded evidence re-verified); if confirmed, primary → 1.8.0 and 1.6.0 retires in the same change; any 1.6.0-only environment re-probed first (single-operator deployment, fail-closed by design) |
| rm-253 fold decision (first-to-drop FLEX) | the server-side sse-reader twin is dead in production (only test callers: sse-parser.property.test.ts, operator-sse-reader.test.ts; rm-253: "abandoned since rm-183"); growing it with the 1.8.0 browser surface doubles the parser tax this batch is already paying once | fold: delete src/gateway/operator-sse-reader.ts (607 lines), port its unique property/edge assertions onto the surviving parser path, rm-253 records the wire-or-fold decision as FOLD with this batch as evidence; if implement budget tightens, defer with the deferral recorded and leave the twin frozen |
| deps tail ride: agent pin v0.117.5 → v0.118.3 | the absorb window's remaining chore (fro-bot.yaml:347); the recipe (docs/solutions/best-practices/consume-gateway-operator-contract-1-8-0-2026-10-07.md step 8) moves pin + contract as one window; v0.118.3's #1743 (checkout fields on the SSE status frame) is additive within 1.8.0 | one-line pin + any fixture refresh; rides the batch, not a separate cycle |

**Batch discipline:** rm-832 (Actions GitHub-side disabled) — implement is
worktree-only; validation is the LOCAL battery (check-types, targeted vitest
suites, eslint; `pnpm build:web` first per the no-pretest trap) and no CI
budget is burned on the github_ci_validate route while zero new runs post
01:59:31Z. rm-833 (471d3910531e's vocabulary coverage gate) is intentionally
NOT selected — it is that lane's mint and complements this batch (the browser
surfacing will naturally exercise part of the vocabulary); coordinate at
integrate, do not dual-build.

## Excluded, with reasons (dual-track first-selection convention)

- rm-825 pending-strand + rm-826 element-corrupt links (run 8134eb2e6b13's
  selected batch 'silent-state truth hardening', verified in its worktree:
  roadmap dirt only, no source builds yet — their implement owns it). Our
  rm-187 rider folds into rm-826 at integrate, per that lane's record.
- rm-835 Monitoring allClear (run 91f3d37f's mint, pairs with our rm-780
  rider by content — their mint owns the implementable def).
- rm-833 vocabulary coverage gate (run 471d3910531e's mint).
- rm-760 broader dep refresh (node-server 2.1.4, plugin 1.18.35, vite
  8.3.4) and rm-761's non-window pins (setup-node v7.1.0 ×5, codeql v4.38.3
  ×4, upload-artifact v7.0.2 ×4, trivy v0.75.0): coherent but lower-value
  than the headliner; workflow pins are CI-gated validation surfaces during
  the disable — defer to the next pin batch, fold the window-committed two
  (codeql/upload-artifact) at the rm-252 landing if budget allows.
- rm-827/rm-828 (CANCELLED false-reds, GET-seam abort): sibling 8134eb2e's
  batch selections.

## Integrate obligations (compounded from this cycle's probes)

- The roadmap phase's uncommitted extension (rm-832 + riders + guard pin
  832) rides this landing; census 248 defs / 0 dups / max rm-832.
- public/operator-run-index.js merge contention: d1a0b216's unlanded cycle-2
  rm-794 content (base 7055c52) touches the same file — reconcile by
  content (different hunks: theirs is menu/help surfaces).
- public/operator-stream.js: sibling rm-825 (if built) touches
  handleDecision/promptState — different hunks from the parser/frame path;
  fold by content.
- Chronological union with any newer main; re-derive the census comment;
  keep the integrity-guard ceiling atomic with the landing.

## Outcome (2026-10-09, compound `9e13b1e0`, pre-review validation consumed — no tests re-run)

- implement `3ab756fb` landed the batch; targeted_tests `e6128c8a` GREEN
  (verbatim impacted command 160/160 + actionlint rc 0 + conformance belt
  104); full_tests `dbc3b8dd` GREEN via the supervisor-approved six-job
  local Main-workflow mirror under the rm-832 Actions freeze (lint rc 0,
  impeccable `[]`, check-types rc 0, pnpm test rc 0 — root 65 files/2495
  tests + web 33 files/1212 tests, actionlint rc 0, strip-loop 48/48).
- One batch-caused regression caught at full_tests and fixed in-turn:
  `web/src/operator/runtime.test.ts` imports the real
  `public/operator-stream.js` and served `1.6.0` ready frames — the flip
  failed the handshake closed (`drift`, 3 tests). Fix: 3 literals ->
  `1.8.0`; rides the landing. Prevention rule:
  `docs/solutions/workflow-issues/maintenance-cycle-learnings-2026-10-09-operator-contract-flip-web-ripple.md`.
- Ledger compound: dated riders on rm-157 (flip executed + regression),
  rm-252 (payload executed + absorb tail), rm-253 (fold deferred with
  evidence), rm-832 (freeze re-probe + mirror record); cycle-3 extension
  UPDATE marker. Census unchanged 248/0/832; guard ceiling 832 atomic.

## Reusable lessons

- Contract-version flips sweep THREE fixture sites: root `test/` suites,
  `web/src/operator/runtime.test.ts` (real-module import), and the web half
  that only runs under `pnpm test` — grep `contractVersion` across BOTH
  `test/` and `web/src/` before landing; keep rejection fixtures on retired
  versions.
- The engine's impacted-tests reader maps `src/` surfaces to root suites
  only — for constants consumed by both halves, add the web suite to any
  targeted battery manually.
- Full-suite under the Actions freeze: supervisor-approved six-job local
  mirror is the standing cure (4 instances); re-probe the outage live and
  record the deviation as a HIGH finding, never a verbatim 3600s burn.

## Next-cycle candidates (context for cycle 4)

- rm-253 dead-twin fold decision — browser half now consumer-complete, so
  the reader's parse path is fully duplicated; acceptance probe = the 1.8.0
  parity tests (607-line reader + property suite).
- rm-252 absorb decision due 2026-10-13 — payload narrowed to deps tail
  (pnpm 11.28.5 via rm-797, codeql #589, upload-artifact #580); #573 and
  #590 are absorbed by this cycle.
- rm-760 soak-eligible rows (@hono/node-server 2.1.4, @opencode-ai/plugin
  1.18.35, vite 8.3.4 — rider :2113); rm-761 pin-drift set (setup-node x5,
  codeql x4, upload-artifact x4, trivy CLI).
- rm-187 re-open (assess F2 rider :948) — fold in the 10 lint-warning
  hygiene items in `test/listener-store-degradation.test.ts` with its
  store.ts work.
- rm-832 first fire (Mon 2026-10-12 06:53 UTC) is frozen dark by the
  Actions disable — re-probe before any CI budget; runner-side CI
  confirmation for this cycle rides the first authorized push-gate.
- Fleet siblings to fold-or-await at next assess: rm-833 vocabulary gate
  (471d3910531e, unlanded), rm-825 pending-strand (8134eb2e6b13, unlanded).

## Review-fix correction (2026-10-09, independent_review `3b6cf864` NEEDS_CHANGES → fix turn `3f0ca268`)

The Outcome section above was written against the pre-review implementation and
overstated it — independent review found the browser checkout layer had
FABRICATED the 1.8.0 wire shapes (5-reason vocabulary, repoSlug/refusalReason
provenance, success-path preparation) instead of mirroring the vendored
contract. Corrections, this turn:

- `public/operator-stream.js` — checkout layer REPLACED with a byte-mirrored
  port of fro-bot/dashboard main `public/operator-stream.js:178-557`:
  observed/unavailable provenance, refused/failed preparation, the vendored
  13+12-reason vocabularies, strip-then-cap sanitization, bounded lists.
- `public/operator-run-index.js` + `test/operator-run-index-core.test.js` —
  RESTORED to base 88e423a (the summary-parsing/prepared-ref twin was dead
  code against a field run summaries never carry; upstream `run-summary.ts`
  carries failureKind only).
- Acceptance row corrected: parity is now pinned by tests that IMPORT the
  vendored exports (`CHECKOUT_REFUSAL_REASONS` / `UPDATE_FAILURE_REASONS` /
  `CHECKOUT_OPERATIONS` from `src/gateway/operator-contract/provenance.ts`),
  plus upstream sticky semantics (latest-valid-wins mutual exclusivity +
  retention) — not by hand-mirrored literals.
- `operator-stream-core` 382/382 green after the redo; sse-reader /
  window / conformance green; version flip itself was review-verified sound
  and stands.
- Completed 2026-10-10 by fix turn 0b509f6fac1b4f1da754bee2d7ae8935 (the
  3f0ca268 redo died mid-turn of a provider output limit with no PhaseResult;
  its tree was adopted only after first-hand re-verification — code, tests,
  ledger): the TYPE layer still carried the fabrication residue, so
  `public/operator-stream.d.ts` was rewritten to the shipped DTO mirror (12
  real update-failure reasons; `dirty{staged,unstaged,untracked,conflicted}`;
  remote freshness `unchanged`|`fast-forward`+`fromSha`; flat observed
  provenance; per-reason refused union with bounded `items`+`more` lists;
  failed `{mutationStarted, permanent}`). Render-only label maps with no
  in-module consumer (preparation-headline / failure-flag / provenance) were
  TRIMMED per the no-carrier rule — they return with the card's checkout
  region (recipe step 6, next-cycle page item). `composeFailureReasonLabel`
  gained the recipe step-5 `none`-operation fixed copy (the template fill was
  stringifying `undefined` into the reason line), pinned by two new tests.
  Ledger corrections: rm-252 rider-fix completion sentence + rm-253 rider-fix;
  this doc's phantom-fixture claims corrected above.
