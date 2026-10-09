# Dashboard maintenance batch (2026-10-09, run 84133641d624)

repository-maintenance 92e87db278624e3dbbe0b163e6c5bc51 cycle:1 · run
`84133641d62448c193ff7c6a299228e0` · batch **'Ingest-and-client observability
cures'** · selected at prioritize `4ec91f7608784ec1b0378aac47b55555` ·
implemented at `758c9f04f0cb4a238c09735f37ba28eb` · composed against
origin/main `546c93c` (dispatch base `7055c52`, two landings behind at
composition — the 788aa489 lane landed mid-run; worktree fast-forwarded to
`546c93c` before the ledger ride applied).

## Inputs

- Assess `7a1208d9` (fresh adversarial read at `7055c52`): F3 = the two client
  parse sites run `await res.json()` outside the contract-drift
  classification.
- Research `87ca2dc9` (ecosystem + lane-recovery): C7 = same seam named with
  live line cites.
- Roadmap `5e16128c` (ext#39): minted rm-790 as the only zero-sibling-claim
  candidate; census 245 / 0 / rm-790; guard pin 778 → 790.
- Prioritize `4ec91f76`: batch selection + congestion audit (below).
- Stewardship `1e59f3ae`: surfaces re-verified by direct read; change-unit
  separation; hard exclusions (no workflow edits, no branch-protection
  mutation, no ingest-auth semantics changes).

## Batch

1. **rm-790 (LEAD) — drift channel misclassifies malformed-JSON 2xx bodies as
   network errors** — `web/src/api/listener.ts` + `web/src/api/monitoring.ts`:
   the bare `await res.json()` sat before the contract-drift classification, so
   a 2xx body that is not valid JSON (proxy interception page, wrong-route
   HTML, a serialization change) threw into the generic network path and
   rendered as a network error instead of the drift banner the seam exists to
   surface.
2. **rm-215 (RIDER) — listener ingest evidence persistence** — the
   per-message-drop counter half of this def landed earlier with the
   `droppedCount` surfacing; the evidence half completes it: an authenticated
   delivery's auth variant + digest of the exact verified raw body now persist
   with the message, so a client-side parse drop can be attributed to the
   delivery that produced it.
3. **ext#39 ledger ride** (mandatory): ROADMAP extension #39 + both selection
   markers + guard pin 790, applied as the validated prioritize patch against
   `546c93c`.

## Selection floor (congestion audit, first-hand at prioritize)

- Live unresolved pool re-derived from the ext#39 postimage: ~60 candidates;
  top priorities rm-104 (p98), rm-279 (p96), rm-103 (p85), rm-149 (p66),
  rm-281 (p62), rm-116 (p58).
- Sibling hold-map over all 11 unlanded worktrees' selection markers:
  rm-790 and rm-215 appear in NO sibling selection list and NO sibling mint
  list — the only zero-collision pairing in the observability theme.
- Passed over with owners: rm-279 held by run-f510a33e AND its premise decayed
  (all 7 workflows × 2 latest runs green, no timeouts); rm-149 (PKCE) unclaimed
  but exceeds one-cycle envelope; rm-116 requires live branch-protection
  mutation (out of tree-work scope); rm-157/252/281 gated on the 2026-10-13
  rm-252 absorb DECISION; rm-599 obsolete (no-store landed at src/server.ts:743
  / :1166); rm-682 obsoleted by the ext#32 fence; cve-tripwire NODE_IMAGE +
  action re-pins tri-claimed (rm-782/783/784/787/788) — excluded hard.

## Implementation (this phase)

**rm-790** — `web/src/api/listener.ts` (`fetchListenerMessages`) and
`web/src/api/monitoring.ts` (`fetchMonitoring`): the `res.json()` call moved
inside a `try` that returns `contract-drift` on a parse failure of an
`ok` (non-401/non-redirect) response; an `AbortError` during the body read
keeps the pre-existing classification (`timeout` in listener; rethrow so the
monitoring outer catch maps it to `timeout`). Transport rejections and non-ok
statuses are untouched.

**rm-215** — additive evidence chain, auth semantics untouched:

- `src/listener/ingest-auth.ts`: `verifyIngestSignature` success type
  `Result<true, E>` → `Result<IngestAuthSuccess, E>` with
  `{variant: 'hmac-sha256-v1', rawDigest: sha256(rawBody)}`; the digest is
  unkeyed evidence computed from the exact bytes that were signature-verified.
- `src/listener/contract.ts`: `IngestEvidence` + `IngestVariant` (closed
  literal); `ListenerMessage` gains `ingestVariant: IngestVariant | 'legacy'`
  and `rawDigest: string | null`.
- `src/routes/listener.ts`: ingest handler threads the auth result's evidence
  into `store.insert`.
- `src/listener/store.ts`: `ingest_variant`/`raw_digest` columns (NULL-backed);
  in-place `ALTER TABLE` migration for pre-evidence databases guarded by
  `PRAGMA table_info` (rows surface as the `'legacy'` display class on read);
  dedupe replay refreshes the evidence to the latest verified delivery;
  `insert(input, evidence)` signature.
- `web/src/api/listener.ts`: `parseMessage` carries the fields — absent
  (older server) tolerates and normalizes to `null`; a wrong-typed value is a
  per-message contract mismatch → counted drop.

**Ledger ride** — ext#39 + selection markers applied from the validated
prioritize patch; rm-790/rm-215 def-lines flipped `open (selected …)` →
`implemented (2026-10-09, … implement 758c9f04… — …; prior: selected …; prior:
added …)`.

## Verification (focused/impacted only; full tests reserved for the later gate)

- Server suites: `pnpm exec vitest run test/listener-store.test.ts
  test/listener-routes.test.ts test/listener-ingest-auth.test.ts
  test/listener-contract.property.test.ts test/endpoint-parity-guard.test.ts
  test/read-only-invariant-guard.test.ts test/roadmap-integrity-guard.test.ts`
  → 7 files / 70 tests passed.
- Web suites (every suite importing the touched seams, incl. views):
  `pnpm exec vitest run --config web/vitest.config.ts web/src/api/listener.test.ts
  web/src/api/monitoring.test.ts web/src/views/Listener.test.tsx
  web/src/views/Monitoring.test.tsx web/src/App.test.tsx web/src/sw.test.ts`
  → 6 files / 107 tests passed (`web/dist` built first via `pnpm build:web` —
  direct vitest bypasses `pretest`).
- Static gates: `pnpm check-types` clean (server + web + .opencode);
  `pnpm lint` clean (after mechanical fixes: import order in contract.ts,
  array-type style in store.ts, and a markdown label-ref escape in the ext#39
  minted evidence line `findings[2]` → `findings item 3`).
- Ledger battery: `scripts/roadmap-census.ts` → 245 defs / 0 dups / max rm-790
  healthy, exit 0; roadmap-integrity-guard + length guard green via the suite
  run above; `eslint ROADMAP.md` clean.

New tests: rm-215 store round-trip, dedupe-replay evidence refresh, pre-evidence
DB in-place migration; rm-215 route-level evidence persistence (digest
re-computable from the raw body with plain sha256); rm-790 three cases per site
(non-JSON 2xx → drift; valid JSON unchanged; abort during body read keeps
timeout); rm-215 client golden/absent-tolerated/wrong-typed-dropped.

## Landing notes (commit phase)

- Batch content: `src/listener/{ingest-auth,contract,store}.ts`,
  `src/routes/listener.ts`, `web/src/api/{listener,monitoring}.ts`,
  `test/listener-{store,routes}.test.ts`, `web/src/api/{listener,monitoring}.test.ts`,
  `ROADMAP.md`, `test/roadmap-integrity-guard.test.ts`, this doc. No workflow,
  no config, no remote dependencies.
- Union hazard: sibling lanes hold rm-780..rm-789 ROADMAP-tail claims — re-probe
  the live frontier before landing; ext#39's census comment is the integrate
  obligation anchor if main advanced past `546c93c`.
