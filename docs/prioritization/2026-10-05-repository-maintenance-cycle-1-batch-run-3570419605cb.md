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

## Addendum — targeted_tests 9fed8680 (2026-10-05)

The seeded targeted command (impacted-tests runner over the batch's one
executable surface, the Lockfile Guard workflow) could not prove a narrow
Node-test scope for a workflow-file target and fell back to the authoritative
ephemeral-PR validation. First fire: 10 of 11 checks green — Lockfile Guard
itself executed green on GitHub (job `111904084448`, run `37351767427`) —
but Main/Test failed on `test/roadmap-length-guard.test.ts` (rm-284): the
implement rider for this run had been appended to rm-116's `- signals:`
line, growing it from 3333 to 4131 chars against the 4000-char
paragraph-length guard. Cure applied per rm-284's documented pattern: the
rider was split into a blank-line-separated, 2-space-indented sub-paragraph
inside the same list item — the base signals line is byte-identical to the
committed one and the rider text is verbatim. Local guard run 1/1 pass; the
seeded command was re-run verbatim for the re-validated matrix.
Re-run outcome: ephemeral PR `387` (commit `1ac5c7f7`) — 11/11 checks
green, including Main/Test and a second consecutive green execution of the
Lockfile Guard workflow (run `37352726511`).

## Compound addendum (2026-10-05, compound `c5b1fced` — pre-review)

Cycle learnings recorded from pre-review cycle evidence only (assessment,
research, roadmap, prioritization, implementation, and test outcomes).
Review and shipping happen after this step — nothing below claims landed
state, and no item status is flipped to completed here.

### Pre-review validation record (the whole batch arc is green in-tree)

- targeted_tests `9fed8680`: seeded command run 1 red on Main/Test only —
  rm-284's 4000-char guard caught an INLINE implement rider on rm-116's
  signals line (3333 → 4131 chars); cured as a blank-line sub-paragraph
  (base line byte-identical, rider verbatim); run 2 green: ephemeral PR
  `387` 11/11.
- full_tests `a7a96ae6`: dispatch full_command verbatim, green FIRST RUN
  on the same tree — ephemeral PR `388` (snapshot `7131b2c8`) 11/11 checks
  incl. Lockfile Guard (run `37359175987`); PR auto-closed by the tool;
  worktree byte-stable; engine validation digest unchanged across the run
  (`f4e5455f…` re-derived before and after, matching dispatch verbatim).
- Local-only divergence kept OUT of the verdict: the web suite on host
  Node 26.10.0 fails 106/1180 deterministically (jsdom vs Node's
  globalThis.localStorage — documented at
  `node26-localstorage-web-test-env-window-2026-10-04.md`); CI pins Node 24
  and is green across every matrix above — do not chase this as a batch
  regression.

### Reusable lessons / prevention rules

1. **Rider placement rule (twice-fired now).** NEVER append dated riders
   inline onto existing long ROADMAP list lines — land them as
   blank-line-separated 2-space sub-paragraphs (rm-284's cure) and run the
   guard predicate before folding; eslint markdown lint is blind to this
   class. New entry:
   `roadmap-rider-inline-append-trips-vitest-length-guard-2026-10-05.md`.
2. **Fold-gate attestation discipline (process; cost one dispatch cycle
   here).** Implement folds REQUIRE a `validation_evidence.changed_surfaces`
   attestation naming the engine-derived delta (KTD13) — a perfect
   implementation with a missing attestation is rejected. Declare every
   changed repo-relative path; entries without `/` or `.` (e.g. bare
   `Dockerfile`) are silently dropped from the effective set — harmless,
   but declare them anyway so the attestation is honest.
3. **Registry-era labels are procedure-scoped, not sha-scoped.** Sibling
   lockfile derivations converged on `96db787f` by 14:42Z while the 12:31Z
   era label said `9abdcdd5` (registry-maturity oscillation): the sandbox
   recipe is the gate, the sha is evidence only.
4. **Derive lockfiles in a /tmp sandbox under the pinned pnpm, never
   in-tree** — in-tree pnpm scripts silently regenerate the lockfile
   (`pnpm-lockfile-config-mismatch-frozen-install-trap-2026-10-05.md`).
5. **trivy on a locally built image needs the docker socket mount**
   (`-v /var/run/docker.sock:/var/run/docker.sock`) or it reads as
   image-not-found — see the b217748e re-verification addendum above.

### Candidates / context for the next maintenance cycle

- **Post-landing obligations FIRST** (all gated on the landing actually
  happening): re-probe frozen install + `pnpm audit` 0/0 on the landed
  tree; verify Dependabot #29/#30/#32 auto-close after the lockfile rescan
  push; flip rm-669 with the Release/Enforce run URL; THEN fill rm-116's
  ruleset — contexts Main conclusions + CodeQL + Lockfile Guard, strict,
  admin-enforced (filling required checks while main is red deadlocks
  merges).
- **rm-139 Node-26 window leads the cycle** (v24 maintenance flip
  2026-10-20, v26 LTS 2026-10-28): the go/no-go must first decide the
  jsdom/localStorage web-suite blocker (assess F5) — CI pins Node 24 and
  stays green, so this is a window decision, not a fire.
- **rm-278 / assess F2 schedule-queue latency** (corrected 2026-10-06,
  independent_review:fix `56d2f7cb` — the 2026-10-05 "zero schedule-event
  runs since 2026-09-30" reading above was a morning-probe artifact,
  refuted from 10:48:22Z the same day): five schedule-event runs DID fire
  on Monday 2026-10-05, every one massively late — audit 10:48:22Z FAILURE
  (+7h11m past the 03:37Z window, run `37298905368`; the red is the
  stale-lockfile advisory count this batch's B1 cures, not a scheduler
  fault), base-drift 11:24:45Z success (+7h11m, run `37302756196`),
  upstream-drift 12:15:03Z FAILURE (+6h58m, run `37308222484`), canary
  12:21:01Z FAILURE (+6h58m, run `37308919388`), scorecard 15:06:34Z
  success (+8h39m34s, run `37330098013`; newest before them: 2026-09-30
  CodeQL, run `36726778518`). Root-cause re-aim for rm-278's next-cycle
  premise: not scheduler-dark but schedule-queue latency GROWTH (6h23m on
  2026-09-28 per `ROADMAP.md` rm-179's correction rider → 8h39m34s on
  2026-10-05, n=2 Mondays across five workflows — the morning census's
  "all four cron windows" had undercounted; scorecard 06:27Z is the
  fifth). The "prove the SCHEDULER fires" obligation is half-satisfied
  (fires exist); what remains is a GREEN scheduled audit fire — Monday
  2026-10-13 03:37Z window; a workflow_dispatch green run remains
  non-proof.
- **Absorb context**: upstream delta is 2 dep-only commits (`4415c97`
  renovate, `ed6e33c` fro-bot v0.117.2), NO-ABSORB stands; upstream open
  PRs `#549` (undici 7.30.0) and `#538` (fast-uri 3.1.8) are parity with
  our floors — but when they merge upstream, the NEXT upstream merge can
  again ride an upstream-regenerated lockfile against fork floors (the
  `1e1e2f5` vector); Lockfile Guard turns exactly that red at merge time —
  keep it in rm-116's required contexts.
- **Hygiene**: ~47 dead `conductor/ci-*` refs on origin (standing sweep);
  sibling batch docs (`73d35a6c` / `a2def4ce` / `e795cadd`) reconcile by
  content at integrate — `5e661558`'s lockfile is stale-era, do not adopt.
- **In-range refreshes deferred to rm-108's window**: hono `4.13.12`
  (age-eligible since 2026-10-01), eslint, `pnpm/action-setup` v6.1.0.
