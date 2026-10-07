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
| 3 | `pnpm audit --recursive` | 17 → 0 vulnerabilities, rc=0 (2026-10-05 advisory state; that green expired with the DB — see Review-fix amendments) |
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

## Outcome (compound, 2026-10-06, attempt ad808e2e, pre-review)

Validation outcomes consumed as recorded evidence (no tests re-run in the
compound phase):

- Targeted: content-match set 10 files / 207 tests green over exactly the two
  changed testable surfaces (`.github/workflows/lockfile-guard.yaml`,
  `package.json`); `pnpm lint` rc=0; actionlint 1.7.12 (container form) rc=0 on
  the new workflow. The seeded targeted runner itself declined the narrower
  scope for `package.json` (shared build/test configuration) and recommended
  the authoritative full route.
- Full: ephemeral cloud-CI green TWICE on the identical 9-surface delta —
  PR #389 (2026-10-05, sibling 8b1672ef delivery line, still open as the
  adoption source) and PR #392 (this run, 2026-10-06T00:00:45Z to 00:03:12Z,
  11/11 checks incl `Lockfile Guard`, `Test`, CodeQL `Analyze`; auto-closed,
  both ephemeral refs deleted, zero residue).
- Digest declared at fold: `validation:v1:9cade95907f7fb11bd75235f254c2b61e2505bfbb9f13a73793bd070592ae733`
  (re-derived equal; nothing executable changed post-implement).
- Delivery state at compound time: batch in-tree uncommitted (6 modified + 4
  untracked — the detached-ci-wait learnings doc is the fourth), base 306a972 unmoved; commit/push/pr phases remain.

## Reusable lessons (this cycle)

- `docs/solutions/workflow-issues/pnpm-lockfile-config-mismatch-frozen-install-trap-2026-10-05.md`
  (B1/B2 class: a mixed-side merge resolution broke frozen install for 3 days;
  prevention = post-merge frozen-install probe + the Lockfile Guard CI job).
- `docs/solutions/workflow-issues/maintenance-cycle-learnings-2026-10-06-detached-ci-wait.md`
  (new this compound: deterministic full-fallback on config surfaces; detached
  CI waits vs the 1200s harness cap and the PR #390 debris it caused; ~2m38s
  full-suite datum; snapshot immutability in a dirty worktree).
- ROADMAP riders recording the outcomes: rm-285 (validation outcome + the
  armor's first CI proofs), rm-159 (PR #390 provenance closed; sweep exclusion
  for PR #389 until adoption); extension #28 COMPOUND clause.

## Next-cycle candidates (for the next assess)

1. After the batch lands: re-check the weekly audit gate and the OpenSSF
   scorecard Vulnerabilities sub-score (amended 2026-10-06: the 2026-10-05
   audit-zero expired — 2 post-implement advisories — and was re-established
   by the review-fix floor fold below; the Monday 2026-10-12 03:37Z audit
   fire is the first live re-proof; recorded audit greens expire with the
   advisory DB, so re-derive rather than trust the recorded 0); refresh
   `docs/runbooks/security-posture.md`'s below-8 set if the score recovers
   past 8.
2. Post-adoption `conductor/*` dead-ref sweep at rm-159 (~123 heads / 49 ci-*
   standing) — preserve `conductor/ci-6f0d0d063134` through adoption only.
3. Verify on landed main: the Dockerfile false "absorbed at the base" comment
   is gone (B3 corrected it pre-landing) and `verifyDepsBeforeRun: false`
   behaves as intended.
4. Next dependency window: confirm the `toml >=4.2.0` floor holds (bare-key
   override resolves 5.0.0) and check fast-uri 4.x advisory-window ownership
   (sibling rm-499 claim).
5. Validation budgeting: full-suite on ephemeral PRs takes ~2.5-3 min for 11
   checks (learnings doc L3).

## Review-fix amendments (2026-10-06, attempt 8319b391 — independent review fix)

All five review findings dispositioned; the two ship-gate facts were fixed in-tree, not
merely annotated. Full detail lives in ROADMAP.md (`rm-285` review_fix rider,
`rm-159` review_fix rider, extension #28 REVIEW-FIX clause).

1. **Audit-zero time-defeated (finding 1, fixed by fold).** The 2026-10-05
   `pnpm audit` green expired: the advisory DB indexed
   `source-map-js@1.2.1` HIGH `GHSA-68fv-2mgg-jv7q` (published 2026-09-18) and
   `katex@0.16.47` LOW `GHSA-238p-pmpm-9mq7` (published 2026-10-05T23:41:05Z —
   19 min before full_tests launched); a fresh audit on the byte-identical frozen
   lockfile returned rc=1 (2 vulnerabilities) — reproduced first-hand at this
   attempt's start. **Fold:** `pnpm-workspace.yaml` overrides gained
   `source-map-js: '>=1.2.2 <2.0.0'` (patched line = tip, published
   2026-09-30, minimumReleaseAge-mature) and `katex: '>=0.18.2 <0.19.0'`
   (resolves 0.18.10; override crosses the depender's `^0.16` deliberately —
   katex is lint-chain-only and lint-inert here: zero math fences in repo
   markdown; its `commander` dep moves 8.3.0 → 15.0.0, engines node >=22.12.0
   satisfied by host 22.22 and CI 24). Lockfile re-derived under pnpm 11.28.4
   seeded on the cured lockfile: byte-stable across two derivations, 38-line
   delta, all five 2026-10-05 floors and hono 4.13.12 untouched. Re-verified
   rc=0: guard-polarity frozen `--lockfile-only`, full frozen install (clean
   copy + in-tree), lockfile byte-identity across installs (sha256-head
   `4263901b`), `pnpm audit` → 0 vulnerabilities.
2. **Base moved under the batch (finding 2, delivery obligation encoded).**
   origin/main advanced `306a972 → 3d07cf9` (roadmap-sync render,
   2026-10-06T00:07:29Z) and corrupted the ledger (88 → 1 comment blocks,
   215 → 197 id defs, 194 in_progress / 3 candidate, 24 trailing-space lines +
   un-backticked bracket list = 25 lint errors, masked by the wall). The
   delivery gate must resolve the ROADMAP.md merge **wholesale from this tree**
   (restoration + cure in one sequenced window; restoration source
   `git 306a972`), verify `pnpm lint` green on landed main, and hold re-renders
   until the emitter learns no-trailing-space-on-empty-acceptance and
   backticked bracket lists. Encoded in extension #28's REVIEW-FIX clause.
3. **Adoption-source handoff gap (finding 3, obligation encoded).** PR #389's
   head carries the executable batch but NOT this tree's riders/docs. Whichever
   head lands, union both rider/doc sets chronologically (by content, never
   head-adoption alone) and re-run the census on the landed ledger. Encoded in
   the `rm-159` review_fix rider.
4. **Untracked-count miscount (finding 4, corrected).** "6 modified + 3
   untracked" → "6 modified + 4 untracked" here and in the learnings doc's L4
   (the detached-ci-wait doc is the fourth; correct at every phase since
   compound).
5. **Dangling `# so` comment line (finding 5, repaired).**
   `pnpm-workspace.yaml` retirement-note comment re-joined into one
   well-formed sentence.

## Fleet addendum (2026-10-06, run c5b7cd7d independent_review fix dd74c6a0)

Rebased onto main's landed variant of this doc (blob `2675be1f`, 267 lines) by
the c5b7cd7d review fix: the fleet's 165-line variant add/add-collided with
this file in github_ci_validate's disposable-base apply (the same pre-push
collision class as the lockfile-guard variant; see
docs/solutions/workflow-issues/ephemeral-ci-route-prepush-workflow-byte-collision-2026-10-06.md).
Dated corrections to the records above, verified live this fix:

- PR #389 closed UNMERGED 2026-10-06T07:54:36Z; head ref
  conductor/ci-6f0d063134 deleted. The claims at :179 ('still open as the
  adoption source') and :199 ('sweep exclusion for PR #389 until adoption')
  are historical. The cure content reached main via the cfa9f94b
  conductor-landing (ac61ff3, 2026-10-06); PR #389's 11/11 record remains the
  provenance anchor for the byte-adopted files (:256 handoff closed).
- Fleet cycle-3 batches re-based onto main's current bytes at review-fix
  time: `.github/workflows/lockfile-guard.yaml` byte-adopted as blob
  `1ab27c9` (68-line variant; the earlier 58-line harmonization matched only
  fe928ca and was dead against ac61ff3). Residual ship value for the fleet's
  cycle-3 lineages is riders/records only — functional bytes are already on
  main.
- Live dependabot posture: 9 open (cycle assess, morning) → 5 open
  (independent review 11:19Z) → 0 open (this fix) — floors deployed and
  alerts dismissed. Recorded audit greens expire with the advisory DB; keep
  re-deriving live at every gate (rm-278 rider governs).

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

## Review remediation record (2026-10-06, run 8b1672ef independent_review)

Two adversarial review passes ran on this batch; a third attempt
(a952f777) remediates the second pass's findings. The first pass (1d96c395)
found the audit-expiry and lint defects, fixed in-batch by 83b08898
(source-map-js/katex floors, lockfile re-derived to blob `a9dfc490`,
ROADMAP :216 backtick). The second pass (078836c3) re-verified the substance
green first-hand but found the landscape had moved under the record:

- **Guard byte-harmonized to main (HIGH, fixed this attempt)**: main advanced
  mid-cycle — fe928ca (08:22Z) landed a divergent cure variant including its
  own 58-line `lockfile-guard.yaml`; c210933 (11:30Z) extended it. This
  batch's 62-line fleet variant add/add-collides with main's inside
  `github_ci_validate`'s disposable base (the base overlays CURRENT main's
  workflows; `git apply --3way` then aborts fail-closed pre-push). Fix:
  adopted main's bytes verbatim (blob `97a8ebf6`; delta = attribution header
  + one quote style, triggers/steps byte-identical; actionlint rc=0).
  Re-harmonize if main's guard moves again before ship.
- **Stale records corrected (MEDIUM)**: PR `#389` was CLOSED unmerged by
  codeo1io at 2026-10-06T07:54:36Z and origin ref `conductor/ci-6f0d063134`
  deleted — the Outcome-section claims at :174 (ref equality), :197 (OPEN +
  MERGEABLE), and :208 ("close after merge") are historical, superseded by
  this addendum. Cure custody: local `adopt/cfa9f94b-cure` @ `6f0d0d063134`
  (re-probed alive) plus this batch tree.
- **Premise shift recorded (MEDIUM)**: "unfreeze main" is already
  substantially satisfied — fe928ca/c210933 landed the divergent cure with
  the same floor values and a `pnpm-lock.yaml` blob identical to ours
  (`a9dfc490`). This batch's remaining landing value is reconcile-and-land:
  3-way vs c210933 = pnpm-workspace 2 hunks (floor lines byte-identical,
  comment prose only), Dockerfile 3 (ours pins pnpm 11.28.4 in both corepack
  prepares vs main's 11.28.3), ROADMAP 5 rider hunks; pnpm-lock merges
  trivially (identical blobs).
- **Digest re-declared**: comment-only workflow byte changes move the
  `validation:v1:` digest (content hash over executable surfaces); the
  post-harmonization value is re-derived and declared in this attempt's
  phase result.

