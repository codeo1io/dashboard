# Dashboard maintenance batch (2026-10-09, run f510a33e155f) — repository-maintenance cycle 2

Selected 2026-10-09 (run f510a33e155f prioritize, attempt dff3a6487393417d93d6c4a14a827091);
selection made at base `559642a` with `origin/main` verified at `7055c52` (the PR #444 digest-readback
lane landed mid-run; census/pin claims verified identical across both). This is the canonical
in-tree batch record; implement lands it at whatever `origin/main` tip is current, fast-forwarding
first per house practice.

- **Selected:** `Lint-job decomposition` — 1 change-unit (a workflow-reliability restructure), one
  landing; plus the standing ROADMAP record ride.
- **Method:** fresh claim map from this run's assess (a709df66) + research (160936d7) + roadmap
  (2845ad3c) phases, a LIVE sweep of every sibling worktree's uncommitted surfaces (12 dirty walls
  re-probed this date), the open-PR set (#447 digest-readback + pnpm/action-setup re-pin, #448
  operator-contract 1.8.0), and the Monday 2026-10-12 five-fire stack map recorded on the ledger.
- **Context:** congestion remains near-total — the tripwire cure is triple-claimed (rm-755
  implemented in 89ebbf49's unlanded wall incl. the parity-guard test, rm-779 candidate on
  cbe70604's wall, 9fd8bcad convergent), the absorb window is owned by c37a8576's lane, contract
  1.8.0 rides open PR #448, and the listener/monitoring surfaces are held by cbe70604's code. The
  claimable-and-completable remainder at high priority is exactly one item: rm-279.

## U1 — LEAD `rm-279`: Lint-job decomposition into bounded parallel per-surface jobs

**Problem.** The `Lint` job in `.github/workflows/main.yaml:25` runs one `pnpm lint` step
(`eslint --cache` over the whole non-ignored tree: `src/`, `test/`, `scripts/`, root configs,
tracked YAML and Markdown) under a single 35-minute job timeout. The 35 ceiling is load-bearing
(above the worst legitimate cold lint, below validation's ~36-minute poll window) but it means one
wedged surface (the 2026-09-29 markdown paragraph-length cliff class — a single file running past
35 min) reds the whole job and burns the entire budget before any signal about WHICH surface died.
The paragraph-length mechanism itself is cured and CI-proven (a923284c rider; the >4000-char guard
test), so this is the remaining structural half of the def: per-surface independence.

**Scope (design constraints, not a prescription).**

- Decompose the single `Lint` job into parallel per-surface jobs (e.g. code-type lint, Markdown
  lint, YAML lint — the exact partition is implement's to derive from `eslint.config.ts`'s block
  structure), each `runs-on: ubuntu-24.04`, each its own `timeout-minutes` bounded well below 35
  (house precedent: ordinary jobs self-kill at 20; per-surface bounds should be tighter still, sized
  from the timing evidence in the def's riders).
- Parity requirement: the UNION of the per-surface eslint invocations must cover exactly the file
  set and rule set that `pnpm lint` covers today (same config blocks, same ignores — including the
  `web/**`, `docs/solutions/**` etc. ignores). No combined-parity harness (that is the point —
  surfaces run independently); parity is proven structurally: each per-surface invocation's
  `--stats`/file-count output reconciles with a local `pnpm lint --debug` partition taken at
  implement time.
- The load-bearing ceiling comment (`rm-13640` rider block, `timeout-minutes: 35` rationale at
  `main.yaml:35-45`) must be re-homed truthfully — the validation-poll-window invariant survives as
  a statement about EACH job's bound being below the poll window, not one combined 35 ceiling.
  4fcdb776's unlanded comment insert above the timeout (the rm-13640 phantom-record pointer) sits in
  this same region: expect a mechanical comment-region union at integrate.
- `pnpm lint` itself stays unchanged for local use; the decomposition is workflow-side (or adds
  narrowly-scoped `lint:<surface>` scripts if that proves cleaner — either shape satisfies the def).

**Acceptance / evidence expectations.**

- Workflow: parallel per-surface Lint jobs with independently-bounded timeouts; actionlint
  (container form) exits 0; no job bound ≥ 35.
- Parity: implement-phase reconciliation of per-surface file/rule coverage against today's single
  invocation (command output recorded in the implement PhaseResult; `pnpm lint` still exits 0
  locally on the final tree).
- Live proof: the batch's own PR's Main run (green across the decomposed jobs) is the def's
  green-fire evidence, recorded as a rider at compound/compound-review time — same landing-evidence
  pattern as prior workflow batches.
- ROADMAP: selection markers on rm-279 (this doc), selection rider (this date), and the
  implement/compound riders that follow; no census movement (no mints).

## Screened out (recorded so later cycles do not re-derive)

- **`rm-108` action re-pins (setup-node v7.1.0 ×9, upload-artifact v7.0.2 ×4, pnpm/action-setup
  v6.1.0)** — the sites live in `.github/workflows/{main,cve-tripwire,release,scorecard,visual}.yaml`
  and `.github/actions/setup/action.yaml`; cve-tripwire/release are held by 89ebbf49's implemented
  wall, release/scorecard/codeql by c37a8576's absorb lane, and pnpm/action-setup by open PR #447.
  Selecting it now means three same-file textual collisions at integrate for a low-priority (60.0)
  cosmetic bump — the drift stands recorded on the ledger; take it whole when the lanes clear (or
  adopt the reaped 405e9004 worktree's re-pin diff by content, reconciling its `test/action-pins`
  drift test).
- **Monday dispatch re-validations (canary rm-179, audit rm-282)** — remote writes (workflow_dispatch
  → CI), prohibited in this run's phases; unclaimed stewardship work for a gate phase.
- **`rm-116` branch-protection fill** — a `gh api` remote write, not worktree implement material;
  stewardship.
- **`rm-104`** — blocked on the upstream hermes-roadmap generator (watch item). **`rm-249`** —
  blocked on Chrome Push API platform datum. **`rm-149`** — blocked on golangci-lint#4412.
  **`rm-102`** — dependabot-authored PR, external author. **`rm-103`/`rm-252`** — owned by
  c37a8576's absorb lane (2026-10-13 inputs rider). **`rm-157` family** — open PR #448.
- **The cve-tripwire cure** — triple-claimed; this run's roadmap phase recorded the ownership map
  (rm-648 rider). Emergency floor defense remains available if no lane lands by Sunday: the
  one-line `NODE_IMAGE` rename — coordinate, do not duplicate.

## Next-cycle candidate order (carried for prioritize)

1. Post-Monday ledger sweep: record the five fires' outcomes (audit 03:37Z re-proof, base-drift
   04:13Z predicted green, upstream-drift 05:17Z by-design red, canary 05:23Z first credible green,
   tripwire 06:53Z deterministic red unless a cure lands) as riders on rm-282/178/648/179.
2. `rm-108` re-pins once the three holding lanes land; adopt the reaped 405e9004 content by
   reconciliation.
3. `rm-116` branch-protection fill (stewardship gate) — branch protection is a shell today.
4. `rm-139` Node-26 window (LTS promotion 2026-10-28): runner-image re-eval + base-image follow.
5. `rm-249` platform re-probe (Chrome Push API rate-limiting rollout status).

## Landing notes

- Base at selection: `559642a` (worktree) / `7055c52` (origin/main tip). Implement fast-forwards to
  the live tip first.
- Expected integrate friction: the `test/roadmap-integrity-guard.test.ts` pin is dirty in eight
  sibling walls (each mint phase bumped it); this batch does not touch it. The main.yaml comment
  region co-edit with 4fcdb776 is comment-only and mechanical.
- No new defs minted this cycle; census stays `237/0/rm-744`, guard pin stays `744`.
