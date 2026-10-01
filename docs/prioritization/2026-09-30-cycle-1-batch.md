# Dashboard maintenance — cycle 1 batch (2026-09-30)

Run `ba122f21835b4a1c8321e47537bdab0a`, attempt `f01da1c87c52462d8f914a55a0a8afc2`.
Base: main `31995a2` (ledger at HEAD: 154 items, max `rm-275`, 0 duplicates —
object-store referee; two bash censuses claiming 227/max `rm-277` were crossed
outputs). Inputs: assess (1097/1097 tests green, 3 findings), research (7
candidates, live probes), roadmap extension #7 (rm-278, rm-279 — embedded in the
`22dce77c` result JSON after the infra sweeper reverted all file channels).

## Open stack summary

31 open candidates of 154 (object-store census). External blockers dominate the
top of the stack: rm-106 (gateway digest — send side absent at v0.117.0),
rm-108 (typescript-eslint peer `<6.1.0` blocks TS 6.1+/7), rm-139 (Node 26 LTS
lands 2026-10-28), rm-13640-line lint throughput (GitHub-hosted compute epoch —
time cure, not repo surgery). rm-117 needs an operator-side GitHub App
permission registration before any code can be proven end-to-end.

## Priorities

| id | impact | risk if skipped | effort | dependencies | strategic value | selected |
|---|---|---|---|---|---|---|
| rm-279 | medium — UI promises live alerting that cannot fire | operator trust erosion on a shipped surface | S | none (pure repo) | completes the rm-272 copy-truthing pass | yes |
| rm-278 | high — cache pool at 10.72 GB vs 10 GB quota, eviction-on-save active | F4 lint cure headroom shrinks with every push; opencode- caches at eviction risk | M | none (gh API + policy doc) | protects the bootstrap constraint recorded in the ledger | yes |
| roadmap ext #7 re-materialization | high — the +53-line ledger edit (sha `5bb0c2a8`) exists only in the `22dce77c` JSON after sweeper reverts | cycle loses its own record; rm-278/279 have no ledger home | S | none (content authored + verified byte-identical) | makes the cycle self-consistent | yes |
| rm-117 | medium | security posture panel stays partial | M | operator App registration (external) | completes rm-117 axis | no — cannot be completed end-to-end this cycle |
| rm-106 | high | daily digest stays absent | M | gateway release (external) | unblock recorded 2026-09-30 | no — blocked-external |
| rm-108 | medium | TS pin ages | S | typescript-eslint v9 (ecosystem) | none actionable | no — blocked-ecosystem |
| rm-139 | medium | runner image drift | S | 2026-10-28 LTS date | none actionable | no — timing |
| rm-133 re-eval | low | majors stay pinned | S | scheduled 2026-10-21 | already dated in ledger | no — scheduled |

## Selected batch B (theme: truth and hygiene)

1. **rm-279 — truth the subscribed-state copy.** Change
   `web/src/views/notifications-copy.ts:39-44` so the `subscribed` state no
   longer promises `Alerts Active` / live monitoring (the shipped client has
   zero push listeners and a self-unregistering kill-switch SW). Acceptance:
   copy names what actually works (subscription registered, delivery pending
   gateway digest), tests updated, `pnpm check-types` green, targeted vitest
   green.
2. **rm-278 — Actions cache hygiene policy.** Deliverable: a runbook + prune
   script (gh API) enforcing keep-invariants: preserve all `opencode-` caches,
   prune stale node/codeql caches by prefix + age, print before/after census.
   Acceptance: dry-run output against the live repo shows ≤10 GB projection,
   script is read-only by default, policy documented in docs/runbooks/.
3. **Re-materialize roadmap extension #7.** Re-apply the byte-identical
   ROADMAP.md edit (verify sha `5bb0c2a8…`) from the `22dce77c` JSON content so
   rm-278/279 exist in the ledger the batch cites.

## Not selected (rationale recorded above)

rm-106, rm-108, rm-117, rm-139, rm-133 re-eval — all blocked on external
actors, ecosystem, or scheduled dates; selecting them would produce a batch
that cannot complete end-to-end this cycle.

## Verification

- rm-279: `pnpm check-types` (3 projects) + targeted vitest on notifications
  suites; grep confirms no `Alerts Active` promise remains in the shipped copy.
- rm-278: prune script `--dry-run` against live repo prints census + projection;
  keep-invariants asserted in-script (opencode- caches untouched).
- ext #7: `sha256sum ROADMAP.md` == `5bb0c2a8…`; census 156 ids / max `rm-279`.
