# Actions Darkness Watch

Out-of-band watchdog for GitHub Actions run-creation darkness (rm-1411, landed
run a79dc20458f1, 2026-10-15). During the 2026-10-09 outage every workflow in
this repository reported `active` through the API while run *creation* was dead
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

## Verdict semantics

- **GREEN** (exit 0) — no push/schedule-triggered workflow is both stale and
  owed: a workflow more than 48 hours without a run still reads GREEN when
  nothing newer has been pushed (`pushed_at` is not newer than its last
  run) — staleness alone never trips the probe.
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

rm-289 owns the in-repo half (workflow-file drift caught by repository tests).
This script owns the out-of-band half. If both go red together, trust the
out-of-band signal: repository tests cannot run while Actions is dark.

## Recorded proof

- Forced-DARK: `test/actions-darkness-watch.test.ts` pins the semantics
  (stale-plus-owed, never-ran, threshold boundary, trigger filtering).
- Live DARK, 2026-10-14T23:58Z: verdict `DARK`, exit 3, 10/10 candidates dark —
  `Main`/`CodeQL`/`Release`/`Scorecard`/`visual` at 5.9 days stale with
  `pushed_at` 2026-10-14T23:53:06Z newer than every last run; the five
  schedule-only lanes (audit, base-drift, canary, fro-bot, upstream-drift)
  dark with no runs in the window. The outage state this runbook was written
  under.
- Live DARK, 2026-10-18T04:08Z (exit 3, 6/12 candidates dark): the six
  schedule-only lanes audit/base-drift/canary/cve-tripwire/release-channel/
  upstream-drift all reported `never-ran`, live-demonstrating the pagination
  bound below — audit's true last run is 2026-10-05T10:48:22Z (first-hand
  `gh run list --workflow=audit.yaml`, conclusion `failure`), correctly DARK
  as stale-plus-owed but printed `never` because that run falls outside the
  100-run window; cve-tripwire has genuinely never run.
