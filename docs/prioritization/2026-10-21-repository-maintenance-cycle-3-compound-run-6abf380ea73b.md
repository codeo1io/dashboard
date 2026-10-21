# Repository-maintenance cycle:3 compound record — run 6abf380ea73b

Date: 2026-10-21. Requirement: `repository-maintenance:65d5fd1db8cc4cf3a115efad405e8c9f:cycle:3`.
Compound attempt `0dfe10733759469683d93b6781287518`. This record consumes pre-review cycle
evidence only; review and shipping outcomes happen after this step. Base `62778fb8`;
no test/validation command was executed for this record.

## Batch (selected at prioritize f7325804, implemented at ae4ce5af7680403fa9bd57fff1912a63, re-folded de4bf7e5d728493abb66304c7dfe7f8f)

**"Re-green + re-truth on the post-Bun base"** — two legs:

1. **rm-2133 — zero-tree-edit verify-and-adopt supersession.** The #1071 conductor
   landing left main Lint-RED (bare `'0 0 * * *'` cron in a review rider → 2×
   markdown/no-space-in-emphasis). Between prioritize and implement, an independent
   landing's integrate-conflict semantic repair code-spanned the exact line; this cycle
   verified the cure at the live tip (Main job green on the subsequent merge pushes, zero
   bare crons in the tip ledger) and flipped the def WITHOUT tree edits rather than
   re-curing an already-cured red.
2. **rm-2134 — post-Bun pnpm-prose truth, carved to three uncontested files.**
   `scripts/gzip-static-sidecars.ts:4` and `.github/copilot-instructions.md:6` now say
   `bun run build:web`; `scripts/should-release.ts` comments re-truthed (:37-38 lockfile
   fail-open premise names `bun.lock`; :176 corpus list now mirrors
   `scripts/release-paths.ts` — `gzip-static-sidecars.ts` in per rm-602,
   `pnpm-workspace.yaml` dropped); **plus the paired rm-612 guard flip**
   (`test/copilot-instructions-guard.test.ts` machine-pinned the old entrypoint text).
   `audit.yaml:24` + `canary.yaml:40/42/59` were YIELDED to earlier-minted sibling fog
   rm-2129 per fleet first-landed-wins.

## Verification (pre-review, recorded — not re-run at compound)

- targeted (attempt b06a0669): the engine's `run_repo_impacted_tests.py --mode fast
  --jobs 8` over the two script surfaces → **3 files / 273 tests green**
  (`release-trigger-paths` + `should-release` + `static-assets`, the full rm-602
  precompressed-sidecar family).
- implement-time focused battery (attempt ae4ce5af): eslint rc=0 on all four touched
  files + ROADMAP; 6 files / 98 tests incl. the flipped copilot guard; census
  316 defs / 0 dups / max rm-2134; ledger-check stale set byte-identical to the
  pre-existing rm-1523/rm-843 pair.
- full (attempt 1ab0ebf7): `github_ci_validate.py --repo .` → ephemeral draft PR
  **#1101**, all **9 checks green** in ~2 min (Main lint/check-types/test/design/
  workflow-load, CodeQL, Dependency Review), PR closed and both ephemeral refs deleted
  by the validator. Pre-flight proved the workflow graft-collision class cannot fire for
  this lineage: main-side workflow drift is all schedule/workflow_run-triggered and the
  batch delta touches zero `.github/workflows` files.

## Ledger mapping

rm-2133 and rm-2134 sit implemented-pending-landing with implement riders; compound
riders appended at compound (this record). No new defs minted at compound — every
next-cycle candidate below already has an owner (fog def or explicit unclaimed note).

## Durable lessons and prevention rules

- **L1 — machine-pinned prose truth.** `test/copilot-instructions-guard.test.ts` pinned
  the retired `pnpm build:web` string; flipping the doc alone would have reded the suite.
  Rule: before any prose-truth flip, grep the test tree for pins of the stale string and
  move guard + truth in ONE change.
- **L2 — comments can drift from the corpus they document.** `should-release.ts`'s
  hard-release comment listed `pnpm-workspace.yaml` although `scripts/release-paths.ts`
  never held it at this base; the corpus-sync test pins the array, not the prose. Rule:
  when re-truthing prose that mirrors a single-source array, read the array first and
  make the comment quote it.
- **L3 — fleet first-landed-wins carving.** Batch selection wall-greps DISTINCTIVE site
  strings across all sibling walls; contested sites are carved out (not re-owned) and the
  yield is recorded in the implement rider. Applied twice this cycle (rm-2129, rm-2012
  fogs).
- **L4 — re-verify the red before editing; supersede, don't re-cure.** The landscape
  moved between prioritize and implement; the correct shape was zero-tree-edit
  verify-and-adopt. Corollary: the red/green pair technique (run the render-guard against
  the TIP's ledger vs the base's) is what surfaced the tip red at roadmap time — keep it
  in the roadmap-phase playbook.
- **L5 — ledger-trap rule re-proven.** No resolvable commit short-hexes inside
  pending-landing def blocks; cite 32-hex run/attempt ids only. Post-flip ledger-check
  stayed at exactly the pre-existing rm-1523/rm-843 stale pair — the proof shape to keep.
- **L6 — reap forensics pattern.** A reaped attempt with a failure-envelope result
  (serve-hold ceiling, no terminal observation), a pings-only event log, and a clean
  tree has NOTHING adoptable — redo from scratch. Applied at assess (01be2cc3) and
  roadmap (8aec1371).
- **L7 — node_modules sweeps between phases** (three re-provisions this run). Recovery is
  the frozen `bun install --frozen-lockfile` (~5-22 s, 759 pkgs); it is gitignored
  environment and never changes the validation digest.
- **L8 — fold-gate attestation shape.** `validation_evidence.changed_surfaces` must be
  declared against the ENGINE-derived tree delta (KTD13); the dispatch-time
  `validation_digest` is copied verbatim ONLY when the turn changed nothing executable —
  otherwise re-run and declare the fresh digest.

## Next-cycle candidates and context (pre-review)

- **Operator contract 1.12.0 coupled adoption** (research C1): gateway `fro-bot/agent`
  v0.124.0/#1859 (approval→waiting-run deep-link, launch-prompt display, provider-failure
  reason; "gateway and dashboard need to deploy together") + v0.124.1 (#1877 S3-endpoint
  SSRF validation, #1869 unified provider-failure classifier); the dashboard half is
  already upstream inside the 2026.10.49–54 window (operator-client.ts, public operator
  launch/run-index/stream rewrites). Owned unlanded by fog rm-2079 (five walls) — honor,
  never re-mint. Absorb cautions from the roadmap rider: `wiki-writer/` stays EXCLUDED
  (rm-259), `web/src/sw.test.ts` is inside the upstream diff and needs explicit
  reconcile with the fork's kill-switch pair.
- **impeccable 4.7.0** dual-site bump (CI pin + AGENTS.md together; verify
  `.impeccable/config.json` ignoreValues first) — ridden on rm-271.
- **Remaining pnpm-prose residue**: the five-site doc batch is sibling-owned
  (rm-2012 fog, implemented-pending-landing there); the UNCLAIMED adjacent pair —
  `test/static-assets.test.ts` (:82/:137/:1653/:1704 — comments at :137/:1704,
  thrown-error build-instruction strings at :82/:1653; enumeration completed at the
  2026-10-21 review repair) and `test/release-trigger-paths.test.ts:7`'s rm-154
  pnpm-workspace COPY header — is fresh def material (observed and deliberately
  not claimed at implement).
- **Pre-landing rider-lint hook** (rm-2133 acceptance arm 3): rider appends ride direct
  pushes validated only BEFORE the append; a hook/guard that lints rider text
  pre-landing would prevent the born-red class that cost this cycle a def.
- **Agent pin currency**: `fro-bot.yaml` pin sits two minors stale (v0.123.1 vs
  v0.124.1); AGENTS.md clonedeps claim still says v0.122.1 — both ride the rm-252 window
  work, not a standalone batch.
