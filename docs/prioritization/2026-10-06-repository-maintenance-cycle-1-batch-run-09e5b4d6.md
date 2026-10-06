# Dashboard maintenance — repository-maintenance cycle 1 batch (2026-10-06/07, run 09e5b4d619fe)

module: dashboard
tags: `[security, docs, batch-record]`
problem_type: batch-record

Frame: base `ac61ff34` (== origin/main re-probed this run at roadmap/stewardship
phases; canonical `/work/projects/dashboard` probed at `3d07cf96` — ahead, no
overlap with these surfaces). Run `09e5b4d619fe48d5aec8a0d13273984d`,
repository-maintenance cycle:1. Phases: assess `bbb206c56e8a44f9a564318f4b36a4c8`,
research `67212795f00c4351bdbe4a5a1d1a7afc`, roadmap `b12aac664ed7481b81093029e6f43e7e`
(extension #29 — mints rm-681/682/683 + 8 dated riders, +35/-0), prioritize
`ee511b9fa29d47c783f71e3b77bed575` (spool batch doc `ee511b9f…-scratch/batch-selection.md`;
this document is its in-tree landing), stewardship `82c73ebf1f8941ef9ffbfe31ca2d3e6f`,
implement `9ba13c2ea92b4da4ac773042800c13e6` (this document). Theme selected by the
prioritize phase: **supply-chain currency + ledger hygiene + one reliability guard**.

## The cycle's mandate

Five-item coherent batch, zero live-repo mutations, zero time gates. Supply-chain
half re-pins the three drifted external anchors measured by this run's research
(base image digest, fro-bot/agent, pnpm/action-setup); the ledger half executes
the freshly-minted rm-681 prune; the reliability half lands the rm-187 store
guard the roadmap phase rode this run.

## B1 — rm-681: Open ledger prune (25 implemented+LANDED items folded to Completed)

The run's own roadmap extension #29 was folded FIRST (`git apply`, pre-validated
+35/-0, staged in spool by the roadmap phase; apply-check clean, byte-verified),
then the 25-item fold set derived live by the prioritize phase:

`rm-126 127 129 134 135 136 137 142 143 145 148 154 164 186 192 228 229 284 285 287 288 497 498 500`
— 25 ids (rm-126..rm-500 as recorded in `ee511b9f…-scratch/batch-selection.md`).

Strict rule applied (every fold verified THIS turn at implement, base `ac61ff34`):

- **cited-commit reachability** — `git merge-base --is-ancestor` for every
  landing citation: `539c632`, `5c9c5d2`, `4d8ec12`, `65830f1` all reachable
  from origin/main.
- **live in-tree state probes** — one per item, recorded in each item's fold
  rider (driftCount lock coverage, misroute guard, rate-class budgets, README
  badge, minimumReleaseAge sites, renovate.json5 absence, pin-family census,
  playwright container pin, security-posture runbook, setup-action cache, no
  self-hosted runners, release-trigger/prose-residue guard tests, .dockerignore,
  failingCheckDetails, secrets pair, logger bind banner, length guard, security
  floors, env-docs census, query-registry isolation, readBodyCapped, hono floor,
  fast-uri resolution, logout rate class).

Deliberately NOT folded: `rm-144` (status "partially implemented" — browser-parser
half open), `rm-242`/`rm-603` (implemented-without-LANDED). Census: defs 225 → 225
(moves only, zero content loss), Open 178 → 153, Completed 41 → 66, in-file max
`rm-683`, 0 duplicate ids; each moved def carries a dated close rider; the prune
census comment sits beside the extension #29 comment in the file header.

## B2 — rm-682: node:24-slim base digest re-pin 0e0ff40c → d6aa754f

- Digest re-derived live at implement (not trusted from research): Docker Hub
  token-authed registry manifest HEAD → `node:24-slim` =
  `sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20`,
  byte-equal to `node:24-bookworm-slim` — a refreshed same-suite bookworm build
  (Node 24.21.0 + refreshed OS packages), NOT a suite switch. Upstream
  fro-bot/dashboard #567 re-pinned to the same digest the same day.
- `Dockerfile:21` `ARG NODE_IMAGE` now carries the new digest with an rm-682
  provenance comment block (probe date, parity statement, no-op note for the
  runtime stage's `--only-upgrade` apt layer if the refreshed base ships
  deb12u2+/deb12u4+).
- **Acceptance adaptation** (recorded at the status flip): the "OS-CVE count
  before/after" measurement needs a docker daemon — absent in this environment;
  delegated to the next weekly trivy scan (rm-648) post-landing as the watch
  item. The gate actually enforced here: registry parity (`node:24-slim` digest
  == pinned digest), which is exactly what `base-drift.yaml` re-checks every
  Monday — next fire reads live `node:24-slim` and holds green at parity.

## B3 — pin fleet: fro-bot/agent + pnpm/action-setup

- `fro-bot.yaml:347`: `fro-bot/agent@3e86a1249c9af11f5152625259b0e26e9a828cfe # v0.117.1`
  → `e8b286b7dc2dc114595bec49f46565c9ff284cb7 # v0.118.0`. Full SHA
  re-derived live via `gh api repos/fro-bot/agent/git/ref/tags/v0.118.0`
  (commit-type ref). v0.117.1 → v0.118.0 rides the whole security train
  (v0.117.2 plugin DoS/unsafe-input fixes; v0.117.3 26-advisory floors + tini
  zombie reaping; v0.117.5 S3 fail-closed) plus the v0.118.0 patched-OpenCode
  executor alignment — a superset of upstream #568's v0.117.5, keeping
  fork-first parity. Latent while the workflow stays `disabled_manually` (no
  `FRO_BOT_PAT` secret) — same posture, newer bytes.
- `pnpm/action-setup` at all four sites (`lockfile-guard.yaml:61`, `audit.yaml:67`,
  `visual.yaml:78`, `.github/actions/setup/action.yaml:16`):
  `0977fd99725f1db4007ccb2928dbb4e90d06cc86 # v6` →
  `ea17c68df8912ef543352723c149a84f56e3d413 # v6.1.0` (annotated tag, peeled via
  the git-tags API to the commit SHA). Closes the fleet's only stale action pin.

## B4 — rm-187: guarded listener links-cell parse (degrade, never throw)

`src/listener/store.ts` `rowToMessage()`'s bare `JSON.parse(row.links)` could 500
EVERY message behind `GET /api/listener/messages` for one corrupt cell (the
sqlite file is an operator-reachable surface: schema drift, truncated write,
manual edit).

- New `parseLinksCell(row)`: try/catch + `Array.isArray` gate — corrupt /
  empty-string / JSON-`null` / non-array cells map to an empty links list and
  log a structured `logger.warning` (id/source/kind) so the degradation is
  observable; every other row field is served intact.
- Regression tests: `test/listener-store.test.ts` (file-backed store corrupted
  in place via `node:sqlite`; four variants + healthy-row preservation +
  warning-log assertion) and `test/listener-routes.test.ts` (endpoint 200 with
  remaining rows through `buildDashboardApp`).
- The store's ack() race rider deliberately NOT touched (separate item).

## B5 — this document

In-tree landing of the prioritize phase's spool batch record, per the
established house convention (prior batches 4e7c674, 262f170c, dbe8fb16,
7ce48fe5, d620213c, 146d73f2, 80e84092, d1850b2e).

## Validation (implement-phase shape: focused/impacted only)

Impacted suites (tree-delta-driven, engine-classified surfaces): the two edited
listener suites + listener-ingest-auth + listener-contract.property +
endpoint-parity-guard (listener routes parity + docs reader) + every guard test
that reads ROADMAP.md or docs/ (roadmap-length-guard, prose-residue-guard,
rate-limit-config, should-release, query-shape-guard, rate-limit-key-cap,
compute-release-tag, fork-exclusion-guard) + actionlint (container form) on the
four touched workflows + `pnpm lint` + `pnpm check-types` + frozen install +
`pnpm audit --recursive`. Full battery log refs in the implement phase result;
repository-wide validation reserved for the later full_tests / merge-release gate.
