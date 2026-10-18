# Repository-maintenance cycle:3 batch selection — run b7188a701a7a

- Date: 2026-10-18 (04:2xZ)
- Run: b7188a701a7a406080bc347d71a2bb98, cycle 3, prioritize attempt fbcbd5dd424d4693b06e8dc27c7db017
- Base: 389d60e (porcelain-clean; roadmap mints for this batch live spool-side in
  `roadmap-delta-b7188a70-b41aa578.patch` until the batch lineage applies them)
- Inputs (this run, in order): assess 92a6859f (4 findings, all gates RC0 at base),
  research 04d4771f (6 live-probed candidates), roadmap b41aa578 (4 mints rm-1984..rm-1987,
  2 riders rm-252/rm-139)

## Selection

**BATCH: "detector truth, serving correctness, audit hygiene" — rm-1984, rm-1985,
rm-1986, rm-1987 (all four minted by this run's roadmap phase from this run's
assess+research evidence).**

Rationale, against the required axes:

- Impact: rm-1984 hardens the only adversarially-spoofable diagnostic on the
  rate-limit surface (single-operator production security posture; the warning
  text today recommends enabling a client-spoofable keying mode, so a forged
  signal nudges real misconfiguration). rm-1986 closes a stale-gzip
  content-shadowing window. rm-1985/rm-1987 are correctness/audit nits with
  verified-nil user impact today.
- Risk of change: all four are bounded, test-covered edits with no cross-surface
  coupling; none touches release.yaml trigger paths or scripts/release-paths.ts
  (no digest re-derivation owed; rm-1987 edits codeql.yaml + scorecard.yaml
  comments only).
- Effort: S–M total. One implement leg plus review/validation fits this cycle
  end-to-end.
- Dependencies: ZERO absorb dependency — deliberately independent of the rm-252
  pnpm→Bun disposition decision (see Deferred). No dependency on any in-flight
  sibling surface.
- Strategic value / collision: these four ids were minted by this run one above
  the all-lineage frontier (rm-1983), so no sibling lineage can hold them — the
  batch is collision-free by construction, unlike every older open def.
- Coherence: all four come from the same evidence base (this run's assess F1–F4
  + research C4/C5 with RFC 7239 8.1 and nginx gzip_static citations) and share
  one theme: make what the operator reads (detector warning, platform
  annotation, audit comments, served bytes) match what is true.

## Per-item scope (acceptance mirrors the ledger mints)

1. rm-1984 (security, 16.0) — src/server.ts observeXffCollapse quorum: warn only
   on ≥3 distinct fingerprints from one direct address, or ≥2 distinct
   fingerprints from ≥2 distinct direct addresses; preserve bounded memory and
   log-once. Adversarial test added to test/rate-limit-xff-collapse.test.ts:
   single address forging N distinct XFF values must NOT warn; genuine
   proxy-address collapse must still warn. docs/runbooks/gateway-access.md
   two-source-discipline paragraph (:157-159) corrected to state
   default-topology spoofability + RFC 7239 8.1 citation.
2. rm-1985 (reliability, 12.0) — src/github/platform-status.ts:165: fix the
   nothing-usable guard (drop the statusBody term) or rewrite the contract
   comment to the implemented semantic; pin the chosen semantics with a test in
   test/platform-status.test.ts covering the 200-with-unrecognized-shape path.
3. rm-1986 (reliability, 10.0) — scripts/gzip-static-sidecars.ts: unlink a stale
   sidecar on the not-worth-it path + sweep orphaned *.gz at start; pin with a
   test in test/static-assets.test.ts (sidecar-staleness block, near the
   existing gzip-static-sidecars coverage at :1554+); re-anchor the stale
   src/server.ts:1331 disposition comment to the landed operator-contract 1.11.0.
4. rm-1987 (reliability, 6.0) — comment-tag sweep: codeql.yaml:32/:38 and
   scorecard.yaml:42 `# v4` → `# v4.39.0` matching the shared digest 6f2ac81f
   (release.yaml:386 already correct). Comment-only; run actionlint via the
   container form per repo convention since workflow files are touched.

## Deferred, with reasons (revisited next cycle)

- rm-252 absorb disposition (Bun adoption vs pnpm-hold curated absorb vs hold):
  highest strategic weight in the landscape but it is a deliberate DECISION, not
  a work item — option (a) requires the absorb-verify bun-lockfile leg FIRST;
  option (b) is a dedicated multi-phase absorb; contested surfaces
  (operator-stream family) risk sibling collision. The rider records all three
  options with census evidence; the decision should be made with the gateway
  agent-pin lane (below) on the table.
- Agent pin v0.122.3 → v0.123.0 (+ mirror re-provision + gateway-access.md
  durable-sessions delta): small but cross-tree (canonical-checkout mirror) and
  rides the rm-252 chain; better as a dedicated leg once the runbook
  implications of durable operator sessions are digested. Contract unchanged
  (1.11.0), so no urgency.
- rm-100 / rm-284 / rm-279 / rm-178 (top in_progress defs at base): standing
  fleet-era items (gates-at-HEAD, lint cliffs, base-drift extraction). Several
  are done-in-effect at current bases (lint/check-types/test all RC0 at 389d60e
  this run); disposition-by-evidence belongs to their owning lineages, and
  selecting them here would duplicate in-flight sibling work.
- rm-139: time-gated (2026-10-28); nothing owed before the gate (v26.12.0
  lts:false re-probed this run).

## Sequencing and validation expectations for implement

1. Apply the spool roadmap patch FIRST (restores the four mints + riders into
   the lineage; base blob f6ff12b6, round-trip proven).
2. One implement leg, order: rm-1984 → rm-1985 → rm-1986 → rm-1987 (server
   detector carries the only behavioral surface; the rest are independent).
3. Gates: pnpm check-types, pnpm lint, pnpm test (full battery) — plus targeted
   re-runs of the four touched suites. Build web/dist before any targeted
   vitest that hits `/` (pretest normally covers it).
4. No release-path/executable-surface digest changes are expected; if any leg
   unexpectedly touches scripts/release-paths.ts or release.yaml, re-derive and
   declare the fresh validation digest.
5. Status flips: each mint's rider records implementation provenance; the batch
   doc + ROADMAP updates ride the same lineage (batch-doc tripwire: this doc
   names only paths that exist at base or are created by this batch).

---

## Implement outcome (2026-10-18, attempt 277badf1)

All four defs implemented and verified with the focused/impacted battery
(repository-wide validation is reserved for the full_tests gate). Changed
files, all left in the stewardship worktree for the landing lineage:

- rm-1984 (detector truth): src/server.ts (observeXffCollapse quorum — 3
  distinct fingerprints at one direct address, or a pair at each of 2
  addresses; `trigger` field added to XffCollapseDetected; middleware
  warning text now names RFC 7239 section 8.1 forgeability and defers to
  the runbook before the RATE_LIMIT_TRUSTED_PROXY flag),
  test/rate-limit-xff-collapse.test.ts (adversarial cases: single forged
  pair + sustained oscillation never arms, unit and middleware level),
  docs/runbooks/gateway-access.md (two-source paragraph now states the
  default-topology spoofability and cites RFC 7239 8.1).
- rm-1985 (platform-status contract truth): src/github/platform-status.ts
  (guard drops the `statusBody` term — "usable" means a FIELD was
  extracted), test/platform-status.test.ts (pins the
  200-with-unrecognized-shape path; proves the rm-1447 clamp survives
  where a field IS usable).
- rm-1986 (serving correctness): scripts/gzip-static-sidecars.ts (prunes a
  pre-existing sidecar on the not-worth-it path, sweeps orphaned .gz
  before the compress pass, counters in the summary line),
  src/server.ts (stale operator-contract disposition comment re-anchored
  to landed 1.11.0), test/static-assets.test.ts (rm-1986 fixture suite:
  spawn-the-generator in tmpdir — prune + sweep + fresh emission, and an
  idempotent re-run).
- rm-1987 (audit hygiene): .github/workflows/codeql.yaml (init/analyze
  comment tags `# v4` → `# v4.39.0`), .github/workflows/scorecard.yaml
  (upload-sarif comment tag) — digest↔tag re-verified live this attempt
  (tags/v4.39.0 → 6f2ac81f5cd81fe351a197ba0b00d91d03cd2aee, the pinned
  digest at all four sites).
- ROADMAP.md: rm-1984..rm-1987 flipped to `status: implemented` with
  dated evidence riders (mint provenance preserved in the parenthetical).

Verification commands (all green this attempt): `npm exec -- vitest run
test/rate-limit-xff-collapse.test.ts test/platform-status.test.ts` (29),
`npm exec -- vitest run test/static-assets.test.ts` (162), `npm exec --
vitest run test/rate-limit-class.test.ts test/rate-limit-config.test.ts
test/rate-limit-key-cap.test.ts test/rate-limit-retry-after.test.ts` (32),
`corepack pnpm check-types` (rc=0, all three tsconfig projects), scoped
`npx eslint` over the six touched TS files (rc=0), `docker run --rm -v
"$PWD:/repo" -w /repo rhysd/actionlint:1.7.12 -no-color` over the three
touched workflows (rc=0), and the roadmap guard battery
(integrity/render/length, 15/15).
