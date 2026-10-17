---
title: Monitoring API payload fields must mirror the web whitelist in the same change
date: 2026-10-08
category: best-practices
module: dashboard
component: monitoring-api-contract
problem_type: best_practice
severity: medium
---

# Monitoring payload fields must mirror the web whitelist in the same change

## Problem

The server's `/api/monitoring` payload grew `refreshDegraded` and `refreshDurationMs`
(`src/routes/api.ts:50-52`, `:78-79`) as part of the monitoring refresh-contract work, but the
web client's `MonitoringData` whitelist (`web/src/api/monitoring.ts`) silently dropped both
fields. Consequence: the operator's Monitoring view never learned the refresh loop was degraded
— the exact truth the fields exist to carry — and **no test failed**, because:

- server-side suites assert on the emitted JSON (green — the fields WERE emitted), and
- web tests only assert on fields the whitelist parses, so an unparsed field is invisible to
  `web/src/api/monitoring.test.ts` and `web/src/views/Monitoring.test.tsx`.

`test/endpoint-parity-guard.test.ts` cannot catch this class: it pins docs ↔ Hono app routes
bidirectionally (see `endpoint-parity-guard-app-routes-recipe-2026-10-04.md`); there is no
server-payload ↔ web-whitelist parity guard.

Found by `rm-107` assessment (2026-10-07, run `6277460ed8bd` prioritize); fixed by the
`rm-107` SMALL slice landing 2026-10-08 (whitelist-add + `monitoring-refresh-degraded-banner`
with the `95.0s` duration pin + paired web tests). The feature-scale remainder of `rm-107`
(per-repo surfacing, richer degraded UX) stays open in the ledger.

## Rule

Any change that adds (or renames) a field in the `/api/monitoring` (or any operator API) payload
MUST, in the same change:

1. add the field to `web/src/api/monitoring.ts` — both the `MonitoringData` interface AND its
   parse section (the whitelist is two places by construction);
2. extend the paired web tests (`web/src/api/monitoring.test.ts` parse case +
   `web/src/views/Monitoring.test.tsx` consumer reaction case) so the field is pinned at both
   layers;
3. grep the sibling consumers for hand-rolled parses of the same payload before assuming the
   whitelist is the only reader.

## Verification recipe (focused, no repo-wide suite needed)

```
node_modules/.bin/vitest run --config web/vitest.config.ts src/api/monitoring.test.ts src/views/Monitoring.test.tsx
node_modules/.bin/vitest run test/server.test.ts
```

If the server emits it and the web pair has no case for it, the field is dropped — treat that
gap as a contract regression, not a cosmetic gap.
