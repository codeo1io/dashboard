# Dashboard maintenance — repository-maintenance cycle 1 batch (2026-10-05, run 5e661558)

module: dashboard
tags: `[security, supply-chain, ci, docs, batch-record]`
problem_type: batch-record

Frame: base `306a972` (== origin/main, re-probed live at implement time —
`git fetch origin`; porcelain at implement start was ` M ROADMAP.md` only, the
run's roadmap deliverable). Run `5e66155863354a2d8eb63fe6beeaabd8`,
repository-maintenance cycle:1. Phases: assess `77b875990acb4afca5b220d70d65536d6`
(install wall + 17-advisory audit + 8/12 red check-runs, all first-hand),
research `ecae3ba98b11469eb723ae7d000a0fa9` (verifyDepsBeforeRun A/B
kill-switch discovery), roadmap (combined deliverable `+35/-0`, mints rm-656 +
rm-659 + 8 riders), prioritize `fdaf9ebcd1e0446b89598903f9db69f5` (this batch
selected; spool batch-selection doc), stewardship `d285fb36c2924235b32e999e521400cd`
(structured request), implement `dd21c2be1ea74ea1a3e8034c0eb408fd` (this
document; prior attempt `eba8718c…` died of an infra provider failure with a
zero-work 3-line event log — nothing adopted, phase redone from scratch).

## The cycle's mandate

One theme: **unfreeze main, keep it green, close the silent-drift class.**
main has been RED since the 2026-10-04 `1e1e2f5` merge (8 of 12 check-runs
dying ~1 min into Setup with `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`), the stale
lockfile carries 17 known advisories (3 low / 7 moderate / 7 high), the silent
lockfile-rewrite hazard contaminated evidence twice this morning, and Release's
enforcing trivy step stays red on the base image's libpcre2 even after the
lockfile cures.

## B1 — pnpm-lock.yaml: wholesale manifest re-derivation (the unfreeze)

Procedure (5-point acceptance, all run in `/tmp/cure-dd21` under the pinned
pnpm 11.28.3 — host pnpm `--version` == 11.28.3 == the `packageManager` pin;
pnpm was never invoked inside the repository tree):

1. `cp package.json pnpm-workspace.yaml pnpm-lock.yaml /tmp/cure-dd21/`
   (pre-regen lockfile `sha256[:8]` `ced1e543`, byte-identical to HEAD).
2. `pnpm install --lockfile-only` → rc=0, 43.7s, **12:31:23Z**, resulting blob
   `sha256[:8]` `9abdcdd5` — installed in-tree at 12:34:03Z.
3. Acceptance, all PASS:
   - `pnpm install --frozen-lockfile --lockfile-only` rc=0 (after
     `✓ Lockfile passes supply-chain policies`) — this is exactly the command
     CI's setup composite and the new B4 guard run.
   - `pnpm audit --recursive` rc=0 `No known vulnerabilities found`
     (baseline at assess 02:33Z: 17 = 3 low | 7 moderate | 7 high).
   - Lockfile overrides mirror == all FIVE workspace floors exactly
     (`brace-expansion@2 '>=2.1.7 <3.0.0'`, `brace-expansion@5 '>=5.0.12 <6.0.0'`,
     `fast-uri@3 '>=3.1.8 <4.0.0'`, `toml '>=4.2.0'`, `undici@7 '>=7.30.0 <8.0.0'`)
     — the stale blob carried four pre-rm-276 floors and no toml entry.
   - Diff `+86/−123` vs `ced1e543`, confined to: the overrides mirror; the four
     floor resolution subtrees (fast-uri 3.1.6→3.1.8, brace-expansion
     2.1.4→2.1.7 and 5.0.9→5.0.12, undici 7.29.0→7.30.0); `toml` 4.1.2→5.0.0
     (the `>=4.2.0` floor is uncapped, so the 5.x tip qualifies under
     minimumReleaseAge 1440); restoration of manifest-required toolchain
     entries (`@playwright/test@1.63.0`, `@axe-core/playwright@4.13.0`,
     `axe-core@4.13.0`, `playwright@1.63.0`, `playwright-core@1.63.0`,
     `balanced-match@1.0.2`); and removal of the ghost `wiki-writer` importer
     with its transitive closure (`@fro-bot/wiki-write-core`, `@octokit/rest`
     family) — `wiki-write-core` 0 hits in the regenerated blob.
   - Byte-stability: an independent second regen in a fresh copy
     (`/tmp/cure-dd21-r2`) produced the identical `9abdcdd5` (cmp-identical).

Two fresh findings recorded at implement time:

- The stale blob was stale against the manifest in TWO ways, not one: besides
  the pre-rm-276 overrides mirror, HEAD's lockfile resolved NO axe-core
  (0 hits) and NO playwright (only `@vitest/browser-playwright` peer labels)
  while package.json devDependencies require `@axe-core/playwright ^4.13.0`
  and `@playwright/test ^1.63.0`. One regen cures both.
- The cure blob is time-varying (as rm-276's rider already records): this
  run's 02:33Z and 12:31Z derivations both give `9abdcdd5`; a sibling run's
  08:43Z-era derivation recorded `96db787f`. Era labels conflict across runs —
  the sha is evidence, the PROCEDURE is the durable cure. Post-edit final-state
  re-check on the exact in-tree bytes (workspace now carrying B2's key):
  frozen rc=0 + audit rc=0 at 12:41Z.

Review repair (2026-10-06, independent_review attempts `eb452afd…` →
`fccd4229…`): the audit acceptance above was complete at its 2026-10-05
era but TIME-DEFEATED by the advisory DB within a day — source-map-js
GHSA-68fv-2mgg-jv7q (HIGH, vulnerable `>=1.0.0 <1.2.2`, patched `1.2.2`
published 2026-09-30T14:08Z, DB-indexed only ~2026-10-06; ~16 dev-transitive
paths via `@eslint/css-tree`, the `@tailwindcss/*` chain, `vite` > postcss)
and katex GHSA-238p-pmpm-9mq7 (LOW, `<0.18.2` patched `0.18.2`;
dev-transitive via `@bfra.me/eslint-config` > `@eslint/markdown` >
`micromark-extension-math@3.1.0`, which declares `^0.16.0` with no
`^0.18`-capable successor) — the five-floor blob `9abdcdd5` audits rc=1
(1 high + 1 low) on the 2026-10-06 DB; without repair the Monday
2026-10-12T03:37Z audit gate reddens on the landed tip and dependabot
opens two fresh alerts. Fixes: floors `source-map-js '>=1.2.2 <2.0.0'` +
`katex '>=0.18.2 <0.19.0'` appended after `undici@7` (the katex floor
deliberately forces the patched line OUT OF the declared range — inert at
lint time, this repo renders no math fences), lockfile re-derived by the
same /tmp procedure under pnpm 11.28.3 → blob `4263901b` (+20/−18 vs
`9abdcdd5`; 247 total changed lines vs HEAD `ced1e543`), resolving
source-map-js 1.2.2 + katex 0.18.10 (both published 2026-09-30, past
`minimumReleaseAge` 1440). Re-validation, first-hand 2026-10-06: frozen
`--frozen-lockfile --lockfile-only` rc=0 in-tree AND on /tmp byte-copies;
`pnpm audit --recursive` rc=0 'No known vulnerabilities found' on the
live DB; overrides mirror == all SEVEN floors; ghost-importer grep 0.
Era record: `9abdcdd5` is the 2026-10-05 five-floor blob, superseded —
the PROCEDURE remains the durable cure.

## B2 — rm-656: `verifyDepsBeforeRun: false` (close the silent-drift class)

`pnpm-workspace.yaml` now carries a top-level `verifyDepsBeforeRun: false`
(:15-27) with the rationale comment naming: the hazard (pnpm 11.28.3
auto-installs on script run at a stale tree and silently rewrites
pnpm-lock.yaml — observed live 2026-10-05 dirtying a fresh clone and
contaminating two evidence captures), the A/B control, the misleading
kebab-case `pnpm config get verify-deps-before-run` (prints undefined; THIS
camelCase pnpm-workspace.yaml key is the honored form), and the revisit
trigger (the pnpm 12 bump, rm-140).

A/B re-proven fresh at implement time (`/tmp/ab-dd21`, stale-tree copies =
HEAD workspace + HEAD lockfile `ced1e543` + package.json with a no-op
`probe` script):

- Treatment (key present): `pnpm run probe` rc=0, lockfile byte-identical
  `ced1e543` → `ced1e543`.
- Control (key absent, same tree): `pnpm run probe` rc=0, lockfile silently
  rewritten `ced1e543` → `9abdcdd5`.

ROADMAP rm-656 folded to `status: implemented 2026-10-05` with the dated
record (A/B numbers above).

## B3 — Dockerfile: runtime-stage libpcre2 upgrade (Release green)

The 2026-09-20 retirement of the in-image libpcre2 patch was false at the
pinned digest: `node:24-slim@sha256:0e0ff40…` ships libpcre2-8-0
`10.42-1+deb12u1`, which carries CVE-2026-103111 (HIGH; fixed revision
`10.42-1+deb12u2`), leaving Release's enforcing trivy step red after the
lockfile cure (selection-era scan 2026-10-05: 8 HIGH at the base image → 1
after the strip; the 0 end-state is re-proven by the review-repair fresh-DB
scan below — trivy verdicts are DB-time-varying, era numbers are records).

- New runtime-stage layer after `WORKDIR /app`, before any COPY:
  `RUN apt-get update && apt-get install -y --no-install-recommends --only-upgrade libpcre2-8-0 perl-base && rm -rf /var/lib/apt/lists/*`
  — `--only-upgrade` keeps the layer a no-op once a future base digest ships
  deb12u2+/deb12u4+; the npm/corepack strip RUN is untouched.
- The now-false "absorbed at the base" comment is rewritten with the deb12u2
  truth and the measured ladder.
- The rm-558 header's "COPY plus one prune RUN — the only step that executes
  on the target" claim would have gone stale under the new RUN; it now reads
  "COPY plus two RUNs" (truth rides the same change — standing comment-drift
  trap).

Verify: `docker build` + `docker run … apt-cache policy libpcre2-8-0` shows
`10.42-1+deb12u2`, then Release's Enforce trivy step (exit 1 on unfixed
HIGH/CRITICAL) goes green — deferred to the validate/full-test phase (image
build is not a focused unit).

Review repair (2026-10-06, independent_review:fix attempt `7cca9ec3…`, on
review attempt `2241c6de…` findings F1/F2/F3): the spec above named only
`libpcre2-8-0` — incomplete. The batch image shipped `perl-base
5.36.0-7+deb12u3` with 7 unfixed (CVE-2026-13221 / -42496 / -8376 CRITICAL +
-42497 / -48962 / -57432 / -57433 HIGH, all fixed in `deb12u4`), so Release's
Enforce step would have gone RED on the landing push — it fires on push to
main only and structurally never runs on the ephemeral validation PR. Fixes:
the RUN upgrades BOTH packages (command above updated); the Dockerfile ladder
comment is era-stamped (F2); the pnpm-workspace rm-196 rider carries the
10-04 #29/#30 re-open note (F3). Repair verification, first-hand: `docker
build` rc=0; in-image `libpcre2-8-0 10.42-1+deb12u2` +
`perl-base 5.36.0-7+deb12u4`; forced-fresh-DB Enforce replica (aquasec/trivy
`0.72.0`, `--scanners vuln --severity HIGH,CRITICAL --ignore-unfixed
--exit-code 1`) rc=0, zero findings across all targets. Recorded as the
standing pre-ship check for image-touching changes (L7, cycle-1 lessons doc)
and as a dated rider on rm-205.

## B4 — .github/workflows/lockfile-guard.yaml (keep it green)

Byte-adopted verbatim from the sibling worktree deliverable
(`run-a2def4ce34dc-a2def4ce/.github/workflows/lockfile-guard.yaml`, the
rm-648-era guard): sha256
`e1572a7d281457df9e23912b91b8f0430aec0ea6fc28c1a1f415b4080a3eb1dd`, 2578
bytes, `cmp`-identical after copy. Job `Lockfile Guard` runs
`pnpm install --frozen-lockfile --lockfile-only` (~1s, no node_modules, no
Node pin) on PR + main push + `conductor/ci-base-**` — the merge-time check
that would have caught `1e1e2f5`. The gate's command is proven green on this
batch's exact tree bytes (B1 final-state check, 12:41Z rc=0).

## B5 — this record + ROADMAP folds

- This document (`docs/prioritization/2026-10-05-repository-maintenance-cycle-1-batch-run-5e661558.md`).
- ROADMAP.md rm-656 (:1527) `status: open` → `implemented 2026-10-05` + dated
  implemented-record paragraph; rm-276 (:1273) gains a dated `landing` rider
  with the full re-derive procedure, resulting sha + timestamp. The run's
  roadmap deliverable (+35/-0) is otherwise byte-preserved — the only prior
  deliverable line touched is rm-656's def-line status flip; total ROADMAP
  delta after the folds is +38/-0 (+2 fold paragraphs +1 separator blank).

## How to verify the whole batch (focused)

1. `sha256sum pnpm-lock.yaml | cut -c1-8` → `4263901b` (2026-10-06
   seven-floor repair era; the 2026-10-05 five-floor era recorded
   `9abdcdd5`);
   `git show HEAD:pnpm-lock.yaml | sha256sum | cut -c1-8` → `ced1e543`
   (the diff is the batch's, not drift).
2. In a /tmp copy of `package.json pnpm-workspace.yaml pnpm-lock.yaml`:
   `pnpm install --frozen-lockfile --lockfile-only` → rc=0, and
   `pnpm audit --recursive` → rc=0, `No known vulnerabilities found`.
3. `grep -c 'wiki-write-core\|wiki-writer' pnpm-lock.yaml` → 0.
4. `sed -n '15,27p' pnpm-workspace.yaml` → rm-656 comment + the
   `verifyDepsBeforeRun: false` key.
5. `grep -n 'only-upgrade libpcre2-8-0' Dockerfile` → the new runtime layer;
   the strip RUN and its comment are untouched.
6. `sha256sum .github/workflows/lockfile-guard.yaml` → `e1572a7d…` (byte-adopt).
7. `git diff HEAD --numstat` → `38 0 ROADMAP.md` + the four file deltas above;
   `git status --porcelain` → M ROADMAP.md, M Dockerfile, M pnpm-lock.yaml,
   M pnpm-workspace.yaml, ?? .github/workflows/lockfile-guard.yaml,
   ?? docs/prioritization/2026-10-05-repository-maintenance-cycle-1-batch-run-5e661558.md.

Nothing was committed or pushed (implement phase); validation beyond the
focused units (actionlint container pass on the new workflow, image build +
trivy ladder re-run, full `pnpm test`) is deferred to the validate/full-test
gate as recorded in the phase result.

## Compound — pre-review outcomes folded (2026-10-05, 18:23Z)

This section is the compound-phase record (attempt `710bfe59…`); it consumes
recorded outcomes only — no tests were re-run. Review and shipping outcomes
land after this step and are carried forward by the next cycle's assessment.

### Validation outcome (the deferred gate, now recorded)

- Targeted (e9d0f386): frozen install rc=0 7.5s on the exact in-tree bytes;
  7 workflow-contract vitest suites 10/10; actionlint 0 findings; eslint
  clean; lockfile `sha256[:8]` `9abdcdd5` byte-stable throughout; the
  targeted runner cannot prove narrow scope for workflow-yaml surfaces, so
  full validation was the focused gate for B4 (by design).
- Full CI (336ce558, work-order verbatim command, twice): run 1 — ephemeral
  PR #384 fail-fast on Main/Lint, 4 `markdown/no-missing-label-refs` errors
  in this document and ROADMAP.md (three bare `sha256[:8]` slices + one
  bracketed run-result citation; the documented 2026-09-25 class,
  invisible until now because the install wall killed Lint before eslint
  ran) — fixed content-preserving with backticks; run 2 — ephemeral PR
  #385 **11/11 checks SUCCESS** (Main run 37346288152 all six jobs, visual
  37346287948, Analyze 37346287913, Dependency Review 37346288255, and the
  new Lockfile Guard 37346287839 green on hosted CI). Both PRs and their
  refs auto-cleaned. The markdown-only fix left the engine dispatch digest
  identical (executable surfaces only), so the dispatch stays valid.
- NOT validated pre-review (by trigger design): the push-only classes —
  Release (its enforcing trivy step scans the BUILT image, so B1+B3 green
  there is a landing-push outcome), Scorecard analysis, and the scheduled
  workflows. These are watch items below.

### Ledger folds (ROADMAP riders, zero mints, zero status flips)

- rm-276: full pre-review validation record rider (targeted + PR #384/#385
  outcomes, post-landing obligations).
- rm-656: rider validating the 'CI unchanged by construction' clause green
  on PR #385.
- rm-116: rider pre-registering the 'Lockfile Guard' required-check context
  name and the post-green fill interlock.
- rm-285: correction-of-record rider (the 2026-10-04 `1e1e2f5` upstream
  merge reverted this item's lockfile half while keeping the floors; audit
  0 → 17; B1 re-lands it pre-review).
- One lessons doc: `docs/solutions/workflow-issues/maintenance-cycle-learnings-2026-10-05-install-wall-closure.md`
  (six lessons: L1 label-refs lint class recurrence + wall-invisibility;
  L2 two-layer drift closure; L3 re-derive-never-transplant; L4
  workflow-yaml defaults to full validation; L5 comment-truth rides the
  falsifying change; L6 verify LANDED pairs against the current blob).
- Cycle-1 compound comment in ROADMAP.md (invariants: 217 defs / 0 dups /
  max rm-659; Completed/Superseded untouched).

### Post-landing watch set (from the batch selection, unchanged)

1. Landing-commit check-runs: all classes green — 12/12 including Release
   (trivy on the built image) and Scorecard analysis.
2. Release's enforcing trivy step proves the B3 ladder end-state (0 HIGH).
3. Post-landing `pnpm audit --recursive` == 0 at tip; audit dispatch
   green on its next scheduled fire (Monday probes by run id).
4. Dependabot #29/#30 (fast-uri/undici) auto-close after GitHub re-indexes
   the LANDED lockfile.
5. `git ls-files .conductor` empty after the landing merge.
6. Sibling-content reconciliation at integrate: floors are
   sibling-claimed BY CONTENT; the lockfile must be reconciled by
   procedure (derivation-era shas conflict — this run `9abdcdd5` vs
   sibling `96db787f`), never by transplant.
7. Only then rm-116 (fill required checks incl. 'Lockfile Guard').

### Next-cycle candidates (context for the next maintenance cycle)

- rm-116 protection fill — unblocked once the batch lands; context names
  now exist first-hand (PR #385 green set).
- rm-659 run-history deletion forensics — operator-gated, unchanged.
- rm-271 (undici 8 bump) — watch only; re-open only if Test is red
  post-landing.
- Standing upgrade leads: Node 26 seam (rm-139), pnpm 12 re-evaluation
  (rm-140's rider), TS7 blockage (jsdom 30.1.2 peer-requires undici 8).
- Hygiene sweep: dead `conductor/ci-*` refs (~100+ unreaped branches) and
  stale Conductor-CI validation drafts.

### Post-compound verification deltas

The implement-time verification list above (item 7: ROADMAP `38 0`, two
untracked files) is superseded at compound by: `git diff HEAD --numstat` →
`48 0 ROADMAP.md` (the four dated riders + the cycle-1 compound comment,
zero deletions) and a THIRD untracked file —
`docs/solutions/workflow-issues/maintenance-cycle-learnings-2026-10-05-install-wall-closure.md`.
Everything else in that list is unchanged and still verifies.

### Post-review deltas (2026-10-06, repair `fccd4229…`)

Final batch numstat: `30 8 Dockerfile`, `63 0 ROADMAP.md` (61 at the
7cca9ec3 repair + this repair's rm-276 rider and separator, pure
additions), `106 141 pnpm-lock.yaml`,
`35 0 pnpm-workspace.yaml` (the two added floors + rationale comments);
three untracked files unchanged. Focused-verify item 1's sha is the
repair-era blob `4263901b`; item 2's audit rc=0 re-proven on the
2026-10-06 live DB.
