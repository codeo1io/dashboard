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

## Actions pin census and zizmor (rm-1931, rm-1930)

While run-creation darkness starves dependabot and every CI lane, two more
things rot silently: action pins drift from upstream releases, and stale or
bare version comments (`# v4`, `# v6`) make pin audits unauditable. Two
out-of-band companions extend the darkness watch for exactly that gap:

- `pnpm pins:census` — offline structural census (no network):
  `scripts/actions-pin-census.ts` walks `.github/workflows/*.ya?ml` plus
  every `action.yaml` composite under `.github/`, then reports one verdict:
  GREEN (exit 0) every `uses` pin is a 40-hex digest with a full
  `major.minor.patch` comment, one digest per action; STALE (exit 1) comment
  defects only; DRIFT (exit 3) unpinned refs, split pins, or digest drift.
- `pnpm pins:census:online` — same census plus a latest-release comparison
  per action (major-line aware: repos like `github/codeql-action` dual-track
  `v4.x` action tags and `codeql-bundle-*` releases, so the comment's major
  line is the oracle, not `releases/latest`). Network failures degrade to
  STALE with an explicit note — never GREEN.
- `pnpm lint:workflows` — zizmor 1.31.1 (pinned via uvx) with
  `.github/zizmor.yml`, scanning all of `.github` (workflows plus local
  composites) as the audit-class complement to actionlint.

Standing baseline (2026-10-17, run 65d41c1b implement phase; reconciled
same-day in the targeted_tests phase against origin/main's concurrent
`43af4cf` landing, which had already taken the setup-node v7.1.0 /
action-setup v6.1.0 / upload-artifact v7.0.2 refreshes and the rm-142
playwright 1.64.0 image-lockstep repair — this tree adopts that world
verbatim and keeps only what main has not landed yet):

- Offline census GREEN on the reconciled pins: setup-node v7.1.0
  (949feb2413d6), action-setup v6.1.0 (ea17c68df891),
  upload-artifact unified v7.0.2 (cf430e030ddb), codeql-action v4.38.3
  (24c54180a607) — adopted from main's comment-truth; the v4.39.0
  (6f2ac81f5cd8) refresh this batch had staged was deferred to next-cycle
  pin work to keep the fold conflict-free — setup-qemu v4.4.0
  (990126619549), labeler v6.1.0 (f27b6088b921) — workflow files and the
  `actions/setup` composite both.
- Online census: two standing DRIFT rows are deliberate — `fro-bot/agent`
  workflow pins v0.122.1 (15dc1d9) matching the deployed gateway, while
  v0.122.3 (7d273ac) sits undeployed upstream; the estate pin moves as its
  own decision, not as pin hygiene. And `github/codeql-action` in-tree
  v4.38.3 (24c54180) trails the v4.x latest — the deferred v4.39.0 bump
  above — so its three use-sites (init/analyze/upload-sarif) each show as a
  digest-drift row until that next-cycle refresh lands.
- zizmor: triaged ignores live in `.github/zizmor.yml` with per-line
  reasons (template-injection on operator-owned contexts, intentional
  persistent caches, local-composite self-references, digest-carrying image
  aliases). Remaining findings are the unignored hardening backlog and are
  expected to keep `pnpm lint:workflows` nonzero until narrowed:
  permissions least-privilege passes (read-all and job-level write scopes in
  main/codeql/fro-bot/base-drift), the `ref-confusion` in
  upstream-drift.yaml, and the comment-blocked `dangerous-triggers` family
  in fro-bot.yaml. Land them as their own ledger work, then lift nothing
  else.

Run both probes on the same cadence as the darkness watch; the online census
and zizmor need network but no CI lane.
