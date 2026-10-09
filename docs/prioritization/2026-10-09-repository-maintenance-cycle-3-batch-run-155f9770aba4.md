# Repository maintenance — cycle 3 batch: oauth-pkce-hardening

- run: `155f9770aba44573a0155d439e93520d` (cycle:3, repository-maintenance `8e7a74aa7ab84abfaaa1571fae36bfce`)
- prioritize attempt: `c97a71d08a5f4eda8a2aafeb960202c5` (2026-10-09)
- selected ledger item: `rm-149` — OAuth PKCE hardening (track: security, priority: 66.0)
- base: `364272b` (worktree carries this run's roadmap-phase patch applied on top: defs `rm-806`–`rm-808`, guard pin 808)

## Inputs

- assess (`45b69f75ccca4d3ebc48d5f0624b0863`): zero P0–P2 defects; the auth path is otherwise hardened (state CSRF, HttpOnly SameSite=Lax cookies, session rotation) — PKCE absence is the one structural gap on it; 3 low + 1 info hygiene findings minted as `rm-806`–`rm-808`.
- research (`30020ccdb7e842adbb9ff73ffe573f80`): candidates C1–C7, most already owned by sibling lanes (see below).
- roadmap (`1079542474e54be1bde2063ec15093d5`): 3 mints (`rm-806`, `rm-807`, `rm-808`) above the re-probed all-lineage ceiling `rm-805`; spool patch applied to this worktree (census 248 defs / 0 dups / max `rm-808`).
- fleet liveness (campaign conductor.db, 2026-10-09): LIVE — `33b30ba2` (final_validation; batch 'CI-gate truthfulness' = `rm-487` residue, `rm-782` cve-tripwire cure, `rm-783` web lint, `rm-784` App.tsx), `df0dd46d` (final_validation; `rm-787` trivy/codeql digest pins), `c4617181` (running; `rm-799` zizmor gate + setup-node/upload-artifact/codeql-action re-pins), `38e728540707` (running; `rm-599`+`rm-797` routes-api, `rm-798` provenance/pending-question consumers). FAILED (dead lanes) — `d1a0b216` (`rm-793` owner), `ddb41af7` (`rm-784`–`786` mints), `8dd690c8` (`rm-805` mint), `438dea88` (no `rm-792` def line found on its wall).
- main-ledger selected-baseline: `git show HEAD:ROADMAP.md | grep -c 'status: open (selected'` = 0 (no in-flight selected items on the ledger base).

## Selection floor

Full top-of-ledger screening (open/candidate items by priority), with dispositions:

- `rm-104` (98.0): upstream-generator-gated acceptance — non-selectable per trap map.
- `rm-279` (96.0): cured-by-quiescence with stale score — non-selectable per trap map.
- `rm-102` (90.0): dependabot clause 2 gated on the first MERGED automated bump — external event.
- `rm-103` (85.0) / `rm-252` (80.0): upstream absorb windows — large multi-file batches in a fleet-saturated cycle; next-cycle lead candidates, not this batch.
- `rm-282` (74.0): premise STALE — live probe 2026-10-09 returns 0 open Dependabot alerts (audit-zero gate already recorded); floor-raise urgency gone. Keep def; future roadmap phase may fold the cure datum.
- `rm-249` (72.0): decision-gated (product joint with `rm-138`) — not this cycle.
- `rm-117` (70.0): operator-facing code-scanning alert surfacing — premise LIVE (30 open code-scanning alerts at the 2026-10-09 probe, up from 10 at mint), but feature-sized (aggregator query + DTO + view + tests) and partially acceptance-blocked; deferred as the strongest next-cycle candidate in uncontested server space.
- `rm-149` (66.0): **SELECTED** — see below.
- `rm-162` (60.0) / `rm-194` (50.0): landed-by-content residues — non-selectable per trap map.

## Claimed-and-excluded (congestion audit)

Every candidate from this run's own assess/research/roadmap phases, with owner or defer reason:

- `rm-793` (cve-tripwire `NODE_IMAGE` fix; dead-lane `d1a0b216`): EXCLUDED — file contention: `.github/workflows/cve-tripwire.yaml` is inside LIVE `33b30ba2`'s selected `rm-782` batch (in final_validation) and LIVE `df0dd46d`'s `rm-787` batch. The Monday 2026-10-12 06:53Z first fire is expected to be cured by `rm-782`'s landing, not re-implemented here.
- `rm-798` (checkout-provenance run cards): EXCLUDED — selected by LIVE `38e728540707`.
- `rm-799` (zizmor + action re-pins): EXCLUDED — selected by LIVE `c4617181`.
- `rm-487` residue / `rm-782` / `rm-783` / `rm-784` (App.tsx): EXCLUDED — LIVE `33b30ba2`.
- `rm-787` (trivy/codeql digests): EXCLUDED — LIVE `df0dd46d`.
- `rm-806` (scanner-workflow concurrency groups): EXCLUDED on file contention — `codeql.yaml` and `scorecard.yaml` sit in LIVE `c4617181`'s re-pin set; `dependency-review.yaml` alone is too thin to carry the def. Re-selectable once `c4617181` lands.
- `rm-807` (in-window dep refresh): HELD by its own soak gate — vite 8.3.4 matures 2026-10-10T12:07Z and `@hono/node-server` 2.1.4 matures 2026-10-10T04:42Z, both younger than the 1440-minute gate at selection time 2026-10-09. Re-selectable next cycle.
- `rm-808` (dead `_onSettle` param): EXCLUDED on file contention — `public/operator-stream.js` is LIVE `38e728540707`'s `rm-798` consumer surface. Re-selectable once that lane lands.
- `rm-785` (playwright coupled bump; dead-lane `ddb41af7`): EXCLUDED — `package.json`/lockfile surfaces sit adjacent to LIVE `c4617181`'s package-manifest obligations; plus the mcr regen ceremony.
- `rm-805` (runner-pin guard; dead-lane `8dd690c8`): EXCLUDED — its cure file (`cve-tripwire.yaml` `runs-on`) is double-claimed by the two live cve-tripwire lanes.

## Selection risk

- Single-item batch — deliberate: with four live lanes holding the CI/deps surface, contention risk outweighed throughput; `rm-149` is the one substantive, self-contained, uncontested security item (verified: zero auth/pkce references in all four live lanes' current batch docs; no fleet-wide selected def on the subject).
- PKCE must not break the existing session carry: mitigation scoped in the selection rider — S256 challenge on the authorize redirect, verifier in a short-lived HttpOnly SameSite=Lax cookie minted alongside state, exchange rejects missing/tampered verifiers, no plaintext downgrade.
- The `/auth/github` flow is this app's own OAuth client (not proxied through the gateway), so the gateway operator OAuth contract is untouched; implement re-verifies this reading of `src/routes/auth.ts`.

## Verification

- Selection edits: def-line flip on `rm-149` (`status: open (selected 2026-10-09, run 155f9770aba4 cycle:3 prioritize c97a71d08a5f, 'oauth-pkce-hardening')`, orig parenthetical moved verbatim into the selection rider) plus the selection rider at the def block tail — both in `ROADMAP.md`.
- Guard battery on the edited tree: `node scripts/roadmap-census.ts` (248 defs / 0 dups / max `rm-808` — selection edits do not move the census); `./node_modules/.bin/vitest run test/roadmap-integrity-guard.test.ts test/roadmap-length-guard.test.ts`; `./node_modules/.bin/eslint ROADMAP.md docs/prioritization/2026-10-09-repository-maintenance-cycle-3-batch-run-155f9770aba4.md`.
- Fleet claims re-checkable: `grep -rl '<run12>' /work/projects/hermes-autonomy/runtime/fork-maintenance/campaigns/*/conductor.db` + `sqlite3 <db> 'select id,status from runs'`; claim scan `grep 'status: open (selected' run-*/ROADMAP.md`; baseline `git show HEAD:ROADMAP.md | grep -c 'status: open (selected'` = 0.

## Implementation (2026-10-09, implement c87cb714b7a44985ad2c313672aa90dd)

Landed in-worktree at base 364272b, on top of this run's applied roadmap patch and the selection edits above.

### Surfaces

- `src/auth/pkce.ts` (NEW) — RFC 7636 helpers: `generatePkceVerifier()` (43-char base64url of 32 random bytes, ~256-bit), `deriveS256Challenge(verifier)` (BASE64URL(SHA-256(ASCII verifier)), pinned to the RFC 7636 Appendix B vector in tests), `isWellFormedPkceVerifier(value)` (`value is string` type-predicate shape gate: exactly 43 unreserved chars).
- `src/auth/oauth.ts` — `GitHubOAuthClient.createAuthorizationURL` gained the required `codeChallenge` arg (emits `code_challenge` + `code_challenge_method=S256` on the authorize redirect; plain is never emitted); `validateAuthorizationCode` gained the required `codeVerifier` arg (`code_verifier` rides the token-exchange body). The six sibling test fakes remain assignable (TS function-parameter bivariance: fewer-param implementations satisfy the wider signature) — no edits needed outside `test/auth.test.ts`.
- `src/routes/auth.ts` — `/auth/login` mints the verifier into an `oauth_pkce` cookie mirroring the state cookie exactly (600s TTL, `path=/auth`, HttpOnly, SameSite=Lax, rm-604 branch-(b) Secure rule) and passes the challenge to the redirect builder; `/auth/callback` requires a well-formed verifier BEFORE the exchange — 403 `Forbidden: PKCE verification failed` on missing/malformed (exchange never called), clears both auth cookies one-time-use, and passes `code_verifier` to the exchange (a well-formed but wrong verifier is rejected BY the exchange as 401). No verifier-less downgrade exists anywhere on the path; gateway mode short-circuits `/auth/login` in `src/server.ts` before this router, so the gateway operator contract is untouched (verified by `test/gateway-auth.test.ts` staying green).
- `test/auth-pkce.test.ts` (NEW, 13 tests) — helper unit pins (incl. RFC vector), redirect+cookie attribute parity, Secure-attribution parity at the third cookie site, fresh mint per login, happy-path binding, missing/malformed → 403 pre-exchange, tampered verifier → 401 at the exchange, drop-challenge downgrade shape → 401, one-time-use clearing of both cookies.
- `test/auth.test.ts` — `runOAuthFlow` + the happy-path/401/allowlist/timing-safe flows carry the verifier cookie; real-client param expectations extended to `code_challenge`/`code_challenge_method`/`code_verifier`.
- `docs/solutions/security-issues/oauth-pkce-s256-github-nuances-codeql-alert-clean-2026-10-09.md` (NEW) — fork-specific nuances (per the def's evidence expectation).

### CodeQL alert-clean authoring (the 2026-09-30 github-review rider)

Every S256 hash input in the landed tests is a function-argument value captured BEFORE it enters a cookie: the binding proof hashes the `code_verifier` argument the fake's `validateAuthorizationCode` receives; the Set-Cookie↔argument link is asserted by plain string equality. There is no `getSetCookie`→`createHash` flow anywhere in the landed code (`grep`-verified), so no `codeql[js/insufficient-password-hash]` suppression comment was needed — the rider's preferred first option.

### Verification (focused set, per the implement budget)

- `./node_modules/.bin/vitest run test/auth.test.ts test/auth-pkce.test.ts test/gateway-auth.test.ts test/rate-limit-class.test.ts test/endpoint-parity-guard.test.ts test/dashboard.test.ts test/operator-fixture-harness.test.ts test/operator-route-redirect.test.ts test/operator-ui.test.ts` → 9 files, 433/433 passed.
- `pnpm check-types` → rc 0 (node 22.22.0; known `engines>=24` advisory warning only).
- `./node_modules/.bin/eslint src/auth/pkce.ts src/auth/oauth.ts src/routes/auth.ts test/auth-pkce.test.ts test/auth.test.ts` → rc 0.
- Ledger: `node scripts/roadmap-census.ts` → 248 defs / 0 dups / max `rm-808` (status flip moves no census dial); roadmap guard suites + `eslint ROADMAP.md` re-run after the flip.

## Pre-review outcomes (2026-10-09, compound a07086d7e0c04790b4475112f70232a3)

- targeted_tests (`b6e60f0824b1466aa03b981cbb73114f`): the dispatched targeted_command ran VERBATIM — 11 impacted suites / 530 tests all passed (auth, dashboard, endpoint-parity-guard, gateway-auth-session-cache, gateway-auth, listener-ingest-auth, operator-fixture-harness, operator-route-redirect, operator-ui, static-assets, transport-timeout-contract); supplementary vitest on the then-untracked `test/auth-pkce.test.ts` 13/13.
- full_tests (`5ecd7df55dcc41d8ae65a0b53eb8924c`, redo of fold-rejected `58737c07`): supervisor-authorized local mirror of all six Main jobs under the account-level Actions disable (dispatch probe → 422 `Actions has been disabled for this repository`; newest run 37872407109 @ 2026-10-09T01:59:31Z) — `TIMING=1 pnpm lint` rc 0; impeccable@3.2.1 detect findings `[]`; `pnpm check-types` rc 0 ×3; `pnpm test` rc 0 (65 files/2487 tests root + 32/1203 web, delta vs pre-batch exactly the new PKCE suite); actionlint container rc 0; strip-only import loop 49/49. Digest `validation:v1:f592dbe7ce8e0c04e7ac3097b157dd8c1ff0e309c7318416e047d7d2fdcf7ec6` declared verbatim, zero executable changes; GitHub-runner confirmation deferred to the first authorized post-recovery push-gate turn. Full report: `delegate/fulltests-155f9770-5ecd7df5-report.md`; recipe: `docs/solutions/workflow-issues/github-actions-account-disable-full-validation-local-mirror-2026-10-09.md`.
- Nothing was re-run at compound; outcomes consumed from the recorded PhaseResults. rm-149 remains `implemented … pending landing` with the dated validation rider appended in `ROADMAP.md`.

## Next-cycle context (2026-10-09, compound)

Condensed from the compound record (`2026-10-09-repository-maintenance-cycle-3-compound-run-155f9770aba4.md`): headliners rm-659 (open, security) and the rm-806/807/808 candidate set; HIGHEST-URGENCY standing watch rm-755 (cve-tripwire weekly first-fire Mon 2026-10-12 06:53 UTC vs the still-unlanded `NODE_IMAGE` drift); landing frame carries the sibling contentions (ba5f6d7ddd67's parallel spool-only rm-149; 8cecf1d7's divergent rm-807) to reconcile by content at the first integrate.
