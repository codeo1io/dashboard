# Repository-maintenance cycle-2 batch — 1.8.0 activation + runbook parity + label clarity

- run: aec9c3e8835743b6ad12e720e1cc12ac (campaign dashboard-main-32f386c46d593fd8)
- prioritize attempt: 77d23013a7294c53bdec490825f73c55 (2026-10-09)
- base: 364272b == origin/main (worktree roadmap edits from this run's roadmap phase ride uncommitted on top; census 246 defs / 0 dups / max rm-806 per scripts/roadmap-census.ts)
- selected ids: rm-252, rm-254, rm-806

## Inputs

- assess (attempt d84e33ca): two findings — F1 cve-tripwire tag mismatch (high, owned elsewhere, see below), F2 operator failure labels do not encode retryability (low).
- research (attempt 05cd07e6): upstream fro-bot/agent at v0.118.3 (v0.118.3 = SSE checkout provenance on run-status frames — the same 1.8.0 capability the fork landed independently at 364272b); @hono/node-server 2.1.4 (peer-widening only); @playwright/test 1.64.0 + mcr digest registry-verified; dependabot all-time exactly 1 PR (unmerged); nodejs.org dist: v26.11.1 Current-only.
- roadmap (attempt fc84e56a): minted rm-806; riders at rm-102/108/139/157/252/760; extension comment #31.
- Ledger state first-hand: node scripts/roadmap-census.ts = 245/0/rm-778 pre-roadmap-phase, 246/0/rm-806 after; git show HEAD:ROADMAP.md 'status: open (selected' count = 0 (main-ledger selected-baseline).

## Selection floor

The floor model for this cycle: small-to-medium, deadline-coherent units with zero live-lane file contention, completable end-to-end inside one implement+validate window. Items below the floor this cycle (value/effort or gating), by ledger priority: rm-104 (98.0, cve-tripwire tag/digest pin normalization — excluded for congestion, see next section), rm-279 (96.0, Lint-job decomposition — effort: full CI lint-job split across workflow yamls; collides textually with an imminent unlanded landing (rm-772 singleQuote enforcement) on the same files; also same surface family as rm-103), rm-103 (85.0, merge pnpm-audit workflow into main.yaml — same surface family, same imminent-landing collision), rm-249 (72.0, push UX + PNG icons — explicitly product-gated by the 2026-09-29 prior cycle), rm-117 (70.0) and rm-281 (62.0) — below floor on value/effort this cycle, no deadline coupling; rm-108 (60.0, dated major-upgrade decision matrix) — scheduled to fold at the rm-133 ignore-window expiry 2026-10-21; rm-116 (58.0, required checks on main protection) — infra-risk (branch-protection API surgery with rm-146 sequenced behind it), wrong batch shape; rm-149 (66.0, local-only gateless register + WebAuthn code admin) — the top unowned VALUE item, explicitly deferred for cycle-fit: acceptance includes an unbounded fuzz-five-modes-until-stable loop plus a WebAuthn surface spanning admin+entry flows; it needs a dedicated cycle and is recorded here as the primary next-cycle candidate absent a live owner claim; rm-760's held-refresh continuation (@hono/node-server 2.1.4, @playwright/test 1.64.0 + mcr v1.64.0-noble, vite 8.3.4 — all windows open as of this batch) — deferred: heavyweight visual-baseline regen (two-green docker recipe) with zero deadline pressure, and file-overlap unverifiable against the running lanes' surfaces (see risk).

## Claimed-and-excluded (congestion audit)

Fleet liveness probed first-hand via the fork-maintenance campaign stores (runs tables, 2026-10-09 ~06:5xZ UTC):

- run-d1a0b216493d RUNNING (updated 06:51:29Z, campaign dashboard-main-42b66be8daa4e120): its cycle-2 batch claims the cve-tripwire fix as rm-793 (prioritize c402eb07). This is the LIVE owner of assess F1 / rm-104's concrete defect (cve-tripwire.yaml:35 NODE_IMAGE 'node:24-slim' vs Dockerfile:34 trixie pin; first scheduled fire Mon 2026-10-12 06:53Z). EXCLUDED from this batch — file-contention (cve-tripwire.yaml + test/base-drift-digest-readback.test.ts) is first-class even with zero id overlap. The rm-755 co-owners are dead lanes (89ebbf49 failed, 9fd8bcad failed in campaign dashboard-fix-ci-setup-fast-835e680ce445ded4), but one live owner suffices to exclude. Contingency recorded, not selected: if the live lane dies before Monday, the fix is implementable-by-content under the dead-lane fold rule with a fold note — no new mint.
- run-c4617181cc7f SUCCEEDED, unlanded as of origin/main == 364272b (updated 06:44:19Z): claims rm-772 (workflow-lint singleQuote legacy), rm-776 (node-action minor), rm-778 (validate-time repo). Imminent landing; workflow-yaml blast radius overlaps the deferred rm-103/rm-279 and the rm-760 continuation's visual.yaml. Not ours to race.
- run-d8fdf8b79ad5 RUNNING (06:51:59Z): claims rm-803 (base image digest pinning) — Dockerfile/base-drift territory; orthogonal to this batch's files.
- run-8dd690c85b50 RUNNING (06:55:31Z): claims rm-800/802/805 (subjects not extractable from its wall this probe — the worktree transiently ENOENT'd twice, consistent with active phase churn; ids confirmed via the claim scan). Treated as live congestion with unknown touch-set; nothing in this batch touches package.json/pnpm-lock.yaml/workflow yamls except fro-bot.yaml:347 (see risk).
- run-e63bd3a355b3 RUNNING (06:54:06Z, campaign 42b66be8): no worktree on this host, no batch doc reachable; no id claims visible in the fleet scan; noted as unverifiable, no overlap inferred with this batch's files.
- run-6a97d6f78af6 / run-84133641d624 RUNNING (06:52:38Z / —): walls carry only the dead 530bd1a9 claim on rm-133 (530bd1a9 failed; rm-133 is completed in main — moot).
- run-cbe70604af06 RUNNING (04:04:35Z): no 'status: open (selected' claims on its wall this scan.
- run-9289efaac79f SUCCEEDED + landed: its rm-766 selection normalized away at landing (baseline count 0 confirms).

Selected ids' claim state: rm-252, rm-254, rm-806 — zero fleet claims (verified by the same scan); main-ledger selected-baseline 0.

## Selection risk

- fro-bot.yaml:347 pin edit sits in c4617181's rm-772 singleQuote blast radius (any workflow yaml). Mitigation: our line is already single-quoted; the edit changes only the tag+sha and the version comment; textual conflict with their landing is expected to be trivial or empty, and the integrate pairing is named here for the mechanical renumber.
- Same-hour parallel-mint exposure: fleet ceiling rm-805 (run-8dd690c85b50) with this run minting rm-806 — if a parallel lane mints into the 806+ band before landing, the integrate renumber pairs riders/batch docs mechanically (house rule).
- rm-252's acceptance is largely landed-by-content: the implement risk concentrates in the pin re-resolution (must re-resolve the v0.118.3 tag sha first-hand at implement, never reuse a remembered digest) and in NOT re-touching the already-green contract surfaces (window, parsers, fixtures are done — do not churn them).
- rm-806's copy change must keep the twin-parity tests green — the pairwise label-map equality assertions (test/operator-run-index-core.test.js:2304-2322) pin CURRENT strings; the acceptance requires pinning DISTINCTNESS, so the tests change WITH the copy, atomically.
- The disabled_manually Fro Bot workflow means the pin bump cannot be validated by a live run in CI; verification is structural (yaml lint + actionlint-container form + the frozen-lockfile battery).

## Verification

Phase-complete verification for this prioritize step (all commands run from the worktree root, 2026-10-09):

- node scripts/roadmap-census.ts -> defs=246 dups=0 max=rm-806, 'census healthy' (selection edits do not move the census; guard pin stays 806).
- ./node_modules/.bin/vitest run test/roadmap-integrity-guard.test.ts test/roadmap-length-guard.test.ts test/prose-residue-guard.test.ts -> 3 files / 11 tests passed.
- ./node_modules/.bin/eslint ROADMAP.md docs/prioritization/2026-10-09-repository-maintenance-cycle-2-batch-run-aec9c3e88357.md -> rc=0.
- git show HEAD:ROADMAP.md | grep -c 'status: open (selected' -> 0; worktree count -> 3 (exactly the three selected ids).
- Implement-phase verification expectations: pin diff visible at fro-bot.yaml:347 with the v0.118.3 tag sha re-resolved from the release tag; releases-API citations below stay accurate; runbook parity table present in docs/runbooks/gateway-access.md; label copy grep at the four sites; twin-suites green after the distinctness-fence update.

Releases-API citations for rm-252's evidence clause (read first-hand 2026-10-09 via gh api repos/fro-bot/agent/releases):

- v0.117.5 (2026-10-06, pinned at fro-bot.yaml:347 as 378bc287): fleet pin at selection time.
- v0.118.0 (2026-10-06): opencode harness 1.18.34 (#1718).
- v0.118.1 (2026-10-07): background reconciliation of tracked tasks (#1729); KaTeX advisory floor analysis (#1724 — the fix falls outside the range its consumer accepts; matches this lockfile's katex 0.18.10 with audit clean).
- v0.118.2 (2026-10-08): static-serving double-decode hardening (#1714) — the fork already carries this class via @hono/node-server 2.1.3 + hono 4.13.13 (GHSA-rmxm-3fg6-px4f); no fork-side security delta rides the pin.
- v0.118.3 (2026-10-08): SSE checkout provenance/preparation on run-status frames (#1743) — closes the provenance half of the 1.8.0 gate pair; under the v0.117.5 pin the gateway emits 1.6.0 and the fork's landed 1.8.0 window stays fixture-dark until this batch's pin bump lands.

## Implement (2026-10-09, attempt 0ef9bd8b2fba4b59b14a32e47e865de6)

All three items landed in this worktree; the tree is left carrying the batch (no commit — the dirty tree plus the ledger state is the implement deliverable). Ledger: three def-line flips to implemented + dated implement riders at ROADMAP.md:1226/1264/2139; census defs=246 dups=0 max=rm-806, open 5->2, implemented 122->125, 'census healthy'.

- rm-252 — pin diff landed at .github/workflows/fro-bot.yaml:347: `uses: fro-bot/agent@d88c245fdbd4a952bd88a0f04b8d53927403f16d # v0.118.3`. The sha was re-resolved FIRST-HAND at implement (never reused from selection notes): `gh api repos/fro-bot/agent/git/ref/tags/v0.118.3` -> object.type=commit d88c245f...; `git ls-remote https://github.com/fro-bot/agent refs/tags/v0.118.3` -> d88c245f... (cross-check; also re-confirmed v0.117.5 -> 378bc287..., establishing the tag-resolved-sha pin convention); commit verified as the release-build commit 'ci(release): build action for 0.118.3 \[skip ci\]' (2026-10-08T22:51:12Z), release published 2026-10-08T22:57:12Z. Stale `:494 fail-close` citation normalized in the ledger (live check: SUPPORTED_OPERATOR_CONTRACT_VERSIONS.includes(...) at src/gateway/operator-sse-reader.ts:507, {1.6.0, 1.8.0} window). version.ts primary stays '1.6.0' BY DESIGN — the primary flip rides rm-157's LIVE trigger, out of batch scope per the selection rider.
- rm-254 — docs/runbooks/gateway-access.md gained 'Gateway upgrades — v0.116.0+ coupling facts (rm-254)' (between Trusted proxies and Traps): the three coupling facts (image coupling; bearer token on every control route except /healthz+/readyz; the 401->operator-actionable workspace-unavailable semantic, with this repo's surface split stated honestly — the kind rides run-status frames and renders via the rm-806 label map, while persistent 400/401/403 on approval/control mutations keeps the session-expired reload affordance), the pre-upgrade checklist (mirror contract window FIRST), and the pin-parity table. Deployed-gateway row verified first-hand at implement: gh api repos/marcusrbrown/infra/commits -> faf71414 'feat(gateway): upgrade the daemon to v0.118.2 (#1484)' 2026-10-07T20:11:52Z, no later gateway bump (repo pushed 2026-10-08T16:36:10Z).
- rm-806 — all four label sites: 'Workspace unreachable — retry may succeed' (public/operator-stream.js:185, public/operator-run-index.js:66) vs 'Workspace unavailable — not retriable' (:188/:69); both map doc comments state the pairwise-distinct rule; pinned three ways: twin-parity distinctness incl. non-inversion (test/operator-run-index-core.test.js 'rm-806: retriable and non-retriable ... both twins'), contract-window distinctness (test/operator-contract-window.test.ts 'rm-806: ...'), and the DOM before/after pair (test/operator-stream-core.test.ts — retriable live-failure test updated to the new copy + NEW non-retriable sibling 'run-live-fail-002' rendering reasonEl + polite noticeEl end-to-end).

Verification battery (focused, per the implement validation budget; worktree root, 2026-10-09):

- ./node_modules/.bin/vitest run test/operator-run-index-core.test.js test/operator-contract-window.test.ts test/operator-stream-core.test.ts -> 3 files / 549 tests passed.
- ./node_modules/.bin/vitest run test/roadmap-integrity-guard.test.ts test/roadmap-length-guard.test.ts test/prose-residue-guard.test.ts -> 3 files / 11 tests passed.
- ./node_modules/.bin/eslint public/operator-stream.js public/operator-run-index.js test/operator-run-index-core.test.js test/operator-contract-window.test.ts test/operator-stream-core.test.ts .github/workflows/fro-bot.yaml ROADMAP.md docs/runbooks/gateway-access.md docs/prioritization/2026-10-09-repository-maintenance-cycle-2-batch-run-aec9c3e88357.md -> rc=0 (one mid-run fix: the rider's `\[skip ci\]` needed markdown escaping).
- check-types parity: tsc --noEmit && tsc --noEmit -p web/tsconfig.json && tsc --noEmit -p .opencode/tsconfig.json -> all rc=0.
- docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.12 -no-color .github/workflows/fro-bot.yaml -> rc=0.
- node scripts/roadmap-census.ts -> 'census healthy' (see counts above).
- Structural pin check: grep -n 'fro-bot/agent@' .github/workflows/fro-bot.yaml -> :347 d88c245f... # v0.118.3.
- Engine-side attestation pre-check (KTD13): PYTHONPATH=/work/projects/hermes-conductor/src python - hermes_conductor.validation_policy.changed_surfaces('364272b...', '.') -> testable_surfaces = ('.github/workflows/fro-bot.yaml'); validation_evidence.changed_surfaces declared truthfully in the phase result (all changed files; the executable subset is exactly that one workflow).
