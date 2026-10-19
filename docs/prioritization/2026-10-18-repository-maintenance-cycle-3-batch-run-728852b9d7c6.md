---
module: dashboard
tags: ['repository-maintenance', 'cycle-3', 'batch', 'rm-1978', 'rm-1979', 'rm-1980', 'rm-1982', 'rm-1983']
problem_type: maintenance-batch
owner: dashboard
run_id: 728852b9d7c640bc8260320a81635472
attempt: 4187b01abadd44179f9c0a09fbd47b86
base: debde800cb4e8d89bfc37312930dbed9ffa7d8e8
---

# Repository maintenance — cycle 3 batch selection (2026-10-18, run 728852b9d7c640bc8260320a81635472)

Prioritize-phase decision record. Base `debde800` (porcelain carries only the
roadmap-phase handoff: ` M ROADMAP.md`, the 43-insertion extension-#45 delta +
spool patch `delegate/roadmap-delta-728852b9-bae2e422.patch`). Inputs consumed,
not re-derived: assess `aad0be57` (9 findings, gates all green), research
`ac3d038f` (6 candidates C1–C6), roadmap `bae2e422` (mints rm-1978..rm-1983,
riders on rm-139/rm-252/rm-1449).

Prior-attempt forensics (attempt `9d8d501d`, provider-aborted): the spool
`results/9d8d501d….json` envelope records `delegate provider/runtime error: This
operation was aborted` at 32.2s; no typed PhaseResult exists anywhere in the
spool; worktree residue was zero (only the roadmap handoff). Verdict: nothing to
adopt — this phase was redone from scratch.

## Live state at selection (probed this attempt)

- origin/main moved to `5ab50da0` (+5 commits over base; 11 files +473/−18).
  Moved surfaces: `release.yaml` +17 **comment-only** lines (the rm-882
  comment-tag sweep), `ROADMAP.md`, two cycle-1 compound docs, one solutions
  doc, `src/server.ts` +6, `src/gateway/operator-contract/run-responses.ts` +1,
  `web/src/operator/runtime.ts` +7, two tests. **None of the selected legs'
  files moved except the release.yaml comment block** — every selected file is
  base-faithful and merges identically at fold.
- Actions is LIVE (Main + Dependency Review `success` 2026-10-18T04:30:48Z);
  Fro Bot pull_request runs skip 1s at the PAT gate by design. Live-CI-proof
  acceptance is available to the full_tests phase.
- Pins on main: react/react-dom 19.3.0, hono ^4.13.11, typescript 6.0.3,
  vitest 4.1.11, `@hono/node-server` ^2.1.5 (current), agent pin `v0.122.3`
  (upstream released v0.123.0 with `OPERATOR_CONTRACT_VERSION` unchanged at
  1.11.0 — no drift-proof obligation).
- The rm-1462 public d.ts↔js parity guard is landed and live at main
  (`test/public-dts-drift-guard.test.ts`; operator-launch allowlist `[]`,
  TYPE_ONLY_COUNTS type 1 / interface 2) — any public/ edit in this batch must
  keep it green.

## Selection table (impact / risk / effort / dependency / strategic value)

| Candidate | Imp | Risk | Eff | Dep | Strat | Verdict |
|---|---|---|---|---|---|---|
| rm-1978 release-object port | H | M | M | none | H | **SELECT (B1)** |
| rm-1983 operator-launch browserFetch timeout | H | L-M | M | none | M-H | **SELECT (B2)** |
| rm-1980 sidecar-skip contract | M | L | S | none | M | **SELECT (B3)** |
| rm-1979 runbook XFF truth | M | L | S | none | M | **SELECT (B4)** |
| rm-1982 stay-pnpm disposition | M | zero | zero | ledger only | H | **RIDES (no code)** |
| rm-139 Node-26 triad | H | H | M-H | gate 2026-10-28; Dockerfile 3-way fog contention | H | DEFER (next cycle head) |
| rm-1981 markdown run-output absorb | M-H | H | H | sanitize precondition; rm-252 verdict; fog rm-1522 | M | DEFER (own precondition) |
| rm-1449 minor dep wave | L-M | L | S-M | lockfile fog contention | L | DEFER (dep cycle) |
| agent pin v0.123.0 | L | L | S | rides next absorb (convention) | L | DEFER |
| fog darkness-watch / AGENTS.md line / store.ts / clonedeps pin | M | — | — | sibling single-writer or rides rm-139 | — | EXCLUDED (fog-owned) |

## Selected batch — "mint-band implementation: release truth + bounded client"

The coherent unit: **implement every mint of this run's band that is
implementable this cycle.** Of the six mints rm-1978..rm-1983: four are
surgical code legs (below), one is ledger-only and rides the already-minted
ROADMAP delta (rm-1982), one is deferred by its own recorded precondition
(rm-1981). The four legs touch four disjoint file sets — no shared hunks, no
lockfile, no Dockerfile, no fog-contended surface — and each carries its own
local test proof, so the batch completes end-to-end inside one
implement → targeted_tests → full_tests chain.

### B1 — rm-1978 (reliability 46.0): release pipeline mints the Release object

Port upstream's release-creation leg into the fork's promote job
(`gh release create` + body edit + rollback delete kept in lockstep), adapted
to the fork's app-token surface (`release.yaml` promote gates on
`steps.app-token.outcome == 'success'`; job permissions at `release.yaml:585`).
Legs: (1) verify and record that the minting App identity carries
`contents: write` for tags+releases BEFORE any workflow edit is trusted;
(2) add the create/edit/delete steps beside the existing tag precompute at
`release.yaml:429-443` with a grep-countable structural marker (step id/comment
naming rm-1978) so absorb survivors stay countable; (3) extend the
should-release/workflow-structure test class to assert the create step exists
beside the tag precompute. The AppShell footer link (`web/src/shell/AppShell.tsx:163-165`,
link built at `:590`) is NOT touched — it becomes correct once the target
exists (0 releases live today vs upstream's 46). Rationale: the only
user-visible-on-every-release defect in the band; closes rm-1483's surviving
residual (version stamp landed, notes target never existed). Known traps
pre-declared for implement: release.yaml is a parity-guarded executable
surface — if the old-base ephemeral foreign-red fires, the cure is the
recorded `git checkout origin/main -- scripts/release-paths.ts
.github/workflows/release.yaml` 0-diff discipline, and any executable-surface
edit requires a FRESH `validation:v1` digest re-derivation (dispatch digests
go stale).

### B2 — rm-1983 (operator-experience 40.0): bound operator-launch browserFetch

`public/operator-launch.js:236-241` `browserFetch` is the only browser-direct
client in the tree with no timeout/abort (0 AbortSignal matches file-wide);
the submit handler recovers only inside catch blocks, so a stalled gateway
socket pins the launch form indefinitely. Legs: abort-with-timeout sized per
call class mirroring the operator-stream precedent (10s question/approval
fetches), a bounded total wait on the submit path with a surfaced retry
affordance, a hung-fetch fixture proving form recovery within the bound, and
`.d.ts` twins updated if any new value export appears (rm-1462 guard:
operator-launch allowlist is `[]` and must stay that way). Contention: fog
rm-1522 / unlanded run-056965 hold edits on this file — transplant,
first-landed-wins; the file has NOT moved on main since base, so the
base-faithful candidate merges identically. Rationale: completes the
rm-780 bounded-seam family (server Octokit seam and web one-off callers are
already bounded); operator-facing hang with a precedent-shaped cure.

### B3 — rm-1980 (reliability 24.0): reconcile sidecar-skip vs static-assets gate

`scripts/gzip-static-sidecars.ts:83-87` deliberately skips a sidecar that
would not shrink, while `test/static-assets.test.ts:1568-1578` demands a `.gz`
sibling for every compressible file — gzip framing grows sub-~20-byte files,
so any future tiny compressible artifact makes a green-intent build red the
Main gate. Chosen shape: the generator emits a skipped-manifest (file + byte
counts) and the test accepts sidecar-or-manifest, pinning the current census
(9 sidecars, 1,027,021 → 590,471 bytes, −42.5%, build:web 2026-10-18) as the
recorded baseline. Parity note: `gzip-static-sidecars.ts` already sits in BOTH
`scripts/release-paths.ts:31` and `release.yaml:26` on.push.paths — the pair
is already lockstep, so this leg adds no parity delta; the executable-surface
edit still triggers fresh-digest discipline.

### B4 — rm-1979 (security 20.0): runbook XFF truth + hardening decision

`docs/runbooks/gateway-access.md:157-158` claims one client can never fire the
rm-183 collapse detector — false in the default topology (the limiter keys on
the direct address but fingerprints client-suppliable X-Forwarded-For; the
repo's own `test/rate-limit-xff-collapse.test.ts:168-186` fires it from ONE
test client with two header values). Two cheap requests pre-fire the log-once
warning (`src/server.ts:213-247`), blinding the real signal for the process
lifetime. Legs: corrected prose (a fired warning means misconfiguration OR
spoofing; two-source verification is meaningful only behind an overwriting
proxy), the hardening decision recorded in the same change (accept the
pre-fire as bounded log noise, or key the fingerprint table on
trusted-proxy-derived identity when `RATE_LIMIT_TRUSTED_PROXY` is set), and a
test/guard pinning the documented claim so prose and code cannot drift apart.
RFC 7239 §8.1 grounds the spoofability analysis (research-captured). Note:
`src/server.ts` moved +6 on main (operator-contract catch-up) — fold
reconcile is additive; the detector block itself is untouched there.

### Rider — rm-1982 (architecture 30.0): stay-pnpm disposition

Zero code. The def text + the rm-252 rider naming the bun-shaped files were
minted by this run's roadmap phase and ride this batch's ROADMAP delta to
landing — rm-1982's acceptance (ledger text + rider landing) completes with
the batch fold. Declared here so implement/compound record the flip.

## Rejected with rationale

- **rm-139 Node-26 triad (despite the fresh GO rider).** The def's own
  acceptance window is the 2026-10-28 v26-LTS gate; the 2026-10-20 verdict
  obligation was discharged by this run's rider (GO, evidence recorded).
  Landing it 10 days early means: engines+FROM+@types/node+CI node-version
  moving together, multi-arch index digest re-verification, strip-only TS
  under Node 26 V8 proof, clonedeps pin refresh riding along, and a Dockerfile
  with 3-way unlanded-sibling contention — a full cycle of risk surface by
  itself. The 8-day EOL exposure (10-20 → 10-28) on a read-only,
  digest-pinned image is bounded and recorded. Sequenced as the next cycle's
  head item, GO evidence already in the ledger.
- **rm-1981 markdown absorb.** Deferred by its own minted precondition: a
  written sanitize policy (markdown-it html:false or allowlist sanitizer) +
  hostile-fixture XSS tests must precede any port; it is feature-scale
  (~2.5k upstream test lines) on a file hot with fog rm-1522 uncommitted
  edits, and it rides the rm-252 window verdict.
- **rm-1449 minor dep wave (react 19.3.1, hono 4.13.13, eslint 10.13.0,
  fast-check 4.10.2, playwright 1.64.1, axe 4.14.0, opencode plugin 1.19.3).**
  Low urgency (research C5 confirmed nothing stale-critical), lockfile-touch
  with a fog lockfile-sweep lineage in flight, and upstream #647
  (react 19.3.1) closed-unmerged — a standalone bump duplicates what the next
  curated absorb carries naturally. Rides the next dep/absorb cycle.
- **Agent pin v0.122.3 → v0.123.0.** Contract version unchanged (1.11.0) so
  no drift-proof obligation; house convention is the pin bump rides the next
  absorb; touches fro-bot.yaml + AGENTS.md (fog rm-1518 co-edit) + clonedeps
  mirror.
- **Remaining stale comment tags** (codeql.yaml:32/:38, scorecard.yaml:42 vs
  release.yaml's freshly swept `# v4.39.0`). Cosmetic; main's rm-882 landing
  already swept release.yaml — the residue rides the next absorb or hygiene
  batch.
- **Fog-owned items** (single-writer hazard, first-landed-wins):
  darkness-watch wiring (fog rm-1411, deadline fog rm-1486 2026-10-19T03:37Z —
  two sibling lineages already hold it), the AGENTS.md:94 Fro Bot state line
  (fog rm-1518 batch owns it; content-identical either way),
  `src/listener/store.ts` rowToMessage revalidation (rm-187 class; two
  siblings), clonedeps pin three-way (rides rm-139).

## Numeral arbitration note

Unlanded sibling bands minted overlapping numerals (fog rm-1975..rm-1977 from
the cycle:6 lineage; a landed sibling's operator-client batch declared its
band ids that renumber at integrate). Extension #45 already records
first-landed-wins; this batch's ids are authoritative only when THIS lineage
lands first, else the integrate fold renumbers — no action owed here.

## Verification of this phase

- Selection doc written in-repo (this file); mirrored to spool
  `delegate/prioritize-728852b9-4187b01a.md`.
- eslint on the new doc path: rc 0. Worktree after this phase: exactly
  ` M ROADMAP.md` (roadmap-phase handoff, untouched) + this new untracked
  doc — zero tracked-file drift introduced.
