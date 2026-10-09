---
date: 2026-10-09
topic: dashboard maintenance cycle 2 — scoring and batch selection
mode: delegated-conductor
run: 5989eb976c8b45cb9dc9fb4149142801
phase: prioritize
attempt: 38194d53086f4259bb97ef7c6455c1f4
skill: ce-plan (scoring/batch selection — no dedicated ce-prioritize skill in the installed router; fleet precedent hermes-infra cycle-16). Deviations declared: no subagent surface in this session, research/flow frames run in-process and disclosed (convention #3768); interactive gates replaced by autonomous adjudication per work order.
---

# Dashboard maintenance — cycle 2 batch (2026-10-09)

## Inputs

- This run's assess (attempt `e96aa01f`): four fresh findings at HEAD `364272b` — F1 non-push `/` shell cache gap, F2 rm-487 waitFor flake, F3 SSE-reader watchdog absence, F4 `parseSseRecord` data-line handling; all gates green locally and CI all-green at the same sha (run 37871813176).
- This run's research (attempt `50f06116`): upstream absorb window re-measured (15 commits/45 files, mostly content-satisfied), agent v0.118.3 contract-unmoved datum, dep drift table, Node 26 `lts=False`, audit-fire dissection.
- This run's roadmap (attempt `a1bbd405`): minted `rm-818`..`rm-821` above the all-lineage ceiling (standing wall max `rm-805` at run-8dd690c85b50; transient rm-815/817 template claims in run-1930644a996e's wall left `rm-806..817` as margin); ledger at 249 defs / 0 dups / max `rm-821`, guard pin 821.
- Prior-phase artifacts under `/tmp/assess-*` and `/tmp/assess-research-notes.md`.

## Live frame facts (re-measured this cycle, not carried stale)

- Fork tip `364272b` == `origin/main` (`git ls-remote origin main`, 2026-10-09); CI all-green at the exact sha.
- Main-ledger selected-baseline: `git show HEAD:ROADMAP.md | grep -c 'status: open (selected'` => 0 — no landed selections to normalize away; this batch's flips are the only ones in the tree.
- Fleet (per-campaign conductor.db, runs/archived_runs): lanes with unlanded same-hour walls are 1930644a996e (transient template state observed, wall reset to base at re-probe; named in the roadmap header for integrate pairing), 8dd690c85b50 (`rm-805` standing wall), d8fdf8b79ad5 (`rm-803`, status running per db), 38e728540707 (`rm-797` claims), 405e9004 (rm-108's action-bump batch, workflows surface).
- No lane claims `rm-818`..`rm-821` (id-extract over every `run-*/ROADMAP.md` claim scan); no live lane's CURRENT batch doc (all dated <= 2026-10-04) claims any of this batch's files.
- Scheduled gates due Monday 2026-10-12: audit 03:37Z (expected green — cured at HEAD), base-drift 04:13Z (expected green — digest verified), cve-tripwire 06:53Z (red by construction until the rm-755/rm-793 double-claim reconciles — NOT this batch's scope).

## Selection floor (five-axis scoring; Effort 5 = cheapest; Dep-free 5 = no external landing dependency)

Only items passing all disposition gates scored; every higher-priority open/candidate item is dispositioned in Claimed-and-excluded below.

| Ref | Impact | Delay | Effort | Dep-free | Strategic | Total | Standing |
|-----|--------|-------|--------|----------|-----------|-------|----------|
| rm-818 non-push shell cache policy | 4 | 5 | 5 | 5 | 4 | 23 | PASS — batch |
| rm-819 rm-487 waitFor hardening | 4 | 4 | 5 | 5 | 3 | 21 | PASS — batch |
| rm-820 SSE reader parity | 3 | 4 | 3 | 5 | 4 | 19 | PASS — batch |
| rm-821 in-range dep refresh cycle | 3 | 2 | 4 | 2 | 3 | 14 | DEFER — mcr triple-probe + baseline regen for the playwright half; lockfile churn muddies a code batch |
| rm-675 vulnerability-page copy (20.0) | 2 | 2 | 4 | 5 | 2 | 15 | DEFER — below floor on impact |
| rm-659 hazard-scan false-positive ledger (36.0) | 2 | 3 | 3 | 4 | 2 | 14 | DEFER — bookkeeping-only value this cycle |

## Claimed-and-excluded (congestion audit — every top candidate's owner or defer reason)

- `rm-104` (98.0, open): DEFER — defect lives in the upstream-managed `roadmap-sync[bot]` render (generator out-of-repo); third-recurrence tracking only.
- `rm-279` (96.0, open): DEFER — cured pathology with a stale priority score; nine consecutive lint successes since 2026-10-06, remaining scope is prevention-only per rider.
- `rm-103` (85.0, open): DEFER — absorb-cadence automation framework; rides `rm-252`'s decision (due 2026-10-13) and is multi-cycle by shape.
- `rm-252` (80.0, open): DEFER — absorb DECISION not due until 2026-10-13; residual payload (action bumps #580/#588/#589) file-overlaps the 405e9004/rm-558 sibling claims on `.github/workflows/`; agent pin rides its window.
- `rm-703` (76.0, open): DEFER — landed-by-content residue (rm-691 + rm-708 lineage); needs fold disposition, not selection.
- `rm-282` (74.0, open): DEFER — override-floor refresh is gated on the Monday 2026-10-12 scheduled audit fire (expected green; verify-then-fold).
- `rm-249` (72.0, open): DEFER — push-only service worker blocked on upstream gateway contract push privacy policy (#496).
- `rm-117` (70.0, open): DEFER — security-posture panel is a medium-large feature (GraphQL fields + UI); next-cycle candidate after this batch's hardening lands.
- `rm-149` (66.0, open): DEFER — PKCE S256 pairs with `rm-281` (62.0) as a security-focused batch; auth-surface risk belongs in a dedicated cycle, not a tail rider.
- `rm-107` (65.0, open): DEFER — system-status panel feature build (effort).
- `rm-162` (60.0, open): DEFER — self-throttled by the 2026-10-05 rider (implement pipeline constraint per absorb-window discipline).
- `rm-108` (60.0, open): DEFER — pins-cadence gate rides `rm-133`'s 2026-10-21 ignore-block re-eval (typescript-eslint peer re-probe due there).
- `rm-116` (58.0, open): DEFER — branch-protection fill deliberately queued behind check stabilization (six empty-shell re-probes); Monday's red-by-construction cve-tripwire fire makes now the wrong moment to enforce.
- `rm-821` (45.0, candidate): DEFER — see floor table; registry half eligible but the def's acceptance bundles the playwright gate.
- cve-tripwire NODE_IMAGE mismatch: NOT selectable here — owned `rm-755` (this lineage) / `rm-793` (dead sibling lane double-claim); reconcile by content at integrate, no third mint.

## Selection risk

- Three small diffs across `src/server.ts`, `web/src/App.test.tsx`, `src/gateway/operator-sse-reader.ts` (+ fixture/test files) — no shared file with any live lane; id space collision-free and verified.
- rm-818's cache-policy choice (`no-cache` vs `no-store`) is a behavior decision for returning operators; either satisfies the def, the implement phase must record which and why.
- rm-820's watchdog must not change the pinned 1.6.0-1.8.0 contract behavior — test-locked shapes guard it; multi-line `data:` join is latent-only.
- rm-819 must harden without masking real regressions (timeouts raised, not assertions weakened).
- Residual: rm-487-family flake remains CI-visible until rm-819 lands; acceptable (CI green at HEAD).

## Verification

- Def-lines flipped to `status: open (selected 2026-10-09, run 5989eb976c8b cycle:2 prioritize 38194d53086f4259bb97ef7c6455c1f4, 'shell-cache-waitFor-sse-parity hardening')` on `rm-818`/`rm-819`/`rm-820`; mint provenance moved verbatim into each selection rider with a pointer left in the def-line.
- `rm-821` unflipped (deferred with reason above).
- Post-edit battery: `node scripts/roadmap-census.ts` (census unmoved: 249 defs / 0 dups / max `rm-821`), `vitest run test/roadmap-integrity-guard.test.ts test/roadmap-length-guard.test.ts`, `eslint ROADMAP.md docs/prioritization/2026-10-09-repository-maintenance-cycle-2-batch-run-5989eb976c8b.md`.
- Selection edits move no def-lines, so the integrity-guard pin stays 821 (bump-on-next-mint only).
