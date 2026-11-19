# Prioritize — repository-maintenance 0e5f4316 cycle:1, run 1b4ea0710ef24e9eba055503337fd13f

Attempt `a90dc5202b1b4515a47b99c3633cc9a4` · 2026-11-19 · worktree base `cafc17e37d6d`
(ledger at 354 defs / 0 dups / max rm-2147 after this cycle's roadmap mint; the
roadmap-phase 2-file diff carries uncommitted into this phase and its landing is not
this batch's concern). Method: the unresolved surface was triaged from the accepted
research `54faf53eee6a487aac54497d6de323d8` (R1–R13) and assess
`30b4f319e78e412c80e78f4c0f1a7e69` (18 findings), with every verdict below re-probed
first-hand at the tip today (see the verdict lines). This doc is a prioritization
record, not a batch doc: it carries no `## Deliverables` marker, and every path it
cites exists at the tip (the rm-877 newest-cohort gate-record half scans this file's
path tokens for existence).

## The high-priority head is not the actionable frontier

Verdicts re-probed 2026-11-19 (def line + acceptance/evidence read in ROADMAP.md):

- `rm-100` (100.0) — acceptance is a campaign-ingest stub; closure lives in GitHub-side
  state (required checks on main), not repo files. Blocked.
- `rm-284` (97.0) — own evidence records the masked-errors half cured (census 50 → 0,
  CI Lint green on PR #786) and the standing defense transferred to rm-864's census
  test. Satisfied residue; nothing to implement.
- `rm-279` (96.0) — Lint-job decomposition; the record's post-fix reference run
  completes in 53s against a 35m ceiling, and Actions run-creation has been dark since
  2026-10-09 (rm-1437), so no push-to-main Lint signal exists to decompose. Dormant.
- `rm-708` (78.0) — release unfreeze needs two consecutive green release.yaml runs —
  GitHub-side execution, blocked while Actions is dark.
- `rm-850` (78.0) — operator contract 1.9.0 readiness is gated on an UNRELEASED
  fro-bot/agent main feature (unreleased commit, contract bump pending). Externally
  blocked.
- `rm-1437` (78.0) — Actions-outage root cause needs account-scoped billing/suspension
  probes (`gh auth refresh -s user`) — human credentials, out of delegate scope.

Conclusion: the 90–100 band is blocked, dormant, or satisfied residue. The actionable
frontier is (a) this cycle's fresh mint set `rm-2135`..`rm-2147` (all verified unowned
in the roadmap phase) and (b) two small pre-existing server seams, `rm-601` (26.0,
dual-key union) and `rm-528` (26.0, redirect refusal).

## Selection axes (shortlist)

| def | impact | risk | effort | dependencies | strategic value |
|---|---|---|---|---|---|
| `rm-2135` unknown-stale masquerade | HIGH — the board's core promise inverts exactly during GitHub outages | LOW — web-only, no src/, no workflow | M — one view + DTO + tests, fully offline | none; convergent claim-space with the unlanded rm-780 cold-start rider (same boolean block) | HIGH — restores trust in the primary operator surface |
| `rm-2137` fleet-truth surfacing | MED-HIGH — server data fetched every cycle is dropped at the client | LOW — same surface as rm-2135 | S-M — same files as rm-2135 | none | MED — completes the data→UI path the server already pays for |
| `rm-2147` pin-rewind guard | MED — process trap already bit once | LOW — additive guard test | S | none | MED — protects every future absorb |
| `rm-2138` post-landing gate | MED — both traps already bit | LOW — read-only workflow | S | needs Actions revival to run (authoring still safe) | MED |
| `rm-601` dual-key union | MED-HIGH — redaction-adjacent correctness (driftCount inflation, double query/render under node_id skew) | MED — server property tests | M | none | MED — privacy-invariant adjacent |
| `rm-2142` weekly hygiene | MED — litter is monotonic (468 heads) | LOW | S-M | none | MED |

## SELECTED BATCH — `rm-2135` + `rm-2137` (monitoring board truthfulness)

One coherent web-surface change: the monitoring board stops hiding degraded reality
and renders the fleet data the server already emits.

- `rm-2135`: unknown/stale rows (per-repo fetch failure → `rollupState: 'unknown'`,
  `stale: true` — src/github/aggregator.ts:694-696,731-732) get a visible degraded
  group/banner with a count; the "N not failing" tally excludes them; an all-stale
  board renders a fleet-data-unavailable banner instead of the monitoring-all-clear
  empty state (web/src/views/Monitoring.tsx:121-122,145-148).
- `rm-2137`: openPrCount/openIssueCount/openAlertCount (emitted at src/routes/api.ts:31-33,63-78)
  render in an attention-inbox section; driftCount/enumerationIncomplete
  (web/src/api/monitoring.ts:55-56, parsed but never rendered) drive a completeness
  banner; refreshDurationMs/refreshDegraded (src/routes/api.ts:51-53,86-87) survive the
  client fetch layer and render a degraded indicator.
- Folded by content per the rm-780 rider's own convergence note: the cold-start
  allClear amendment (`allClear` additionally requires `!data.staleBanner` and a
  non-empty repos list, plus a cold-start test) lands in the same edit — one boolean
  block, one fix; the integrate folds the claim-spaces.
- Surface (all files exist and are owned by no other open def):
  web/src/views/Monitoring.tsx, web/src/api/monitoring.ts, web/src/views/Monitoring.test.tsx
  (existing 54-file web suite runs the battery offline; new tests ride the same file).
- Why this batch wins: impact (the only candidate that fixes a core-promise break —
  "All repositories green" rendered while every repo is stale is the dashboard failing
  at its purpose, assessed R3), risk (web-only: no server behavior, no redaction
  surface, no workflow change), effort (one view + DTO + tests, M, entirely offline),
  dependencies (zero external blockers — unlike every 90–100-band def), strategic
  value (rm-195/rm-107 trend surfaces build on a truthful board; the attention-inbox
  section is the landing spot the server's needsAttention ranking already targets).
- Selection recorded on the def lines: rm-2135 and rm-2137 statuses gain the
  `selected 2026-11-19, cycle:1 prioritize a90dc520…` clause this phase.

## Runner-ups (queued lanes, not selected this cycle)

1. Guards cluster `rm-2147` + `rm-2138` + `rm-2141` — pure additive repo-tooling; ideal
   next cycle or a rider if the implement phase finishes early.
2. `rm-601` (dual-key union under node_id skew) — assess F1's owner; server-side
   property-test work, queued behind the selected web batch.
3. `rm-528` (redirect refusal at the transport seam) — small server seam.
4. `rm-2142` weekly hygiene workflow + `rm-2143` docs-truth batch — scheduling and
   prose work, no interdependency with the selected batch.
5. `rm-2140` action-pin cohort — bump work best done when Actions revival (rm-1437)
   lets CI confirm; trivy freshness is the time-sensitive member.

## Explicitly not in this batch

- `rm-2136` threshold watcher (capability, M-L effort — a feature, not maintenance),
- `rm-2139` rulesets (GitHub settings mutation, needs operator sign-off),
- `rm-2144`/`rm-2145`/`rm-2146` micros (below the coherent-batch bar; batchable later),
- anything requiring Actions runs (dark since 2026-10-09) or account-level probes.
