# Repository-extensions research — 2026-09-22 (cycle-4 lineage, 5th refresh)

> Lineage disclosure (#4323): the engine labels this run
> repository-maintenance cycle 4; by repository artifact lineage this is the
> **5th** repository-extensions refresh (2026-09-19 ideation → 2026-09-20
> research ×2 → 2026-09-21 reconstruction, which is itself stranded in open
> PR #10 → this document). The 4th refresh's dispositions (its rm-131..rm-134
> acceptances) were renumbered in the stranded roadmap to rm-135..rm-141; this
> refresh re-measures everything live and proposes only items beyond BOTH the
> landed roadmap and the stranded rm-134..rm-141 set.

## Frame (all re-measured live 2026-09-22, run f11b7255)

- Fork origin/main tip: `aa9937f` (2026-09-22, CI moved to GitHub-hosted
  ubuntu-latest by PR #11 `d73fbe7` + PR #12 `aa9937f`). All six workflows
  green at tip; fresh gates in the run worktree: `pnpm test` 3115/3115
  (2037 server + 1078 web), `pnpm check-types` exit 0, `pnpm lint` clean.
- Open PRs: #9 (`f8ff412`) and #10 (`27b046a`, the validated cycle-4/6 truth
  batch) — both OPEN, merge cleanly into `aa9937f` (0 conflicts).
- Upstream drift: exactly **1 commit** (`b8c7982`, upstream PR #516,
  eslint 10.11.0 — fork pins 10.10.0). Upstream merged through #514 is
  already absorbed at `92688a2`.
- `fro-bot/agent` dependency: latest release **v0.114.0** (2026-09-21) ==
  the fork's pin (`fro-bot.yaml:333` pins `fro-bot/agent@b711f08e # v0.114.0`)
  — **drift 0 today** (rm-120 watch satisfied this instant).
- npm ecosystem (registry dist-tags vs fork pins): hono 4.13.8 (fork caret
  `^4.7.11` resolves current), vite 8.3.0 = fork, react 19.3.0 = fork,
  tailwindcss 4.3.3 = fork, vite-plugin-pwa 1.3.0 = fork,
  @octokit/auth-app 8.3.1 = fork, @playwright/test 1.63.0 = fork,
  eslint 10.11.0 (one minor ahead), jsdom 30.1.1 (fork 29.1.1 — one major
  behind, watchlist), typescript 7.0.2 (fork 6.0.3), vitest 5.0.1
  (fork 4.1.11), pnpm 12.5.1 (fork 11.27.0).
- Node line: node 24 LTS start 2025-10-28, EOL 2028-04-30 (endoflife.date) —
  the Dockerfile `node:24-slim` pin window is healthy; node 26 LTS starts
  2026-10-28 (already gated as stranded rm-139).
- Base image pin: Dockerfile `sha256:0e0ff40…` == live registry digest for
  `node:24-slim` (registry-1.docker.io HEAD via token-auth, 2026-09-22) —
  the earlier recorded drift self-resolved via tag rotation.
- **Fork's own OpenSSF Scorecard: 7.1** (api.securityscorecards.dev,
  analyzed 2026-09-22T04:52:47Z by the fork's weekly run) — distinct from the
  README badge, which still displays **upstream's** score (stranded rm-134).
  Sub-scores below 8: Code-Review 0 (0/29 approved changesets), Maintained 0
  (repo younger than 90 days), CII-Best-Practices 0, License 0, Signed-Releases
  -1 (no GitHub releases), Fuzzing 0, Branch-Protection -1 (token read error;
  branch is in fact unprotected per rm-116's 404 probes).
- Licensing reality: the fork repo reports license null AND upstream
  fro-bot/dashboard has NO license file (GitHub license API 404). There is
  nothing to inherit.

## Candidates (evidence-backed, each extends the landed+stranded roadmap)

### C1. Deterministic visual gate via the official Playwright container image

- **Track**: reliability. **Source**: assess P2 (run f11b7255) + live
  feasibility probe.
- **Problem**: `visual.yaml` runs on rolling `ubuntu-latest` and installs the
  browser at job time (`visual.yaml:48` — `pnpm exec playwright install
  chromium --with-deps`), so baseline provenance is mixed: privacy-dark was
  cloud-regenerated at `aa9937f` while dashboard-listener-dark and
  dashboard-operator-dark are workstation-captured at `4b1b406`. This already
  produced one red gate (run 35678222963 at `7809df6`, cloud font stack) that
  needed a baseline regen to clear. Every future ubuntu-latest image or font
  rotation can redden the gate arbitrarily.
- **Proposal**: run the visual job in `mcr.microsoft.com/playwright:v1.63.0-noble`
  (tag-verified to exist via `docker manifest inspect`), which pins the browser
  stack AND OS dependencies to the same version as the repo's
  `@playwright/test` 1.63.0 pin; regenerate all three dark baselines inside
  that image once, then forbid runtime browser installs. Alternative lighter
  form: pin `runs-on: ubuntu-24.04` + document the regen procedure (still
  exposed to OS library churn).
- **Acceptance evidence**: three consecutive green weekly visual runs without
  baseline edits; `visual.yaml` no longer installs browsers at runtime;
  baseline files' last commit is the in-image regen.

### C2. License decision (blocked-external unless upstream acts)

- **Track**: compliance. **Source**: Scorecard License = 0 + both-repos
  license probes above.
- **Problem**: no LICENSE exists in the fork or upstream; Scorecard docks the
  fork for it, and derivative-work status of an unlicensed upstream makes a
  unilateral fork-side LICENSE legally hollow.
- **Proposal**: hold as blocked-external — ask the upstream owner (fro-bot org)
  to choose a license upstream; the fork mirrors it the same absorb cycle.
  Until then, document the deliberate "no-license internal tooling" posture in
  the README (truth-telling beats silent License=0). Do NOT add a LICENSE file
  unilaterally.
- **Acceptance evidence**: README states the posture; if upstream licenses,
  LICENSE present + Scorecard License ≥ 8.

### C3. Property-based tests for the SSE parsers and listener ingest validation

- **Track**: reliability. **Source**: Scorecard Fuzzing = 0 + existing
  invariant-test lineage (`rm-114` single-source parser invariants,
  `docs/solutions/best-practices/lock-invariant-claims-with-tests-2026-09-21.md`).
- **Problem**: the repo's only network-shaped parsing surfaces — the
  server-side SSE reader and the production browser parser
  (`public/static/operator-stream.js`) plus the listener ingest payload
  validation — are exercised by hand-written example tests only. OSS-Fuzz
  (what Scorecard looks for) is disproportionate for a monitoring dashboard,
  but property-based testing is proportionate and in-stack.
- **Proposal**: add `fast-check` (MIT, vitest-integrated) property suites:
  chunk-boundary splits for arbitrary SSE fragmentations (multi-byte splits,
  CRLF/LF mixes, comment lines, retry fields), and ingest-payload
  round-trip/rejection properties for the listener route.
- **Acceptance evidence**: new suites in `pnpm test` count; a seeded
  counterexample run demonstrating a caught regression; Scorecard Fuzzing
  stays 0 by design (documented deviation — proportionality note in the
  security-posture doc, C5).

### C4. pnpm-store caching for hosted CI + setup-action rationale truthing

- **Track**: CI performance. **Source**: assess finding (run f11b7255).
- **Problem**: `.github/actions/setup/action.yaml:9-16` justifies having NO
  pnpm-store cache by the self-hosted-runner store persistence that PR #11
  removed. On ephemeral hosted runners every one of ~9 jobs cold-installs the
  full dependency tree (measured Main jobs 5-84s at `aa9937f` — tolerable but
  pure waste).
- **Proposal**: `actions/setup-node` with `cache: pnpm` (or an explicit
  `actions/cache` step keyed on the lockfile) in the setup composite action,
  plus rewrite the stale rationale comment. Not covered by stranded rm-137
  (pins only) — this is the caching half the old policy deferred.
- **Acceptance evidence**: before/after install-step timings on consecutive
  runs of the same workflow; comment cites hosted-runner reality.

### C5. Security-posture transparency doc (scorecard deviations named)

- **Track**: docs/security. **Source**: Scorecard 7.1 sub-scores above.
- **Problem**: four sub-scores are low **by deliberate design** and the repo
  never says so: Code-Review 0 (single-operator autonomous loop; reviews are
  in-process adversarial lenses, not GitHub approvals), Signed-Releases -1
  (image-based deploys, no GitHub releases), CII-Best-Practices 0 (declined),
  Maintained 0 (age, self-resolves ~2026-11-28). An unexplained 7.1 invites
  misreading; an explained one is a posture statement.
- **Proposal**: a short SECURITY-posture section (README or
  docs/runbooks/security-posture.md) listing each Scorecard deviation with its
  reason and owner; pairs with rm-134's badge fix so the badge links the FORK
  score, and with rm-116 for Branch-Protection.
- **Acceptance evidence**: doc lists every sub-score < 8 with disposition;
  README badge resolves to codeo1io/dashboard.

### C6. Dependabot auto-merge for grouped patch/minor PRs (sequenced after rm-116)

- **Track**: ops automation. **Source**: dependabot.yml grouped-weekly config
  + rm-116's repeated red-landing evidence + PR #11/#12 free-tier capacity.
- **Problem**: dependency PRs will arrive weekly from ~2026-10-03 in groups;
  today every one needs manual merge despite deterministic gates. Auto-merge
  without required checks is unsafe (three red landings already occurred on
  unprotected main — rm-116 signals).
- **Proposal**: once rm-116's required checks exist, set
  `automerge: true` + `target: patch` (then `minor`) on the npm + docker
  groups with `reviewers: none`, relying on required-check gating; keep
  majors manual per rm-133. Explicitly sequenced: **blocked on rm-116**.
- **Acceptance evidence**: first auto-merged dependabot PR shows green
  required checks before merge; a red-check PR stays open unmerged.

## Deduplicated / dispositions (no new roadmap item)

- Upstream eslint bump (#516) → routine absorb under rm-103 cadence.
- jsdom 30 / TS 7 / vitest 5 / pnpm 12 majors → rm-108 watchlist,
  rm-139 (Node 26), rm-140 (pnpm 12) — stranded roadmap already gates these.
- SBOM + `actions/attest-build-provenance` → rm-105 (acceptance already
  written); Signed-Releases could later extend rm-105 to tag-based GitHub
  releases, folded there if ever wanted.
- Branch-Protection sub-score → rm-116 (also note: Scorecard's branch read
  errored with the default token — when rm-116 lands, verify the scorecard
  job can actually read the ruleset, else the sub-score stays -1).
- README badge retarget + endpoints truth → stranded rm-134.
- PWA kill-switch decision, bounded-concurrency aggregator refresh, fro-bot
  prompt truthing, workflow pin batch → stranded rm-138/141/136/137.
- CII-Best-Practices badge → REJECTED: bureaucratic overhead for a
  single-operator internal dashboard; documented deviation instead (C5).
- Renovate revival → REJECTED (standing decision, PR #1).
- `fro-bot/agent` clonedep reference refresh → absorbed by rm-120 watch;
  no push-send operator endpoint appears in v0.109.4..v0.114.0 release notes
  (grep of release bodies), so rm-106 (listener digest push) stays
  blocked-external on the gateway contract.

## Verification

- All measurements above were taken live on 2026-09-22 (commands recorded in
  the run breadcrumbs: `git`, `gh api`, registry.npmjs.org dist-tags,
  endoflife.date, api.securityscorecards.dev, `docker manifest inspect`).
- This document passes `pnpm lint` markdown rules (verified post-write).
