# Security Posture

The README badge shows this fork's own OpenSSF Scorecard (weekly analysis via
the Scorecard workflow). As of the 2026-10-03 run the score is **7.8** — high
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
| Fuzzing | 10 | tracked | `rm-144` server half landed — see below; browser half stays open |
| License | 0 | tracked | `rm-147`, blocked-external — upstream is also unlicensed |
| Maintained | 0 | time-gated | self-resolves ~2026-11-08 (90-day activity heuristic, measured from repo created_at 2026-08-10) |
| Signed-Releases | -1 | declined | image-based deploys, no GitHub Releases by design |
| Disclosure channel | — | tracked | `rm-620` — `SECURITY.md` + GitHub private vulnerability reporting |

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

- **Branch-Protection** (`rm-116`): main is currently unprotected, which the
  roadmap records as the root cause of three red landings. Fixing it is a
  prerequisite for dependabot auto-merge (`rm-146`) — automerging without
  required checks would automate exactly that failure mode. Note: the
  2026-10-03 Scorecard run reports this check as a check-level internal
  error (its token cannot read classic branch-protection rules), so the -1
  reflects an error state, not a measured posture; the fix is unchanged.
- **Fuzzing** (`rm-144`): the 2026-10-03 run scores this **10** with reason
  "project is fuzzed" — the check now credits the in-repo `fast-check`
  property suites (the landed server half of `rm-144`: the SSE parsers and
  listener ingest are covered in-stack). The item stays open for its
  browser-half coverage; no disposition change.
- **License** (`rm-147`): `gh api repos/codeo1io/dashboard` reports
  `license: null` and upstream `fro-bot/dashboard` has none either (404), so
  a unilateral fork-side LICENSE would be legally hollow. When upstream
  chooses one, the fork mirrors it in the same absorb cycle.
- **Disclosure channel** (`rm-620`): a security reporter's path into this
  repo — root `SECURITY.md` (scope, private reporting, out-of-scope lines)
  plus GitHub private vulnerability reporting enabled on the repository.
  Not a Scorecard check; tracked here so the posture doc answers "who do I
  tell" in the same place it answers "what is accepted".

## Maintained (time-gated)

Scorecard's Maintained check wants commit activity across a ~90-day window;
the fork was created 2026-08-10, so the check cannot pass yet. Expected to
self-resolve around 2026-11-08. No action.

## Maintenance of this document

Re-verify this table whenever the weekly Scorecard run refreshes (badge data
updates Thursdays). When a tracked item lands or a time-gated date passes,
update the row here in the same cycle — a posture doc that states a
disposition a landed fix contradicts is worse than no posture doc.

Last refreshed 2026-10-04 (`rm-621`, against the 2026-10-03T16:17:25Z
Scorecard data): headline 7.1 → **7.8**, Fuzzing 0 → **10** (cause: the
check credits the in-repo fast-check suites — see the Fuzzing bullet);
SAST and CI-Tests both read 10; sub-10 set is exactly Branch-Protection,
Code-Review, CII-Best-Practices, License, Maintained (time-gated), and
Signed-Releases. Added the disclosure-channel row (`rm-620`).
