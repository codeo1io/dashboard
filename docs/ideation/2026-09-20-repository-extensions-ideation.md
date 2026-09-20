# Ideation: Repository extensions (run 270220e7, research phase, cycle 1)

Date: 2026-09-20. Base: origin/main 2f3a884 (fresh, no content-merge needed).
Method: ce-ideate, in-process lenses (no subagent tool in this delegate session;
cross-model dispatch skipped/recorded per convention). Builds on — does not redo —
`2026-09-19-repository-extensions-ideation.md`; prior survivors are carried over with
status updates, and every new candidate below is backed by evidence gathered this cycle.

## Grounding Context (all measured 2026-09-20)

- **Upstream drift is 4 commits** (`git log 6f4e620..autonomy-upstream/main`): node
  digest 0e0ff40 (#492, 2026-09-19), node digest a9d7043 (#491), codeql-action 1c5b675
  (#489 — already in our tree), hono 4.13.8 (#488). Our Dockerfile still pins 2fe369e
  at Dockerfile:1,21,35 — two digest generations stale.
- **Live `node:24-slim` tag digest = 0e0ff40 (2026-09-19)**, identical to upstream
  #492; 0e0ff40 ships libpcre2-8-0 10.42-1+deb12u1 (verified earlier this cycle), so
  the Trivy HIGHs clear at the base and the in-image patch can retire on absorb.
- **Upstream open PR #481** (fro-bot, 2026-09-16): route unhandled request errors
  through the redacting logger — security-adjacent to this fork's redaction invariants.
- **Dependency currency** (npm view, 2026-09-20): octokit modular packages all
  current; vite 8.3.0 / react 19.3.0 / tailwind 4.3.3 / workbox 7.4.1 /
  vite-plugin-pwa 1.3.0 current. Behind: typescript 6.0.3 → 7.0.2 (major), vitest
  4.1.11 → 5.0.1 (major), jsdom 29.1.1 → 30.1.0 (major), hono 4.13.7 → 4.13.8
  (patch), eslint 10.10.0 → 10.11.0 (patch).
- **Actions pins** (gh api releases/latest vs `uses:` in `.github/workflows/`): all
  current except `actions/setup-node` (v6 pinned, v7.0.0 latest); `actions/checkout`
  is pinned at two versions simultaneously (v6.1.0 in one workflow, v7.0.1 elsewhere).
- **Platform**: GitHub REST API breaking-changes version 2026-03-10 removes
  `merge_commit_sha` from PR responses, REST check-suite/status endpoints, and the
  `javascript` / `typescript` code-scanning enum values. This repo is unexposed
  (GraphQL `statusCheckRollup.state` only; grep clean). Our only REST version pin is
  `X-GitHub-Api-Version: 2022-11-28` at src/auth/oauth.ts:130.
- **Node.js schedule evolved** (nodejs.org announcement): from October 2026 one major
  per year, every release LTS for 30 months. Node 26 enters LTS 2026-10; Node 24
  maintenance begins 2026-10 under the old schedule.
- **TypeScript 7.0 announced 2026-07-08** (devblogs.microsoft.com): native port,
  8–12× build speedups, ships without a programmatic API; typescript-eslint and other
  API consumers stay on 6.x via the `@typescript/typescript6` side-by-side package.
- **Code-observed needs** (from this run's assess phase at the same tree): aggregator
  silently drops resolver-failed repos and replaces last-good data with fresh-empty
  without a stale banner (src/github/aggregator.ts:686,704-706); the hand-mirrored SSE
  parsers share an identical cap bug (UTF-16 units counted as bytes —
  src/gateway/operator-sse-reader.ts:526 and public/operator-stream.js:2473);
  GitHub-side rate-limit handlers exist but only log (src/github/app-client.ts:73-79);
  the 2026-09-20 ROADMAP render broke `pnpm lint` at origin/main HEAD and deleted all
  cycle-tracked open items (ROADMAP.md:20; Main run 35479225529).

## Ranked Ideas

### 1. Make the roadmap render safe (self-lint + anti-drop enforcement) — ESCALATED

Prior-cycle idea 1, now with catastrophic fresh evidence: the 2026-09-20 render
committed output that fails `pnpm lint` (markdown/no-missing-label-refs on a bare
array literal) AND silently deleted every tracked open item plus the do-not-drop
directive. origin/main is unlandable until the prose is fixed. Enforce: render output
must pass `pnpm lint` before commit; tracked items may only be closed with an explicit
superseded marker; vendored `.agents/skills/impeccable/**` paths and repo-foreign
evidence (pytest/ast) are excluded. Evidence: ROADMAP.md:20, Main run 35479225529
(Lint red at 2f3a884, green at parent 5b8a2b3), `git show 2f3a884 -- ROADMAP.md`
(13 insertions, 88 deletions).

### 2. Upstream absorb batch + weekly drift gate — RE-VALIDATED

Absorb the measured 4-commit drift (node 0e0ff40 — not a9d7043, which #492 already
superseded within a day; hono 4.13.8 manifest sync; retire the in-image libpcre2
patch on absorb per the earlier dpkg verification), then add a drift gate: a weekly
scheduled job (self-hosted, serial-runner-aware) that reports
`git rev-list --count merge-base..autonomy-upstream/main` and open upstream PRs so
two-generation base staleness cannot recur silently. Evidence: upstream log this
cycle; live tag digest 0e0ff40; upstream open PR #481 tracked for absorb when merged.

### 3. Degradation/staleness UX for the aggregator — NEW

Serve last-good with an explicit stale banner on partial resolver failure, mark
absent repos instead of silently dropping them, and show data age on the operator
view. Backed by assess findings at src/github/aggregator.ts:686 and :704-706 vs the
file's own fail-closed path at :624-641, plus the verified test gap (warm-empty and
resolver-failure snapshot semantics untested). Read-only invariant unaffected.

### 4. Dated major-upgrade decision matrix — REFRAMED

Replace the open-ended watchlist with dated triggers: TypeScript 7 when
typescript-eslint supports it (7.0 has no API; side-by-side via
`@typescript/typescript6` is the documented path), vitest 5 and jsdom 30 on the next
scheduled maintenance window (both majors are tooling-only, suite-pinned), Node 26
runtime base when it enters LTS 2026-10 (30-month support under the new annual
schedule). One table in AGENTS.md or docs/solutions; each row gets a trigger date, a
blast radius, and a go/no-go owner decision recorded at the date. Evidence: npm view
versions above; TS 7.0 announcement 2026-07-08; Node schedule announcement.

### 5. GitHub rate-limit budget observability — NEW

The installation-token client already hooks `onRateLimit` / `onSecondaryRateLimit`
(src/github/app-client.ts:73-79) but the signal dies in logs. Aggregate remaining /
reset / secondary-limit events into the operator view (or a health endpoint) so
quota exhaustion is visible before the dashboard's polling degrades. Small, read-only,
and directly operator-relevant given the aggregator's cross-repo query volume.

### 6. CI pin hygiene micro-batch — NEW (quick win)

Bump `actions/setup-node` v6 → v7.0.0 and unify the dual `actions/checkout` pins
(v6.1.0 and v7.0.1 both in `.github/workflows/`) to v7.0.1. Everything else measured
current this cycle, so this closes the entire actions gap in one small PR. Validate
with the container actionlint command per repo convention.

### 7. Single-source the SSE buffer caps and parser invariants — NEW

The server reader and the browser parser are maintained by hand in parallel and
already share a bug (UTF-16-unit counts against a `_BYTES` constant:
operator-sse-reader.ts:35/526, operator-stream.js:44/2473). Extract the cap constant
and the normalization rules to one shared source (build-time generate or a tiny
shared module the browser bundle imports), so the next drift is a build failure
instead of a live parser divergence.

## Rejection Summary

| Idea | Reason |
| --- | --- |
| Listener digest push (prior #5) | Unchanged since prior ideation; VAPID plumbing exists but no fresh demand signal — stays parked |
| SBOM + build provenance v2 (prior #4) | No fresh evidence gathered this cycle; carry over unchanged |
| Workbox precache removal | Real (kill-switch SW documented) but decision-blocked, not evidence-blocked: removal vs real offline caching is a product call |
| Bump `X-GitHub-Api-Version` beyond 2022-11-28 | The pin is protective; 2026-03-10 REST removals leave us unexposed — folded into idea 4's matrix as a scheduled review |
| Immediate vitest 5 / jsdom 30 migration | Tooling-only majors with known migration friction (vitest 4 lesson); scheduled via idea 4 instead |
| Immediate Node 26 base bump | Not LTS until 2026-10; dated trigger captured in idea 4 |
| Webhook/event-driven refresh | Needs a public endpoint and a provisioned secret; the fork has no repo secrets and poll cadence suffices at this scale |

## Prior-cycle survivor status

| Prior idea | Status entering this cycle |
| --- | --- |
| 1. Roadmap render hardening | Escalated to idea 1 (render broke main on 2026-09-20) |
| 2. Land dependency automation | Mostly done — dependabot.yml landed at 3075f4a; first dependabot PR evidence still pending (~2026-10-03) |
| 3. Absorb cadence with drift gate | Re-validated as idea 2 with this cycle's 4-commit drift measurement |
| 4. SBOM + provenance | Carried over, no fresh evidence |
| 5. Listener digest push | Parked, no fresh demand |
| 6. Operator system-status panel | Partially subsumed by idea 5 (quota) and idea 3 (staleness) |
| 7. Major-upgrade watchlist | Reframed as dated decision matrix (idea 4) |

## Sources

- `git log --oneline 6f4e620..autonomy-upstream/main` (4-commit drift, 2026-09-20)
- `gh pr list --repo fro-bot/dashboard --state open` (PR #481, 2026-09-16)
- Docker Hub API `library/node/tags/24-slim` → digest 0e0ff40, last_updated 2026-09-19
- `npm view <pkg> version` 2026-09-20 for all deps listed in Grounding Context
- `gh api repos/<action>/releases/latest` 2026-09-20 for every pinned action
- https://docs.github.com/en/rest/about-the-rest-api/breaking-changes (version 2026-03-10)
- https://nodejs.org/en/blog/announcements/evolving-the-nodejs-release-schedule
- https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/ (2026-07-08)
- This run's assess PhaseResult (aggregator, SSE parser, ROADMAP render evidence)
- Dockerfile:1,21,35; src/auth/oauth.ts:130; src/github/app-client.ts:73-79;
  src/github/aggregator.ts:686,704-706; src/gateway/operator-sse-reader.ts:35,526;
  public/operator-stream.js:44,2473; ROADMAP.md:20; Main run 35479225529
