# Cycle 2 batch selection — 2026-10-06 (repository-maintenance, run c6cd7c83)

Provenance: conductor run `c6cd7c83df84424ca6e7b840b6cb5870`, phase `prioritize`, attempt `13152724ba1a42fead599c4b9253ed19`; scoring skill declared: **ce-plan** (the compound set has no ce-prioritize; ce-plan's batch-selection/scoring pass adapted, consistent with the assess/research/roadmap skill adaptations this run). Inputs: this run's assess (`babaf41c`), research (`2ff8f3b1`), roadmap extension #13 (`7994726a`); live re-probes executed during this phase per the standing rule that batch selection must re-derive the origin frame, not trust dispatch-time state.

## Frame (re-probed live this phase)

- Dispatched base `306a972` == origin/main at dispatch; re-probed during this phase: origin/main is now `3d07cf9` — exactly ONE commit ahead, the `roadmap: managed ROADMAP.md render refresh (hermes-autonomy roadmap-sync)` landing of 2026-10-06T00:07:29Z (ROADMAP.md only, +795/-1605), whose canonical `- id:` census reads 197 vs this base's 215 with at least 20 tracked ids de-canonized (the `rm-104` render-defect class recurring on origin).
- The frozen-install wall stands: `1e1e2f5` (2026-10-04 upstream merge) regressed pnpm-lock.yaml to pre-floor resolutions while pnpm-workspace.yaml kept the cured floors; `pnpm install --frozen-lockfile` fails `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` (first-hand reproduction this run); the `306a972` check-run family reads 11 failure / 1 skipped / 6 success of 18; 9 dependabot alerts open (`#29`/`#30` fast-uri HIGH, `#32` undici HIGH + `#34`/`#35`/`#36`/`#39`/`#40`, `#45` brace-expansion); `pnpm audit -r` reads 17 instances; the 2026-10-05 Monday crons propagated the wall (canary run `37308919388` failed at its own install step — root-caused first-hand this run; upstream-drift run `37308222484` red-by-design at behind=2 ahead=162 with its tracking-issue step dead because issues are disabled on the repo).
- The validated cure is stranded and fresh: `conductor/ci-6f0d0d063134` (= PR `#389` head) — re-probed live this phase: OPEN, MERGEABLE, merge-base == `306a972` (applies with zero rebase), 9 files +478/-137, checks 11/11 PASS (incl `Lockfile Guard`). It supersedes the older strand `conductor/run-a2def4ce34dc` @660a80d (2 behind) that the 2026-10-04 cycle-1 batch selected.
- Unlanded sibling rider claims in the fleet: `cfa9f94b` (+16 riders), this run's extension #13 (+12 riders + the `rm-673` mint), and the strand's own +43 roadmap lines — all must union-merge at implement.

## Candidates

Grouped from the open ledger (215 defs at this base) plus this run's assess/research/roadmap findings:

- **rm-673** (minted this run): stale-lockfile install wall — land the validated cure. Everything downstream (green checks, scheduled gates, alerts, posture, every future landing) is blocked behind it.
- **rm-104 family**: the `3d07cf9` render refresh on origin/main must be reconciled or reverted when the next batch folds — the ledger repair and the cure should land in one sequenced window.
- **rm-131 / rm-285 rider family**: lockfile-guard test assertions and the truth corrections falsified by `1e1e2f5` — carried BY the cure batch (the strand already contains them).
- **rm-140**: pnpm 11.28.4 lockstep (pin trio at 11.28.3) — the strand already carries exactly this bump; rides the cure.
- **rm-276**: audit-0-for-a-week rider — auto-resolves when the regen lands; the next weekly audit fire is the proof point.
- **rm-280**: canary green-first-fire acceptance — re-opens-or-closes on the 2026-10-12 cron once the cure lands; no code action.
- **rm-282**: audit-gate dependabot-blind half (toml HIGH invisible to dependabot in every state) — cured by the same regen (floor already exists at pnpm-workspace.yaml:59); the census-diff triage convention is a standing rider, not batch work.
- **rm-116**: fill branch protection (empty shell: contexts none, admins unenforced) — becomes safely landable only AFTER green checks exist on main; wrong to bundle with the cure.
- **rm-139**: Node 26 go/no-go — window is the week of 2026-10-28 (schedule.json authoritative); premature this cycle.
- **rm-271 / rm-133**: majors window (TS 7 / vitest 5 / jsdom 30 + undici 8 one-move pair) — re-eval 2026-10-21; timing-gated, not this cycle.
- **rm-159 / rm-181**: origin residue sweep (123 conductor/* heads) + open-PR census — ONLY after adoption lands (the strands carry the only green validation-of-record; deleting them first would orphan it and unreplace the phantom workflow id 375606447).
- **rm-499**: fast-uri 4.x window — deliberate single move, post-cure, after an ajv/eslint tolerance check; not bundled.
- **rm-252 / rm-259**: upstream absorb — standing NO (structural divergence; read-only invariant).
- **rm-103 / rm-108 / rm-166 / rm-188** riders: watch-only datums recorded this run; no action this cycle.
- Sibling `cc4339fe`'s unlanded `rm-672` (auto-census sentinel) + riders: union-merge at implement; not ours to land now.

## Scorecard

Axes per ce-plan: impact (what unblocks), risk (landing risk given validation state), effort (authoring + review + validation), dependencies (what must land first), strategic (long-game value). Scale high/med/low.

| Candidate | Impact | Risk | Effort | Deps | Strategic | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| rm-673 cure adoption | high (11 checks, 2 scheduled gates, 9 alerts, posture) | low (11/11 green on identical base; adoption not authoring) | low (mechanical adopt + rider union) | none — everything depends on IT | high (restores frozen-install contract, kills phantom gate) | SELECT |
| rm-104 render reconcile | high (ledger integrity) | med (merge against a rewritten ROADMAP) | med | with rm-673 | high | SELECT (same batch, integrate step) |
| rider-union manifest | med | low | med (3-way: strand + cfa9f94b + ext #13) | with rm-673 | med | SELECT (same batch) |
| rm-116 branch protection | med | med-high (enforce before checks proven green) | low | rm-673 | med | next batch |
| rm-139 Node 26 | med | med | med | window 2026-10-28 | med | defer |
| rm-271/rm-133 majors | med | med (TS7 peer fit unprobed) | med | re-eval 2026-10-21 | med | defer |
| rm-159/rm-181 sweeps | low-med | low | low | AFTER rm-673 | low | post-adoption |
| rm-499 fast-uri 4.x | low | med (ajv/eslint tolerance unprobed) | low | after cure | low | deliberate later move |
| rm-276/rm-280/rm-282 auto-resolutions | med (proof points) | none | none | rm-673 | med | observe, no action |

No combination beats the cure adoption on any axis: it is the only candidate with zero dependencies, pre-validated low risk, and maximal unblock surface. Everything else is either carried by it, auto-resolved by it, or timing-gated past this cycle.

## Selected Batch

**The rm-673 cure-adoption batch** (single coherent batch, completable end-to-end this cycle):

1. **Adopt `conductor/ci-6f0d0d063134` content at base `306a972`** (fetch + adopt the 9 files; no rebase needed — merge-base is the base):
   - B1: pnpm-lock.yaml floors regen — fast-uri 3.1.8, undici 7.30.0, toml 5.0.0, brace-expansion 2.1.7+5.0.12; `pnpm audit -r` 17 -> 0; alerts `#29`/`#30`/`#32`/`#45` auto-close; the dependabot-blind toml HIGH (GHSA-82x6-q7mm-w9cf) clears because the floor already exists.
   - B2: `verifyDepsBeforeRun: false` in pnpm-workspace.yaml (kills the frozen-install trap class at its pnpm-level root).
   - B3: Dockerfile libpcre2 correction (CVE-2026-103111; digest 0e0ff40 ships 10.42-1+deb12u1, fix is deb12u2) + corepack `pnpm@11.28.4` — this also lands rm-140's lockstep candidate.
   - B4: `.github/workflows/lockfile-guard.yaml` (62 lines) ON MAIN — resolves the phantom workflow (id 375606447) by landing the file rather than disabling the workflow.
   - R: package.json `packageManager` 11.28.4 + the rm-131 guard-family test assertion riders.
2. **ROADMAP union-merge at base `306a972`**: the strand's +43 roadmap lines + `cfa9f94b`'s unlanded +16 riders + this run's extension #13 (12 dated riders + the `rm-673` mint) — one coherent ledger state riding the same landing.
3. **`3d07cf9` render reconcile-or-revert at integrate, BEFORE the fold** — cure + ledger repair in one sequenced window; re-render only after the emitter learns no-trailing-space-on-empty-acceptance and backticked bracket lists (standing house note; the render currently de-canonizes 20+ ids).
4. **Truth corrections riding the landing** (already enumerated in rm-673's acceptance): pnpm-workspace.yaml:24-30 stale comment, rm-285's falsified status string, Dockerfile:52-56 claim, the job-level-if solutions doc self-hosted example.
5. **Explicitly NOT in this batch**: rm-116 branch protection (immediate next batch once checks are green on main); Node 26 window (2026-10-28); majors window (2026-10-21); origin residue sweeps (post-adoption only); the fast-uri 4.x move; any upstream absorb.

## Delivery Notes

- Mechanics for implement: `git fetch origin conductor/ci-6f0d0d063134`, adopt the nine files (`git checkout FETCH_HEAD -- <paths>`), apply the rider union, run the local gates (`pnpm install --frozen-lockfile` must be rc=0 now, `pnpm audit -r` 0/0, `npm exec -- vitest run test/roadmap-length-guard.test.ts`, `pnpm lint`, `pnpm test` after `pnpm build:web` if suites touch `/`).
- Digest discipline: the batch is executable-affected via package.json/test assertions — the implement fold must re-derive and declare the NEW dispatch digest, not echo the dispatch-time one.
- Validation: ephemeral-PR full validation is the gate of record (recent fleet wall-clock ≈2.5-3 min for all 11 checks); expected result 11/11 green INCLUDING Lockfile Guard now running from main.
- Post-landing expectations (observe, do not chase): alerts `#29`/`#30`/`#32`/`#45` close on the landing push; weekly audit gate returns green at its next fire; canary's green-first-fire clause re-closes at the 2026-10-12 05:23Z cron (allow for the Monday queue-delay class); scorecard Vulnerabilities recovers at the next analyze cycle.
- Sequencing cautions: land via the ephemeral-validation path, not main-direct; do NOT sweep conductor/* refs in the same landing (rm-159's preserve-strand rider); do NOT fill branch protection until green checks exist on main.
- This doc lives in the repo tree so it survives ephemeral teardown and commits with the fold (house rule); non-executable surface only — the dispatch validation digest is unchanged by this phase's own edits.

One batch, one landing window: adopt the pre-validated cure, fold the ledger coherently, repair the render's damage in the same window, and leave the repo with green checks, a live lockfile guard on main, and a truthful ledger — the minimal-risk maximal-unblock move, with every timing-gated or dependency-ordered item explicitly deferred rather than silently dropped.
