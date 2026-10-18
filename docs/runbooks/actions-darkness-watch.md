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

## Monitor-fleet heartbeat (dead-man alert over the listener ingest channel)

`scripts/monitor-fleet-heartbeat.ts` judges each weekly monitor workflow
(audit 03:37, base-drift 04:13, upstream-drift 05:17, canary 05:23,
cve-tripwire 06:53, release-channel 07:23 — all Monday UTC) against its
scheduled windows. A monitor missing two consecutive windows is a **dead
man** and the script posts a signed `monitor-heartbeat` critical event
through the dashboard's listener ingest channel (`POST /api/listener/ingest`),
which surfaces as an operator notification alongside gateway events.

Conductor-side by design: the maintenance harness invokes the script, which
*observes* Actions runs via the GitHub API — it never depends on GitHub
Actions creating runs, so the scheduled-run outage this fleet is currently in
cannot blind it.

Invocation:

```sh
MONITOR_HEARTBEAT_TOKEN=$GITHUB_TOKEN \
MONITOR_HEARTBEAT_NOW=2026-10-18T12:00:00Z \   # optional time seam
LISTENER_INGEST_URL=https://dashboard.example \ # dead-man alert target
LISTENER_INGEST_KEY=$DASHBOARD_LISTENER_INGEST_KEY \
node --experimental-strip-types scripts/monitor-fleet-heartbeat.ts --json
```

Exit codes: `0` no dead man · `1` unknown (token missing, API/parse failure,
alert delivery failure) · `3` at least one monitor missed two consecutive
windows (alert delivered if URL+key were set). Without URL/key a dead verdict
still exits 3 and reports the un-delivered alert on stderr.

Boundary with the run-creation watch above: the watch asks "did run creation
stop repo-wide?" (48h any-event budget); the heartbeat asks "did each weekly
monitor miss its scheduled window?" — the live 2026-10 darkness has both
answers red, and the two scripts stay separate deliberately.
