---
date: 2026-09-24
topic: dashboard maintenance cycle 9 — scoring and batch selection (post-763c1fa, PR #23 pending)
mode: delegated-conductor
run: 602f80de571a4b16b8142bab92b6cd05
phase: prioritize
attempt: 562e84ef27014c43ba7b1bf08ed73ab3
skill: ce-plan (scoring/batch selection — no dedicated ce-prioritize skill in the installed router; fleet precedent cycles 1-3, 5-7 used ce-plan identically). Deviations declared: no subagent surface in this session, frames run in-process and disclosed (convention #3768). Label disclosure per the cycle-7 precedent: the engine cycle label is 1 (repository-maintenance:de2fd434 cycle 1); the repo lineage has consumed cycles 1-3 and 5-7 on main, cycle 4 in merged PR #10's lineage, and cycle 8 rides unmerged PR #23 (conductor/run-b9c36244d5ff, head 0334a4e, green on-branch) — so this is lineage cycle 9 and the artifact is named accordingly. The roadmap block marker written by this run's roadmap phase was renamed cycle-6 → cycle-9 this phase for the same reason.
---

# Dashboard maintenance — cycle 9 batch (2026-09-24)

## Live frame facts (re-measured this phase, not carried stale)

- `origin/main` = `763c1fa` (authoritative via `git ls-remote`, fetched fresh this run); worktree base `7809df6` sits 14 commits / 38 files behind. **Main is RED**: the tracked `.conductor/progress/70f231743fbd4e3a….ndjson` still fails the rm-131 guard; PR #23 (the validated fix; Main green on its branch 2026-09-23T18:39Z) remains unmerged — landing it is the single highest-value action available to the engine, but it belongs to this run's commit/land gates, not this batch's implement surface.
- **Merge-surface drift audit for every candidate file** (this phase, `git rev-parse HEAD:<f>` vs `origin/main:<f>`): `Dockerfile`, `src/server.ts`, `src/listener/store.ts` — SAME base..main (edits merge clean); `.github/workflows/codeql.yaml` + `.github/actions/setup/action.yaml` — DRIFT, but `git diff HEAD origin/main --` shows the drift is prose-only (the self-hosted → explicitly-historical comment rewrites), no `uses:` lines changed — one-line SHA swaps auto-merge; `.github/workflows/base-drift.yaml` — ABSENT at base, exists only at main (`df46ef7`) — implementing against main's blob makes ours = main + fix (clean at landing); `src/github/aggregator.ts` — DRIFT (real content divergence) — any aggregator edit this cycle buys a landing conflict.
- **The weekly base-drift check is broken (rm-155, new this run)**: its only run (35735049832, 2026-09-22) failed with an EMPTY live digest — `base-drift.yaml:39` pipes `docker manifest inspect` JSON into an `awk '/^Digest:/'` that can never match (that line form belongs to `docker buildx imagetools inspect` pretty-dump, per the 18a1ee6/#3317 lineage). Next scheduled fire **2026-09-29** re-reds falsely.
- **Digest-kind nuance for B1**: cycle-7's frame (2026-09-22) recorded "registry HEAD == pinned `0e0ff40`" (self-resolved), while this run's research (2026-09-24) parsed the live index JSON and measured the **amd64 platform manifest digest `5cbc7cab`** ≠ pin. Either the base rotated again after 2026-09-22, or cycle-7 compared a different digest kind (index vs platform). B1's acceptance therefore requires deciding and documenting WHICH digest kind the pin and the check compare — both must be the same kind, measured the same way, locally reproducible.
- CI pin currency re-measured this run (SHA→tag via `gh api repos/<o>/<r>/git/refs/tags`): every action pin at main is at its latest tag EXCEPT codeql-action `1c5b675` (2.27.0-bundle line; latest 2.27.1 published 2026-09-22) and pnpm/action-setup `0977fd9` (`.github/actions/setup/action.yaml:19`, labelled "# v6" but matching NO tag; latest v6.1.0 published 2026-09-05).
- Local gates at this tree (assess phase, 2026-09-24): lint 0, check-types 0, 3115/3115 (2037 server + 1078 web), `pnpm audit --prod` 0; gates green at base even while main runs red — the red is the tracked-ndjson guard, not code.
- Upstream drift is 2 commits: e51b480 (renovate.yaml no-op for the fork — file deleted here) and f35e281 (pnpm 11.27.1; fork absorb needs the 3-site sync + the rm-131 guard assertion moved — the guard test lives only at main, so the absorb is sequenced after #23 lands).
- Roadmap state: this run's roadmap phase added rm-155..rm-161 + signal refreshes to rm-103/rm-108/rm-120 in the worktree ROADMAP (uncommitted, rides the landing by explicit staging per #3256). Branch/PR pile: 10 open PRs (8 purpose-complete ci-validation), 20 `conductor/*` branches — rm-158's reaper material, deferred below.

## Five-axis scoring (1–5; Effort 5 = cheapest; Dep-free 5 = no external landing dependency)

| Ref | Impact | Delay | Effort | Dep-free | Strategic | Total | Standing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| rm-155 repair base-drift detection (+re-pin) | 5 | 5 | 4 | 5 | 4 | 23 | SELECTED B1 (anchor) |
| rm-157 graceful shutdown SIGTERM/SIGINT + store close | 4 | 3 | 4 | 5 | 4 | 20 | SELECTED B3 |
| rm-160 CI pin micro-batch 2 (codeql 2.27.1, pnpm/action-setup tag) | 3 | 4 | 5 | 5 | 3 | 20 | SELECTED B2 |
| rm-161 codify residue-sweep scope (docs/ideation) | 2 | 2 | 5 | 5 | 2 | 16 | SELECTED B4 (docs-only rider, droppable last) |
| rm-107 + rm-119 composed status surface | 4 | 3 | 2 | 5 | 4 | 18 | DEFER (feature track; strongest next-cycle code pick) |
| rm-116 branch protection + drift alert | 4 | 4 | 3 | 2 | 4 | 17 | DEFER (stewardship/API action) |
| rm-156 snapshot persistence | 5 | 2 | 2 | 3 | 4 | 16 | DEFER (aggregator.ts DRIFT base..main; M-L effort — post-#23 cycle) |
| rm-105 SBOM + provenance | 4 | 2 | 2 | 4 | 4 | 16 | DEFER (Release churn; needs live Release proof) |
| Node 26 / majors (rm-108 trigger dates now concrete) | 3 | 1 | 4 | 5 | 3 | 16 | DEFER (date-gated 2026-10-28; v24 maintenance starts 2026-10-20) |
| rm-158 conductor branch/PR reaper | 4 | 2 | 3 | 2 | 4 | 15 | DEFER (dry-run verification needs a live workflow dispatch = CI-gated; shipping an auto-closer while PR #23 sits unmerged is poor sequencing) |
| rm-159 repository:null flagging | 3 | 2 | 3 | 3 | 3 | 14 | DEFER (aggregator.ts DRIFT) |
| pnpm 11.27.1 upstream absorb (rm-103 signal) | 2 | 2 | 4 | 2 | 3 | 13 | DEFER (rm-131 guard assertion lives at main; absorb after #23 lands) |
| rm-106 listener digest push | 4 | 3 | 1 | 2 | 3 | 13 | DEFER (gateway send path absent upstream — re-verified v0.79–v0.115 this run, zero push/VAPID mentions) |
| rm-102 dependabot first-PR proof | 3 | 1 | 3 | 1 | 3 | 11 | DEFER (external clock ~2026-10-03) |

Selection rule (fleet's proven shape, cycles 2/3/5–7): one anchor + riders with **zero file overlap** against the anchor and each other, ordered so changed-in-both files are reworked only after the anchor lands. B1 dominates the pool: it repairs the repo's only automated base-image security signal, carries a hard deadline (the 2026-09-29 weekly fire re-reds falsely without it), is the cheapest per unit of recovered signal, and its entire surface is either byte-identical base..main (Dockerfile) or main-only (base-drift.yaml — ours-after-checkout wins the union). B2 shares the workflow family but disjoint files. B3 is the highest-impact CODE item whose file (`server.ts`) is byte-identical base..main — conflict-free by construction. B4 is docs-only. Nothing selected touches `src/github/aggregator.ts` — the one real-divergence file — keeping the 14-commit-stale landing a union, not a rework.

## Selected batch — "repair the signal layer, wire the shutdown path"

Four work units, all locally verifiable end-to-end this cycle (actionlint container, lint, check-types, full suite). CI proof at the exact pushed sha belongs to the later gates (#3263); PR #23's landing is the engine-level precondition recorded in the standing rules, not an implement item.

### B1. Repair base-drift detection before the 2026-09-29 fire (rm-155; anchor)

Start from main's blob (`git checkout origin/main -- .github/workflows/base-drift.yaml`, `df46ef7`), then fix the extraction: parse the JSON index (`docker manifest inspect node:24-slim` → `manifests[]`), select the linux/amd64 platform digest (jq or python3), and fail LOUDLY — `::error` + non-zero exit — when the live digest is empty or unparseable, never comparing pins against an empty string. Decide and document (workflow comment) whether the check and the Dockerfile pins compare platform digests or index digests — same kind, measured identically; note the cycle-7 "registry HEAD == pin" vs this run's "amd64 platform digest ≠ pin" discrepancy explicitly. Re-pin `Dockerfile:1`, `:21`, and `:39` (builder, prod-deps, runtime — all three stages; `0e0ff40…` → the then-live digest of the chosen kind, `5cbc7cab…` for amd64 as measured 2026-09-24; re-measure at implement). Dependabot stays the bump owner afterward (rm-102 discipline); the check never bumps.

IMPLEMENTED 2026-09-24 (attempt 3939d404) — with the digest-kind question resolved AGAINST the batch doc's literal instruction, by measurement: `docker buildx imagetools inspect node:24-slim` prints `Digest: sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6` == the Dockerfile pin, so the pin is (and cycle-7's "registry HEAD == pin" was) the INDEX digest; the "amd64 platform digest ≠ pin" discrepancy that motivated the planned re-pin was a KIND MISMATCH — platform manifests churn beneath a stable index (live amd64 read `a27ffd2b…` at 2026-09-24 18:36Z vs the `5cbc7cab…` the research phase measured ~13h earlier, same stable index), and `FROM tag@sha256:…` resolution plus dependabot's bump semantics both use the index digest. Decision: **check and pins both use the index digest, measured identically via the buildx pretty-dump `Digest:` line — no re-pin** (no drift in the chosen kind; Dockerfile untouched; dependabot stays the bump owner per rm-102). Fix landed: capture-then-parse (NOT `buildx | awk … exit` — buildx v0.30.1 exits 255 on the reader's early close, which `set -euo pipefail` turns into a false red; verified live: `pipe-status=255 0`), plus the loud `::error`-and-fail guard for empty/unparseable extraction. Base-drift.yaml = main's blob + extraction fix + header-comment digest-kind record (diff touches only those lines).

- acceptance: MET with the documented deviation — workflow = main's content + fix (diff shows only extraction/guard/comment lines); Dockerfile re-pin SUPERSEDED by the measured kind decision (pin == live index digest; all three stages stay 0e0ff40); empty-extract path fails `::error` non-zero (logic identical to the workflow step, locally executed); `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:latest -no-color` exit 0; the full fixed step body reproduced locally under `set -euo pipefail` → `current` ×1, `no drift`, exit 0.
- evidence: local run: `bash /tmp/b1-drift-step.sh` → `live node:24-slim index digest: sha256:0e0ff40…` / `pinned digest: sha256:0e0ff40…` (×1) / `no drift`, exit 0; `docker buildx imagetools inspect node:24-slim | head -3` → `Digest: sha256:0e0ff40…`; actionlint exit 0 repo-wide; workflow diff in the landing PR.

### B2. CI pin micro-batch 2 (rm-160; workflow-family rider)

Advance pnpm/action-setup (`.github/actions/setup/action.yaml:19`, `0977fd9…` labelled v6, matches no tag — a 2026-08-03 docs commit between tags) to the v6.1.0 release commit `ea17c68d…` (DONE at implement: SHA→tag readback `gh api repos/pnpm/action-setup/git/refs/tags/v6.1.0` → commit `ea17c68df8912ef543352723c149a84f56e3d413`, `releases/latest` = v6.1.0; comment updated to `# v6.1.0`). STAY DECISION for codeql-action (`init`/`analyze` at `.github/workflows/codeql.yaml:48,54`, SHA `1c5b675`): the plan-time 'advance 2.27.0→2.27.1' rested on a conflation — 2.27.x are CodeQL CLI *bundle* releases (`codeql-bundle-v2.27.1` is that repo's latest release), while the v2.27.x *action* tags are 2024 backports (tag commit e96cea3 dated 2024-11-08) — bumping would be a two-year downgrade. The action pin `1c5b675` IS the current v4.x tag (v4.38.1, 2026-09-18; newest tag in the repo's v4 line). No codeql change; `SEMMLE_TYPESCRIPT_HOME` job env untouched.

- acceptance: pnpm/action-setup at a tagged release with SHA→tag readback (commit SHA == workflow SHA); codeql-action stay decision recorded with the bundle-vs-action evidence; no other lines in either file change beyond the SHA + version comment; actionlint exit 0 on both files.
- FULL_TESTS RIDER (2026-09-24, added at the full_tests gate, not implement): `.github/workflows/main.yaml` pull_request filter widened `branches: [main]` → `[main, 'conductor/ci-base-**']`. Without it, hermes-conductor's ephemeral validation PRs (base `conductor/ci-base-*`) register ZERO checks — the full_command route was a structural dead-wait (0-check PR #51 measured; run 35942929312's 6/6 green on PR #58 after the rider is the proof). For `pull_request` events GitHub evaluates the workflow file at the merge ref, so the head-side edit takes effect on the ephemeral PR itself. Proven live: full_command → `{"ok": true, "pr_number": 58, mode: ephemeral-pr}`. Visual stays path-filtered off ephemeral PRs (batch touches none of its paths); codeql/dependency-review remain `branches: [main]` — Main is the suite the validator needs. When this lands on main it also un-blocks every future cloud validation fleet-wide.
- evidence: `gh api` readback outputs; two-file diff; actionlint exit 0.

### B3. Wire graceful shutdown (rm-157; code rider)

`src/server.ts` registers SIGTERM/SIGINT handlers in the server entry: stop accepting, close the listener store (its SQLite handle benefits from a clean close), flush logs, exit 0 within the docker 10s grace. Drain policy for in-flight requests: bound-wait then force (document the chosen bound in a comment). AGENTS.md ops note names the contract.

IMPLEMENTED 2026-09-24 (attempt 3939d404): `registerGracefulShutdown(deps)` exported from `src/server.ts` and called in `createDashboardServer` with the real server/listenerStore/stopAggregator (replacing the dead aggregator-only `close` listener that could never fire). First SIGTERM/SIGINT: stop accepting (`server.close`), guarded teardown of aggregator + listener store, bounded 10s drain (unref'd timer) then exit 0; second signal forces immediate exit. All collaborators are injected narrow structural types (`ShutdownClosableServer`/`ShutdownClosableStore`/`ShutdownSignalTarget`) so `test/graceful-shutdown.test.ts` exercises the path with a fake process — 5 tests: registration+disposer, ordered drain teardown + exit 0, drain-timeout force exit, double-signal, teardown-throws resilience. AGENTS.md ops note names the contract (docker stop needs no override).

- acceptance: MET — `grep -n SIGTERM src/server.ts` hits the registration; the shutdown-path test runs without real signals (handler invoked directly against stubs); `pnpm check-types` exit 0, `pnpm lint` exit 0, focused tests 54/54 (5 new + server 44 + guard 3 + dockerfile-context 1); full suite reserved for the landing gate (file was byte-identical base..main pre-edit, so the edit lands conflict-free).
- evidence: `src/server.ts` diff (helper + wiring + export); `test/graceful-shutdown.test.ts` (new); vitest output 5/5 + impacted 49/49; gates green.

### B4. Codify the residue-sweep scope (rm-161; docs-only rider, droppable last)

Decide and record: the 5 `wiki-writer` hits in `docs/ideation` are intentional historical references → extend the codified sweep command's exclusion set to `docs/ideation` (alongside `docs/solutions`, `docs/prioritization`) with the rationale written next to the command — OR rewrite the 5 hits to neutral read-only wording and keep the sweep strict. DECIDED at implement (2026-09-24): **exclusion + rationale**, landed as a NEW solutions doc — `docs/solutions/best-practices/fork-exclusion-residue-sweep-scope-historical-doc-trees-2026-09-24.md` — because the premise "the codified sweep command (solutions doc, 2026-09-23)" was FALSE: no sweep-command doc exists at origin/main (`git grep` for the command forms returns only prose narratives; the #3255 memory's codification never landed as a doc). The new doc codifies the canonical repo-wide no-filter sweep with the leaf-name `--exclude-dir` form (path-form silently excludes nothing — verified live), excludes the three historical doc trees, and classifies the verified corpus including the two enforcement-guard test files and ROADMAP's ledger narration as the only intentional hit sites outside the trees. The 5 ideation hits stay untouched (dated research provenance).

- acceptance: MET — one truth recorded (exclusion-set extension with rationale in the sweep doc); the codified command re-run returns only the intended historical + enforcement/ledger set (10 hits outside the trees, all classified in the doc's corpus table: 5 guard-test + 1 dockerfile-context + 4 ROADMAP — all intentional); the guard family's code/config/CI scope is NOT loosened.
- evidence: new solutions doc; `grep -rn 'wiki-writer' . --exclude-dir={.git,node_modules,web/dist,.agents,.conductor,solutions,ideation,prioritization}` → 10 hits, all in `test/fork-exclusion-guard.test.ts`, `test/dockerfile-context.test.ts`, `ROADMAP.md`; fork-exclusion guard green at landing gates.

## Deferred with reasons (not re-argued next cycle — carry the rationale)

- **PR #23 landing** — engine-level sequencing (commit/land gates of this run), not an implement item. Recorded as the run's top recommendation: land #23, re-base, then this batch's union merge.
- **rm-156 / rm-159** — both edit `src/github/aggregator.ts`, the one file with real content divergence base..main; doing them in a 14-commit-stale worktree converts a union landing into a rework. Strong picks the cycle after #23 lands.
- **rm-158 reaper** — its dry-run report is only provable via a live workflow dispatch (CI-gated, unavailable to implement); and an auto-closing bot shipping while the pile-hiding fix PR sits unmerged is exactly the wrong first act. Re-score next cycle with the dispatch as the acceptance's first evidence.
- **pnpm 11.27.1** — the rm-131 guard assertion (`11.27.0`) lives at main only; the absorb must move the guard in the same change, which requires main's tree. Post-#23.
- **Node 26 / majors** — date-gated (v26 LTS 2026-10-28; v24 maintenance 2026-10-20); rm-108's refreshed matrix carries the trigger dates.
- **rm-105 SBOM, rm-107/119 status surface, rm-116 protection, rm-106 push, rm-102 dependabot proof** — unchanged standing from cycles 5–7: Release-churn proof, feature track, stewardship action, gateway dependency, external clock respectively.

## Standing rules for implement

1. Stage explicitly — modified tracked files + intended new docs; NEVER `git add -A`/`git add .` (#3256: `.conductor/` breadcrumbs must never ride a commit; after any merge, `git ls-files .conductor` must end empty).
2. B1 starts from main's `base-drift.yaml` blob — do not hand-recreate it.
3. Keep every selected-file edit disjoint from the other batch items' files (the zero-overlap selection is the landing safety).
4. `pnpm lint` after any ROADMAP/docs prose edit (markdown lint reads these files — the rm-104 fleet-render precedent).
5. The roadmap block marker for this run's items is `cycle-9 extension` (renamed from a mislabeled cycle-6 this phase); statuses of rm-155..rm-161 flip to in-progress/completed with evidence as implement lands each item.
