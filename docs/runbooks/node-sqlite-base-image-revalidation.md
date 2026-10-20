# Node Base-Image Bump Re-Validation (node:sqlite)

The listener store (`src/listener/store.ts`) runs on `node:sqlite`, the
still-experimental Node built-in SQLite module. Its API surface moves with the
Node line: flag renames, statement-shape changes, and stability-promotion
breaks have historically landed as *minor* Node releases, and the runner/host
Node version is inherited from the Docker base image (`node:24-trixie-slim`
pinned by digest as the `ARG NODE_IMAGE` default in the `Dockerfile`; every
runtime `FROM` derives from it) rather than fixed by this repo alone.

This runbook is the binding rm-1504 (ROADMAP, run 5723bb0a 2026-10-18)
recorded when the base image moves: **any change to the Node base-image
digest — the `ARG NODE_IMAGE` default, including automated digest bumps from
the dependabot docker group — MUST
re-run the listener-store suites before landing.** A digest bump is not a
no-op maintenance PR in this repo; it swaps the SQLite engine underneath the
only stateful component.

## Why this is a first-class gate

- `node:sqlite` has no semver contract. The `nodejs.org` stability index
  promoted it to Stability 1.1 while the dashboard was on the 24.x line;
  between Stability 1.0 and 1.1 the API accepted at least one breaking
  rename. Nothing in `package.json` constrains the host Node, so the base
  image is the only pin.
- The listener store is the write path for ingested GitHub events
  (`src/listener/store.ts`). A silent behavioral change there (different
  upsert semantics, changed transaction ordering) manifests as listener data
  drift, not as a startup failure — CI would stay green on anything that does
  not type-break.
- The dependabot docker group files digest-bump PRs mechanically. Without
  this binding, such a PR can land via the routine dependency lane with only
  the generic test battery — which does exercise the store, but which has
  historically been waived for "lockfile-only" looking changes.

## Procedure (run on every `FROM node:` digest change)

1. Confirm what moved: `git diff` the `Dockerfile` and compare the old/new
   image tags (`docker manifest inspect` / release notes for the Node line).
   Note the Node minor in the PR body.
2. Run the focused store suites locally against the *new* Node before
   approving (a direct Vitest invocation bypasses `pretest` — acceptable
   here because the listener suites never serve `/`; when in doubt build
   first with `bun run build:web`):

   ```sh
   bunx vitest run test/listener-store.test.ts test/listener-ingest.test.ts
   ```

   (suite names may drift — `ls test | grep listener` and run the full
   listener family; when in doubt, the full `bun run test` battery — never
   a bare `bun test`, which starts Bun's own runner and skips both the
   `pretest` build and Vitest.)

3. Additionally smoke the container itself once, because the suites exercise
   `node:sqlite` through the host Node, not through the slim image:

   ```sh
   docker build -t dashboard:bump-check .
   docker run --rm --entrypoint node dashboard:bump-check \
     -e "const {DatabaseSync} = require('node:sqlite'); const db = new DatabaseSync(':memory:'); db.exec('create table t(x)'); console.log('node:sqlite OK')"
   ```

4. Record the outcome as a dated rider on rm-1504 in `ROADMAP.md` (gate
   result, Node version pair, any API deltas observed). Close the PR only
   green; if `node:sqlite` broke, keep the old digest and file the
   compatibility fix as its own change — never pin around it silently.

## Related ledger entries

- rm-108 — the Node-version decision matrix (engines floor, image tag, LTS
  windows; the Node-26 go/no-go rides there).
- rm-139 — the Node 26 LTS gate (2026-10-28): when that gate opens, THIS
  runbook's procedure is mandatory for the resulting base-image change.
- rm-1449 — the `@types/node` pairing that should move with the image bump.
