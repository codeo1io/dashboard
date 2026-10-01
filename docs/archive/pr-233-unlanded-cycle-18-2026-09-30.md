# PR #233 unlanded cycle-18 content archive (2026-09-30)

Durable in-repo archive of the UNLANDED content unique to ephemeral validation
PR #233 (run 11121ee8 cycle-18 snapshot), added 2026-09-30 by run
26210bbbb651 (independent_review:fix) under the disposition recorded in
ROADMAP.md (rm-159 rider) — see also
docs/solutions/workflow-issues/ci-validator-poll-window-vs-cold-lint-2026-09-29.md.
The PR's `conductor/ci-*` refs are scheduled for deletion once the
disposition's close-then-delete steps execute; this file preserves the
unlanded units in the repo tree itself, because a delegate spool is a
transient home and must never be the sole copy.

## Provenance

- PR #233: open draft, base ref `conductor/ci-base-2f8680bfaa59` (marker
  commit 2f8680bfaa59e7c8ec81a08e64377abf1f985274, proven content-free —
  `git diff --stat d89ffe7 2f8680bfaa59` is empty), head ref
  `conductor/ci-c05313a9ec2a`.
- Cross-proof (executed 2026-09-30): the delegate-spool copies and the
  head-ref extractions both hash to the full pinned values below; the
  transient spool copy `b1e6299fc53c4441a1aed8aefa242ddb-unique-content/`
  still existed at archive time and hashed identically — this in-repo copy
  supersedes it as the source of record.
- Landed units of the cycle-18 batch (rm-261..rm-264 lineage) are already on
  main; unique-to-this-ref UNLANDED units:
  - **U3** — rate-limit store admission cap (`RATE_LIMIT_MAX_KEYS`,
    `rateLimitStoreSize`): the src/server.ts hunks plus the 77-line red test
    (Artifacts C and A).
  - **U5** — env-docs census widening to the `GATEWAY_*` prefix (rm-255): the
    test/env-docs-guard.test.ts hunk of Artifact C.
- None of the three artifacts exists in the current tree: verified 2026-09-30
  that `test/rate-limit-key-cap.test.ts` is absent,
  `docs/prioritization/2026-09-29-cycle-18-batch-run-11121ee8.md` is absent
  at HEAD, `src/` carries no `RATE_LIMIT_MAX_KEYS`/`rateLimitStoreSize` read,
  and `test/env-docs-guard.test.ts` has no `GATEWAY_` token.

## Artifacts

| # | artifact | lines | bytes | sha256 (full value below) |
|---|----------|-------|-------|---------------------------|
| A | test-rate-limit-key-cap.test.ts (U3 red test) | 77 | 3079 | a808dced… |
| B | cycle-18-batch-run-11121ee8.md (batch frame doc) | 110 | 6737 | 49e73255… |
| C | server-cap-and-env-guard.diff (U3+U5 implementation diff; normalized 2026-10-01, see below) | 250 | 12676 | 3a8ddd40… |

- A: `a808dcedcd64b7a1539758ca4f05e3899316b513f714e7ecb37a72661978a3cc`
- B: `49e73255a7fd226e65b2aaf0e6e577f343bd8bbdaa931a46a0cf6680fa3e2290`
- C (normalized 2026-10-01, rm-337 rider): `3a8ddd405259a9effcf5d911e334563c484f17acbe3906983dbe13b557e91a2b`
- C (pre-normalization, as extracted from the refs 2026-09-30): `b8c6ea0fb80437ec3aed2738cb8738cb0c8c67b5f6f7aadcbe49abe5f74a128b`

## Regeneration and verification

While the refs still live:

    git show origin/conductor/ci-c05313a9ec2a:test/rate-limit-key-cap.test.ts | sha256sum
    git show origin/conductor/ci-c05313a9ec2a:docs/prioritization/2026-09-29-cycle-18-batch-run-11121ee8.md | sha256sum
    git diff d89ffe7 origin/conductor/ci-c05313a9ec2a -- src/server.ts test/env-docs-guard.test.ts | sha256sum

(2f8680bfaa59e7c8ec81a08e64377abf1f985274 is an equivalent diff base — its
tree equals d89ffe7's.)

After the refs are deleted, THIS file is the source of record. Each fenced
block below reproduces its artifact byte-exactly: the content lines between
the opening info-string fence and the closing fence, every line
newline-terminated, no other bytes. Verify with:

    awk '/^````archive-A$/{f=1;next} f && /^````$/{exit} f' docs/archive/pr-233-unlanded-cycle-18-2026-09-30.md | sha256sum

(same with `archive-B`, `archive-C`) — each must print the pinned value.

## Post-archive normalization (2026-10-01, rm-337 rider)

The Lint-gate revival (ROADMAP rm-337, conductor run f9854748fa28) requires
`pnpm lint` to complete and pass repo-wide; this document carried 11
trailing-whitespace errors (`markdown/no-trailing-spaces`), every one of
them an empty git-diff context line — a single space — inside Artifact C
(block-region lines 290, 313, 335, 337, 350, 380, 465, 473, 497, 508, 513).
Those 11 lines were stripped to empty lines on 2026-10-01; this is the only
byte change ever made to an archived artifact block in this file.

- Artifact C now pins `3a8ddd405259a9effcf5d911e334563c484f17acbe3906983dbe13b557e91a2b`
  (250 lines / 12676 bytes). Artifacts A and B are byte-identical to their
  2026-09-30 extraction (verified by the recipe above after normalizing).
- The pre-normalization pin `b8c6ea0fb80437ec3aed2738cb8738cb0c8c67b5f6f7aadcbe49abe5f74a128b`
  (250 lines / 12687 bytes) is retained in the Artifacts list above.
- Recoverability: the original bytes live in git history —
  `git show 31995a2:docs/archive/pr-233-unlanded-cycle-18-2026-09-30.md`
  (blob `5c3348e4bf999c6c27e63af54935e2f5c659437d`, the 2026-10-01 base of
  this maintenance cycle) carries the pre-normalization block, and the awk
  recipe above run against that blob's content reproduces the
  pre-normalization pin exactly.

## Artifact A — test-rate-limit-key-cap.test.ts (U3 red test; 77 lines)

````archive-A
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {checkRateLimit, rateLimitStoreSize, resetRateLimitForTesting} from '../src/server.ts'

/**
 * rm-251: the limiter store must enforce a hard key-count cap. At capacity a
 * NEW key first triggers a stale-window sweep; if the store is still full the
 * request fails closed (429). Existing keys are never evicted by cap pressure.
 *
 * The default cap is 10_000 distinct keys; these tests drive the real default
 * (no env override needed) with unique synthetic addresses.
 */

const CAP = 10_000
const WINDOW_MS = 60_000
const STALE_AGE_MS = 2 * WINDOW_MS

beforeEach(() => {
  resetRateLimitForTesting()
})

afterEach(() => {
  resetRateLimitForTesting()
})

describe('rm-251 rate limiter key-count cap', () => {
  it('the store never exceeds the cap: unique keys fill exactly to capacity, then fail closed', () => {
    const now = 1_000_000
    // Fill the store to capacity with unique clients.
    for (let i = 0; i < CAP; i++) {
      expect(checkRateLimit(`10.0.${Math.floor(i / 250)}.${i % 250}`, now)).toBe(true)
    }
    expect(rateLimitStoreSize()).toBe(CAP)

    // One more UNIQUE key at the same instant: at capacity, nothing stale to
    // evict → fail closed (429), and the store must not grow.
    expect(checkRateLimit('192.0.2.1', now)).toBe(false)
    expect(rateLimitStoreSize()).toBe(CAP)

    // An EXISTING key is unaffected — cap pressure never evicts a live client.
    expect(checkRateLimit('10.0.0.1', now)).toBe(true)
    expect(rateLimitStoreSize()).toBe(CAP)
  })

  it('at capacity, a stale-window sweep runs before failing closed — fresh keys are admitted after eviction', () => {
    const t0 = 1_000_000
    // Fill with keys whose windows are all stale at t0 + STALE_AGE_MS + 1.
    for (let i = 0; i < CAP; i++) {
      expect(checkRateLimit(`10.1.${Math.floor(i / 250)}.${i % 250}`, t0)).toBe(true)
    }
    expect(rateLimitStoreSize()).toBe(CAP)

    const later = t0 + STALE_AGE_MS + 1
    // New key at `later`: admission finds the store full → sweep evicts every
    // stale window (all CAP entries) → the new key is admitted.
    expect(checkRateLimit('192.0.2.9', later)).toBe(true)
    expect(rateLimitStoreSize()).toBe(1)
  })

  it('a new key whose admission sweeps only SOME stale entries still lands under the cap', () => {
    const t0 = 5_000_000
    // Half old (stale), half fresh.
    for (let i = 0; i < CAP / 2; i++) {
      expect(checkRateLimit(`10.2.${Math.floor(i / 250)}.${i % 250}`, t0)).toBe(true)
    }
    const mid = t0 + WINDOW_MS + 1
    for (let i = 0; i < CAP / 2; i++) {
      expect(checkRateLimit(`10.3.${Math.floor(i / 250)}.${i % 250}`, mid)).toBe(true)
    }
    expect(rateLimitStoreSize()).toBe(CAP)

    const later = t0 + STALE_AGE_MS + 1
    // The t0 half is stale now; the mid half is not. Admission sweeps the
    // stale half (5000) and admits the new key → size 5001, well under cap.
    expect(checkRateLimit('192.0.2.10', later)).toBe(true)
    expect(rateLimitStoreSize()).toBe(CAP / 2 + 1)
  })
})
````

## Artifact B — cycle-18-batch-run-11121ee8.md (batch frame doc; 110 lines)

````archive-B
# Dashboard maintenance — cycle-18 batch, run 11121ee89bf34eab8ec54c3125cca8b2 (2026-09-29)

Repository-maintenance cycle:1 run; selected by the prioritize phase at HEAD
d89ffe7 (origin/main fresh-verified) with this run's own artifacts in-tree:
assess 2435d99b, research 4aa7b41b, roadmap 1ab3faa8 (the ROADMAP patch riding
as B0). Fifty-two open-queue items were scored on impact, risk, effort,
dependencies, and strategic value; the blocked head of the queue is excluded by
rule, not by neglect — the exclusion ledger below records why each is out.

Theme: **harden the trust boundary and stop wasting the budget.** Every unit
either closes a gap this cycle's own assess/research evidenced with file/line
proof, or lands the top non-blocked security item (untouched since 2026-09-23).
All five units are server/web-local, independently test-shaped, and carry zero
push-authority, live-gateway, product-decision, or event-window prerequisites.

## B0 — base + ledger rider

ROADMAP.md carries this run's roadmap-phase apply (41 insertions / 9 deletions,
diff sha256 prefix 5bc70efd0c09bed6; mints rm-251..rm-255 above the verified
all-lineage max rm-250; nine dated signals). It rides the delivery byte-identical
unless a unit's status flip must be stamped at landing time (house convention).

## U1 — OAuth PKCE for the operator login path (rm-149, security, p66)

The highest-value non-blocked item in the queue, open since 2026-09-23 ("the
cycle-9 auth-theme headliner handoff never picked it up"). The authorization
redirect is state-only — no code_challenge anywhere in src/ or web/src/ — while
GitHub's own OAuth docs now document PKCE as strongly recommended (S256 only).
Scope: S256 code_challenge on the redirect, verifier in a short-lived HttpOnly
SameSite=Lax cookie mirroring the state pattern, code_verifier at the exchange,
rejection tests for challenge-absent and verifier-mismatch plus the happy path.
Additive and backwards-compatible; self-contained in `src/routes/auth.ts`.

## U2 — steady-state GitHub call budget (rm-162, performance, p60)

The single biggest standing rate-limit win: buildWorkingSet re-issues
resolveInstallationIdForRepo for every metadata-only repo every 60s cycle and
the metadata reader re-resolves the codeo1io/.github installation per cycle —
1+N uncached App-JWT installation GETs per minute forever, with no If-None-Match
anywhere although GitHub documents 304s as free against the primary rate limit.
Scope: memoize the effectively-immutable installation resolution (TTL + 404
invalidation path, tested for hit/miss/invalidation), carry If-None-Match from a
stored ETag on the metadata contents read and repo pagination, treat 304 as
unchanged. Shrinks the silent-drop exposure window (the rm-112/rm-221 family) at
the source rather than patching symptoms.

## U3 — rate-limiter store admission cap (rm-251, security, p38)

Port of fro-bot/agent v0.117.0's MAX_KEYS defense onto our limiter
(server.ts:122 rateLimitMap: sweep eviction + 64-char prefix cap today, no
absolute bound — unbounded growth between sweep windows under spoofed first-hop
XFF or many real IPs). Scope: documented MAX cap, evict-stale-then-fail-closed
(429) at capacity, over-cap test fixture asserting store shape and handling.
Minted this cycle from research C3; upstream file cited line-exact in ROADMAP.

## U4 — Monitoring view poll wedge (rm-252, reliability, p44)

The newest view (rm-192) shipped without rm-155's poll hygiene: the fetch latch
releases only on settle, the per-fetch AbortController is never aborted, and
there is no timeout race — one hung `/api/monitoring` response permanently
freezes the 60s poll with no client-side stale indicator (assess F2 this cycle;
independently corroborated by assess 66af0f04 at the same HEAD). Scope: copy
rm-155's landed Listener.tsx shape verbatim — finally-latch, abort-on-unmount,
documented timeout race — plus a never-settling-fetch regression test.

## U5 — env-docs guard census widening (rm-255, docs, p26)

Verified live this run: `GATEWAY_ALLOWED_OPERATOR_LOGINS` (the fail-closed
operator login allowlist — a security control) is read at src/server.ts:215,
has zero README mentions, and test/env-docs-guard passes because ENV_TOKEN
matches only `DASHBOARD_*`/`RATE_LIMIT_*`. Scope: widen the guard's token
census to cover GATEWAY_* reads (red-first), document the variable with its
fail-closed semantics and default, keep both census directions guarded.

## Deliberately not selected (exclusion ledger)

- **Push-authority-gated:** rm-116 (+sequenced rm-146), rm-159, rm-246 — the
  first closure (PR #10) and the 12-PR ephemeral sweep stay for a
  push-authorized phase; unchanged by this cycle.
- **Live-gateway-gated:** rm-157 (agent v0.117.0 pin bump) — explicitly
  sequenced after gateway-side change; the fresh 2026-09-29 signal (v0.116.0's
  401→operator-actionable change without a contract bump) is recorded on the
  item for that phase.
- **Event-gated:** rm-102 — first dependabot PR evidence expected ~2026-10-03.
- **External-render remainder:** rm-104 — the guard half landed (rm-164); the
  remainder targets hermes-roadmap render behavior, not this repo's tree.
- **Product-decision-gated:** rm-249 (reaffirming the standing deferral — joint
  decision with rm-138's strip-or-implement), rm-199, rm-195 (sequenced after
  rm-107's consumer question), rm-220's Last-Event-ID half (explicit decision
  required; its idle-watchdog half is a good next-cycle pick).
- **Verification-risk on this box:** rm-103's riders (pnpm 11.28.0,
  @bfra.me/eslint-config 0.54.0) — mechanical, but the bfra refresh needs a
  lint-matrix verification pass and repo-wide lint is documented RC=124-prone
  under load here; schedule with a fresh lint window rather than riding blind.
- **Next-cycle smalls:** rm-163 (subscribe abort-race, p54), rm-253 (logger
  fidelity), rm-254 (aggregator hygiene), rm-144's property-suite remainder.
- **Headliner-sized:** rm-107 (composed status panel) — newly UNBLOCKED by this
  cycle's roadmap signal (rm-192's landed view consumes /api/monitoring), which
  makes it the strongest next-cycle headliner; doing it justice is multi-surface
  and this batch is full.

## Verification frame

Per-unit acceptance lives in the ROADMAP items cited above. Cycle gates: three
tsc passes (server, web, .opencode), repo lint, full suite, plus targeted
per-unit suites (auth, aggregator/app-client, server rate-limit, web Monitoring,
env-docs guard). The batch touches src/, web/, test/, and README — a
release-triggering change set by the corpus's design (src/ and web/ are hard
paths), which is correct for runtime-behavior changes and requires no
release-pipeline edits.
````

## Artifact C — server-cap-and-env-guard.diff (U3+U5 implementation diff; 250 lines)

````archive-C
diff --git a/src/server.ts b/src/server.ts
index f3f2577..1f6caa1 100644
--- a/src/server.ts
+++ b/src/server.ts
@@ -48,6 +48,13 @@ import {
   createInstallationGraphqlQueryFn,
   GITHUB_REQUEST_TIMEOUT_MS,
 } from './github/app-client.ts'
+import type {EtagCacheRef} from './github/conditional-request.ts'
+import {
+  isNotModifiedResponse,
+  NotModifiedError,
+  readWithEtagCache,
+} from './github/conditional-request.ts'
+import {createMemoizedInstallationResolver} from './github/installation-resolver-cache.ts'
 import {buildInstallationsClient, enumerateRepos, mintReadOnlyToken} from './github/installations.ts'
 import {makeNotFoundError, readRepoMetadata} from './github/metadata.ts'
 import {createFileSnapshotStore} from './github/snapshot-store.ts'
@@ -179,6 +186,22 @@ let rateLimitCallCount = 0
 const EVICT_INTERVAL = 500 // sweep every 500 calls
 const EVICT_STALE_AGE = 2 * RATE_LIMIT_WINDOW_MS

+/**
+ * rm-251 (port of fro-bot/agent v0.117.0's limiter defense): hard cap on
+ * distinct client keys in the limiter store. Unique first-hop XFF tokens
+ * (spoofable behind an appending proxy) or a flood of real addresses can
+ * otherwise grow the map unboundedly between sweep windows. At capacity a new
+ * key first triggers a stale-window sweep; if the store is STILL full the
+ * request fails closed (429) rather than admitting growth. Override via
+ * RATE_LIMIT_MAX_KEYS (same env family as the per-class budgets).
+ */
+const RATE_LIMIT_MAX_KEYS = envIntOrDefault('RATE_LIMIT_MAX_KEYS', 10_000)
+
+/** Test/observability accessor: current number of distinct limiter keys. */
+export function rateLimitStoreSize(): number {
+  return rateLimitMap.size
+}
+
 /**
  * Reset the rate limiter state. Tests only — prevents bleed between test cases.
  * @internal
@@ -231,6 +254,23 @@ function sweepRateLimitMap(now: number): void {
   }
 }

+/**
+ * rm-251 admission control for a NEW limiter key. Below capacity: always
+ * admit. At capacity: sweep stale windows once, then — if the store is still
+ * full — fail closed (do not admit; the caller reports 429). An existing key
+ * never passes through here, so cap pressure never evicts a live client.
+ */
+function admitRateLimitKey(now: number): boolean {
+  if (rateLimitMap.size < RATE_LIMIT_MAX_KEYS) return true
+  sweepRateLimitMap(now)
+  if (rateLimitMap.size < RATE_LIMIT_MAX_KEYS) return true
+  logger.warning('rate limiter key store at capacity; failing closed for new clients', {
+    maxKeys: RATE_LIMIT_MAX_KEYS,
+    distinctKeys: rateLimitMap.size,
+  })
+  return false
+}
+
 /**
  * Check rate limit for the given IP.
  * Accepts an optional `now` for testability (defaults to Date.now()).
@@ -245,9 +285,15 @@ export function checkRateLimit(ip: string, now: number = Date.now(), pathClass?:

   let entry = rateLimitMap.get(ip)

-  if (entry === undefined || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
+  if (entry === undefined) {
+    // rm-251: new-key admission goes through the cap check — at capacity the
+    // store evicts stale windows and then fails closed (429) instead of growing.
+    if (!admitRateLimitKey(now)) return false
     entry = {windowStart: now, counts: {public: 0, operator: 0, ingest: 0}}
     rateLimitMap.set(ip, entry)
+  } else if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
+    // Existing key, expired window: reset in place (store size unchanged).
+    entry = {windowStart: now, counts: {public: 0, operator: 0, ingest: 0}}
   }
   const current = entry

@@ -1138,54 +1184,76 @@ export function buildSnapshotProvider(deps: SnapshotProviderDeps): {
    * Resolve the installation ID for a repo using the App JWT endpoint
    * GET /repos/{owner}/{repo}/installation — the only App-JWT endpoint valid
    * for this purpose (App JWT IS valid here per GitHub docs).
+   *
+   * rm-162: the mapping is effectively immutable, so the production resolver is
+   * memoized (24h TTL + eviction on any upstream failure) — steady-state cycles
+   * make zero App-JWT resolver calls. Test-injected resolvers are NOT wrapped
+   * so call-count assertions keep their exact meaning.
    */
-  const resolveInstallationIdForRepo =
-    deps.resolveInstallationIdForRepo ??
-    (async (owner: string, name: string): Promise<number> => {
-      const response = await appClient.octokit.request('GET /repos/{owner}/{repo}/installation', {
-        owner,
-        repo: name,
-      })
-      const data = response.data as unknown as {id: number}
-      return data.id
+  const rawResolveInstallationIdForRepo = async (owner: string, name: string): Promise<number> => {
+    const response = await appClient.octokit.request('GET /repos/{owner}/{repo}/installation', {
+      owner,
+      repo: name,
     })
+    const data = response.data as unknown as {id: number}
+    return data.id
+  }
+  const resolveInstallationIdForRepo =
+    deps.resolveInstallationIdForRepo ?? createMemoizedInstallationResolver(rawResolveInstallationIdForRepo)

   // Real Octokit-backed metadata reader: fetches metadata/repos.yaml from
   // codeo1io/.github at ref=data via an INSTALLATION token (not App JWT).
   // The installation is resolved via resolveInstallationIdForRepo('codeo1io', '.github').
+  //
+  // rm-162: the read is conditional — the last ETag is sent as If-None-Match
+  // and a 304 Not Modified serves the cached body. 304s are free against the
+  // primary rate limit, so the per-cycle metadata read costs nothing in
+  // steady state. The cache box is owned by this provider build.
+  const metadataEtagCache: EtagCacheRef = {current: undefined}
   const metadataReader: MetadataReader =
     deps.metadataReader ??
-    (async (path: string, ref: string): Promise<string> => {
-      // Resolve the installation for codeo1io/.github and mint a read-only token.
-      // This uses an installation token (not App JWT) — App JWT cannot read repo contents.
-      const installationId = await resolveInstallationIdForRepo('codeo1io', '.github')
-      const token = await getReadOnlyToken(installationId)
-
-      // rm-197 (review fix): time-bounded like every other GitHub transport —
-      // the metadata reader sits on the refresh path and must honor the 30s
-      // request contract, not undici's ~300s default.
-      // rm-156 (merged 2026-09-26): the ceiling is ENFORCED at the fetch
-      // layer (createBoundedFetch) — this runtime's @octokit/request does not
-      // honor the `timeout` option against hung upstreams — while the
-      // `timeout` key stays pinned so the rm-197 transport-contract gate
-      // (test/transport-timeout-contract.test.ts) keeps matching this site.
-      const installOctokit = new Octokit({
-        auth: token,
-        request: {timeout: GITHUB_REQUEST_TIMEOUT_MS, fetch: createBoundedFetch(GITHUB_REQUEST_TIMEOUT_MS)},
-      })
-      const response = await installOctokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
-        owner: 'codeo1io',
-        repo: '.github',
-        path,
-        ref,
-      })
-      const data = response.data as unknown as {type: string; encoding: string; content: string}
-      if (data.type !== 'file' || data.encoding !== 'base64') {
-        throw makeNotFoundError(`${path} at ref=${ref} is not a base64-encoded file`)
-      }
-      // base64-decode the content (GitHub wraps at 60 chars with newlines)
-      return Buffer.from(data.content.replaceAll('\n', ''), 'base64').toString('utf8')
-    })
+    (async (path: string, ref: string): Promise<string> =>
+      readWithEtagCache(async ifNoneMatch => {
+        // Resolve the installation for codeo1io/.github and mint a read-only token.
+        // This uses an installation token (not App JWT) — App JWT cannot read repo contents.
+        const installationId = await resolveInstallationIdForRepo('codeo1io', '.github')
+        const token = await getReadOnlyToken(installationId)
+
+        // rm-197 (review fix): time-bounded like every other GitHub transport —
+        // the metadata reader sits on the refresh path and must honor the 30s
+        // request contract, not undici's ~300s default.
+        // rm-156 (merged 2026-09-26): the ceiling is ENFORCED at the fetch
+        // layer (createBoundedFetch) — this runtime's @octokit/request does not
+        // honor the `timeout` option against hung upstreams — while the
+        // `timeout` key stays pinned so the rm-197 transport-contract gate
+        // (test/transport-timeout-contract.test.ts) keeps matching this site.
+        const installOctokit = new Octokit({
+          auth: token,
+          request: {timeout: GITHUB_REQUEST_TIMEOUT_MS, fetch: createBoundedFetch(GITHUB_REQUEST_TIMEOUT_MS)},
+        })
+        let response: Awaited<ReturnType<typeof installOctokit.request>>
+        try {
+          response = await installOctokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
+            owner: 'codeo1io',
+            repo: '.github',
+            path,
+            ref,
+            headers: ifNoneMatch === undefined ? {} : {'If-None-Match': ifNoneMatch},
+          })
+        } catch (error) {
+          // Octokit throws RequestError(status=304, 'Not modified') for a
+          // conditional hit — translate to our cache signal.
+          if (isNotModifiedResponse(error)) throw new NotModifiedError()
+          throw error
+        }
+        const data = response.data as unknown as {type: string; encoding: string; content: string}
+        if (data.type !== 'file' || data.encoding !== 'base64') {
+          throw makeNotFoundError(`${path} at ref=${ref} is not a base64-encoded file`)
+        }
+        // base64-decode the content (GitHub wraps at 60 chars with newlines)
+        const body = Buffer.from(data.content.replaceAll('\n', ''), 'base64').toString('utf8')
+        return {etag: response.headers.etag, body}
+      }, metadataEtagCache))

   // Real per-installation graphql query function: mints a read-only token for
   // the given installationId and authenticates the graphql client with it.
diff --git a/test/env-docs-guard.test.ts b/test/env-docs-guard.test.ts
index 0ef2cc8..1b2116b 100644
--- a/test/env-docs-guard.test.ts
+++ b/test/env-docs-guard.test.ts
@@ -5,11 +5,14 @@ import {describe, expect, it} from 'vitest'

 /**
  * rm-214: README Configuration must document the complete env-var surface.
+ * rm-255: the token family is prefix-EXHAUSTIVE by construction — every
+ * prefix a `process.env.*` read can carry in src/ must appear here, else reads
+ * under that prefix are invisible to the census in both directions.
  *
- * Fails when a `DASHBOARD_*` / `RATE_LIMIT_*` variable is READ in `src/` but
- * missing from the README Configuration section (undocumented var), or when the
- * README documents one that `src/` no longer reads (stale row). Either direction
- * is drift; the table and the code must agree exactly.
+ * Fails when a `DASHBOARD_*` / `RATE_LIMIT_*` / `GATEWAY_*` variable is READ
+ * in `src/` but missing from the README Configuration section (undocumented
+ * var), or when the README documents one that `src/` no longer reads (stale
+ * row). Either direction is drift; the table and the code must agree exactly.
  *
  * Extraction model — "read in src/" means one of:
  *   1. a direct `process.env.<TOKEN>` access, or
@@ -19,7 +22,7 @@ import {describe, expect, it} from 'vitest'
  * readers, so they are covered by the README's prose convention note, not rows.
  */
 const repoRoot = process.cwd()
-const ENV_TOKEN = '(?:DASHBOARD|RATE_LIMIT)_[A-Z0-9_]+'
+const ENV_TOKEN = '(?:DASHBOARD|RATE_LIMIT|GATEWAY)_[A-Z0-9_]+'

 function collectTypeScriptSources(dir: string): string[] {
   const out: string[] = []
@@ -68,6 +71,9 @@ const NON_ENV_CONSTANTS = [
   'RATE_LIMIT_MAX',
   'RATE_LIMIT_MAX_PER_CLASS',
   'RATE_LIMIT_WINDOW_MS',
+  // rm-255: a GATEWAY_-prefixed CODE CONSTANT (not an env var) — listed here so
+  // the census can never mistake it for a read, in either direction.
+  'GATEWAY_LOGIN_REDIRECT',
 ] as const

 /** Backticked env tokens inside the README "Configuration" section (table rows + prose). */
@@ -93,7 +99,7 @@ describe('environment-variable documentation coverage (rm-214)', () => {
     }
   })

-  it('every DASHBOARD_*/RATE_LIMIT_* var read in src/ is documented in README Configuration, and no stale rows exist', () => {
+  it('every DASHBOARD_*/RATE_LIMIT_*/GATEWAY_* var read in src/ is documented in README Configuration, and no stale rows exist', () => {
     const read = envTokensReadInSrc()
     const documented = envTokensDocumentedInReadme()
     const nonEnv = new Set<string>(NON_ENV_CONSTANTS)
````

## Re-homing note

A future run that wants U3 or U5 on main should re-derive against the
then-current tree rather than applying this diff blindly (the ROADMAP.md
rm-159 rider records the same advice): the patch is a 2026-09-29-era artifact
and its `src/server.ts` context will have drifted. The batch frame doc
(Artifact B) carries the unit lineage and supersession relationships for the
whole cycle-18 batch.
