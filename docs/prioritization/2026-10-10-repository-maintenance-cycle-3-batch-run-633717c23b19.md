# 2026-10-10 · repository-maintenance cycle:3 · selected batch — run 633717c23b19

**Batch name:** `fail-closed input truth (server half)`
**Selected by:** prioritize attempt e451d38164414bf08145dc4edfc6906a (2026-10-10), composing on roadmap ext #37 (attempt 06c667d3).
**Implement convention:** apply `roadmap-06c667d385074b5ba5f5369edda09b20.patch` (ext #37: ROADMAP + guard pin 780→852) FIRST, then `prioritize-633717c23b19-e451d381.patch` (this selection: rm-851 flip + riders + selection comment), then implement. Land this document as `docs/prioritization/2026-10-10-repository-maintenance-cycle-3-batch-run-633717c23b19.md`.

## Members

| # | id | role | file set | effort | verification |
|---|----|------|----------|--------|--------------|
| 1 | rm-851 | LEAD (flipped `open (selected …)`) | `src/gateway/operator-sse-reader.ts`, its test file | S | new regression suite (zero-frame 200 stream ⇒ onError, no clean onClose; seeded from `/tmp/ce-assess-633717c2/empty-stream-probe.mts` which produced `{events:[],errors:[],closed:1}` live); existing reader suites stay green; lint 0/0; check-types 0 |
| 2 | rm-187 (rider-scope, no flip) | member | `src/listener/store.ts` (parseLinksCell region ONLY — additive, class body untouched: sibling f21b7a97 owns `store.stats()`), `test/listener-store-degradation.test.ts` | S | element-shape tests (wrong-shaped arrays degrade to empty); lint warnings 10→0 on that file; store suites green |

## Rationale (five axes)

- **Impact:** rm-851 closes a proven fail-open seam in the contract-gate module — a truncated/auth-weird 200 stream currently presents as a healthy empty close (monitoring truth). rm-187 half closes a type-truth gap (wrong-shaped JSON arrays flow through a cast) and retires the repo's only 10 lint warnings.
- **Risk:** both are additive guards + tests; no public JS, no web build coupling, no API shape changes; file-disjoint from every live sibling lane after the deferrals below.
- **Effort:** S+S ≈ one implement session (house precedent: landed rm-780 batch, 4-file cycle:2 implement).
- **Dependencies:** none external. Acceptance is fully locally verifiable (vitest/lint/check-types) — deliberately chosen while Actions run-creation is dark (38.5h+ this run) so nothing in the batch is outage-gated.
- **Strategic value:** establishes the zero-frame contract that rm-850 (1.9.0 readiness) and rm-253 (wire-or-fold) will build on; keeps this fork's fail-closed posture true in code, not just docs.

## Fold map (never double-implement)

- **rm-852** (canonical port spelling, server.ts:1559) → **folds to sibling 08a0abac's rm-180 rider-scope** (identical content, first-selection owns; whichever integrate lands first absorbs the other's prose).
- **rm-850** (contract 1.9.0 readiness) → **sequences BEHIND 08a0abac's rm-842** (1.8.0 display half) per that lane's own additive-rebase plan; **escalates to URGENT the moment a fro-bot/agent release newer than v0.118.3 appears** (paired-release clock). rm-851's public-twin audit bullet defers for the same collision reason (public/operator-stream.js is their file set).

## Excluded, with evidence

| item | why not this cycle |
|------|--------------------|
| rm-279 (96.0), rm-102 (85.0, in-progress), rm-103 (85.0), rm-116 (58.0) | acceptance requires live CI runs or repo-state writes; Actions run-creation dark 38.5h+ (re-probed this run) — not completable end-to-end |
| rm-104 (98.0) | escalation partially cured by landed paragraph/roadmap-lint work (rm-279's 2026-09-30 rider: mechanism cured + CI-proven); remainder needs a fleet-render observation window |
| rm-703 / SIGPIPE | cure already landed per its own riders (origin/main 5aab7c7 ahead of the mint) — stale candidate, status hygiene only |
| rm-842, rm-843, rm-180 rider-scope | owned by sibling 08a0abac's selected batch (prioritize 51f05853) |
| rm-117 (70.0) | 20cf2f7b lane leads it |
| rm-760 rows / rm-196 (60.0, in-progress) | unlanded b0ad7444 implement patch owns the rows (single-patch supersession) |
| rm-162 (60.0) | PR #479 lane, dual-tracked |
| rm-149 (66.0, PKCE) | needs a fresh research pass: AGENTS.md says the operator surface is gateway-proxied, so the login flow's true owner must be pinned before any PKCE work |
| rm-282 / rm-844–849 family | unlanded sibling claims (f21b7a97 owns rm-844; 386aafb1 owns rm-849 canary disposition) |

## Fleet collision scan (this turn)

Spool prioritize artifacts read: 51f05853 (08a0abac, newest — rm-842/rm-843/rm-180), 485be8c4 (d8fdf8b7), 119de0db (20cf2f7b — rm-117 lead), 61823cda (b0ad7444), 7c8ff52e (redaction scan 2026-09-28), 157172c0 (1c814809). Implement result read: f21b7a97 (rm-107+rm-844; touches src/listener/store.ts — additive discipline recorded above). No lane touches `src/gateway/operator-sse-reader.ts` or the parseLinksCell region.

## Verification of this selection artifact

- `prioritize-633717c23b19-e451d381.patch` (8 hunks): pristine repo → ext#37 patch → selection patch is byte-identical to the composed ledger (proven via scratch git dir sequential apply).
- Census on composed ledger: 250 defs / 0 dups / max rm-852, healthy (`node --experimental-strip-types scripts/roadmap-census.ts`, cwd=/tmp/ce-prioritize-633717c2).
- Real guard vitest against the composed ledger: 1 file, 7 passed | 1 skipped (fixture half skipIf — no git in staging).
- eslint markdown on composed ledger: rc=0, 0 problems.
- Selection comment is deliberately NON-claim-shaped (newest-census-comment trap avoided; ext #37 remains the newest claiming comment and matches live census).
- Worktree untouched throughout: porcelain=0.
