# Security Posture

The README badge shows this fork's own OpenSSF Scorecard (weekly analysis via
the Scorecard workflow). As of the 2026-10-07 analysis the score is **7.8** — high
for a repo this young, but several sub-scores read low, and most of those are
**deliberate design decisions**, not oversights. This runbook names every
sub-score below 8 with its disposition so a reader never has to guess whether
a low mark is a gap to fix or a deviation we accepted.

Dispositions are one of: **tracked** (a ROADMAP item owns the fix),
**time-gated** (self-resolves on a known date), or **declined** (accepted
by design, with the reason).

| Check | Score | Disposition | Owner |
| --- | --- | --- | --- |
| Branch-Protection | -1 | tracked | `rm-116` (required checks on main, sequenced before `rm-146` auto-merge) |
| Code-Review | 0 | declined | single-operator autonomous loop — see below |
| CII-Best-Practices | 0 | declined | badge-program overhead disproportionate for internal tooling |
| Fuzzing | 0 | tracked | `rm-144` (fast-check property suites over OSS-Fuzz) |
| License | 0 | tracked | `rm-147`, blocked-external — upstream is also unlicensed |
| Maintained | 0 | time-gated | self-resolves ~2026-11-08 (90-day activity heuristic, measured from repo created_at 2026-08-10) |
| Signed-Releases | -1 | declined | deploys are signed container images (provenance + SBOM attestations on GHCR); GitHub Releases are App-gated and unprovisioned — see below |

## Why the declined items are declined

- **Code-Review 0.** The repository is maintained by a single-operator
  autonomous loop: changes go through per-phase adversarial review lenses
  (in-process, recorded in `.conductor/progress/*.ndjson` breadcrumbs) rather
  than GitHub PR approvals. Requiring human PR review would break the only
  maintenance process this fork actually has. The honest mitigation is
  branch protection with required automated checks — tracked as `rm-116`, not
  this check.
- **CII-Best-Practices 0.** The CII/BadgeApp program is heavyweight
  self-certification aimed at widely-consumed open source. This is an
  internal monitoring dashboard; the equivalent rigor here is the fork's own
  gate suite (lint, types, full tests, actionlint, CodeQL, Scorecard itself).
- **Signed-Releases -1.** Deploys are container images published to GHCR by
  the Release workflow with registry-embedded build-provenance and SBOM
  attestations (`.github/workflows/release.yaml` build-push step; verification
  recipe and published-state checks in `docs/runbooks/release.md`) — the
  artifacts the deployment model consumes are already integrity-evidenced by
  digest-pinned, attested images. The workflow's App-gated GitHub-Release
  steps (tag + release, `.github/workflows/release.yaml`) remain
  unprovisioned; creating and signing GitHub Releases just to satisfy this
  check would add a release App token and signing keys — new attack surface —
  without adding integrity to anything the deployment actually consumes.
  Score consequence if that ever changes: provisioning the two
  `APPLICATION_*` secrets activates the dormant tag/release steps, and this
  row stops being declined-by-design the same day — GitHub Releases would
  then exist unsigned, so Signed-Releases −1 becomes a fail-and-fixable
  finding (sign the release artifacts or deprovision the App).

## Tracked items

- **Branch-Protection** (`rm-116`): main is currently unprotected, which the
  roadmap records as the root cause of three red landings. Fixing it is a
  prerequisite for dependabot auto-merge (`rm-146`) — automerging without
  required checks would automate exactly that failure mode.
- **Fuzzing** (`rm-144`): the network-shaped surfaces (both SSE parsers and
  listener ingest) get in-stack property-based tests instead of OSS-Fuzz,
  which is disproportionate for a monitoring dashboard.
- **License** (`rm-147`): `gh api repos/codeo1io/dashboard` reports
  `license: null` and upstream `fro-bot/dashboard` has none either (404), so
  a unilateral fork-side LICENSE would be legally hollow. When upstream
  chooses one, the fork mirrors it in the same absorb cycle.

## Scheduled guard watch

`rm-289` (2026-10-09): the scheduled guard layer — `audit.yaml`,
`base-drift.yaml`, `upstream-drift.yaml`, `canary.yaml`, `scorecard.yaml`,
`cve-tripwire.yaml` (Mondays) and `codeql.yaml` (Wednesdays) — runs on cron with
no human reading the Actions tab, and its reds historically sat invisible for
days (canary red 3+ days from 2026-09-28; three reds over 24h on 2026-10-07).
The **Scheduled guard watch** workflow (`.github/workflows/scheduled-watch.yaml`,
Mondays and Wednesdays 08:37 UTC, after the layer settles) queries each guard's
latest watched conclusion via `scripts/scheduled-workflow-watch.ts` — a
zero-dependency, `GITHUB_TOKEN`-only script — and routes the red set through a
three-surface ladder:

1. **The tracked issue.** One living issue labeled `scheduled-watch` carrying
   the red table: opened on red, updated when the red set changes
   (deduplicated by a `signature:` fingerprint in the body), closed
   automatically on all-green. Active only when the repository's Issues
   feature is enabled — it is disabled on this fork today (`has_issues=false`,
   probed 2026-10-09), so this half is dormant-but-guarded: the script probes
   and degrades with a loud log line instead of dying on the 410.
2. **The watch run's own conclusion.** The job exits 1 whenever any guard is
   red, so the watch itself is a red Actions run and GitHub's
   scheduled-workflow-failure email reaches the workflow-creating account.
   This is the authoritative alert while issues stay disabled.
3. **The job summary.** The full red/green table is appended to
   `GITHUB_STEP_SUMMARY` on every fire.

Semantics are deliberately strict: green ONLY on conclusion `success`
(`cancelled`, `timed_out`, `startup_failure`, `skipped`, and a guard with no
completed run at all all count red — a guard nothing has ever verified is
exactly the invisibility this watch removes); any API error exits 1 loudly
rather than reporting a false green; `fro-bot.yaml` is deliberately excluded
(disabled_manually with a documented missing-secret reason, AGENTS.md).

Dry-run harness (the negative case is provable offline, no manufactured red):
`echo '<fixture>' | node scripts/scheduled-workflow-watch.ts --dry-run -` — the
fixture carries `hasIssues`, `openIssue`, and a `runs` map keyed by workflow
file; the script prints the exact issue/comment it WOULD post and exits with
the live code. Pinned by `test/scheduled-workflow-watch.test.ts` (16 tests:
decision core, workflow statics including a completeness guard that forces new
cron-triggered workflows to join the watch list, and the end-to-end dry-run).

First live fire: Monday 2026-10-12 08:37 UTC. Expected first verdict given the
2026-10-09 state: red — audit, canary and upstream-drift have red latest
scheduled runs, and cve-tripwire has no completed run yet. That red watch run
plus the failure email is the alert firing as designed.

## Maintained (time-gated)

Scorecard's Maintained check wants commit activity across a ~90-day window;
the fork was created 2026-08-10, so the check cannot pass yet. Expected to
self-resolve around 2026-11-08. No action.

## Maintenance of this document

Re-verify this table whenever the weekly Scorecard run refreshes (badge data
updates Thursdays). When a tracked item lands or a time-gated date passes,
update the row here in the same cycle — a posture doc that states a
disposition a landed fix contradicts is worse than no posture doc.
