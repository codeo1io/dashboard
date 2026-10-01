# Actions Cache Hygiene

This repository's GitHub Actions cache pool is a shared, quota-bound resource.
The 2026-09-30 live census (run ba122f21835b, rm-278) measured 129 active
caches / 10,715,986,719 bytes against GitHub's documented 10 GB per-repo
ceiling — the pool is at quota, so GitHub is already evicting caches on every
save. A re-probe on 2026-10-01 read 10.07 GiB / 130 active caches: still at
quota.

Composition by key prefix (stable across both probes): `node-` dominates
(~60-90% of bytes), then `codeql-`, then `cache-` (setup-pnpm) and `trivy-`.

This runbook covers the prune policy and its script. Read it before deleting
anything: the wrong prune regresses the opencode bootstrap (below).

---

## The keep-invariant: never delete `opencode-` caches

`scripts/actions-cache-prune.ts` hard-protects every cache whose key starts
with `opencode-`. This is asserted in-script three ways:

- the plan builder routes protected keys out of the deletion set using the
  module constant, so no argument combination can plan one for deletion;
- a fail-closed assertion re-checks the deletion set against the module
  constant and throws (`keep-invariant violation`) instead of deleting;
- the CLI refuses (exit code 2) any `--prefix` that overlaps `opencode-`,
  including shorter (`o`) and longer (`opencode-x`) overlaps.

Why: opencode caches carry the repaired bootstrap database (see
`docs/solutions/workflow-issues/opencode-bootstrap-timeout-cache-purge-2026-08-31.md`
and AGENTS.md). At the 2026-10-01 probe the pool happened to hold zero
`opencode-` caches; the invariant still matters because any future opencode
work recreates them.

---

## Prune policy

Prune by key prefix, aged first, dry-run by default:

- Prune targets: `node-`, `codeql-`, `cache-`, `trivy-` (the census families).
  Explicit `--prefix` flags replace the default target set and repeat
  (`--prefix node- --prefix codeql-` prunes both).
- Age floor: only caches strictly older than `--older-than-days` (default 7)
  are prunable, so in-flight runs keep their fresh caches.
- Deletion is per cache id, never by key — a mistyped prefix cannot
  bulk-delete a family it did not name.

```bash
node scripts/actions-cache-prune.ts                    # dry-run projection
node scripts/actions-cache-prune.ts --apply            # actually prune
node scripts/actions-cache-prune.ts --older-than-days 0   # full reclaim
node scripts/actions-cache-prune.ts --prefix trivy- --json
```

Exit codes: `0` success (dry-run plans are success), `1` usage/API error,
`2` keep-invariant refusal. The script shells out to `gh api`, so it inherits
the caller's `gh` auth; there is no token handling in-repo.

Counting skew: `/actions/cache/usage` and a full `/actions/caches` listing can
disagree by a few caches (130 vs 132 at the 2026-10-01 probe) — usage lags
evictions. Trust the listing for planning and usage for the total.

---

## Measured projections (2026-10-01)

Both numbers came from live dry-runs against the real pool:

- Default floor (7 days): 12 caches / 825.8 MiB prunable, projecting the pool
  from 10.07 GiB to 9.27 GiB. The pool is dominated by *fresh* caches from
  active runs, so the conservative floor alone does not reach the rm-278
  acceptance target of a post-prune pool under 8 GiB.
- Zero floor (`--older-than-days 0`): all 132 target caches / 10.07 GiB,
  projecting an empty pool. That is the documented full-reclaim escape hatch
  for when Main's cache saves are failing on quota pressure; expect the next
  Main run to repopulate `node-` caches from scratch (slower first run).
- Implement-time verification (2026-10-01, cycle-1 batch): the dry-run after
  the script landed re-probed the live pool at 9.98 GiB / 131 listed caches
  (node- still dominant: 90 caches / 7.72 GiB) and planned 5 caches /
  355.2 MiB → projected 9.63 GiB, with 0 `opencode-` caches present and 126
  caches fresh-skipped by the 7-day floor.

The standing recommendation is the default floor: prune stale families, keep
fresh ones, and only reach for the zero floor during an active quota incident.
The rm-278 acceptance's under-8 GiB state is reachable via the zero floor or
by reducing what Main saves in the first place (the F4 design note's chunked
bootstrap constraint, tracked in ROADMAP rm-278).
