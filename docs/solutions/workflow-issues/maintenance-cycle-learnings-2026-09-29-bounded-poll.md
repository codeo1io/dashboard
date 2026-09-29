---
module: dashboard
tags: ['maintenance-cycle', 'vitest', 'roadmap-ledger', 'lint-cache', 'guard-tests']
problem_type: workflow-issue
---

# Maintenance-cycle learnings — bounded-poll batch (2026-09-29, run 262f170c0a1e)

Reusable lessons from the 2026-09-29 repository-maintenance cycle (batch:
bounded-poll hardening + small riders; full CI green on ephemeral PRs #228 and
#229). Recorded pre-review, from cycle evidence only.

## L1 — Web test suites run via `--config web/vitest.config.ts`, not project filters

`web/vitest.config.ts` declares `root: 'web'` with no workspace `projects`
export; the root `vitest.config.ts` covers the server tree only.

- `node_modules/.bin/vitest run` from the repo root runs **server tests only**
  (46 files at this cycle).
- `--project web` from the root matches **nothing** ("no projects matched").
- The house entry is `node_modules/.bin/vitest run --config web/vitest.config.ts`
  (equivalently the `test:web` script), from the repo root.

Symptom if ignored: a green-looking root run that silently skips all of `web/`
— exactly the blind spot that let the Monitoring poll-wedge (rm-251) survive
prior local verification.

## L2 — Cite ledger items by id, never by line number

`sed -n '675,682p' ROADMAP.md` once read the **wrong item** (rm-155's block,
read as "rm-194"): a line-number citation staled the moment another insertion
shifted the file, and the mislabel then propagated through three phase
artifacts before being caught. Ledger items are identified by their
`rm-NNN` id; verify with `grep -n '^- id: \`rm-NNN\`' ROADMAP.md` and read the
matched block, or anchor on heading text.

## L3 — Guard tests define the vocabulary their documents may use

`test/fork-exclusion-guard.test.ts` fails if AGENTS.md carries
wiki-write-capability machinery references. An era-qualified disposition note
can live there only if worded to avoid the guard's banned token (e.g.
"isolated repository-editing capability"); the era qualifier
("as of 2026-09-29 …") must stay so later readers can prune it. When editing a
guard-covered document, read the guard first — it is the convention-keeper.

## L4 — `eslint --cache` pays for itself; measure under load

`pnpm lint` was ~363s cold on a contended box (and RC=124 at a 300s cap);
with `--cache` (cache under `node_modules/.cache/eslint`, gitignored
wholesale) warm runs are 5-20s. The script change rides
`package.json` (validated via the authoritative full command, which treats
`package.json` as shared build/test configuration and escalates targeted runs
to full validation — expected behavior, not a failure).

## L5 — The impacted-tests runner escalates on `package.json`

`run_repo_impacted_tests.py --mode fast` sees `package.json` in the changed
set and falls back to `github_ci_validate.py` (ephemeral GitHub-hosted PR).
Budget for a full-CI round whenever the batch touches `package.json`, and
verify the ephemeral PR's file list matches the intended batch
(`api.github.com/repos/<org>/<repo>/pulls/<n>/files`).

## L6 — A duplicate object key silently unwires the test that owns it

An object-literal test fixture with `graphqlQueryForInstallation:` present
twice (last one wins) made the new aggregator test's assertions vacuous —
the mock never wired, and `tsc` only flagged it as TS1117 after the suite
looked superficially green. New fixture blocks deserve a read-through of the
whole literal, not just the appended lines.

## Next-cycle candidates (pre-review, from this cycle's evidence)

- rm-252/253/254 as the next anchor: gateway contract 1.6.0 → 1.8.0 forward
  support, with the rm-253 wire-or-fold decision first; the 14-commit upstream
  absorb (agent v0.117.0, pnpm 11.28.0, hono 4.13.10, vite 8.3.1) as riders.
- rm-106's blocked-external premise is partially false (run-event push exists
  at the pinned agent v0.115.1) — re-score before planning around it.
- Node 26 LTS promotion lands 2026-10-28 (rm-139's signal).
- rm-133's dev-dep majors re-evaluation is dated in `dependabot.yml`.
