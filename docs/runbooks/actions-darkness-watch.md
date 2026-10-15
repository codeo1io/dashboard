# Actions Darkness Watch

Out-of-band watchdog for GitHub Actions run-creation darkness (rm-858;
implementation salvaged intact from run a79dc20458f1's preserved commit
2694f892, landed by run d1fd991d77b8 on 2026-10-16). During the 2026-10-09
outage every workflow in this repository reported `active` through the API
while run *creation* was dead
repo-wide: the newest run of any workflow stayed at 2026-10-09T01:59:31Z for six
plus days, a 14-file adopt merged to `main` with zero CI validation, and twelve
open PRs showed no checks. Nothing that runs *inside* Actions can detect that
state — this runbook covers the probe that runs outside it.

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

**Chosen firing seam:** out-of-band invocation — ad-hoc local runs (as above)
plus the operator/estate-tripwire cadence, whose 0/1/3 ladder this probe
matches. An in-repo scheduled workflow was rejected on principle: it cannot
fire during the very darkness it must detect, so the watchdog would be dead
exactly when needed.

## Verdict semantics

- **GREEN** (exit 0) — every push/schedule-triggered workflow has a run newer
  than its staleness budget.
- **DARK** (exit 3) — at least one push/schedule-triggered workflow has gone
  more than 48 hours without any run while the repository's `pushed_at` is
  newer than that workflow's last run: a run was owed and never created. The
  output lists every dark workflow with its last-run timestamp and age.
- **UNKNOWN** (exit 1) — the API reads failed; treat as no signal, not as
  healthy. Re-run before concluding anything.

The exit ladder (0/1/3 for OK/UNKNOWN/DRIFT-class) matches the external-estate
tripwire so operator tooling can treat both probes uniformly.

## Bounds

- A run of **any** event kind counts as run-creation activity for its workflow:
  darkness means no runs at all, not that one trigger misfired. A stale but
  manually-dispatched run still proves run creation works.
- Candidate set is fixed by the **local** `.github/workflows/*.yaml` trigger
  blocks (parsed, not inferred from history) — a workflow with only
  `workflow_dispatch` is never a candidate, and a dark workflow with no history
  still is.
- The probe reads the 100 most recent runs repo-wide, so a workflow whose
  last run falls outside that window reports `never-ran` — still correctly
  DARK (it is by construction more than two days stale), but the `last_run`
  field understates. Consult the workflow's Actions page for the true date.
- The probe reads public API data and writes nothing to any repository. It
  cannot distinguish an outage from an org-wide run-creation pause; it reports
  the repo-scoped fact and the escalation is human.

## Boundary with the in-repo red-watch

rm-289 owns the failure-conclusion half (scheduled workflows that RAN and
went red — its alert route keys on run conclusions). This script owns the
run-creation half: runs that were owed and never created, upstream of any
conclusion rm-289 could observe. A quiet rm-289 route while schedules are due
is itself a darkness symptom — run this probe. And if both signals disagree,
trust the out-of-band one: repository tests and in-repo crons cannot run while
Actions is dark.

## Recorded proof

- Forced-DARK: `test/actions-darkness-watch.test.ts` pins the semantics
  (stale-plus-owed, never-ran, threshold boundary, trigger filtering) and the
  full exit ladder through `main()` with the GitHub reads stubbed (0 GREEN /
  1 UNKNOWN / 3 DARK).
- Live DARK, 2026-10-14T23:58Z: verdict `DARK`, exit 3, 10/10 candidates dark —
  `Main`/`CodeQL`/`Release`/`Scorecard`/`visual` at 5.9 days stale with
  `pushed_at` 2026-10-14T23:53:06Z newer than every last run; the five
  schedule-only lanes (audit, base-drift, canary, fro-bot, upstream-drift)
  dark with no runs in the window. The outage state this runbook was written
  under.
- Live DARK, 2026-10-15T18:11Z (adoption re-proof, run d1fd991d77b8): exit 3,
  10/10 candidates dark — `Main`/`CodeQL` last run 2026-10-09T01:59:31Z and
  `Release`/`Scorecard`/`visual` 2026-10-09T01:51:54Z (6.7 days stale) with
  `pushed_at` 2026-10-15T18:09:26Z newer than every last run; the five
  schedule-only lanes still never-ran in the 100-run window. Darkness
  unbroken through adoption day.
