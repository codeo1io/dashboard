---
date: 2026-09-22
topic: dashboard maintenance cycle 7 — scoring and batch selection (post-aa9937f)
mode: delegated-conductor
run: f11b7255b43c40b491a43480550838dc
phase: prioritize
attempt: 2f4eaa22f77e486b81c446716eba65a1
skill: ce-plan (scoring/batch selection — no dedicated ce-prioritize skill in the installed router; fleet precedent cycles 1-3, 5, 6 used ce-plan identically). Deviations declared: no subagent surface in this session, frames run in-process and disclosed (convention #3768). Label disclosure per #4323: the engine cycle label is 4; the repo lineage has consumed cycle 1 (cf5527c1), cycle 2 plus batch-2 re-scope (916783f), cycle 3 (7de0de3), cycle 5 (2f4d118 lineage) on main, and cycles 4 and 6 STRANDED in open PRs #9/#10 (their batch docs exist on branch conductor/run-2ae7d10a68d0, absent from main) — so this is lineage cycle 7 and the artifact is named accordingly.
---

# Dashboard maintenance — cycle 7 batch (2026-09-22)

## Live frame facts (re-measured this phase, not carried stale)

- `origin/main` = `aa9937f` (2026-09-22, PR #12 visual-gate hosting move) — unchanged since this run's assess phase; open PRs re-probed live: #9 OPEN (stale base, superseded) and #10 OPEN (head `27b046a`).
- **PR #10 merges CLEANLY into `aa9937f`**: old-style `git merge-tree` re-run this phase → 0 conflict markers; `fro-bot.yaml` and `visual.yaml` are changed-in-both and auto-merge.
- **Payload discovery (new this phase, supersedes stranded roadmap statuses)**: PR #10 carries not only the 16-file truth batch (rm-135) but ALSO cycle-6's riders — the fro-bot.yaml DEPENDENCY OWNERSHIP paragraph names dependabot as bump owner, states Renovate never runs, and trusts the dependabot and fro-bot bot identities (rm-136, complete), and visual.yaml pins are already the v7 commit-pin family (checkout v7.0.1, setup-node v7.0.0, upload-artifact v7.0.1 — rm-137 pins-half, complete), plus `minimumReleaseAge: 1440` with the Exclude list and `.github/renovate.json5` deleted. One landing delivers the ENTIRE stranded cycle-6 selected batch.
- **Stale statuses found on main's ROADMAP**: the cycle-5 payloads landed at `2f4d118` (test/fork-exclusion-guard.test.ts cites rm-131 B4, test/dockerfile-context.test.ts cites rm-132 B5, dependabot.yml ignore block = B6) and rm-128's workbox removal landed at `f334fb2` — rm-128/131/132/133 still say unlanded/in-progress. Correction rides B1's roadmap reconciliation.
- Upstream drift is exactly 1 commit: PR #516 (eslint 10.10.0 → 10.11.0); npm age probe this phase: 10.11.0 published 2026-09-18T20:15Z — 4 days old, safely past `minimumReleaseAge: 1440` once B1 activates it.
- npm ecosystem frame (research phase, 2026-09-22): all pins current except eslint +1 minor; majors (jsdom 30, TS 7, vitest 5, pnpm 12) already watchlisted/pinned.
- Base-digest drift: none today — registry HEAD for node:24-slim == pinned `0e0ff40` (self-resolved rotation). base-drift's first scheduled fire post-landing should read GREEN, not red; re-baseline the rider expectation at implement.
- Local gates at this tree (assess phase): lint 0, types 0, 3115/3115; CI all green at `aa9937f` (Main/CodeQL/visual/Scorecard).
- Fork Scorecard 7.1 (2026-09-22) with License 0 and Branch-Protection -1 standing (both externally gated).
- Worktree carries this run's uncommitted content: modified ROADMAP.md (rm-142..rm-148 + signal refreshes) and docs/ideation/2026-09-22-repository-extensions-research.md — both ride the B1 landing by explicit staging (#3256).

## Five-axis scoring (1–5; Effort 5 = cheapest; Dep-free 5 = no external landing dependency)

| Ref | Impact | Delay | Effort | Dep-free | Strategic | Total | Standing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Land PR #10 = stranded cycle-6 batch (rm-135 + 136 + 137-pins; subsumes rm-123, rm-126 core, rm-134) | 5 | 5 | 4 | 5 | 5 | 24 | SELECTED B1 (anchor) |
| rm-142 deterministic visual gate (mcr Playwright image) | 4 | 5 | 3 | 5 | 4 | 21 | SELECTED B2 (post-B1; lighter-form fallback) |
| rm-145 pnpm caching + rm-148 comment truth | 3 | 3 | 5 | 5 | 3 | 19 | SELECTED B3 |
| Upstream #516 absorb (eslint 10.11.0, age-safe) | 2 | 3 | 4 | 5 | 3 | 17 | SELECTED B3 rider |
| rm-143 security-posture doc | 2 | 3 | 5 | 5 | 3 | 18 | SELECTED B4 (droppable last) |
| rm-112 aggregator degradation semantics | 4 | 3 | 2 | 5 | 3 | 17 | DEFER (decision-heavy; its dead-config acceptance closes via B1's renovate.json5 deletion) |
| rm-116 branch protection | 4 | 4 | 3 | 2 | 4 | 17 | DEFER (stewardship/API action; strong next-cycle pick — unblocks rm-146) |
| rm-107 + rm-119 status surface | 3 | 3 | 2 | 5 | 4 | 17 | DEFER (feature track) |
| rm-127 + rm-129 gateway pair | 3 | 3 | 3 | 5 | 3 | 17 | DEFER (topology decision pair) |
| rm-105 SBOM + provenance | 4 | 2 | 2 | 4 | 4 | 16 | DEFER (Release churn; needs live Release proof) |
| rm-144 property tests | 3 | 2 | 3 | 5 | 3 | 16 | DEFER (next cycle; pairs with rm-143's Fuzzing deviation) |
| rm-141 aggregator concurrency | 3 | 2 | 3 | 5 | 3 | 16 | DEFER (perf medium; no live pressure) |
| rm-146 dependabot automerge | 3 | 2 | 4 | 2 | 3 | 14 | DEFER (blocked on rm-116 by its own sequencing rule) |
| rm-106 listener digest push | 4 | 3 | 1 | 2 | 3 | 13 | DEFER (gateway send path absent — re-verified v0.114.0 release notes this run) |
| rm-147 license | 2 | 1 | 5 | 1 | 3 | 12 | DEFER (blocked-external: upstream also unlicensed) |
| rm-102 dependabot first-PR proof | 3 | 1 | 3 | 1 | 3 | 11 | DEFER (external clock ~2026-10-03) |
| rm-104 render hardening | 3 | 2 | 2 | 1 | 3 | 11 | DEFER (generator external) |
| Majors rm-108/139/140 | 3 | 1 | 4 | 5 | 2 | 15 | DEFER (time-gated / hard-gated by peer deps) |

Selection rule (fleet's proven shape, cycles 2/3/5/6): one anchor + riders with zero file overlap against the anchor, ordered so changed-in-both files are reworked only after the anchor lands. B1 dominates the pool: it is the only item recovering ALREADY-VALIDATED work (3116/3116 on-branch; Main + CodeQL passed on the branch push), it merges cleanly today, and it closes or advances seven roadmap ids at once. B2 is sequenced strictly after B1 because both touch visual.yaml (PR #10 lands the pin alignment; B2 then swaps the runner surface on a clean base).

## Selected batch — "land the stranded cycle-6 truth batch, then make the visual gate deterministic"

Four work units plus standing rules. One landing event (B1) then local-verifiable riders; CI proof at the exact pushed sha (#3263 — hosted era means no stale-queue cancellation; #3391 is self-hosted-era context).

### B1. Land PR #10 and close PR #9 (rm-135; delivers rm-136, rm-137-pins, rm-123 implementation, rm-126 core, rm-134, minimumReleaseAge, renovate.json5 removal)

Merge `conductor/run-2ae7d10a68d0` (head `27b046a`) into `origin/main` — merge PR #10 directly (clean per merge-tree) and close #9 as superseded. The landing commit also reconciles ROADMAP.md: stranded rm-134..rm-141 entries join this run's rm-142..rm-148 under the recorded collision rule (no renumbering), stale statuses flip with evidence (rm-128 → completed at f334fb2; rm-131/132/133 → completed at 2f4d118; rm-135/136/137 → completed at the landing sha), and this run's two content files (research doc, roadmap edits) ride by explicit staging.

- acceptance: PR #10 merged at a new main sha, PR #9 closed with a superseding comment; base-drift.yaml present on main and its first scheduled run logs pinned + live digests with a GREEN verdict (pin == live today — re-baseline the old first-fire-red rider); minimumReleaseAge active with the Exclude list intact; README badges/endpoints truthful; renovate.json5 absent; full local gates green at the merged sha (expect 3116 from the branch's lock test; roadmap/status reconciliation must keep lint clean); Main + CodeQL observed green at the EXACT pushed sha.
- evidence: `gh pr view 10 --json state,mergedAt,mergeCommit`; `gh pr view 9 --json state`; `git log origin/main -- .github/workflows/base-drift.yaml`; actionlint container exit 0; `pnpm test` count at the merged sha; `pnpm exec eslint ROADMAP.md`.

### B2. Deterministic visual gate (rm-142; on top of B1)

Rework visual.yaml's runner surface after B1's pin alignment lands: run the visual job in `mcr.microsoft.com/playwright:v1.63.0-noble` (tag verified to exist), drop the runtime `playwright install chromium --with-deps` step, regenerate all three dark baselines once inside that image, and record provenance in the visual spec header.

- acceptance: visual job containerized on the image matching the @playwright/test pin; no runtime browser install; three dark baselines regenerated in-image with provenance noted; three consecutive green visual runs with zero baseline edits across them; actionlint container gate green.
- evidence: visual.yaml diff + actionlint output; baseline files' last-touch commit = the in-image regen; `gh run list --workflow visual.yaml` showing consecutive greens; PASS FALLBACK GATE: if in-container baseline regen proves impractical this cycle, land the lighter documented form (runs-on ubuntu-24.04 + written regen procedure) and leave the container form as rm-142's recorded remainder — do not force a half-verified container swap.

### B3. CI-era truth batch (rm-145 + rm-148) with the #516 absorb rider

Enable pnpm-store caching in `.github/actions/setup` (setup-node `cache: pnpm`) and rewrite the stale self-hosted rationale there plus the five remaining stale lines (dependabot.yml:8-12, main.yaml:132, codeql.yaml:42, release.yaml:438, AGENTS.md:47). Rider: absorb upstream PR #516 (eslint 10.10.0 → 10.11.0 via package.json + lockfile) — age-safe (published 2026-09-18, minimumReleaseAge 24h satisfied post-B1) and it returns upstream drift to 0.

- acceptance: setup composite action caches the pnpm store; no live self-hosted claim remains in workflows or AGENTS.md (historical notes either deleted or marked historical); eslint at 10.11.0 with the lockfile consistent; actionlint container gate + pnpm lint + full test suite green.
- evidence: before/after install-step timing from consecutive Main runs (cache miss then hit); grep for self-hosted across .github/ + AGENTS.md; `pnpm exec eslint` version probe; `git rev-list --count origin/main..autonomy-upstream/main` → 0.

### B4. Security-posture doc (rm-143; droppable last)

One posture surface (README section or docs/runbooks/security-posture.md) listing every fork Scorecard sub-score below 8 with its disposition: fixed, declined, time-gated (Maintained self-resolves ~2026-11-28), externally gated (License, Branch-Protection), or tracked by an rm id (Fuzzing → rm-144 next cycle).

- acceptance: doc present, lint-clean, every sub-score below 8 has a named disposition; README badge discussion references rm-134's landed truthing.
- evidence: doc file + pnpm lint on it; curl of the scorecard API quoted with the 2026-09-22 reading.

## Standing rules for implement

- Stage by explicit file list, never `git add -A` (#3256); `.conductor/` stays untracked.
- Rebase ordering: B1 lands before B2 touches visual.yaml; B3/B4 are file-disjoint from B1's changed set (setup action, five comment sites, package.json/lockfile, new doc) except dependabot.yml — B1's version wins, apply the comment fix after.
- Carry this run's uncommitted content (ROADMAP.md edits, research doc) into the B1 landing — they are phase artifacts of THIS run and must not be stranded a second time.
- If the engine's gate phases decline the PR #10 merge route, the fallback is a content-equivalent cherry-pick of 27b046a onto aa9937f (merge-tree already proves the file set applies); PR #9 is closed either way.
