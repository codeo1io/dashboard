# Guard Watchdog

The repository's scheduled guard workflows — `audit`, `base-drift`,
`upstream-drift`, `canary`, `scorecard` (Mondays) and CodeQL's `analyze`
(Wednesdays) — are tripwires that fire when nobody is watching CI. Before the
watchdog existed, a red conclusion on one of them was visible only to someone
who already went looking: the 2026-09-28 canary failure (a dispatch run that
died on a missing install, later re-run red) sat unobserved for days while
everything on PRs stayed green. The watchdog (rm-289, workflow
`.github/workflows/watchdog.yaml`, script `scripts/guard-watchdog.ts`) closes
that gap: it fires daily, queries each guard's latest **completed** run via
the Actions API, and turns any red conclusion into an `::error::` annotation
plus a red run.

## What it watches, and what it deliberately does not

The guard set is pinned by `test/guard-watchdog.test.ts` — every workflow
file carrying a `schedule:` trigger must be either watched or explicitly
excluded, so a new scheduled workflow can never silently miss coverage.

| Workflow | Watched? | Why |
| --- | --- | --- |
| `audit.yaml`, `base-drift.yaml`, `upstream-drift.yaml`, `canary.yaml`, `scorecard.yaml`, `codeql.yaml` | yes | the weekly guard cluster + weekly CodeQL analyze |
| `fro-bot.yaml` | no | `disabled_manually` on this fork with no `FRO_BOT_PAT` secret — it never runs, so watching it would be a permanent false red |
| `watchdog.yaml` | no | a red watchdog run IS the alert; self-watching would echo red on every later run forever, even after the condition cleared |

## Alert semantics

- **Red conclusions:** `failure`, `cancelled`, `startup_failure`, `timed_out`
  (a guard that died to its own `timeout-minutes` is a failed guard).
- **The verdict run** is the most recent run with a real conclusion. If the
  newest run is still `in_progress`/`queued` (e.g. CodeQL is mid-run when the
  daily watch fires), the watchdog falls through to the newest *completed*
  run — a null conclusion is never read as green.
- **Absence is not an alert:** a guard with no runs yet, or with all recent
  runs still in flight, reports `no-runs` / `no-completed-run` in the table
  and does not page. Turning absence into red would train the operator to
  ignore the channel.
- **Unreadable is loud:** if the Actions API call for a guard fails (renamed
  file, permission loss, network), the watchdog emits `::error::` and exits 1
  in live mode — the base-drift "fail loud on the tool, never read a broken
  readback as green" convention.

## Channel precedence

1. **Red run + `::error::` annotations** — the authoritative signal. The
   step summary carries a per-guard verdict table with links to the exact
   red runs.
2. **Deduplicated tracking issue** — best-effort secondary channel, opened by
   the workflow only when a live `has_issues` probe returns `true`. Issues
   are disabled on this fork (probed 2026-10-04), so in practice this path
   warns and skips; it exists so the watchdog needs no changes the day
   issues are turned on. The probe-then-act shape is inherited from
   base-drift's rm-123 lesson.

## Operating it

- **Daily schedule:** `47 8 * * *` UTC — after the Monday guard cluster
  (03:37–06:27Z) and CodeQL's Wednesday 07:31Z run, so same-day verdicts are
  in. The first scheduled fire after landing may legitimately be red if a
  guard's latest completed run is still red — that is the alert working.
- **Dispatch defaults to dry-run:** `workflow_dispatch` sets `dry_run: true`
  (report + exit 0), so the first thing an operator tries can never page.
  Clear the checkbox for a live dispatch.
- **Local dry-run** (same code the workflow runs):

  ```bash
  GITHUB_TOKEN="$(gh auth token)" GUARD_WATCHDOG_DRY_RUN=1 \
    node scripts/guard-watchdog.ts
  ```

  Point it at another repository with `GITHUB_REPOSITORY=owner/name`
  (well-formed values only; junk falls back to `codeo1io/dashboard`). The
  landing evidence for rm-289 is exactly this transcript: the predicate
  selected canary's 2026-09-28 failure as RED in dry-run.
- **When it goes red:** open the linked run from the step summary, fix or
  re-run the underlying guard (a transient `startup_failure`/infra flake is
  cured by re-dispatching that guard), then re-dispatch the watchdog live —
  the red clears only when every guard's latest completed run is green.
- **Zero-install:** the script imports Node builtins only, so the workflow
  needs a checkout + Node 24 and nothing else (audit.yaml's setup-node-only
  shape, not the heavyweight setup composite). If the script ever needs a
  package import, that pristine-checkout claim breaks — see the
  zero-install trap class in `docs/solutions/workflow-issues/`.
