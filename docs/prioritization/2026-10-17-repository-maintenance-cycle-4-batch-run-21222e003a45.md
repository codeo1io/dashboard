# Repository-maintenance cycle 4 batch — Estate truth & guard restoration

Run: 21222e003a454200a41d886c25934199 · cycle:4 · implement attempt be893b98 ·
base 7042635 (== origin/main at assess, fetch-verified; origin/main had moved to
7b4d425 by the roadmap phase — actions-darkness-watch landing, noted, not absorbed).
Batch composed by the prioritize phase (85a841aa) from the roadmap-phase candidate
pool (783592071: rm-1472..rm-1477 minted above the spool wall, rm-648 acceptance
fill) plus assess (a9a65f1c) and research (4c4c291b) evidence.

## Salvage adoption

Provider-dead attempt a8d90c06 (reaped at message_count=15, no typed artifact) left
durable work in the worktree, verified this turn before adoption: the roadmap-phase
ledger diff applied byte-identical to the spool artifact, plus the two authored
workflows. Adopted with two fixes by this attempt: cve-tripwire.yaml's trivy call
dropped a `--format table` flag that trips the repo-wide base-drift digest-readback
guard (no workflow may pass `--format` to a subcommand; trivy's default report is
already the table written by `--output`), and the trivy container is now pinned by
digest. Everything else in both files is the dead attempt's authorship, verbatim.

## What landed

- **rm-648 — phantom-citation lane** (cve-tripwire): `.github/workflows/cve-tripwire.yaml`
  lands in the weekly Monday 06:53Z slot the release-channel cron-cluster comment has
  cited since 2026-10-05, so that citation becomes true with no edit to
  release-channel.yaml. Alert-only: permissions `contents: read`, findings to the job
  summary, non-zero exit only on operational failure — a dead pinned digest is exactly
  the red it exists to raise (it reads RED by design until the digest bump lands;
  2026-10-18 review fix: origin/main@debde800's Dockerfile:16 already carries the
  manifest-alive sha256:7f486cab digest and this batch touches no Dockerfile, so the
  folded lane ships a live digest — first Monday fire expected green-with-findings,
  red only on operational failure).
  Inert on main while Actions stay dark (rm-1450 estate); first post-recovery fire owed.
- **rm-1472 — CVE-posture ledger**: disposition rows for every open rule recorded
  below. Def stays in_progress pending the sibling-owned digest bump (rm-1467 lineage)
  with the cold-cache FROM proof and the post-landing fresh-DB reconciliation.
- **rm-1473 — Lockfile Guard restore**: `.github/workflows/lockfile-guard.yaml`
  recovered verbatim from salvage commit 70440c0 (addendum-only header edit), gating
  main and pull_request; release runbook Class-B row flipped from
  manual-until-restored to citing the restored lane; deliberate red proven locally
  under dark Actions (record below).
- **rm-1475 — upgrade decision matrix v2**: seeded at
  `docs/plans/2026-10-17-001-upgrade-decision-matrix-v2-plan.md` (one dated row per
  major with go/no-go, review date, owning def); `.nvmrc` pins 24; rm-139's acceptance
  re-pointed from the superseded rm-108 matrix to this def.
- **rm-1477 — clonedeps version truth**: AGENTS.md bullet now states `v0.122.1`
  (`git describe` first-hand, equal to the fro-bot.yaml:347 agent-pin comment) with
  the tracks-the-pin rule and the fresh-worktree absence note.

## rm-1472 disposition rows (recorded 2026-10-17)

Code-scanning census: 49 open (43 Trivy across 8 distinct HIGH rules + 6 Scorecard;
assess a9a65f1c). Trivy measurement of the new digest 7f486ca (research 4c4c291b,
scan 2026-10-16; the digest pinned at this base, 173f1258, is dead — pull 404s —
which is the digest-bump dependency named above; 2026-10-18 review fix:
origin/main@debde800's Dockerfile:16 already carries the manifest-alive
sha256:7f486cab, so the fold ships a live digest and the tripwire's first Monday
fire is expected green-with-findings).

| Rule | Where (installed, trixie 13.7) | Fixed | Disposition |
| --- | --- | --- | --- |
| CVE-2026-78410 | util-linux family — 9 packages at 2.41.5-0+deb13u1: bsdutils, libblkid1, liblastlog2-2, libmount1, libsmartcols1, libuuid1, login, mount, util-linux | none in trixie today | track-upstream |
| CVE-2026-78409 | same util-linux family, same version | none | track-upstream |
| CVE-2026-78408 | same util-linux family, same version | none | track-upstream |
| CVE-2026-76642 | same util-linux family, same version | none | track-upstream |
| CVE-2025-69720 | ncurses — libtinfo6, ncurses-base, ncurses-bin at 6.5+20250216-2 | none | track-upstream |
| CVE-2026-16742 | systemd — libsystemd0, libudev1 at 257.13-1~deb13u1 | none | track-upstream |
| CVE-2026-9538 | perl-base 5.40.1-6+deb13u1 | fix_deferred upstream | track-upstream |
| CVE-2026-54369 | libacl1 2.3.2-2+b1 | none | track-upstream |

Track-upstream rationale, common to all eight rules: every fix lives in a Debian
trixie refresh that has not shipped, so the fix path is the base-image digest bump,
not an app change. All are local-privilege or DoS classes (mount helpers, nsenter,
symlink traversal, homed signature, ncurses overflow, tar-header DoS) whose
exploitation requires local interactive operations absent from this read-only
single-operator dashboard's surface. Upstream reference per rule at the Debian
security tracker (security-tracker.debian.org/tracker/ + the CVE id). These rows
ride the digest bump when it lands; they do not gate it.

Fresh-DB rules the code-scanning snapshot has never alerted (base-image bundled npm
tooling, not the app lockfile — `pnpm audit --prod` clean at assess): CVE-2026-93748
(http-cache-semantics 4.2.0, affected, no fix), CVE-2026-19534 (undici 6.28.0, fixed
6.28.1), CVE-2026-102278 (brace-expansion 5.0.9, fixed 5.0.11), CVE-2026-102276
(brace-expansion 5.0.9, fixed 5.0.10). Recorded with the 2026-10-16 scan date as
DB-noise candidates pending the post-landing reconciliation the def's third bullet
owes.

## Deliberate red (rm-1473, Actions dark)

Throwaway tree copy; the workspace override line `jsdom: 29.0.0` injected into
`pnpm-workspace.yaml` while the lockfile records 29.1.1 — the exact 2026-10-04
failure class (overrides set not matching the lockfile).

- Green leg, cured worktree, the exact gate command:
  `pnpm install --frozen-lockfile --lockfile-only` → `Done`, rc=0.
- Red leg, broken copy, same command → `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH: Cannot
  proceed with the frozen installation. The current "overrides" configuration
  doesn't match the value found in the lockfile`, rc=1. The lane's step runs the
  same command, so a live red after Actions recovery is expected to reproduce this
  signature exactly.

## Deferred from this batch

- **rm-1474 (branch-protection fill)** — blocked on the estate precondition; probe only.
  (2026-10-18 review fix: previously mislabeled "Actions 422" — that datum is
  rm-1450's; rm-1474 is the branch-protection fill, rm-116's successor.)
- **rm-1476 (aggregator cache eviction)** — next-cycle lead candidate, sibling-owned lineage
  context recorded in the roadmap phase; deliberately not raced here.
  (2026-10-18 review fix: previously mislabeled "dead-digest repin" — that lineage is
  rm-1467's absorb batch; rm-1476 is the aggregator cache-eviction def, as the
  compound doc's cycle-5 slate records.)

## Validation (this implement fold, focused budget)

`pnpm install --frozen-lockfile` rc=0; the two gate legs above; actionlint container
form (rhysd/actionlint:1.7.12) clean on both new workflows; `pnpm check-types`,
`pnpm lint`, and the workflow-statics + ledger guard suites green — exact commands
and exit codes in the phase result evidence refs. Repository-wide validation is
reserved for the full_tests gate per the work-order budget.
