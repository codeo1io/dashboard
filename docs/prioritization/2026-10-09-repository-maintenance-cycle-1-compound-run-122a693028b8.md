# cycle-1 compound (run 122a693028b8) — operator-client batch validated, cap-parity rule compounded, outage handling recorded

Chain (all attempts typed, every outcome below is consumed from the recorded results —
nothing was re-validated at compound, per the phase's no-test-execution mandate):
assess ffb535cb → research 4a1fdd1d → roadmap c2a9b510 → prioritize 0816fcf8 →
stewardship a16041e7 → implement b153e4d5 (rejected once by KTD13 on a missing
changed-surfaces attestation; the implementation itself stood, re-attested) →
targeted_tests 9cbd7492 → full_tests b4bec689 → compound c85d3f4d (this doc).

## Cycle outcome

Batch: 'operator-client hardening — launchRun retry parity + fetchJson size cap'
(rm-485 + rm-822), selected with a scored batch doc at
docs/prioritization/2026-10-09-repository-maintenance-cycle-1-batch-run-122a693028b8.md.

- rm-485 — launchRun now runs the same CSRF-400 refresh-then-resend-once retry as its
  three mutating siblings (same idempotency key; failed refresh surfaces the ORIGINAL
  error; non-400 never retries). Interface docs state the retry contract for all four
  methods.
- rm-822 — fetchJson's unbounded `response.json()` is gone: declared
  Content-Length pre-check plus a streamed byte counter cap the body at
  MAX_SSE_BUFFER_BYTES parity, cancelling at the fence and rejecting with a typed
  GatewayResponseTooLargeError that PROPAGATES.

Validation (pre-review, consumed from typed results):

- targeted: the engine's impacted closure over src/gateway/operator-client.ts ran green
  first-try — 8 test files / 488 tests, rc=0 (attempt 9cbd7492), plus eslint rc=0 and
  check-types rc=0 across all three programs.
- full-suite basis: the verbatim ephemeral-PR full_command deterministically registered
  ZERO check-runs through its entire 3600s poll (PR #492; the repo Actions
  run-creation outage — no run created since 2026-10-09T01:59:31Z), so the pass basis is
  the supervisor-approved six-job local mirror of the Main workflow: lint rc=0,
  impeccable findings [], check-types rc=0, root 64 files / 2481 tests + web 32 files /
  1203 tests green, actionlint 1.7.12 container clean, 48 non-test src modules import
  clean. Deviation report: delegate/fulltests-122a6930-b4bec689-report.md. Suite drift
  vs the pre-batch baseline is EXACTLY the batch's +7 tests (2474 → 2481).

## Ledger deltas made at compound

Riders only, zero def-line changes (census re-derived after the edits: 246 defs, 0 dups,
max rm-822 — ledger unchanged, no mint this wave; 0 lines over the length guard):

- rm-485 + rm-822: validation riders (evidence above), status stays implemented pending
  review + landing.
- extension #31 header followed by compound comment #32 recording this wave.

## Reusable lessons recorded this cycle

1. docs/solutions/best-practices/untrusted-response-body-cap-parity-fetchjson-2026-10-09.md
   — every future client fetch of an untrusted HTTP body must reuse
   readBodyTextWithCap or justify its bound against MAX_SSE_BUFFER_BYTES parity. No
   suite pins the class; green suites cannot see an uncapped read.
2. docs/solutions/workflow-issues/actions-run-creation-outage-ephemeral-pr-validation-zero-checks-2026-10-09.md
   — detecting the run-creation outage before burning a 3600s poll, the approved
   six-job local-mirror fallback, and the github_ci.py:755 cleanup-crash signature that
   strands conductor/ci-base-* refs under a swept delegate TMPDIR.

## Next-cycle candidates (ordered, with preconditions)

- C1 (highest): operator-contract 1.8.0 browser display half (rm-157 family). Gateway
  v0.118.3 released 2026-10-08T22:57Z carries checkout fields onto the SSE status frame
  (agent PR #1743); the deployed infra pin is still v0.118.2 (faf7141, 2026-10-07). The
  rm-157 flip gate: primary flip only when infra serves v0.118.3+ (re-probe
  apps/gateway/upstream.json). Interlock decision due 2026-10-13.
- C2: dependency refresh set — vite 8.3.4, @hono/node-server 2.1.4, @opencode-ai/plugin
  1.18.35, playwright 1.64.0 (gated on mcr digest triple-probe + two-green baseline
  regen), codeql digest 24c5418, upload-artifact v7.0.2, setup-node v7.1.0, pnpm 11.28.5.
  Double-claimed unlanded as rm-821 (run 5989 lane) and rm-807 (run 155f lane) —
  reconcile by content, no third mint; rm-760's soak windows opened 2026-10-09T12:07Z.
- C3 (time-sensitive, outage-gated): the cve-tripwire's first scheduled fire is Mon
  2026-10-12 06:53Z and fires RED by construction on the unreconciled NODE_IMAGE pin
  (cve-tripwire.yaml:35 'node:24-slim' vs Dockerfile trixie digest; owned unlanded
  rm-755 / dead rm-793, reconcile by content at integrate). BUT a scheduled fire needs
  run creation — under the outage the fire simply does not happen; recovery BEFORE
  Monday 06:53Z re-arms the red fire, recovery after shifts it to the next slot. Probe
  runs?created>= before treating silence as health.
- C4: outage residue — this run leaked conductor/ci-base-2c550c93faff (github_ci.py:755
  crash); fleet residue includes further stray conductor/ci-* refs and orphaned
  check-dark PRs. Cleanup belongs to the first authorized push-gate turn after
  recovery. rm-116's branch-protection fill stays blocked while checks cannot run. On
  any recovery signal, re-run the verbatim full_command (~5 min expected pass; tree
  unchanged).
- C5: the 2026-10-13 absorb decision stands as NO-ABSORB (roadmap-phase rider: 27-commit
  window, +4 all chore-class; the fork-side chores above fold into C2).

Preconditions carried forward: guard pin 822 stands (no mint this wave); review,
commit, push, PR and landing outcomes happen AFTER this phase by design — the next
cycle's assess consumes them.
