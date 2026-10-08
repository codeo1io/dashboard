# cycle:3 batch record — CI gate and context-seal integrity (run cb1890443b05)

- run: cb1890443b0547ca82b230922e6a92c7 (repository-maintenance cycle:3)
- base: 559642aa61541dce728f7d5b688d1972ba7c5ce4 (clean at dispatch; origin/main
  2 ahead at 7055c52 via the PR #444 lane, no def/census delta — verified)
- selected: 2026-10-09 by prioritize ab616e4c1448479cba4407c86a2976d9
  (claim map + deferrals: delegate spool ab616e4c…-scratch/prioritize-batch-selection-2026-10-09.md)
- items: rm-788 (cve-tripwire digest-resolution cure), rm-789 (dockerignore
  nested-seal re-anchor + real-semantics matcher)

## Selected and why

1. **rm-788 — the CVE gate was dead.** `.github/workflows/cve-tripwire.yaml`
   pinned env `NODE_IMAGE: 'node:24-slim'` while the Dockerfile's base had been
   re-pinned to `node:24-trixie-slim@sha256:173f1258…` (rm-698, landed one day
   after the tripwire was authored at 9aceea8 against the old `0e0ff40c` pin —
   parallel landing, the workflow's literal was missed). Red-first
   reproduction: `grep -oE "node:24-slim@sha256:[0-9a-f]{64}" Dockerfile` →
   NO MATCH, so the Resolve step's grep returned empty and every fire exited 1
   BEFORE trivy ran. Deadline-bound: the first scheduled fire (Monday
   2026-10-12 06:53Z) is rm-648's standing acceptance.
2. **rm-789 — the context seal did not seal nested copies.** Real dockerignore
   root-anchors slash-free patterns. Verified live 2026-10-09 on a real daemon
   (Docker 29.1.3, controlled `FROM scratch` build + `docker save` layer
   listing): with `.dockerignore` = `node_modules|test-results|web/dist`, the
   context carried `web/node_modules/NESTED_NM.txt` and
   `web/test-results/NESTED_TR.txt` while the root-level and full-path
   exclusions worked; an `**/`-prefixed retry sealed the nested copies. So
   after a local `pnpm install`, `web/node_modules` and a Vite-standard
   `web/.env.local` shipped to the daemon on `docker build` (CI release builds
   unaffected — the build job installs nothing before `docker build`).
   `test/dockerfile-context.test.ts` asserted the opposite (any-level
   component matching), making rm-242's nested acceptance vacuous — and the
   ledger's rm-186 "F1 correction" (any-level semantics, nested gap called a
   false positive) recorded a false truth. Correction riders landed on
   rm-186/rm-242 at the roadmap phase; this batch delivers the cure.

## Implemented

### rm-788 — tag-agnostic digest resolution (`.github/workflows/cve-tripwire.yaml`)

- Removed the workflow-side `NODE_IMAGE` env literal entirely (the drift
  source — the workflow now never names a base tag).
- The Resolve step now reads the pinned reference off the Dockerfile's own
  `ARG NODE_IMAGE=<tag>@sha256:<digest>` line:
  `grep -m1 -oE '^ARG NODE_IMAGE=[^@[:space:]]+@sha256:[0-9a-f]{64}' Dockerfile | cut -d= -f2-`
  — empty match still exits 1 with a pin-shaped error, `PINNED` is still
  exported for the scan step, and scan/gate semantics are untouched.
- **Trivy CLI fold DROPPED (decision, not omission).** The optional
  `TRIVY_VERSION` v0.72.0 → v0.75.0 rider was contingent on its tag-scoped
  changelog gate; the v0.73.0/v0.74.0/v0.75.0 release bodies are ~170-char
  stubs with no changelog content, so the gate cannot be satisfied. Keeping
  the deadline-critical cure minimal-risk wins; the pin bump stays available
  as a follow-up once a changelog can actually be reviewed.

### rm-789 — context seal (`.dockerignore` + `test/dockerfile-context.test.ts`)

- `.dockerignore`: `node_modules`, `.env*`, `*.pem`, `*.key`, `test-results`,
  `playwright-report`, `.pnpm-store` re-anchored with `**/` prefixes (root
  behavior unchanged — proven in the experiment's control leg); the rm-242
  comment corrected to the real semantics with the 2026-10-09 verification
  provenance. Out of scope, deliberately: `coverage`/`.vite` (root-only
  producers), `*.md`/`!README.md` (root markdown policy), and the root
  directory block (`.git`, `docs`, `test`, `scripts`, …) — no nested intent.
- `test/dockerfile-context.test.ts`: `isExcludedBy` rewritten to real
  anchoring (slash-free = root-only, path patterns = anchored subtree,
  leading `**/` = any depth, negations win); the entry sets updated to the
  anchored forms; NEW red-first pin (a slash-free seal must NOT seal
  `web/node_modules`, `web/.env.local`, `web/server.pem` — the assertion the
  old fiction matcher could never make), nested secrets-class coverage
  (`web/.env.local`, `web/certs/server.pem`, `web/certs/cookie.key`), and
  matcher anchoring units (root / any-depth / path-anchored subtree /
  `!README.md` negation).
- The two prose-residue-guard allow-listed header lines (:10, :13) preserved
  verbatim.

## How to verify

- `grep -c "NODE_IMAGE" .github/workflows/cve-tripwire.yaml` → 1 (the ARG-line
  grep inside the Resolve step; no workflow-side tag literal remains).
- Seed reproduction of the Resolve step at this tree:
  `grep -m1 -oE '^ARG NODE_IMAGE=[^@[:space:]]+@sha256:[0-9a-f]{64}' Dockerfile | cut -d= -f2-`
  → `node:24-trixie-slim@sha256:173f1258…` (empty pre-fix, populated now).
- Focused suites: `pnpm vitest run test/dockerfile-context.test.ts
  test/prose-residue-guard.test.ts test/release-trigger-paths.test.ts
  test/roadmap-integrity-guard.test.ts`.
- Workflow shape: actionlint (container form) on the touched workflow.
- Census unchanged by this batch: `node scripts/roadmap-census.ts` → 239 defs /
  0 dups / max rm-789.

## Outcome

- status: implemented 2026-10-09 (attempt a1337b2ea7b342d5901dab0f145ee192);
  landing pending the cycle's commit gate.
- acceptance watch: the first cve-tripwire scheduled fire after this lands
  (2026-10-12 06:53Z or later) is rm-648's green-at-parity acceptance.
