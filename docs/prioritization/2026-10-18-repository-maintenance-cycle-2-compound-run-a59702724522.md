---
module: dashboard
tags: [repository-maintenance, cycle-2, compound, rm-1972, rm-102, rm-156, rm-252, absorb-verify, run-a59702724522]
problem_type: maintenance-compound
---

# Repository-maintenance cycle 2 — compound record (2026-10-18, run a59702724522)

Pre-review compounding of the whole cycle. Base `f157cb8b` on
`conductor/run-a59702724522` (porcelain-clean at dispatch; at compound the
tree holds the uncommitted implement batch, 6 M + 3 ??). Nothing was
re-validated at compound — every outcome below is consumed from the recorded
typed results, work-order evidence, and the surviving spool artifacts (the
mid-cycle typed artifact set was swept from the delegate spool; the worktree
diff and the full_tests record `59440f8a` are the durable carriers).

Cycle chain: assess `11ff8c03` (7 findings) → research `6fd81ba8` → roadmap
ext `7881e2c2` (minted rm-1972 + 4 riders + extension comment against fold
target 64cd2f6a) → prioritize `fbd6ef33` ('absorb-truth hardening' batch) →
stewardship `8e12c079` → implement `82a4ff62` (reaped by provider infra;
adopted at re-dispatch `4e91b405` by typed-artifact + spool-delta
byte-identity) → targeted_tests `5cef49f5` → full_tests `59440f8a` →
compound `c1b4071c` (this record).

## Attempt-death ledger (first-hand, event logs)

- roadmap `d44f4fe8`: provider-reaped, heartbeats only — redone from scratch.
- implement `82a4ff62`: engine recorded failed, but its typed artifact was
  complete and its spool delta byte-identical to the tree — ADOPTED at
  `4e91b405` after full re-verification (install/tests/types/lint/actionlint
  all re-run green there; recorded, not re-run here).
- full_tests `a740e3f7`: reaped with no artifact and no validation PR in its
  window — redone from scratch.
- compound `6e5864e3`: provider-reaped, heartbeats only, zero repo writes
  (find after the full_tests window = empty), zero spool output — redone from
  scratch (this attempt).

Rule compounded: adjudicate by the durable trail, never by the engine's
failure status alone.

## Cycle outcome

Batch = 'absorb-truth hardening' (lead rm-1972), delivered uncommitted in the
worktree, 6 M + 3 ??:

- `scripts/absorb-verify.ts` (NEW, 420 lines) + `test/absorb-verify.test.ts`
  (NEW, 13 fixture tests) — the rm-1972 dependency-parity gate for absorbed
  windows. Key design fact (found while building it): PR #644 was a
  **lockfile-only** bump, so the gate unions manifest-specifier diffs AND
  root-importer lockfile-resolution diffs, normalizes pnpm peer suffixes
  (react 19.3.1 would otherwise false-red `@testing-library/react` at the
  same 16.3.3), fails closed (exit 3 on unreadable inputs), and attributes each dep
  to its window commit.
- Standing-instance cure: `@hono/node-server` ^2.1.3 → ^2.1.5
  (`package.json:22`, `pnpm-lock.yaml:837`/`:4936`), frozen-lockfile install
  green. Content-identical to sibling 5457d3ff's unlanded fog rm-1523 leg —
  first-landed-wins, lossless reconcile.
- Convention ride (rm-252): `upstream-drift.yaml`'s rm-856 companion block
  names absorb-verify a REQUIRED ABSORB STEP (pre-fold and against the landed
  tip in integrate evidence).
- Ops rider (rm-102): dated dependabot unstall touch — grouped PRs expected
  within 48h (~2026-10-20), else a dated no-op.
- Validator accommodation: `scripts/release-paths.ts` allowlists
  `scripts/gzip-static-sidecars.ts` (trigger-only list) to cure the ephemeral
  rm-248 parity red at this stale base; main's landed corpus pairing
  supersedes it post-fold — re-derive (possibly drop) at the landing merge.
- Ledger: ROADMAP.md = 64cd2f6a-anchored postimage + the cycle's 11-line
  delta. Integrate note: main had moved to `f5927919` by prioritize —
  later riders merge by content.

**Status flip**: rm-1972 `candidate` → `implemented 2026-10-18 pending
review/landing` (full pre-review verification chain in the def line). No
mints at compound — every batch family was owned before implementation.

## Validation record (pre-review, consumed not re-run)

- targeted_tests `5cef49f5` (rc0 across the board): structural diagnosis —
  the dispatched impacted-test runner short-circuits to its full-CI fallback
  BEFORE any derivation when `package.json` is among the surfaces
  (FULL_IMPACT_FILES), and untracked new suites are invisible to its
  git-ls-files enumeration; decomposed instead: release-trigger-paths +
  should-release 72 green; absorb-verify 13 green by name; roadmap render +
  length guards 5 green; `pnpm install --frozen-lockfile` rc0; actionlint
  rc0; eslint rc0; `pnpm check-types` rc0.
- full_tests `59440f8a`: `github_ci_validate.py` VERBATIM, ok:true —
  ephemeral PR #974, head `c1cbcbbd` over cloud base `66d2d3dc` → worktree
  HEAD `f157cb8b` (parents chain verified; compare file list == local dirty
  set). Main run 39124333589 6/6 jobs SUCCESS (11:42–11:44Z; Fro Bot
  SKIPPED by trigger design); real Test-job counts 74 + 36 vitest files /
  4835 passed / 1 skipped / 0 failures. PR + both ephemeral refs
  auto-cleaned. Digest
  `validation:v1:9c23582dda6908b0649dc5039bf5b5a6045ce14977e9153dce28b36ad454cc33`.
- Census after compound (text-tools replica — grep/sort/uniq, no test
  execution): 269 def lines / 0 dups / max rm-1972, unchanged (compound adds
  no defs). Render-guard safety of these edits: the trailer sits inside an
  HTML comment (exempt from both the dangling-ref census and the 4000-char
  non-comment ceiling); the touched def-line is a `- id:` line (exempt);
  no trailing whitespace introduced (checked with grep -P).

## Reusable lessons / prevention rules

1. **Lockfile-only dep-bump PRs escape manifest-only verification.** Absorb
   gates must union manifest-specifier and root-importer lockfile-resolution
   diffs, with peer-suffix normalization. Encoded in `absorb-verify.ts`,
   pinned by fixtures, documented in the batch doc.
2. **The impacted-test runner has two structural blind spots** (package.json
   surfaces force the full-CI fallback; untracked suites are invisible).
   Decompose the derivation and supplement new suites by name; never execute
   the as-dispatched full-CI fallback in a ci-prohibited phase.
3. **Reaped ≠ failed.** Adjudicate dead attempts by typed artifact +
   byte-identity of spool deltas vs the tree; redo only when the durable
   trail is empty. Applied four times this cycle (see ledger above).
4. **eslint --fix can manufacture markdown structure**: it rewrapped a
   leading `#647` to line start, creating a false H1. Keep issue refs inline
   (`PR #647`) and re-lint after autofix.

## Next-cycle candidates (existing ids / fog only — no mints owed)

1. react(-dom) 19.3.1 (upstream #647) through rm-1972's gate at the next
   absorb — one landing, not two (rm-102 / rm-252 riders).
2. Markdown port #646 — owned by fog rm-1513 (reconcile by content);
   `markdown-it@15.0.3` new-dep exact-pin posture; linkify
   opener-discipline review owed before port.
3. Assess `11ff8c03` unledgered legs: HIGH fro-bot workflow armed-to-fail
   (live ACTIVE + empty `FRO_BOT_PAT`; rm-879 owns the decision — re-verify
   live first); MEDIUM platformStatus snapshot-store asymmetry (zone
   occupied by sibling run-ed8f47e0 — lineage-check first); MEDIUM
   falsified static-assets claims; MEDIUM darkness pagination (darkness-watch
   family, fog rm-1520 owns wiring); LOW clonedeps pin drift (rides the
   rm-139 2026-10-28 gate); LOW git-config DX.
4. rm-156 raw-fetch timeout stragglers: `scripts/graphql-canary.ts:35-50` and
   `scripts/actions-darkness-watch.ts:196` (canary half lands independently;
   the canary is 0-for-2 since 2026-10-05 — both scheduled runs failed).
5. Dependabot 48h watch from the 2026-10-18 unstall touch (rm-102 ops rider).
6. Fold-time: re-derive the release-paths allowlist entry and the ledger
   riders against the then-live main (≥ f5927919), per the integrate notes.

## Artifacts

- Batch (implement) record: `2026-10-18-absorb-truth-hardening-run-a59702724522.md`
- Roadmap: rm-1972 def-line status flip + cycle:2 compound trailer (tail
  stack), this cycle
- Durable validation evidence: the spool copies of the full_tests record
  were swept mid-cycle (recurring); the durable carriers are the GitHub
  trail — ephemeral PR #974 (head `c1cbcbbd`, closed 2026-10-18) and Main
  run `39124333589` (all-green), both re-verified live at review
  `db160644` — plus the work-order phase evidence. Re-check on demand:
  `gh pr view 974`, `gh run view 39124333589`.

## Review fix (2026-10-18, attempt `ecebf1fa`)

Review `db160644` returned NEEDS_CHANGES with one blocker: this document's
next-cycle item 2 began with `#646`, parsing as an ATX heading — `pnpm
lint` exit 1, and the CI Lint job (`main.yaml:60`) runs exactly that.
Fixed this pass, re-validated:

- Line 121 reworded to "Markdown port #646" (refs stay inline — lesson (d)
  applied to the cycle's own record); `pnpm lint` → rc0.
- Evidence pointers re-anchored to the durable GitHub trail (section
  above).
- `scripts/absorb-verify.ts`: dead machinery removed (never-assigned
  `UNSUPPORTED` verdict, always-false `resolutionOnly` conditional — review
  findings 2/5, records-first cure); observable behavior proven unchanged:
  13/13 fixtures, live window probe byte-identical, exit codes unchanged.
  Exit-3 wording truthed in the script header, batch doc, and ROADMAP def
  line (real causes: unreadable manifest/lockfile, unresolvable refs).
- Deferred by the review's own scoping: divergence-allowlist vocabulary and
  the post-#648 (upstream Bun migration) gate re-derivation — dated
  dispositions owed at the next absorb; ROADMAP re-anchor and the
  release-paths allowlist entry — landing-merge obligations.
