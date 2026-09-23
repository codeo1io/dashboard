---
date: 2026-09-23
topic: dashboard maintenance cycle 7 — scoring and batch selection (post-64024a5)
mode: delegated-conductor
run: 998b49532b4449ec9bf30273c6559824
phase: prioritize
attempt: fd109def71a34d519a8733ff4e8b1f1f
skill: ce-plan (scoring/batch selection; no dedicated ce-prioritize in the router — same declared deviation as cycles 3-6). Label disclosure per #4323: engine cycle label is 1; repo lineage has consumed cycles 1-6 (latest: 2026-09-22-cycle-6-batch.md, landed via 0c7489d + merge 64024a5), so this is lineage cycle 7 and the artifact lands as 2026-09-23-cycle-7-batch.md.
---

# Dashboard maintenance — cycle 7 batch (2026-09-23)

## Live frame facts (re-measured this phase, not carried stale)

- `origin/main` = `64024a5` (merge of autonomy-upstream/main; Main/CodeQL/visual all green at that sha, re-listed this phase). The run worktree sits at `7809df6`, 7 commits behind — all cycle-7 implement work targets the origin/main content; the landing phase reconciles the lineage.
- Upstream drift 0: `git rev-list --left-right --count origin/main...autonomy-upstream/main` → 45/0 (research phase). Nothing to absorb; rm-103 idle by design.
- PR #10 (conductor/run-2ae7d10a68d0) is still OPEN but its payload is on main via direct push `0c7489d` (cherry-pick lineage `27b046a` reachable from 64024a5). The open PR is a stale artifact, not pending work.
- Roadmap state: 43 items in origin/main's ROADMAP; this run's roadmap phase extended it to 48 (`rm-143..rm-147`) via a validated patch in the delegate spool (`git apply --check` clean against the 64024a5 blob) — landing is rider B0 below.
- `minimumReleaseAge: 1440` EXISTS at pnpm-workspace.yaml:13 (pnpm surface) but is ABSENT from `.github/dependabot.yml` (3 update blocks: github-actions:18, npm:28, docker:48) — rm-135's dependabot half is the open clause.
- Base-drift job: first scheduled run of the LANDED version is Monday 2026-09-28 04:13 UTC, `runs-on: self-hosted`, one live runner (total_count=1, probed 2026-09-23). The only run ever (35735049832, 2026-09-22T13:40Z) was a pre-landing branch variant (conductor/run-f11b7255b43c, ubuntu-latest) and FAILED — untriaged signal to carry into the 09-28 watch, not acceptance evidence.
- Gateway runtime: fro-bot/agent at v0.114.1 requires `GATEWAY_OPERATOR_TRUSTED_PROXIES` for proxied operator surfaces; `docs/runbooks/gateway-access.md` does not mention the env — an operator behind Caddy hits sign-in rejection today with no documented remedy.

## Five-axis scoring (1–5; Effort 5 = cheapest; Dep-free 5 = no external landing dependency)

| Ref | Impact | Delay | Effort | Dep-free | Strategic | Total | Standing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| rm-144 release-trigger path completeness | 4 | 4 | 4 | 5 | 3 | 20 | SELECTED B1 (anchor) |
| rm-129 runbook obligation (TRUSTED_PROXIES doc) | 3 | 5 | 5 | 5 | 3 | 21 | SELECTED B3 (ops-critical today) |
| rm-147 self-hosted truth sweep + runner decision | 3 | 5 | 4 | 5 | 2 | 19 | SELECTED B2 (time-gated before 09-28 cron) |
| Roadmap patch apply rm-143..147 (bookkeeping) | 2 | 5 | 5 | 5 | 2 | 19 | SELECTED B0 (rider) |
| rm-135 dependabot minimumReleaseAge half | 2 | 4 | 5 | 5 | 2 | 18 | SELECTED B4 (closes open clause) |
| rm-143 push-only SW (+ rm-138 joint decision) | 5 | 3 | 2 | 3 | 5 | 18 | DEFER (decision unmade; web-build+live-SW risk under #3233) |
| rm-129 code half (trusted-proxy limiter) | 3 | 3 | 3 | 5 | 3 | 17 | DEFER (new runtime config surface; pairs with rm-127) |
| rm-116 branch protection | 4 | 4 | 3 | 2 | 4 | 17 | DEFER (API-write stewardship) |
| rm-105 SBOM + provenance | 4 | 2 | 2 | 4 | 4 | 16 | DEFER (Release churn + live-run proof; next security cycle) |
| rm-145 / rm-146 gateway v0.114 surfaces | 3 | 2 | 3 | 2 | 4 | 14 | DEFER (blocked on rm-120 clone refresh) |
| rm-102 dependabot first-PR evidence | 2 | 2 | 5 | 2 | 2 | 13 | DEFER (external clock ~2026-10-03) |
| rm-139 / rm-140 dated decisions | 2 | 2 | 4 | 5 | 2 | 15 | DEFER (re-evaluation windows not reached) |

## Selected batch — cycle 7: "CI/workflow truth + release-trigger completeness"

Theme: one verification profile for every item (actionlint container + `pnpm lint`/`check-types` + targeted vitest + greps), zero web/ surface (no client rebuild → sidesteps the #3233 build-under-load risk), no external dependency, all evidence provable in-cycle.

- **B0 (bookkeeping rider): land the roadmap extension.** Apply the roadmap-phase patch (`delegate/e9e4cf28c9b0446aadef04761ebf68b4-roadmap-update.patch`) to ROADMAP.md on the origin/main content: rm-143..147 added, 5 dated signals, 6 status flips. Verified: git apply --check clean, completed/superseded byte-identical, eslint exit 0. This batch doc lands alongside; the rm-147 acceptance cites it.
- **B1 (anchor): rm-144 release-trigger path completeness.** Add `pnpm-workspace.yaml` + `.github/actions/setup/**` to BOTH `.github/workflows/release.yaml` paths and `scripts/should-release.ts` `isHardReleasePath`; add a corpus-sync test enumerating both sources so they cannot diverge. Acceptance/evidence per the roadmap item: corpus test in `pnpm test` reds on a deliberately omitted fixture; actionlint exit 0.
- **B2: rm-147 self-hosted rationale sweep + base-drift runner-class decision.** Truth or remove the five stale lines (codeql.yaml:42, main.yaml:132, release.yaml:438, AGENTS.md:47, dependabot.yml:1-9 rationale); record the runner-class decision HERE (recommendation: KEEP self-hosted — one live runner, 10-minute weekly cron, negligible load; record it in this batch doc as the decision artifact) — deadline Monday 2026-09-28 04:13 UTC. Evidence: grep sweep zero contradicting self-hosted claims; actionlint green.
- **B3: rm-129 runbook obligation.** `docs/runbooks/gateway-access.md` gains the `GATEWAY_OPERATOR_TRUSTED_PROXIES` requirement (fro-bot/agent v0.114.1): what it does, the Caddy-topology failure mode it prevents (sign-in rejection with no documented remedy today), and the allowlist form. Evidence: grep shows the env documented; solution-doc cross-ref to gateway-operator-oauth-rate-limit-shared-key-behind-caddy-2026-09-21.md.
- **B4: rm-135 open clause.** Add `minimumReleaseAge: 1440` to all three dependabot.yml update blocks (github-actions/npm/docker), matching the pnpm-workspace.yaml:13 value with its :15 exclusion list already in place. Evidence: dependabot config validated (actionlint does not cover it — grep the key in all three blocks; the first dependabot run after landing observes the delay).

Order: B0 → B4 → B3 → B2 → B1 (cheapest bookkeeping first, anchor last so the corpus test lands against the final path set; any single-item failure still leaves a coherent landed prefix).

## Deferred — reasons recorded (do not re-litigate next cycle without new facts)

- **rm-143 + rm-138 (push delivery)**: highest strategic value (5) but the joint SW decision (push-only restore vs strip precache wiring) is a plan-phase architecture call, and verification needs `pnpm build:web` + live-SW vitest — exactly the profile #3233 says risks spawn-abort under load. Next cycle leads with the rm-143/rm-138 decision note at plan time.
- **rm-129 code half**: new runtime config surface (trusted-proxy allowlist + XFF honoring) deserves its own red/green test set; the runbook half (B3) removes today's operational pain without the config surface.
- **rm-145/rm-146**: hard-blocked on the rm-120 clone refresh (v0.78.0 → v0.114.x) — a large mechanical diff that should ride its own cycle.
- **rm-105 / rm-116 / rm-102 / rm-139 / rm-140**: unchanged defers from cycles 3-6 (Release churn + live-run proof; API-write stewardship; external clocks).

## Follow-through watch list (not batch work)

1. 2026-09-28 04:13 UTC — base-drift first scheduled run on the self-hosted label; if red, triage against the pre-landing variant's 2026-09-22 failure (rm-123 acceptance clause).
2. ~2026-10-03 — first grouped dependabot PR window; rm-102's evidence clause.
3. 2026-10-21 — majors re-evaluation comment window (rm-108/rm-137 residue: eslint-plugin-erasable-syntax-only 0.4.2, @types/node 24.13.3).

## Cycle-7 landing decisions (implement phase, 2026-09-23)

- **rm-147 runner-class decision: KEEP `base-drift.yaml` on `self-hosted`.** The one
  live self-hosted listener (runners `total_count: 1`, probed 2026-09-23) is exactly
  the runner the workflow was authored for; the weekly 10-minute cron is negligible
  load and does not contend with the ubuntu-latest CI pool. Flipping to
  `ubuntu-latest` is equally viable (uniformity) and stays a standing candidate — it
  becomes REQUIRED the moment that runner is decommissioned, because a cron on a
  label with no listener queues forever. Decided before the landed version's first
  scheduled run (2026-09-28 04:13 UTC), per the acceptance clause.
- **Edit bases:** `dependabot.yml` and `ROADMAP.md` were drifted in this worktree
  (7 commits behind origin/main) and were rebased to `origin/main` (`64024a5`)
  content before editing, so the landing merge is trivial; all other touched files
  were byte-identical to `origin/main` at edit time.
- **rm-135 dependabot key form:** the dependabot-native kebab-case
  `minimum-release-age: 1440` — **superseded by the review round:** that key
  does not exist in the dependabot schema; the implemented form is
  `cooldown:\n    default-days: 1` per update block (schemastore + live options
  reference, 2026-09-23). One day == pnpm's 1440 minutes. GitHub does not
  apply cooldown to security updates.

## Cycle-7 outcome (compound, pre-review evidence)

Implemented end-to-end in the assigned stewardship worktree (base 7809df6,
drifted edit bases rebased to origin/main 64024a5) and left uncommitted for
the commit gate. Validation (all at the identical tree, fingerprint
`bb061f076e8c957c` for the code-bearing phases):

| Gate | Result |
| --- | --- |
| targeted vitest `test/should-release.test.ts` | 65/65, EXIT 0 (incl. 6 new rm-144 tests) |
| full suite `pnpm test` (canonical form) | 3119/3119 — server 31 files/2041, web 28 files/1078 — SUITE-EXIT:0; pretest `build:web` clean under load avg 58 |
| actionlint 1.7.12 (container, bare form) | EXIT 0 |
| eslint (11 touched files) | EXIT 0 |
| check-types + explicit server `tsc --noEmit` | 0 errors / EXIT:0 |
| dependabot.yml parse | all 3 update blocks carry `minimum-release-age: 1440` |

Work-order literal `npm test -- --runInBand` was substituted with `pnpm test`
in the test phases — the literal command is this project's documented
harness-crash signature (jest-style flag appended to web vitest → EPIPE /
pretest rayon-core abort; never a repo defect).

B0–B4 status at compound time: implemented in-tree, pending commit/push/CI
(roadmap statuses flipped accordingly). B2's runner-class decision (keep
`base-drift.yaml` self-hosted) is recorded above; its 2026-09-28 first-cron
proof is the one clause that stays open into cycle 8. Next-cycle candidates
in order: rm-143 (push-capable SW — restores the rm-106 delivery substrate,
needs the joint rm-138 decision), rm-145/rm-146 (gateway v0.114/v0.112
capability surfacing, blocked on rm-120 clone refresh), rm-105/rm-116
(security/stewardship), and PR #10 remains open with its payload already on
main (close-or-supersede decision owed).

New durable artifacts this cycle:
`docs/solutions/workflow-issues/release-trigger-paths-guard-corpus-drift-2026-09-23.md`
(corpus-sync prevention rule for co-deciding trigger filters) and
`docs/solutions/workflow-issues/runner-migration-comment-rot-sweep-2026-09-23.md`
(comment-rot sweep rule for topology migrations).

## Review round (independent_review 3029bad8 → fix 4bc1b615, 2026-09-23)

Verdict NEEDS-FIXES: 1 blocker, 3 important, 1 minor — all fixed in-tree the
same day, re-validated at targeted scope (work order: required_scope=targeted,
changed surfaces are release.yaml + should-release.ts + test + dependabot.yml
+ comment-truthing files):

1. **Blocker — invalid dependabot key.** First-cut `minimum-release-age: 1440`
   is not in the dependabot schema (schemastore `dependabot-2.0.json`:
   `additionalProperties:false`, no such property; live options reference
   documents `cooldown.default-days`, 1–90). Fixed to
   `cooldown:\n  default-days: 1` on all three update blocks; header comment
   updated (1 day == pnpm's 1440 minutes; cooldown does not apply to security
   updates). yaml-parse verified: 3 blocks × cooldown/default-days 1.
2. **Important — false composite-action rationale.** `release.yaml` never invokes
   `.github/actions/setup` (grep across `.github/`: main/codeql/fro-bot only,
   release zero uses), so the rm-144 first-cut entry was trigger churn for a
   byte-identical image. Dropped from BOTH the workflow paths filter and the
   guard; its two behavioral tests removed; rationale comments and docs
   corrected. One residue caught in the R5 re-dispatch and fixed then: the
   header docstring in `scripts/should-release.ts:18-22` still narrated the
   pre-review "Also hard: setup/**" story — rewritten to cite the
   `release-paths.ts` corpus; `release-paths.ts`'s "guard-skipped" wording
   for pnpm-lock.yaml also tightened (the guard fails open on lockfile-only,
   step 3 — it is not skipped).
3. **Important — addition-blind corpus lock.** The static 6-entry array could
   not detect one-sided ADDITIONS. Fixed by promoting the corpus to a
   single-source module `scripts/release-paths.ts`
   (`HARD_RELEASE_FILE_PATHS` / `HARD_RELEASE_DIR_PREFIXES` /
   `HARD_RELEASE_ROOT_TSCONFIG_GLOB` / `WORKFLOW_TRIGGER_ONLY_PATHS`) consumed
   by `isHardReleasePath` (importing the guard itself is unsafe — top-level
   CLI code), with the parity test yaml-parsing `on.push.paths` and asserting
   BOTH directions; the workflow-only allowlist is itself the lock against
   unreviewed filter additions (pnpm-lock.yaml's guard-skip is a named,
   commented known gap — next-cycle candidate).
4. **Important — sweep path-scope hid 4 sites.** vitest.config.ts:10,
   web/vitest.config.ts:13, test/dockerfile-context.test.ts:12,
   test/fork-exclusion-guard.test.ts:52 — all truthed; the detection command
   in the comment-rot solutions doc now repo-wide (the standing
   no-path-scope/no-extension rule, re-learned).
5. **Minor — wording nits** in ROADMAP/batch/solutions docs: corrected counts
   (63 tests at the final tree), six files not five, real symbol names.

Re-validation at the fix tree: vitest `test/should-release.test.ts` **63/63
EXIT 0** (65 pre-review − 2 removed setup tests − 1 merged parity assertion +1
split parity assertion), actionlint 1.7.12 bare-form **EXIT 0**, eslint across
all 13 touched files **EXIT 0** (6 style errors auto-fixed, suite re-run
green), server `tsc --noEmit` **EXIT:0** (twice — after fixes and after
auto-fix), dependabot yaml-parse 3×cooldown. Full-suite deltas are nil outside
`should-release.test.ts` (−2 tests); the suite count moves 3119 → 3117 at the
final tree, to be re-proven by the full_tests fold gate.
