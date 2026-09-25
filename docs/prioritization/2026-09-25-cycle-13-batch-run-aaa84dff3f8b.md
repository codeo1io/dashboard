> **LANDING HEADER (2026-09-25, integrate conflict case 394d4abf).** This batch landed as candidate
> `be8a46e` (PR #136) merged into main at `828a1e6`. A parallel cycle-13 batch (run f1ae52a3, landed
> first via the d00d095 lineage) took the canonical `2026-09-25-cycle-13-batch.md` name — this doc is
> renamed `-run-aaa84dff3f8b.md` per the path-collision convention; its body is preserved verbatim below
> (ids read at mint time). **ID reconciliation at landing** (landed meanings own ids, d00d095/8bbff5c6
> convention): this batch minted rm-184..rm-189 above a then-ceiling rm-183, but main has since consumed
> the whole range — surviving items renumber: rm-184 (canary coverage-completeness) → **rm-225**,
> rm-185 (gateway-session availability coupling) → **rm-226**, rm-189 (fleet license/release columns) →
> **rm-227**, all minted above the all-lineage max rm-224 (open PR #196). Dropped as converged/deduped:
> rm-186 (.dockerignore) — CONVERGED with main's landed rm-186 seal (5c9c5d2, the reconcile of stranded
> PR #97; main's file + test gate kept byte-for-byte); rm-187 (truth micro-batch) — CONSUMED (two halves
> pre-fixed by rm-172/rm-129, comment-truthing half landed at this merge, axe half refuted — the dep is
> live in tests/visual); rm-188 (snapshot rehydration) — DEDUPED into main's rm-198 (same decision
> frame). B5 (codeql digest rider) deduped — main already carries the identical digests (rm-191).
> Dispositions are recorded atomically in ROADMAP.md's INTEGRATE-MERGE comment for this merge.

# Prioritization batch 2026-09-25 — repo lineage cycle 13

Provenance: conductor run aaa84dff3f8b47e6aae109047067bf99, prioritize attempt
59485e73049f4d42893cdc21b10ed0c7, repository-maintenance campaign e5f5a04e cycle:1 (engine label).

Lineage numbering (disclosed per convention): engine labels this run cycle-1 of campaign e5f5a04e, but repo
docs carry landed batches cycle 1–12 at origin/main 57a182b (cycle-11 landed 2026-09-25 as 9f1f7ef/57a182b).
Neither open PR claims cycle 13 (PR #113 titles itself cycle-11 and will reconcile with the landed cycle-11
doc on landing; PR #114 is a cycle:1 of its own campaign). Taking lineage **cycle 13** avoids collision at
authoring time; the run id `aaa84dff…` is the disambiguator. This doc is authoritative for this run's
implement phase.

## Live frame re-measurement (stale-base rule)

- `git fetch origin main` this phase (2026-09-25): `origin/main` = **57a182b**, advanced past this run's
  480c92c assess/roadmap base via 9f1f7ef (cycle-11 batch "sentinels that tell the truth": rm-166..169 +
  rm-172 implemented; rm-170/rm-171 minted as candidates; 631 insertions incl. src/server.ts +45,
  src/github/aggregator.ts +8, src/listener/store.ts, base-drift.yaml, and the landed
  docs/prioritization/2026-09-24-cycle-11-batch.md).
- Worktree HEAD stays 480c92c carrying exactly ` M ROADMAP.md` (this run's roadmap deliverable: rm-184..189 +
  signals, built on the 480c92c base — the implement/commit phases reconcile it onto 57a182b per the standing
  integrate protocol) plus untracked `.conductor/`. **All line evidence below derives from the 57a182b tree**
  (truth-scoping rule), not the worktree checkout.
- Two of this run's assess findings are ALREADY FIXED at the live frame — dropped from selection with credit:
  - F5 (per-request `readFileSync` of index.html) — cycle-11's rm-172 landed the async-once cached SPA shell
    with a 5s TTL flip (`SPA_SHELL_CACHE_TTL_MS`, server.ts:841 area). Strictly better than the assess
    proposal (async, no event-loop stall).
  - F6's XFF half (multi-hop key-injection note) — cycle-10's rm-129 comment already covers append-vs-overwrite
    semantics at server.ts:608-617. The residual F6 half (classifyRateLimitPath comment drift) persists at
    server.ts:129 ("Mirrors the isPublicPath knowledge below" while '/' deliberately diverges from
    isPublicPath — the code is right, the comment overclaims).
- **In-flight payloads that gate sequencing (de-dup + order):** PR #45 (943d3ed, still open) owns
  app-client/aggregator transport+cache — sequence-blocks the rm-112/rm-107/rm-119/rm-141 family, not this
  batch (B1's aggregator edit is a registry export around existing template constants; content-reconcilable).
  PR #113 (d6455cdc) owns listener-store/installations (its rm-180/181) — overlaps rm-170 and this run's
  rm-188 design surface, neither selected. PR #114 (5b6e8e80) owns app-client token-expiry + draft-PR
  hygiene. PR #82/#97/#104: base-drift/aggregator visibility payloads, landed-era conflicts already
  reconciled by the cycle-11 landing. No open lineage touches scripts/graphql-canary.ts,
  public/operator-stream.js, .dockerignore, or package.json devDeps for axe.

## Inputs used, not redone

assess 72ca55d3 (F1–F6 with live anchors, re-verified at 57a182b above), research ad53759c (C1–C5 survivors
+ upstream/ecosystem measures), roadmap 51aae06e (rm-184..189 minted above the in-flight ceiling rm-183;
all-lineage audit recorded). This phase adds: live-frame re-measurement, PR inventory (10 open), gated
scoring, and the selection below.

## Gated scoring (impact, risk-to-skip, risk-to-do, effort, dependencies)

Gates: (G1) restores/locks a broken invariant? (G2) completable end-to-end this cycle with hosted-runner CI
evidence? (G3) depends on unlanded or out-of-repo work?

| item | impact | risk-to-skip | risk-to-do | effort | deps | gated |
| --- | --- | --- | --- | --- | --- | --- |
| rm-184 canary coverage-completeness (reliability 76.0; assess F1 + research C1) | 8 — the only live-execution guard for the GraphQL contract covers 1 of 2 shipped templates; the NO_ALERTS variant (aggregator.ts:160, live per-repo fallback at :581) is the exact rm-177 failure class, still able to ship broken with canary + CI + shape-guard all green | 7 — the class has burned one full cycle already; every week the second template runs unexecuted is a week a live-syntax break ships silently | 1 — registry export + canary loop + completeness guard test + workflow_dispatch trigger; additive, no behavior change | S-M | none (PR #45's aggregator hunks are transport/cache; the registry wraps existing constants — content-reconcilable) | PASS |
| rm-114 SSE buffer-cap unit truth (reliability 45.0; run 270220e7 assess, re-verified 57a182b) | 6 — a live shared bug in the trust boundary between server reader and browser parser: `buffer.length` counts UTF-16 code units against the BYTES-named `MAX_SSE_BUFFER_BYTES` (src/gateway/operator-sse-reader.ts:526, twin in public/operator-stream.js) — the cap enforces up to 2x the documented byte bound for astral-plane input | 5 — fail-closed still fails closed (overflow aborts), so the bug is capacity-honesty, not safety; but the documented bound is a lie operators read | 2 — split/rename the constant (units-truthful) or count bytes accurately at both call sites + tests pinning cap semantics on astral input | S | none (no open lineage touches either file) | PASS |
| rm-186 .dockerignore (security 34.0; assess F3) | 5 — every build ships the whole worktree (.git/, .conductor/, node_modules, host stores) to the daemon; COPY discipline is the only guard between context transfer and image content | 5 — image safety currently rests on an untested convention; a future COPY widening or a context-side leak (e.g. a stray .env) has no net | 1 — one new file + dockerfile-context.test.ts extension asserting the guard; zero executable-surface change | S | none | PASS |
| rm-187-residual truth micro (reliability 24.0; assess F6-residual + research C4) | 3 — classifyRateLimitPath's comment overclaims mirroring isPublicPath (server.ts:129) while '/' deliberately diverges; `@axe-core/playwright` devDep (^4.13.0, package.json:32) has zero usages repo-wide — dead weight or unwired intent, undecided | 3 | 1 — comment truth + one recorded decision (wire the a11y scan into the visual suite, or drop the dep); F5 and the XFF-note halves already fixed by rm-172/rm-129 landings | S | none (no open lineage touches package.json devDeps) | PASS (rider) |
| absorb rider — rm-103 standing delta (reliability 85.0 watch; research measure) | 5 — upstream drift sits at 5 dep-only commits (bfra-me/.github v4.33.0 + codeql-action digest + the prior four) at tip eb8ca95, merge-base 0c7489d; the item's whole thesis is that drift recurs by design and must be absorbed while trivial | 4 — drift grows monotonically; the next absorb after this one carries content changes | 1 — merge + `pnpm install --frozen-lockfile` + gates; zero conflict class (dep-only) | S | none | PASS (rider) |
| rm-104 render hardening (98.0) | 7 | — | — | M | G3 fail — fix lives in the fleet hermes-roadmap generator, out-of-repo; house precedent (cycle-12 scored it identically) | NOT selected |
| rm-102 dependabot first-PR (90.0) | 6 | — | — | — | in-progress by design — window opens ~2026-10-03 | NOT selected (waiting on evidence) |
| rm-105 attest/provenance rung (80.0) | 7 | — | — | M | heavier: needs a release fire for end-to-end evidence; deferred six consecutive cycles — flag as aging debt and next-cycle head candidate | DEFER (escalate if deferred again) |
| rm-112 family + rm-107 + rm-119 + rm-141 (75/65/52/47) | 6-8 | — | — | M-L | PR #45 owns app-client/aggregator — sequence-blocked (unchanged since cycle-12's gate; #45 still open 2026-09-25) | NOT selected |
| rm-157 agent v0.115.0 absorb (72.0) | 7 | — | — | M | needs the live gateway (blocked-external mechanics unchanged) | DEFER |
| rm-127 login redirect (56.0), rm-119 HMAC keys (52.0), rm-188 rehydration (52.0), rm-185 session decoupling (44.0) | 5-7 | — | — | M | good queue items; rm-185 is decision-heavy (cache-vs-documented-acceptance) and rm-188 changes its blast radius — sequence rm-185 AFTER rm-188 lands, or take them together in a dedicated cycle | next-cycle head candidates |
| rm-170 mint-fallback caching (40.0, new at 57a182b) | 6 | — | — | S-M | overlaps PR #113's rm-181 surface (installations mint path) — let the landing settle the file first | NOT selected (in-flight overlap) |
| rm-171 PID-1 shutdown hygiene (36.0, new at 57a182b) | 5 | — | — | S-M | standalone-eligible; queued behind B-batch capacity | next cycle |
| rm-189 license/release enrichment (30.0) | 5 | — | — | S-M | deliberately sequenced AFTER B1: its acceptance rides rm-184's registry (canary auto-covers the new fields) — trivial follow-on once B1 lands | next cycle (post-B1) |
| rm-159 sweep with push authority (32.0) | 4 | — | — | S | prohibited this run (push authority) | NOT selected |
| rm-165 fleet convention (26.0) | 3 | — | — | — | conductor-campaign-side, not implementable in this repo | NOT selected |

## Selected batch — cycle 13 (theme: close the truth gaps the landed sentinels left open)

**B1 rm-184 (head) → B2 rm-114 → B3 rm-186 → B4 rm-187-residual rider → B5 absorb rider.**

Rationale: one coherent arc — every item makes a guard, bound, or manifest tell the truth. B1 completes the
verification lattice rm-177/rm-178/rm-179 started (the canary must execute what ships, ALL of what ships);
B2 makes a documented security bound numerically true in both enforcement halves; B3/B4 are the standing
micro-truth pattern; B5 keeps the absorb cadence bounded while drift is still trivial. All five are
additive, unit-testable in-cycle, zero in-flight file collisions, and completable end-to-end with hosted CI
evidence (G2 pass). Total effort ≈ one focused day. Sequencing inside the batch: B1 first (its registry
export is B4's package.json-adjacent guard surface's sibling and unblocks next cycle's rm-189).

Validation plan: B1 — registry export + canary loop + completeness guard test + `workflow_dispatch`;
actionlint on canary.yaml; local canary run executing BOTH templates green (token in env, read-only). B2 —
units-truthful constants + astral-input cap tests on both halves (server suite + web suite). B3 — extended
dockerfile-context.test.ts + lint. B4 — corrected comment + the recorded axe decision (wire-or-drop) with
the decision note in the landing PR body. B5 — frozen-lockfile install + full gates (`pnpm check-types`,
`pnpm lint`, `pnpm test`).

Landing note: this run's ROADMAP.md edit (rm-184..189) rebases onto 57a182b's ROADMAP (which moved 73
lines); PR #113/#114 reconcile by content per convention. Assess F5/F6-halves are recorded as superseded
by rm-172/rm-129 in the landing PR body, not re-implemented.

## Outcomes (2026-09-25, post-validation — compound 596e38a3)

Implemented on the 57a182b frame in the run worktree (implement 04463ee8), then validated twice at
the identical tree: targeted_tests a29dfa6e (ephemeral PR #124) and full_tests a6fa2df2
(full_command verbatim, ephemeral PR #126) — 9/9 checks SUCCESS both times, tree fingerprint
`babab46888804d53` unchanged across both phases.

- **B1 (rm-184)** landed: `REPO_STATUS_QUERY_REGISTRY` in src/github/aggregator.ts, canary iterates
  it (no-token exit-1 contract preserved), workflow step renamed, 2 completeness tests including the
  source-scan guard (rm-177's failure class is now author-time-detectable for every template). Pattern
  recorded in docs/solutions/best-practices/canary-must-execute-whole-family-registry-completeness-guard-2026-09-25.md.
- **B2 (rm-114 units half)** landed: both halves now cap on measured UTF-8 bytes (incremental
  `TextEncoder` counters); astral-plane tests pin both suites. Lesson recorded in
  docs/solutions/logic-errors/bytes-named-buffer-cap-must-count-utf8-bytes-not-utf16-units-2026-09-25.md. Remainder
  (shared-source extraction, multi-data joining) stays open on the item.
- **B3 (rm-186)** landed: .dockerignore + 4-test guard with a linear matcher (secrets excluded from
  context transfer, not just commits).
- **B4 (rm-187)** landed with a correction: the classifyRateLimitPath comment divergence is now
  documented as deliberate; the axe half was **refuted** — `@axe-core/playwright` is live in
  tests/visual/dashboard.spec.ts, so package.json is untouched. The research grep scoped `test/` +
  `web/` and missed the plural `tests/` tree; instance appended to
  docs/solutions/best-practices/binding-doc-consistency-greps-avoid-pathspec-miss-2026-09-20.md.
- **B5** narrowed from 5 commits to 1: live `git merge-base` is 0c7489d (bfra-me #519/#523 touch
  only files the fork deleted or never pinned — no-ops here) and the pnpm bump rides open PR #43 —
  only the codeql-action digest (#524, both steps) was absorbed.

Next-cycle context: rm-189's sequencing gate is open (B1's registry landed); candidate pool is
rm-188 (52.0), rm-185 (44.0), rm-189 (30.0). PR #45 and the rm-112/107/119/141 family — review
correction (2026-09-25, independent review b5bb53f2): PR #45 is the cycle-9 maintenance batch PR
(run 91e4626d), still OPEN with unlanded src/github/* + test deltas, NOT an old dependabot merge;
next-cycle scoring must re-verify whether its lock is truly moot before unblocking that family.
Landing-critical for THIS run: open PR #130 (run f1ae52a3f04b, a parallel cycle-13 batch) already
minted rm-184/rm-185/rm-186 for different content (dockerignore / links-parse guard / ubuntu-24.04
pinning) — this run's new ids must renumber above whichever block lands first, and the duplicated
.dockerignore + test/dockerfile-context.test.ts extensions must reconcile at landing.
