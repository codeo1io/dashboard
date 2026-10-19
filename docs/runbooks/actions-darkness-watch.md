# Actions Darkness Watch

Out-of-band watchdog for GitHub Actions run-creation darkness. Born as the
rm-1411 lane (landed run a79dc20458f1, 2026-10-15 — the first variant: env-var
REST probe); superseded at the 2026-10-20 integrate fold (conflict case
f896c277, run 528f458d cycle:1, def rm-2006 — renumbered from that run's
rm-873 mint) by the PR-#810-validated variant documented here. During the
2026-10-09 outage every workflow in this repository reported `active` through
the API while run *creation* was dead repo-wide: the newest run of any
workflow stayed at 2026-10-09T01:59:31Z for six plus days, 57 commits merged
to `main` with zero CI validation, and twelve open PRs showed no checks.
Nothing that runs *inside* Actions can detect that state — this runbook
covers the probe that runs outside it.

## Trigger

Run locally whenever Actions silence is suspected — after landing without
checks appearing, before trusting a merge, or on the operator cadence the
estate tripwire already follows:

```bash
node scripts/actions-darkness-watch.ts [--repo owner/name] [--dry-run] [--json]
```

- `--repo owner/name` — target repository (default: `GH_REPO`, else
  `GITHUB_REPOSITORY`, else `codeo1io/dashboard`).
- `--dry-run` — no network at all: reproduces the embedded live snapshot of
  the 2026-10-09 outage (captured read-only 2026-10-16; 11 workflows dark,
  57 uncovered commits, six newest commits embedded).
- `--json` — machine-readable verdict object on stdout instead of the
  human report.

Transport is the `gh` CLI (`gh api` GETs only, authenticated by `gh`'s own
config). Read-only by construction: no mutation path exists in the script.

## Verdict semantics

A commit is **uncovered** when it is newer than the newest workflow-run
creation timestamp across all workflows by more than the grace window
(900 s — GitHub normally creates a run within seconds of a push; 15 minutes
is a generous allowance). One or more uncovered commits on the default
branch ⇒ **DARK**.

- **bright** (exit 0) — every fetched default-branch commit is covered by a
  newer workflow-run creation.
- **dark** (exit 1) — at least one uncovered commit. The report lists each
  uncovered commit, the newest run-creation timestamp, per-workflow last-run
  staleness, and the reasons. A dark verdict is the signal — this exit code
  is designed to fail a CI step or a cron lane red.
- **usage/transport error** (exit 2) — bad flags, `gh` unavailable, an API
  read failed, or a payload was malformed. Treat as no signal, not as
  healthy; re-run before concluding anything.

Note the ladder differs from the external-estate tripwire's 0/1/3 convention:
here 1 (not 3) is the dark verdict and 2 (not 1) is the unknown.

## Bounds

- The candidate set is every workflow the repository reports (one
  `per_page=100` page of the workflows list — a repo with more than 100
  workflows would under-enumerate; this repo has 14). Each workflow's newest
  run is fetched with `per_page=1`, so the newest-run timestamp is exact.
- The commit window is the 30 newest default-branch commits; when ALL fetched
  commits are uncovered the report says `window saturated` — the true outage
  depth is at least that many commits, a floor not a ceiling.
- A run of **any** event kind counts as run-creation activity: darkness means
  commits land with no run created after them, not that one trigger misfired.
  A stale but manually-dispatched run still proves run creation works.
- The `gh` transport has no `spawnSync` timeout — a hung local `gh` hangs the
  probe (in CI the job's `timeout-minutes` bounds it).
- The probe reads API data and writes nothing to any repository. It cannot
  distinguish an outage from an org-wide run-creation pause; it reports the
  repo-scoped fact and the escalation is human.

## Workflow lane

`.github/workflows/actions-darkness-watch.yaml` is **dormant by design**:
`workflow_dispatch` only, no push/schedule triggers. While Actions are dark it
could never run anyway — it exists so an operator (or a future scheduled form
of itself, once a Hermes-side root cause is found) can dispatch the probe on
demand. It runs the probe with zero install (node builtins only) from a
pristine checkout; a dark verdict fails the run red — that red run is the
signal.

## Boundary with the in-repo red-watch

rm-289 owns the in-repo half (workflow-file drift caught by repository tests).
This script owns the out-of-band half. If both go red together, trust the
out-of-band signal: repository tests cannot run while Actions is dark.

## Recorded proof

- `test/actions-darkness-watch.test.ts` — 9-test unit suite over
  `computeDarknessVerdict` and the dry-run snapshot (uncovered-commit
  detection, grace-window boundary, never-ran repos, window saturation,
  snapshot-shape pins).
- Full validation: ephemeral PR #810 commit 57b9ce7e (run 528f458d cycle:1
  full_tests ab33ec6b) — all 11 executed checks SUCCESS, including visual.
- Live bright probe 2026-10-17T01:53:41Z after Actions resumed
  2026-10-16T17:12Z (the first dispatch / enable decision was recorded
  UNBLOCKED the same day).
- Live DARK, 2026-10-14 era (first variant, runbook's original evidence):
  10/10 candidate workflows stale 5.9 days with `pushed_at` newer than every
  last run — the outage state this runbook was written under.
