---
date: '2026-09-20'
topic: 'repository-extensions'
focus: 'research_repository_extensions — upstream changes, ecosystem, competing approaches, user needs, standards; cycle-2 refresh of the 2026-09-19 ideation'
mode: 'repo-grounded'
run: '779e7271 (cycle 2), research phase; prior cycle artifact: docs/ideation/2026-09-19-repository-extensions-ideation.md'
---

# Repository-extensions research (run 779e7271, cycle 2)

Cycle-2 refresh: every prior candidate re-measured against live state; new
candidates admitted only with direct evidence. Per project convention this
delegate session runs in-process (no subagent tool), so no candidate is claimed
independently corroborated — warrants below are `direct:` (reproduced/measured)
or `external:` (registry/API reads with timestamps).

## State transitions since the 2026-09-19 ideation

| Prior idea | Status now | Evidence |
|---|---|---|
| #2 Dependabot automation | **LANDED** | `.github/dependabot.yml` on origin/main since 3075f4a (merged fc7b834): weekly, grouped (actions/npm/docker), `open-pull-requests-limit: 3`, SHA-pin-preserving; first PRs expected ~2026-10-03 per the 2026-09-19 window open |
| #1 Roadmap-sync generator hardening | **RECURRED 2/2** | Lint broke again at the very next sync: ROADMAP.md:20:32 at 2f3a884 (was ROADMAP.md:14:32 at 0bc9a32); pytest evidence line persists (ROADMAP.md:21) |
| #3 Upstream-absorb cadence | **SHARPENED — drift grew 2→6, security fast-follow merged** | `git log origin/main..autonomy-upstream/main` = 6 commits; PR #481 merged (876a02a) |
| #4 SBOM + provenance | carried | `grep -ci 'sbom\|attest\|syft\|cosign' .github/workflows/release.yaml` = 0 |
| #5–#7 listener push, status panel, watchlist | carried | re-measured below |

## Upstream changes (fro-bot/dashboard, remote `autonomy-upstream`, fetched 2026-09-20)

Drift is **6 commits** (was 2 at the 2026-09-19 research):

- `7fab758` hono → 4.13.8 (#488). Fork lockfile carries hono@4.13.7
  (specifier `^4.7.11`); npm latest = 4.13.8 — fork is one patch behind.
- `54a5669` codeql-action digest 1c5b675 (#489). Fork already pins this exact
  digest — no-op for the fork.
- `3efa4b1` + `86c1e6a` Node base digest → a9d7043 (#491) then 0e0ff40 (#492).
  Upstream's Dockerfile now pins 0e0ff40 and its in-image libpcre2 patch is
  **gone** — upstream retired the patch on the fixed base, exactly the shape
  this run's assess phase recommends for the fork (fork pins 2fe369e which
  ships vulnerable 10.42-1; live tag 5cbc7cab ships fixed 10.42-1+deb12u1 —
  so even upstream is now one digest behind live again: the tag moved twice in
  ~48h after #492).
- `876a02a` **fix(security) #481 merged** — routes unhandled request errors
  through the redacting logger (`app.onError` → `logger.error` +
  `sanitizeErrorMessage`, generic 500 body; +16 src / +62 test lines). The
  prior ideation pre-declared this as a fork fast-follow trigger. **The fork
  lacks the chokepoint**: `grep -n 'app.onError' src/server.ts` finds none;
  the fork already imports `sanitizeErrorMessage` (src/server.ts:50), so the
  port is mechanical but must respect the fork's diverged server (fixture
  harness, rate limiter, ingest routes).
- `81d6c20` chore: remove clonedeps skill artifacts (#493) — deletes
  `.slim/clonedeps.json`, `.ignore` block, AGENTS.md section, .gitignore lines.
  The fork deliberately retains its cloned dependency source (`.slim/` +
  `clonedeps.json` verified present in this tree; AGENTS.md 'Cloned Dependency
  Source' documents `.slim/clonedeps/repos/fro-bot__agent` as the reference
  clone for gateway/contract surfaces). **Decision point:** exclude #493 from
  the absorb (keep fork artifacts) — recommended — or adopt removal and lose
  the local reference clone.
- Upstream still carries `COPY wiki-writer/package.json` in the Dockerfile
  builder+prod-deps stages (verified in the fork↔upstream Dockerfile diff) —
  the fork-invariant exclusion surface (#3206/#3210) is live in every merge.
- Upstream corepack-pins `pnpm@11.8.0`; the fork pins `pnpm@11.27.0`
  (package.json `packageManager` + Dockerfile) — the fork is AHEAD; absorb
  must not regress it.
- Upstream issue #494 shows fro-bot now files **daily report issues** upstream;
  irrelevant to the fork (Fro Bot workflow `disabled_manually`, no
  `FRO_BOT_PAT`, zero repo secrets — re-verified).

## Ecosystem (measured 2026-09-20)

- npm: hono 4.13.8 (fork 4.13.7); eslint 10.11.0 (fork 10.10.0, 1 minor);
  vitest 4.1.11 = latest 4.x, **vitest 5.0.1 exists**; typescript 6.0.3 =
  latest 6.x, **7.0.2 exists**; jsdom 29.1.1 (fork) vs **30.1.0** available
  (web-only dependency — outside the strip-only server lint).
- Actions: trivy-action v0.36.0 = latest (2026-04-22); scorecard-action v2.4.4
  = latest; codeql-action fork pin 1c5b675 is the current v4 line (bundle
  2.27.0, 2026-09-09). Minor inconsistency: `main.yaml`/`codeql.yaml` pin
  checkout v6.1.0 while `scorecard.yaml` already uses v7.0.1 — fold into the
  next workflow-touching PR.
- Docker: `node:24-slim` live digest sha256:5cbc7cab (fourth digest in ~8 days:
  2fe369e → a9d7043 → 0e0ff40 → 5cbc7cab). Weekly dependabot docker PRs cannot
  keep pace with this tag velocity — see candidate 6.
- actionlint: rhysd/actionlint container line still tops out at 1.7.x
  (repo pins 1.7.12, matches CI); raven-actions wrapper v2.2.0 unchanged.

## Competing approaches (re-measured)

`dlvhdr/gh-dash` 12,535★ (was 12,533), pushed 2026-09-08 — still active, still
the UX benchmark for saved views, still not a direct competitor (terminal,
token-scoped, not GitHub-App-authed read-only web). A GitHub search for
recently-updated 'github dashboard monitoring' repos returns only a stale 0★
demo repo — the fork's niche (single-operator, read-only-by-construction,
run-centric, App-token-minted) remains unoccupied.

## User needs (in-repo demand signals, cycle-2)

Unchanged core signals (listener channel with two producers, VAPID push infra,
zero TODO/FIXME in `src/`) plus one **strengthened** signal: three of four
required workflows (Main ×2 causes, CodeQL) were red at the tip for a day+ and
the only detection path was out-of-band `gh` commands run during this run's
assess phase — the operator's own monitoring surface did not (and cannot
currently) surface the health of the monitoring itself.

## Ranked candidates (evidence-backed)

### 1. Absorb upstream security fix #481 — global redaction chokepoint (app.onError)
**Warrant:** `direct:` — `git show 876a02a` (src/server.ts +16: onError routes
through `logger.error` + `sanitizeErrorMessage`, generic 500); fork has no
`app.onError` (grep across `src/`); fork imports `sanitizeErrorMessage` at
src/server.ts:50; upstream ships 62 test lines to port. Prior ideation
pre-declared this fast-follow.
**Why now:** security-relevant and merged upstream; the fork's unhandled-throw
path currently falls through to Hono's default raw `console.error(err)` — a
log-redaction bypass on a repo whose redaction invariant is documented
(`AGENTS.md` invariant 2, logger.ts chokepoint).
**Complexity:** Low–Medium (port + tests into a diverged server.ts).
**Confidence:** 95%.

### 2. Upstream-absorb batch (6 commits) with fork-exclusion discipline — including the base-digest absorb
**Warrant:** `direct:` — drift = 6 commits (list above); fork↔upstream
Dockerfile diff shows: digest pins, patch retirement at 0e0ff40, upstream
wiki-writer COPY lines (exclusion surface), pnpm 11.8.0 vs fork 11.27.0.
Absorbing #491+#492 lands the fixed base AND retires the in-image patch in one
merge; optional follow-up bump to 5cbc7cab at merge time (live moved again).
**Constraints:** exclude wiki-writer lines; keep fork pnpm; keep fork's
stricter doc wording; skip #493 (keep clonedeps) per the decision above;
Main/CodeQL must be greened FIRST (fix-phase items from this run's assess) so
the absorb merge can gate.
**Complexity:** Medium. **Confidence:** 90%.

### 3. Operator self-observability: surface the monitoring's own health (incl. own-repo CI state)
**Warrant:** `direct:` — this cycle's headline: Main red ×2 causes + CodeQL red
at tip detected only out-of-band; `MonitoringDto` already composes freshness
pieces (src/routes/api.ts:42-64); the aggregator's read-only App client already
queries check suites for listed repos; `gh api repos/codeo1io/dashboard` →
`private=false` — the fork's own repo is public, so monitoring it through the
existing client is redaction-policy-compatible (no private-name leak surface).
**Shape:** compose snapshot freshness + rate-limit budget + listener store
depth/age + own-repo check-run state into one status panel/endpoint; own-repo
inclusion via fork-side config (repos.yaml is the upstream data file — do not
unilaterally edit it).
**Complexity:** Medium. **Confidence:** 80% (up from 75% — the failure mode it
targets recurred at higher severity).

### 4. Harden the roadmap-sync generator (recurrence-proof, now gate-blocking)
**Warrant:** `direct:` — lint break recurred at the very next sync (2f3a884,
ROADMAP.md:20:32 after 0bc9a32, ROADMAP.md:14:32): 2/2 syncs; pytest evidence
line persists (ROADMAP.md:21); both items still target vendored
`.agents/skills/impeccable/**` (eslint-exempt per eslint.config.ts).
Generator-side fix (lint-safe markdown, repo-toolchain-derived evidence,
vendored-path exclusion) + interim in-repo guard (lint the generator's output
in a pre-landing hook or the sync workflow itself).
**Complexity:** Medium (generator lives in fro-bot automation). **Confidence:** 95%.

### 5. Supply-chain v2: SBOM + build provenance in Release
**Warrant:** `direct:` — `grep -ci 'sbom|attest|syft|cosign' release.yaml` = 0;
Release already builds/scans/pushes to GHCR; Scorecard v2.4.4 green. GHCR-native
attestations (`actions/attest-build-provenance` + syft SBOM) are the standard
next rung.
**Complexity:** Medium (serialized single runner — budget Release minutes).
**Confidence:** 85%.

### 6. Base-digest drift visibility workflow (read-only, no secrets)
**Warrant:** `external:` + `direct:` — four `node:24-slim` digests in ~8 days
(Dockerfile pin 2fe369e; memory-verified a9d7043; upstream #491/#492 to
0e0ff40; `docker manifest inspect` today → 5cbc7cab). Weekly dependabot docker
PRs structurally lag this velocity. A weekly read-only check (`docker manifest
inspect` vs pinned digest, `GITHUB_TOKEN` only) that opens an issue on drift
keeps the pin honest between dependabot cycles — fits the fork's zero-secrets
reality and read-only posture.
**Complexity:** Low. **Confidence:** 85%.

### 7. Carried: listener digest push; major-upgrade watchlist
Listener digest push: unchanged evidence (VAPID infra in-tree, listener store
500-row/30-day retention ages unwatched messages out silently; upstream #238
privacy-policy issue still open — policy should parallel the feature).
Watchlist positions re-measured: vitest 4.1.11→5.0.1, TS 6.0.3→7.0.2, jsdom
29.1.1→30.1.0, eslint 10.10.0→10.11.0, hono 4.13.7→4.13.8 — no major has moved
since the 2026-09-19 measurement; keep as a standing roadmap section, low
priority.

## Rejections this cycle

| Idea | Reason rejected |
|---|---|
| Add codeo1io/dashboard to upstream `repos.yaml` to self-monitor | The data file is upstream-owned (`fro-bot/.github` data branch); unilateral fork edit drifts metadata. Do it via fork-side config inside candidate 3 instead. |
| Adopt upstream `pnpm@11.8.0` in the absorb | Fork is ahead (11.27.0); absorbing would regress the toolchain pin. |
| Absorb #493 (clonedeps removal) wholesale | Fork's cloned dependency source is a deliberate keep (AGENTS.md section, reference clone for gateway/contract surfaces); removal loses value with no fork-side gain. |
| Auto-merge upstream dep PRs (full automation of candidate 2) | Exclusion discipline (wiki-writer lines still present upstream; fork doc wording; pnpm pin) requires human-reviewed merges; automation stops at prepare + gate. |
| checkout v6.1.0 → v7.0.1 sweep as its own roadmap item | Trivial consistency edit; fold into the next workflow-touching PR (candidate 2 or the CI fixes). |
| Node 26 / runner fleet / i18n | Unchanged from 2026-09-19 rejections (LTS window; host infra; no demand signal). |

## Sources

- `git fetch autonomy-upstream`; `git log --oneline origin/main..autonomy-upstream/main` (6 commits); `git show 876a02a`, `git show 81d6c20`, `git diff origin/main autonomy-upstream/main -- Dockerfile`
- `gh pr list -R fro-bot/dashboard --state open` (empty — #481/#491/#492/#493 all merged); `gh issue list -R fro-bot/dashboard` (#494, #238, #193, #112, #8)
- `npm view <pkg> version` ×7 (2026-09-20); `npm view vitest@4 / typescript@6 version`; `grep -m1 -A2 'hono@' pnpm-lock.yaml` → 4.13.7
- `gh api repos/{aquasecurity/trivy-action,github/codeql-action,ossf/scorecard-action,raven-actions/actionlint,dlvhdr/gh-dash}` (latest releases / stars, 2026-09-20); `gh api repos/codeo1io/dashboard` → `private=false`
- `docker manifest inspect node:24-slim` → sha256:5cbc7cab (2026-09-20, assess phase)
- In-repo: `.github/dependabot.yml` (landed state), `.github/workflows/{main,codeql,release,scorecard}.yaml` pins, `package.json`, `pnpm-lock.yaml`, `eslint.config.ts`, `src/server.ts`, `src/routes/api.ts`, `.slim/clonedeps.json`, `.ignore`, ROADMAP.md
- Prior artifacts: `docs/ideation/2026-09-19-repository-extensions-ideation.md`; this run's assess breadcrumbs `.conductor/progress/d165dee372e247d2af3cbba2bfeae619.ndjson`
