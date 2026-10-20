# Cycle 2 Prioritization Decision: 'oauth-pkce-and-pnpm-pin'

- date: 2026-10-09, run ba5f6d7ddd6741b58817ac63b8a5fb1b, campaign repository-maintenance 827b096aa8f84dec9279ce9fd1d2ac1e, cycle 2, prioritize attempt d41a9533c5434f84918a0e6465c74438; wall base 364272b (origin/main 88e423a, the cbe70604 landing — this lane's roadmap extension #41 is authored against the pinned base and records the union chronologically).
- gates at selection: tree census 246 defs / 0 dups / max rm-831 (this lane's roadmap extension #41, ~13:00Z); `git status --porcelain` = ROADMAP.md + test/roadmap-integrity-guard.test.ts only (the roadmap phase's uncommitted extension); battery at selection = roadmap guards 9/9 green, eslint rc=0.
- batch and rationale: **'oauth-pkce-and-pnpm-pin'** —
  (1) `rm-149` OAuth PKCE (security, 66.0, lead): the authorization redirect still sends state-only CSRF protection with no `code_challenge` — premise re-verified live at selection (grep `code_challenge` across src/ + web/src/ = 0 at base 364272b AND on origin/main 88e423a; no open PR carries auth files). Highest-impact open item that is fully implementable and locally verifiable while GitHub Actions is platform-disabled (rm-831).
  (2) `rm-281` CodeQL `js/insufficient-password-hash` recipe (security, 62.0): coupled by construction — the annotation sites ARE the PKCE test digests. Implementation follows the 2ee1c4841e9d-refactored shape (binding proven via /auth/callback 403 behavior, no direct cookie-value hashing in test code) or carries the suppression line above any createHash site; the recurrence-class cure menu lands in this doc so it never re-derives. The CodeQL-green half stays gated on the platform re-enable and is recorded at that landing.
  (3) pnpm 11.28.4 → 11.28.5 pin-class rider on `rm-252`'s open surface (patch-class, "can ride any batch" per the fleet note on the 8134eb2e wall): npm view probed (dist.integrity sha512-SEVj0wtMKtJ8…); upstream #592 merged 2026-10-09T06:38:31Z touching package.json only; 88e423a still pins 11.28.4. Scoped strictly to the four-file pin set (package.json `packageManager` + BOTH Dockerfile corepack-prepare specs + test/fork-exclusion-guard.test.ts's both-stages and packageManager assertions) per the rm-797 derivation recipe — which is UNLANDED lineage content on this base: the sha512-pin solutions doc exists on no ref (`git log --all -S'+sha512.' -- package.json` → empty), corrected at implement from the citation this doc originally carried. The decision-gated halves of rm-252 (agent pin v0.118.3, upload-artifact v7.0.2, checkout-detail display) STAY with the 2026-10-13 absorb decision — rm-252's status stays candidate.
- de-prioritized with explicit rationale (first-hand, this phase): rm-104 (98.0) cure belongs to the external hermes-roadmap render tool; repo-side guards already landed. rm-279 (96.0) signature structurally cured 2026-10-03, remainder is CI-behavior decomposition unverifiable while Actions is platform-disabled. rm-102 (90.0) dependabot watch — clause 2 waits on external behavior. rm-103 (85.0) disposition folds into rm-252's 10-13 decision. rm-703 (76.0) cure ALREADY on origin/main via 5aab7c7 (rm-691/rm-708 lineages) — triage/close at integrate, not implementable. rm-117 (70.0) + rm-162 selected & implemented by run 91776e259752 riding draft PR #479 (full-diff diligence; its prioritization doc names this lane's roadmap extension the wall frontier source). rm-249 (72.0) deferred by product-decision precedent (7b1b004f). rm-107 (65.0) watchdog monotonicity — precondition flipped with the 2026-10-08 banner-consumer landing, but separate theme; prime next-cycle lead. rm-116 (58.0) branch-protection fill wants live check registration, impossible while platform-disabled.
- collision diligence (first-hand, 2026-10-09 ~13:15Z): only open PR = #479 (conductor/ci-17b348378aa9, 91776e259752's security-visibility batch; name-only diff = aggregator/code-scanning/web/operator surface + its own batch doc — no auth, no manifest files). No live wall carries a `selected 2026-10-09` line; PKCE absent on every live wall and on main (auth.ts `code_challenge` = 0 on all); packageManager still 11.28.4 on all walls and 88e423a. The 8dd690c85b50 PKCE batch's worktree is swept with content NOT on main — unlanded pending-content pairing per the ddb41af7 same-morning precedent (byte-convergent fold at every integrate).
- validation plan under the Actions platform-disable (rm-831): local gates only — `pnpm check-types`, `pnpm lint`, `pnpm test` (pretest builds web/dist first for suites hitting '/'; targeted vitest for new suites per docs/solutions/workflow-issues/targeted-vitest-without-pretest-build-webdist-404s-2026-09-24.md), roadmap + fork-exclusion guards after the pin edit. CI-side proof (CodeQL green on the PKCE tests, Main green, image release from the pnpm spec edit per should-release scalar-diff) is recorded at the platform re-enable landing (rm-831/rm-281).

## Implementation outcome (2026-10-09/10, implement bb893dcc → re-delivered 88c9e8dd)

Delivered in the stewardship worktree at base 364272b and re-delivered as the ONE
cumulative spool patch `delegate/implement-ba5f6d7ddd67-88c9e8dd.patch` (supersedes
bb893dcc's sidecar patch AND includes the roadmap/prioritize phases' uncommitted ledger
content — later phases apply THIS patch only); the tree is restored pristine per the
enforcing hygiene clause. Delivery lineage: sibling attempt bb893dcc authored the content
and its turn completed, but it exited leaving the batch as uncommitted tracked-file drift
(an enforcing hygiene failure) and the engine re-dispatched; attempt 88c9e8dd audited the
content file-by-file, re-verified the battery first-hand, corrected two doc defects (the
dangling sha512-doc citation above, the nonexistent `PNPM_SHA512_PIN` constant name) and
re-pointed the ledger attribution.

- `rm-149` PKCE live: `src/routes/auth.ts` — `PKCE_COOKIE_NAME` `oauth_pkce_verifier`,
  `generatePkcePair()` (43-char base64url verifier, S256 challenge), login mints both
  one-time cookies, callback fail-closes 403 BEFORE the exchange and clears both cookies;
  `src/auth/oauth.ts` — `PkceChallengeParams`/`PkceVerifierParams` seam, `code_challenge`
  on the authorize URL, `code_verifier` in the token-exchange body;
  `test/auth-pkce.test.ts` — 8 tests incl. missing/empty-verifier fail-closed,
  wrong-valid-shaped-verifier via the pairing rule, one-time cookie spend.
- `rm-281` recipe baked: binding proven via `/auth/callback` behavior (no direct
  cookie-value hashing in test code); the fake's single `createHash` site carries the
  inline `// codeql[js/insufficient-password-hash]` suppression. CodeQL-green proof stays
  gated on the Actions platform re-enable (rm-831) and is recorded at that landing.
- `rm-252` pin rider: pnpm 11.28.4→11.28.5 at all four sites in the repo's existing
  PLAIN form (the +sha512 form exists on no ref — course correction in rm-252's implement
  rider); live-proven by `corepack pnpm install --frozen-lockfile` running v11.28.5
  (rc=0, lockfile untouched).
- First-hand battery (attempt 88c9e8dd, focused/impacted scope): impacted-surface vitest
  15 files / 619 tests green — every `/auth` endpoint consumer (auth, auth-pkce, dashboard,
  gateway-auth, operator-route-redirect, rate-limit-class, robots-wellknown, server) plus
  every OAuth-interface consumer (endpoint-parity-guard, operator-fixture-harness,
  operator-ui, static-assets) plus the pin/ledger guards (fork-exclusion-guard,
  roadmap-integrity, roadmap-length); `corepack pnpm check-types` rc=0 (server + web +
  .opencode); eslint on all touched files rc=0; `node scripts/roadmap-census.ts` →
  246 defs / 0 dups / max rm-831, open:2 (exactly the two implement flips), healthy.

## Cycle outcome (pre-review validation, compound afbc1b00)

Recorded outcomes consumed, not re-run (compound-phase ban on test execution).

- **Targeted (f23657a5)**: patch round-trip over the 10-path batch — vitest 15 files /
  619 tests rc=0; eslint on the 8 changed files rc=0; `corepack pnpm check-types` rc=0;
  census 246 defs / 0 dups / max rm-831, open:2 (exactly the two implement flips).
  Digest continuity: `validation:v1:e18b3a3a…` == dispatch stamp, derived pre- and
  post-battery (zero executable delta at emission).
- **Full (d6c23f92)**: the Actions platform has been disabled account-level since
  2026-10-09T01:59:31Z (first-hand: `actions/runs?created=2026-10-09T02:00:00Z..`
  `total_count=0`; newest run 37872407109 @ 01:59:31Z), so the dispatch
  `github_ci_validate.py` was **not executed** — it is the ephemeral-PR route
  (push + draft PR = prohibited stages in delegate phases) and under the carrier-patch
  delivery its clone would apply an empty diff (base-tree validation). Substituted the
  supervisor-authorized 13th-instance local dual mirror (method:
  `docs/solutions/workflow-issues/actions-platform-disable-full-validation-local-dual-mirror-2026-10-09.md`):
  leg A (pristine) six Main-job equivalents rc=0 — root 64f/2474, web 32f/1203, census
  245/0/778; leg B (patched) six rc=0 — root 65f/2482 (+8 = the batch's auth-pkce tests),
  web 32f/1203, census 246/0/831, `corepack pnpm install --frozen-lockfile` live-proved
  pnpm v11.28.5 (rm-281's pin). Engine fold-sim over the written JSON: ACCEPT; four
  tamper probes (mutated digest / outcome / empty evidence / stale base) all REJECT.
  The unrun dispatch command is disclosed as the phase's ONE HIGH finding.
- **Acceptance dispositions**: rm-149 both clauses discharged pre-review (8 auth-pkce
  tests inside the green 2482; `code_challenge` hits first-hand). rm-281's CodeQL-green
  proof clause is BLOCKED by the platform disable — deferred with reason, re-records at
  the post-lift landing; watch = rm-831.
- **Next-cycle context**: rm-252 absorb decision due 2026-10-13 — open surface narrowed
  by this batch to agent v0.117.5→v0.118.3, upload-artifact v7.0.2 (sibling 405e9004
  collision — pair by content), codeql-action v4.38.3, and the checkout-detail display
  half. rm-831 owns the disable watch + post-lift first-green banking (canary 0-for-2,
  Monday fire set 10-12). rm-760's held-dep soak-cut eligibility crossed 2026-10-09
  (@hono/node-server 2.1.4; vite 8.3.4 at 12:07Z; playwright 1.64 mcr digest verified)
  — owned by siblings rm-807/rm-821.
