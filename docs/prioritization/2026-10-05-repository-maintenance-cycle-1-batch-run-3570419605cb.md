# Dashboard maintenance — cycle 1 batch (2026-10-05, run 3570419605cb)

module: dashboard
tags: `[lockfile, frozen-install, docker, trivy, lockfile-guard, security-floors]`
problem_type: batch-record
base: 306a972 == origin/main (fetch re-probed 2026-10-05T14:41Z; unmoved all phase)

## Frame

Repository-maintenance cycle 1, run 3570419605cb, implement attempt fa2d31be
(prioritize b9242ad6 SELECTED BATCH 'Unfreeze main -> Release green -> freeze-class
armor'; stewardship contract ce343d8a). All four change-units implemented in this
worktree, uncommitted, dirty-state-preserving (the roadmap deliverable ' M ROADMAP.md'
from attempt 73992baa rides untouched below the new riders). pnpm was never run
in-tree — every derivation lives in /tmp sandboxes.

## The cycle's mandate

One goal: make origin/main green and keep it green. The broken committed
`pnpm-lock.yaml` (blob c3e7aa83) fails every `pnpm install --frozen-lockfile` with
ERR_PNPM_LOCKFILE_CONFIG_MISMATCH against the floors already raised on main
(4/5 push workflows red at 306a972); the pinned node:24-slim digest ships
libpcre2-8-0 deb12u1 (CVE-2026-103111 fixes in deb12u2) so Release's Enforce trivy
gate stays red even after the lockfile cure; and nothing guards the floors-vs-lockfile
divergence class at merge time (an upstream merge re-broke it on 2026-10-04).

## B1 — pnpm-lock.yaml reconcile cure (LOCKFILE-ONLY)

Derived in /tmp under pinned pnpm 11.28.3 (host pin == packageManager pin,
package.json:57): `pnpm install --lockfile-only` on a copy of the three manifests.

- **Blob 96db787f** (+86/−123 vs c3e7aa83), byte-stable on the second derivation.
  Family convergence re-measured 14:42Z: ALL sibling worktrees (73d35a6c, a2def4ce,
  5e661558) now hash 96db787f — the 9abdcdd5 era label recorded 12:31Z is itself stale
  (registry-maturity oscillation; procedure is the gate, sha is evidence).
- Acceptance, all first-hand this session:
  1. clean-copy `pnpm install --frozen-lockfile` rc=0 (10.7 s — the wall is cured);
  2. `pnpm audit --prod` 0 and `--recursive` **17 → 0**;
  3. ghost `wiki-writer` importer and `@fro-bot/wiki-write-core` dep: **0 hits**
     (the stale blob carried an importer for a workspace member that does not exist —
     pnpm-workspace.yaml has no `packages:` key — and a write-capability dep that
     violates the repo's read-only invariant 1 by provenance);
  4. embedded overrides == the five workspace floors incl. toml `>=4.2.0` (uncapped —
     resolves 5.0.0); importers == `.` only; specifiers match package.json (stale
     `^2.0.0`/`^4.7.11` gone);
  5. confinement: fast-uri 3.1.8, brace-expansion 2.1.7/5.0.12, undici 7.30.0, toml
     5.0.0 + their transitive (balanced-match) + the two-way manifest reconciliation
     (@playwright/test 1.63.0 + @axe-core/playwright 4.13.0 + fast-check 4.9.0
     restored; workbox-* 7.4.1 entries package.json no longer declares dropped);
     **hono 4.13.12 and @hono/node-server 2.1.3 untouched** — no in-range sweep.
- pnpm-workspace.yaml NOT touched (floors already on main; it is the acceptance
  oracle — a regen run with a modified workspace would be unfalsifiable).

## B2 — Dockerfile runtime-stage upgrade path (rm-669)

Adopt-by-content from sibling 73d35a6c's validated diff (same base), extended by
first-hand evidence gathered this session:

- New RUN after the runtime `FROM ${NODE_IMAGE}`:
  `apt-get update && apt-get install -y --no-install-recommends --only-upgrade libpcre2-8-0 perl-base && rm -rf /var/lib/apt/lists/*`.
- **The perl-base extension is new evidence, not scope creep**: the 06:54Z ladder
  (e795cadd) measured zero after libpcre2 alone; at 14:5xZ a fresh trivy DB surfaced
  seven FIXED HIGH/CRITICAL on perl-base 5.36.0-7+deb12u3 (fix deb12u4) — DB churn,
  hours apart, same pinned-digest treadmill. The upgrade path takes both packages;
  rm-669's 'dpkg delta is libpcre2-8-0 ONLY' acceptance point is superseded by the
  two-package list (its zero-findings point is preserved and re-proven below).
- Comment truth rides in the same unit: the false 2026-09-20 'absorbed at the base'
  block (:52-54) rewritten to the actual mechanism (pinned digest ships deb12u1/deb12u3;
  upstream rebuild absent; digest re-pin a dead end); the rm-558 header (:10-15)
  updated to 'COPY plus two RUNs — the only steps that execute on the target'.
- Acceptance, all first-hand: `docker build --check` clean; full `docker build` rc=0
  (which also runs BOTH frozen-install stages against the B1-cured lockfile inside
  the image — B1 validated on the CI path); `dpkg-query` in the built image:
  **libpcre2-8-0 10.42-1+deb12u2, perl-base 5.36.0-7+deb12u4**; trivy 0.72.0 (the
  workflow's pinned version) Enforce-replica with a FRESH DB, flags mirrored exactly
  (`--scanners vuln --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1`):
  **0 findings, rc=0** — the gate the Enforce step runs is green on this image.

## B3 — lockfile-guard.yaml (the freeze-class armor)

Byte-adopted from sibling a2def4ce's uncommitted 56-line file; provenance header
re-anchored to this lineage (rm-282 armor + rm-116 context; rm-648 does not exist
here). `name: Lockfile Guard` / job `lockfile-guard` kept stable — it is the
required-check context the rm-116 ruleset will key on. Trigger set: pull_request
(main + `conductor/ci-base-**`), push (main), workflow_dispatch; ubuntu-24.04
(rm-188-era pin); the gate command runs BEFORE any install by construction.

- actionlint container form over the repo: rc=0. Scoped eslint on the new file: rc=0.
- **Gate self-tested both polarities in /tmp**: the exact command
  (`pnpm install --frozen-lockfile --lockfile-only`) → rc=0 on the cured manifests,
  rc=1 with the literal `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` on the broken c3e7aa83
  blob — the guard is falsifiable, not aspirational.

## B4 — documentation

- `docs/solutions/workflow-issues/pnpm-lockfile-config-mismatch-frozen-install-trap-2026-10-05.md`
  (new): the mismatch class, the silent in-tree regen trap (implicit install preamble
  of any pnpm script), the /tmp sandbox derivation recipe with the byte-stability +
  clean-copy acceptance battery, and the guard pointer.
- This batch record.
- ROADMAP riders (dated 2026-10-05, run 3570419605cb implement fa2d31be): rm-669
  flipped to implemented-in-tree-pending-landing with the perl-base extension
  recorded; rm-282 gains the cure record (blob, acceptance, family re-convergence);
  rm-276 gains the lockfile-reconciliation landing note. The roadmap phase's +19/-10
  deliverable preserved byte-for-byte underneath.

## Post-landing obligations (recorded, NOT in this batch)

- Watch the re-dispatched push workflows at the landed sha: 4/5 red → 5/5 green is
  the batch's outer acceptance (final_validation).
- `pnpm audit --prod` 0 / `--recursive` 0 re-probe on the landed tree; Dependabot
  alert auto-close after the lockfile rescan push (brace-expansion's
  not-affected-by-construction alerts were expected to auto-close).
- rm-116 ruleset fill AFTER green (filling required checks while main is red
  deadlocks merges): contexts = Main conclusions + CodeQL + Lockfile Guard, strict,
  admin-enforced.
- F2 scheduler root cause (rm-278) next cycle; F5 Node-26 web failures (rm-139)
  ride the 2026-10-20/28 Node windows.

## Deferred with named blockers

canary/base-drift workflow edits + workflow comment drift (sibling
73d35a6c/a2def4ce territory — reconcile by content at integrate); upstream absorb
(rev-list 2, dep-only, zero action); statSync F7 (declined, third occurrence);
hono/eslint/action-setup in-range refreshes (rm-108 dependabot window).

## Re-verification addendum (2026-10-05T16:0xZ, implement attempt b217748e)

The fa2d31be batch above was re-verified end-to-end first-hand by a fresh
attempt after an infra-failed retry (14638b59 died at delegate dispatch —
session-reap, zero work events, tree untouched between attempts). Base
re-probed unmoved (origin/main == HEAD == 306a972); porcelain identical
(3 M + 3 ??). Every acceptance point re-measured green: fresh /tmp
re-derivation under pinned pnpm 11.28.3 BYTE-IDENTICAL to the in-tree blob
96db787f (era-stable — the 12:31Z 9abdcdd5 registry oscillation has not
returned); clean-copy `pnpm install --frozen-lockfile` rc=0 (9.2 s);
`pnpm audit --prod` 0 / `--recursive` 0; `docker build --check` clean and full
build rc=0 (both in-image frozen installs against the cured lockfile);
in-image dpkg libpcre2-8-0 10.42-1+deb12u2 + perl-base 5.36.0-7+deb12u4;
trivy 0.72.0 Enforce replica with a FORCED-FRESH DB (empty cache dir forces
the full download) — 0 findings, rc=0, i.e. no new base-package treadmill
entries since the 14:5xZ measurement; guard gate both polarities (rc=0 cured /
rc=1 literal ERR_PNPM_LOCKFILE_CONFIG_MISMATCH on blob c3e7aa83); actionlint
container rc=0; scoped eslint rc=0 (guard yaml + ROADMAP.md + this doc);
ROADMAP census 216 ids / 0 duplicates, cumulative +22/−10, zero removed ids.
Operational note for replicators: scanning a locally built image with the
trivy container requires mounting the docker socket
(`-v /var/run/docker.sock:/var/run/docker.sock`) — without it trivy cannot see
the daemon and fails with image-not-found, which reads like a scan failure but
is not one.
