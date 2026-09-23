---
date: 2026-09-24
topic: dashboard maintenance cycle 8 — scoring and batch selection (post-763c1fa)
mode: delegated-conductor
run: 98147a295b5b49188618e82278e440a3
phase: prioritize
attempt: e41000a2e06e434b9cb7607bf453ddd3
skill: ce-plan (scoring/batch selection — no dedicated ce-prioritize skill in the installed router; fleet precedent cycles 1-3, 5-7 used ce-plan identically). Deviations declared: no subagent surface in this session, frames run in-process and disclosed (convention #3768). Label disclosure per #4323: the engine requirement label is cycle:1 (requirement 2dcba07945a940d1ab120b4fea2e73fe); the repo lineage has consumed cycles 1-3, 5, 6, 7 on main plus cycles 4 and 6 stranded-then-landed via PR #10 — so this is lineage cycle 8 and the artifact is named accordingly.
---

# Dashboard maintenance — cycle 8 batch (2026-09-24)

## Live frame facts (re-measured this phase, not carried stale)

- `origin/main` = `763c1fa` and it is **RED**: conductor-landing commit `61fad97` (run 732706238ca8) landed `.conductor/progress/70f231743fbd4e3a82afb82232a13c4d.ndjson` TRACKED, and `test/fork-exclusion-guard.test.ts:81` (rm-131's guard, working as designed) fails the Main Test job at tip (runs 35883003173 at `763c1fa`, 35878320796 at `6e2df14`).
- Run worktree base `7809df6`: dead-end twin of PR #12's branch (same parent `d73fbe7`, differs only by 1 PNG), 14 commits / 37 files behind main — landing without integration guarantees conflicts. Local gates at base: types 0, lint 0, 3115/3115 (`/tmp/dashboard-full-test-98147a29.log`).
- Open PRs (12): **#23** (`conductor/run-b9c36244d5ff`, MERGEABLE/CLEAN) deletes the tracked breadcrumb AND carries run b9c36244's cycle-8 batch — the recovery vehicle exists but is unmerged and unreviewed for its other content; **#10/#13** MERGEABLE/CLEAN but their payloads already landed via `c4404af`/`61fad97` (redundant); **#14/#15** CONFLICTING/DIRTY; seven draft CI-validation PRs (#18,#20,#22,#24,#25,#26,#27, opened 2026-09-23 19:22-22:21Z).
- Upstream drift vs main = **0**: `b8c7982` (eslint 10.11.0) and `0c7489d` (agent v0.114.1) are content-absorbed on main; fro-bot/agent **v0.115.0** rides OPEN upstream PR #521 — not absorbable until upstream merges it (rm-103 signal).
- base-drift detector: its only scheduled run (`5002272643`, 2026-09-22T13:40Z) is red with an **EMPTY** `live node:24-slim digest:` — not real drift (keyless registry API probe this run: HEAD == pinned `0e0ff40`, parity). The step already uses the `docker manifest inspect | awk '/^Digest:/'` form with `set -euo pipefail`, so the empty readback is the unauthenticated Docker-Hub rate-limit signature (rm-123 landed-defect-open).
- `pnpm audit`: 1 high, dev-chain only — toml 4.1.2 <4.2.0 (GHSA-82x6-q7mm-w9cf) via `@opencode-ai/plugin>effect>toml`; `--prod` clean; same in main's lockfile. The overrides family (`brace-expansion`/`fast-uri`/`undici` in pnpm-workspace.yaml) is the in-repo precedent; `minimumReleaseAge: 1440` does not remediate an already-locked advisory.
- No `.dockerignore` exists anywhere in history; local build context measures 394MB; the builder COPYs only `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `web/`, `src/`, `public/` (+ the `node_modules --from` stage) — everything else is dead weight, and `COPY web/ ./web/` bakes any stale `web/dist` into the builder.
- Ecosystem: Node 20 retired from Actions runners 2026-09-23 — main is ALREADY node24-clean (upload-artifact `043fb46d`=v7.0.1 ×2 verified; the v4 floats exist only in this stale worktree base); Ubuntu 26 GA + `latest`-migration announced 2026-09-17 while all 15 hosted `runs-on` ride the rolling alias.
- Worktree carries this run's uncommitted phase artifacts: ROADMAP.md (cycle-8 revision, reconciled to main content) and this batch doc; the research doc sits at `/tmp/dashboard-research-98147a29.md` pending landing under `docs/ideation/2026-09-24-repository-extensions-research-3.md`.

## Five-axis scoring (1–5; Effort 5 = cheapest; Dep-free 5 = no external landing dependency)

| Ref | Impact | Delay | Effort | Dep-free | Strategic | Total | Standing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| rm-149 recover main from tracked residue + landing-protocol doc | 5 | 5 | 4 | 5 | 5 | 24 | SELECTED B1 (anchor) |
| rm-151 toml HIGH override (dev-chain) | 3 | 5 | 5 | 5 | 3 | 21 | SELECTED B2 rider |
| rm-152 .dockerignore (context + stale-dist hygiene) | 3 | 5 | 5 | 5 | 3 | 21 | SELECTED B3 rider |
| rm-123 base-drift readback repair (keyless registry API) | 4 | 4 | 4 | 5 | 4 | 21 | SELECTED B4 rider |
| Carried docs: ROADMAP.md cycle-8 revision + research doc → docs/ideation | 3 | 5 | 5 | 5 | 3 | 21 | SELECTED B5 rider (this run's own artifacts) |
| rm-150 pin hosted runners ahead of the ubuntu-26 flip | 3 | 4 | 4 | 4 | 4 | 19 | SELECTED B6 rider (droppable last; decision fallback recorded) |
| rm-116 branch protection | 4 | 4 | 3 | 2 | 4 | 17 | DEFER (stewardship/API action; unblocks rm-146 — strong next-cycle pick again) |
| rm-153 PR-sprawl + checkout-hygiene sweep | 3 | 3 | 4 | 3 | 3 | 16 | DEFER to post-landing stewardship (gh pr close is a GitHub write, not implementable in-tree; #10/#13 disposition depends on this cycle's landing) |
| rm-112 aggregator degradation semantics | 4 | 3 | 2 | 5 | 3 | 17 | DEFER (decision-heavy, unchanged) |
| rm-105 SBOM + provenance | 4 | 2 | 2 | 4 | 4 | 16 | DEFER (Release churn; needs live Release proof) |
| rm-144 property tests (SSE parsers) | 3 | 2 | 3 | 5 | 3 | 16 | DEFER (next cycle) |
| rm-141 aggregator concurrency | 3 | 2 | 3 | 5 | 3 | 16 | DEFER (perf medium; no live pressure) |
| rm-107 + rm-119 status surface | 3 | 3 | 2 | 5 | 4 | 17 | DEFER (feature track) |
| rm-127 + rm-129 gateway pair | 3 | 3 | 3 | 5 | 3 | 17 | DEFER (topology decision pair) |
| rm-146 dependabot automerge | 3 | 2 | 4 | 2 | 3 | 14 | DEFER (blocked on rm-116 by its own sequencing rule) |
| rm-103 absorb (agent v0.115.0) | 2 | 1 | 4 | 1 | 3 | 11 | DEFER (external clock: upstream PR #521 must merge first; delta is 0 today) |
| rm-102 dependabot first-PR proof | 3 | 1 | 3 | 1 | 3 | 11 | DEFER (external clock ~2026-10-03) |
| rm-106 listener digest push / rm-147 license / rm-104 render / majors rm-108/138/139/140 | ≤4 | 1 | 3-5 | 1 | 2-3 | ≤15 | DEFER (blocked-external or time/hard-gated) |

Selection rule (fleet's proven shape, cycles 2/3/5-7): one anchor + riders with near-zero file overlap against the anchor, ordered so changed-in-both files are reworked once. B1 dominates the pool: it is the only item that repairs a RED main — the green-tip baseline every future cycle's fold-gate and CI-signal work depends on — and its recovery vehicle (deletion + protocol) is fully in this run's control. B2/B3/B4 are the three zero-coupling quick wins the assess and research phases surfaced (the repo's only standing audit high, its 394MB build context, its broken-but-landed drift detector); B5 carries this run's own phase artifacts so they do not strand a second time (cycle-4/6 lesson); B6 pre-empts the announced runner-image flip at trivial cost with a recorded decision fallback.

## Selected batch — "recover main from the tracked-residue red, then close the standing hygiene ledger"

Six work units. One landing event (B1, the run's integrate) then local-verifiable riders; CI proof at the exact pushed sha (#3263).

### B1. Recover main from the tracked conductor residue (rm-149 — anchor)

The landing merge integrates `origin/main` `763c1fa` into this run's branch — which re-introduces the tracked breadcrumb onto OUR side (the recorded ours-side auto-merge trap) — and the landing commit stages its deletion explicitly: after the merge, `git ls-files .conductor` must be swept and any hit `git rm --cached` (file stays on disk untracked), exactly the #3256 protocol. **PR #23 coordination rule**: at landing time, review #23's full payload; if its batch is sound, merging #23 first is preferred (already branch-validated) and our deletion becomes a no-op (both-deleted merges cleanly); if #23 is not merged, WE carry the deletion and #23 is closed superseded with a comment. Either path must end with main green. Second deliverable: the prevention doc `docs/solutions/workflow-issues/tracked-conductor-residue-survives-ours-merge-2026-09-24.md` codifying the post-merge sweep (`git ls-files .conductor` → `git rm --cached`) and the never-`git add -A` staging rule.

- acceptance: at the new main sha, `git ls-tree -r origin/main .conductor/` returns empty AND the landing worktree's `git ls-files .conductor` is empty; Main Test green at that exact sha; PR #23 dispositioned (merged or closed-superseded); the solutions doc present and lint-clean; ROADMAP.md's rm-149 status flipped to completed citing the landing sha.
- evidence: `gh run list` Main at the new tip; the empty ls-tree/ls-files probes; `gh pr view 23 --json state,mergedAt`; `pnpm exec eslint` on the new doc; the ROADMAP.md status diff.

### B2. toml HIGH override (rm-151 rider)

Add `toml@4: '>=4.2.0 <5.0.0'` to the `overrides:` block in pnpm-workspace.yaml (family precedent: brace-expansion/fast-uri/undici) and regenerate the lockfile.

- acceptance: `pnpm audit` → 0 high; frozen-lockfile install green; full suite green; lockfile diff shows toml@4.2.x resolved.
- evidence: audit output before/after; `pnpm install` and `pnpm test` logs; `grep toml pnpm-lock.yaml`.

### B3. .dockerignore (rm-152 rider)

Add `.dockerignore` covering `.git`, `node_modules`, `web/dist`, `.conductor`, `.slim`, `coverage`, and other non-COPY'd weight. The COPY set is `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `web/`, `src/`, `public/` — nothing in the ignore list may overlap it; `test/dockerfile-context.test.ts` (rm-132) parses tree paths, not context, and must stay green.

- acceptance: file present; build-context transfer measurably reduced (buildx `--progress=plain` "transferring context" line, or a documented tar-equivalent measurement, before/after); dockerfile-context test unaffected; Release workflow path unchanged otherwise.
- evidence: the context-size measurement; `pnpm test` green; the file diff.

### B4. base-drift live-digest readback repair (rm-123 rider)

Rework base-drift.yaml's compare step to a keyless registry-API readback — token from `auth.docker.io` (`service=registry.docker.io&scope=repository:library/node:pull`) + bearer GET of `registry-1.docker.io/v2/library/node/manifests/24-slim` with OCI index Accept headers — with an explicit EMPTY-readback guard that fails the run as an infrastructure error with a distinct message (and never opens a drift issue). The current `docker manifest inspect` form exited 0 with no `Digest:` line in run 5002272643 — the anonymous rate-limit signature. The file is absent from the worktree base: author it from main's `763c1fa` content + the fix so the landing diff vs main is the fix alone. Registry is at parity today (`0e0ff40`), so the first post-fix scheduled run should read GREEN.

- acceptance: base-drift.yaml step uses the token-auth registry readback; empty live-digest short-circuits with an infrastructure-labeled failure; actionlint container gate green; first post-landing scheduled (or dispatched) run green at parity.
- evidence: the workflow diff + actionlint output; `gh run list --workflow base-drift.yaml` showing the green run; the run log's populated `live node:24-slim digest:` line.

### B5. Carry this run's phase artifacts (rider)

Land the already-in-tree ROADMAP.md cycle-8 revision (reconciled to main content — merges as additive) and the research doc as `docs/ideation/2026-09-24-repository-extensions-research-3.md` from `/tmp/dashboard-research-98147a29.md` (strip nothing; it is the R1-R9 evidence record, closing research R9's hygiene remainder).

- acceptance: both files in the landing commit by explicit staging; `pnpm lint` green including the two markdown files; ROADMAP id count stable (55) with no duplicate id lines.
- evidence: `git diff --stat` in the landing; lint output; `grep -oE 'rm-[0-9]+' ROADMAP.md | sort -u | wc -l`.

### B6. Pin hosted runner images ahead of the ubuntu-26 flip (rm-150 rider — droppable last)

Pin all 15 hosted `runs-on: ubuntu-latest` declarations to `ubuntu-24.04` (freezes today's alias content; the announced `latest`-migration then cannot change behavior mid-cycle) and record the decision in this doc's terms: `ubuntu-26.04` adoption is a deliberate later review (visual baselines are container-pinned per rm-142, so the host pin is baseline-neutral). FALLBACK GATE: if any gate reddens on the pinned image, revert B6 alone and record the accept-and-verify decision instead — do not force it.

- acceptance: zero `ubuntu-latest` declarations remain (or the recorded decision rides instead); actionlint green; Main + CodeQL + visual green at the pushed sha.
- evidence: `grep -rn 'runs-on:' .github/` before/after; the CI runs at the exact pushed sha.

## Standing rules for implement

- Stage by explicit file list, never `git add -A` (#3256); `.conductor/` stays untracked — and after the integrate merge, sweep `git ls-files .conductor` before anything else (B1's core protocol; the merge WILL re-introduce the breadcrumb on the ours side).
- File-overlap map: ROADMAP.md = B5's carried content then B1's completion flip (one touch at landing); base-drift.yaml = B6's runner pin + B4's readback fix (one edit pass); every other unit is file-disjoint (B2: pnpm-workspace.yaml + pnpm-lock.yaml; B3: new .dockerignore; B5: new ideation doc).
- PR #23 coordination per B1; PRs #10/#13 close as landed-by-other-means ONLY after this cycle's landing is confirmed (post-landing stewardship rider under rm-153, not implement-phase work).
- Validation discipline: local gates (types 0, lint 0, suite green, actionlint container) at the worktree; CI proof at the EXACT pushed sha (#3263). B6 is the designated scope-release valve.
- Do NOT absorb agent v0.115.0 (upstream PR #521 still open — rm-103 signal); do NOT touch the seven draft PRs or #14/#15 this cycle (rm-153 defers them wholesale).
