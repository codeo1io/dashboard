---
module: dashboard
tags: [repository-maintenance, cycle-1, batch, gate-debt, rm-944, rm-945, rm-947, rm-948]
problem_type: maintenance-batch
---

# Repository-maintenance cycle 1 — batch record (2026-10-12, run e760710094584bc4)

Batch `gate-debt zero + buildability restore`, implemented at base `6ec2328`
(branch `conductor/run-e76071009458`, the upstream-2026.10.18 adoption line).
Zero runtime-behavior change; every item is locally verifiable (repo Actions
dead since 2026-10-09 — local gates are the only enforcement). origin/main at
implement open: `91774d8` (main had advanced past the `5b00c92` carrier base
used by the roadmap phase).

## Inputs

- assess `51e8a8ad` (gate state first-hand: check-types 7x TS2322, lint 63
  problems, root vitest 9 failed / 3007 passed, web vitest 1201/1201 green)
- research `bbf0b0ad` (upstream 7-commit absorb window, npm registry, walls)
- roadmap ext #47 `a10d95a0` (spool patch `roadmap-a10d95a0…patch` vs 5b00c92)
- prioritize `9e07d61b` (this selection; `9e07d61b…batch-selection.md`)
- stewardship `33c4f3c2` (surfaces pinned on a clean tree; prior attempt
  `28b47c96` was transport-reaped with zero durable work — no adoption)

## What landed (8 items)

- **B1 `rm-948` static-assets merge-cure** — `test/static-assets.test.ts`
  rebuilt as origin/main's cured render (91774d8) minus the rm-690
  Cache-Control test block, plus this branch's two genuinely-new tests
  (fixture-scenario-leak test, browser-pin-equality test) and the three
  imports they need. Restores the three snapshot fields
  (`enumerationIncomplete: 0`, `refreshDurationMs: null`,
  `refreshDegraded: false`) at all 7 factory sites with main's exact values,
  hoists the fs/path imports back to the top block, and collapses the
  6179cb7-era blank-line debris. Kills all 7 TS2322 and all 19 lint errors in
  this file. The rm-690 block was deliberately NOT adopted: main's `6c28871`
  landed those tests together with the immutable-Cache-Control middleware in
  `src/server.ts`, which this lineage does not carry — adopting the tests
  alone would mint 6 red tests, adopting the middleware is a runtime change,
  both out of this batch's zero-behavior-change scope. The block stays a
  theirs-only addition and merges cleanly.
- **B2 `rm-947` validateDynamicId export restore** —
  `public/operator-stream.js:2355`: `export function validateDynamicId(id)`
  (the `export` was dropped by upstream-authored `ab3c68a`; exported at
  `558b14e:1602`). Kills the 4 `validate is not a function` failures in
  `test/validate-dynamic-id-parity.test.ts`.
- **B3 `rm-945` stale 1.6.0 CRLF fixture** —
  `test/operator-sse-reader.test.ts:1164`: `rm265ReadyText` now templates
  `${OPERATOR_CONTRACT_VERSION}` (same idiom as the `\r`-sibling at :1143)
  instead of the stale literal `'1.6.0'` (live pin 1.9.0; the reader
  fail-closes on version mismatch by design). Kills the 3 sse-reader
  failures without touching the reader.
- **B4 `rm-944` pnpm 11.28.5 skew reconcile** —
  `test/fork-exclusion-guard.test.ts` (both pin assertions) +
  `Dockerfile:21,41` (both `corepack prepare`) now assert/pin `pnpm@11.28.5`,
  matching `package.json:57` (the version this session actually runs).
  Direction: guard + Dockerfile move to 11.28.5; package.json untouched.
  Kills the fork-exclusion-guard failure.
- **B5 `rm-946` prose-residue era-qualification** — the three wiki-writer
  mentions in `docs/plans/2026-10-10-001-feat-operator-contract-1-9-0-questions-plan.md`
  (lines 98/156/159) are era-qualified in-string (appending
  `(upstream-era 2026-10-10 research record; this fork never-absorb — rm-252)`,
  keeping the embedded JSON excerpts quotable) and registered as exact
  era-qualified lines in `ALLOWED_MENTIONS` of `test/prose-residue-guard.test.ts`
  — the guard's settled mechanism (the second suite enforces the allowlist
  stays verbatim-honest). Kills the prose-residue failure.
- **B6 `rm-949` no-use-before-define hoist** — the `APPROVAL_FETCH_TIMEOUT_MS`
  const + its rm-594 doc comment moved verbatim (move-only) from below the
  browser-direct approval client (was :2110-2117) to just above
  `buildApprovalClient`'s doc comment, above first use (:1974). Kills the 4
  `no-use-before-define` lint errors in `public/operator-stream.js`.
- **B7 `rm-950` Frankenstein digest** — `Dockerfile:16` `ARG NODE_IMAGE`
  digest corrected to
  `sha256:173f125896c3b47ddf056734c7ea789d04595a6a08769a8f78e0df642781fb66`.
  Verified LIVE against Docker Hub at implement time: the pinned digest HEADs
  HTTP 200 and equals the current `docker-content-digest` of the
  `24-trixie-slim` tag; the old stitched digest (12-hex prefix + foreign tail)
  HEADs HTTP 404.
- **B8 `rm-943` ROADMAP render sync** — `ROADMAP.md` is now blob-identical to
  origin/main@91774d8's render (blob `49ad1433`; 1308 lines, def-max rm-856+,
  0 trailing-space lines). Kills all 42 markdownlint errors. The ledger's
  unlanded mint walls remain spool-side patches; nothing was re-minted here.

## Implement verification (focused battery, per phase budget)

Commands and results (all from the implement worktree, node v22.22.0,
pnpm 11.28.5, frozen install rc=0):

- `pnpm check-types` → **rc=0** (was 7x TS2322)
- `pnpm lint` → **rc=0** (was 63 problems: ROADMAP 42, static-assets 19,
  operator-stream 4)
- `pnpm exec vitest run` over the 16 impacted files (fork-exclusion-guard,
  operator-sse-reader, validate-dynamic-id-parity, prose-residue-guard,
  static-assets, roadmap-length-guard, operator-stream-core,
  operator-contract-conformance, endpoint-parity-guard, operator-launch-core,
  operator-ui, rate-limit-class, auth, operator-fixture-harness,
  should-release, operator-run-index-core) → **1976 passed / 0 failed**,
  covering all 9 previously-failing tests
- static-assets alone re-run after tail-byte finalization → 104/104
- Docker Hub registry: pinned digest → 200 + tag `docker-content-digest`
  equality; old digest → 404 (live, 2026-10-12)
- Landing surface, measured with `git merge-tree` on a temp index (no
  commits): candidate contributes **0 net-new conflict hunks** vs the
  unmodified-HEAD control except one lint-forced EOF-whitespace hunk in
  static-assets (the cured tail `})\n` deleted base's trailing blank while
  main appended rm-690 after it). IMPORTANT baseline note: the prioritize-time
  figure of 5 hunks was measured against main@5b00c92; main has since advanced
  to 91774d8 and the control itself now shows 10 pre-existing hunks in files
  outside this batch (`operator-stream-core` 5, `operator-stream.js` 2,
  `operator-sse-reader` 1, `index.css` 1, `runtime.ts` 1). This batch's files
  contribute no textual conflicts; static-assets merges clean modulo the
  EOF-blank hunk, whose resolution is "take theirs".

Full-suite runs (root vitest 3016, web vitest 1201) are reserved for the
full_tests gate per the phase validation budget; no `web/` or `src/` file was
touched, and the previously-green web leg is unaffected by construction.

## Provenance note (attempt lineage)

Prior attempt `28b47c96` (stewardship) was transport-reaped with a one-line
event log and no typed artifact — nothing to adopt. The first implement
attempt's envelope was lost to an ENOSPC provider error after completion; the
filesystem was verified healthy at 29G free before this attempt, which
re-implemented the batch from a byte-pristine tree (verified `git status` 0
lines at open). Worktree left with exactly 8 modified tracked files + this
doc, nothing staged, nothing committed.
