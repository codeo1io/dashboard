# Dashboard maintenance — cycle 2 batch (2026-09-30)

- run: 21a483075c8345ca85065f5ccca9e276 (repository-maintenance:eb3bd20995a9436c9ff3c05e8834cf2d:cycle:2)
- base: ccfa532e3f6e9301e974f3b2ee25b4e7a5a2f7f1 (== origin/main at selection; the tree also carries this run's ROADMAP.md mint of rm-276..rm-278 + the rm-137 rider)
- selected: 2026-09-30, prioritize attempt 6656ef8a, from the full open-item pool (157-id census, 79 open) + this run's assess/research findings

## Selection method

Pool = every ROADMAP open candidate, re-verified against the current tree (the superseded 98.0 breadcrumb item and the landed rm-268 cap were excluded by section/completion status, not priority alone). Scored on impact, risk, effort, dependencies, strategic value. Hard filters for batchability: implementable in-tree this cycle (no live GitHub API mutation, no upstream ask, no substrate decision, no external time gate), independently verifiable, no dependency on unlanded work. The open candidates that pass every filter, in ledger-priority order: rm-160 (66.0), rm-277 (52.0), rm-276 (44.0). Higher-priority open items that fail a filter are deferred with rationale below.

## The batch — one theme: close real gaps in auth + push reliability

### B1. rm-160 — PKCE (code_challenge, S256) on the OAuth login flow (security, 66.0)

The top open candidate by ledger priority, passed over by two prior cycles, re-verified open today (grep code_challenge across src/ and web/src/ = zero on ccfa532; cited at src/routes/auth.ts:240-244 + web/src/api/auth.ts:62-65). Mandate: add the verifier/challenge pair to the login flow — challenge in the authorize construction, verifier carried to the callback, verification at the code-exchange step, pair never logged. Tests on both sides of the flow. Acceptance per rm-160: the authorize URL carries code_challenge with method S256; a code presented without a matching verifier is rejected; the existing OAuth tests stay green.

### B2. rm-276 — close the /auth/logout body-cap bypass (security, 44.0)

Follow-on to landed rm-268 (65f05db): the cap prechecks content-length (src/routes/auth.ts:202) but a chunked (undeclared-length) body bypasses the precheck and is fully buffered by await c.req.text() (:207) before the post-read rejection; the size test compares rawBody.length (UTF-16 code units, :208) against MAX_LOGOUT_BODY_BYTES=16384 (:199). Mandate: bounded read with readBodyCapped's reader-cancel semantics (src/routes/listener.ts:108-126, the house pattern), byte-length comparison, and a chunked-oversized-body test. Acceptance per rm-276: rejection before buffering past the cap regardless of declared length; byte-true size compare; rm-268's existing cap tests green.

### B3. rm-277 — wire the stale-key sweep to the gateway's VAPID key-version surface (reliability, 52.0)

The seam is test-only today: getCurrentKeyVersion is optional in ReconcileSweepDeps (web/src/push/subscribe.ts:651), consumed at :738, injected only by tests (subscribe.test.ts:790+); the sole production caller (web/src/views/Notifications.tsx:98-104) never passes it, so a gateway VAPID key rotation strands existing subscriptions undetected (stale_key cannot derive; resubscribeStaleKey at subscribe.ts:474 is production-dead). The upstream wiring target already exists (agent v0.117.0: trigger-policy.ts:54-59 current/previous key versions + vapid-public-key-route.ts) — no upstream ask. Mandate: derive the server's key version from the gateway's key surface, fetched on sweep cadence, cached, failure-tolerant; pass it to the sweep; a production-path test. Acceptance per rm-277: a simulated server-side rotation yields stale_key + a resubscribeStaleKey run on the next sweep; the fetch never blocks the sweep.

## Coherence + verification

Three items, zero cross-item semantic conflicts: B1 and B2 both touch src/routes/auth.ts but in disjoint regions (the authorize construction at :240-244 vs the logout cap at :199-210); B3 is web/-side only. Each lands with its own tests. Cycle gate: pnpm check-types, the affected suites (auth routes; push subscribe/reconcile), then the full pnpm test — mirroring this run's assess-phase green baseline at ccfa532 (check-types exit 0; 3452/3452).

## Deferred with rationale

- rm-249 (72.0, push/SW substrate): a substrate DECISION item (restore vs drop the service worker) that reshapes the PWA surface — not a code-batch item; its outcome does not gate B3 (the sweep runs in production today regardless).
- rm-116 (58.0, branch-protection filling): needs live GitHub API mutations with required-check conclusions in force — CI-gate-adjacent, out of an in-tree batch's scope.
- rm-278 (30.0, daily-digest announce consumer): decision-gated capability under the read-only and redaction invariants; needs an operator-surface design decision before any code. Future research/plan cycle.
- rm-271 (34.0, toolchain majors window): vitest 5 / TS 7 / pnpm 12 are each a full cycle's migration; TS 7 additionally blocked on the typescript-eslint side-by-side question (rm-133's re-eval).
- rm-137 rider (undici 7.29.1 + fast-uri 3.1.7): time-gated — the first grouped Dependabot window fires ~2026-10-03; verify then, bump the lockfile directly if it misses.
- rm-254 (upstream absorb window, in_progress): research-tracked; upstream HEAD f4a1aeb1 == window end, nothing new to absorb.
- rm-274 (30.0, fleet dependency freshness dashboard): new feature, medium-large — a future cycle's headliner.
- rm-160-adjacent standing items rm-252/rm-259 (upstream write-capability divergence): standing never-absorb policy, already dispositioned — nothing to implement.
