# Prioritization batch 2026-09-23 — repo lineage cycle 7

Provenance: conductor run 8f151ba4ac474aeab0e71a6ec90321ed, prioritize attempt 3af2496a42e24c6489abca0a95c1b65a.

Lineage numbering (disclosed per convention): the engine labels this run `repository-maintenance:…:cycle:1`,
but repo lineage already carries batches through `2026-09-21-cycle-5-batch.md`, and the ROADMAP now carries
cycle-6 (rm-134..rm-141, origin/main) and cycle-7 (rm-142..rm-148 + riders, this branch) extension blocks. This
batch therefore takes lineage **cycle 7**, matching the ROADMAP block added by this run's roadmap phase.

## Live frame re-measurement (stale-base rule)

- `git fetch origin` 2026-09-23: origin/main `64024a5`; this worktree `7809df6` = main − 7 commits (the cycle-6
  payloads land via merge at the commit gate). Upstream drift ZERO for the first time
  (`git rev-list origin/main..autonomy-upstream/main` empty).
- Workflow state at tip `64024a5` (gh, 2026-09-23T04:16Z): **Main, CodeQL, visual, Scorecard all success.**
  No G1 (currently-broken invariant) trigger — this is an improvement batch, not a restore batch.
- Standing measurements feeding selection: Main run 27610828410 `test` install step **5m0s** of 11m15s total
  (cold pnpm install; stale self-hosted rationale at `action.yaml:11-17` on main); `src/secrets.ts` hardening
  branches with zero test references on main; `src/server.ts:753/:1097` sync-read + console.warn; live
  `node:24-slim` digest `d8bb36de` vs pin `0e0ff40` (6th event).

Inputs used, not redone: assess 242fac43 (17 findings, all file/line), research 28c14fe2 (12 candidates, live
sources), roadmap 2ea24d0b (rm-142..rm-148 + riders/signals, every candidate re-measured against origin/main).

## Gated scoring (impact, risk-to-skip, risk-to-do, effort, dependencies)

Gates: (G1) restores/locks a broken invariant? (G2) completable end-to-end this cycle? (G3) depends on unlanded
parallel work? — cycle-6 payloads (rm-134..rm-137 etc.) are already ON origin/main, so this batch's items carry
no G3 exposure; they must simply not regress the pending-landing truthing.

| item | impact | risk-to-skip | risk-to-do | effort | deps | gated |
| --- | --- | --- | --- | --- | --- | --- |
| rm-142 composite pnpm cache | 8 — minutes-scale CI cost on every run | 7 — cost compounds weekly | 2 — tiny composite diff, visual.yaml precedent | S | none | PASS |
| rm-143 secrets.ts tests | 8 — the only untested file guarding invariant #3 | 7 — silent regressions in key handling | 1 — pure test addition | S | none | PASS |
| rm-146 server hygiene batch | 6 — runtime polish + two stale docs | 5 | 2 — memoization test-locked, no behavior change | S/M | none | PASS |
| rm-141 closure (re-scoped) | 6 — truthing: pool already on main, item still open | 6 — roadmap drift compounds | 1 — measurement + doc | S | none | PASS |
| rm-144 releases column | 7 — user-visible capability | 4 | 3 — aggregator+DTO+UI+snapshots | M | none | DEFER — feature batch |
| rm-112 riders (3 signals) | 7 — degradation observability | 5 | 3 — hot-path + UI semantics | M | none | DEFER — pair with rm-144 |
| rm-145 + rm-147 (paired) | 6 — contract vs v0.114.1 drift | 5 | 3 — needs agent-release study | M | clone refresh | DEFER — next cycle |
| rm-148 deployments column | 5 | 3 | 3 — mint-map permission change | M | owner decision | DEFER — explicit decision |
| rm-105 SBOM/provenance | 7 | 4 | 3 | M | Release timing | DEFER — pair with rm-139 Node 26 window |
| rm-103 absorb automation | 7 | 5 | 3 — scheduled merge-PR machinery | M/L | rm-131 (landed) | DEFER — effort overruns cycle |
| rm-104 (escalated 98) | 7 | 6 | 3 — hermes-roadmap edits | M | fleet repo | HOLD — outside this repo (cycle-5 ruling) |
| rm-102 | 6 | 4 | — | — | external event ~2026-10-03 | WAIT — evidence event |
| rm-116 / rm-138 | 5/4 | 3 | — | — | owner decision | WAIT — decision required |
| rm-117/118/119/127/129/114/115 | 4-6 | 3-5 | 3 | M | — | DEFER — security/UI panel cycle |
| rm-139 / rm-140 | 4 | 2 | 2 | S/M | timing (~Oct) | DEFER — not yet due |

## Selected batch — theme: CI cost out, security-file coverage in, runtime hygiene, truth the ledger

- **B1 — rm-142 setup-composite pnpm cache** (assess F2 / research C6). Add `cache: pnpm` to
  `.github/actions/setup/action.yaml` (with the existing node-version wiring); replace the falsified
  self-hosted rationale comment at `:11-17` (origin/main; the file is 29 lines there — the earlier
  `:95-96` ref was never citable); every Main job that installs dependencies already routes through the
  composite (visual.yaml keeps its local `cache: pnpm`). AC: actionlint (container form) + `pnpm lint` + full
  suite green; post-merge Main run's `Install dependencies` step < 1m with warm Actions cache (baseline 5m0s,
  run 27610828410); cold-cache run, if observed, recorded too.
- **B2 — rm-143 direct tests for `src/secrets.ts`** (assess F3 / research C8). New `test/secrets.test.ts`,
  zero executable changes: O_NOFOLLOW symlink refusal, ELOOP loop guard, FIFO rejection, size-cap abort,
  trailing-newline strip, happy path. AC: suite count grows by exactly the added cases; targeted run green;
  `git diff src/secrets.ts` empty.
- **B3 — rm-146 server runtime hygiene batch** (assess F4/F11/F13/F14 + docs riders). Memoize the push-enabled
  `/` handler's `web/dist` read (mtime-keyed or startup render — memoize the read, never the per-request regex
  replace) with a behavior-locking test; `console.warn` → logger at `src/server.ts:1097` (main line); evict
  aggregator cache entries for repos that left the working set; truth the `src/gateway/operator-client.ts:4-6`
  header (it does make a live per-request session call); truth README healthz wording (origin/main README.md:48
  still documents `rateLimit` fields the handler stubs null). AC: no behavior change beyond stated; targeted
  vitest + full suite green; each sub-item independently verifiable in the diff.
- **B4 — rm-141 closure by re-scope** (roadmap truthing). ~~FETCH_CONCURRENCY=6 pool is already on origin/main~~
  **PREMISE FALSIFIED at implement time (2026-09-23, attempt c7c6b3b2):** `git grep -c FETCH_CONCURRENCY
  origin/main -- src/github/aggregator.ts` → 0; origin/main:aggregator.ts:717 still runs the serial per-repo
  loop. The pool exists only on the stranded local branch `conductor/run-a7ca03039406` (unlanded; certified
  write-tree in integrate-run history). Disposition: rm-141 CANNOT close as truthing-only — it stays open with
  the pool landing/reimplementation as the remaining body (then determinism check + before/after refresh-timing
  measurement + relocation to Completed). No code change shipped for B4 this cycle; the falsified cycle-7
  roadmap rider has been corrected in ROADMAP.md. Next cycle should decide: merge the stranded branch's
  aggregator payload forward or reimplement the pool fresh against current main.

Explicitly out (defensible): capability features (rm-144/148), contract reconciliation (rm-145/147), aggregator
degradation semantics (rm-112 riders) — each is a coherent next-cycle batch; nothing selected requires an owner
decision or an external event, keeping this cycle completable end-to-end (G2) with exactly one small
executable-surface change (B3) alongside tests, CI config, docs, and ledger truthing.

## Assess-findings disposition

F1 absorbed at merge — VERIFIED (visual.yaml SHA pins landed on main via 37f28e7/rm-137, observed at
:35/:39/:59/:67). F6's premise was FALSIFIED (FETCH_CONCURRENCY absent from origin/main — pool exists only
on stranded conductor/run-a7ca03039406; see the B4 correction below). F7 NOT fixed on main either — the
stale denylistComplete comment is byte-identical there (:355-365); fold F7 into the cycle-8 rm-112 cluster.
F2→B1;
F3→B2; F4→B3; F11/F13/F14→B3; F15/F16→B3 rider (healthz wording; badges already fixed via rm-134);
F5/F8/F9→rm-112 riders (deferred); F10 (listener caps) verified compliant, no action; F12→deferred
trusted-proxy limiter design needs an operator decision.

## Implementation record (2026-09-23, run 8f151ba4 implement, attempt c7c6b3b2)

Changed files (this branch, uncommitted — commit is a later gate):

- **CU1 (rm-142)** — `.github/actions/setup/action.yaml`: added `cache: pnpm` to the setup-node step;
  replaced the falsified 2026-09-19 self-hosted no-cache rationale with the ubuntu-latest-era measurement
  (5m0s cold install of an 11m15s Main run); removed the vestigial `cache-version` input (zero callers —
  `grep -rn 'cache-version' .github/` matches nothing outside the composite; setup-node derives its cache
  key from the lockfile). actionlint (container, 1.7.12, bare repo run): exit 0.
- **CU2 (rm-143)** — `test/secrets.test.ts` (new, 14 tests): happy single-line + multiline (trimEnd), env
  fallback on `_FILE` ENOENT, `Missing required secret` when absent everywhere, whitespace-only → null,
  exact-4096 boundary OK, 4097 → too-large throw, symlink → ELOOP rejection, FIFO (mkfifo + held writer) and
  `/dev/null` char-device → not-a-regular-file rejection, directory rejection, embedded-newline rejection
  (file + env). `src/secrets.ts` untouched — `git diff src/secrets.ts` empty.
- **CU3 (rm-146)** —
  - `src/server.ts`: `/` handler's index.html read memoized by `(mtimeMs, size)` (steady state = zero sync
    disk I/O per request; rebuild re-reads), `console.warn` startup banner → `logger.info`;
  - `src/github/aggregator.ts`: per-repo cache entries pruned to the current working set each refresh
    (departed repos no longer pin entries; empty working set clears the cache);
  - `src/gateway/operator-client.ts`: header corrected — the module IS called live (gateway-auth calls
    `getCurrentSession()` per operator request); SSE is the only noop seam;
  - `README.md`: healthz documented as returning `{ ok: true, lastFetch: null, rateLimit: null }` with the
    rm-116 pending note.
  - Tests: `test/operator-ui.test.ts` +2 (mtime-keyed memoization: re-read after rebuild, 404-then-serve
    when file appears late); `test/aggregator.test.ts` +2 (eviction: departed repo rejoins within TTL →
    re-fetched not stale-served; empty working set clears cache).
- **CU4 (rm-141)** — no code; premise falsified (see B4 above): `git grep -c FETCH_CONCURRENCY
  origin/main -- src/github/aggregator.ts` → 0 (main:717 is the serial loop; pool only on stranded
  `conductor/run-a7ca03039406`). rm-141 stays open; the falsified cycle-7 ROADMAP rider was corrected.

Focused verification (per validation budget; repo-wide suite reserved for the full_tests/merge gate):

- `pnpm exec vitest run --pool=forks --maxWorkers=1 test/secrets.test.ts` → 14/14
- `pnpm exec vitest run --pool=forks --maxWorkers=1 test/aggregator.test.ts` → 53/53
- `pnpm exec vitest run --pool=forks --maxWorkers=1 test/operator-ui.test.ts` → 85/85 (after `pnpm build:web`;
  without the build the pre-existing web/dist-dependent tests 404 — harness artifact, not a regression)
- `pnpm check-types` (NODE_OPTIONS=--max-old-space-size=3072) → clean
- `pnpm exec eslint` on all touched files → 0 problems; `docker run rhysd/actionlint:1.7.12 -no-color` → exit 0

## Cycle outcome record (pre-review, 2026-09-23, compound phase of run 8f151ba4)

Statuses at the compound gate — review/merge outcomes intentionally deferred; the next cycle's
assessment carries them forward:

- **B1 / CU1 (rm-142)** — implemented: `cache: pnpm` on the setup-node step, stale rationale
  rewritten with the measured ubuntu-latest numbers, vestigial `cache-version` input removed (zero
  callers). Post-merge Main timing evidence (install step < 1m warm vs the 5m0s baseline) remains
  the open acceptance half.
- **B2 / CU2 (rm-143)** — implemented: `test/secrets.test.ts`, 14 tests covering every hardening
  branch; `src/secrets.ts` diff-free. Suite grew by exactly 14.
- **B3 / CU3 (rm-146)** — implemented: mtime-keyed index.html memoization (zero per-request sync
  disk I/O), `console.warn` → logger, aggregator cache eviction on working-set exit, operator-client
  header truthed, README healthz wording fixed. +4 behavior-locking tests (2 operator-ui, 2
  aggregator).
- **B4 (rm-141)** — premise falsified (see B4 section): FETCH_CONCURRENCY absent from origin/main;
  pool only on stranded `conductor/run-a7ca03039406`. Item stays open; next-cycle decision: merge
  the stranded pool forward vs reimplement, then determinism check + timing measurement.

Validation at this tree (implement + targeted_tests + full_tests phases): targeted 550/550 across
the six covering suites; FULL `pnpm test` 3133/3133 (root 2055 + web 1078) = 3115 prior + 18 new;
check-types 0 errors; eslint 0 problems; actionlint exit 0. Tree fingerprint 4f1f17e2 stable across
both validation phases (zero executable drift after implement).

Durable lessons extracted (docs/solutions):

- `workflow-issues/truth-claims-must-be-scoped-to-origin-main-2026-09-23.md` — the rm-141
  mis-attributed grep: every "already on main" claim must be scoped `origin/main:<path>` and
  re-derived at point-of-use before acting on it.
- `best-practices/era-specific-config-rationale-comments-carry-their-date-2026-09-23.md` — the
  falsified self-hosted no-cache rationale: date rationale comments, re-truth them in the migration
  that falsifies them, sweep without extension filters.

Next-cycle intake (unchanged from the selection, plus this cycle's additions): land the cycle-7
batch (commit gate: explicit file list, never `git add -A`, `.conductor/` stays untracked); then
rm-141 pool decision, rm-144 latest-release column, and the deferred rm-112 degradation-semantics
cluster as the cycle-8 core; rm-137 relocation to Completed rides the next batch commit.
