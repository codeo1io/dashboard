# Dashboard maintenance — repository-maintenance cycle 1 batch (2026-10-10, run 7f03c505)

module: dashboard
tags: `[reliability, performance, batch-record]`
problem_type: batch-record

Frame: base `eee2667` (== origin/main, re-probed live at prioritize time —
the same base the roadmap phase authored against after the mid-run contract-flip
landing; no further advance). Run `7f03c5059e3144ac8c9cb678a58d0afa`,
repository-maintenance cycle:1. Phases: assess `66aeecc4fbed40a581c86f982ee4fcc4`
(first-hand adversarial pass over every server module, the web client, the
vendored browser twins, Dockerfile, workflows), research
`7ede9cd5997a40feba832057c0b710fb` (upstream/ecosystem probes incl. the
GHSA-w293 non-applicability chain), roadmap `7d016bf595334f3a8a55014d6c74e4f2`
(extension: mints rm-900..903 + 5 riders, guard pin 866→903), prioritize
`aa4fa5076a074fd09ad22efa169c440f` (this document). Carrier patch:
`delegate/prioritize-aa4fa5076a074fd09ad22efa169c440f.patch` (this document +
the roadmap extension + the three status flips and selection riders).

## The cycle's mandate

One theme: **reliability of the failure paths.** The assessment verified the
happy paths of the gateway transport and snapshot machinery as heavily hardened,
but found the error branches leaking: unconsumed non-ok `Response` bodies
(undici socket retention — pool exhaustion under a gateway error storm),
frame parse failures logged-and-continued against a fail-closed docstring with
no dropped-frame signal, and a synchronous `writeFileSync`+`renameSync` snapshot
publish blocking the serving event loop every 60 s. All three members are THIS
RUN's own roadmap mints (`rm-900..902`, minted above the re-probed all-lineage
unlanded ceiling `rm-899` — no sibling can hold these ids), zero external
dependencies, zero time gates, and fully locally testable — decisive while
Actions run-creation stays enforced-dark (rm-832 rider, re-confirmed 05:00Z).

## B1 — rm-900: operator transport non-ok response bodies consumed/cancelled

`src/gateway/operator-client.ts` `fetchJson` consumes/cancels a body only on the
1 MiB cap path; every non-ok early return (`:600-606`) drops the `Response`
unread, and `src/gateway/operator-sse-reader.ts` error branches
(`:440/:447/:454`) do the same. undici documents that an unconsumed body retains
its socket until GC, so a 5xx/429 polling storm pins connections.

- Await `response.body?.cancel()` (or read-then-discard) on every non-ok exit in
  both modules before returning/continuing.
- Focused tests assert consumption per branch on a mocked non-ok `Response`
  (fetchJson non-ok; sse 404, 429, 5xx). Ok paths behaviorally unchanged.

## B2 — rm-901: sse-reader parse-failure semantics fixed to fail-closed

`operator-sse-reader.ts` ~`:490-495` logs-and-continues an unparseable frame
while the module docstring promises fail-closed; the operator UI then renders a
silently-degrading stream as healthy. **Decision fixed at selection**: the
docstring's fail-closed semantics win — an unparseable frame errors the stream
and the operator surface shows the failure (house fail-closed family). A
counter-only amendment is permitted ONLY if a conformance fixture proves a
frame-level continue is required, and then the docstring is amended in the same
change. A corrupt-frame conformance fixture covers the chosen branch either way.

## B3 — rm-902: async snapshot publish with the atomicity invariant pinned

`src/github/snapshot-store.ts` ~`:151` writes the ≤1 MiB snapshot synchronously
on the event loop every 60 s. Default design: tmp-file write via `fs/promises` +
`rename`; an invariant test pins that a concurrent reader observes either the
previous complete snapshot or the new one — never a partial write. No schema or
retention change. **Cessation after this member** (3 members, batch complete).

## Deliberately not in this batch (prioritize-phase rationale)

- **1.9.0 contract lane (rm-804 planning / rm-850 + cb6061a358f2 built content /
  rm-898 report-only)**: converge-at-integrate per the rm-157 rebase-disposition
  rider — every unlanded carrier predates the `['1.6.0','1.8.0']`→`['1.8.0']`
  flip and must be unioned onto `['1.8.0']` + `1.9.0` additive-only, never
  applied verbatim. Infra admits only `fro-bot/agent@v0.118.2` (first-hand this
  run), so nothing is broken today; rm-252's absorb decision is due 2026-10-13.
  Rebuilding the lane here would collide with two sibling claims on the same
  content.
- **rm-903 ledger archival/split**: coordinates the render directive, the guard
  and the census script in one batch — its own cycle, not a rider-of-opportunity.
- **rm-419 session-cache eviction residual**: the landed full-map reset was a
  deliberate revocation-latency decision recorded on that def; changing eviction
  semantics re-derives that decision — separate review, not this batch.
- **rm-169 ingest nonce residual**: decision-first (accepted-risk vs replay
  ledger under the single-operator threat model).
- **rm-760 dependency bumps (now age-eligible)**: deps-lane cadence (rm-842
  family owns the lane); the landed rm-760 riders already carry eligibility.
- **Sibling-built-unlanded lanes** (rm-599 healthz no-store, rm-601 aggregator
  dual-key, rm-513 Dockerfile healthcheck, rm-673 security.txt runway,
  rm-870-876, rm-895-899, …): fleet saturation — one owner per content, converge
  at integrate.
- **rm-116 branch-protection fill**: stewardship-gated sequence, and required
  checks are inert while run-creation stays dark.

## Verification plan (implement phase, focused per the validation budget)

- `pnpm check-types` rc=0; targeted eslint on every changed TS file.
- Focused suites: the new per-branch consumption tests (B1), the corrupt-frame
  conformance fixture (B2), the snapshot atomicity invariant (B3), plus the
  existing transport/timeout conformance suites (no regressions).
- Roadmap guards re-run after the flips (census 260 defs / 0 dups / max rm-903
  unchanged — flips do not move def counts); `ROADMAP.md` + this document eslint
  clean.
- Full `pnpm test` reserved for the full_tests gate per the validation budget.
- Tree hygiene: carrier applies at `eee2667`; authoring worktree restored
  pristine (porcelain 0).

## Implementation outcome (run 7f03c505, implement attempt 4276c23f, 2026-10-10)

Applied at base `eee2667` (the run branch fast-forwarded from e6b6a94 onto the
landed rm-252/157 contract-flip state, per the carrier's INTEGRATE OBLIGATION —
the carrier patch authored at eee2667 does not apply at e6b6a94).

**rm-900 (operator transport non-ok body consumption/cancellation)** —
`src/gateway/operator-client.ts`: new module-level helper `cancelResponseBody`
(best-effort `response.body?.cancel()` inside try/catch — a body that already
errored/closed rejects, and the error verdict stands either way); the fetchJson
non-ok branch awaits it before constructing the http error. The ok path (capped
read via `readBodyTextWithCap`, which already cancels on cap breach) is
untouched. `src/gateway/operator-sse-reader.ts`: the same response-level helper
plus `cancelReaderQuietly(reader)`; bodies cancelled on all four non-ok/refused
exits (404, 429, other non-200, 200-with-wrong-content-type — resource release
precedes onError/onClose), and the active reader cancelled on all three
mid-stream stop paths (parse-failure, contract-drift, buffer overflow).

**rm-901 (sse-reader parse-failure semantics)** — decision landed as fail-closed
(fixed at selection): `handleFrame`'s `!result.success` branch errors with the
fixed string `network error: stream frame failed validation` (never echoes wire
content), calls onClose, returns false. Module docstring states the contract.

**rm-902 (snapshot publish off the event loop)** —
`src/github/snapshot-store.ts`: publish path moved to `node:fs/promises`
(`writeFile` + `rename`; load stays sync + fail-open), serialized through a
`publishChain` promise (no interleaving on the shared `<path>.tmp`, newest
snapshot lands last), best-effort `unlink(tmp)` cleanup on the failure path,
returned promise resolves-on-disk and never rejects. `src/github/aggregator.ts`:
`SnapshotStore.persist` widened to `void | Promise<void>` (sync fakes stay
valid; the setSnapshot call site unchanged — fire-and-forget inside its
try/catch).

**Tests** (19 new + 1 expectation-moved + 3 await-updated):
`test/operator-client.test.ts` +3 (503 cancel with verdict control; per-status
400/404/429/500 release-exactly-once-per-fetch with a fresh Response per fetch —
launchRun's rm-485 refresh-and-resend on 400 otherwise conflates cancels; ok-path
control: read, never cancelled). `test/operator-sse-reader.test.ts` +12 (404/429/
500/wrong-content-type cancel-spies; release-precedes-surfacing ordering proof;
corrupt-after-ready anti-skip proof; no-echo marker proof; EOF-flush corruption;
malformed_unavailable fixture conformance — now asserting fail-closed; three
stop-path source-cancel propagation proofs on open-ended streams) and the
allowlist-gate test moved to the fail-closed expectation (retaining the
redaction no-leak assertion). `test/snapshot-store.test.ts` +4 (non-blocking
proof; serialized order + no tmp residue; concurrent-reader atomicity invariant
over ~100KB payloads) + 3 await updates.

**Verification (focused, per the validation budget)**:
- `pnpm check-types` rc=0.
- `npx vitest run` targeted: operator-client 191/191, operator-sse-reader
  159/159, snapshot-store 18/18, transport-timeout-contract 6/6,
  sse-parser.property 7/7 (381/381), aggregator 109/109 with
  aggregator-invariants.property (the fake-store seam absorbs the interface
  widening).
- Ledger: rm-900/901/902 flipped implemented with implement-attempt riders;
  rm-903 left open by design (decision-first). Guards/census re-run post-flip.
- Full `pnpm test` reserved for the full_tests gate.

**Prior-attempt forensics**: attempt 3f019ab3 (provider reap) left no typed
artifact and only heartbeat events; the tree was verified pristine at dispatch
(porcelain 0, e6b6a94) — nothing to adopt, phase redone from scratch.
