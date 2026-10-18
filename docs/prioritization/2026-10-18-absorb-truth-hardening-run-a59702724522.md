---
module: dashboard
tags: [repository-maintenance, cycle-2, absorb-truth, rm-1972, rm-102, rm-252, run-a59702724522]
problem_type: maintenance-batch
---

# Absorb-truth hardening — batch record (2026-10-18, run a59702724522434e927bc763f2e476e1)

Repository-maintenance cycle:2 batch, implemented at base `f157cb8b`
(porcelain-clean at dispatch). Phases: assess `11ff8c03` (redone from scratch —
prior attempt `b0ba3f9a` died to provider infra with no artifact) → research
`6fd81ba8` (redone likewise) → roadmap ext `7881e2c2` (minted rm-1970..rm-1972
against fold target 64cd2f6a; prior attempt `d44f4fe8` dead) → prioritize
`fbd6ef33` → stewardship `8e12c079` → implement `82a4ff62` (this record).

## The problem this batch cures

Upstream PR #644 bumped `@hono/node-server` 2.1.3→2.1.5 **lockfile-only** and
was absorbed by union-merge: commit `8d867b9b` is an ancestor of main today,
while the tip's root importer still resolves `@hono/node-server@2.1.3`. No
check anywhere failed. The class recurred immediately — upstream then merged
PR #647 (react 19.3.1), a second dep-bump PR awaiting absorb, and PR #646 adds
a NEW dependency (`markdown-it@15.0.3`) whose absence would also pass silently.

## What landed

- **`scripts/absorb-verify.ts` (NEW, 415 lines) — the rm-1972 gate.** Given an
  absorbed window (`--upstream <ref>`, optional `--base`, optional
  `--ours-ref` for post-landing evidence; defaults verify the WORKING TREE so
  uncommitted cures verify pre-landing), it derives every dependency that
  changed in the window from BOTH the manifest diff AND the root-importer
  lockfile-resolution diff — the lockfile leg is not optional: PR #644's
  manifest specifier never moved (`^2.0.0` throughout), so a manifest-only
  diff would miss the exact drop class this gate was minted for (found
  first-hand while building it; the fixture suite pins that shape). Verdicts:
  `RESOLUTION_DROP` / `SPECIFIER_DRIFT` / `MISSING` / `NOT_INSTALLED` → exit 4;
  peer-suffix-stripped comparisons so a dep whose own version did not move is
  not flagged when its PEERS did (react 19.3.1 would otherwise red-flag
  `@testing-library/react` at the same 16.3.3); `UNSUPPORTED` → exit 3
  fail-closed (unreadable manifest/lockfile, unresolvable refs — nothing is
  concluded); empty window → exit 0 (a true clean, not indeterminacy). Emits a
  JSON payload with per-dependency probe lines and per-commit attribution
  (which PR a dep rode in on). Conventions mirror `scripts/absorb-window.ts`.
- **`test/absorb-verify.test.ts` (NEW, 13 tests) — synthetic regression
  fixtures.** Temp-git-repo pattern from `test/absorb-window.test.ts`: the
  recorded #644 shape (manifest-only AND lockfile-only variants), cured
  windows, #646 new-dep MISSING, #647 react shape, specifier drift,
  NOT_INSTALLED, empty window, `--ours-ref` post-landing evidence, per-commit
  attribution, fail-closed (unreadable lockfile, unresolvable ref), usage
  exits.
- **Standing-instance cure**: `package.json` `@hono/node-server` ^2.1.3→^2.1.5
  with `pnpm-lock.yaml` root-importer resolution regenerated
  (`pnpm install --no-frozen-lockfile` then `--frozen-lockfile` re-verified
  green — 2.4s). Content-identical to sibling 5457d3ff's unlanded rm-1523 leg;
  first-landed-wins, lossless reconcile.
- **Convention ride (rm-252)**: comment-only pointer in
  `.github/workflows/upstream-drift.yaml` naming absorb-verify a required
  absorb step, in the existing rm-856 companion block.
- **Regression pin**: this document records 8d867b9b-ancestor-of-main vs
  2.1.3-at-tip, plus the probe lines below.
- **Ops rider (rm-102)**: dated unstall touch on `.github/dependabot.yml` —
  expectation: grouped PRs within 48h, else a dated no-op.
- **Ledger**: ROADMAP.md replaced with the roadmap phase's postimage
  (64cd2f6a + 11-line delta; census 269 defs / 0 dups / max rm-1972 — main's
  census script re-run green on the result). NOTE for integrate: this worktree
  deliberately carries the 64cd2f6a-anchored ledger; f5927919's later riders
  merge by content.

## Live evidence (the gate's first real runs)

Window `8d867b9b^..autonomy-upstream/main` (stale at #646 for
`autonomy-upstream`; the `upstream` remote holds #647 — re-fetched at fold):

```text
absorb-verify @hono/node-server: upstream ^2.0.0 (resolve 2.1.5) vs ours 2.1.5 [manifest ^2.1.5] — OK (#644, cured)
absorb-verify markdown-it: upstream 15.0.3 (resolve 15.0.3) vs ours none [manifest none] — MISSING (#646)
absorb-verify react: upstream 19.3.1 (resolve 19.3.1) vs ours 19.3.0 [manifest 19.3.0] — RESOLUTION_DROP (react 19.3.1 (#647))
absorb-verify react-dom: … RESOLUTION_DROP (#647)
```

Exit 4 — the two live reds are TRUE (#646/#647 not yet absorbed; deliberately
not cured here: react rides the gate at the next absorb per the rm-252 rider —
one landing, not two; #646 is fog rm-1513's port). At `--ours-ref HEAD`
(pre-cure base) the hono line reads RESOLUTION_DROP — the regression shape.

## Verification (focused set, per the implement budget)

- `pnpm exec vitest run test/absorb-verify.test.ts` → 13/13 green.
- Roadmap guards on the postimage: render/integrity/length → 15 tests green;
  census (main's script) → 269 / 0 dups / max rm-1972.
- `pnpm install --frozen-lockfile` green after the cure.
- eslint on every changed/new file → 0 problems (repo no-semicolon style
  applied).
- `pnpm check-types` → clean.
- actionlint (container form) on `upstream-drift.yaml` → green.

Deliberately out of scope (per stewardship separations): snapshot-store zone
(sibling run-ed8f47e0 dirty), react 19.3.1, #646 port, workflow uses-pins.
