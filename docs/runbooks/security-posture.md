# Security Posture

The README badge shows this fork's own OpenSSF Scorecard (analysis on every
push to main plus a weekly Monday 06:27Z cron — see `scorecard.yaml`). As of
the 2026-10-18 analysis (02:50:32Z, live API read) the score is **7.7** — up
from 7.1 at the 2026-09-22 snapshot and from the 7.4 outage-era reading of
2026-10-09 — high for a repo this young, but several sub-scores read low, and
most of those are **deliberate design decisions**, not oversights. This
runbook names every sub-score below 8 with its disposition so a reader never
has to guess whether a low mark is a gap to fix or a deviation we accepted.

Dispositions are one of: **tracked** (a ROADMAP item owns the fix),
**time-gated** (self-resolves on a known date), or **declined** (accepted
by design, with the reason).

| Check | Score | Disposition | Owner |
| --- | --- | --- | --- |
| Branch-Protection | -1 | tracked | `rm-116` (required checks on main, sequenced before `rm-146` auto-merge) |
| CI-Tests | -1 | tracked | `rm-116` — 2026-10-18 reason string is "no pull request found"; the conductor landing flow's merges surface no PR check runs for the heuristic, and required checks on main is the lane that makes CI evidence visible (it read "2 out of 5 merged PRs checked" at 2026-10-09 — ROADMAP rm-143 rider) |
| Code-Review | 0 | declined | single-operator autonomous loop — see below |
| CII-Best-Practices | 0 | declined | badge-program overhead disproportionate for internal tooling |
| License | 0 | tracked | `rm-147`, blocked-external — upstream is also unlicensed |
| Maintained | 0 | time-gated | self-resolves ~2026-11-08 (90-day activity heuristic, measured from repo created_at 2026-08-10) |
| Signed-Releases | -1 | declined | image-based deploys, no GitHub Releases by design |

## Landed / resolved since the 2026-09-22 snapshot

- **Fuzzing 0 → 10** ("project is fuzzed", 2026-10-18 analysis): the sub-score
  no longer reads low, so its tracked row left the table. Two honesty notes:
  the reading is not explained by any in-repo fuzz lane (grep over
  `.github/`: no OSS-Fuzz / ClusterFuzzLite / cifuzz references), and
  `rm-144`'s fast-check property-suite acceptance is still `in_progress` in
  ROADMAP.md — treat the 10 as favorable detector drift and re-verify on the
  next refresh.

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
- **Signed-Releases -1.** There are no GitHub Releases to sign: deploys are
  container images published to GHCR by the Release workflow (with build
  provenance attestations). Signing GitHub Releases would first require
  creating artifacts the deployment model deliberately does not use.

## Tracked items

- **Branch-Protection** (`rm-116`): live probe 2026-10-18 — the protection
  object exists but is an empty shell (`required_status_checks.checks` empty,
  `enforce_admins` false), which the roadmap records as the root cause of
  three red landings. Scorecard's own -1 here is partly a measurement
  artifact (the 2026-10-18 reason string is an internal error: its token
  "can't read classic branch protection rules"), so the shell is worse than
  the badge shows. Filling it is a prerequisite for dependabot auto-merge
  (`rm-146`) — automerging without required checks would automate exactly
  that failure mode.
- **Fuzzing** (`rm-144`): resolved at the score level — see *Landed /
  resolved since the 2026-09-22 snapshot* above; the sub-8 row left the
  table, while rm-144's fast-check property-suite acceptance remains
  `in_progress` in ROADMAP.md (the network-shaped surfaces — both SSE parsers
  and listener ingest — get in-stack property-based tests instead of OSS-Fuzz,
  which is disproportionate for a monitoring dashboard).
- **License** (`rm-147`): `gh api repos/codeo1io/dashboard` reports
  `license: null` and upstream `fro-bot/dashboard` has none either (404), so
  a unilateral fork-side LICENSE would be legally hollow. When upstream
  chooses one, the fork mirrors it in the same absorb cycle.

## Maintained (time-gated)

Scorecard's Maintained check wants commit activity across a ~90-day window;
the fork was created 2026-08-10, so the check cannot pass yet. Expected to
self-resolve around 2026-11-08. No action.

## Maintenance of this document

Re-verify this table whenever the Scorecard analysis refreshes — which is on
every push to main plus the weekly Monday 06:27Z cron (`scorecard.yaml`
triggers; the 2026-10-18 API read carried a same-timestamp analysis), not a
Thursday cadence. When a tracked item lands or a time-gated date passes,
update the row here in the same cycle — a posture doc that states a
disposition a landed fix contradicts is worse than no posture doc. This
snapshot was re-truthed 2026-10-18 (score 7.7; CI-Tests added; Fuzzing
resolved) after the 2026-10-09 rm-143 rider flagged the drift. Probe table:
`docs/solutions/workflow-issues/runbook-truth-sweep-fro-bot-armed-gate-2026-10-18.md`.
