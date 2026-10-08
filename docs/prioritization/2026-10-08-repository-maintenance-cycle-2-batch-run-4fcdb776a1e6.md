---
module: dashboard
tags: ['prioritization', 'repository-maintenance', 'cycle-2', 'batch-selection']
problem_type: maintenance-planning
run: '4fcdb776a1e64051b7ff7201a2a5eb13'
cycle: 2
---

# Dashboard maintenance batch (2026-10-08, run 4fcdb776a1e6)

Authoritative batch-selection record for repository-maintenance cycle:2 run `4fcdb776a1e6`
(prioritize attempt `efad5d032f7c4f9098a7b7a5dffa687a`), base `e8d220c` — this tree's HEAD, an
ancestor of `origin/main` `b658cb6` (2 commits behind: 5aab7c7 + a94d0659's rm-698 trixie
re-pin + NEW `cve-tripwire.yaml`; no `cve-tripwire.yaml` in this base). Inputs: assess
`c76e8596` (fresh adversarial at e8d220c, full-suite health green first-hand: server 60
files/2424 + web 31 files/1183, lint rc=0, check-types rc=0, 3 guard suites 14/14), research
`39b8c3fd` (upstream/registry/actions/gateway probes), roadmap `31aa993a` (cycle-2 extension:
mints rm-768/rm-769 + 18 riders; census 235/0/rm-769 healthy, guard pin 744→769).

## Ledger state at selection

235 defs / 0 dups / max rm-769; the fresh cycle-2 extension minted the only two genuinely
unowned findings from this run's assess (F3 stream-handle leak, F5 phantom-citation class) —
every other assess finding converged onto existing or sibling-unlanded ledger lines (map in the
cycle-2 extension comment). Sibling-unlanded claims at selection time: rm-745..750 (5bd710d8,
SAME base e8d220c — highest double-lane risk), rm-751-754 (f266ce30), rm-755-758 (9fd8bcad,
implemented at b658cb6), rm-759-761 (788aa489 + 89ebbf49 divergent), rm-762-766 (13de8662),
rm-767 (392bad29, selected into ITS cycle:1 batch), rm-712/713 (6277460e → folds to landed
rm-698).

## Selected batch — theme: stream + ledger truth

Both members are THIS run's own fresh discoveries with acceptance criteria authored at the
roadmap phase, are locally verifiable end-to-end this cycle (`implement → review → fold → CI`
per the rm-703 playbook), have **zero file overlap** with each other, need no external clock,
release, or gate, and have **zero sibling contention** (no near-noop union, no id/file
double-claims).

| # | Item | Def / ownership | Surfaces | Effort | Verification |
|---|------|-----------------|----------|--------|--------------|
| B1 | `setLaunchStreamHandle` legacy-path overwrite leak — close prior stream exactly once, both paths | `rm-768` (this run's mint) | `public/operator-launch.js` (:423 export, :747 legacy call, :740-746 comment), its test corpus (`test/operator-launch-core.test.ts` family) | S | EventSource/close-spy lifecycle test: stream A closed exactly once when B attaches, on BOTH the runtime-delegated and legacy paths; no double-close; A's notice/status bindings torn down; seam made overwrite-safe or legacy call rerouted; :740-746 comment re-truthed; `resetLaunchState` (:788-816) covered for stale-close double-invoke; full gates |
| B2 | Ledger citation integrity — phantom id `rm-13640` | `rm-769` (this run's mint) | `scripts/roadmap-census.ts` or `test/roadmap-integrity-guard.test.ts` (+ `PHANTOM_ALLOWLIST`), `.github/workflows/main.yaml:33` comment-only pointer | S | every `rm-NNNN` cited in ROADMAP prose/comments resolves to a def OR sits in the allowlist whose comment records the origin (conductor-salvage `3135ebf` / run f9854748, 2026-09-29; landed equivalents rm-279/rm-284/rm-486); red-proven on a seeded dangling citation; historical prose verbatim; full gates |

### Member rationale

- **B1** (`rm-768`): the only runtime-lifecycle correctness fix in the pool with clean
  ownership. Live first-hand: the public twin's legacy no-runtime path calls
  `setLaunchStreamHandle(streamHandle)` directly, bypassing the runtime seam whose adjacent
  comment claims centralized close-ownership — a replaced stream is never closed (leaked
  EventSource + stale notice/status bindings). Verified unowned by content across ALL 37 sibling
  worktrees (zero ROADMAP mentions of the symbol; sibling rm-745's scope is the reset/attach
  half, not the stream-handle half). Small, user-visible, self-contained.
- **B2** (`rm-769`): kills a recurring fleet trip hazard — the phantom `rm-13640` is cited at
  9 ROADMAP sites + `main.yaml:33` and has tripped extensions #11/#12/#13; every future
  census/grep re-trips until a guard owns the exclusion. Origin traced this run
  (conductor-salvage 3135ebf / run f9854748's ephemeral cloud-CI commits), so the allowlist can
  record WHY the phantom exists, not just that it does.

### Why coherent

One integrity theme: close the two truth gaps THIS cycle's own assess opened (runtime
lifecycle truth + ledger citation truth). Zero cross-member file overlap (public operator-launch
surface + its tests, vs guard tooling + a workflow comment), no member depends on the other's
landing, every acceptance is checkable by this repo's own gates (vitest, eslint, check-types,
census). Total effort ≈ half a cycle day — deliberately small: the pool's remaining fresh value
is sibling-owned this window, and over-selecting would mint duplicate lanes.

### Why only two members (the honest cut)

Every other plausible member is sibling-claimed unlanded at selection time: the currency lanes
(actions re-pins → 392bad29's selected batch; pnpm 12.10.1 re-probe → rm-763/13de8662;
eslint/vite soak-cut → rm-760/788aa489), the tripwire cure (rm-755 — triple-claimed, and the
file does not exist at this base), the same-base assess class (rm-745/746/747 → 5bd710d8,
identical base = maximal near-noop-union risk), the SARIF dismissal (rm-758 → 9fd8bcad),
validateDynamicId parity (rm-767 → 392bad29's selected batch). Selecting any of them would
duplicate an in-flight lane; the fleet's union-by-content integrate absorbs duplicates only as
near-noops, which is wasted cycle budget.

## Deferred — highest-value exclusions and why

| Item | Reason |
|------|--------|
| rm-755-class tripwire NODE_IMAGE cure | **TIME-CRITICAL but not ours to duplicate**: first scheduled fire Mon 2026-10-12 06:53Z runs red on stale `node:24-slim` (:35 at b658cb6) unless cured; IMPLEMENTED unlanded by 9fd8bcad at b658cb6 (riding its composition with an expedited workflow_dispatch proof plan); the file is absent at this base (e8d220c) — implementing here means re-creating a triple-claimed file against a 3-way merge with a94d0659. This run records the urgency only (riders on rm-116/rm-517); contingency: a main-based hotfix lane re-opens if 9fd8bcad's composition dies before Monday. |
| rm-745 / rm-746 / rm-747 (assess F1/F2/F4 class) | Sibling 5bd710d8 claimed all three at the SAME base e8d220c — implementing here duplicates an in-flight identical-base lane (near-noop union at integrate). Convergence map already in the cycle-2 extension comment. |
| rm-116 (branch-protection fill) | Strategic but push-gated (gh api mutations) + inherits the tripwire red window until the rm-755 lane lands; sixth empty-shell re-probe recorded on its rider. |
| rm-760-class currency refresh (eslint 10.12.0 / vite 8.3.3 soak-cut) | 788aa489's unlanded rm-760 owns the cut; vite 8.3.4 (10-08T12:07Z) and @hono/node-server 2.1.4 under-age per the soak rule; playwright 1.64.0 double-gated (under-age + mcr digest unverifiable — accessToken endpoint failed twice at research). |
| rm-758 (stale SARIF dismissal) | 9fd8bcad candidate + requires live gh alert writes; not this cycle. |
| rm-767 (validateDynamicId %-rejection) | 392bad29's selected cycle:1 batch item (unlanded) — contention. |
| rm-252 / rm-157 / rm-103 (absorb + operator-contract 1.8.0) | Absorb decision due 2026-10-13; NO-ABSORB posture stands this window (4a90eab's residual is a82871d only); not an implement batch. |
| Conductor ref hygiene (146 heads) | Push-stage reap; rides the landing pipeline. |

## Ledger effects of this phase

- `rm-768`/`rm-769` flipped candidate → open with selection provenance (prioritize
  `efad5d03`) + one selection rider each. Census after flips: 235/0/rm-769 unchanged (status
  moves don't move counts); guard pin stays `toBe(769)`.
- **Cycle-label correction (disclosed)**: the roadmap phase had labeled this run's extension
  comment `cycle:1 extension #38` and its riders `cycle:1`; the run requirement is
  repository-maintenance **cycle:2**, and the landed 23d39aa7 precedent writes cycle-2
  extensions UNNUMBERED. Relabeled: comment opener → `<!-- cycle-2 extension (`, the #38
  ordinal retracted in-comment (cycle-1 ceiling stays #37 above landed #35), all 18 riders +
  both def-lines → `cycle:2`, guard-test provenance comment updated. Census claim untouched
  (235/0/rm-769); newest-census-comment position untouched (still the file's last
  census-bearing comment).

## Verification expectations (batch level, for implement/review/fold)

- B1: red-first lifecycle test (fails on the unguarded legacy overwrite), then the seam fix;
  both paths green; no behavior change for the runtime-delegated path beyond the close
  guarantee; `pnpm check-types` + eslint on touched surfaces.
- B2: red-first seeded dangling citation (guard fails), allowlist + origin comment lands,
  guard green on the live ledger; `main.yaml:33` comment-only edit actionlint-clean.
- Ledger hygiene at fold: census 235/0/rm-769 unless the batch mints (it should not), guard
  pin `toBe(769)` intact, extension/compound comment sequence conventions per the house rules.
