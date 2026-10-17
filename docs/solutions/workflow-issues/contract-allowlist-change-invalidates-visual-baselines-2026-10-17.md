---
module: visual-tests
tags: [playwright, visual-baseline, operator-contract, fixtures, allowlist]
problem_type: test-infrastructure
---

# Contract allowlist changes invalidate visual baselines (operator-dark grew 966→3410px)

Date: 2026-10-17 · cycle-1 run bb09bc7bfe05 (rm-884, operator contract 1.9.0 → 1.11.0)

## Problem

After vendoring operator contract 1.11.0 (summary validator gains
`waiting_for_approval`/`waiting_for_question`), the `visual` CI check failed:

```
A snapshot doesn't match the screenshot recorded by test ...
Expected: 966px, received: 3410px
```

The operator-dark fixture page rendered ~3.5× taller — apparently a regression,
actually the batch's core semantic change made visible: the fixture harness
(`src/routes/operator-fixture-harness.ts`) exposes scenario rows whose run summaries
carry waiting statuses; at contract 1.9.0 the server-side `VALID_RUN_SUMMARY_STATUSES`
rejection FILTERED those rows out of the Recent Runs list before rendering, so the
visual baseline never contained them. At 1.11.0 they render (~15 additional rows plus a
new approval scenario group, `FIXTURE_APPROVAL_SCENARIO_ROWS` — which did not exist at
the pre-batch base). The harness route's own comments state the rows exist "so each is
selectable in the assembled UI" — the richer list is intended.

## Diagnosis recipe (no image reading needed)

1. Reproduce locally: `pnpm exec playwright test tests/visual/dashboard.spec.ts --grep "operator view" --reporter=line`.
2. Read `test-results/<spec>/error-context.md` — Playwright's DOM snapshot shows the
   actual page structure (look for unexpected sections/rows).
3. Trace the rendered strings to their source (grep the DOM snapshot's data-testids).
4. Ask: did the summary/stream allowlists change in this batch? Visual fixture pages
   are downstream of contract validation — a validator change is a fixture-set change.

## Fix

Regenerate the baseline deterministically and KEEP it with the batch commit:

```bash
pnpm exec playwright test tests/visual/dashboard.spec.ts --grep "operator view" --update-snapshots
# determinism proof: copy the PNG aside, regen again, `cmp` — must be byte-identical
```

The operator-dark baseline went 86KB → 333KB. Two regens compared `cmp`-identical
(deterministic renderer), so this is a legitimate new intended state, not flakiness.

## Prevention rules

- Any change to `VALID_RUN_SUMMARY_STATUSES` / stream allowlists / fixture scenario
  rows in `src/gateway/operator-fixture-sse.ts` or the harness route is a
  **visual-baseline-touching change** by definition — expect the regen and include the
  PNG in the same commit or visual CI stays red.
- Never "fix" a height-diff visual failure by reverting the allowlist change to match
  the old baseline when the acceptance says the allowlist changed on purpose.
- Always prove determinism (regen twice, `cmp`) before accepting a new baseline;
  a flaky renderer produces different bytes and must be fixed, not snapshotted.
