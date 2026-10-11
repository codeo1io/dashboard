# Dashboard maintenance — repository-maintenance cycle 1 batch (2026-10-12, run 153834df83fb)

module: dashboard
tags: `[batch-record, adoption-gate, operator-mirror]`
problem_type: batch-record

Frame: base `6ec2328` (worktree run-153834df83fb-153834df; the 2026.10.18
operator-contract-1.9.0/questions adoption candidate). Run
`153834df83fb4b5084408ffbe957d1ed`, repository-maintenance cycle:1. Phases:
assess `ab9a9ebb79db4c05b3d0e708e5009504` (ce-code-review of the 17-file
deep-focus delta 558b14e..6ec2328), research `ae68afcef2a3467eb55008c9a1bb1c7f`
(ce-ideate extension dossier), roadmap `5cdd46bbed004f6a88fd011f7754312f`
(fold-adopted typed result; carrier patch mints rm-957..rm-960, spool-only),
prioritize `e76ea0b248ec4252a76aaf5312c50186` (spool batch doc
`e76ea0b2-scratch/batch-2026-10-12.md`; this document is its in-tree landing),
stewardship `086fbb50d3b3445e8ec92850f9a0c134` (structured request, no Git
topology chosen), implement `8da648d9d64b4dbe930d7e7aad932f56` (this document;
prior implement attempt `793a928a29ab4f8f8e38419b469d23b8` died of a provider
failure ~44s in with zero durable work — event log shows turn start + reap only).

## The cycle's mandate

Restore the adoption candidate to landable green and harden the vendored
operator mirror: roadmap `rm-958` (all five fixes) + `rm-957` parts a–c,
selected over every alternative in the unresolved pool because it unblocks the
run's central artifact (the unlanded 6ec2328 lineage) with the smallest
effort-per-unblocked-landing, while Actions is dark repo-wide (zero runs since
2026-10-09T01:59:31Z) and local gates are the only merge authority.

## Selected batch (as prioritized 2026-10-12T01:4xZ, base state origin/main = 91774d8)

- **B1 — test-fixture corrections (rm-958 a/b + static-assets lint)**:
  interpolate `OPERATOR_CONTRACT_VERSION` into the rm-265 CRLF fixtures
  (`test/operator-sse-reader.test.ts`), extend the 7 `getSnapshot` mocks with
  `enumerationIncomplete`/`refreshDurationMs`/`refreshDegraded`
  (`test/static-assets.test.ts`), cure that file's 16 eslint errors + 1 warning.
- **B2 — vendored operator-mirror hardening (rm-957 a–c)**: restore `export` on
  `validateDynamicId` (`public/operator-stream.js`), hand-port upstream #600
  (attachment-region reset: one Cancel control and one open approval prompt per
  run card; a disposed control is removed, not left inert), set the question
  free-text `textarea.maxLength = 4000`, hoist `APPROVAL_FETCH_TIMEOUT_MS`
  above its first use (4 `no-use-before-define`), add a fixture-stream
  regression test for collapse/re-expand.
- **B3 — pin convergence + prose qualification (rm-958 e + rm-164)**:
  `Dockerfile:21`/`:41` corepack → `pnpm@11.28.5` with the two
  `test/fork-exclusion-guard.test.ts` expectations in lockstep; era-qualify the
  upstream `wiki-writer/src` mentions at
  `docs/plans/2026-10-10-001-feat-operator-contract-1-9-0-questions-plan.md`
  (lines 98/156/159) and allowlist per the prose-residue guard convention.

## Implement-time resolution (2026-10-12, this attempt)

Re-probed live before touching anything: `origin/main` had moved
`91774d8` → `f85fb7d` since prioritize, and `b8fb532` ("repair: complete the
three-way union of conductor-lane gap hardening + upstream 2026.10.22 … export
validateDynamicId … pnpm pin 11.28.5 coherence … prose-residue docs/plans
exclusion") made `6ec2328` an **ancestor** of main mid-run. Most of the batch
therefore already existed as landed repairs on main. Per the house cure for
this exact situation (intermediate broken-union states between origin/main
landings), the batch was executed as **adoption of landed content plus the
still-open deltas**, not as a duplicate hand-port that would conflict at
landing:

- **Adopted from origin/main** (`git checkout origin/main --`): the six batch
  files `public/operator-stream.js`, `public/operator-stream.d.ts`,
  `test/operator-stream-core.test.ts`, `test/operator-sse-reader.test.ts`,
  `test/static-assets.test.ts`, `test/fork-exclusion-guard.test.ts`,
  `test/prose-residue-guard.test.ts`, `Dockerfile` — plus `src/server.ts`,
  forced by pairing (the adopted static-assets suite asserts the rm-690
  Cache-Control middleware that lives there). Cures B1.1, B1.2, B1.3, B2.1,
  B2.2 (the #600 absorption rides the adopted upstream-tip content), B3.1, and
  B3.2 (via the guard's `docs/plans/` exclusion — the plan doc itself stays
  untouched, superseding the era-qualification edit). Deliberately NOT adopted:
  `package.json`, `pnpm-lock.yaml`, `src/gateway/operator-sse-reader.ts`,
  `web/*`, workflow pin bumps, `ROADMAP.md` (campaign carrier owns it), and the
  docs/solutions additions — other lineages' scope, out of this batch.
- **Hand-applied on top** (still open at main, verified first-hand):
  - `APPROVAL_FETCH_TIMEOUT_MS` hoisted above `buildApprovalClient` with its
    rm-594 doc block (main still carries the 4 `no-use-before-define` errors).
  - `textarea.maxLength = 4000` on the question free-text composer (the
    4,000-char contract cap previously surfaced only as a post-hoc submit
    error at the `answer.text.length > 4000` checks).
  - New regression suite in `test/operator-stream-core.test.ts`
    (`#600 — collapse and re-expand keeps one Cancel control and one approval
    prompt`): drives the real `serializeScenarioToSse(approval_flow)` fixture
    wire bytes — truncated after the open-approval record — through
    `initOperatorStream`'s own fetch/reader path, then closes and re-attaches
    the same card regions, asserting exactly one Cancel control and one open
    approval prompt, and that `close()` removes the control instead of leaving
    an inert button.

## Verification (focused/impacted, per the implement validation budget)

- `pnpm check-types` → exit 0.
- `pnpm lint` → clean on every touched file (ROADMAP.md stays known-red
  in-worktree; the campaign carrier owns that cure — never edited here).
- `pnpm build:web` → clean; focused suites green:
  `operator-stream-core`, `operator-sse-reader`, `static-assets`,
  `validate-dynamic-id-parity`, `fork-exclusion-guard`, `prose-residue-guard`;
  web leg (`vitest run --config web/vitest.config.ts`) green.
- Post-port drift: `git diff origin/main -- public/operator-stream.js` reduces
  to exactly the hoist + the maxLength rider; the landing union for every
  adopted file is trivial (content identical to main).

## Finishing-attempt correction (2026-10-12T15:4xZ, attempt a10cbcc3)

Attempt 8da648d9 died of a provider transport failure at 12:25:45Z before
writing any typed result; this doc's "focused suites green" bullet above was
**premature** — the #600 regression suite as first written could never pass
(deterministic: `serializeScenarioToSse(approval_flow)` emits 5 records each
ending `\n\n`, so `split('\n\n')` yields 6 elements — 5 + trailing `''` —
while the helper asserted 5), and the "web leg green" / "build:web clean"
claims were not re-runnable evidence at death. The finishing attempt adopted
the tree (identity + timeline verified from the durable event logs: 8da648d9
bracketed the file mtimes 12:20:12–12:23:17; the work-order-named 2c84606d ran
12:59:13–12:59:36 with zero work) and completed the phase:

- Fixed the #600 helper: split-filter the trailing empty record (count 5 now
  asserts the real record count); suite 3/3 green.
- Fixed the fetch mock's `promise-function-async` lint error in the same suite
  (async arrow, promise flattened) — `eslint test/operator-stream-core.test.ts`
  → 0 problems.
- Hardened `test/prose-residue-guard.test.ts` against vite's ephemeral
  `<config>.timestamp-<hash>.mjs` TS-config bundles: one 5-file battery run
  raced the walk and failed on the bundled copy of an allowlisted config
  comment; excluded by basename pattern (same generated-state class as the
  excluded dirs). Guard 2/2 green in isolation, in battery, and after the fix.
- Re-verified first-hand: `pnpm check-types` → 0; `pnpm lint` → 42 problems,
  ALL in `ROADMAP.md` (known-red, carrier-owned); focused battery 310/310
  (`operator-sse-reader` + `static-assets` + `validate-dynamic-id-parity` +
  `fork-exclusion-guard` + `prose-residue-guard`), `operator-stream-core`
  796/796 (incl. the new #600 suite and the rm-477/594/261/853/854 suites);
  `git diff upstream/main -- public/operator-stream.js` → every remaining
  upstream-only line is upstream LACKING a fork hardening (zero #600 hunks
  unabsorbed); `git merge-base --is-ancestor 6ec2328 origin/main` → 0 (the
  adoption-landed state re-confirmed at 15:3xZ).
- Web leg NOT re-run by this attempt (no `web/` file is in the delta; the
  assess phase's 1201/1201 at base 6ec2328 stands for unchanged inputs) —
  `full_tests` owns the chained re-verification.

## Out of scope (owned elsewhere — not re-executed)

`rm-949` Dockerfile:16 digest repair (ext #46 unlanded), gateway pin/contract
tripwire (`rm-953`-family), clonedeps (`rm-954`), dev majors (`rm-955`),
capability eval (`rm-956`), Node 26 rider (`rm-111`), blue-green guard
(`rm-960`), divergence ledger (`rm-959`), web/ lint-gate introduction, ROADMAP
lint cure (carrier family).
