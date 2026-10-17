---
title: Managed ROADMAP.md render made clean-main lint-red and destroyed ledger truth — guard the rendered file, cure the renderer out-of-repo
date: 2026-10-15
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: high
applies_when:
  - pnpm lint is RED on a porcelain-clean main and every error is in ROADMAP.md
  - ROADMAP def-lines all read `track: reliability` or narrative refs point at ids with no def-line
  - An external fleet render (hermes-autonomy roadmap-sync) has pushed or PR'd ROADMAP.md
symptoms:
  - '47x @stylistic/no-trailing-spaces + 1x markdown/no-missing-label-refs, all in ROADMAP.md'
  - Def-line track taxonomy collapsed to a single value (9 values pre-render)
  - Narrative rm-NNN references with no def-line and no Closed-items entry
---

## Problem

The autonomously maintained `ROADMAP.md` is rendered by an **external** tool
(`hermes-autonomy` roadmap-sync → `hermes-roadmap` `render_markdown`), not by
anything in this repository. Between 5bf15e1 (clean: zero trailing-whitespace
lines, 9 distinct `track:` values) and 5d5f9be (both regressions present; the
lineage starts at the first uniform-track render 3d07cf9, 2026-10-06), the
render introduced, in one sweep:

1. **47 trailing-whitespace lines** — mostly empty def fields the emitter
   renders as `- acceptance: ` with a trailing space (`@stylistic/no-trailing-spaces`).
2. **One label-ref parse break** — an acceptance line carrying a bracketed
   path list (`[ ... ]`) is parsed by the markdown plugin as a *label
   reference* that never resolves (`markdown/no-missing-label-refs`, at the
   rm-022 def).
3. **Track-taxonomy collapse** — the renderer's Track enum has two members;
   every def-line was re-emitted `track: reliability` (235/235), erasing the
   ledger's 9-value taxonomy (reliability/security/operator-experience/docs/
   architecture/performance/product/capability/compliance).
4. **Def-line pruning with surviving narrative refs** — refs remained pointing
   at ids whose def-lines the render pruned (naive census: 258 refs vs 235
   defs = 23 dangling).

`main.yaml` runs `pnpm lint` on every push, so **clean main was CI-RED** —
silent only because GitHub Actions run-creation had been dark on this repo
since 2026-10-09T01:59:31Z (a separate standing incident; see the Actions
darkness lane). Nothing in-repo gated the rendered artifact.

## Root cause

The renderer is out-of-repo for this fork: its lint posture, Track enum, and
emit shape are not controlled by any gate here. Trusting an external emitter's
output to be lint-clean and ledger-faithful, without a repo-side guard, let
the regression ride to main unchallenged.

## Solution

Two layers, deliberately split:

1. **Repo-side guard (the durable fix for detection):**
   `test/roadmap-render-guard.test.ts` — four legs: no trailing whitespace;
   a *sound* dangling-ref census (every narrative `rm-NNN` must resolve to a
   def-line id or a `Closed items` one-liner; HTML comments and
   fog-marked refs exempt — a document-wide naive scan false-positives on
   prose cross-references); a minimum-distinct-tracks floor (5, pinned below
   the restored 9 so natural churn doesn't false-alarm); and an eslint
   `ROADMAP.md` clean leg. The next behavior-identical render that regresses
   any leg breaks the gate instead of shipping silently.
2. **Repo-side repair (landed 2026-10-15, run 85d97dc86126, rm-1454):** the
   47 trailing-space lines stripped; the bracketed list backtick-wrapped; the
   three live dangling refs reworded to name outcomes (fog rm-553, fog
   rm-678) or had their never-minted label dropped (rm-13640 in the rm-486
   title); the track taxonomy re-derived for every def from def content
   (9 values restored).

**Honesty boundary:** repo-side repair does *not* provably survive a
behavior-identical re-render — the emitter will happily re-introduce all four
regressions on its next pass. That is exactly the property the guard converts
from silent drift into a gate-visible failure. The **renderer-side cure**
(fix the emit: no trailing space on empty fields, backtick bracketed lists,
rich Track enum, prune refs with their defs) belongs to the out-of-repo
`hermes-roadmap` project and is pursued as a cross-repo stewardship request —
it can never be landed from this repository.

## Verification (2026-10-15 batch, base 5d5f9be)

- `grep -cE ' +$' ROADMAP.md` → 47 at 5d5f9be, 0 after the repair;
  `git show 5bf15e1:ROADMAP.md | grep -cE ' +$'` → 0 (pre-render clean).
- `node_modules/.bin/eslint ROADMAP.md` → 48 errors at base, 0 after.
- `npm exec -- vitest run test/roadmap-render-guard.test.ts` → 4/4 green;
  `test/roadmap-length-guard.test.ts` stays green (no line exceeds the
  4000-char bound).
- Ledger census: 235 → 238 defs (mints rm-1454/rm-1455/rm-1456), 0 duplicate ids,
  Closed-items section byte-identical, track census 9 values.
- Renumber at landing (2026-10-17, integrate case 794ca090): the batch minted
  `rm-1447/rm-1448/rm-1449`, which origin/main had since occupied with a
  foreign same-day band (run ccde661ea990) — first-landed-wins renumbered this
  band to `rm-1454/rm-1455/rm-1456` (next-free re-derived from origin/main's
  `rm-1453` wall); all code/test/doc references moved with it. See
  `same-day-mint-collision-first-landed-wins-2026-10-16.md`.

## References

- rm-1454 (def + implement rider in ROADMAP.md, extension #44 band).
- Assess evidence: run 85d97dc8 attempt 448c33b8 (lint.log, test.log,
  check-types.log in the delegate scratch spool).
- Sibling lanes: rm-284 (label-ref clause owner), rm-279 (lint-job
  decomposition), the Actions-darkness watchdog lane.
