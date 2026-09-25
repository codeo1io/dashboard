<!-- LANDING RENAME 2026-09-25 (integrate of run d6455cdc candidate ed889597,
conflict case 3f2790f4): this batch doc was authored as
`2026-09-24-cycle-11-batch.md` in the d6455cdc lineage (PR #113) while the
repo-landed cycle-11 doc (run 41c7d471, landed 9f1f7ef) already owns that
path on origin/main — add/add at the integrate. The landed doc keeps the
canonical path; this one is renamed with the run id, the
lineage-disambiguation convention (cf. 2026-09-24-cycle-11-batch-run-b4aac9ba.md).
Id reconciliation at this integrate: the batch minted rm-177..rm-183 above the
then-known max, but landed meanings won every implemented id — its rm-177..rm-181
(matcher / graceful shutdown / SPA shell read / listener replay / mint scope split)
all converged with the landed rm-168 / rm-171 / rm-172 / rm-169 / rm-170, each of
which already credits this run as first reporter; its rm-182 (agent v0.115 absorb)
is carried by rm-157's remaining scope (pin landed at rm-191); the one surviving
new item (fleet rulesets-coverage panel) lands as rm-207. Full dispositions in the
INTEGRATE-MERGE comment of ROADMAP.md; the batch's roadmap signal-appends
(measured at the 539c632-era frame) and its parallel implementation shapes are
preserved here and at candidate ed889597 verbatim, not duplicated into the ledger. -->
# Prioritization batch 2026-09-24 — repo lineage cycle 11

Provenance: conductor run `d6455cdcf51c461b917fcd1250c6db0f`, prioritize attempt `5668bf85`,
implement `dc9bc8c5`, targeted_tests `1cea1473`, full_tests `dd77ca5c`, engine cycle label
`repository-maintenance:22c63cb7b4bb44ee8a9f9aae44451354:cycle:1`.

Lineage numbering (disclosed per convention): the engine labels this run cycle 1, but repo
lineage on `origin/main` already carries cycles 1–10 (`2026-09-19-cycle-1-batch.md` …
`2026-09-24-cycle-10-batch.md`), and a parallel new lineage (run 6cbc2a1d's integrate, per its
staging record) holds the pending `2026-09-24-cycle-1-batch.md`. To avoid the known same-name
collision hazard (two campaigns, one doc name), this batch takes repo lineage **cycle 11**.
Engine label vs repo lineage differ throughout; this doc is authoritative for this run.

## Live frame (stale-base disclosure)

- Worktree HEAD `7809df6` was 20 commits behind `origin/main` (`539c632`) at assess; cycles
  9–10 landed after this worktree branched. All assess/research evidence was gathered against
  a clean `git-archive` extraction of 539c632 with zero checkout mutation.
- Full validation ran via the engine's ephemeral-PR mode on validation base `ed86222` (live
  main at dispatch): all 9 checks SUCCESS — so the batch is proven on live main, not only the
  stale base.

## Batch: 'Graceful Degradation & Lifecycle Correctness'

Theme: convert fail-silent paths into fail-graceful ones. Selected as the highest-priority
coherent set implementable without push/gateway authority (push-gated rm-116/rm-159 and
gateway-gated rm-157/rm-182 excluded; time-gated rm-139 and next-cycle anchors rm-183/rm-117
excluded).

| item | surface | what shipped | validation ladder |
| --- | --- | --- | --- |
| B0 ROADMAP extension | ROADMAP.md | rm-177..rm-183 minted (above all-lineage max rm-176 per open-PR audit: #82, #104/#97, #43); rm-177/178/179/180/181 → implemented | id uniqueness: 0 dupes |
| B1 rm-177 matcher | src/github/aggregator.ts | bare "Resource not accessible by integration" now enters the no-alerts retry instead of stale | focused 141/141 → targeted 706/706 → full CI green |
| B2 rm-181 mint split | src/github/installations.ts | transient (429/5xx/net) retries SAME full scopes then throws loud; only definitive rejections degrade to core | same ladder |
| B3 rm-178 shutdown | src/shutdown.ts (new) + src/server.ts | bounded 10 s drain, closeAllConnections, forced exit(1) on deadline/error, double-signal latch; wired in createDashboardServer only | 5 new tests incl. fake-timer deadline |
| B4 rm-180 replay un-ack | src/listener/store.ts | identical replay = true no-op (id/receivedAt/read preserved); content change no longer resets read_at | 2 new + 1 updated pin |
| B5 rm-179 readFileSync | src/server.ts | `/` serves index.html from an mtime cache | covered by server/static-assets suites |

Validation outcomes (consumed, not re-run here): implement focused 141/141 across the 5
impacted files; targeted_tests 706/706 over 15 mapped files; full_tests ephemeral PR #107 —
CodeQL, Check Workflows, Lint, Design Check, Check Types, Test, Test Scripts Load, Analyze,
Dependency Review all SUCCESS on base ed86222.

## Reusable lessons (docs/solutions entries written this cycle)

1. `logic-errors/error-classification-matcher-misses-documented-string-2026-09-24.md` — every
   error string a contract comment documents must be matched AND test-pinned.
2. `security-issues/fallback-on-any-mint-error-drops-optional-security-scopes-2026-09-24.md` —
   degrade paths must be gated on definitive rejection, never on any exception; test each
   failure class separately.
3. `runtime-errors/node-pid1-sigterm-dropped-graceful-shutdown-2026-09-24.md` — runtime-as-PID-1
   containers need explicit signal handlers; a close listener with no caller is a lifecycle bug.
4. (Batch-level) A stale-pinning test is a bug fossilizer: the old rm-177 test asserted
   "marking stale" as correct — when behavior looks wrong, suspect the pin, not just the code.

## Open risks carried forward

- **rm-id collision with parallel cycle-12 (run 6fe26972)**: that run independently authored
  rm-177..rm-180 for DIFFERENT items in its own worktree; both sets are pending landing.
  Whoever lands second puts duplicate ids on main — the landing gate must renumber one set
  (cycle-9 precedent: rm-155→rm-164 band) and update cross-references. Id-space audits must
  scan parallel in-flight worktrees, not just main + open PRs.
- **PR #82 (parallel cycle-11 run)** touches aggregator.ts/installations.ts/server.ts — the
  same files as this batch. Landing order determines the textual conflict surface; both sides
  are test-covered, so resolution should keep whichever hunk-set carries the corresponding
  tests.
- **ROADMAP reconcile at landing**: the worktree ROADMAP (base 7809df6, 42 items incl.
  rm-177..rm-183) must merge against main 539c632's 55-item version; the 9 dated-signal
  appends from spool `fe7338eb-roadmap-extension/roadmap-extension.patch` apply during that
  reconcile (authored against main signal text absent at the worktree base).

## Next-cycle candidates (context for the cycle-12+ assessment)

- **rm-183 fleet rulesets-coverage panel** (anchor item, priority 46) — REST rulesets need
  only Metadata:read, already in the minted read-only subset.
- **rm-117 Dependabot-alerts panel** — unblocked in practice by rm-177 (its data source no
  longer goes stale on missing grants); GraphQL `RepositoryVulnerabilityAlert` fields suffice.
- **rm-182 run-card checkout provenance** — still gated on rm-157 (fro-bot/agent v0.115.0
  pin; fork sits at v0.114.1 per fro-bot.yaml).
- **Node 26 LTS migration** — calendar-gated to Oct 2026 (26.0.0 Apr 2026, LTS Oct 2026, EOL
  Apr 2029; last of the one-major-per-4-years model).
- **Dependency-majors probe batch** — TS 7.0.2, vitest 5.0.1, jsdom 30, jest-dom 7,
  fast-check 4.10.2 available; low-risk batch for a quiet cycle.
- **Avoid** the PR-triage TUI lane (pr-monitor/gh-dash class) — out of scope for a read-only
  monitoring dashboard.

## Appendix: preserved ROADMAP signal-appends (spool fe7338eb, archived verbatim)

The cycle's roadmap phase delivered its nine dated signal-appends as spool patch
`fe7338eb-roadmap-extension/roadmap-extension.patch` (worktree tree untouched per the
canonical-hygiene clause), so they exist in NEITHER the candidate tree (ed889597) NOR
main's ledger. The integrate merge (conflict case 3f2790f4) cited this doc as their
preservation home; this appendix (added at independent review, conflict case 5b414c7b)
makes that claim true. Each entry below is the spool parenthetical verbatim (single
line, byte-exact); all are frame-bound to the 539c632-era measure text (e.g. rm-117's
BLOCKED-by-rm-177 note predates the merge's own convergence rm-177=rm-168; rm-120's
drift measure predates v0.115.1; rm-144's `public/static/operator-stream.js` path
never existed in this repo — the browser parser lives at `public/operator-stream.js`).
Per-item disposition: rm-103/140/157 covered by main's fresher ledger measures;
rm-108/139/144/165 archived as measures/context without ledger duplication;
rm-144's finding additionally re-verified live at the merged tree and landed as a
dated measure on the rm-144 ledger item.

- **rm-103** (2026-09-24, run d6455cdc research: upstream delta re-measured at 4 commits, all chore(deps) — f35e281 pnpm 11.27.1, e51b480 bfra-me v4.32.0, 66a542d agent v0.115.0, 9908bcf bfra-me v4.33.0; fork pins unchanged at pnpm 11.27.0 / agent v0.114.1; no feature or wiki-writer surface in the delta — the absorb stays mechanical riders on rm-157)
- **rm-108** (2026-09-24, run d6455cdc research: @types/node latest 26.6.2 tracks Node 26 Current; majors outside the current ignore set: fast-check 4.10.2, jsdom 30.1.1, @testing-library/jest-dom 7.0.1, eslint-plugin-erasable-syntax-only 0.7.2; hono 4.13.9 / @hono/node-server 2.1.1 are in-range drift a lockfile refresh takes)
- **rm-117** (2026-09-24, run d6455cdc research: GraphQL RepositoryVulnerabilityAlert exposes state/fixedAt/autoDismissedAt/securityAdvisory/dependencyScope — the severity buckets and triage trending this acceptance names need no permission additions, only the already-optional vulnerability_alerts read; BLOCKED-in-practice by rm-177: the permission-missing error path is broken, so a panel built today would go stale rather than null whenever the grant is absent)
- **rm-120** (2026-09-24, run d6455cdc research: drift now v0.78.0 → v0.115.0 with v0.114.0 (gateway background-task subagents; incomplete-invocation outcome replacing false success) and v0.115.0 (run-status checkout provenance; workspace-prep failure distinction) both operator-surface-touching — the watch's first delta note writes itself from rm-157's absorb)
- **rm-139** (2026-09-24, run d6455cdc research: nodejs.org evolving-the-nodejs-release-schedule blog 2026-03-10 confirms the 2026-10-28 gate and its context — the schedule model changes that month to one major per year with every release LTS, Node 26 is the last line under the old model, so this go/no-go is also the first decision under the new cadence)
- **rm-140** (2026-09-24, run d6455cdc research: pnpm latest now 12.6.0; upstream took 11.27.1 (f35e281) while the fork pins 11.27.0 — the minor rider and the rm-131 guard assertion move together whenever the next absorb lands)
- **rm-144** (2026-09-24, run d6455cdc assess F4: BOTH parsers keep only the LAST data: line — src/gateway/operator-sse-reader.ts:116-117 and public/static/operator-stream.js:216-217 overwrite instead of the spec-required newline concatenation of repeated data fields; today's single-line-JSON gateway masks it, a spec-conformant upstream change would drop frames into the parse-failure log — the open browser half should include a multi-data-field concatenation property; cross-ref rm-114's shared invariants)
- **rm-157** (2026-09-24, run d6455cdc research: upstream dashboard itself moved — 66a542d pins agent v0.115.0, 9908bcf bumps bfra-me to v4.33.0, f35e281 pnpm 11.27.1; the full origin/main..autonomy-upstream/main delta is those 4 commits, all dependency-only, so the fork's absorb risk concentrates in the gateway-contract verification, not the code merge; the provenance-surfacing UI half is rm-182)
- **rm-165** (2026-09-24 recurrence, run d6455cdc: this campaign's assess worktree based at 7809df6 against main 539c632 — 20 commits / cycles 9-10 landed — forcing per-finding currency archaeology AGAIN; both assess and research had to extract origin/main to /tmp to see current state)
