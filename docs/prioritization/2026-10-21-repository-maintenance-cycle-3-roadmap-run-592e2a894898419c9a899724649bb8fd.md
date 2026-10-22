# Repository-maintenance cycle 3 — roadmap extension (run 592e2a89)

- date: 2026-10-21 · conductor run `592e2a894898419c9a899724649bb8fd`, roadmap attempts
  `c293bcb887eb4f0a9ede01bd86e1b67a` (reaped mid-turn; graft adopted) and
  `50ed9cd1e52f41968b6cf97c0cdca051` (adoption + completion) ·
  repository-maintenance `5a7e5ebc8a8546c8be78f8b1e2a7acd2` cycle:3 · base `76005aa` == origin/main
- inputs: this run's assess `06f4be4d` (battery: install 759 pkgs, check-types and lint green,
  tests 3928 passed with one adjudicated load flake — isolated rerun x3 green; census
  325 defs / 0 dups / max rm-2032) and research `e61ab056` (upstream window 32-behind at
  `f37600d`, per-PR forensics, live registry sweeps)

## Deliverables

- `ROADMAP.md` — extension #59: two mint defs (rm-2146, rm-2147), four dated riders
  (rm-252, rm-1524, rm-1449, rm-1451), one mint-text correction, and the adoption/extension
  record comment.

## Mints

1. **rm-2146 — operator-suite load tolerance (reliability 63.0).** Port upstream PR #682:
   replace the fixed 20 ms realSetTimeout settle with `await mounted.awaitInit()`, plus the
   #673 second datum. Fork-side evidence: three adjudicated flake-family sites —
   `test/operator-stream-core.test.ts:13175` (2026-10-19, diff-identity), `:14313`
   (2026-10-20), and the mountLoader block of `web/src/operator/runtime.test.ts` (`:1226`
   inside 1217-1231, 2026-10-21, observed by this run's assess battery); the awaitInit
   primitive already exists at `:4481` and is exposed at `:4492`. Upstream #683's own
   release-gating script is a family mate. Verified unowned: no def owns this surface.
2. **rm-2147 — launch-surface robustness (reliability 60.0).** Port upstream PR #678
   (bounded, deduped, unmount-ignoring launch requests) plus #679 (visible disabled state):
   191 source lines plus 927 lines of new tests upstream; `public/operator-launch.js` at
   39,215 bytes carries 24 retry/abort-family sites vs upstream's 30. Port, not cherry-pick:
   the rm-283 instance-scoped owner and the gapEl/checkout-detail wiring are named in the
   def. Contract-neutral.

## Riders

- **rm-252 (absorb window):** window re-measured — 32 commits behind `f37600d`, 371 ahead;
  the tip is PR #696 bumping `fro-bot/agent` to v0.125.0 (fork pins v0.123.1 at `e59939d`),
  exactly the parity this def owes. The rider carries the full 32-commit triage.
- **rm-1524 (vitest lane):** the dated re-eval arrived 2026-10-21 (the ignore block in
  `dependabot.yml`). Upstream #694 + #695 prove vitest 5 + jest-dom 7 must move as ONE
  change — the jest-dom matcher-declaration merge rides along.
- **rm-1449 (dependency majors):** the majors quartet #691-#694 is upstream-proven
  drop-in; registry byte-stable at 2026-10-21; the no-two-majors rule bends only for the
  vitest + jest-dom coupling.
- **rm-1451 (actions pin sweep):** pin census — `setup-node` v7.0.0 (release-channel.yaml)
  and `setup-qemu-action` v3.7.0 (vs v4.4.0, release.yaml) are the only stragglers; codeql
  v4.39.0 current; bun v1.4.3 at parity. Node 26 gate evidence unchanged (gate 2026-10-28).

## Adoption record

Prior attempt `c293bcb887eb4f0a9ede01bd86e1b67a` was reaped mid-turn with its PhaseResult
unwritten. Its graft was verified leg-by-leg against this work order and adopted with one
correction: the rm-2146 mint text's live-wall claim (sibling worktrees top out at rm-2141)
was stale at adoption — the wall census shows sibling mints through rm-2153 (rm-2141 on
three walls, rm-2142 through rm-2145 dense on two, rm-2150-2153 later) — and was reworded
to the durable first-landed-wins-by-title claim. No sibling worktree mints rm-2146 or
rm-2147; rm-2148 and rm-2149 are the only ids unclaimed by any live wall in the band.

## Screening (no mints)

- mountLoader awaitInit port as a standalone def — folded into rm-2146
  (cross-reference-not-duplication).
- Remaining operator-client launch behaviors beyond #678/#679 — contract-neutral, ride the
  rm-252 absorb wave.
- `@axe-core/playwright` 4.14.0 — matured minor, rm-1449 rider scope, no mint.
- Node 26 triple-bump — rm-139 owns it; gate 2026-10-28, evidence unchanged.

## Census

After this extension: 327 defs / 0 dups / max rm-2147 (next free rm-2148 in this band;
fleet fog records run through rm-2153, first-landed-wins by title). Verified at compose:
`node scripts/roadmap-census.ts` reports 327 / 0 / rm-2147; the ledger check returns its
known baseline of exactly two pre-existing stale anchors; all four roadmap guard suites
green; eslint clean on ROADMAP.md and this doc.
