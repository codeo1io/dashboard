# Repository maintenance — cycle 2 batch run cb0cfe9681a9419a9e3d14acedc61aa3 (2026-10-09)

Phases: assess d6a974c4c2934120a41f7058c88065e0 · research 4fda2bf6bde540cfb9dd3f996495b095 · roadmap df1c3100d69d4430844f0155ab5a6d82 (zero-mint by dedupe) · prioritize 5934fbc4f6564b309ae712d10331b0f1 (this document) · implement/full_tests/compound follow.

Base: worktree HEAD 7055c52 (this lineage's cycle:2 predecessor batch 'release unfreeze + https-only detailsUrl boundary' landed as the 2ffe2c5 lineage); origin/main advanced mid-run to 546c93c+ (rm-759/760/761 landed) — integrate obligation recorded in the roadmap phase's extension comment at ROADMAP.md:2415.

## Selected batch — 'PKCE auth hardening + listener corruption tolerance'

| Member | Why selected | Acceptance / evidence plan |
| --- | --- | --- |
| **rm-149 — OAuth PKCE (S256) hardening** (security, pri 66.0, headliner) | The highest-value implementable unclaimed def in this tree. Standing since 2026-09-23; the 2026-09-24 compound deferred it solely because an Effort-2 auth surface needs a solo headliner slot — this lineage's cycle:2 window provides exactly that. GitHub's OAuth docs now document PKCE for OAuth Apps as strongly recommended; today the redirect carries state-only CSRF protection (`grep code_challenge` across src/ and web/src/ returns zero at 7055c52, re-verified this run). Fleet map 2026-10-09: every sibling selection today took other clusters (tripwire ×3: run-0cde5807 rm-784, run-32f33f1b rm-781, run-33b30ba2 rm-782; action pins: run-ab16a466 rm-782; currency/playwright/trivy: run-ddb41af7, run-df0dd46d; branch protection + scorecard: run-438dea88 rm-116/rm-792; lint decomposition: run-f510a33e rm-279; client network truth: run-e8c99e0e rm-485/rm-501; CI gate + context seal: run-cb1890443; gate health + operator lifecycle: run-d1a0b216) — rm-149 remains `candidate` in every sibling ledger probed. | Authorization redirect carries state AND an S256 `code_challenge` (`code_challenge_method=S256`, plain unsupported); verifier lives in a short-lived HttpOnly SameSite=Lax cookie mirroring the state pattern; token exchange sends `code_verifier` and rejects mismatches. Tests: challenge-absent rejection at exchange, verifier-mismatch rejection, happy path. **Implement-time constraints from the 2026-09-30 github-review rider (CodeQL js/insufficient-password-hash false-positive on ephemeral PR snapshots, alerts #74/#75): author the S256 sites alert-clean — restructure the test binding assertion to hash a verifier captured BEFORE it enters a cookie (kills the getSetCookie→createHash taint source), else a scoped inline `'// codeql[js/insufficient-password-hash]'` with an RFC 7636 justification comment.** Evidence: new auth tests green in `pnpm test`; `grep code_challenge` hits at src/routes/auth.ts only; fork-specific nuances in docs/solutions/. |
| **rm-187 — listener-store corruption tolerance** (reliability, pri 47.0, minor rider) | Small, freshly corroborated, newly unblocked. Assess d6a974c4 re-verified the unguarded `JSON.parse(row.links)` at src/listener/store.ts:51 unchanged at 7055c52 — one corrupt SQLite cell in `listener_links` 500s all of GET /api/listener/messages. The def's 2026-09-25 sequence block (PRs #23/#113 carrying unlanded store.ts deltas) is STALE-LIFTED: all three dedupe-un-ack PRs (#23, #113, #114) merged 2026-09-25..26 and their deltas landed on main (`gh pr view` verified each, this run). Unclaimed by every sibling lane. | Per-row guarded parse degrading to `links: []` (degradation, never a wholesale 500) with a targeted seeded-corruption test asserting the endpoint stays 200 and the corrupt row renders degraded; existing store/messages suites stay green; **per the run-2026-10-09 full_tests lesson (helper-touch rule), verification must include every existing suite importing the touched seam — grep importers of store.ts output.** |

## Why nothing else (collision/dedupe record)

The 2026-10-09 fleet selection map (derived first-hand from every sibling run worktree's ROADMAP def-line `selected 2026-10-09` markers) rules out the workflow/currency cluster entirely — this batch deliberately contains no workflow pin, tripwire, or digest work. The other high-pri candidates in this tree fail selection for cause, verified this run:

- rm-104 (pri 98, render defects): externally gated on the next hermes-roadmap render cycle — cannot be implemented in-repo this cycle.
- rm-279 (pri 96, Lint-job decomposition): selected TODAY by run f510a33e155f — sibling-owned.
- rm-252 (pri 80): absorb-window tracking def (research/standing disposition, no in-repo implementation).
- rm-282 (pri 74): dual-App mTLS architecture — multi-cycle scope.
- rm-157 (pri 72): sequence-blocked behind the gateway-side move; the operator-contract 1.8.0 window is owned by the open PR #448 lane (run 9289efaa) — coordination datum recorded at rm-157's rider this run.
- rm-249 (pri 72): analysis/best-effort scope ('functional' family, P1 delivery phase) — not implement-phase work.
- rm-117 (pri 70): REVIEW TRAP umbrella requiring fresh grep-runtime evidence to re-derive scope — assess-tier, not implement-tier.
- rm-187's and rm-149's prior blockers: lifted / never landed (see table).

## Sequencing notes for implement

1. Both members are independent code surfaces (src/routes/auth.ts + session cookie seam vs src/listener/store.ts) — land in one implement pass, separate commits not required by the engine.
2. PKCE touches the operator auth invariant: keep the read-only invariant untouched (authorization/token endpoints only; no GitHub App permission surface changes).
3. Full-tests gate must include the pre-existing suites importing the touched seams (web auth tests for the cookie seam; listener store importers for the degradation seam).
4. The roadmap phase's INTEGRATE OBLIGATION stands: union riders onto the newer lineage (origin/main 546c93c+), re-derive census + guard pin at integrate.
