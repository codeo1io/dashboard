# Repository-maintenance cycle 1 — compound record (2026-10-08, run 6277460ed8bd)

Pre-review compounding of the whole cycle: assess `b5f929ab` → research `078608ab` → roadmap
ext #35 (`1ecdc034`, adopted) → prioritize `68ebfd84` → stewardship `8535e35d` → implement
(`e26f912c` reaped → `1b698661` completed, transport-lost → `be646830` re-verified redelivery) →
targeted `bb502a3a` → full `802b2fc9`. Nothing was re-validated at compound; every outcome below
is consumed from the recorded typed results.

Prior-attempt forensics for THIS phase: attempt `327fbd4e` (reaped ~11 min in, 12 progress
events) wrote this run's two in-tree docs — the batch record and the monitoring-whitelist
prevention rule — before dying; attempts `6bbca77d` and `dacfdbf9` were ~1-message provider
deaths with zero durable work. The docs were adopted leg-by-leg (mtimes inside `327fbd4e`'s
window, content cross-checked against the typed validation artifacts, numbers verified
first-hand) and are declared adopted here; the ledger riders, the census compounding, and this
companion doc are this attempt's work.

## Cycle outcome (compounded)

Batch `Operator monitoring truth + public posture completion`, one landing at base `e8d220c`:

- **U1 `rm-107` small slice** — `MonitoringData` whitelist-adds `refreshDegraded` /
  `refreshDurationMs` (fields emitted at `src/routes/api.ts:50-52` / `:78-79` since the contract
  work) + `monitoring-refresh-degraded-banner` consumer slice. Validated: web pair 22/22 targeted;
  full ephemeral PR #441 11/11 checks (web 31 files / 1189 passed, +6 new monitoring cases).
  Def stays open for the feature-scale remainder (composed operator status panel).
- **U2 `rm-713`** — public `/robots.txt` (+ trailing-slash twin) via the `rm-245` exact-match
  `isPublicPath` family, inline RFC 9309 whole-site Disallow; `test/robots-wellknown.test.ts`
  6 cases; README endpoint row. Validated: 6/6 inside the focused 14 (robots + roadmap guard +
  endpoint parity), engine impacted-tests 20 files / 740 passed, full PR #441 11/11 (server
  61 files / 2429 passed + 1 skipped). Status: implemented, landing pending integrate.
- **U3 ext #35 ride** — ledger extension re-anchored onto `e8d220c` by 3-way union;
  `rm-712`/`rm-713` minted; census `235/0/rm-744`; guard pin stays `744`.

## Ledger deltas made at compound

Riders only — zero def-line changes, census unchanged and re-derived first-hand:
`235 defs / 0 dups / max rm-744` (`node scripts/roadmap-census.ts`, healthy).

- validation rider on `rm-713` (targeted + full outcomes, fresh diff3 fold evidence);
- slice-validation + prevention-rule rider on `rm-107`;
- **disposition-resolved rider on `rm-712`**: a94d0659's `rm-698` trixie re-pin LANDED on main
  (`ad8f21e` riding the `b658cb60` integrate) — `rm-712` folds to `rm-698` at integrate, no
  implementation owed by any lineage;
- COMPOUND RIDE paragraph inside the ext #35 header comment (owns the newest census claim at
  `235/0/rm-744`, restates integrate obligations).

## Reusable lessons recorded this cycle

1. **Monitoring-whitelist mirror rule** (new prevention rule):
   `docs/solutions/best-practices/monitoring-payload-fields-mirror-web-whitelist-2026-10-08.md` —
   an operator-API payload field change must mirror the web whitelist (interface AND parse
   section) and extend the paired web tests in the same change; no existing guard pins
   server-payload ↔ web-whitelist parity (`rm-556` endpoint-parity is docs-to-routes only), so
   the class is otherwise invisible to every suite.
2. **Reaped-attempt adoption with in-tree deliverables**: the general protocol is landed on main
   (`docs/solutions/workflow-issues/maintenance-cycle-learnings-2026-10-08-reaped-attempt-adoption-forensics-validation-invariants.md`);
   this cycle adds the leg where the dead attempt's durable trail is untracked deliverable files
   inside the worktree — adoptable only by mtime-window + typed-artifact cross-check forensics
   (this compound's adoption of `327fbd4e`'s two docs is the worked example).
3. **Free-lane prioritization under fleet congestion**: this batch survived three origin/main
   advances (`5aab7c7` → `e8d220c` → `b658cb60`) untouched because it took only lanes no standing
   composition held (web monitoring whitelist + robots posture + report-only ext ride); the
   compound-time `diff3` fold check (base / ours / theirs) is the cheap standing proof — record it
   in the batch record, as done here.

## Next-cycle candidates + preconditions (concrete, ordered)

1. **cve-tripwire NODE_IMAGE reconciliation — TIME-SENSITIVE.** `cve-tripwire.yaml:35` pins
   `NODE_IMAGE: 'node:24-slim'` while main's Dockerfile (post-`rm-698`) pins
   `node:24-trixie-slim@sha256:173f1258…`; the `Resolve pinned digest` grep returns EMPTY live →
   exits 1 with a misleading precondition error. First scheduled fire Mon 2026-10-12 ~06:53Z is a
   deterministic red (fresh finding of run 89ebbf49's assess — re-verify nobody in that lineage
   owns the cure first). One-line cure + first-fire green proof.
2. **`rm-107` feature-scale remainder** — `lastFetch`/`rateLimit` population into a composed
   operator status panel. Precondition: this batch's landing (same file family, free after).
3. **`rm-116` branch-protection fill** — standing FIRST post-landing action per sibling watch
   items (Main-job conclusions + CodeQL, strict, admin-enforced); precondition is the merge-push
   itself. Landing = merge-push, so this is the landing gate's immediate successor.
4. **`rm-103`/`rm-252`/`rm-157` absorb decision — due 2026-10-13.** Upstream contract-1.8.0
   block (#573) + doc PRs; MUST exclude upstream base-image family deltas (upstream pins bookworm
   `node:24-slim@d6aa754…`, fork is trixie `173f1258…` — both this run's research and 89ebbf49's
   record the hazard independently).
5. **Node v26 LTS window 2026-10-28** — engines bump + image line + action tag-site census;
   `rm-139`'s riders carry the nodejs.org release-model change (annual majors from here).
6. **Deploy currency + release proof** — at assess, 15 commits undeployed and release promote
   failures (37574226127) pending rm-691's live proof; the first post-landing release run from
   main is that proof AND unfreezes the live-probe evidence this cycle left deploy-gated
   (robots.txt 200, security.txt 200, HSTS 31536000 live readings).
7. **NOT ours to re-take (re-probe walls first)**: `rm-149` PKCE (sibling 9289efaa built,
   unlanded), `rm-752`/`rm-753` (f266ce30 reserved micro-batch), `rm-745..rm-750` (5bd710d8),
   `rm-754` `/static` middleware (f266ce30), trixie re-pin itself (LANDED as `rm-698` — `rm-712`
   folds, never re-implement). Sibling unlanded claims now run through `rm-754`, so the next
   mint-bearing phase MUST re-probe the all-lineage ceiling before minting (next free on a
   post-union main is likely `rm-755`+).

## Integrate obligations (fresh at compound, 2026-10-08)

- `origin/main` = `b658cb60`; fresh `diff3` (base `e8d220c`, ours this tree, theirs `b658cb60`)
  merges `src/server.ts` CLEAN (rc=0, zero conflict markers); `README.md` + all four `web/` files
  are main-untouched since `e8d220c` (single-sided); **`ROADMAP.md` is the only union file** —
  chronological union, landed records verbatim, this run's ext #35 + riders appended, merged
  census restated in the INTEGRATE record (`rm-712` folds into landed `rm-698`; expect the union
  count from main's `236/0/rm-744` plus this tree's two ext #35 mints minus the fold).
- Workflow delta `e8d220c..b658cb60` touches `base-drift.yaml` + `cve-tripwire.yaml` only; this
  batch carries no workflow files → no overlay conflict.
- Untracked riders of the landing: `test/robots-wellknown.test.ts` (validated in CI via the
  temp-index capture, PR #441), the two docs written by the reaped `327fbd4e` (adopted, declared
  above), and this companion doc.
- Post-merge: `git ls-files .conductor` must end empty (standing landing trap), and the
  `monitoring-refresh-degraded-banner` + robots routes join the deploy-currency queue.
