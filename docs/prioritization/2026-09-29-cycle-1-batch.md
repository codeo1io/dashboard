# Dashboard maintenance — cycle 1 batch (2026-09-29, run c1a9e791)

> Selected by the prioritize phase (attempt f5c3cb7be5ce4885b738ffeae67c0aa1) of conductor run
> c1a9e791973e48cb84a705321cf82522, requirement repository-maintenance:17a82ec7…:cycle:1.
> Sources: this run's assess (ea96b57b), research (0e9394de), roadmap extension (0103a3c8 —
> rm-251..rm-254 minted this session, rm-179 amended LIVE DEFECT). Worktree base d89ffe7 ==
> origin/main tip (verified `git rev-list --count` both directions = 0 — the freshest dispatch
> frame this fleet has had; no stale-base re-alignment needed this cycle).

## Method

Every open item was scored on impact (live incident or invariant risk), risk (blow-up surface +
merge-conflict surface), effort (code + test + gates), dependencies (external prerequisites,
sequencing), and strategic value (unblocks other items, ecosystem currency). The 93-item open
ledger was triaged to the 54 implemented-status items (verification backlog, rm-254's sweep —
not this cycle) and the 39 actionable ones; of those, the four fresh evidence-backed candidates
(rm-179 repair + this run's three code-truth mints) dominate every older decision-gated item on
the impact-per-effort axis. One theme dominates this cycle: **three of the four selected units
restore or extend trust in what the dashboard and its own monitors report** — the canary is dead
(rm-179), failingChecks has a documented blind spot (rm-251), and the operator ships 330KB
uncached on every visit (rm-252); the fourth (rm-253) closes the advisory delta with two lines.
Zero external prerequisites: no live gateway, no GitHub settings mutation, no upstream release.

## Selected batch (B0–B4, implement-phase order)

### B0 — ROADMAP rider: land this run's ledger extension with the batch (no new code)
- Rationale: the working tree carries the roadmap phase's +33/−6 ROADMAP.md diff (rm-251..rm-254
  minted, rm-179/rm-157/rm-108/rm-116 amended, manual-revision header with the research-phase
  citation correction on the record). It rides the batch as B0 per the fleet convention; the
  ledger entries below cite these ids.
- Acceptance: ROADMAP.md diff lands byte-identical with the batch; census 133 ids / 0 dups / max
  rm-254; Completed/Superseded sections untouched.

### B1 — Repair the GraphQL canary (rm-179 LIVE DEFECT, the cycle's HIGH)
- Rationale: the only live GitHub-contract probe is broken from birth — first scheduled fire
  (run 36417620616, 2026-09-28) died in ~1s on `Cannot find package '@bfra.me/es' imported from
  src/result.ts`; the workflow's `:44` "no install needed" claim is false because
  `scripts/graphql-canary.ts:24` → `src/github/aggregator.ts` → `src/result.ts:12` runtime
  re-exports a prod dep that has been there since the first commit (2026-06-14). Third instance
  of the green-CI-over-broken-reality class this ledger owns (rm-177, rm-178, now this).
- Shape: two defensible cures — (a) add a dependency-install step to `.github/workflows/canary.yaml`
  between checkout and run (pnpm install with the lockfile, ~30s added to a weekly job), or
  (b) decouple the script's import chain from prod deps. Prefer (a) first: it keeps the canary
  executing the EXACT exported template via the aggregator import (the whole point of rm-179),
  and (b) risks drift between the canary's copy and the shipped query. Whichever lands, add the
  import-chain guard test the amended rm-179 acceptance requires (a suite test pinning that the
  canary's module graph is runnable under CI's install state — e.g. assert the workflow YAML's
  steps cover install-before-run, mirroring test/release-trigger-paths.test.ts's text-parse
  style).
- Files: `.github/workflows/canary.yaml`, `test/canary-workflow-guard.test.ts` (new), ROADMAP.md
  status flip on verification.
- Acceptance (from rm-179): workflow installs deps before running the script; the guard test
  fails if a future edit removes the install step or re-adds an un-runnable import; next
  scheduled fire exits 0 with the query hash in the log (verification recorded at the item).

### B2 — Checks-v2 blind spot: fixture + decision record (rm-251, offline half)
- Rationale: GitHub changelog 2026-09-23 — v2 runs surface on the v1 APIs degraded to `status`;
  our query selects `status: COMPLETED, conclusions: [...]` (src/github/aggregator.ts:217/:265)
  and counts `failingChecks += checkRuns.totalCount` (:781), so a failing v2 run that never
  reports COMPLETED on v1 contributes zero — the repo's primary red signal, invisible to every
  local fixture.
- Shape: this unit lands the OFFLINE half only: (1) a fixture in `test/aggregator.test.ts`
  modeling the v2-converted shape (checkRun nodes with status-only, no conclusion) asserting the
  CURRENT behavior explicitly (today: contributes zero — the test documents the blind spot rather
  than hiding it); (2) the mapping decision recorded at rm-251 after a live-shape probe
  (`gh api` check-runs for a known public repo running v2 workflows — e.g. a github/* repo —
  snapshot the response shape into the fixture); (3) drill-down/UI changes are OUT of scope —
  the authoritative-surface question (checkSuites/workflowRun per rm-192) is decision-gated on
  whether any watched fleet repo actually runs v2 (probe result recorded either way).
- Files: `test/aggregator.test.ts`, ROADMAP.md rm-251 (decision + probe evidence), fixtures under
  `test/fixtures/` if the shape is large.
- Acceptance (from rm-251, offline clauses): fixture green against the documented v2 shape; the
  decision + live probe evidence recorded at the item; the operator drill-down half explicitly
  deferred with its precondition (a fleet repo running v2) named.

### B3 — Static-asset cache policy + compression (rm-252, measured payoff)
- Rationale: content-hashed assets (281,671B JS + 46,795B CSS measured 2026-09-29) ship with no
  Cache-Control/immutable and no Content-Encoding — the only cache header in src/server.ts is the
  SPA shell's no-store (:956). Every operator visit revalidates ~330KB; cold loads ship
  uncompressed.
- Shape: (1) `/assets/**` → `Cache-Control: public, max-age=31536000, immutable` at the
  serveStatic mount (hash-named = safe by construction); index.html and sw.js keep
  revalidate/no-store semantics (rm-172's shell posture unchanged); (2) compression scoped to
  the static mount ONLY — never the SSE/ingest routes (event-stream framing + HMAC bodies must
  not be transformed); prefer build-time precompress (vite-plugin `compress`-style gzip+brotli
  into web/dist) over a runtime middleware so the server stays zero-transform, falling back to
  `@hono/node-server` compression only if precompress breaks the PWA precache hash discipline;
  (3) header tests in `test/static-assets.test.ts` pin the policy; the before/after transfer
  delta is measured and recorded in this doc.
- Files: `src/server.ts`, `test/static-assets.test.ts`, possibly `web/` build config + one
  solution doc if the precompress route surprises.
- Acceptance (from rm-252): immutable header on /assets/\*\* verified by curl behind the dev
  server; index/sw semantics unchanged; compression delta recorded; operator-ui + visual suites
  green.

### B4 — Advisory floor refresh (rm-253, security rider)
- Rationale: pnpm audit 2026-09-29 shows 3 dev-only advisories (undici 7.29.0 → 7.29.1 moderate,
  fast-uri high ×2 → 3.1.7) while the override floors (pnpm-workspace.yaml:27/:33) sit one patch
  behind the patched versions; --prod is clean so this is hygiene, not exposure — exactly the
  one-line-rider shape the floors were built for (GHSA-82x6-q7mm-w9cf precedent).
- Shape: bump `fast-uri@3: '>=3.1.7 <4.0.0'` and `undici@7: '>=7.29.1 <8.0.0'` with the advisory
  ids in the override comments; `pnpm install` to re-resolve; full `pnpm audit` (not just
  --prod) must exit 0.
- Files: `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- Acceptance (from rm-253): floors bumped + advisory ids cited; audit exit 0 total; root + web
  suites green post-refresh.

## Not selected (with reasons)

- **rm-157 gateway absorb (v0.115.1–v0.117.0 surface work)** — sequenced behind a live gateway
  deployment by its own acceptance; no gateway change happened this cycle. Next lead candidate.
- **rm-116 branch-protection fill** — GitHub-side settings mutation; the cycle-10 fill did not
  persist (recorded); needs an owner-present session, not a batch unit.
- **rm-218 rulesets panel** — the strongest capability item, but a full aggregator+view+test
  surface (medium-large); the cycle already carries two medium units. Next-cycle lead.
- **rm-254 ledger sweep** — verification-heavy against origin/main landing evidence; docs-track
  value, zero live risk; deferred until the implement batch lands (its own census would move).
- **rm-108 major upgrades (TS 7 / vitest 5 / jsdom 30)** — hard-blocked on the typescript-eslint
  peer until the 2026-10-21 re-eval (rm-133's recorded gate); nothing to implement now.
- **rm-112 / rm-197 / rm-199 degradation-delivery family** — decision-gated on view consumption
  (web/src/App.test.tsx:73-85 regression-guards the absence); unchanged since their last cycle.
- **Research candidates org-tier panel / OpenMetrics+OTel / Dependabot-PAT impact** — rejected
  at research with reasons (spool ideation artifact); not re-litigated.

## Risks and verification plan

- **canary install step** could itself drift from the lockfile: mitigated by pinning the install
  command to the committed lockfile (`--frozen-lockfile`) and the B1 guard test.
- **Compression + SSE**: the static-mount-only scoping plus an explicit no-compress assertion on
  `/api/operator/stream` and `/ingest` in test/static-assets.test.ts.
- **Lockfile churn** (B4) conflicting with future dependabot PRs (~2026-10-03 window, rm-102):
  dev-tree-only packages, low blast radius; the audit-zero acceptance makes regressions visible.
- **Gates**: pnpm check-types (server + web + .opencode), pnpm lint (repo-wide, backgrounded —
  >300s under load), pnpm test (rebuilds web/dist via pretest; direct vitest runs need the
  build first), plus the targeted suites per unit (aggregator, static-assets, canary-guard,
  server). Actionlint for the canary.yaml edit (container form per AGENTS.md).

## Landing verification (implement phase, 2026-09-29, attempt 490e60df)

- **B1 (rm-179)**: canary.yaml runs `./.github/actions/setup` (pnpm + Node 24 +
  `--frozen-lockfile` install) between checkout and the script; the `:44`
  "no install needed" step-name claim is corrected in place.
  `test/canary-workflow-guard.test.ts` (new, 4 tests) pins install-before-run
  AND the canary script's transitive prod-dep graph via a comment-stripping
  text parse of the live YAML — negative-verified against the pre-repair
  workflow AND a re-broken variant (the first guard draft passed vacuously on
  its own explanatory comment; the negative probe caught it before landing).
  actionlint 1.7.12 (container form, `rhysd/actionlint:1.7.12`) exits 0 on all
  repo workflows. First post-repair scheduled fire: 2026-10-05 05:23Z.
- **B2 (rm-251)**: two fixtures appended to `test/aggregator.test.ts` pin the
  CURRENT degradation (mixed v1+v2: failingChecks keeps the v1 count while
  rollup stays red; v2-only: the pure signature — red rollup, failingChecks 0,
  empty drill-down); the decision + rationale are recorded at the test site.
  LIVE-SHAPE PROBE (this phase, read-only REST): check-runs on HEAD sampled
  across github/docs (56), vercel/next.js (390), microsoft/vscode (18) — every
  surfaced run carries a real conclusion except in-flight (in_progress /
  conclusion null, the normal pending shape). NO v2 status-only failure
  observed in the wild yet: the fixture pins a changelog-derived shape, so the
  REPO_STATUS_QUERY change and drill-down work stay gated on a watched fleet
  repo actually converting to Checks v2 (recorded at rm-251).
- **B3 (rm-252)**: `/assets/*` serves `Cache-Control: public,
  max-age=31536000, immutable`; build-time sibling precompress in
  web/vite.config.ts (brotli q11 + gzip 9; anchored on configResolved
  `resolved.root` — rolldown-vite leaves `build.outDir` RELATIVE, so a
  cwd-relative join silently compresses the wrong tree; found by probe, fixed
  and documented at the plugin); server-side negotiation in src/server.ts
  (br → gzip → identity, `vary: accept-encoding`, 404 when the hashed sibling
  is absent). MEASURED: JS 281,820B → 71,828B br (−75%) / 83,027B gz (−71%);
  CSS 48,739B → 7,852B br (−84%) / 8,915B gz (−82%). Shell/SW semantics
  unchanged (sw.js no-store pinned; the default shell must never receive the
  immutable policy — pinned). Scope lock pinned on the surfaces that exist:
  /api/healthz and /api/listener/ingest get identity responses for a
  br-capable client (the doc's named /api/operator/stream does not exist in
  this server — the gateway SSE is fetched client-side; recorded at the test).
  test/static-assets.test.ts 89/89.
- **B4 (rm-253)**: floors bumped in pnpm-workspace.yaml with advisory ids
  cited (fast-uri@3 `>=3.1.7` — GHSA-qw65-cvwx-89v3 + the =3.1.6 follow-up;
  undici@7 `>=7.29.1` — GHSA-3wwx-pv8p-q78v); lockfile re-resolved; FULL
  `pnpm audit` (not just --prod) exits 0. Floors follow patched versions, so
  the next advisory of these classes is a one-line rider.
- **Gates (implement-phase budget: focused/impacted only)**:
  `tsc --noEmit` server + web RC=0 (`.opencode` untouched by this batch — no
  files under .opencode changed); targeted suites: aggregator 100/100,
  static-assets 89/89, canary-workflow-guard 4/4, listener-routes 21/21,
  release-trigger-paths + should-release + dockerfile-context green (canary.yaml
  is a release-path-adjacent workflow edit — the parity lock was exercised);
  eslint on every changed TS/yaml file RC=0; actionlint RC=0 (above).
  Repo-wide lint + full suites are reserved for the full_tests gate.
