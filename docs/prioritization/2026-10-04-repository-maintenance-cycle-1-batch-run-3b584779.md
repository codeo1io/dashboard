# Dashboard maintenance — cycle 1 batch (2026-10-04, run 3b584779749a4ce498349a440ede1ad0)

> **CORRECTION (2026-10-04, stewardship 7d9a9b44):** B2 (rm-616) is
> SUPERSEDED same-day — its UTF-16-vs-UTF-8 divergence premise was false
> (both twins count UTF-8 bytes; `public/operator-stream.js:2531-2555` re-read
> first-hand). The batch is now **B1 (rm-617) + B3 (rm-484)**; B2's roadmap
> item was rewritten to status: superseded. Everything else below stands.

- Conductor: repository-maintenance `b5c74f87670b4adab179ddf094c32fc8` cycle:1
- Base: `227375247` == origin/main; worktree carries this run's ROADMAP.md mints (+26/-0: rm-616, rm-617, ext #15)
- Prioritize attempt: `1fb35d46a06647e0b09f6d4a8fb473ae`

## The cycle's mandate

Pick the highest-value COHERENT batch that is completable end-to-end this
cycle without colliding with any sibling lane. Sibling claims verified
first-hand from their untracked batch docs this hour:

- **38ee3e1c** (ff35f77e cycle:1): rm-187, rm-501 (+rm-482 rider), rm-597, rm-596 (erasable-plugin bump)
- **2c3b4c64**: rm-608 (Node-26 web-test localstorage cure), rm-609 (stale SPA shell)
- **146d73f2** (3a560bcc cycle:1): rm-286, rm-594, rm-596 (push-card re-entry), rm-595

Their explicit deferrals — rm-484 (SSE spec half, "45.0 absorbs" — the 45.0
item is itself deferred), rm-279, rm-282, rm-249/rm-138, rm-289 — are
unclaimed and free.

## Selected batch (all three this lane)

### B1 — rm-617: pin the stateless installation-token redaction contract (security 14.0, DATED 2026-11-30)

This run's research crown finding. GitHub completed the stateless rollout
2026-10-02 (`ghs_APPID_JWT`, ~520 chars; `X-GitHub-Stateless-S2S-Token`
header deprecates 2026-11-30). The logger's prefix rule alone partially
redacts the new shape; full redaction rests on the JWT-shaped rule happening
to run first (`src/logger.ts:49-62` layer order, read first-hand). Consumers
are all opaque (verified) — the pin is defense against layer-order regression.

Fix shape:
- Strengthen the `gh[opsu]_` prefix rule to swallow dot-separated
  continuations standalone (no layer-ordering dependency).
- Permanent unit test: realistic ~520-char `ghs_<appid>_<jwt>` token → assert
  NO dot-separated JWT remnant survives, for the full-form case AND a
  construct where only the prefix rule can fire.
- A stateless-shaped token joins the installation token fixtures.
- Runbook note (opaque-string contract + the 2026-11-30 header date).

Effort: S. Files: `src/logger.ts`, `test/auth.test.ts` (redaction describe),
installation fixture, one docs/runbooks file. Server-side only.

### B2 — rm-616: unify SSE buffer-cap accounting across the operator twins (reliability 12.0)

This run's mint. Browser twin counts UTF-16 code units
(`public/operator-stream.js:1242-1244`, `:1343-1346` — `byteCount += frame.length`,
zero `TextEncoder` in the file) vs the server twin's UTF-8 bytes
(`src/gateway/operator-sse-reader.ts:530-533`) toward the SAME 1MiB cap —
multibyte frames undercount up to 4x. rm-114's landed cure text claims both
twins count UTF-8 bytes — half artifact-FALSE.

Fix shape:
- Browser twin encodes UTF-8 bytes at the two increment sites (the unit is
  decided once, at the seam).
- A multibyte-bearing fixture near the cap proves BOTH twins reject at the
  same threshold (extends the both-parsers-at-once discipline).
- Server reader `:546` full-buffer re-encode becomes delta accounting.
- Correct rm-114's cure text where it claims browser-twin UTF-8 enforcement.

Effort: M. Files: `public/operator-stream.js`, `src/gateway/operator-sse-reader.ts`,
their tests, ROADMAP.md correction. No `web/src` files.

### B3 — rm-484 rider on the same seam: SSE `data:`-line semantics per WHATWG (reliability 36.0, deferred-unclaimed)

Both parsers keep only the LAST `data:` line of a multi-line record; the spec
joins with `\n`. Byte-identical deviation in both twins
(`operator-sse-reader.ts:115-125`, `operator-stream.js` parse site), latent
(single-line ASCII fixtures). rm-484's own text says the fix rides the
both-parsers discipline — which B2 is establishing in the same files. Riding
it here means ONE seam-change event instead of two.

Fix shape: shared extraction joins multi-`data:` fields with `\n` in BOTH
parsers at once; fixture gains a multi-line record case; JSON-parse
downstream unchanged (frames remain single JSON records).

Effort: M, but rides B2's fixture infra. Sequenced AFTER B2.

## Why not the ledger's top-priority candidates (grounded)

- **rm-279 (96.0, Lint-job decomposition)** — CI workflow restructure, feature-scale, explicitly deferred as such by 146d73f2; overlaps rm-116's protection-model family. Wrong scale for this batch.
- **rm-252 (80.0, absorb window)** — upstream UNMOVED (verified this run: tip `c5d49b11`, agent `v0.117.1`); nothing to absorb this cycle.
- **rm-282 (74.0, audit-gate floors)** / **rm-274-family ops surface** — CI/ops-surface lane, decision-linked to rm-116's protection fill; not a code batch.
- **rm-249 (72.0, push substrate)** — feature-scale product decision (joint with rm-138).
- **rm-286/rm-594/rm-595/rm-596** — claimed by 146d73f2. **rm-187/rm-501/rm-597** — claimed by 38ee3e1c. **rm-608/rm-609** — claimed by 2c3b4c64.
- **rm-548-class web red** — 2c3b4c64's rm-608 lane owns the cure; this batch touches ZERO `web/src` files and does not race it.

## Sequencing and verification

B1 → B2 → B3 (B3 rides B2's seam work). All three are independent of every
sibling lane (no file overlap with any claimed batch: logger/tests + SSE
reader/parser twins are untouched by 38ee3e1c's listener/docker/eslint lanes,
2c3b4c64's web-test/server-shell lane, 146d73f2's limiter/approval/parity
lanes — except `src/server.ts`? No: none of my three touch server.ts).

Gate plan (implement/compound): per-member targeted suites red-before-green
(B1 logger redaction suite; B2/B3 operator-stream-core + SSE reader suites
with the new multibyte/multi-line fixtures), `pnpm check-types`, `pnpm lint`,
full `pnpm test` with the standing rm-548 red-count accounting (expect
exactly 4 files/100 tests red pre-batch, unchanged post — no web files
touched). Visual workflow: `public/**` IS in its path filter (verified
`.github/workflows/visual.yaml:1-12`), so B2/B3 trigger it — `public/operator-stream.js`
is served client code, visual coverage is legitimate, and the ephemeral
validation PR carries it; B1 (src/logger.ts + tests + runbook) stays below its
filter.

## Outcome

Recorded at implement/compound. Deferred with pointers: rm-484's dead-server-twin
coordination (rm-253 wire-or-fold) stays open; rm-253 untouched by this batch.
