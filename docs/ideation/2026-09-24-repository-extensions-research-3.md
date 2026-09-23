# Dashboard repository-extensions research — cycle 8 (2026-09-24)

Run 98147a29, attempt 86900d82cf6f454aacf3acf4a7ff46dd, base 7809df6 (merge-base with
autonomy-upstream/main = f65f8a4, absorbed via 92688a2). Prior research:
docs/ideation/2026-09-20-repository-extensions-research-2.md — this pass covers deltas since.

## 1. Upstream delta since merge-base (2 commits)

`git log 92688a2..autonomy-upstream/main` →
- 0c7489d chore(deps): update fro-bot/agent to v0.114.1 (#517)
- b8c7982 chore(dev): update dependency eslint to v10.11.0 (#516)

Plus IN FLIGHT: upstream PR #521 "update fro-bot/agent to v0.115.0" OPEN/MERGEABLE, checks
green (Test pending); fro-bot/agent v0.115.0 released 2026-09-23T22:39Z.
Fork pins fro-bot/agent@b711f08e (v0.114.0) in fro-bot.yaml:333; eslint 10.10.0 at base.

## 2. Ecosystem events (dated, this window)

- **Node 20 retired from Actions runners — 2026-09-23** (final notice; the
  ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION opt-out is gone; runners force Node 24 for JS
  actions). https://github.blog/changelog/2026-09-23-node-20-is-no-longer-available-in-github-actions/
- **Ubuntu 26 GA + ubuntu-latest migration — 2026-09-17.**
  https://github.blog/changelog/2026-09-17-ubuntu-26-generally-available-and-latest-migration/
- All-platform CodeQL bundle deprecation notice — 2026-09-22 (watch codeql.yaml config).
- Code-scanning AI Scan for PRs: org/repo REST enablement endpoints public preview (09-10);
  no longer requires CodeQL default setup (09-16).

## 3. Candidates (ranked)

### R1 — HIGH: upload-artifact@v4 is node20 → next visual run breaks
`.github/workflows/visual.yaml:59,67` use `actions/upload-artifact@v4` (the only two
non-SHA action pins in the repo — also a pinning-convention violation).
Verified via `gh api repos/actions/upload-artifact/contents/action.yml?ref=<tag>`:
v4 (floating) = node20, v4.6.2 = node20, v5.0.0/v5 = node20. node24 starts v6.0.0
(2025-12-12); current v7.0.1 (2026-04-10). Last visual run 2026-09-23T18:39Z (success,
BEFORE the 20:46Z retirement post) — no post-retirement run exists yet.
Action: migrate both to v7.0.1 SHA-pinned; v6+ singleton-artifact semantics require
distinct artifact names (both uploads already use distinct names — verify at fix time).
NOT on ROADMAP.

### R2 — MEDIUM: pin the runner image before ubuntu-latest flips to Ubuntu 26
All 12 runs-on declarations across workflows are ubuntu-latest at main (self-hosted residue
gone). ubuntu-latest migrates to Ubuntu 26 (09-17 changelog). Rolling flips bite this repo's
documented toolchain assumptions (pipx absence → actionlint-via-docker workaround;
visual baselines are image-sensitive, mixed provenance). Action: pin ubuntu-26.04 (or
24.04) per job and re-validate once.

### R3 — MEDIUM: toml@4.1.2 HIGH advisory in dev chain (from assess evidence)
pnpm audit → GHSA-82x6-q7mm-w9cf via @opencode-ai/plugin>effect>toml, also present in
origin/main's lockfile (pnpm-lock.yaml:3701). Fix: pnpm-workspace.yaml overrides
`toml: '>=4.2.0'` (precedent: brace-expansion, fast-uri, undici overrides in same block).

### R4 — MEDIUM: add .dockerignore (never existed in history)
`git log --all --oneline -- .dockerignore` → empty. Local context 394MB node_modules +
web/node_modules + web/dist; CI checkouts (fetch-depth: 0) ship full .git into the context;
`COPY web/ ./web/` (Dockerfile:18) bakes stale local web/dist into the builder layer.
Action: .dockerignore with node_modules, .git, web/dist, .conductor, *.log.

### R5 — LOW: absorb upstream micro-batch in one sync
eslint 10.11.0 + fro-bot/agent v0.114.1 (landed upstream) + v0.115.0 (PR #521 open,
mergeable, released 09-23). One absorb commit after #521 lands beats chasing pins.

### R6 — LOW: minor dependency lag
eslint-plugin-erasable-syntax-only 0.4.2→0.7.2 (enforces the strip-only invariant);
@opencode-ai/plugin 1.18.31→1.18.32; jsdom 29.1.1→30.1.1 (major watchlisted). Standing
majors unchanged: vitest 5.0.1 (2026-09-15), TS 7.0.2 (2026-07-08) — decision-matrix rows
(rm-108), no new signal to act on.

### R7 — INFO: platform direction (watch, don't build)
AI Scan for PRs endpoints (org/repo, public preview) extend the security-events read
surface the aggregator already models (security_events/vulnerability_alerts:read, optional
+ graceful). A future panel could surface AI-scan findings — only after the API stabilizes.
CodeQL all-platform bundle deprecation (09-22): verify codeql.yaml bundle config before the
window closes.

### R8 — INFO: competing landscape re-confirmed
dlvhdr/gh-dash 12,545★ (pushed 2026-09-22, +10 since 09-20) — terminal + PAT scoped. The
web/operator + GitHub-App-token niche stays unoccupied; no new entrant in gh search.

### R9 — INFO: ROADMAP hygiene
Base ROADMAP lists "Drop the eight unused workbox runtime dependencies" as OPEN; done at
f334fb2 (in base history; 0 hits in package.json). Move to Completed on next ROADMAP edit.

## 4. User needs (in-repo signals)
25 open ROADMAP items at base (49 rm- ids at main) remain the backlog. This run's assess
evidence sharpens the top operator need: recovery — main is red (tracked .conductor ndjson,
PR #23 open CLEAN), 12 PRs sprawl (7 stale drafts, #14/#15 conflicting), canonical checkout
carries stale twin 7809df6 + scratch file. R1/R5 time the same landing window.

## 5. Rejected / deferred
- vitest 5, TS 7, jsdom 30 major migrations — no new ecosystem signal; standing watchlist.
- Renovate-style dep automation — deliberately absent on the fork (rm-136); upstream runs it.
- wiki-writer write path — fork invariant (never absorb upstream #504's write capability).

## Sources
- git: `git log 92688a2..autonomy-upstream/main`, `git log -1 --format='%H %P'`, grep inventory of `uses:`
- gh api: fro-bot/dashboard PRs #504-#521; actions/upload-artifact action.yml @ v4/v4.6.2/v5.0.0 + releases; dlvhdr/gh-dash repo; fro-bot/agent releases/latest
- npm: `npm view` dist-tags/dates for vitest, typescript, eslint, jsdom, eslint-plugin-erasable-syntax-only, @opencode-ai/plugin, effect, toml
- registry-1.docker.io HEAD for node:24-slim → sha256:0e0ff40a... (pin matches; NO drift today; note: local `docker manifest inspect -v` returned a stale 5cbc7cab digest — use the registry HEAD)
- github.blog changelog month page 09-2026 + the two dated entries (via r.jina.ai fetches)
- gh run list (codeo1io/dashboard) for visual/Main run recency vs retirement timestamp
