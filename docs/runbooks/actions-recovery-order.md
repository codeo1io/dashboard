# Actions Recovery Order — what fires when Actions revives

Sequencing contract for the first days after this repository's GitHub Actions
comes back. Diagnosis state (2026-10-12, run e76071009458 research): Actions
is disabled for the repository by a GitHub-side per-repo flag — dispatch
returns HTTP 422 "Actions has been disabled for this repository" while the
permissions object reports `enabled: true`, all 12 workflows are `active`, and
sibling repos run fine. No repo/admin-level API cures it; revival arrives from
GitHub's side (Support / the fleet's rm-979-class resurrection item), which is
why the trigger is a signal, not an action.

ROADMAP ownership: this runbook owns ONLY the ORDER (rm-1014). Diagnosis and
the resume drill are rm-974 (run 3083e1af); the automation-engine decision is
rm-979 (run 5045143371f9); gate cures are rm-975 and rm-965..970
(run 8136454d4f97).

## Recovery signals (any ONE means Actions is back)

- A `workflow_dispatch` that does NOT return 422.
- ANY run newer than 2026-10-09T01:59:31Z (`gh run list --repo
  codeo1io/dashboard -L 5`).
- A check-run on any `conductor/ci-*` PR.

While all three are silent, nothing below runs — the catch-up queue (≈11
outdated packages, missed digest crons, the weekly canary, dependabot windows,
fro-bot daily slots) keeps waiting.

## Step 1 — Prove runs register (rm-974's benign-dispatch drill)

- **What:** dispatch the most inert workflow available with a no-op input set;
  confirm the run registers, a check-run appears, and the run completes.
- **Owner:** whoever first observes a recovery signal (the monitoring cycle).
- **Skip-condition:** a check-run on a `conductor/ci-*` PR already exists —
  runs are registering; go straight to step 2.
- **If the precondition already changed:** if real runs already queued a
  backlog, do NOT dispatch more — census what fired (`gh run list`), record it
  as the missed-cron baseline for step 2, and proceed.
- **Done when:** one deliberate run registers and completes end-to-end.

## Step 2 — Standing guards re-fire, sentinel FIRST (rm-974's census feeds this)

- **What:** in this order — (a) `base-drift.yaml` digest cron: it is the
  sentinel that surfaces base-digest drift (the 2026-10-13 repair re-pinned
  Dockerfile:16 to the live `24-trixie-slim` digest; a stale-digest red here
  means the pin aged again, not that the repair failed); (b) the weekly
  reality canary; (c) the Fro Bot workflow's next daily slot, observed only.
  Apply the rm-1012 permissions allowlist in this step —
  `docs/solutions/workflow-issues/actions-permissions-expected-state-contract-2026-10-13.md`
  (dormant-shipped 2026-10-13 precisely so its apply rides here, after runs
  are proven, not during attribution-sensitive catch-up).
- **Owner:** the maintenance cycle that owns the standing-guard lane.
- **Skip-condition:** a guard already fired on revival — read its result
  instead of re-dispatching.
- **If the precondition already changed:** if base-drift already ran red on
  the pinned digest, triage it as a NEW drift event (probe the live digest
  before touching the pin) — the 2026-10-13 value was verified live at apply
  time.
- **Done when:** base-drift green (or its red adjudicated as new drift), the
  canary green, the permissions GETs match the contract.

## Step 3 — Automation-engine decision, then the update burst one group at a time (rm-979)

- **What:** execute rm-979's decision on dependabot/renovate-class automation
  for this fork (note: `renovate.yaml` stays absent by invariant — rm-131).
  Then triage the accumulated update burst in exactly three groups, in order:
  npm packages, docker digests, github-actions pins. Each group's FIRST PR
  merges and goes green before the next group starts.
- **Owner:** the maintenance cycle; the fleet conductor arbitrates cross-repo
  ordering.
- **Skip-condition:** fewer than ~3 queued updates — fold them into one group.
- **If the precondition already changed:** dependabot may have opened its
  backlog on revival — the group discipline still applies to PRs already
  open; do not close them, sequence them.
- **Done when:** the queue is empty and the last group's PR is merged green.

## Step 4 — Only then, the dated platform-matrix bumps

- **What:** Node 26 at its 2026-10-28 LTS flip (rm-139 calendar rider; do not
  pull it earlier for the catch-up), and the TS 7 / vitest 5 / jsdom 30 /
  @types/node 26 majors deliberately AFTER the stranded 1.9.0-adoption
  reconciliation (rm-966, pin target gateway v0.120.0+) — never interleaved
  with it.
- **Owner:** the cycle that lands the reconciliation owns the unlock; the
  dated riders fire on their calendar dates.
- **Skip-condition:** if the reconciliation already landed before revival,
  the majors queue immediately behind step 3's last green group.
- **If the precondition already changed:** if upstream moved past the
  reconciliation itself (it adopted 1.10.0), re-census the absorb window
  before any major — the window measured 9 at ab3c68a (rm-252 rider,
  2026-10-12).
- **Done when:** the matrix is current and no major rides an un-reconciled
  lineage.

## One-time validation of this order (rm-1014 acceptance)

The FIRST post-revival catch-up executes strictly by this document, and the
observed dispatch/PR sequence is recorded against it (in the cycle batch doc
of whichever cycle is live). Any deviation amends this runbook in the SAME
session, with why — the order is falsifiable, not aspirational.

Related runbook note: gateway sign-in's store-fill outage mode was added to
`docs/runbooks/gateway-access.md` in the same docs change
(fro-bot/agent issue 1784, gateway v0.120.0).
