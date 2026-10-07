---
module: dashboard
tags: [repository-maintenance, sse, operator-stream, roadmap-extension]
problem_type: batch-record
---

# Repository maintenance batch (2026-10-08, run 34b027811b0e4e16920bf5d144f9ee67)

Selected batch: **Operator SSE truth — one parser, spec-legal frames, live-stall watchdog**
(prioritize artifact: `delegate/34b02781-619c6efe-scratch/prioritization-2026-10-08-run-34b02781-batch.md`;
rejection ledger and full unit specs live there).

Implement-time base: `5aab7c7` == origin/main (the prioritize phase selected at
`a9576e3`; main advanced once in between via the run-b2a3ae9b landing — the SIGPIPE
cure, docs, and the rm-690/691/692 mints — none of which touched any SSE surface;
diff `a9576e3..5aab7c7 -- <SSE files>` is empty). Worktree ff-advanced
`25d32be → 5aab7c7` before edits.

## Unit 1 (LEAD) — rm-114: SSE record parser extracted to ONE shared source

**Shape decision.** The browser twin (`public/operator-stream.js`) is served raw
from `public/` with no build step (per-file `serveStatic` mounts in `src/server.ts`
— a new shared served file would collide with the ×4-held server.ts composition
seams), so it cannot import TS. The chosen shape is a canonical TS module plus a
**generated, type-stripped embed** in the twin:

- `src/gateway/operator-sse-syntax.ts` (NEW) — the canonical wire-syntax layer:
  `MAX_SSE_BUFFER_BYTES`, `sseUtf8ByteLength` (UTF-8 byte-cap unit), `normalizeCrlf`,
  `appendStreamChunk` (rm-477 pending-CR hold), `parseSseRecordFields` (rm-484
  multi-`data:` join, WHATWG §9.2.6).
- `scripts/gen-operator-sse-syntax.ts` (NEW) — deterministic generator:
  single-pass `ts.transpileModule` + value-export flattening + emit-style →
  twin-style (4-space→2-space, semicolons→none). `--check` mode for CI-style use.
- `public/operator-stream.js` — the generated block embedded between
  `SSE-SYNTAX-GENERATED` markers; the twin's inline copies of all five primitives
  DELETED; parser/loop now call the shared names (cap accounting switches from a
  local `TextEncoder` to `sseUtf8ByteLength`).
- `src/gateway/operator-sse-reader.ts` — imports the canonical module directly;
  its inline `normalizeCrlf`/`appendStreamChunk`/`MAX_SSE_BUFFER_BYTES` local
  definitions removed; `MAX_SSE_BUFFER_BYTES` re-exported for the historical test
  import surface. Line-level record parsing replaced by `parseSseRecordFields`
  (event/data collection) + the reader's own semantic half (allowlists, JSON
  gate, typed frames).
- `test/operator-sse-syntax-divergence.test.ts` (NEW) — the hard gate: the
  embedded block must be byte-identical to the generator's output, the reader
  must import (not re-define) the primitives, no last-wins `data:` overwrite may
  reappear, and both halves must agree on every primitive over a fixed corpus
  (CRLF/CR, chunk-split pairs, multi-`data:`, astral, heartbeats).

Verification: `pnpm vitest run test/operator-sse-syntax-divergence.test.ts` → 4/4.

## Unit 2 — rm-484: last-wins `data:` overwrite cured to the spec join

Both twins overwrote `dataLine` per record line, so a record whose JSON payload
crossed a `data:` line boundary parsed as ONLY the last fragment. Both now join
all `data:` values with U+000A (the join lives once, in the canonical syntax
layer). Note on JSON legality: the reassembled payload parses when the wire
split fell at a JSON-whitespace-legal position (between tokens — a raw U+000A is
insignificant JSON whitespace); a split inside a string literal produces an
unparseable payload, which the semantic layers reject fail-closed (one fixed
no-oracle error) — that is recorded as the intended behavior, not a defect.

Tests: two seeded regressions through the twin's `parseSseFrame`, two through the
server reader's `parseSseChunk`, one cross-half property (N fragments →
byte-exact join, `fc` 200 runs).

## Unit 3 — rm-220: live-stall idle-frame watchdog (Last-Event-ID declined)

`IDLE_FRAME_TIMEOUT_MS = 45_000` (> `FIRST_FRAME_TIMEOUT_MS`): a connection that
receives NO record (data frame or comment-only heartbeat) for the window is
wedged-but-open. The watchdog: arms per connection attempt; re-arms on every
received record boundary; on fire — guarded against terminal-ish states exactly
like `unexpected-close` — sets a visible `Stream stalled — reconnecting…` notice,
aborts the wedged socket, and reconnects on the bounded retry budget. Cleared at
every teardown site (done, read error, network error, buffer overflow, close());
re-live clears the stall notice.

**Last-Event-ID declined** (recorded on rm-220, per the batch doc's disposition):
no `id:`/`Last-Event-ID` fields exist anywhere in this contract
(`git grep -ci last-event-id` → 0 across the twins and the server route), the
server emits no `id:` lines, and inventing a replay/resume token is a new
cross-surface contract obligation (server change) beyond this client-side
truth unit. The reconnect gap is covered by the existing approvals-reconcile
pass on re-live — approvals are the only state that mutates operator decisions;
output text is append-only history that the run page refetches wholesale.

Tests: 3 reducer tests (guard set, exhaustion, pre-first-frame) + 2 integration
tests (heartbeats keep a quiet stream live 90s; silence −1 ms still live, +1 ms
stalls visibly, aborts, reconnects; re-live clears the notice).

## Unit 4 — rm-253 disposition rider (roadmap lane, no code)

rm-253 ("wire it or fold it") time-boxes rm-114's extraction against rm-252's
contract growth. This batch executes the wire-half of the time-box: the syntax
layer is now shared, so a future contract bump lands once. The fold-vs-wire
decision for the reader's semantic half stays OPEN with a sharpened premise
(one definition site now exists; what remains twin-specific is the semantic
allowlist layer only).

## Unit 5 — mandatory roadmap-extension ride (zero-mint)

The composed extension (`roadmap-34b02781-15e54270.patch`, base a9576e3) applied
at 5aab7c7: 6 hunks clean, 2 re-placed manually for base drift — the extension
comment now sits AFTER the 2026-10-08 INTEGRATE comment (8921afd9/c8a2edd) with
its census claim re-derived to the apply-time truth (232 defs / 0 dups /
max rm-692, guard pin unchanged at 692), and an R1 STATUS UPDATE line records
that the SIGPIPE cure the extension carried landed in the interim. Seven dated
riders land (R1 recorded-in-comment, R2-R7 on rm-137/252/271/280/253/144 blocks
via hunks). Zero mints; census before == after (232/0/692).

Verification: `node scripts/roadmap-census.ts` → 232/0/692 healthy;
`pnpm vitest run test/roadmap-integrity-guard.test.ts` → 8/8;
`eslint ROADMAP.md` → rc=0.

## Verification map (this phase, focused battery)

- `pnpm vitest run test/operator-stream-core.test.ts test/operator-sse-reader.test.ts test/sse-parser.property.test.ts test/operator-sse-syntax-divergence.test.ts test/roadmap-integrity-guard.test.ts`
- `pnpm check-types` (3 tsconfigs incl. the hand-maintained `public/*.d.ts` twins
  — updated for the new exports)
- `eslint` over every touched file + the batch doc
- Divergence gate self-test: mutate → gate fails → regenerate → gate passes
  (recorded in the implement session log)
