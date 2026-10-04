# 2026-10-04 — repository-maintenance cycle:2 implement batch (run aa303cabed3e)

- **Run:** aa303cabed3e48f68d16989d12d4f81a (repository-maintenance, cycle:2) — phases: assess 8559ff0e · research 80aa6205 · roadmap e9fefe15 (patch delivery) · prioritize 78f86dce (adopted 4acbd38b) · stewardship 5986b2f2 · **implement 40ee332d (this doc)** @ base 227375247 == origin/main (ff-checked, 0/0)
- **Batch:** B0 bookkeeping + B1 rm-187 (guarded listener links parse) + B2 rm-624 (GraphQL deprecation-watch canary). Selection rationale: `…/4acbd38b…-scratch/2026-10-04-prioritize-cycle2-batch-run-aa303cab.md` + adoption verification `…/78f86dce…-scratch/`.

## B1 — rm-187: guarded links cell in the listener store

**Change.** `src/listener/store.ts`: exported `parseLinksCell(raw: string | null | undefined)` returns `{links, degraded}` — a corrupt cell (non-JSON, empty, wrong-shape object, non-link array elements, or the SQL-unreachable null/undefined variants) maps to `[]` with `degraded: true`; a valid cell passes through untouched. `rowToMessage` takes an injected `degradationReporter` (default no-op). `createListenerStore` owns a `degradedLinksIds` set + `noteDegradedLinks(id)`: one `logger.warning('listener message degraded: links cell failed to parse; serving empty links', {messageId, degradedLinksCount})` **per message id, once per store lifetime** — polling `list()` repeatedly cannot inflate the log or the count. `list()` returns `degradedLinksCount` = `degradedLinksIds.size` (process-lifetime count of distinct degraded row ids, deduped by id — a degraded row that later scrolls out of the limit window stays counted; same shape as `prunedCount`, per docs/contracts/operator-listener-channel.md). `src/listener/contract.ts`: `MessagesResponse` gains `readonly degradedLinksCount: number`. `docs/contracts/operator-listener-channel.md`: response object documents the field. `web/src/api/listener.ts`: field typed **optional** (`degradedLinksCount?: number`) so this server change alone cannot break the web build (the stale-web-dist production window is covered).

**Red-first transcript (negative-verified BEFORE the fix, 2026-10-04 12:0xZ; independently re-derived at adoption 15:3xZ — see the addendum):**

```text
npx vitest run test/listener-store.test.ts test/listener-routes.test.ts
7 failed | 32 passed
  ✕ listener store — guarded links cell (rm-187) > a non-JSON links cell degrades …
    SyntaxError: "{"truncated is not valid JSON  ← thrown from src/listener/store.ts:51 (the unguarded JSON.parse)
  ✕ … empty-string / non-array JSON / junk-elements / degradation-observable tests — same root
  ✕ parseLinksCell seam test — "parseLinksCell is not a function"
  ✕ GET /api/listener/messages with a corrupt links cell → the app-level test failed while the endpoint 500'd on the same SyntaxError
```

After the fix: **45/45** across `test/listener-store.test.ts` + `test/listener-routes.test.ts`; endpoint test asserts **200** with both rows, degraded row's `links: []`, healthy row intact, `degradedLinksCount: 1`. A fifth pre-existing property-based suite (`test/listener-contract.property.test.ts`, rm-233) also passes untouched.

## B2 — rm-624: GraphQL deprecation watch

**Change.** NEW `src/github/query-deprecation.ts` (zero-import by design, rm-288 law — only a type import from `query-registry.ts`; verified: `env -u GITHUB_TOKEN node scripts/graphql-canary.ts` loads the module graph clean): `WATCHED_QUERY_TYPES` (5), `INTROSPECTION_TYPES_PER_QUERY = 2` (live GitHub cap, INTROSPECTION_LIMIT_EXCEEDED), `extractReferencedNames` (tokenizer: strips `#` comments; paren/input-object depth tracking; args vs field names; aliases resolve to the real field; enum literals + input-object keys + `… on Commit` type names + operation names skipped), `buildIntrospectionQueries` (aliased `t0/t1`, `fields(includeDeprecated: true)` — plain `fields` HIDES deprecated fields and a watch that cannot see them cannot fire), `collectDeprecationFindings` (injected `FetchLike`, **throws fail-closed** on HTTP≠200 / missing `data` / null type — a watch that cannot see the schema must not report green). Disclosed scope: field-name superset semantics (a deprecated field name matching any referenced field OR arg name fires; the finding carries type + reason for human adjudication); arg-level `deprecationReason` not checked (needs a per-field `__type` walk that cannot fit the 2-per-query cap).

`scripts/graphql-canary.ts`: after the per-template loop, binds a token-attached fetch (same auth as `runTemplate`) and runs the watch; findings print `type.field is deprecated ("<reason>") … referenced by: <templates>` then exit 1; watch-OK prints and falls through.

**Born-green, live:** `GITHUB_TOKEN=$(gh auth token) node scripts/graphql-canary.ts` → both templates OK + `canary: deprecation watch OK — 5 watched type(s), zero deprecated names referenced (rm-624)`, **rc=0** (log: `…/40ee332d…-scratch/canary-live-run.log`). First wiring attempt passed raw `fetch` (no auth) and the watch correctly **failed closed on HTTP 403** — accidental live verification of the transport-failure path, fixed the same turn.

**Offline tests:** NEW `test/graphql-canary-deprecation.test.ts` — 8 tests, 4 groups: extraction over the REAL registered templates (nested fields, args, negatives incl. enum literals/input-object keys/type names/operation name/aliases), batching (3 queries ≤2 `__type`, `includeDeprecated: true`), green baseline (0 findings, 3 calls), firing behavior (referenced deprecation fires with reason + both template names; unreferenced `ghostField` does NOT; arg-position match fires), fail-closed (HTTP 500 / no `data` / null type each throw).

## B0 — bookkeeping

`git apply` of the roadmap phase's delivery-verified patch (198→203 defs, mints rm-623..rm-627 + riders + header disclosure), then three def-line edits: **rm-187 → implemented** (with this batch's attribution), **rm-623 → folded into rm-607 by content** (sibling run 733651705ae2's uncommitted implement d9f248c5 owns the CSRF-refresh seam — never co-edit), **rm-624 → implemented + convergence with rm-359** (run fa70a92c8347's unlanded 2026-10-01 mint, absent from main; this implementation satisfies both acceptances — no re-mint).

## How to verify (focused — repo-wide gates belong to full_tests)

```text
npx vitest run test/listener-store.test.ts test/listener-routes.test.ts test/listener-contract.property.test.ts test/graphql-canary-deprecation.test.ts test/query-shape-guard.test.ts   # 60/60
npx eslint src/listener/store.ts src/listener/contract.ts src/github/query-deprecation.ts scripts/graphql-canary.ts test/listener-store.test.ts test/listener-routes.test.ts test/graphql-canary-deprecation.test.ts ROADMAP.md   # clean
pnpm check-types   # rc=0 (server + web + .opencode)
GITHUB_TOKEN=$(gh auth token) node scripts/graphql-canary.ts   # live born-green, rc=0
npx vitest run test/roadmap-length-guard.test.ts test/prose-residue-guard.test.ts   # ledger guards
grep -c '^- id: `rm-' ROADMAP.md   # 203; sort -u -d → 0
```

## Deferred (from the prioritize phase, unchanged)

rm-627 zizmor CI audit (next cycle), rm-625 (decision first), rm-626 (86c2dd13 seam), rm-623→rm-607 (folded, sibling-owned), F2/rm-149, F4 web localStorage (rm-548/608 sibling lane), F5, F7, F10. Dependabot first-scheduled-run window (Mon 2026-10-05) flagged to the roadmap phase — sibling run-845265c83109 owns that file today.

## Addendum — adoption re-verification (attempt 89ffeaa0, 2026-10-04 15:2xZ)

Attempt chain: implement 40ee332d completed SUCCEEDED 13:11:27Z (event log) but
its typed PhaseResult was lost in transport, so the engine re-dispatched;
c35b0bdb (13:34:26Z) died in 32s of a provider failure with zero tree edits
(all mtimes sit inside 40ee332d's 12:15–12:29 window); this attempt
(89ffeaa0) ADOPTED the 40ee332d batch after fresh re-verification:

- identity/lineage: run aa303cabed3e · implement:implement — matches; tree census 11 lines (8 M + 3 ??) identical to the 40ee332d result's claim.
- `npx vitest run` 7 suites → **63/63**; `pnpm check-types` → **rc=0**; `npx eslint --no-cache` on all touched files → **0 errors** (cold lint, no cache).
- live canary re-run → rc=0, deprecation watch still born-green; `env -u GITHUB_TOKEN node scripts/graphql-canary.ts` → module graph clean, token guard fires (zero-import law holds).
- base-red independently RE-DERIVED: a store built from `git show HEAD:src/listener/store.ts` (base 227375247) throws `SyntaxError` on a seeded corrupt cell — the fixed tree serves it degraded.
- race census: origin/main advanced 227375247→ff19de2 (29 commits, PR #377) but `git diff HEAD origin/main -- <all 10 batch surfaces>` is EMPTY and zero of the 29 commits mention rm-187/rm-624; fleet dirty-sweep over 208 sibling worktrees → 0 hits on any batch surface.
- ROADMAP census: 203 defs / 0 dups / max rm-627; def-line statuses rm-187 implemented · rm-623 folded→rm-607 · rm-624 implemented (+rm-359 convergence).
- doc corrections made by the adopting attempt: `degradedLinksCount` semantics above now match the code and wire-contract doc verbatim (process-lifetime, deduped by id), the quoted log line is the literal emitted string, and the two fenced blocks carry a language tag (markdown/fenced-code-language).
