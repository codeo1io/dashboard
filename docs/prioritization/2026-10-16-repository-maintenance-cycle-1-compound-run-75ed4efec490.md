---
module: repository-maintenance
tags: [compound, roadmap, ci, validation, upstream-absorb]
problem_type: process
owner: hermes-conductor
run_id: 75ed4efec4904499ae93679a09b6acaa
created: '2026-10-16'
status: review-pending
---

# Repository maintenance cycle 1 — compound record (run 75ed4efec490)

Pre-review compounding of cycle-1 evidence. Review, landing, and shipping outcomes are
intentionally absent here; the next cycle's assessment carries them forward.

## Cycle identity

| Field | Value |
| --- | --- |
| Run | 75ed4efec4904499ae93679a09b6acaa (repository-maintenance:acd094b4:cycle:1) |
| Worktree | .hermes/conductor-worktrees/dashboard-864ca327c8/run-75ed4efec490-75ed4efe |
| Base | 3e3664c (= origin/main at every phase re-verification; no sibling landed all cycle) |
| Upstream at research | b16d061 / release 2026.10.38 (drift 22 commits, 13 releases from absorbed 2026.10.25) |
| Batch delta | 9 modified + 4 new files, +188 / −32 lines (plus this compound doc + its companion solution note) |

## Phase ledger (all attempts pre-review)

| Phase | Attempt | Outcome |
| --- | --- | --- |
| assess | 2ccc5796 | 4 fresh findings; headline F1 HIGH: approval-click collapse chain live in fork |
| research | 282efab2 | 22-commit drift catalog with per-commit fork dispositions; session-expiry dead end found |
| roadmap | 0f5bf517 | Spool-side ledger extension: mints rm-866/rm-867 + 4 evidence appends (239 defs, 0 dups) |
| prioritize | 4aa40237 | Batch = rm-866 + rm-867 + ledger rider; race vs 2c8c4ece superset adjudicated |
| stewardship | 4590573f | Structured stewardship_request; units A/B/ledger; sw.ts fenced as never-touch |
| implement | ba17dabf (typed successor; fe20a803 was a 64 s failed reap — the tree edits came from reaped sibling c788913e, attributed by mtime window + event log) | Ports landed in worktree; upstream pass-probe 29/29 isolated port defects |
| targeted_tests | 1be14a70 (typed successor; f2a53daf was a 44 s failed reap) | 401 web + 1884 root + 65 guard tests green; CT rc 0; changed-file eslint 0 |
| full_tests #1 | 5260c6fd | Local full battery green (16:59 Z, Actions still dark — see Validation) |
| full_tests #2 | 1f1dfeb7 | Dispatch command executed verbatim via the fullval mirror after Actions resumed — run 389568987, 11 checks, PASS; ROADMAP lint cure landed in-tree with it |
| compound | d8972575 | This record + companion solution note |

## Batch summary

- rm-866 — approval-click containment port of upstream 5581a49 (#636, release 2026.10.36):
  container click-containment on renderApprovalPrompt and renderCancelControl in
  public/operator-stream.js (13 changed lines, count-identical to upstream's delta), mirroring
  the in-file question-region pattern, plus fork-adapted regression test
  web/src/operator/approval-click.test.ts (292 lines). Fixes the verified chain: prompt clicks
  bubbled to the card activation listener in operator-run-index.js, collapsing the card and
  closing the live stream mid-approval, which hid the Always-flow Confirm pair.
- rm-867 — operator session-expiry sign-in recovery, ported as the post-#637 end state of
  upstream #633 + #637 (32c9605 + bcdcb46) in ONE step: new sign-in-recovery module with the
  once-per-tab guard (never the buggy 60-second re-arm intermediate), a Sign in with GitHub
  affordance on the formerly headline-only auth-required render, runtime wiring, and the two
  ported test files. Cures the dead-end state where copy instructed sign-in but no control
  existed.
- Ledger rider — ROADMAP.md +17 lines (rm-866/rm-867 mints + evidence appends to rm-102,
  rm-139, rm-191, rm-252), delivered spool-side at roadmap phase and applied with the batch.

## Validation record (as recorded by the cycle's test phases)

- Targeted: 13 impacted root suites (1884 tests) + web operator/views suites (401 tests) +
  roadmap guards (65) — all green; check-types rc 0; changed-file eslint clean.
- Full (local battery, substituted — see lesson L1): check-types rc 0; lint rc 1 at exactly the
  pre-existing 50-problem baseline (all in ROADMAP.md, identical rule-mix at pristine base —
  not a regression); pnpm test rc 0 with pretest client build: 59 files / 3074 server tests +
  37 files / 1241 web tests = 4315 passing, zero failures (+6 / +28 tests vs pristine base,
  exactly the ported suites).
- Validation digest: validation:v1:e6249e4e71b6ae5efbcd6095b6ac123daa06d4fb7b2686ee71e86b216bb242c4
  — dispatch-time digest, copied verbatim; the full_tests turn changed no executable surface,
  and this compound turn adds documentation only (non-executable surfaces).
- Supersession (recorded at review-fix, 2026-10-17): full_tests #1's "remote leg impossible"
  verdict was true at its 16:59 Z probe window; GitHub Actions RESUMED 2026-10-16T17:36:03Z
  (an 8,257,921-second queued window), and full_tests #2 (1f1dfeb7) executed the dispatch
  command verbatim through the fullval mirror — run 389568987, 11 checks, PASS — landing the
  ROADMAP lint cure in-tree as part of that attempt. The local battery above remains the
  recorded outcome of #1; #2's mirror PASS is the authoritative full-validation result.

## Lessons and prevention rules (pre-review evidence only)

- L1 — CI-silence validation routing. The conductor full-validation command routes through
  GitHub-hosted CI; this repository's Actions has been suspended at the account level since
  2026-10-09 while the permissions endpoint still reads enabled (two-sided trap), and the
  validate script has no liveness preflight — four verbatim attempts on 2026-10-16 (all
  pre-resume) each minted a checkless draft PR and then timed out. Rule: probe run recency and
  the PR-checks side before executing remote validation; under proven darkness, substitute the
  repository's authoritative local full battery, keep the tree digest unchanged, and record
  the verbatim digest with the substitution rationale. The suspension ended at
  2026-10-16T17:36:03Z and the next verbatim attempt passed (see the Validation supersession
  note) — the durable part of this rule is the probe-then-decide loop, not a substitute-always
  verdict. Companion note:
  docs/solutions/workflow-issues/github-ci-validate-silence-local-battery-substitution-2026-10-16.md
- L2 — provider-reap forensics. Three reaps shaped this cycle: a 64-second no-op named by the
  work order, a 44-second no-op at targeted_tests, and the real implement work reaped mid-run
  after 42 minutes. Rule: never adopt on summary text alone; attribute tree edits by event-log
  message counts and file-mtime windows, byte-compare the porcelain/diff-stat census against
  the claimed state, and treat a missing typed artifact as nothing adoptable.
- L3 — cross-file listener chains. A prior spool entry had recorded this fork as not affected
  by the approval-click bug because a single-file grep found no collapsing listener in
  operator-stream.js; the listener actually lives in operator-run-index.js. Rule: verify
  interaction defects chain-wide (container → listener → state mutation) before recording
  not-bit claims; the supersession is recorded inside rm-866's ledger evidence.
- L4 — ledger id collisions. Five sibling spool lineages now claim overlapping rm-id ranges.
  Rule (standing): mint above every known allocation, state first-landed-wins in the revision
  comment, renumber at apply time; next unminted id is rm-873.
- L5 — lint parity on managed files. The ledger rider and these docs were proven to add zero
  lint problems by comparing the file-scoped eslint census before and after (50 = 50, rule-mix
  identical). Rule: keep that parity proof for every edit to ROADMAP.md and any new
  docs/prioritization file (this glob is linted; solutions/plans/brainstorms are not).

## Race and landing state (at time of writing)

- Parallel campaign 2c8c4ece (run 48f621e31d) selected a same-day strict superset whose first
  two items match this batch's content; nothing from either campaign has landed (origin/main
  remained 3e3664c through every phase). First-landed-wins governs; the later landing
  re-derives scope at base and renumbers ids.
- Stranded CI-validation PRs observed awaiting bulk closure at the commit gate (is-of-time
  2026-10-16T16:59 Z): #761, #760, #759, #758, #753, #752, #751, #533 (eight checkless
  drafts), plus their conductor/ci-* branches. By the 17:36 Z resume the queue had churned
  again (#533/#521/#522/#523, with #716/#717 and the #75x batch gone or merged) — re-derive
  the live queue at the gate before closing anything.

## Carry-forward for the next maintenance cycle

1. If this batch lands: verify the ledger rider applied and statuses flipped for rm-866 and
   rm-867; reconcile against whichever 2c8c4ece items also landed.
2. Contract 1.11.0 absorb (rm-252 family) stays gated on a live gateway probe — the probe path
   needs a local marcusrbrown/infra checkout with repo-root .env; only codeo1io/hermes-infra
   exists on this machine. Riders: @types/node 24.19.2, @opencode-ai/plugin 1.19.0,
   fro-bot/agent v0.122.3, codeql digest 6f2ac81 (four sites).
3. Node 26 LTS adoption gate fires 2026-10-28 (rm-139): batch node-26 + ubuntu-26.04 runner
   image + setup-node decision into one churn; all 19 workflow jobs currently pin
   ubuntu-24.04.
4. Actions suspension (rm-102): RESOLVED — Actions resumed 2026-10-16T17:36:03Z (an
   8,257,921-second queued window). The pre-resume forecast — Fro Bot cron failure-spam
   (secrets absent) and a queued-event flood — should be verified against actual post-resume
   run history at the next assessment, not assumed.
5. Standing never-absorb: upstream sw.ts Workbox worker (kill-switch divergence; #638 is fresh
   proof it keeps evolving) and iOS push-UX copy (#629) until a push host exists.

## Verification pointers

- Worktree: git status shows the 9 modified + 4 new batch files plus this doc and its
  companion note; git diff --stat against 3e3664c.
- Spool artifacts: assessment, research table, ledger diff/postimage, batch selection,
  stewardship request, implement and targeted/full test logs under
  .hermes/conductor-delegate-spool/delegate/ (attempts 2ccc5796, 282efab2, 0f5bf517,
  4aa40237, 4590573f, ba17dabf, 1be14a70, 5260c6fd).
- Upstream sources: git show 5581a49 / 32c9605 / bcdcb46 in any checkout with the upstream
  remote fetched.
