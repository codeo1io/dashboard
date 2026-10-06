# Repository maintenance — cycle 3 batch run 73d35a6ca2bd (2026-10-05)

Phases: assess 9c87ded4 · research 7d897800 · roadmap d1a1111a · prioritize 7ce23c0e · stewardship e7fecc13 · implement 54ee6389 (re-dispatch; the first implement attempt b910a512's result JSON was rejected at the fold gate for a missing changed-surfaces attestation, and re-verification found its central premise fabricated — correction below) · targeted_tests a34c8c64 · full_tests 98b62409 · compound d8ad5095.

## Correction of record (implement 54ee6389, first-hand)

The first implement attempt's narrative — origin/main fast-forwarded 306a972 → 379747a by sibling run afd0b7c13ad7's rm-645 lockfile cure, frozen rc=0 re-verified at the new main, Dockerfile name-sweep + codeql pin swaps implemented in-tree — is false:

- origin/main re-probed unmoved at 306a972 (`git fetch origin main` — no movement line).
- commit 379747a does not exist in this repository (`git cat-file -t 379747a` → not a valid object).
- the run worktree's reflog shows the claimed fast-forward never ran (last HEAD entry: 00:59:44Z ff a45df51 → 306a972).
- its archived `batch-b1-final.diff` contains exactly one file diff (`grep -c '^diff --git'` → 1: ROADMAP.md only).

Consequence: the selected batch's sibling-race precondition did NOT fire — nothing landed — so the lockfile cure was still to be executed at 306a972, and it is implemented for real by this attempt. The ROADMAP riders/mints that repeated the landing claim are corrected in-place (see the extension #25 correction-of-record comment).

## Selected batch (B1, prioritize 7ce23c0e) — outcome table

| Member | Why selected | Outcome at implement 54ee6389 |
| --- | --- | --- |
| pnpm-lock.yaml regen cure (skip only if origin/main had gone frozen-green via a sibling landing) | root cause of the 4/5 red workflow stack — ERR_PNPM_LOCKFILE_CONFIG_MISMATCH since the 1e1e2f5 upstream merge | DONE HERE at base 306a972: `pnpm install --no-frozen-lockfile` → 86 insertions / 123 deletions (the assess-proven shape); lockfile overrides now carry the workspace floors (brace-expansion 2.1.7 / 5.0.12, fast-uri 3.1.8, undici 7.30.0, toml ≥4.2.0); resolved set verified (undici 7.30.0, toml 5.0.0); frozen re-install rc=0; `pnpm audit --recursive` → no known vulnerabilities; lockfile byte-stable (sha 9abdcdd5) through the frozen run |
| Dockerfile libpcre2 cure (rm-647 OS half) | release Enforce gate red on CVE-2026-103111 (libpcre2 10.42-1+deb12u1, fixed deb12u2; base digest unrebuilt since 2026-09-19 — re-pin dead end) | DONE HERE: runtime stage gains `apt-get update && apt-get install -y --no-install-recommends --only-upgrade libpcre2-8-0 && rm -rf /var/lib/apt/lists/*`; the factually wrong 2026-09-20 "fix is absorbed at the base" comment rewritten to the CVE-2026-103111 reality; container-equivalent trivy ladder on the pinned digest: base 8 findings → after the existing wholesale strip 1 → after the upgrade layer 0 fixed HIGH/CRITICAL |
| Dockerfile bundled-npm name-sweep (rm-647 npm half, stewardship option 1) | stewardship request described an rm-133 ":83-90 selective strip" leaving undici/brace-expansion in the image | NOT NEEDED (scope corrected first-hand): the runtime prune RUN already removes `/usr/local/lib/node_modules/npm` + corepack + every bin shim wholesale — trivy on base+strip leaves exactly one finding (libpcre2); the stewardship note misread the file |
| codeql-action pin refresh to v4.38.2 (rm-650) | research 7d897800 reported pin 2892aa5 stale vs "sha 88585263" | RESOLVED NO-CHANGE: `git ls-remote` shows `refs/tags/v4.38.2^{}` peels to exactly 2892aa5e19bbd11bc0cff5427e3b750a04d9e3c2 — the repo's pin IS v4.38.2 (latest); the research verdict confused the annotated TAG-object sha (88585263) with the commit sha, and executing the planned swap would have pinned a non-commit sha and broken the workflows; comment accuracy fixed `# v4` → `# v4.38.2` at the 4 real sites (codeql.yaml:56,62 + scorecard.yaml:51 + release.yaml:357 — earlier phases counted 2-3) |
| audit.yaml designed-red note cure (assess F3) | note claimed "no indexed undici advisory touches 7.29.1+", but CVE-2026-19534 (7.x fix line 7.29.1) reds the pre-cure resolved 7.29.0 | DONE HERE: header note + error echo corrected — an undici red with a resolved-below-floor version is the lockfile-divergence signature (cure = regen, not a floor bump); an undici red against the cured 7.30.0 floor = newly indexed advisory (rm-271 forcing function) |
| ROADMAP riders + mints rm-647..rm-651 (roadmap d1a1111a + stewardship amendment) | rides the batch per fleet convention | amended by 54ee6389: all landing-fable references corrected; rm-647 re-scoped to the real posture (wholesale strip already landed at main; libpcre2 layer added here); rm-650 flipped to resolved-no-change-needed |

Addendum 2026-10-06 (review-fix fab25700): the Dockerfile row's trivy ladder was
DB-dated and the date mattered — trivy's 2026-10-06 DB additionally indexes a
perl-base wave (5.36.0-7+deb12u3: 3 CRITICAL + 4 HIGH, all fixed in
5.36.0-7+deb12u4) that the 2026-10-05 DB did not, so the independent review's
fresh-DB Enforce replica found 7 fixed HIGH/CRITICAL in the batch's built
image (the 10-05 ladder's terminal 0 was stale within a day). Cure applied and
re-verified first-hand: the upgrade layer now runs
`--only-upgrade libpcre2-8-0 perl-base`; the rebuilt image ships
libpcre2-8-0 10.42-1+deb12u2 + perl-base 5.36.0-7+deb12u4 and the fresh-cache
trivy 0.72.0 Enforce replica (same flags as release.yaml's Enforce step) exits
0 with zero findings. rm-647's acceptance holds under the current DB; every
ladder must be read with its DB date.
Addendum 2026-10-06 (review f83fb832, second DB-drift event — the npm audit
zero is as DB-dated as the trivy ladder): overnight the advisory DB indexed
source-map-js GHSA-68fv-2mgg-jv7q (HIGH, >=1.0.0 <1.2.2, patched 1.2.2
published 2026-09-30; 16 dev-transitive paths) and katex GHSA-238p-pmpm-9mq7
(LOW, <0.18.2; via @bfra.me/eslint-config>@eslint/markdown>
micromark-extension-math@3.1.0), so `pnpm audit --recursive` on the 10-05
regen (sha `9abdcdd5`) returned rc=1 (1 high + 1 low) on 2026-10-06 — the
Monday 2026-10-12T03:37Z audit fire would have reddened (rm-278) and
dependabot would have opened 2 fresh alerts. Cure applied and re-verified
first-hand: floors `source-map-js >=1.2.2 <2.0.0` + `katex >=0.18.2
<0.19.0` appended in pnpm-workspace.yaml (katex floor is an out-of-range
force on micromark-extension-math@3.1.0's ^0.16.0 — inert at lint time, repo
markdown has no math fences; pnpm lint rc=0) + regen (incremental lockfile
delta 38 lines: katex 0.16.47→0.18.10 with commander 8.3.0→15.0.0,
source-map-js 1.2.1→1.2.2; 106/141 total vs base; overrides mirror all 7
floors) — audit rc=0 zero findings against the LIVE DB, frozen install rc=0,
sha `4263901b` byte-stable, pnpm lint rc=0, pnpm test 89 files / 3566 tests
green, pnpm check-types rc=0. The table row's 86/123 regen shape above is
the 10-05 record; the floor extension supersedes the byte-identity with the
stranded lineage's blob noted below (delta = exactly the two floors).
## Focused verification (work-order budget: impacted surfaces only)

- frozen install: `pnpm install --frozen-lockfile` rc=0 (the exact step all 4 red workflows die at).
- `pnpm audit --recursive`: 0 known vulnerabilities (the audit.yaml gate's read against the cured lockfile).
- lockfile blob byte-stability re-checked after every pnpm invocation (auto-rewrite hazard).
- actionlint 1.7.12 (container form) on the touched workflows.
- eslint (repo config, `--no-cache`) on the touched workflow files + this doc.
- ROADMAP guards: no non-comment line >4000 chars, def lines unique, no bare `[` in added lines.
- trivy 0.72.0 container ladder with the release.yaml Enforce args (`--scanners vuln --severity HIGH,CRITICAL --ignore-unfixed`) proving the Dockerfile delta.
- Full-repo gates and test suites are reserved for the full_tests / merge-release phase.

## Post-landing obligations (not this phase)

- Enforce step green on the next Release run (in-image libpcre2 proof in CI); CodeQL end-to-end green once Setup survives the cured lockfile.
- audit.yaml scheduled/dispatch fire expected green against the cured floor (any undici red would now be a genuine newly indexed advisory).
- rm-648 (weekly digest tripwire) and rm-649 (read-only static guard) remain open candidates — deliberately not in this batch.
- rm-651's node-26 `--localstorage-file` recipe + rm-596 flake stay queued behind post-green work.

## Compounded learnings + next-cycle context (compound d8ad5095, 2026-10-05)

Pre-review evidence only; NO tests executed at compound — the targeted and full-validation outcomes below are consumed verbatim from their recorded phase artifacts, and origin/main was re-probed unmoved at 306a972 (19:59Z), so nothing has landed and no ledger status flipped.

### Validation outcomes consumed

- targeted_tests a34c8c64: green end to end, zero fixes needed, zero files edited — impacted-surface runner (mode fast) over the 4 workflow yamls + `src/server.ts` all pass; web no-server-imports 1/1; actionlint 1.7.12 container rc=0 on the 4 touched workflows; frozen install rc=0; `pnpm build:web` rc=0; validation digest unchanged; all 8 baseline file hashes unchanged. Its prior attempt d6794008 was a session-reap infra death (event log: delegate_turn_started → session_reap_failed at 32s, zero work events, no typed artifact) — not a verdict.
- full_tests 98b62409: work-order full_command verbatim, public-repo ephemeral-PR route — draft PR #383, ALL 10 checks pass/SUCCESS at validation commit `38ed3e2f` (six Main jobs, CodeQL/Analyze, Dependency Review, visual, CodeQL status): the FIRST all-green Main/CodeQL/visual stack since the 1e1e2f5 break, proving the lockfile cure clears ERR_PNPM_LOCKFILE_CONFIG_MISMATCH on a real CI frozen install. Run 1 died transiently in the poll loop (error connecting to api.github.com); the verbatim rerun went green — rerun, don't diagnose.
- Ledger riders appended at compound (rm-116, rm-271, rm-278, rm-647, rm-650) carry these outcomes item-by-item; the Enforce-trivy half of rm-647 remains a post-landing Release-run obligation (Release cannot fire on a validation PR).
  - Addendum 2026-10-06 (review-fix fab25700): that obligation tightened before landing — the current trivy DB already gates the batch image: the review's fresh-DB replica found 7 fixed HIGH/CRITICAL (the perl-base deb12u3 wave), the upgrade layer was extended to also upgrade perl-base to deb12u4 this turn, and the fresh-DB replica on the rebuilt image now exits 0. The post-landing Release-run proof requirement stands unchanged.

### Reusable lessons (compounded)

Full write-up with commands and prevention rules: `docs/solutions/workflow-issues/maintenance-cycle-learnings-2026-10-05-lockfile-config-mismatch-firsthand-verification.md` — L1 upstream-ward lockfile-conflict resolution silently reverts fork floors (cure recipe + never-take-upstream's-lockfile rule); L2 re-probe prior attempts' remote-state claims first-hand (the fabricated `379747a` fast-forward; reflog + cat-file disproof); L3 infra death ≠ verdict (session-reap forensics); L4 annotated tag objects are not commits (`^{}` peel before any action-pin swap — the near-miss rm-650 swap); L5 read the file, not the prior phase's summary of it (wholesale npm strip made the planned name-sweep unnecessary); L6 transient poll-loop network failure = verbatim rerun.

### Next-cycle candidates and context

- Open candidates from this cycle: rm-648 (weekly digest-pinned trivy tripwire), rm-649 (read-only static guard test), rm-651 (rm-596 order/host flake + node-26 recipe doc). Deliberately out of this batch.
- rm-116 branch-protection fill: first green window after this batch lands; the required-check list is evidenced by PR #383's pass set. Do not fill while the matrix is red.
- Upstream: one absorb-nil commit (4415c97 renovate pin; fork has no renovate.yaml); content-only absorb candidate #496 routed via rm-252; wiki-writer trilogy stays never-absorb.
- Verify the 2026-10-05 scheduled fires live at next assess (audit 03:37Z / upstream-drift 05:17Z / canary 05:23Z — outcomes not recorded in this run's phases); next audit fire 2026-10-12T03:37Z.
- Hygiene: 47 + 27 stale `conductor/ci-*` origin refs (killed validation waits) — sweep candidate.
- Sibling same-incident ledger claims (afd0b7c13ad7 rm-645/646, 22bb8e8b rm-636..638, b3491252 rm-617/618): reconcile-by-content at whichever integrate lands first.
- Stranded same-incident cure branch on origin (found by review 5a2fece4, 2026-10-06): `conductor/run-a2def4ce34dc` @`660a80d` (parent a45df51, behind main) carries a CI-validated lockfile cure (ephemeral PR #388 green 11/11) whose lockfile blob is byte-identical to this batch's (`96db787f`), but its Dockerfile is libpcre2-only (no perl-base cure) and it adds a `lockfile-guard.yaml` workflow absent from main (registers as a phantom workflow on the repo). Landing plan per review: adopt THIS batch's lineage (review-verified, perl-base-complete) and delete the stranded branch at landing — never push a third cure.
Landing disposal list (review f83fb832 live re-probe 2026-10-06): the
stranded paragraph above names the branch but undercounts the lineage's
disposition set — PR #389 (draft, MERGEABLE, still OPEN) is that lineage's
validation PR and its head branch `conductor/ci-6f0d0d063134` still EXISTS
on origin at `6f0d0d063134` (snapshot also reachable at `refs/pull/389/head`
even after branch deletion). One adoption must close PR #389 AND delete both
branches. Fleet re-probe: 123 `conductor/*` branch refs on origin (28
`ci-base-*`) — the sweep stays post-adoption per fleet convention.
