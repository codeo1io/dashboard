# Dashboard maintenance batch (2026-10-06, run 85e37a8b)

repository-maintenance cycle 1 — implement attempt 473ec0ca. Batch selected by
this run's prioritize phase (ac73f23e): "one-window restore-cure landing +
ledger recurrence guard" (B1 restore-cure landing window, B2 record riders,
B3 ledger recurrence guard).

## Frame at compose time (all live-derived this attempt)

Main moved three times during this run's pipeline: fe928ca (08:22Z, run
5e661558's cure variant) → c210933 (~11:30Z, run 73d35a6c) → **ac61ff3**
(~12:2Z, conductor-landing of run cfa9f94b — the origin lineage of the
fleet's adopted cycle-3 cure). ac61ff3 re-landed cfa9f94b's docs and
re-unions its rider lines, so this batch's re-union half is already
satisfied on main; the residual value shipped here is the guard (rm-678's
detection + vitest halves), the rm-679 mint, the record riders, the census
comment, and this record.

Worktree base was advanced `3d07cf9 → ac61ff3` (`git reset --hard`) before
layering. Reason (mechanical, first-hand in the hermes-conductor source):
the validation route builds its disposable base from the **worktree HEAD
lineage** plus current-main workflows, then applies `git diff HEAD` with
`--3way` — a batch composed on a stale base makes every changed workflow an
add/add collision that aborts the route pre-push (fleet precedent: attempts
736cc62b / e9bc28f5-fix / run-1 pre-push aborts). Base ac61ff3 makes the
guard change a clean MODIFY of the landed 68-line variant.

## Files in this batch

| file | change | why |
| --- | --- | --- |
| `ROADMAP.md` | +23 lines (pure additions on ac61ff3's ledger) | 10 dated riders (rm-104, rm-117, rm-120, rm-133, rm-138, rm-139, rm-143, rm-157, rm-271, rm-499 — each verified by reverse lookup to its owning def) + mints rm-678/rm-679 + cycle extension comment (with implement re-anchor addendum) + census comment. 222 → 224 defs, 99 → 101 comments, 0 trailing-ws, 0 dups. |
| `.github/workflows/lockfile-guard.yaml` | +32 lines (68 → 100) | appends the `ledger-census` job — the no-install detection half of rm-678 (baseline fetch + `node scripts/check-ledger-census.mjs`). actionlint clean. |
| `scripts/check-ledger-census.mjs` | new (185 lines) | rm-678 detection half: shape invariants (dup ids, trailing ws, un-backticked `['...']` bracket lists — with backtick-span stripping, `## Closed items` collapse section, census-comment truthfulness, status-token vocabulary) + non-regression vs baseline (def/comment counts, dropped defs, unmoved closures, acceptance coverage). Zero deps, runs on the runner's stock Node. |
| `test/ledger-schema.test.ts` | new (123 lines) | rm-678 vitest half: subprocess contract tests — live ledger green both modes, fixture RED, per-rule synthetic cases (unmoved-closure with/without dated marker, duplicate-id, census-lie, bracket-list backtick discrimination). |
| `test/fixtures/roadmap-3d07cf9.md` | new (1026 lines) | byte-copy of `git show 3d07cf9:ROADMAP.md` — the corrupted render (197 defs / 1 comment / 24 trailing-ws / `## Closed items` collapse) as the permanent red-first fixture. Bundled instead of `git show` at test time so shallow checkouts stay green. |
| this doc | new | cycle-1 batch record. |

## Why the guard is split in two halves

A vitest guard depends on `pnpm install`; the install wall is exactly the
failure family this workflow protects (rm-497 lineage, the 3d07cf9
lockfile/workspace mismatch). So the workflow half runs on stock Node with
no install (chicken-and-egg), and the vitest half pins the same contract in
the normal test gate. Sibling note: run 9189a4ac's cycle-1 batch validated a
parallel implementation (`scripts/roadmap-census.ts` +
`test/roadmap-integrity-guard.test.ts`) through ephemeral PR #403 —
unlanded; if both batches ever integrate, union by content (their fixture
shells out to `git show 3d07cf9`, which breaks on shallow checkouts; this
one bundles the fixture).

## Verification (focused battery, this phase)

- `node scripts/check-ledger-census.mjs` → green (224 defs / 101 comments / max rm-679, 0 findings)
- `node scripts/check-ledger-census.mjs --baseline <ac61ff3 ROADMAP>` → green
- `node scripts/check-ledger-census.mjs --roadmap test/fixtures/roadmap-3d07cf9.md --baseline ROADMAP.md` → RED, 252 findings across 8 rule classes (status-token ×194, trailing-ws ×24, dropped-def ×29, bracket-list-line, closed-items-section, def-count-drop, comment-count-drop, trailing-ws-regression)
- `npx vitest run test/ledger-schema.test.ts` → 8/8 green
- `npx eslint scripts/check-ledger-census.mjs test/ledger-schema.test.ts` → clean (after house-style `--fix` + explicit `node:process` import + import order)
- `npx tsc --noEmit -p tsconfig.json` → rc=0, zero errors (test file joins the `**/*.ts` program)
- fixture byte-identity: staged `test/fixtures/roadmap-3d07cf9.md` blob `ef7c70d3` == `git rev-parse 3d07cf9:ROADMAP.md`
- actionlint (docker container form) on the appended workflow → clean (caught and fixed a real SC2016 single-quote expansion bug pre-delivery)
- `git status --porcelain` clean of scratch; all artifacts also mirrored under the delegate spool scratch dir

## Ops notes

- A harness write anomaly recurred mid-phase (bash-python `/tmp` writes reporting success then vanishing cross-call — cf. the 2026-10-06 conductor-worktree incident). All compositions were therefore delivered same-call through the git index (blob-sha-verified) and mirrored to the delegate spool; ROADMAP.md verified as index blob `9200ce9f`.
- Next free ledger id on this tree: **rm-680** (unlanded sibling layers claim rm-674/676/677/680 — re-probe before minting).
