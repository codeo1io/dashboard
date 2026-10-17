# Dashboard maintenance batch (2026-10-08, run 6277460ed8bd) — repository-maintenance cycle 1

Selected 2026-10-07 (run 6277460ed8bd prioritize); implemented 2026-10-08 at base `e8d220c`.
Rationale and claim-map method preserved from the prioritize selection doc (spool);
this is the canonical in-tree batch record for the landing.

- **Selected:** `Operator monitoring truth + public posture completion` — 3 change-units, one landing.
- **Method:** claim map built from ALL dashboard prioritize typed results (fresh + historical) +
  live dirty-worktree sweep (17 walls) + 971a8199's 2026-10-07 17:00Z congestion audit; file/content
  facts verified against `origin/main` `5aab7c7` (worktree tree was one landing stale — implement
  fast-forwarded first, `a9576e3` → `5aab7c7` → `f66e547` → `e8d220c`).
- **Context:** fleet congestion near-total — 8+ unlanded dashboard batches hold nearly every
  high-priority surface (`src/server.ts` held by 4 standing compositions). This batch won the two
  free lanes (web monitoring + robots posture) plus the report-only extension ride.

## U1 — LEAD `rm-107` SMALL slice: monitoring truth whitelist completion

`web/src/api/monitoring.ts` `MonitoringData` whitelist-add `refreshDegraded` / `refreshDurationMs`
(fields emitted at `src/routes/api.ts:50-52` / `:78-79` since the contract work; the whitelist
silently dropped them — operator-invisible degraded state). Banner slice in `Monitoring.tsx`
(`monitoring-refresh-degraded-banner`) with the `95.0s` refresh-duration pin. Per-repo surfacing
and richer degraded UX remain open — `rm-107` stays OPEN (feature-scale remainder).

## U2 — `rm-713`: public `robots.txt` (RFC 9309 whole-site Disallow)

`/robots.txt` (+ `/robots.txt/` twin) served via the `rm-245` exact-match `isPublicPath` family in
`src/server.ts`, inline RFC 9309 `Disallow: /` for all user-agents (no crawl expectations for an
operator-only dashboard). New `test/robots-wellknown.test.ts` (6 cases) + README endpoint-table row
(`rm-556` parity). Resolves `rm-713`.

## U3 — extension #35 ride: `ROADMAP.md` ext #35 census comment + records

3-way union of ext#35 onto `e8d220c` (priorities: no-anchor-add > earlier-entry > NEW anchor-add);
ext#35 census comment placed after the `9c3e8f4` INTEGRATE record to own the newest-claim slot;
census `235/0/rm-744`; guard pin stays `744` (`712`/`713` below); `rm-713` → implemented; riders on
`rm-107` + `rm-712`.

## Landing notes

- Base at implementation: `e8d220c` (== `origin/main` at 05:03Z, stable). `origin/main` advanced
  twice during validation — `9aceea8` (run 5b333105 integrate) then `b658cb60` (runs 23edabab +
  a94d0659 integrates; the latter lands the trixie re-pin as `rm-698`, resolving this batch's
  `rm-712` disposition to fold-by-content at integrate). Compound-time fold check (2026-10-08):
  fresh `diff3` (base `e8d220c`, ours this tree, theirs `b658cb60`) merges `src/server.ts` CLEAN —
  rc=0, zero conflict markers; `README.md` and the four `web/` files are main-untouched since
  `e8d220c` (single-sided); `ROADMAP.md` is the only chronological-union file.
- Fence honored: `Dockerfile` / `base-drift.yaml` untouched (trixie content = sibling `a94d0659`'s
  unlanded `rm-698`; fold by content at landing).
- Untracked-but-new `test/robots-wellknown.test.ts` rides the landing (validated in CI via the
  temp-index capture; server suite grew 60 → 61 files).

## Outcome (2026-10-08, post-validation)

- Implementation: 7 modified files + 1 new test, 181 insertions at `e8d220c`. Redelivery chain:
  `e26f912c` (reaped mid-implement, left residue) → `1b698661` (adopted + completed, transport-lost,
  result lacked changed-surfaces attestation) → `be646830` (re-verified live, re-emitted WITH
  attestation; no re-implementation).
- Targeted (attempt `bb502a3a`): engine impacted-tests runner — 20 files / 740 tests passed; focused
  supplements 14 (robots + roadmap guard) + 22 (web monitoring pair) passed.
- Full (attempt `802b2fc9`): ephemeral-PR cloud CI **PR #441** — 11/11 checks SUCCESS (Main: Test /
  Lint / Check Types / Design Check / Check Workflows / Test Scripts Load; CodeQL ×2; Dependency
  Review; Lockfile Guard; visual). Main Test job: server **61 files / 2429 passed + 1 skipped**,
  web **31 files / 1189 passed**. PR auto-closed, `conductor/ci-*` refs auto-deleted (verified).
- Deferred to next cycles (candidates + preconditions): see the companion compound doc
  `2026-10-08-repository-maintenance-cycle-1-compound-run-6277460ed8bd.md`.
