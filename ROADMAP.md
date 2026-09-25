# magic-mcp implementation roadmap

## Completion contract

This repository is complete only when the full scope below is implemented, tested, independently reviewed/fixed, committed, pushed, and CI is green. Do not stop after a subset.

## Architecture

`magic-mcp` is a TypeScript MCP protocol adapter over upstream Magic Context behavior. Magic Context remains authoritative for its own state and SQLite store. Do not implement Magic Context semantics via raw SQL except narrowly for diagnostics where no upstream API exists. Reuse/adapt the validated compatibility-loader strategy from `/work/projects/magic-hermes` because Magic Context does not expose a stable connector API.

Hermes must be able to use another native memory provider (for example Mnemosyne) while independently calling this MCP to read/write Magic Context state shared with Pi/OpenCode.

## Mandatory functional surface

1. TypeScript MCP server with stdio transport and production-ready package scripts.
2. Compatibility layer pinned to the locally validated Magic Context series/package, with explicit fail-fast version/symbol checks and upgrade documentation/tests.
3. Magic Context config and project-identity resolution through upstream behavior.
4. Stable public MCP tools, at minimum:
   - `magic_context_search`: unified project search over supported Magic Context sources.
   - `magic_context_expand`: expand/search-result/session source context where upstream supports it.
   - `magic_context_memory_list` / `get` / `write` / `update` / `merge` / `archive` backed by upstream memory behavior.
   - `magic_context_note_list` / `get` / `write` / `update` / `archive` where upstream APIs support these operations; document any upstream-limited operation rather than inventing semantics.
   - `magic_context_projects_list` / `resolve` / `describe` convenience operations using upstream project identity.
   - `magic_context_status` diagnostics: compatible version, store/config paths, project resolution, and safe counts/state where available.
5. MCP resources for projects and useful read-only project context/memory/note views.
6. Path-first scoping: calls accept `project_path` and optionally stable project identity; path resolution must use Magic Context's own resolver.
7. Clear read/write safety: validate input, no arbitrary SQL, no arbitrary filesystem access, no mutation replay on ambiguous transport failure.
8. Keep lifecycle-coupled host features out of v1: no host context-window transform, ctx_reduce session mutation, historian execution, Dreamer scheduling mutation, or automatic prompt injection unless required solely to use an upstream read/write API.
9. Documentation: architecture, MCP API, compatibility policy, install/configuration, Hermes integration with a non-Magic-Context memory provider, Pi/OpenCode sharing model, troubleshooting.
10. Cross-harness proof tests demonstrating the product claim in both directions using the same Magic Context store/project:
    - write via upstream/Pi-compatible Magic Context API, retrieve through magic-mcp;
    - write through magic-mcp, retrieve through upstream/Pi-compatible Magic Context API.
    Use real upstream functions/store; mocks alone do not satisfy this acceptance criterion.
11. Unit/integration tests for validation, project scoping, compatibility failure, read operations, mutations, and MCP protocol behavior.
12. CI workflow running lint/typecheck/tests/build and the feasible integration gate.
13. GitHub repository named `magic-mcp`, remote configured, code pushed. Open a PR if repository policy/workflow uses PRs; otherwise prove the pushed default branch and green CI.
14. No uncommitted changes at completion.

## Design preference

Expose a stable host-neutral MCP contract rather than simply mirroring `ctx_*` names. Internally isolate upstream private API changes behind the compatibility adapter.

## Reference implementation/context

Inspect `/work/projects/magic-hermes`, especially `docs/PARITY.md`, its Magic Context compatibility manifest/loader/runtime adapter, tests, and release-sync logic. Current local Magic Context package/version should be discovered and validated rather than guessed.

---

## Status — v1 contract complete (2026-09-20)

The v1 scope above is implemented and verified: fresh gate `npm ci` → `npm run typecheck` → `npm run lint` → `npm run build` → `npm run test` all exit 0 with 150/150 tests green across 19 files (unit, integration, crossharness tiers; cross-harness proof = item 10). Upstream pin `@cortexkit/pi-magic-context` 0.40.1 validated by adversarial assessment (run `4bcc54f462cd4521b1a7c963ab4e63a3`, assess attempt `6aa4de1e`, 2026-09-20). This section is history — do not re-litigate v1 scope.

## Maintenance roadmap — cycle 1 extensions (added 2026-09-20)

Extensions sourced from the 2026-09-20 adversarial assessment (11 findings, spool `6aa4de1e`) and upstream/ecosystem research (spool `cf37187c`). Ordered per the repository pillars: reliability before customer experience. Machine-managed reliability items (`rm-001` high-complexity refactors, `rm-002` untested modules) live in `ROADMAP.md` and are not duplicated here; M-items below may touch the same files and should be sequenced with them.

### M1. Upstream upgrade gate: pin 0.40.x → 0.42.6 (critical)
- motivation: upstream advanced two minors (0.42.6 published 2026-09-19). Schema support moved 81 → 85; upstream 0.42.0 migrates the shared store 83 → 84 and older builds then REFUSE the database — any host that upgrades Pi/OpenCode Magic Context silently removes magic-mcp's store access (`MAGIC_MCP_STORE_UNAVAILABLE`). Loader anchor also changed: `setHarness("pi")` → `setHarness(PI_HARNESS_KIND)`; all 30 required + 2 optional symbols verified present in 0.42.6 dist (chunk `index-r918mh6w.js`).
- scope: accept both anchor shapes in `src/compat/loader.mjs`; bump the pin; update `docs/compatibility.md` upgrade procedure; refresh the manifest expectations.
- acceptance:
  - loader harness rewrite matches `setHarness(PI_HARNESS_KIND)` (0.42.x) and still matches `setHarness("pi")` (0.40.x fallback) — covered by unit tests with both fixture shapes;
  - full gate green on 0.42.6 including the crossharness tier against a schema-85 store;
  - a fixture test proves a store newer than `LATEST_SUPPORTED_VERSION` fails fast with `MAGIC_MCP_STORE_UNAVAILABLE` (never partial reads);
  - `magic_context_status` reports upstream 0.42.6 and store schema 85 on a migrated store.
- evidence: `npm ls @cortexkit/pi-magic-context` → 0.42.6; `npm run test` exit 0 with the new anchor/refusal tests; status probe output in the PR description.

### M2. Restore the published CLI binary (high)
- motivation: `package.json` `bin` → `dist/index.js` ships with no `#!/usr/bin/env node` shebang and no exec bit; `./dist/index.js --version` exits 126 (Permission denied), so `npx magic-mcp`/installed bins are broken; only `node dist/index.js` works.
- scope: build pipeline emits the shebang as line 1 of `dist/index.js` and marks it 0755 (extend `scripts/copy-loader.mjs` or add a postbuild step); document `npx magic-mcp` in README/installation.
- acceptance:
  - built `dist/index.js` begins with `#!/usr/bin/env node` and is mode 0755;
  - executing the bin path directly prints the version banner and exits 0;
  - a packaging test asserts shebang + exec bit so regression fails CI.
- evidence: `npm run build && head -1 dist/index.js && ./dist/index.js --version` (exit 0); packaging test green in the full suite.

### M3. Resource read error contract (medium)
- motivation: `docs/mcp-api.md` promises `MAGIC_MCP_RESOURCE_URI_INVALID` / `MAGIC_MCP_RESOURCE_ERROR`, but `registerResources` never wires the exported `readResource` (dead code at `src/mcp/resources.ts:195`); live probe returns raw `McpError -32603`.
- scope: either wire `readResource` into every registered resource handler or correct the docs to the observed wire behavior; add resource error-path tests (invalid identity, unknown view).
- acceptance:
  - malformed resource URIs produce the documented error identity on the wire (or docs match observed behavior exactly — pick one, not neither);
  - `grep -rn readResource src` shows a call site or the function is removed;
  - tests cover invalid identity + missing view paths and are green.
- evidence: InMemoryTransport probe output shown in PR; test names cited.

### M4. `MAGIC_CONTEXT_STORAGE_DIR` fleet discovery (medium)
- motivation: upstream 0.41.0 (#371/#372) added the `MAGIC_CONTEXT_STORAGE_DIR` override for host-managed fleets sharing one database; magic-mcp discovery knows only `MAGIC_CONTEXT_DB_PATH` + upstream defaults and can bind a different store than Pi/OpenCode on such hosts (verified 2 references in 0.42.6 dist).
- scope: store discovery honors `MAGIC_CONTEXT_STORAGE_DIR` (or defers to upstream resolution); status reports the resolved storage directory and its origin.
- acceptance:
  - crossharness test with the env var set proves magic-mcp and the upstream API bind the same store (write one side, read the other);
  - `magic_context_status` surfaces the resolved dir + origin when the override is active.
- evidence: test output with env set/unset; status probe.

### M5. Correctness parity + low-risk cleanup pack (medium/low)
- motivation (assessment findings): workspace-shared memories are returned by search but reported missing by `memory_get`/`expand` (strict `projectPath === identity` at `src/services/memory.ts:124` vs upstream workspace-aware visibility); `buildUpstreamTools` passes deps upstream never reads; symbol list duplicated between `loader.mjs` and `symbols.ts` with divergent `binds()` regexes; status `projects` count uses only the memories table; silent 500-session truncation; `explicit_path` reads env not runtime state; no degraded flag when persisted > supported schema.
- scope: match upstream visibility semantics in memory read paths; delete dead deps; single-source the symbol manifest and unify `binds()`; make counts consistent; add truncation flag; report `explicit_path` from runtime state; flag newer-than-supported stores in status.
- acceptance: each sub-fix lands with a test pinning the new behavior (visibility test using a two-identity workspace fixture; counts consistency test; truncation flag test); no behavior change without a test.
- evidence: per-fix test citations in the PR; characterization tests remain green.

### M6. Surface upstream 0.42 tool capabilities (customer experience, depends on M1)
- motivation: `ctx_note` bulk dismissal via `note_ids` (1–50) and `ctx_memory` update `category` recategorization shipped in 0.42 (verified in dist SQL and release notes); `ctx_search` guidance now mandates natural-language questions carrying exact paths/symbols/error-strings.
- scope: `note_archive`/`note_update` accept `note_ids` arrays; `memory_update` accepts `category`; search tool description mirrors upstream guidance; `docs/mcp-api.md` updated.
- acceptance: MCP schema validation tests for the new parameters; integration test proving bulk dismissal and recategorization through the upstream tool; guidance text parity check.
- evidence: test output; docs diff.

### M7. MCP spec adoption pack (customer experience)
- motivation: MCP 2025-06-18 defines structuredContent/outputSchema, listChanged notifications, resource links, and tools/list pagination; installed SDK 1.30.0 (= npm latest) already ships all of it; magic-mcp currently uses none (text-only results, `list: undefined` on resources, no notifications). Competitors (mcp-memory-service) already ship remote/streamable variants.
- scope: `outputSchema` + `structuredContent` on the 17 tools (keep text fallback per spec); implement the resources `list` callback enumerating known projects; `sendToolListChanged` on read-only-mode flips and `sendResourceListChanged` after successful writes.
- acceptance: InMemoryTransport probe shows structuredContent present and schema-valid for representative tools; `resources/list` returns project entries; a client receives listChanged after a write; docs updated.
- evidence: probe transcripts + test citations in the PR.

### M8. Under consideration (not scheduled; revisit next cycle)
- Streamable HTTP remote mode (competitor-validated: OAuth2+HTTPS remote MCP) — requires a written threat model first: `project_path` lets a client address any directory on the host; remote exposure changes the security surface fundamentally.
- Knowledge-graph typed edges / auto-consolidation parity — track upstream; diverging semantics risk is high while upstream keeps evolving these.
- Dashboard-facing stats (0.42 persists subagent usage for dashboard reporting) — only if a read-only upstream API exists; raw-SQL reads stay narrowly scoped per the architecture rule.
- zod 4 (4.6.5 vs pinned ^3.25.76) — defer until the SDK peers or a schema need forces it; 17 schemas + peer risk.

### Cross-item acceptance rules

Every M-item: full gate green (`npm ci && npm run typecheck && npm run lint && npm run build && npm run test`), no uncommitted changes at completion, and acceptance proven by cited evidence in the landing PR — never claimed.

## Status — cycle 1 implementation complete (2026-09-20)

The selected cycle-1 batch (M2 → M1 + rm-002 slice → M3 → M4) is implemented and
verified on a fresh install against the real pinned upstream
(`npm ci` → `@cortexkit/pi-magic-context@0.42.6`), implement attempt
`1df82704`, targeted-tests attempt `df615468` (2026-09-20). Gate at completion:
typecheck 0, lint clean (52 files), build clean, `./dist/index.js --version` →
exit 0, suite **23 files / 172 tests passed** (`npm test -- --no-file-parallelism`,
exit 0; baseline was 19/150). Per item:

- **M2 done** — the build's post-emit packaging step (`tsc -p tsconfig.build.json
  && node scripts/copy-loader.mjs`; no bundler) prepends `#!/usr/bin/env node` and
  ORs the exec bit onto `dist/index.js` (umask-normalized: 0775 under umask 002;
  npm normalizes on pack). The copied `dist/compat/loader.mjs` is import-only and
  deliberately gets neither. The bin defect (exit 126) is closed and pinned by
  `tests/unit/packaging.test.ts` (4 tests).
- **M1 done** — pin 0.42.6; loader accepts both anchor shapes (dual-shape rewrite
  table in `src/compat/loader.mjs`, `tests/unit/loader-anchor.test.ts` 6 tests,
  `UnsupportedAdapter` on unknown shapes); `src/compat/pins.ts` series `[0,42]`;
  schema-fence refusal path proven by `tests/unit/runtime-refusal.test.ts` (3 tests).
  **Contract delta found during implementation (not in research):** upstream 0.42
  `ctx_note` update requires `note_ids=[one id]` and dismiss requires `note_ids`
  (1–50) — `src/services/notes.ts` adapted; client-facing schemas unchanged.
- **rm-002 slice done** — first tests for `src/services/upstream-tool.ts`
  (`tests/unit/upstream-tool.test.ts`, 6 tests).
- **M3 done** — `readResource` wired around all five registered resource callbacks
  (status, projects, overview, memories, notes — the projects static handler was
  added in the review-fix round); wire probe
  of the assess defect now returns `-32602` + `data.code` `MAGIC_MCP_RESOURCE_IDENTITY_INVALID`
  (was opaque `-32603`); regression-locked over stdio against the real dist
  (`tests/integration/stdio.test.ts`).
- **M4 done** — runtime binds `MAGIC_CONTEXT_STORAGE_DIR` via upstream's no-arg
  `openDatabase()`; `magic_context_status` now reports `storage_dir`,
  `storage_dir_origin` (`"environment override"` = upstream's label),
  `storage_dir_override`; cross-harness fleet test proves host-write →
  magic-mcp-read through the shared fleet store (`tests/crossharness/shared-store.test.ts`).

M5, M6, M7, M8 remain open. M6's dependency on M1 is now satisfied. Review and
shipping outcomes are recorded after this phase and carried into the next cycle's
assessment.

### Review-fix round (independent_review:fix, 2026-09-20)

Independent review verdict APPROVE (0× P0/P1) with 7 findings; all 7 addressed
the same day: F1 projects static handler wrapped in `readResource` (contract now
complete across all five callbacks); F2 `readResource` mapping table unit-tested
(`tests/unit/resource-errors.test.ts`) + missing-view-path wire test
(`tests/integration/stdio.test.ts`; router-level not-found, outside magic-mcp's
code space); F3 this status section's M2/M3 wording corrected to the real
pipeline; F4 fleet env restore made symmetric for `MAGIC_CONTEXT_STORAGE_DIR` and
`storage_dir_origin` re-derived from the opened handle + env with upstream
precedence (a set-but-outranked override is no longer labeled "environment
override"); F5 packaging guard converted from silent early-return to
`it.skipIf`; F6 real-fence proof added — a real store written by installed 0.42.6
persists schema 85 and is refused (`null`) when reopened with a lower
`latestSupportedVersion` (`tests/integration/schema-fence.test.ts` — integration tier
on purpose: the unit tier's vite config inlines the installed package, which
cannot resolve upstream's undeclared optional peer); F7
`resolvedStorageDir` accepts both path separators. Gate after the round: see the
review-fix validation evidence in the phase spool (suite green, `--no-file-parallelism`).

## Cycle 1 lessons & prevention rules

Reusable conclusions, proven this cycle — apply them before repeating the search:

1. **Inspect the upstream tarball before any pin bump, and diff the *anchor*, not
   just the symbol manifest.** All 32 loader symbols survived 0.40→0.42 while the
   harness anchor silently changed shape (`setHarness("pi")` →
   `setHarness(PI_HARNESS_KIND)`). Symbol presence ≠ contract stability: the
   `note_ids` argument change (M1) reached us through the integration tier, not
   through release notes. Rule: every pin bump runs the full 3-tier suite against
   the real installed package (never mocks), and the loader anchor test table must
   carry a shape per supported series.
2. **The schema fence is a time bomb by design.** `LATEST_SUPPORTED_VERSION` moved
   81 → 85 across the same bump, and upstream migrates the shared store under us
   (83 → 84), after which older builds refuse the DB. Rule: treat a host-side
   Magic Context upgrade as a magic-mcp outage until the pin is re-gated; keep the
   refusal path (`openDatabase → null → MAGIC_MCP_STORE_UNAVAILABLE`) under test
   (`tests/unit/runtime-refusal.test.ts`).
3. **Vitest only externalizes what its `server.deps.external` regex matches *by
   path*.** Fake upstream packages for loader tests must be generated under
   `node_modules/` (e.g. `node_modules/.self-host-pi-magic-context-fixture`) —
   placed anywhere else, Vite SSR inlines them, node resolution hooks never run,
   and the test becomes a silent false-negative. (Learned via
   `tests/integration/compat.test.ts`; fixture is created and deleted by the test.)
4. **Cross-harness truth needs a real second process.** In-process store caching is
   per-path in upstream, but process-level identity (env, harness labels) is not
   reproducible in-process. The `host-actor.mjs` child-process pattern (with the
   `dbPath: "env"` sentinel added for M4) is the way to prove "same store" claims.
5. **Runner vocabulary: this repo is vitest.** `--runInBand` is Jest-only and
   vitest hard-rejects it (`CACError`, exit 1). Serial execution here is
   `npm test -- --no-file-parallelism`. Work orders / CI that template Jest flags
   will fail closed, not degrade gracefully.
6. **Observability beats re-implementation for shared resolution chains.** M4's
   gap was not binding (upstream's own resolution already honored
   `MAGIC_CONTEXT_STORAGE_DIR`) but *seeing* which store was bound. Deriving
   `storage_dir_origin` from the opened handle + `explicitDbPath` — instead of
   re-implementing upstream's env precedence — keeps the two implementations from
   diverging. Same rule applies to any future upstream-resolution surface.

## Cycle 2 carry-over (context for the next cycle's assessment)

Ranked, with state as of 2026-09-20 (all pre-review evidence; review/shipping
outcomes land in the next assessment):

1. **M6 — surface upstream 0.42 tool capabilities** (unblocked by M1). Concretely:
   bulk note dismissal via `note_ids` (1–50) in the `magic_context_note_*`
   schemas, memory `category` update, search-tool natural-language guidance
   parity. The adapter side of `note_ids` already exists (`src/services/notes.ts`);
   only the client-facing schema surface is missing.
2. **M5 — correctness parity + cleanup pack.** Unchanged from its section below,
   with one prerequisite already delivered: `runtime.explicitDbPath` is now public
   read-only (needed by M4's `storage_dir_origin`), so the `status.explicit_path`
   env-vs-runtime-state fix (and the rest of the pack) is a clean, isolated change.
3. **M7 — MCP spec adoption pack** (outputSchema/structuredContent, resource
   `listChanged`, completable arguments) — all supported by the installed SDK
   1.30.0; 17 tool schemas to convert.
4. **rm-001 — high-complexity refactors** (machine-managed `ROADMAP.md`): unchanged.
   Note rm-002's `upstream-tool.ts` slice is satisfied (6 tests); the machine
   manager should re-render from current coverage, not from this note.
5. **M8 watch items** — unchanged, plus one addition: monitor upstream for 0.43 /
   schema > 85 (the fence rule above applies to every future minor); zod 4 stays
   deferred until the SDK peers or a schema need forces it.

---

## Cycle 2 additions (2026-09-20, from adversarial assessment + research)

Sourced from the cycle-2 adversarial assessment (spool `c8ba936e`; gate green at
the union state PR #3 `e07aa43` ∪ `origin/main` `fcceaf9`: typecheck/lint/build 0,
180/180 tests, 25 files) and the cycle-2 research dossier (spool `775c2e28`,
artifact `/tmp/magic-mcp-research-cycle2.md`). Integrity items (N) outrank feature
candidates (F) per the pillars. M5–M8 remain as written above; where an item
extends an M-item it says so instead of duplicating.

### N-items — integrity (assessment findings, none previously tracked)

**N0. Land on the merged base first (prerequisite for every cycle-2 edit).**
- motivation: PR #3 (`e07aa43`) is unmerged and local `main` sits behind
  `origin/main` (`fcceaf9`, CI fast lane); the cycle-2 worktree was cut from the
  stale `835e727`, so any edit made there forks the file history.
- acceptance: cycle-2 implement branch's history contains both `e07aa43` and
  `fcceaf9` (rebase or merge); full gate green on the merged base before the
  first code edit.
- evidence: `git merge-base --is-ancestor e07aa43 HEAD && git merge-base
  --is-ancestor fcceaf9 HEAD` both exit 0; gate log on the merged base.

**N1. Emit `MAGIC_MCP_SEARCH_SESSION_REQUIRED` (high).**
- motivation: `docs/mcp-api.md:149` documents the code; `src/services/search.ts:105–110`
  throws a plain `Error`, so the wire returns `MAGIC_MCP_INTERNAL_ERROR` for a
  session-scoped source without `session_id` (probed 2026-09-20 via
  InMemoryTransport against `dist/`).
- acceptance: `search.ts` raises the typed error with the documented code; a
  wire-level test asserts `isError` + `data.code`; a docs↔code cross-check test
  enumerates every code documented in `docs/mcp-api.md` against a registry of
  emitted codes so drift of this class fails CI.
- evidence: probe transcript before/after; test citations.

**N2. `engines` floor `>=22.5.0` (high, one-liner).**
- motivation: `package.json:8` says `"node": ">=22.0.0"` but `node:sqlite` was
  added in v22.5.0 (nodejs.org/api/sqlite.html; upstream runtime requires it) —
  stock Node 22.0–22.4 boot-fails with `ERR_MODULE_NOT_FOUND`.
- acceptance: `engines.node` ≥ 22.5.0; README/installation state the floor;
  packaging test asserts the floor (fails if loosened below 22.5.0).
- evidence: `node -p "require('./package.json').engines"`; test citation.

**N3. Stale-docs pack (low).**
- motivation: `docs/installation.md:7` and `docs/troubleshooting.md:20` still say
  the 0.40.x series; `docs/installation.md:48` documents harness label
  `[a-z0-9-]{1,32}` while `src/compat/runtime.ts:325` enforces
  `/^[a-z][a-z0-9-]{0,23}$/`.
- acceptance: docs match `pins.ts` (0.42.6, series [0,42]) and the real regex;
  a docs-drift test greps the docs for the pinned series token and re-derives the
  harness pattern from a shared constant.
- evidence: grep outputs; test citation.

**N4. `quick_check` cost decision (medium).**
- motivation: `src/core/diagnostics.ts:313–315` runs `PRAGMA quick_check` (full-DB
  scan) on every `magic_context_status` call and status-resource read, uncached,
  on a single-threaded stdio server — O(store) stall for the shared-fleet stores
  this product exists for.
- acceptance: either (a) throttle+cache with a TTL (spy test proves a second
  status call inside the TTL does not re-run the pragma) or (b) keep per-call and
  document the cost + `MAGIC_MCP_SKIP_DEEP_HEALTH` opt-out; the choice is recorded
  here either way.
- evidence: timing probe on a seeded ≥100k-row store before/after; test citation.

**N5. Loader fail-fast when the entry exposes no WANTED symbol (low).**
- motivation: `src/compat/loader.mjs:141` returns before the harness rewrite when
  `found.length === 0`, so a pathological upstream build would keep the upstream
  default harness instead of failing with `UnsupportedAdapter` — the silent
  mis-attribution `docs/compatibility.md` promises cannot happen.
- acceptance: symbol-less entry fixture → loader throws `UnsupportedAdapter` (or
  rewrites first and then fails symbol checks); unit test with the fixture.
- evidence: test citation.

**N6. Mutation-guard must not evict in-flight reservations (low).**
- motivation: `src/mcp/mutation-guard.ts:83–88` evicts oldest-first regardless of
  state; under capacity pressure (default 256 concurrent) an evicted `PENDING`
  entry lets a duplicate re-execute, violating the documented single-execution
  invariant.
- acceptance: eviction skips `PENDING` entries; unit test with `capacity=2` and a
  racing duplicate proves single execution.
- evidence: test citation.

**N7. Reject `~`-prefixed non-separator paths (low).**
- motivation: `src/core/runtime.ts:143` expands `~foo` to `$HOME + "foo"`
  (`~work` → `/home/agentwork`) instead of rejecting, so users get a confusing
  `MAGIC_MCP_PROJECT_PATH_MISSING` for a path that never existed.
- acceptance: `~` followed by a non-separator fails with
  `MAGIC_MCP_PROJECT_PATH_INVALID`; unit tests for `~`, `~/x`, `~foo`.
- evidence: test citation; docs note.

**N8. Ship a LICENSE file (low).**
- motivation: `package.json` declares MIT but no LICENSE file exists and
  `npm pack --dry-run` (53 files) ships none.
- acceptance: LICENSE (MIT, copyright holder matching package author) exists, is
  listed by `files`/always-included, packaging test asserts its presence in the
  pack listing.
- evidence: `npm pack --dry-run | grep LICENSE`; test citation.

**Note for the machine manager (not hand-edited here):** root `ROADMAP.md` still
shows rm-002 listing `src/services/upstream-tool.ts` as untested (6 tests exist,
green) and "pytest" vocabulary; `hermes-roadmap` is not installed on this host —
re-render from current coverage at the next sync.

### F-items — ecosystem/feature candidates (research dossier `775c2e28`)

Context that reshapes the M7/M8 landscape: MCP spec latest revision is
**2026-07-28** (stateless protocol, `server/discover`, `subscriptions/listen`
replacing `resources/subscribe`, tasks as official extension
`io.modelcontextprotocol/tasks`, MRTR, `ping` removed, Roots/Sampling/Logging
deprecated, `ttlMs`/`cacheScope` on list results, resource-not-found −32002 →
−32602), and the TS SDK forked on 2026-07-27: scoped
`@modelcontextprotocol/{server,client,core,…}@2.0.0` are the live line while the
legacy umbrella `@modelcontextprotocol/sdk` the repo pins (`^1.30.0`) froze that
same day. M7 remains valid on 1.30 (it targets 2025-06-18 features that SDK
supports); F1 below sequences the migration after it.

**F1. SDK 2.0 migration (high effort, gated item).**
- motivation/evidence: scoped 2.0.0 packages published 2026-07-27; legacy umbrella
  frozen at 1.30.0 since; a `@modelcontextprotocol/codemod@2.0.0` exists.
- scope: move to `@modelcontextprotocol/server@^2` (+client for tests), update
  `InMemoryTransport` import paths, keep stdio transport behavior identical.
- acceptance: full gate green; wire-parity probes (error codes incl. the N1 code,
  resource −32602 mapping) byte-identical before/after; docs state SDK 2.x + spec
  2026-07-28 posture; legacy pin removal in one atomic change.
- evidence: probe transcripts before/after; `npm ls @modelcontextprotocol/*`.

**F2. `io.modelcontextprotocol/tasks` extension for slow ops (post-F1).**
- motivation: search/expand/status over fleet-scale stores block the stdio server
  (see N4); the official tasks extension gives clients polling semantics
  (`tasks/get`) plus `tasks/update` input.
- acceptance: written design first (opt-in when client advertises the extension;
  non-opting clients keep blocking semantics); probe transcript of a client
  polling a long search to completion.
- evidence: design note; probe transcript.

**F3. `subscriptions/listen` change notifications (post-F1).**
- motivation: replaces `resources/subscribe`; natural consumers are dashboards
  (upstream wants a stable dashboard token, issue #447); gives M7's notification
  story a 2026-07-28-native mechanism.
- acceptance: opted-in client receives a change notification after a successful
  write; test via SDK 2.x client; non-opting clients unaffected.
- evidence: transcript; test citation.

**F4. Upstream drift sentinel CI (medium, independent).**
- motivation: 22 upstream releases in the 24 days before 2026-09-19, store schema
  83→85 in that window with an open relabel bug (upstream #475), and host-side
  auto-update pins exact versions (#466) — fence breaches are routine, not rare.
- scope: scheduled workflow comparing `npm view @cortexkit/pi-magic-context
  version` against `pins.testedVersion`; on drift, run the upgrade gate (tarball
  anchor+symbol diff, 3-tier suite) and open an issue with results.
- acceptance: workflow_dispatch dry run shows the no-drift path green and a
  forced-drift run opens the issue; fence rule from cycle-1 lessons stays intact.
- evidence: two dispatched run logs + issue link.

**F5. Transitive-dependency audit step (low, independent).**
- motivation: upstream 0.42.6 depends on a dev-build `onnxruntime-web`, and
  upstream #480 documents a vulnerable `adm-zip` reaching consumers when root
  overrides don't propagate.
- acceptance: CI runs `npm audit --omit=dev` (or osv-scanner) failing on high+;
  current tree green or exceptions listed in-repo with expiry.
- evidence: CI log; exception file if any.

**F6. Subagent/delegation surface (needs product choice).**
- motivation: upstream dashboard now keys subagent visibility off
  `session.parent_id` (0.42.6) and upstream #449 requests task-scoped memory
  prefetch by ID for subagent delegation — the exact workflow Hermes runs.
- acceptance if chosen: sessions expose parent linkage through upstream APIs (no
  raw SQL beyond the diagnostics exception); optional read-only prefetch-bundle
  tool; probe + tests.
- evidence: probe transcript; upstream API citations.

**F7. Read-only markdown export (needs product choice).**
- motivation: the competitor portability axis is markdown+git (basic-memory 4k★,
  mnemonic 29★ "No database"); magic-mcp's differentiator (zero-copy bridge to the
  live host store) is untouched by giving bridge users an export path.
- acceptance if chosen: deterministic markdown tree per project (memories+notes);
  counts match the M5 consistency tests; strictly read-only; docs.
- evidence: exported fixture diff; test citation.

**F8. zod 4 alignment (after M6).**
- motivation: upstream already runs zod ^4.1.8; SDK accepts `^3.25 || ^4`; latest
  is 4.6.5 vs pinned ^3.25.76.
- acceptance: single zod 4.x in the tree; all 17 schemas converted; suite green.
- evidence: `npm ls zod`; suite log.

**F9. Staged toolchain refresh (low urgency, last).**
- motivation: vitest 3.2→5.0, @types/node 24→26, biome 2.5.1→2.5.14 (safe minor),
  TypeScript 5.8→7.0 (native port — highest risk).
- acceptance: one step per PR, gate green each; vitest config migration notes
  recorded here; serial execution still `--no-file-parallelism` (lesson 5).
- evidence: per-step gate logs.

**M6 extension (fold into the M6 batch, not a separate item):** the client-facing
note schemas must be `note_ids` arrays exactly per 0.42.6 (`update`: exactly one
id; dismiss: 1–50; source: release notes #460 — the adapter side already speaks
arrays per the cycle-1 status note), and the batch must record an explicit
decision on filler-argument strictness: upstream 0.42.6 *ignores* filler args on
`ctx_*` tools while magic-mcp's strict zod + `rejectUnknownArguments` rejects
them — keep-and-document or tolerate, but decide.

### Cycle-2 recommended implement order (subject to cycle-2 planning)

N0 (merge base) → N2 + N3 + N8 + N1 (small integrity fixes, incl. the new
docs↔code cross-check test) → M6-extension + M5 slices → N4–N7 → F4 + F5 (CI
additions) → M7 → F1 (gated) → F2/F3 (post-F1) → F6/F7 (product choice) →
F8 → F9. Cross-item acceptance rules above apply unchanged.

## Cycle 2 selected batch (prioritize, 2026-09-20, spool `76b1545a`)

Selection logic: pillars (reliability > customer experience), cycle-1 capacity
calibration (4 M-items + review-fix round ≈ 12–15 h of gated work), dependency
gates (N0 is a hard precondition; F2/F3 blocked on F1; M7 re-touches all 17 tool
schemas that F1 will re-touch again — sequenced together in cycle 3, not now),
and runner serialization (memory #5322: one self-hosted runner — F4 uses weekly
cron + manual dispatch to avoid PR-queue contention).

**In batch (order = landing order, gate-green between tiers):**
1. **N0** merge base `e07aa43 ∪ fcceaf9` (0.5 h; conflict-free per assess —
   disjoint file sets). Everything else lands on top of this.
2. **Tier A — documented-contract integrity (mandatory, ≈ 4 h):** N1 (emit
   `MAGIC_MCP_SEARCH_SESSION_REQUIRED` + wire test + docs↔code literal-scan
   cross-check test — no central error registry exists, so the test scans
   `MAGIC_MCP_*` literals in `src/` vs `docs/mcp-api.md`, keeping N1 a small
   change), N2 (engines ≥ 22.5.0), N3 (stale-docs pack + drift test), N8
   (LICENSE + packaging assertion).
3. **Tier B — reliability guard-band (mandatory, ≈ 2.5 h):** N6 (guard must not
   evict `PENDING` — protects the documented single-execution safety invariant),
   N7 (reject `~foo`), N5 (loader fail-fast on symbol-less entry).
4. **Tier C — customer value (mandatory, ≈ 3–4 h):** M6 + extension — expose
   `note_ids` arrays client-side (schemas.ts:246/272/282 still singular while
   `src/services/notes.ts:297–329` already speaks arrays — the adapter side is
   done, only the client surface + tests remain), `memory_update` `category`,
   search guidance parity, and the recorded filler-argument decision (default:
   keep strict + document the divergence from upstream 0.42.6's ignore-fillers
   behavior; revisit under F1).
5. **Tier D — CI automation pair (slip-first if slack runs out, ≈ 3 h):** F4
   upstream drift sentinel (weekly cron + `workflow_dispatch`; drift → run
   upgrade gate → open issue) and F5 transitive-dep audit step. These are
   additive-only and may slip to early cycle 3 without stranding anything;
   dispatch evidence lands at the CI phase.

Slip order if the review-fix round consumes slack: D (F4/F5) → tail of B (N5)
→ N7. Tiers A and C do not slip — A closes every remaining documented-contract
lie on the wire, C is the cycle's committed customer value.

**Explicitly out of this cycle (with reasons):** N4 (quick_check cost decision
needs a seeded-store timing probe — deferred to cycle-3 assessment start), M5
full pack (multi-part; cycle-3 should own it whole or take a named slice), M7
(fold into F1's SDK-2.0 cycle so the 17 schemas are converted once, not twice),
F1/F2/F3 (F1 is a gated dedicated cycle; F2/F3 depend on it), F6/F7 (need a
product choice), F8 (zod 4 after M6 — cycle 3), F9 (toolchain — last), rm-001
(machine-managed `ROADMAP.md`, owner's queue).

