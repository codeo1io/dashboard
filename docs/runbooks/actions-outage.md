# Actions Outage Diagnosis

This repository's GitHub Actions can be silently dead while every API surface reports
health: Actions enabled, all workflows `active`, admin token valid, repo neither
archived nor disabled — and zero runs registering anywhere. The live instance of this
state began 2026-10-09T01:59:31Z (the last registered run, a green CodeQL) and was
still holding at 2026-10-12, surviving an entire reconciliation landing. This runbook
is how to tell that state apart from ordinary CI flakiness, how far you can localize
it, and what a safe revival probe looks like.

## The discriminator: dispatch returns 422

The single sharpest signal is a `workflow_dispatch` attempt against a workflow that
should accept it. While the outage holds:

    gh api -X POST /repos/codeo1io/dashboard/actions/workflows/main.yaml/dispatches \
      -f ref=main

returns HTTP 422 with the message `Actions has been disabled for this repository`
(probed 2026-10-12T14:25Z). A permissions problem would surface as 403/404; a ref
problem as 422 with a different message. The 422 "disabled" wording is the
platform-side disablement flag talking, and an ADMIN-scoped token gets the same
answer — so this is not the token's shape.

Note: the dispatch probe is safe (it fails before creating anything), but only probe
workflows whose `workflow_dispatch` leg is inert. See the resume drill below for the
one workflow that is explicitly excluded.

## Detection recipe (three read-only probes)

    gh api /repos/codeo1io/dashboard/actions/permissions
    gh api /repos/codeo1io/dashboard/actions/workflows
    gh api '/repos/codeo1io/dashboard/actions/runs?per_page=1'

The outage signature is the combination:

- `actions/permissions` → `{"enabled":true,"allowed_actions":"all","sha_pinning_required":true}`
  — the repository policy layer looks completely healthy.
- `actions/workflows` → every workflow `state=active` (12 at the time of writing).
- `actions/runs` → the newest run is days old despite active cron schedules
  (`fro-bot.yaml` runs daily) and multiple landing attempts in the interim.

Enabled + all-active + run-silence is the fingerprint. Any single probe alone can be
explained away; the combination cannot.

## Isolation ladder

Each rung below was walked to its end on 2026-10-12 and eliminated:

1. Repo-level settings — eliminated by the three probes plus the repo metadata
   (`archived:false`, `disabled:false`) and the 422 wording (a repo-disabled Actions
   flag is not exposed in `/actions/permissions`, which is exactly what makes this
   state deceptive).
2. Token/permissions shape — eliminated: the probing token is ADMIN on the repo, and
   a sibling repository with an identical permissions shape completed runs the same
   day.
3. Account/billing level — eliminated by the same sibling-run evidence: a
   per-account billing or quota suspension would not spare the sibling.
4. Organization level — not applicable: `codeo1io` is a user account, and org
   endpoints 404.

What remains is a GitHub-side per-repo disablement flag that no repository- or
admin-level API can see or clear. There is no API cure at this layer; resolution is
Support-class. Until then, treat every gate that depends on GitHub Actions
registering checks as structurally unavailable — most importantly
`github_ci_validate.py` in the full_tests path, which deterministically burns its
full 3600s budget ending in `GitHubCIError: timed out without registering any PR
checks`. Re-dispatching it while the outage holds cannot produce a different result.

## Resume drill

Any one of these signals means Actions is back:

- a dispatch probe that does NOT return the 422 disablement message;
- any run newer than the silence ceiling (2026-10-09T01:59:31Z at the time of
  writing);
- any check-run appearing on any `conductor/ci-*` PR.

When one fires, run the drill before re-arming anything that depends on CI:

1. Dispatch a benign, read-only workflow (a canary whose sole step is an `echo`) via
   `workflow_dispatch`, and confirm a run record appears in `/actions/runs` within a
   minute.
2. Confirm the run reaches a terminal state without secrets — the canary must not
   require any repository secret.
3. Only then re-dispatch `full_tests` or any validate-shaped job verbatim.

The workflow excluded from manual dispatch at all times is `fro-bot.yaml`: its
`workflow_dispatch` leg is NOT gated on `HAS_FRO_BOT_PAT` (job env at :285,
per-step gates :323/:341/:345 cover the schedule path only), so a manual dispatch
without the secret provisioned reaches checkout with an empty token and runs the bot
unauthenticated. Scheduled runs without the secret are a graceful skip with a visible
warning (:315-318) — manual ones are not. Check `gh api
/repos/codeo1io/dashboard/actions/secrets` before any by-hand dispatch of that
workflow.

## Branch-protection caveat

Branch protection on `main` is currently an empty shell (`checks: []`,
`enforce_admins: false`). Two consequences during an Actions outage:

- No required check can register, so filling the protection with required checks
  while the outage holds would brick every landing, including the fix. Fill it only
  after main is green AND Actions is alive.
- Never delete the protection object to "reset" it — a body-less recreate produces
  exactly the current all-empty state and drops any check list already configured.
  The emergency override path (temporarily disabling admin enforcement with the full
  body preserved) is documented in the repository's `AGENTS.md`.

## Origins

First minted as roadmap item rm-974 (run `3083e1af1dbf` roadmap phase, attempt
`1a8f493d`, 2026-10-12). Evidence trail: the `sha_pinning_required` permissions
datum and the 42/53 SHA-pinning census (research attempt `5ebad853`,
07:06–07:15Z); the 422 discriminator and the sibling-run falsification (assess of
run `e76071009458`, attempt `84831913`, 14:25Z); the PAT-gating reframe of the
Fro Bot cron hazard (rm-971 / `#17981`). The detection recipe and resume drill
above are offline-runnable as written; the drill's dispatch steps are deliberately
NOT executed while the outage holds.
