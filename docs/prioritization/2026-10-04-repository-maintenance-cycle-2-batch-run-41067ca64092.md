# Cycle:2 implement batch — run 41067ca64092 (repository-maintenance af77456f), attempt 90e1c4b5, 2026-10-04

Base: 227375247414 (== origin/main at implement time; porcelain started and ends as the
roadmap phase's ` M ROADMAP.md` plus this batch's uncommitted changes — nothing committed,
per phase boundary).

Selected batch (prioritize d207b516, stewardship 4a728b20): three units, drop order
B3 → B2 → B1, all delivered.

## B1 (anchor) — rm-587: If-None-Match per RFC 9110 §13.1.3

`src/server.ts` — the `operatorRuntimeCaching` middleware is now compute-then-serve:

- New pure matcher `ifNoneMatchSatisfied(header, etag)`: comma-list membership,
  weak comparison (`W/` prefix stripped per §8.8.3.2), and `*` matching any current
  representation.
- The ETag resolves BEFORE `serveStatic` runs (single stat per request; the hash
  recomputes only when mtime moves), so a satisfied revalidation returns
  `c.body(null, 304, …)` without ever transferring the body.
- Stat failure now falls through to serveStatic's own not-found path (visible 404,
  fail-closed) instead of the old silent unvalidated full-body miss (`catch {}` +
  post-hoc 304 replace).

Tests (`test/static-assets.test.ts`): four new forms — list-containing-tag → 304,
weak `W/<etag>` → 304, `*` → 304, non-matching list → 200 — alongside the kept
exact/mismatch pins.

Probe transcript (after; `node /tmp/probe-rm587-90e1c4b5.mts`, durable copy in the
delegate spool scratch):

```text
asset=/static/operator-stream.js etag="f95318ada974adaa6398197e2de99d05" full-body=106973 bytes
(none)                    -> 200   106973
exact                     -> 304        0
W/<etag>                  -> 304        0   (before: 200, 106973 bytes re-downloaded)
"stale", <etag> (list)    -> 304        0   (before: 200, 106973)
*                         -> 304        0   (before: 200, 106973)
W/"stale", "other"        -> 200   106973
```

Before-matrix source: assess dd19ff74 F2 live probe (2026-10-04). Transfer measurement:
every previously-broken client form now moves 0 bytes instead of 106,973.

## B2 — rm-593: top-level ErrorBoundary

- `web/src/ErrorBoundary.tsx` (new): class boundary, `role="alert"` fallback with the
  operator-readable message + Reload dashboard action; `componentDidCatch` logs via
  `console.error` (the existing console contract; only the error + component stack —
  the streams' no-leak discipline is respected).
- `web/src/App.tsx`: the boundary wraps the view router (Operator/Monitoring/Listener
  blocks) INSIDE `AppShell`, so a render throw isolates to the content area while the
  shell/nav survive — this matches the acceptance clause; the stewardship doc's
  `main.tsx` surface would have unmounted the shell too, so the mint's acceptance text
  was followed instead (deviation recorded in the phase JSON findings).
- `web/src/ErrorBoundary.test.tsx` (new): standalone, zero `localStorage` references,
  never mounts App/AppShell — green under the current Node 26 + jsdom 29 env. The
  shell-survival clause is asserted structurally (nav rendered outside the boundary
  survives a crash inside it); mounting the real App/AppShell is the rm-548/rm-591 red
  class this batch must not adopt the sibling's uncommitted cure for.

## B3 — rm-588: one framing policy

`src/server.ts` secureHeaders: kept CSP `frame-ancestors 'none'` and added explicit
`xFrameOptions: 'DENY'` (secureHeaders' SAMEORIGIN default contradicted the CSP for
legacy-header agents). New test asserts the exact pair across `/`, `/api/healthz`,
`/static/operator-stream.js`; the live probe above shows `xfo=DENY` on every response.

## Gates (focused, per phase budget)

- `pnpm check-types` → rc=0 (server + web + .opencode).
- `pnpm lint` → rc=0 (canonical, cached). Note: `web/**` is intentionally ignored by
  eslint.config.ts:14 — web coverage is check-types + vitest, per repo design.
- `npx vitest run test/static-assets.test.ts test/roadmap-length-guard.test.ts
  test/prose-residue-guard.test.ts` → 3 files, 101/101 passed.
- `npx vitest run --config web/vitest.config.ts ErrorBoundary` → 3/3 passed.
- No net-new red: `src/App.test.tsx` (my only touched red-class file) fails exactly its
  baseline 25 tests with the unchanged `window.localStorage.clear` TypeError signature.

## Ledger

ROADMAP.md status flips ride this batch (uncommitted): rm-587, rm-588, rm-593
`candidate → implemented` with dated mechanism notes.

## must_remain_separate honored

No edits to the limiter block (server.ts rate-limit region), no package.json /
pnpm-lock / test-setup.ts changes (sibling 845265c83109's jsdom-30 cure untouched),
B1 and B3 hunks disjoint within server.ts, B3 leaves room for sibling 80e8409255b9's
uncommitted HSTS arm in the same secureHeaders object (that arm is theirs to land).
