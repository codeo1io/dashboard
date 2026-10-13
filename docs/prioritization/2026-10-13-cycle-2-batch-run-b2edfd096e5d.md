# Repository-maintenance cycle:2 implementation batch — run b2edfd096e5d48e6b03caac66aa11d69

Attempt 8274f89f8457496598525c0c47c2eb7c, 2026-10-13. Batch "two truths: green gates + one
contract" (selected in prioritize 0633f1ff, described in stewardship e5d0bf7e). Worktree
`run-b2edfd096e5d-b2edfd09` @ base 6ec2328; delta UNCOMMITTED by design (landing is a later
gate). Actions are repo-dead (latest run 2026-10-09T01:59:31Z), so every gate below ran locally.

## Unit A — union-adopt origin/main 6acea88

`git checkout refs/remotes/origin/main -- .` over the pristine 6ec2328 tree (40-file divergence
ingested; b8fb532's repair of the 6ec2328-era red set rides in). Anchor verified: post-adoption
`git diff refs/remotes/origin/main` = EMPTY (0 files) before Unit B edits.

## Unit B — green-gate cures (all red at main 6acea88, all cured byte-minimally)

- B1 `web/src/index.css:792` — stray `[data-role="run-output-coalesced"] {` opener deleted (the
  real rule at :793 was being swallowed; whole-file braces were 235/234). Proof: `pnpm build:web`
  now exits 0 (was CssSyntaxError → `pretest` killed the entire `pnpm test` chain and the Docker
  builder).
- B2 `web/src/operator/runtime.ts:378` — `gapEl` added to the `discoverCardStreamTargets`
  destructure (passed at :392 since main). Proof: check-types leg 2 green; web runtime +
  stream-reattach 62/62.
- B3 `public/operator-stream.js` — `APPROVAL_FETCH_TIMEOUT_MS` (const + rm-594 doc comment)
  hoisted above its first use (:2018 region, JSDoc for `createOperatorApprovalClient`). Proof:
  eslint reports 0 on the file (was the only 4 lint errors at main: no-use-before-define).
- B4 `Dockerfile:16` — repinned to the LIVE digest
  `sha256:173f125896c3b47ddf056734c7ea789d04595a6a08769a8f78e0df642781fb66`
  (registry probe 2026-10-13; the pinned `173f125896c3087...be6f9b6` string 404s). NARROWED from
  the stewardship plan: main's corepack literals at :21/:41 already read 11.28.5 (the 11.28.3
  evidence predated the adoption), so no corepack edit was needed.

## Unit C — operator-contract 1.9.0 → 1.10.0 @ pin v0.121.0 (the rm-987 batch)

Measured first via compare API v0.119.1...v0.120.0 (contract source delta ≈ 119 lines;
v0.120.0...v0.121.0 is contract-neutral, so the pin advance is free). Ported:

- `src/gateway/operator-contract/version.ts` — const → '1.10.0' + changelog block worded under
  the single-literal conformance rule (no bare version in comments).
- `public/operator-stream.js:33` — `PINNED_CONTRACT_VERSION` → '1.10.0' (d.ts types it as
  `string`; no lockstep needed there).
- `responses.ts` — `OperatorSessionInfo.push?: OperatorPushHealth`;
  `OPERATOR_PUSH_HEALTH_STATUSES` ('ready' | 'degraded' | 'unknown'); `OperatorPushHealthStatus`;
  `OperatorPushHealth {status}`; `OPERATOR_PUSH_TRIGGER_KINDS` ('approval' |
  'question' | 'run_failed' — corrected in attempt f483f0d0: the 8274f89f port had invented
  'approval.requested'/'question.requested' and dropped 'run_failed'; upstream v0.120.0/v0.121.0
  raw source is authoritative); `OperatorPushTriggerKind`.
- `parse.ts` — shape guard refactored to `Omit<OperatorSessionInfo,'push'> & {push?: unknown}`;
  new `hasValidOperatorPushHealthShape`; `parseOperatorSessionInfo` now RECONSTRUCTS the object
  and DROPS a malformed optional `push` instead of rejecting the session (upstream semantics).
- `index.ts` — type + const re-exports for the new surface.
- `output.ts` — ported the delta-separator doc note (blank line inserted once by the producer).
- `src/gateway/operator-fixtures.ts` — `FIXTURE_SESSION_WITH_PUSH` parity fixture (push
  'ready'), flowing into the loopback-only harness via `SessionDto`.

## Unit D — the cross-check tripwire (NEW test/operator-contract-version-truth.test.ts)

Offline fixture map `{v0.119.1: '1.9.0', v0.120.0: '1.10.0', v0.121.0: '1.10.0'}`; four tests:
workflow pin is mapped; server const matches the map; vendored pin matches the map; the two
in-repo pins agree. RED-PATH PROOF (required): flipping `version.ts`'s literal alone reddens
2/4 tests (`server-side ... matches` + `the two in-repo pins agree`); restore → 4/4 green. This
is the test PR #612 would have reddened.

## Unit E — prose-residue flake cure (#18044)

`test/prose-residue-guard.test.ts`: new `EXCLUDED_BASENAME_PATTERN = /\.timestamp-\w+\.mjs$/`
applied in `isExcluded` via `segments.at(-1)`. Multi-file battery below exercised the walk
concurrently (the flake's precondition).

## Unit F — roadmap carrier + landing rider

Applied the e8d1210b roadmap extension (byte-identical to the delivered postimage: 237 defs /
0 dups / max rm-1011) and appended the dated implement rider to rm-132 recording the adoption
landing, gate cures, and the tripwire (status flips remain with the owning integrate).

## Focused verification (validation budget: impacted suites only)

| gate | result |
| --- | --- |
| eslint (11 touched .ts/.js files + ROADMAP.md, repo-pinned eslint) | 0 problems |
| `pnpm check-types` (server + web + .opencode legs) | exit 0 |
| `pnpm build:web` | exit 0 |
| vitest server: contract-conformance + run-responses-parse + version-truth | 200/200 |
| vitest server: fixture-harness + fixture-sanitization + stream-core + sse-reader + prose-residue + fork-exclusion + base-drift-digest-readback | green (1467/1468 pre-literal-fix; the 1 failure was the conformance single-literal rule catching my comments — cured by rewording, 200/200 after) |
| vitest web: runtime.test.ts + stream-reattach.test.ts | 62/62 |
| Unit D red-path | 2/4 red on flip → 4/4 green on restore |

All vitest runs with `TMPDIR=/tmp` (delegate-TMPDIR git-repo trap). Node v22.22.0 emits only
the engines warning (wanted >=24).

## Reserved for the validation gate (NOT run here)

Full `pnpm test` two-leg sweep, full `pnpm lint`, actionlint container pass, Dockerfile digest
re-probe replay, and the final diff-vs-origin/main census (expected: only this batch's
new-content files beyond the adoption).

## Hygiene

No scratch files in the repo (all under the delegate spool). New files: the tripwire test +
this doc. Everything else is the adopted-main content + the batch edits above.

## Addendum — attempt 81ccf380 closeout (2026-10-13 ~05:3xZ)

This attempt ADOPTED the cumulative uncommitted delta of the two transport-dead
implement attempts on this action (verified by mtimes + event logs; neither wrote a
typed envelope) and CLOSED it to verified green:

- **8274f89f** (2026-10-12 23:4xZ–00:03Z): executed Units A–F end-to-end and authored
  the rm-132 rider above; its battery claims were re-run fresh below.
- **f483f0d0** (2026-10-13 03:22:36–03:49:57Z, reaped `order_exit: No module named
  'openai'` mid-red-path): corrected OPERATOR_PUSH_TRIGGER_KINDS to the upstream
  values ('approval' | 'question' | 'run_failed') and authored this doc's trigger-kind
  correction, then died mid-proof leaving TWO un-restored mutations, both repaired
  this turn:
  1. `.github/workflows/fro-bot.yaml:347` pin line blanked to a bare `uses: ` —
     restored to the adopted-main content
     `fro-bot/agent@50b5dd41297f8a928914006b8f8c872c4ab3bb14 # v0.121.0`; the file is
     now diff-clean vs origin/main (adoption discipline preserved).
  2. a fabricated `'v0.999.0': '1.10.0'` entry in the truth map (releases API 404s on
     the tag) — removed; the map is exactly the three verified releases again.
- **Id-coherence corrections** (this turn): the truth suite's describe block said
  `(rm-1015)` — no such def exists in this ledger (post-mint census: 237 defs / max
  rm-1011; rm-1012..1014 are sibling-lane claims, next free rm-1016) and the doc's
  own rule is "NOT a new ledger mint" — corrected to `(rm-987)`, the ext-#43 def this
  batch implements. This doc's Unit F section said the rider landed "on rm-252";
  it sits on rm-132 — corrected above.
- **Fresh first-hand verification (this attempt)**: `pnpm build:web` RC0; `pnpm
  check-types` RC0 all three legs; eslint 0 errors on every touched file; focused
  vitest server battery 10 files **1468/1468** (conformance, run-responses-parse,
  version-truth, fixture-harness, fixture-sanitization, stream-core, sse-reader,
  prose-residue, fork-exclusion, base-drift-digest-readback); web leg 2 files **62/62**
  (runtime + stream-reattach); red-path proof re-proven (version.ts literal flipped
  '1.10.0'→'1.10.1' reddens exactly 2/4 truth tests, restore returns 4/4 green);
  Dockerfile:16 digest re-probed live via the registry auth-token path →
  `sha256:173f125896c3b47ddf056734c7ea789d04595a6a08769a8f78e0df642781fb66`, identical
  to the pin. All runs under TMPDIR=/tmp (host node v22.22.0, engine warning only).
- **Census at close**: tree diff vs origin/main 6acea88 = exactly the 12 deliberate
  batch files + 2 new (this doc, the truth suite); adoption files byte-equal to main;
  ROADMAP.md = e8d1210b postimage + the single rm-132 implement rider (one added line
  vs postimage).
