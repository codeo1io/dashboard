# Actions Darkness Watch

Out-of-band watchdog for GitHub Actions run-creation darkness (rm-1411, first
landed 2026-10-15; reworked to per-lane cadence truth 2026-10-17 — see the
header of `scripts/actions-darkness-watch.ts`). During the 2026-10-09 outage
every workflow in this repository reported `active` through the API while run
*creation* was dead repo-wide: the newest run of any workflow stayed at
2026-10-09T01:59:31Z for six plus days, a 14-file adopt merged to `main` with
zero CI validation, and twelve open PRs showed no checks. Nothing that runs
*inside* Actions can detect that state — this runbook covers the probe that
runs outside it.

## Trigger

Run locally whenever Actions silence is suspected — after landing without
checks appearing, before trusting a merge, or on the operator cadence the
estate tripwire already follows:

```bash
node scripts/actions-darkness-watch.ts
```

Optional environment: `ACTIONS_DARKNESS_REPO` (default `codeo1io/dashboard`),
`ACTIONS_DARKNESS_TOKEN` or `GITHUB_TOKEN` (avoids unauthenticated rate limits),
`ACTIONS_DARKNESS_NOW` (ISO timestamp; test seam only).

## Verdict semantics

Every lane's darkness threshold is **cadence-derived**, not one global
constant. A lane whose `schedule:` crons are known goes dark once it has no
run newer than `max(48h, longest cron gap + 12h grace)` — the weekly-Monday
lanes in this repo get a 7.5-day budget, so a healthy repo no longer reads
false-DARK mid-week — and a cron-known lane past that budget is dark **by
cadence alone**, no push needed. A lane with no known cron keeps the
conservative rule: dark only when both more than 48h stale AND a run was owed.

- **GREEN** (exit 0) — no push/schedule-triggered lane is beyond its lane
  threshold, and no candidate lane's last run predates the `main` head commit
  (a run was owed and never created).
- **DARK** (exit 3) — at least one lane is beyond its threshold or owes a run.
  The output lists every dark lane with its last-run timestamp, age, and — for
  cron-derived darks — the threshold actually applied in days.
- **UNKNOWN** (exit 4) — a lane's run timestamps, the `now` override, or the
  main-head commit date is present but unparseable: fail closed, never a
  silent GREEN. Treat as no signal, not as healthy; re-run before concluding
  anything.
- **UNKNOWN** (exit 1) — an API read failed outright. Same treatment.

The exit ladder extends the external-estate tripwire OK/UNKNOWN/DRIFT ladder
(0/1/3) with a fourth rung (4, unparseable-evidence) so operator tooling can
treat both probes uniformly while still telling "the API is down" (1) apart
from "the probe's own inputs are broken" (4).

## Bounds

- Latest-run reads are **per workflow**
  (`.../actions/workflows/<id>/runs?per_page=1`, 15s timeout), so no lane can
  push another lane's true last run out of a shared fetch window. The
  pre-rework repo-wide 100-run read reported five weekly lanes as `never` on
  2026-10-16 because their real last runs fell outside a window that was hours
  deep at 2219 total runs; per-lane reads removed that failure class.
- The **owed** proxy is the `main` head commit date (committer date, author
  date fallback) — not repo-wide `pushed_at`, which this fork's daily
  conductor branch pushes refresh without owing any `main` run. The owed check
  applies to every candidate lane: right after a landing, a lane whose last
  run predates the new head reads owed until it fires (or a push-triggered
  lane runs) — conservative by design, since a landing that produced no runs
  anywhere is exactly the darkness shape this probe exists to catch. If the
  main-head read yields no date at all, owed degrades to epoch zero (nothing
  owed); a *malformed* date instead fails closed to UNKNOWN exit 4.
- Candidate set is fixed by the **local** `.github/workflows/*.yaml` trigger
  blocks (parsed, not inferred from history) — a workflow with only
  `workflow_dispatch` is never a candidate, and a candidate with no history at
  all reports `never` and is dark as soon as anything was ever pushed to
  `main`.
- Cron threshold derivation covers the widely used subset — minute/hour as
  `*`, `n`, `*/n`, lists, or ranges; `dom`/`month`/`dow` restricted to `*`
  over a daily-repeating grid. Anything else falls back to a conservative
  at-least-weekly gap before the 12h grace.
- A run of **any** event kind counts as run-creation activity for its
  workflow: darkness means no runs at all, not that one trigger misfired. A
  stale but manually-dispatched run still proves run creation works.
- The probe reads public API data and writes nothing to any repository. It
  cannot distinguish an outage from an org-wide run-creation pause; it reports
  the repo-scoped fact and the escalation is human.

## Boundary with the in-repo red-watch

rm-289 owns the in-repo half (workflow-file drift caught by repository tests).
This script owns the out-of-band half. If both go red together, trust the
out-of-band signal: repository tests cannot run while Actions is dark.

## Recorded proof

- `test/actions-darkness-watch.test.ts` pins the semantics: cadence-threshold
  derivation and floors, cron-gap union math, cadence-alone vs
  stale-AND-owed darks, never-ran, the strictly-greater threshold boundary,
  trigger filtering, and the fail-closed UNKNOWN paths for unparseable run
  timestamps, an unparseable `ACTIONS_DARKNESS_NOW` override, and an
  unparseable `pushed_at` (22 cases).
- Live DARK, 2026-10-14T23:58Z (pre-rework probe, outage state this runbook
  was written under): verdict `DARK`, exit 3, 10/10 candidates dark, `Main`/
  `CodeQL`/`Release`/`Scorecard`/`visual` at 5.9 days stale with repo
  `pushed_at` newer than every last run; the five schedule-only lanes dark
  with no runs in the window.
- Live DARK, 2026-10-17T12:35Z (post-rework + review-fix probe): verdict
  `DARK`, exit 3, 11/11 candidates with honest per-lane facts — weekly lanes
  read against their 7.5-day cron-derived thresholds with real last-run
  timestamps (audit 12.1d, canary 12d, upstream-drift 12d, base-drift 9.4d),
  `release-channel` truthfully never-ran, zero false `never` lanes. The
  false-DARK failure class is gone; the darkness itself was real.
