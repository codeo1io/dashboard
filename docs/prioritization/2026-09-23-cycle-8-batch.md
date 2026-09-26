---
date: 2026-09-23
topic: dashboard maintenance cycle 8 — scoring and batch selection (post-763c1fa)
mode: delegated-conductor
run: b9c36244d5ff4ee4aea0f6282597d3f5
phase: prioritize
attempt: 90f487f27059404488d2fe05d3e4ab6e
skill: ce-plan (scoring/batch selection — no dedicated ce-prioritize skill in the installed router; fleet precedent cycles 1-3, 5, 6, 7 used ce-plan identically). Deviations declared: no subagent surface in this session, frames run in-process and disclosed (convention #3768). Label disclosure per cycle-7 precedent: the engine cycle label for this run is 1 (requirement a1b5ee09970244d595679ee8c2d031f2:cycle:1) but the repo lineage has consumed cycles 1, 2 (+batch-2 re-scope), 3, 5, 6, and 7 on main (4 and 6 arrived late via the stranded PRs #9/#10, both landed by 27b046a/c4404af/763c1fa) — so this is lineage cycle 8 and the artifact is named accordingly.
---

# Dashboard maintenance — cycle 8 batch (2026-09-23)

## Live frame facts (re-measured this phase, not carried stale)

- `origin/main` = `763c1fa` (2026-09-22, merge of run f11b7255) — the cycle-7 batch is fully landed; this run's assess confirmed it (all eight cycle-7 pending-landing statuses verified at tip during the roadmap phase).
- **Worktree state gates the cycle**: run branch HEAD `7809df6` is 14 behind `origin/main` with 1 divergent local commit whose intent duplicates PR #12's landed content (`git rev-list --count HEAD..origin/main` → 14, `origin/main..HEAD` → 1). Every selected code item touches files that differ between HEAD and main (`src/github/aggregator.ts`, `test/aggregator.test.ts` per `git diff --name-only HEAD origin/main -- src/ test/`), so a P0 sync is a hard prerequisite, not an option.
- **All selected defect sites re-verified LIVE at `origin/main` this phase** (not at the stale worktree HEAD): `entry.private === true` strict discriminator at `src/github/metadata.ts:286`; `redactedDatabaseIds: ReadonlySet<number>` at `metadata.ts:89,274` consumed via `.has()` at `src/github/aggregator.ts:416`; ingest re-unread upsert (`read_at = NULL` in `updateByIdStmt`) at `src/listener/store.ts:89-96`; unused `expiresAt` seam (55-min default) at `src/github/installations.ts:147-148` with zero feeders in `src/github/app-client.ts`; `denylistComplete` forced false on any `R_`-prefixed node_id regardless of an explicit `database_id` at `aggregator.ts:357,364-366,701`; `playwright.config.ts:24` comment references `.github/workflows/visual.yml` (file is `visual.yaml`); `GATEWAY_OPERATOR_TRUSTED_PROXIES` has zero hits repo-wide at main.
- Upstream is fully absorbed (52 ahead / 0 behind; upstream tip `0c7489d` is an ancestor of `763c1fa`; zero open upstream PRs) — nothing is absorb-blocked and there is no absorb candidate this cycle.
- Gateway (`fro-bot/agent`) at v0.114.1; the repo's workflow pin already matches (`fro-bot.yaml:337`). Operator-touching deltas since the vendored contract citations (`operator-client.ts:154` cites v0.72.0; `operator-stream.d.ts:23` cites v0.76.2): trusted-proxy requirement (v0.114.1, PR #1651), background-subagent lifecycle with an incomplete-invocation state (v0.114.0), POST /operator/dispatch (v0.106.0 — a write path, observability-only on absorb per the fork invariant).
- Local gates at the worktree base (assess phase): check-types 0, lint 0, 3115/3115; main carries rm-126's +1 lock test → expect **3116** as the pre-batch count after P0, plus this batch's new tests.
- The worktree carries this run's uncommitted ROADMAP.md update (+200/−38, 56 ids, cycle-8 extension rm-149..rm-154) from the roadmap phase — it rides the landing by explicit staging (#3256), exactly the cycle-7 carrying rule.
- External clocks unchanged: dependabot first-PR proof owed ~2026-10-03 (rm-102); base-drift.yaml's first scheduled weekly run pending since landing 2026-09-22 (rm-123); Scorecard Maintained self-resolves ~2026-11-08; Node 26 LTS window opens 2026-10 (rm-138).

## Five-axis scoring (1–5; Effort 5 = cheapest; Dep-free 5 = no external landing dependency)

| Ref | Impact | Delay | Effort | Dep-free | Strategic | Total | Standing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| rm-151 int64-safe denylist membership (upstream #1513 precedent) | 4 | 4 | 4 | 5 | 4 | 21 | SELECTED B1 (anchor) |
| rm-150 gateway v0.114.1 trusted-proxy runbook pairing | 3 | 4 | 5 | 5 | 4 | 21 | SELECTED B4 (droppable last) |
| rm-152 private-flag quoted-string fail-open | 3 | 4 | 5 | 5 | 3 | 20 | SELECTED B2 |
| rm-154 hygiene batch 4 (ingest replay re-unread, expiresAt seam, R_ false-warn, visual.yaml ref) | 3 | 4 | 4 | 5 | 2 | 18 | SELECTED B3 |
| rm-149 OAuth PKCE (S256) | 4 | 3 | 2 | 5 | 4 | 18 | DEFER (largest surface in pool — auth-focused cycle next, paired with rm-104 audit-log parity and rm-127 topology note) |
| rm-120 instance: absorb v0.114.1 contract citations + incomplete-invocation state | 3 | 3 | 3 | 5 | 4 | 18 | DEFER (pairs with rm-144 property surface as a contract-refresh cycle) |
| rm-153 session-roundtrip caching decision | 3 | 3 | 4 | 5 | 3 | 18 | DEFER (decision deserves a latency measurement, not a rider) |
| rm-105 SBOM + provenance | 4 | 2 | 3 | 4 | 4 | 17 | DEFER (needs live Release run proof; workflow-cycle headliner candidate) |
| rm-112 aggregator degradation semantics | 4 | 3 | 2 | 5 | 3 | 17 | DEFER (decision-heavy; operator-view work with rm-107) |
| rm-116 branch protection + drift alert | 4 | 4 | 3 | 2 | 4 | 17 | DEFER (stewardship action; strong next-cycle pick — unblocks rm-146) |
| rm-141 bounded-concurrency fleet refresh | 3 | 2 | 3 | 5 | 3 | 16 | DEFER (no live pressure; main already carries aggregator churn) |
| rm-144 SSE/listener property tests | 3 | 2 | 3 | 5 | 3 | 16 | DEFER (pairs with rm-120 refresh) |
| rm-104 render-hardening guard test (repo-side) | 3 | 2 | 4 | 1 | 3 | 13 | DEFER (generator external; repo-side guard noted as first alternate) |
| rm-102 / rm-103 | 3 | 1 | 3 | 1 | 3 | 11 | DEFER (external clock / dormant — upstream delta 0) |
| rm-106 / rm-146 / rm-147 | 3 | 2 | 3 | 1 | 3 | 12 | DEFER (blocked-external: gateway send path, license) |
| rm-108 / rm-138 / rm-139 majors matrix | 3 | 1 | 4 | 5 | 2 | 15 | DEFER (time-gated; research data already folded into rm-108's signals) |
| rm-114 / rm-115 / rm-127 / rm-129 | 2 | 2 | 3 | 5 | 3 | 15 | DEFER (dormant feature/topology track) |
| rm-123 base-drift first run | 2 | 3 | 5 | 1 | 3 | 14 | WATCH (scheduled run owed ~2026-09-29; capture evidence when it fires) |
| rm-126 /api/monitoring consumer decision | 1 | 2 | 4 | 5 | 2 | 14 | DECIDE (D1 below — recorded, implementation deferred) |

Selection rule (fleet's proven shape, cycles 2/3/5/6/7): one anchor + riders with zero file overlap against unrelated surfaces, ordered so shared-file items are reworked in sequence after the P0 sync. B1 anchors because it is the only pool item with a live external precedent (fro-bot/agent v0.107.1 PR #1513 — `Set<number>.has(bigint)` silently false in exactly this denylist shape) and it hardens the repo's own invariant-2 (redaction). B2/B3 are the same-invariant and operator-state-truth follow-ons found by THIS run's fresh assess; B4 captures the v0.114.1 deployment contract while the release note is days old, at docs-only effort. Everything riskier (auth flow, workflows/Release, operator view) stays deferred with named pairings — this cycle's batch is fully provable by local gates (check-types, lint, test) end-to-end, which the 14-behind worktree makes the decisive property.

## Selected batch — "redaction-integrity and operator-surface truth (cycle 8)"

Four work units after a mandatory P0 sync, plus one decision record. All units land with local gates green; no CI-dependent acceptance.

### P0. Sync the run branch to origin/main (prerequisite, gates everything)

`git fetch origin && git stash` (protects the unstaged ROADMAP.md update) → rebase or merge onto `origin/main` `763c1fa` → the divergent local commit duplicates PR #12's landed intent: if rebase does not auto-skip it by patch-id, drop it explicitly and verify content equivalence against `aa9937f` → `git stash pop` and confirm ROADMAP.md still shows the cycle-8 extension (56 unique ids, lint clean).

- acceptance: HEAD contains `763c1fa`; `git rev-list --count HEAD..origin/main` → 0; ROADMAP.md modification intact (id count and lint re-verified); suite count at the synced tree is 3116 (the +1 is rm-126's lock test).
- evidence: `git log --oneline -3`; `grep -oE 'rm-[0-9]+' ROADMAP.md | sort -u | wc -l` → 56; `pnpm test` count 3116 before any B-unit edit.

### B1. Int64-safe denylist membership (rm-151)

Normalize denylist membership so the numeric channel cannot silently miss on type widening: `redactedDatabaseIds` membership checks (aggregator.ts:416 via metadata.ts:89,274) accept both number and bigint forms — a small normalization helper single-sited next to the Set declaration — with a comment citing the fro-bot/agent v0.107.1 PR #1513 precedent (Set<number>.has(bigint) is always false in exactly this denylist shape).

- acceptance: membership checks go through the helper (grep shows no remaining raw `.has()` against `redactedDatabaseIds`); a regression test constructs a bigint database id and asserts the deny still matches (both the node_id-primary and database_id-secondary paths); @octokit/types 17/18 coexistence noted in the comment; full gates green.
- evidence: new tests in `pnpm test` covering the bigint form; grep output at implement landing; helper file/line cited in the batch handoff.

### B2. Private-flag quoted-string fail-open (rm-152)

The redaction discriminator at `metadata.ts:286` (`entry.private === true`) silently classifies a YAML authoring accident (`private: 'true'` quoted) as publicRepos. Accept boolean `true` and the string `true`/`True` (an author who wrote quotes meant private); count any other non-boolean non-`true` value into the existing `skippedMalformedCount` instead of silently passing public.

- acceptance: discriminator handles boolean true, quoted true/True, quoted false, and a nonsense value (malformed-count) — four test cases; a comment warns about the quoted-string hazard at the site; `skippedMalformedCount` semantics from rm-130 preserved.
- evidence: metadata tests in `pnpm test` covering the four cases; single discriminator site verified by grep.

### B3. Hygiene batch 4 (rm-154) — four verified small defects

1. Ingest replay re-unread: the dedupe upsert at `store.ts:89-96` sets `read_at = NULL` on conflict, so a captured-HMAC replayed delivery within the dedup window re-unreads an acked message. Preserve `read_at` on the dedupe-key conflict path; test with a replayed payload against an acked row.
2. Unused expiry seam: `installations.ts:147-148` accepts `expiresAt` but the production mint path never feeds it (zero `expiresAt` references in `app-client.ts`), so the 55-min default always applies. Pass the auth-app `expires_at` through the existing seam; test asserts the cache honors a real expiry.
3. `denylistComplete` false-warn: `aggregator.ts:364-366` forces false on any `R_`-prefixed node_id even when the entry carries an explicit `database_id` (the secondary channel at :416 is then complete). Treat an explicit database_id as sufficient intent — `R_` alone (no database_id) still forces the conservative false and the :701 warn; tests for both shapes.
4. Dead reference: `playwright.config.ts:24` comment says `.github/workflows/visual.yml` — fix to `visual.yaml`.

- acceptance: all four fixed with the named tests; gates green; no behavior change beyond the four corrections.
- evidence: four focused tests in `pnpm test`; grep for `visual.yaml` at playwright.config.ts:24; before/after behavior notes in the batch handoff.

### B4. Gateway v0.114.1 trusted-proxy runbook pairing (rm-150; droppable last)

Capture the deployment contract while fresh: `docs/runbooks/gateway-access.md` documents `GATEWAY_OPERATOR_TRUSTED_PROXIES` (required for operator surfaces behind a reverse proxy from fro-bot/agent v0.114.1 / PR #1651; missing, malformed, or ambiguous forwarding metadata is rejected — fail-closed), the header contract, the pre/post gateway-upgrade verification recipe, and a line in AGENTS.md's gateway topology note pointing at it.

- acceptance: runbook section present and lint-clean; the failure signature (operator surfaces failing closed post-upgrade) written as a symptom-first troubleshooting entry; AGENTS.md cross-reference added.
- evidence: runbook diff + `pnpm lint`; the v0.114.1 release-note citation inline; zero behavioral code change.

### D1. Decision record — rm-126's `/api/monitoring` consumer (owed "next cycle", due now)

Recommendation: **fold `/api/monitoring` into rm-107's composed status surface when that lands; until then keep the endpoint as-is** (authenticated single-operator, drift already count-only per the landed lock test). Wiring a second consumer now would duplicate rm-107's work; deleting it would strand its tests before the composed surface exists. This records the deferred decision rm-126's acceptance asks for; implementation rides rm-107's cycle, and rm-126 can close at the next roadmap refresh citing this section.

## Standing rules for implement

- P0 before any B-unit edit — selected files (`src/github/metadata.ts`, `src/github/aggregator.ts`, `test/aggregator.test.ts`) all differ between the run branch base and main.
- B1 and B2 both touch `metadata.ts`: land B1's helper first, then B2's discriminator, in one coherent edit series (they never conflict with each other's hunks); B3.3 touches `aggregator.ts` after B1's helper is in.
- Stage by explicit file list, never `git add -A` (#3256); `.conductor/` stays untracked; carry the ROADMAP.md update and this batch doc into the landing.
- ROADMAP status flips happen at landing with evidence, per fleet convention (implemented → completed with sha + verification command).
- Expected gates at landing: `pnpm check-types` 0, `pnpm lint` 0, `pnpm test` 3116 + this batch's new tests, all green before the batch is declared done.
