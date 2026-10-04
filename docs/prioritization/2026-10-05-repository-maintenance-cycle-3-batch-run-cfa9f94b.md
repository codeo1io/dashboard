# Dashboard maintenance — cycle 3 batch (2026-10-05, run cfa9f94b)

module: dashboard
tags: `[lockfile, frozen-install, docker, trivy, lockfile-guard, security-floors, verify-deps-before-run]`
problem_type: batch-record
base: 306a972 == origin/main (fetch re-probed unmoved through every phase of this run)

## Frame

Repository-maintenance cycle 3, run `cfa9f94b5eae449691381a026be0bd69`, implement
attempt `17d88d58e8834e819087af6d25809081`. Phase lineage: assess `a18adbc2`
(first-hand wall reproduction + 1e1e2f5 forensics), research `306eae1d` (registry
advisory set, pnpm 11.28.4 A/B, scheduled-workflow latencies), roadmap `9a8a646f`
(extension #28 + 7 dated riders, +15/0 — preserved verbatim below this batch's
riders), prioritize `e90d2f29` (batch selection over 7 scored candidates),
stewardship `90935140` (change-unit contract). Batch: **B1–B5 + severable rider
R — 'Unfreeze main: reconcile the lockfile, heal the image, armor the freeze
class, correct the record'**. All units implemented in this worktree, uncommitted,
dirty-state-preserving. pnpm was never allowed to derive in-tree — every
derivation lives in `/tmp/cure-17d88d58` sandboxes.

Fleet convergence: sibling runs `3570419605cb` (c:1) and `5e661558` (c:1) selected
the same batch shape from the same evidence; both trees are adopt-by-content
sources ONLY — this run re-derived B1 from scratch and re-ran every acceptance
first-hand. No sibling blob was adopted on sha alone; where adopted (B4 gate, B3
comment shape), provenance is re-anchored to this run and on-ledger ids.

## The mandate

One goal: `pnpm install --frozen-lockfile` succeeds on main, install-dependent
workflows go green at the landed sha, and the cure cannot be silently reverted
again. The committed `pnpm-lock.yaml` (blob `c3e7aa83`) fails every frozen
install with `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` against floors already raised
on main (`pnpm-workspace.yaml` brace 2.1.7/5.0.12, fast-uri 3.1.8, toml 4.2.0,
undici 7.30.0) — born at `1e1e2f5` (2026-10-04T15:45Z), whose upstream-merge
conflict resolution took upstream's cured workspace but kept the stale lockfile.

## Correction of record (this batch, first-hand)

The recorded "registry oscillation" between `9abdcdd5` (12:31–12:52Z
derivations) and `96db787f` (14:42Z onward) was a **hash-space conflation, not
registry drift**: `9abdcdd5…` is the sha256 and `96db787f…` the git blob of the
SAME bytes. Proof: this run's fresh 20:0xZ derivation is byte-identical to both
siblings' files and hashes `9abdcdd54f3082b7` as sha256 and `96db787f` as
`git hash-object` simultaneously. One derivation era has been stable all day;
sha is evidence, re-derivation remains the gate.

Second correction: rm-285's LANDED status describes 2026-10-03 only — the
lockfile half was reverted 2026-10-04 at `1e1e2f5`; Dependabot re-opened
alerts #29/#30 at 15:47:15Z (9 open at batch time). A dated correction rider
rides this batch (ROADMAP, rm-285 block).

## B1 — lockfile-only cure (`pnpm-lock.yaml`, +86/−123)

Derived in `/tmp/cure-17d88d58` from strict `git show HEAD:` 3-file copies
(package.json pin sed'd to 11.28.4 per rider R) under `pnpm@11.28.4`. Battery,
all first-hand:

| # | Acceptance | Result |
| --- | --- | --- |
| 1 | frozen install, clean copy, pnpm 11.28.4 | rc=0 (7.5 s) |
| 2 | frozen install, clean copy, pnpm 11.28.3 (R-severability) | rc=0 (5 s; true binary forced via prefix install — see trap 4) |
| 3 | `pnpm audit --recursive` | 17 → 0 vulnerabilities, rc=0 |
| 4 | floors honored | fast-uri 3.1.8, undici 7.30.0, toml 5.0.0 (≥ floor 4.2.0), brace-expansion 2.1.7/5.0.12 |
| 5 | no in-range sweeps | hono stays 4.13.12 |
| 6 | manifest staleness healed | `@playwright/test` 1.63.0, `@axe-core/playwright` 4.13.0 resolve again |
| 7 | no ghost importer | zero `wiki[-_]writ` hits in the lockfile |
| 8 | byte-stability | two consecutive fresh derivations identical; byte-identical to both sibling cures (sha256 `9abdcdd5`, blob `96db787f`) |

Delta vs HEAD: 86 insertions / 123 deletions — exactly the sibling-proven shape.
Floors are era-stable across all three trees (toml 5.0.0 / undici 7.30.0 at the
same line numbers).

## B2 — `verifyDepsBeforeRun: false` (`pnpm-workspace.yaml`)

Inserted after `minimumReleaseAge` with a dated rationale comment re-anchored to
on-ledger ids (revisit clause cites rm-140, the pnpm-12 bump item). Kills pnpm
11.x's silent in-place lockfile rewrite by `pnpm run`-family commands on stale
trees — the mechanism that dirtied tracked lockfiles across sibling runs.
In-tree evidence this batch: `pnpm lint` and the in-tree frozen install both
leave `pnpm-lock.yaml` byte-identical (`9abdcdd5` before and after).

## B3 — runtime image heal (`Dockerfile`)

The 2026-09-20 "absorbed at the base" retirement was false: digest `0e0ff40`
ships libpcre2-8-0 `10.42-1+deb12u1` while the fix is `deb12u2`
(CVE-2026-103111); perl-base `deb12u3 → deb12u4` (CVE-2026-103112) rides the
same `--only-upgrade` line (arch-agnostic, skips harmlessly on a fixed base).
Enforce (`release.yaml` trivy-action v0.36.0, trivy 0.72.0) scans the BUILT
image, so B1 without B3 leaves Release red — the units are inseparable for
green. First-hand acceptance: `docker build` rc=0; `dpkg-query` inside the image
reports `libpcre2-8-0 10.42-1+deb12u2` + `perl-base 5.36.0-7+deb12u4`;
fresh-DB trivy replica (`--scanners vuln --severity HIGH,CRITICAL
--ignore-unfixed --exit-code 1`) → **Clean, rc=0**. The header "only cheap
filesystem work" claim and the rm-558 "only target-platform RUN" claim are both
trued-up in the same change.

## B4 — `.github/workflows/lockfile-guard.yaml` (NEW)

Byte-adopted from sibling `3570419605cb` (itself from `a2def4ce34dc`), header
provenance re-anchored to this run; every `rm-` reference on-ledger (rm-116,
rm-139, rm-140, rm-285). Job name `Lockfile Guard` is stable — it is rm-116's
designed required-check context. Gate = `pnpm install --frozen-lockfile
--lockfile-only` (3 s, no install, no chicken-and-egg with vitest). Both
polarities self-tested this run: cured tree rc=0 (1.2 s); broken HEAD-lockfile
copy rc=1 with exactly `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`. `actionlint:1.7.12`
container form (the CI pin) rc=0.

## B5 — records and riders (zero new ids)

- rm-285 dated correction-of-record + re-landing rider (acceptance table above,
  loss history: cure landed ≥4×, lost 4× in 4 days; `d34c15c` restored 13:11Z,
  `1e1e2f5` undid 15:45Z).
- rm-670 latency enrichment folded into extension #28 (scorecard run
  `37330098013` fired +8h39m34s past its 06:27 window — outside the historical
  band; alert threshold must be ≥9 h).
- `pnpm-workspace.yaml:22-26` false "closed #29/#30" comment → truth.
- This batch doc; solutions entry
  `pnpm-lockfile-config-mismatch-frozen-install-trap-2026-10-05.md`.
- Census preserved: 215 defs / 0 dups before and after; longest non-`<!--`
  line 3486 chars (rm-284 guard limit 4000); riders placed as new lines, never
  inline-appended.

## R — severable rider: pnpm 11.28.3 → 11.28.4

Same-family security (credential-leak + frozen-lockfile acceptance fixes,
released 2026-10-03). ONE change-unit across three surfaces:
`package.json:57` packageManager, both Dockerfile corepack pins (:22, :42),
and both `test/fork-exclusion-guard.test.ts` assertions (regex count + exact
pin). Proven pin-insensitive for wall and cure (frozen rc=0 under both pins,
battery #2). Dropping R leaves B1–B5 byte-unchanged.

## Focused gates (this phase; repository-wide validation reserved for the merge gate)

- `npm exec -- vitest run test/fork-exclusion-guard.test.ts
  test/roadmap-length-guard.test.ts` → 18/18 pass.
- `pnpm lint` → rc=0 (host Node 22, engine warning only).
- `actionlint` container `1.7.12` on the new workflow → rc=0.
- Guard polarity pair (above), docker build + dpkg + fresh-DB trivy (above),
  in-tree frozen install rc=0 with byte-stable lockfile.

## Deferred with named blockers

- rm-116 branch-protection fill — post-landing ops only (required checks red at
  Setup while the wall stands = permanent merge deadlock). Contexts: Main jobs
  + CodeQL + `Lockfile Guard`, strict, admin-enforced.
- Upstream absorb — NO-ABSORB until B4 lands on main; `1e1e2f5` is the
  recorded revert vector (behind=2, ahead=162, dep-only at selection time).
- rm-179 / rm-671 canary query-class reds — unreachable until install green.
- rm-139 Node-26 web-test localStorage seam — its 2026-10-20/28 window; the
  guard workflow's own comment tracks the exit.
- rm-120 agent/runbook refresh; healthz dead fields (below cut-line).

## Traps recorded for the fleet (full detail in the solutions entry)

1. pnpm silently "heals" the wall: any in-tree non-frozen install rewrites the
   tracked lockfile and masks the failure class (B2 + /tmp-only derivations).
2. `pnpm config get verify-deps-before-run` prints undefined even when the
   camelCase workspace key is honored — do not probe config, probe behavior.
3. Hash-space conflation (see correction of record).
4. pnpm ≥9.7 self-delegates to the `packageManager` pin — an `npx pnpm@X` probe
   in a directory whose package.json pins Y runs Y. Version probes must set the
   pin in the sandbox manifest (or force the binary via prefix install).
5. `rhysd/actionlint` Docker tags drop the `v` (`1.7.12`, not `v1.7.7`) —
   container-form doc already warns.

## Outcome (adoption run 8b1672ef, 2026-10-06 — pre-review record)

This batch was adopted, implemented, and validated green by run 8b1672ef at
base 306a972 (origin/main unmoved at implement; it later advanced to 3d07cf9,
the managed-render commit — see rm-104's 2026-10-06 rider for that hazard).

- **Adoption**: 8 non-ROADMAP files byte-adopted from the CI-validated ref
  (local `adopt/cfa9f94b-cure` == `conductor/ci-6f0d063134` == PR `#389`
  head; `git diff --stat` over the 8 paths EMPTY); ROADMAP.md unioned by
  three-way merge-file, zero conflicts, both rider sets verified present.
- **Local battery** (implement e377f266): frozen install rc=0 (pnpm 11.28.4),
  lockfile sha256-head `9abdcdd5` stable across every later phase, audit 17->0
  at implement time, `pnpm lint` rc=0 (one ROADMAP emphasis fix),
  `pnpm check-types` rc=0, 18/18 vitest (guards).
- **Targeted validation** (664f580a): impacted-tests runner classified
  package.json as shared build/test config and escalated INTERNALLY to its
  authoritative fallback — ephemeral CI PR `#393`, ALL 11 checks SUCCESS,
  zero debris.
- **Full validation** (73c95090): `github_ci_validate.py --repo .` verbatim —
  ephemeral CI PR `#395` (snapshot f6354ab7ca57 on base 28e91f948111),
  ALL 11 checks SUCCESS incl `Lockfile Guard`, self-closed with both refs
  deleted (zero debris); validation digest
  `validation:v1:9cade95907f7fb11bd75235f254c2b61e2505bfbb9f13a73793bd070592ae733`
  declared verbatim and re-derived EQUAL (no executable change post-implement).
- **New hazard recorded (pre-review)**: the implement-time audit-0 EXPIRED —
  source-map-js GHSA-68fv-2mgg-jv7q (HIGH) + katex GHSA-238p-pmpm-9mq7 (LOW)
  now cover this batch's own resolutions; no PR check exercises `pnpm audit`;
  verified cure floors on rm-285's 2026-10-06 rider — fold BEFORE the Monday
  2026-10-12T03:37Z audit fire, then re-validate (executable change ⇒ new
  digest).
- **Adoption source preserved**: PR `#389` OPEN + MERGEABLE throughout; two
  fleet attempts died of session-reaping this cycle (f9db2587 assess,
  917b4462 full_tests — zero-work deaths, nothing adopted from either).

## Next-cycle candidates (handoff, run 8b1672ef compound b0413212)

1. source-map-js/katex floors + lockfile regen were FOLDED INTO the batch at
   the 2026-10-06 review fix (run 8b1672ef attempt 83b08898, remediating
   independent_review 1d96c395) — no longer a landing-time step; keep
   re-deriving `pnpm audit` live at the merge gate every time
   (rm-278 rider; solutions doc 2026-10-06).
2. After the batch merges: close PR `#389`, then sweep the 100+ dead
   `conductor/*` refs on origin (preserve `conductor/ci-6f0d063134` until the
   merge, not after); re-check `git ls-files .conductor` empties post-merge
   (landing-pipeline trap in AGENTS).
3. ROADMAP recovery: the union artifact already exists — THIS run's worktree
   ROADMAP.md (restored 306a972 base + unlanded riders unioned by CONTENT,
   215 defs incl. this run's 11 riders) IS the take-wholesale side of the
   landing merge vs 3d07cf9; never re-derive from bare 306a972 at landing
   (read literally that drops the 11 riders this run added). See the rm-104
   rider 2026-10-06 — render corruption census + emitter obligations;
   reconcile the canary.yaml:19 'rm-650' label by content, not id.
4. Re-cut rm-674 (canary daily-cron consolidation) post-adoption — blocked
   while installs are red; same window as rm-179/rm-671 canary reds.
5. Deferred by prioritize 7ff002a8 with named blockers: rm-116 fill
   (post-landing ops; add `Lockfile Guard` to contexts), rm-156 watchdog,
   R3/R4/R5 bumps, upstream absorb (NO-ABSORB until B4 on main; 1e1e2f5 is
   the recorded revert vector).
6. Posture refresh riders when the wall clears: OpenSSF scorecard
   re-measure (rm-143 rider; Vulnerabilities 0 with 17 detected clears on
   B1) + docs/runbooks/security-posture.md refresh; fast-uri-4 window
   unowned (rm-499 rider).
7. Process: session-reap deaths (two this fleet leg) are retryable transport
   artifacts — event-log + absent-artifact forensics decided both in one read;
   keep doing prior-attempt forensics before redoing a phase.
