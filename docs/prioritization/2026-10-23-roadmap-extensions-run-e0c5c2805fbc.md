# Roadmap extensions 2026-10-23 — repository-maintenance cycle 3, compound run e0c5c2805fbc

Context: conductor run e0c5c2805fbc4f158fe01510e10cd14f, phase roadmap, attempt
a98a2b36bd154769872145237d7abe66, base 8597282 == origin/main (porcelain-clean;
census before edit: 327 defs / 0 dups / max rm-2134). Inputs: this run's assess
(e004e2992d4641c8b917400a9bbd8cb5) and research
(077279a48d6d4bf58d718b30e2eec62d) spool artifacts.

## Mints

- rm-2379 (security, 78.0): code-scanning alert-channel hygiene — 49 open
  alerts byte-stable 2026-10-22..23, four CVE families duplicated once per
  release digest (per-digest trivy SARIF in .github/workflows/release.yaml)
  plus six Scorecard ID alerts from .github/workflows/scorecard.yaml
  publish_results. Acceptance: dismissed_reason triage with a recorded
  before/after census, SARIF category/fingerprint consolidation verified by a
  probe run, a scheduled alerts-API growth guard, and the
  docs/runbooks/security-posture.md refresh riding the same edit.
- rm-2380 (reliability, 72.0): dependabot native bun ecosystem — stanza
  migration (dependabot-core v0.400.0+ supports Bun 1.4 + lockfile v3; the npm
  stanza cannot write bun.lock), ghost-gate citation repair (.github/dependabot.yml
  header and .github/workflows/dependency-review.yaml cite a nonexistent
  pnpm-workspace.yaml 1440; the real gate is bunfig.toml 259200), and the
  past-due 'Re-evaluate: 2026-10-21' ignore decision (vitest-ignore retired;
  typescript-ignore retained on the typescript-eslint peer evidence).
  Verification-first: the first dependabot run's outcome is pinned evidence,
  with the npm-stanza fallback recorded if it errors server-side.

## Riders

rm-673 (security.txt floor DATED CORRECTION: crossing 2026-10-25T00:00Z, not
2026-11-23 — the unlanded 0d009c8e8f9a record carries the slip; the refresh
must be promoted at the next fold), rm-252 (window behind=12 third day;
upstream PR #710 pending), rm-886 (node v24.22.1 newer than upstream #703
digest), rm-139 (v26.12.1 still lts=false; 2026-10-28 gate on time), rm-134
(scorecard 7.7@2026-10-21 vs posture doc 7.1@2026-09-22), rm-259
(wiki-write-core cadence paused), rm-1451 (live pin-currency set; the vite
inlineDynamicImports deprecation datum corrected as not-in-tree).

## Census

Census after edit: 329 defs / 0 dups / max rm-2380 / next free rm-2381.

## Deliverables

- `ROADMAP.md`
- `docs/prioritization/2026-10-23-roadmap-extensions-run-e0c5c2805fbc.md`
