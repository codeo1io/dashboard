# Dashboard maintenance — repository-maintenance cycle 2 compound record (2026-10-17, run 55e94f9e66534b798219ad9214f1e541)

module: dashboard
tags: `[repository-maintenance, compound, validation, ci, supply-chain]`
problem_type: compound-cycle-record

Campaign `repository-maintenance:ccb08043b8014196a5cac2740f480934:cycle:2`,
compound attempt `fb37f8bb5f224775b18b61c85e4af3a3`, base `3e3664c` (==
dispatch base; origin/main has since advanced to `f521ec783cab` — the ROADMAP
layer below is composed ON TOP of that landed render, so it is merge-neutral
against it). Status at composition: PRE-REVIEW — review and shipping happen
after compound; the next cycle's assessment carries them forward. Scope
discipline: NO test execution at compound; the recorded targeted/full outcomes
are consumed as evidence (census-equivalent python replication + authorial
greps only).

## Cycle outcome

Batch "supply-chain truth + absorb-safety invariant guards" — 3 units, 9 files
at implement (7 M + 2 NEW), grown to 13 surfaces by the full_tests adopted
cures:

- U1 LEAD `rm-1461`: Dockerfile:16 `ARG NODE_IMAGE` digest re-pin
  `173f1258…` → `sha256:7f486cabe892…bec315`, re-derived LIVE from Docker Hub
  at implement (token flow, registry-1 manifest HEAD), byte-equal to upstream
  #620's pin; one line, consumed by FROM :18/:38/:56; no repo test/doc couples
  the old digest. The empirical code-scanning-delta acceptance arm is owed
  post-landing (next cycle).
- U2 `rm-1462`: `test/public-dts-runtime-parity.test.ts` (NEW, 6/6) — drift
  guard over the three no-build `public/*.d.ts ↔ .js` twins
  (operator-launch 15 / operator-run-index 16 / operator-stream 116 exports),
  fail-closed both directions + runtime resolution + cross-module
  PINNED_CONTRACT_VERSION bind to `src/gateway/operator-contract/version.ts`.
- U3 `rm-1463`: run-status allowlist single-sourcing — canonical
  `STREAM_RUN_STATUSES` (8) + `STREAM_ONLY_RUN_STATUSES` (trio) in
  `src/gateway/operator-contract/run-status.ts`, type + summary list DERIVED;
  `run-summary.ts` derives (re-export keeps index.ts untouched);
  `operator-stream.js` exports `VALID_STATUSES` (+ .d.ts declaration), web
  runtime hand-list deleted in favor of a value-import;
  `test/run-status-allowlist-parity.test.ts` (NEW, 7/7) with a comment-stripped
  NO-INLINE rule; red-drift proven live (single-site mutation → 2 failed →
  revert → 7/7).
- No-code rider: the rm-249 WIRE-vs-RETIRE forced-choice decision —
  recorded RETIRE-BIAS, execution deferred (now a dated rider on rm-249).
- full_tests adopted layer (from the dead-but-productive predecessor
  attempt): ROADMAP.md lint cure (+50/-50, whitespace-only, `-w` = 3/3),
  `@playwright/test` caret-float kill via exact-pin 1.63.0 (package.json +
  lockfile), operator-dark baseline regen inside the workflow's own pinned
  image (`e397a053`/316204B, byte-arbitrated against the CI's own actual
  render, determinism proven by a byte-identical second regen).

## Validation ledger (pre-review, consumed here)

| phase | attempt | outcome | salient evidence |
|---|---|---|---|
| targeted_tests | `a780b2e9` | green, narrow-scope proven | seeded `run_repo_impacted_tests.py --mode fast` → "impacted-tests: node targeted=6" (fallback never armed); verbatim pass 1435/1435 incl. both new guards; eslint on the 9 changed/new files 0 errors 0 warnings; digest `validation:v1:122d39e9…23eba1` == dispatch-time digest verbatim |
| full_tests | `5c2661de` | PASSED, scope full | `github_ci_validate.py` (release 279feac3) run VERBATIM → `ok:true`, ephemeral PR #795 (head `de5ba5ed`, validation_base `2856a1d3`), ALL 11 checks green — Analyze (CodeQL) 1m12s, Check Types, Check Workflows, CodeQL, Dependency Review, Design Check, Lint, Test 1m40s, Test Scripts Load, visual 1m19s, Fro Bot skipping; PR closed + both `conductor/ci-*` refs auto-deleted (ls-remote 0); digest chain `a4b9ec82…` (dispatch, adoption-proof of the predecessor's tree) → `validation:v1:0194984a9458772cfd29a61f263f8a79741a54b861c56b65270048d7fb98dfc0` (post-PNG-regen, DECLARED emission — tests/visual PNGs classify executable) |

Prior-attempt forensics this cycle (three provider kills, three different
verdicts): `fed59cf8` (full_tests, 18:02→21:45Z) died mid-turn AFTER leaving
real, correct work — adopted with proof (dispatch digest reproduced verbatim
over its tree; its lone CI failure root-caused to the stale operator-dark
baseline, not its cures); `07c3695c` (targeted_tests) reaped 24s after turn
start, zero work — phase redone from scratch; `e194d1b2` (compound) reaped
~1min after turn start, zero output, no scratch — this attempt redid the
phase from scratch.

## Compound layer contents

- ROADMAP.md (in-delta): wall base = origin/main `f521ec783cab` (249 defs /
  0 dups / max rm-1452 per the 4dc4697d graft); this layer adds 27 lines,
  0 deletions (merge-neutral against main):
  - THREE def rows reconstituted and flipped
    `implemented … validated pre-review … pending landing` — rm-1461
    (priority 46.0, the minted value), rm-1462 / rm-1463 (priorities 44.0 /
    42.0 re-derived at reconstitution). RECONSTITUTION PROVENANCE: the
    roadmap phase's mint patch + wall preview (verified apply-clean vs
    origin/main:06095e9 at mint time, attempt 162a7c3e) were swept from the
    delegate spool before compound; def rows rebuilt from the phase records.
  - THREE dated riders: rm-249 (the decision record), rm-252 (window
    re-census 25 commits #615..#641 at tip 3b2f774 + digest-axis
    convergence), rm-142 (1.63.0-era cure recorded as SUPERSEDED for
    landing by main's 43af4cf 1.64.0 triple).
  - `cycle:2 compound tail` comment owning census 252 / 0 / max rm-1463
    (next free on this lineage rm-1464; all-lineage unlanded frontier
    higher — sibling spool bands rm-1453..1457, rm-1458..1460,
    rm-1464..1467, rm-1472..1477, rm-873..883 — integrate re-derives from
    the UNIONED tree).
- NEW solutions entry:
  `docs/solutions/best-practices/image-anchored-cve-census-digest-repin-protocol-2026-10-17.md`.
- this record.

## Lessons & prevention rules (durable)

1. **All-path-less alert census ⇒ the fix axis is the base-image digest, not
   npm.** Triage shape first (path-less = image-anchored); acceptance for a
   digest bump is an EMPIRAL post-landing census delta with a
   Debian-tracker-derived residue expectation (no-dsa families may persist
   at the freshest pin — that is not a failed re-pin). Full protocol in the
   solutions entry above; complements
   `docs/solutions/best-practices/trivy-base-image-alerts-unfixable-by-design-2026-08-30.md`.
2. **Dead-attempt adoption requires byte/digest proof, not trail presence.**
   fed59cf8's tree was adopted only after `validation_digest` reproduced the
   dispatch value verbatim AND its regen'd PNG was byte-arbitrated against
   the CI's own actual render; the two zero-trail reaps got clean redos.
3. **The visual lane moves as a triple** (npm pin + workflow image + all
   baselines). A pin-only cure un-kills the lane and exposes baseline
   staleness (966px-stale vs 3178px-actual). Main now owns the class with
   `test/visual-playwright-image-lockstep.test.ts`; folds adopt main's
   current pairing, never re-land older pins.
4. **Ephemeral-PR validation runs MAIN's current workflow files** — a
   candidate's npm pins must match main's live CI image lane at validation
   time, and validation-era pin truth can be superseded by main before fold
   (this run: 1.63.0 validated 2026-10-16, superseded 2026-10-17 by the
   1.64.0 lockstep repair).
5. **No-build `public/` twins: parity guard beats single-sourcing.**
   Single-sourcing public/ is deliberately rejected (no-build standalone);
   the invariant carrier is a fail-closed parity guard + a comment-stripped
   NO-INLINE rule over the derived consumers.
6. **Swept-spool contingency:** phase artifacts can be swept before a later
   phase consumes them; compound then reconstitutes from the phase records
   and DISCLOSES provenance + any re-derived values (this cycle's def-row
   reconstitution is the precedent).

## Findings (recorded)

- HIGH (standing, updated at review-fix 662fad96 2026-10-17): 49 open code-scanning alerts at the
  2026-10-16 census, all image-anchored. SUPERSEDED: main advanced to `55086dd` (sibling run
  8fd22b8b landing) and NOW carries the digest cure `7f486cab…` + rm-743 HEALTHCHECK — this
  batch is no longer the unique carrier of the Dockerfile cure (worktree Dockerfile now mirrors
  main byte-exact; the batch's unique carriers are the guard tests + vocabulary single-sourcing).
  Main has also landed run-status changes (summary vocabulary 7 incl. waiting_* at contract
  1.11.0) — this review-fix re-derived the single-sourcing onto main's 7/1 semantics.
- MEDIUM: branch protection still a shell at assess (checks=[], strict=false,
  enforce_admins=false, reviews=null) — rm-116 open; re-probe live check
  conclusions at next cycle (the estate moved; Lockfile Guard / Fro Bot
  lanes may now exist).
- INFO: the Actions run-creation outage that bracketed the assess window
  (last main.yaml run 2026-10-09T01:59:31Z at assess) ENDED inside this
  run's window — PR #795's 11 green checks are first-hand recovery evidence
  for this lane.
- INFO: stale open draft PRs #775/#776 (18:23/18:25Z) are the push-surface
  sibling batch's lineage, NOT this run's — left untouched; dead-attempt
  `timeout 300` SIGTERM skips cleanup `finally` (orphan-PR mechanism), the
  nohup+poll launcher pattern lets cleanup run.
- INFO: lint wall at base 3e3664c was 50 ROADMAP-only errors (47 trailing-ws
  + 3 label-refs); cured content-free mid-run; the wall-swap composition
  supersedes that delta (main's wall is clean).

## Next-cycle entry points (ordered)

1. rm-1461 empirical delta arm: post-landing CodeQL re-census vs the
   49-open/2026-10-16 rule-family baseline; pre/post census in the landing
   note; no-dsa residue expectation per the Debian-tracker legs.
2. rm-249 execution: WIRE or RETIRE per the recorded RETIRE-bias; either
   typed outcome kills the dead-code/false-provenance surface (fork sw.ts
   65-line kill-switch vs upstream 256-line; web/src/push +1431/-711).
3. rm-252 window: 25 commits #615..#641 unabsorbed; 1.11.0 absorb still
   dependency-blocked on the gateway-side estate verdict (deployed gateway
   v0.119.2 speaks contract 1.9.0); re-measure with explicit refnames.
4. rm-116 fill: protection shell at assess; re-probe live required checks
   first (estate advanced past this base).
5. Landing verification for this batch: status flips at the land event;
   post-merge `git ls-files .conductor` must end empty.
6. Research RC families not selected this cycle (npm currency, contract
   catch-up) re-rank at the next assessment.

## Fold map (integrate musts)

- **ROADMAP.md**: review-fix 662fad96 union-rebuilt the wall onto main `55086dd`
  (253 defs, max rm-1456) + this lineage's layer (3 def rows, rm-1461 re-pointed
  superseded-digest; 3 lineage riders; tail note) — census 256 defs / 0 dups /
  monotonic except main's own pre-existing rm-603(12.0)→rm-1453(34.0) inversion
  (not this lineage's delta). If further sibling bands land first, union by
  content and re-derive census from the UNIONED tree (house rule).
- **playwright pin — DO NOT land 1.63.0**: ADOPTED at review-fix — package.json +
  pnpm-lock + operator-dark PNG are now byte-exact to main `55086dd` (1.64.0 exact,
  image `v1.64.0-noble@06a9939e`, PNG `a6211623`/341452B).
- **operator-dark PNG**: now main's `a6211623`/341452B (byte-exact adoption); the
  e397a053/316204B note above was validation-era truth superseded at review-fix;
  listener/privacy baselines untouched.
- **Digest**: declared emission
  `validation:v1:0194984a9458772cfd29a61f263f8a79741a54b861c56b65270048d7fb98dfc0`;
  compound delta is markdown-only → digest re-derived byte-identical at
  composition (ROADMAP tail comment).
- **Dockerfile**: main still at `173f1258…` → this batch is the unique
  carrier; no sibling collision on any batch surface (verified at
  `f521ec783cab`).
- **Untracked new files do NOT ride candidate-delta merges** —
  `git add -N` at prepare for `test/public-dts-runtime-parity.test.ts`,
  `test/run-status-allowlist-parity.test.ts`, and the two new docs.
- Draft PRs #775/#776 are NOT this lineage — leave for their owner run.

Cycle record closes here; review and shipping outcomes belong to the next
stage, and the next cycle's assessment carries them forward.
