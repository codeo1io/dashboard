# Cycle batch selection — run 4e7c674 (repository-maintenance cycle 1), 2026-09-25
Router: no ce-* skill matches 'prioritize maintenance batch' (categories checked: brainstorm/plan/implement/review/debug/PR/testing/dogfooding/strategy/handoff/LFG) — ran directly on the roadmap's own priority discipline. ce-plan is reserved for the NEXT phase (turning the selected batch into an implementable plan).
Convention: this doc follows docs/prioritization/<date>-cycle-N-batch.md format and ships in the spool because repo-root writes are prohibited this run; the implement phase lands it in-tree post-rebase alongside the roadmap patch.

## Scoring matrix (open items @480c92c + new rm-181..186; I=impact, R=risk, E=effort, D=dependency)
| item | pri | I | R | E | D | verdict |
|---|---|---|---|---|---|---|
| rm-181 pins (codeql-action/pnpm) | 78 | H | VL | S | none | SELECT B1 |
| rm-157 fro-bot/agent v0.115.0 | 72 | M | VL | S | none | SELECT B1 (rides rm-181) |
| rm-112 fail-visible remaining halves | 75 | H | M | M | none (config landed) | SELECT B2 |
| rm-183 operator-client parsers | 52 | M | L | S-M | none | SELECT B3 |
| rm-186 in-range lockfile refresh | 56 | M | VL | S | none | SELECT B4 (rider) |
| rm-104 fleet-render guard | 98 | H | — | — | upstream generator fix | EXCLUDE: acceptance requires upstream hermes-roadmap fix + render evidence — not completable in-repo this cycle |
| rm-102 dependabot first-PR evidence | 90 | — | — | — | external ~2026-10-03 | EXCLUDE: waiting on first scheduled PR |
| rm-103 upstream absorb policy | 85 | H | M | S(this cycle's slice) | rm-131 guard | PARTIAL: this cycle's delta IS B1; policy item stays open (drift recurs by design) |
| rm-105 release SBOM+attest | 80 | H | M | M | real Release run to verify | EXCLUDE: end-to-end verification needs a Release run — CI prohibited this run; also the most-diverged workflow (no-secrets gating) + known readback trap (#3317) |
| rm-182 failingChecks drill-down | 68 | M-H | M | M | rm-177 seam (landed) | DEFER: next-cycle lead; batch already full |
| rm-116 branch protection | 58 | H | M | S | admin repo-settings mutation | EXCLUDE: outside code-batch/delegate scope (prior cycles same verdict) |
| rm-184 approvals aging | 50 | M | L | M | none | DEFER |
| rm-185 sparkline | 40 | M | L | M | rm-107 decision | DEFER (sequenced) |
| rm-108/133 major spike | 60 | M | M | M | time-gate 2026-10-21 | EXCLUDE: rm-133 ignore window |
| rm-114/138/146/165/184/185/159/120 | <50 | L-M | — | — | various | DEFER/EXCLUDE (blocked, decision, or low) |

## SELECTED BATCH — "data-path truth + toolchain currency" (B0-B4)
B0 PREREQUISITE: rebase worktree onto origin/main 480c92c+ (assess F2); apply spool roadmap-update.patch (lands rm-181..186 + signal updates); land this batch doc per convention.
B1 rm-181+rm-157: upstream pin refresh — codeql-action 1c5b675→2892aa5 (codeql.yaml:48/54, scorecard.yaml:42, release.yaml:324), pnpm 11.27.0→11.27.1 (packageManager+lockfile), fro-bot/agent →v0.115.0 (fro-bot.yaml). Cherry-pick commit CONTENT (eb8ca95/f35e281/66a542d), never wholesale merge — fork invariants #3206/#3210; renovate bump N/A (rm-136).
B2 rm-112 remaining: resolver-failure absence entries, warm-empty banner, MonitoringDto degradation signal — now scoped to include the installation-level twin (installations.ts:222 skip, added signal 2026-09-25).
B3 rm-183: operator-contract runtime parsers for launchRun/getRunSnapshot/listRunApprovals(+decide) with malformed-input fail-closed tests.
B4 rm-186 rider: `pnpm update hono @hono/node-server vite` in-range only (hono 4.13.9, @hono/node-server 2.1.1, vite 8.3.1); no manifest range edits.

## Why this batch (impact x risk x effort x coherence x strategy)
- Honors the roadmap's own order: the top four ACTIONABLE items (p78/75/72/56) are all in; every higher item is externally blocked, time-gated, or unverifiable under this run's no-CI constraint (each exclusion carries its reason above).
- Coherent theme: after 6b417e2 fixed the query syntax, the data path still lies silently by omission (rm-112) and the approvals surface trusts unparse'd shapes (rm-183) — the batch makes "what the dashboard shows" trustworthy, while B1/B4 make the toolchain that proves it current (CodeQL action pin directly affects scan currency).
- Risk profile: B1/B4 near-zero (pin/lockfile diffs, revertible); B2/B3 are test-first additions with no behavior change on well-formed paths; nothing touches the read-only invariant, auth, or the release publication path.
- Effort: S+S+M+S-M+S — comparable to prior cycle batches (cycle-7 B1..B4); fits one implement+review arc including the B0 rebase.
- Strategic: closes the standing upstream-delta slice of rm-103 this cycle and leaves rm-182 as a clean next-cycle lead on the freshly-landed query seam.
- Verification under no-CI: local gates (pnpm check-types/lint/test, actionlint container, fork-exclusion-guard) + canary script where applicable; ephemeral-CI/Check-Workflows evidence only if the implement work order permits it, else recorded as pending-landing evidence per house convention.
