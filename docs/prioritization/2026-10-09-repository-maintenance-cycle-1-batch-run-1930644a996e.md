# Repository maintenance — cycle:1 batch selection (run 1930644a996e)

**Selected:** 2026-10-09 ~06:55Z · **batch name:** 'scheduled-workflow red watch: alert route for the
Monday guard layer' · **base at selection:** this run worktree at 364272b (== origin/main, fetch-verified
this session) plus the run's roadmap-phase layer (extension #31, 6 additive lines, uncommitted by design;
census 245 defs / 0 dups / max rm-778, guard pin 778) · **origin/main at selection:** 364272b unmoved
(`git fetch origin` + `git rev-parse origin/main` re-run at selection time).

**Prior-attempt forensics:** first attempt on this prioritize action (e80c49a0); the run's roadmap phase
(9c70ef0e) succeeded on its first attempt. No salvage states consulted — none exist for this action.

## Inputs

- assess 2e54734d (base 364272b, clean at start and end): F1 = cve-tripwire NODE_IMAGE tag mismatch —
  DOA-red first fire Monday 2026-10-12 06:53Z (sibling-owned fix, NOT re-minted); F2 = unfenced
  workflow-to-Dockerfile tag-identity class (rides the sibling fix's fence); branch-protection shell
  re-probed empty.
- research cce99e88: upstream window 25 unabsorbed (absorb decision due 2026-10-13 feeds rm-252);
  action-pin census (codeql v4.38.3, upload-artifact v7.0.2 drifted); soak elapsed (vite 8.3.4 +
  @hono/node-server 2.1.4 still latest); pnpm audit clean at prod and full.
- roadmap 9c70ef0e (this run): extension #31 — RIDER-ONLY, NO MINT; five dated riders (rm-117, rm-252,
  rm-558, rm-648, rm-760); census 245/0/778; all-lineage ceiling re-probed (rm-805, next free rm-806).
- fleet liveness at selection (2026-10-09 ~06:25Z, campaign stores): 16 live lanes — running/recoverable:
  35704196, 38e72854, 122a6930, 3eea27cb, 493bbbf2, ba5f6d7d, aec9c3e8, 405e9004, cb189044, d1a0b216,
  d8fdf8b7, cb0cfe96, c4617181, 91776e25, 438dea88, 84133641; failed/dead this window: ab16a466,
  392bad29, e8c99e0e, f510a33e, 4fcdb776, 32f33f1b.

## Selected batch — 'scheduled-workflow red watch: alert route for the Monday guard layer'

1. **rm-289 — single unit (reliability, priority 38.0, the highest live-value contention-free item at
   selection time).** Scheduled-workflow failures have no watch path: the canary's only-ever run sat red
   3+ days unnoticed (2026-09-28), and the 2026-10-07 audit re-confirmed three scheduled reds (audit
   17-advisory, canary ERR_PNPM_LOCKFILE_CONFIG_MISMATCH, upstream-drift) sitting over 24h with zero
   notification — rm-179's promised alert route never landed. Scope = acceptance shape (a): a
   GITHUB_TOKEN-only self-watch — query each guard workflow's latest conclusion via the Actions API,
   open/update ONE tracked issue on red, close on green — as a NEW dedicated workflow file + script
   (no piggyback on existing crons: zero file overlap with the live action-re-pin lane), least-privilege
   workflow permissions, a dry-run harness proving the negative case, and the runbook section. This
   completes rm-179's unlanded alert-route half by content — no new mint.

**Why this wins the floor:** the ledger's higher-priority free items are all currently non-selectable —
cured pathologies, upstream-gated acceptance, decisions-not-implementations, or content-landed residues
(audit below) — and the one family that outranks it on coherence (the SSE record-layer trio) is
file-contended by a live implement lane. rm-289 alone converts the fleet's certain near-term red window
(the Monday 2026-10-12 guard layer fires base-drift 04:13Z, upstream-drift 05:17Z — red-by-design at 24
behind, wanting exactly this alert issue per rm-103 — and cve-tripwire 06:53Z, DOA-red unless the sibling
reconcile lands) from invisible to tracked. It is self-contained, S-M effort, completable end-to-end this
cycle, and touches no surface any live lane owns.

## Selection floor

- rm-107 + rm-119 (joint operator status surface, p=65/p=52) — next-in-line. Their acceptance mandates a
  joint plan; both are M-L and sit on routes/api.ts + operator-panel surfaces adjacent to TWO live lanes
  (38e72854's rm-599 routes-api batch at implement; 91776e25's rm-117 panel at full_tests). Re-rank after
  those land.
- SSE record-layer family rm-484 + rm-114 + rm-253 (+ rm-220) — the first-choice family on coherence and
  strategic sequencing (before the 1.8.0 absorb decision, due 2026-10-13): PARKED on file contention —
  d1a0b216's live batch's second unit (rm-794, operator run-stream lifecycle hardening) edits
  public/operator-stream.js + the shared operator-stream-core test suite. Revisit next cycle once that
  lane lands; pairing recorded here per house collision discipline.
- rm-282 + rm-196 remainder (override-floor retirement; p=74): the pnpm-audit==0 gate is NOW OPEN (audit
  clean at prod and full, this run's research), but the lockfile/package.json refresh surface is owned by
  the live held-version refresh iteration (38e72854 — rm-760 itself is implemented on main, the
  788aa489 landing of 2026-10-08; that lane is running the next iteration, vite 8.3.4). Fold into the
  next refresh cycle.

## Claimed-and-excluded — congestion audit (owner or defer reason per candidate)

- Live-lane owned (worktree claim scan `status: open (selected`, 2026-10-09): rm-117 + rm-162 → 91776e25
  (full_tests); rm-116 → 438dea88 (implement); rm-149 + rm-187 → cb0cfe96 (implement); rm-599 →
  38e72854 (implement; rm-760 is implemented on main and their batch is the next held-version
  iteration over the same lockfile surface); rm-485 + rm-501 family → content-live via d8fdf8b7's seam-timeout batch (rm-802/
  rm-803) — the with-get-seam surface; rm-788 + rm-789 → cb189044 (full_tests); rm-793 + rm-794 →
  d1a0b216 (implement, cve-tripwire cure + operator-stream lifecycle); rm-797 + rm-799 + rm-800 →
  c4617181; rm-802 + rm-803 → d8fdf8b7; rm-787 (codeql digest absorb) → df0dd46d97a1 (selected batch,
  unlanded, lane quiet 2h+ — treated as live-unlanded, not dead); rm-743-750 batch → 405e9004
  (independent_review).
- Dead-lane claims (status failed; re-implementable by content with a fold note, next cycles): rm-767 →
  392bad29; rm-768 + rm-769 → 4fcdb776; rm-485 + rm-501 → e8c99e0e (superseded by the d8fdf8b7
  content-claim above); rm-279 → f510a33e; rm-781 → 32f33f1b; rm-782 + rm-783 → ab16a466 + 33b30ba2
  (both failed this window).
- Defer reasons (free items not selected): rm-104 (p=98) — acceptance gates on the NEXT fleet roadmap
  render of an upstream-owned generator; not completable in-cycle. rm-279 (p=96) — the timeout pathology
  is CURED (2026-09-30/10-03 riders: paragraph-split landed; green 49s Lint runs since 2026-10-03);
  residual decomposition is optional hardening, stale score. rm-284 (p=97) — already implemented (the
  landed cure). rm-102 (p=90) — in-progress, waits on the first MERGED automated bump (external event).
  rm-103 (p=85) — M-L absorb-automation feature, entangled with the rm-252 decision. rm-252 (p=80) — the
  absorb decision (due 2026-10-13) is a roadmap/research act for the next cycle, not this implement
  batch; flip condition armed, evidence recorded in this run's rm-252 rider. rm-703 (p=76) — cure landed
  by content (rm-691 lineage END-block readbacks on main; 2026-10-09 integrate riders); residual is a
  grep-proof + guard micro-item for a future roadmap ledger-flip, not implement. rm-249 (p=72) — product
  decision deferred (push SW restore). rm-106 (p=68), rm-146 (p=38) — blocked-external (upstream issue;
  branch-protection fill in flight on rm-116). rm-281 (p=62) — rides behind rm-149's landing (same PKCE
  test file, cb0cfe96 live). rm-108 (p=60) — recurring decision-matrix rider, no implementation batch.
  rm-230 (p=24) — governance-gated mint-map widening, distinct track. rm-659 (open) — adjudication
  deliverable (ledger outcome), not an implement batch. rm-220 (p=36) — operator-stream family, parked
  with the SSE trio above.

## Selection risk

- Single-unit S-M batch: LOW overall completion risk. Residuals: (1) the self-watch workflow needs an
  explicit least-privilege `permissions:` block (`actions: read`, `issues: write`) — a workflow-scoped
  GITHUB_TOKEN grant in THIS repo, not an App-installation write path; the read-only-by-construction
  invariant concerns minted installation tokens for monitored repos and is untouched. (2) The negative
  proof ("fires on red") lands via a dry-run harness with fixture conclusions plus the documented live
  first-fire expectation (Monday layer), not via a manufactured red. (3) Upstream-drift is red-by-design
  at 24-behind — the watch's ONE tracked issue will legitimately open Monday unless rm-103's absorb
  lands first; that is the designed behavior, not churn (acceptance: open/update ONE issue, close on
  green). (4) Monday timing: if the batch lands after 2026-10-12 04:13Z, the first base-drift/
  upstream-drift reds predate the watch — record their retro-detection in the runbook note rather than
  claiming coverage. (5) New yaml must single-quote string values (eslint yml rule) and validate via the
  actionlint container form.

## Verification

- `grep -c 'status: open (selected' ROADMAP.md` → 1, exactly this flip (HEAD baseline = 0: main's ledger
  carries no live selections; rm-760 is implemented, not selected); the flipped rm-289 def-line carries
  NO rm-N ids (phantom-scan hygiene; the prior parenthetical is preserved verbatim inside the selection
  rider).
- Claim scan re-run across all sibling worktrees after the edit: no other lane claims rm-289 (was absent
  pre-edit; nothing changed in their trees).
- Current-batch-doc file-overlap check across the 10 live lanes' newest batch docs: zero surface mentions
  of a scheduled-watch/alert-route surface (only d1a0b216's rm-794 operator-stream row matches the
  parked SSE family, documented above).
- Guard battery after the ledger edits: `./node_modules/.bin/vitest run
  test/roadmap-integrity-guard.test.ts test/roadmap-length-guard.test.ts` green; `./node_modules/.bin/
  eslint ROADMAP.md` clean; census unchanged 245 defs / 0 dups / max rm-778 (selection edits do not move
  the census; statuses candidate→open only).

## Implementation (2026-10-09, implement c9e19e15)

Landed in the stewardship worktree (uncommitted, base 364272b + this run's ledger layer):

- `.github/workflows/scheduled-watch.yaml` — new **Scheduled guard watch** workflow:
  Mondays + Wednesdays `37 8 * * *` UTC (after the whole Monday layer 03:37–06:53 and
  CodeQL's Wednesday 07:31 slot have settled), plus `workflow_dispatch`. Least-privilege
  permissions `contents: read` / `actions: read` / `issues: write`; digest-pinned
  checkout v7.0.1 (`persist-credentials: false`) + setup-node v7.0.0, **no install step**
  (zero-dependency by construction — the rm-280/rm-288 born-broken class cannot recur).
- `scripts/scheduled-workflow-watch.ts` — the watch itself: pure decision core
  (strict green = only `success`; failure/timed_out/startup_failure/cancelled/skipped and
  **no-completed-run** all red), live Actions-API layer (per guard: latest
  `event=schedule|workflow_dispatch&status=completed` run on the default branch), issue
  route, job summary, and a `--dry-run` stdin-fixture harness that prints the exact
  issue/comment it WOULD post and exits with the live code.
- `test/scheduled-workflow-watch.test.ts` — 16 tests: decision core (semantics, signature
  dedup, open/update/close routing, has_issues=false degrade, exit codes), workflow
  statics (permission set, crons, zero-install, digest pins, **completeness guard**:
  GUARD_WORKFLOWS must equal the repo's cron-triggered workflows minus fro-bot/self), and
  end-to-end dry-run spawns (negative case exits 1 with the would-open issue).
- `docs/runbooks/security-posture.md` — new "Scheduled guard watch" section documenting
  the three-surface route ladder, strict semantics, dry-run recipe, and first-fire
  expectations.
- `ROADMAP.md` — rm-289 def-line flipped `open (selected …)` → `implemented (…; prior:
  selected …)` per house flip syntax + this dated implement rider.

Verification (focused, this phase): `./node_modules/.bin/vitest run
test/scheduled-workflow-watch.test.ts` **16/16 green**; `./node_modules/.bin/eslint` on
all four files rc=0; `pnpm check-types` rc=0; actionlint container form
(`rhysd/actionlint:1.7.12`) rc=0 on the new workflow; roadmap guard battery green
post-flip (see below).

**The surfaced artifact — live read-only watch run** (2026-10-09, `GITHUB_TOKEN` from the
operator session; no writes possible: the issue route is gated behind the live
`has_issues=false` probe, which fired the degrade note):

```text
scheduled-watch: target codeo1io/dashboard — 7 guard workflow(s)
scheduled-watch: Dependency audit (audit.yaml) — RED failure (schedule, 2026-10-05T10:48:38Z)
scheduled-watch: GraphQL canary (canary.yaml) — RED failure (schedule, 2026-10-05T12:21:49Z)
scheduled-watch: CVE tripwire (cve-tripwire.yaml) — RED no completed run found (—, —)
scheduled-watch: Upstream drift check (upstream-drift.yaml) — RED failure (schedule, 2026-10-05T12:15:32Z)
scheduled-watch: Base image drift check (base-drift.yaml) — green success (schedule, 2026-10-05T11:25:18Z)
scheduled-watch: Scorecard supply-chain security (scorecard.yaml) — green success (schedule, 2026-10-05T15:07:16Z)
scheduled-watch: CodeQL (codeql.yaml) — green success (schedule, 2026-10-07T14:43:00Z)
scheduled-watch: 4 red / 3 green
scheduled-watch: signature audit.yaml:failure,canary.yaml:failure,cve-tripwire.yaml:no completed run found,upstream-drift.yaml:failure
scheduled-watch: issues disabled on this repository (has_issues=false) — tracked-issue route skipped; the red watch run is the alert surface
scheduled-watch: issue route — issues disabled on this repository (has_issues=false) — the red watch run is the alert surface
exit 1
```

(Note: two back-to-back live runs minutes apart returned differing per-run timestamps
for the same workflows — API read-side flapping while the Actions event pipeline
recovers from its 2026-10-09 outage; the red/green verdict and signature were
identical both times, which is what the watch keys on.)

This IS the acceptance's negative proof, fired against the real repository state the item
was minted on (the 2026-10-05/07 unwatched reds are precisely the red set the watch
surfaces) — without manufacturing a live red. The upstream-drift red is by-design
(fork-behind signal); the cve-tripwire "no completed run" is the new-guard case working
(first fire 2026-10-12 06:53Z). The issues-enabled routing (open/update/close + dedup) is
proven offline by the dry-run harness and pinned in tests.

**First live fire expectation**: Monday 2026-10-12 08:37 UTC, expected conclusion `RED`
(that red run + GitHub's scheduled-failure email is the alert firing as designed; if
cve-tripwire's first-ever run succeeds it flips green within the same cycle — the
completeness guard keeps it honest either way). Verify post-landing: run conclusion +
`GITHUB_STEP_SUMMARY` table.
