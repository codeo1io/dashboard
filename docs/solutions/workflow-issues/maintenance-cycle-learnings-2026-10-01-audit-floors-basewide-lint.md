---
module: 'dashboard'
tags: ['maintenance-cycle', 'pnpm-audit', 'override-floors', 'lint-preflight', 'roadmap-ledger']
problem_type: 'process'
---

# Maintenance-cycle learnings — dependency-security cure, audit gate, comment truth (cycle 2, run 23d39aa7467e)

Lessons from the 2026-09-30 / 2026-10-01 repository-maintenance cycle, recorded
pre-review from cycle evidence only (batch: rm-276 transitive override-floor
cure + rm-278 scheduled audit signal + rm-281 main.yaml comment truth; ephemeral
CI green on PR #313 targeted and PR #325 full, both engine-closed). Companion to
`maintenance-cycle-learnings-2026-09-29-bounded-poll.md` (cycle 19) and the batch
record `docs/prioritization/2026-09-30-cycle-2-batch-run-23d39aa7467e.md`.

> Integrate note (2026-10-03, conflict case 9abfab343ad54dd9a1a5aa286954a308):
> the batch landed at the run's integrate onto a main that had meanwhile minted
> its own `rm-279`..`rm-282` (cycle-1 runs a923284c/7ce48fe5 — Lint-job
> decomposition, GraphQL canary, CodeQL suppression, floors). The four
> id-colliding items renumbered above the all-lineage ceiling rm-483: SSE
> `rm-279`→`rm-484`, launchRun `rm-280`→`rm-485`, comment-truth `rm-281`→`rm-486`,
> badge `rm-282`→`rm-487` (so `rm-281` below means today's rm-486, `rm-280`
> today's rm-485). `rm-276`/`rm-277`/`rm-278` minted collision-free and keep
> their ids. The floors landed as a union with main's `rm-285` (identical
> brace-expansion/fast-uri floors, undici at the documented 7.x tip `>=7.30.0`);
> `rm-277`'s pair is that same rm-285 landing, and the `hono@4.13.9`
> `minimumReleaseAgeExclude` entry retired at the integrate.

## L1 — an override floor never re-resolves a satisfying lockfile; cure floor + lockfile atomically

Both halves of the failure were visible at once:

- Fork side (proven live): Dependabot security updates read ENABLED all day
  2026-09-30 and fast-uri alerts #29/#30 (both high) stayed open anyway — the
  `'>=3.1.5'` override floor was already satisfied by the locked 3.1.6, and an
  override floor does not force re-resolution off an already-satisfying
  version. No toggle cures a stale floor.
- Upstream side: fro-bot/dashboard PR #538 is the mirror error — a lockfile-only
  bump to fast-uri 3.1.8 that leaves the stale floor free to walk back down at
  the next re-resolve. Superseded for this fork, not absorbed.

Cure shape (rm-276, `pnpm-workspace.yaml` + `pnpm-lock.yaml` in ONE change):
raise each floor to its patched line with the GHSA rationale in a comment
(house toml-override style), re-resolve, and scope-check the lockfile diff by
package name — only the four subtrees plus the overrides mirror may move.
Acceptance oracle: `pnpm audit --recursive` returning zero. It reads the
lockfile and needs NO dependency install, which is exactly what makes rm-278's
weekly gate cheap enough to be install-free.

Two calibration rules the cycle surfaced:

- When two floors give an equal audit result, pick the published tip: undici
  `'>=7.30.0'` beats the ledger's bare `'>=7.29.1'` — 7.29.1 is in no indexed
  advisory's vulnerable range (corrected 2026-10-01 at review-fix; the
  original 'still carries 7 GHSA records' claim was false) and the npm
  backports (7.30.1/7.31.1) are unpublished.
- Verify advisory ids before citing them. This cycle wrote a PHANTOM id
  ('GHSA-3jxr, undici, fixed only at 8.0.0') into the floors comments, the
  audit workflow's designed-red note, the ledger record, the batch doc, and
  this doc — it exists in no advisory source (GH DB: 46 undici records, none
  first-patched at 8.0.0 and none containing 7.29.1/7.30.0; caught at
  independent review 2026-10-01). The sound rules underneath survive: treat
  `pnpm audit` as the gate and OSV only as a drift guard, and treat a red on
  any undici 7.x as a newly indexed advisory — the trigger for the undici 8 +
  jsdom 30 migration (rm-271's window), not a regression.

## L2 — the ephemeral-PR Lint job lints the whole repo: base-carried doc debt fails a batch that never touched it

The validation PR's Lint job runs repo-wide eslint at the head snapshot, so
pre-existing lint debt in files the batch never touched fails validation
anyway. This cycle's scoped preflight caught 12 errors in two BASE files before
any PR was fired: 11x `@stylistic/no-trailing-spaces` in
`docs/archive/pr-233-unlanded-cycle-18-2026-09-30.md` (space-only lines) and
1x `markdown/no-missing-label-refs` on the bare bracket group of the frontmatter
`tags:` line in `docs/prioritization/2026-09-29-cycle-19-batch.md`. Both were
fixed in-lineage (trailing whitespace stripped; the bracket group wrapped as a
code span) and both ephemeral PRs then went 9/9 green with the fixes riding the
batch.

The debt is not hypothetical: hours later main's own push-run Lint job (run
36797181082, 00:38Z push) failed on exactly these trailing-space lines — the
fixes ride this lineage while main stays red until one lands.

Corollary (added 2026-10-01 at review-fix): stripping trailing whitespace
INSIDE a sha256-pinned fenced block silently breaks the doc's own byte-exact
verification recipe — all 11 stripped lines fell inside the archive doc's
archive-C block, so the recipe printed the normalized hash against the
original pin. The cure, applied in-doc the same day: a dated Provenance
addendum re-pins archive-C to the normalized hash, keeps the original pin
labeled pre-normalization, and records recovery paths (base-commit git blob,
the still-live PR #233 refs, and the rstrip-reversible delta itself). Never
run a whitespace normalizer across sha-pinned fences; if one runs anyway,
re-pin the same day with the prior pin preserved.

Prevention: before firing any ephemeral validator, run the scoped eslint over
the changed set PLUS known-debt surfaces, not just the delta. The added-lines
gate is `git diff -U0 FILE | grep '^+' | grep -v '^+++' | pnpm exec eslint
--stdin --stdin-filename FILE`; count added lines with that same set, because
`grep -cE '^\+[^+]'` silently drops blank added lines. Strip trailing
whitespace with `sed -E` or python `rstrip` — a plain BRE `sed` pattern with
`+` silently never matches.

## L3 — cold `eslint ROADMAP.md` is super-linear in line length: keep ledger lines wrapped

Precedent (2026-09-29): a markdown paragraph-length cliff ran a single file's
lint past 35 minutes — see `ci-validator-poll-window-vs-cold-lint-2026-09-29.md`
and the now-truthful rm-13640 rider comment in `.github/workflows/main.yaml`.
This cycle measured the same cliff on the ledger itself: at base 31995a2,
ROADMAP.md still carried two inherited monolith lines (7317 and 7967 chars,
minted by earlier lineages), and cold `eslint ROADMAP.md` was killed at 900s
while `--print-config ROADMAP.md` shows NO max-line-length rule — the cost is
the markdown linter's per-line super-linearity, not a rule violation. Warm
`--cache` runs hide the cliff entirely.

Cure (this cycle's targeted phase): wrap the long ledger lines —
content-neutral, proven by re-joining the wrapped chunks and comparing to the
pre-split bytes (5/5 glue ops, byte-exact roundtrip). Post-wrap cold lint:
rc=0 in 11.8s with the file's next-longest lines (4903-5222 chars) passing
normally. Prevention: mint roadmap item lines already wrapped (this cycle's own
roadmap delta maxed out near 2900 chars per line — under the measured cliff but
worth capping), and measure lint COLD, not from cache, whenever the ledger grows
a multi-thousand-character line.

## L4 — comments that assert gate numerals are a truth surface of their own (rm-486)

The rm-13640 rider comment claimed "20 min self-kills" and "the Test job's 40 is
the precedent" while the YAML said 35 (Lint) and 20 (every other job, Test
included). The fix was comment-ONLY — the 35 ceiling is load-bearing in both
directions (above the worst legitimate cold eslint, below the CI validator's
~36-minute poll window), so a truth pass must not move values. Rule: any comment
citing a numeric gate value is part of the contract; re-verify it against the
YAML on every touch, and when editing workflow comments sweep all of
`.github/workflows/` for minute-citing comments (this cycle's compound sweep
found only main.yaml:34/:37/:38, all truthful after the fix). Same class as the
runner-claim comment rot covered by
`runner-migration-comment-rot-sweep-2026-09-23.md`.

## L5 — phase artifacts and the ledger drift ids; the ledger owns ids

The prioritize artifact numbered comment-truth `rm-280` and the badge item
`rm-281` while the minted ledger maps comment-truth to `rm-281` and the badge
to `rm-282` (a one-shift drift, reconciled by content in the batch doc; the
ledger is authoritative and every later phase quoted ledger ids). Extends
cycle-19's lesson of citing ledger ids instead of line numbers: when a phase
artifact predates the mint, reconcile by content, not by number. (Post-integrate
the mapping shifted once more — comment-truth is `rm-486`, the badge `rm-487` —
recorded in the integrate note at the top of this doc.)

## L6 — infra-killed attempts: probe the durable trail, then adopt or redo

This cycle's nine phases burned 25 delegate attempts and 16 died before
emitting a typed result (run event-log census: assess 4, compound 5, full 2,
one each in research/roadmap/stewardship/implement/targeted; recorded causes
where known are provider-429 envelope failures, and the rest share the same
reaped-before-result signature — no typed artifact, no scratch directory).
Every re-fire was probed BEFORE re-execution: a spool-wide find for the prior
attempt's typed artifact and scratch directory, a worktree mtime census
against the phase's expected end-state, and for validator phases the
PR-creation window around the death time. Fifteen of the sixteen had landed
nothing, so full re-execution was correct — the sixteenth is this lesson's
other half: the last compound attempt wrote all three of this cycle's compound
artifacts (ledger status lines and riders, this learnings doc, the batch-doc
addendum) and died four minutes later, before emitting its PhaseResult. The
re-fire attributed the writes by mtime, verified every claim against the
cycle's recorded evidence and the tree, corrected the attempt census this
paragraph originally undercounted, and ADOPTED the work instead of redoing it.
A present artifact is not proof of validity — verify identity and tree state
against the work order before adopting; an absent one is not proof the work
never happened. The 429 envelope's timestamp can be skewed ~8h from the host
clock; treat the host filesystem as ground.

## Validation outcomes consumed (recorded, not re-run)

- Targeted: `run_repo_impacted_tests.py` escalated to the ephemeral validator;
  PR #313, 9/9 checks SUCCESS; the PR file list matched the worktree's 9-path
  delta exactly.
- Full: `github_ci_validate.py` ephemeral PR #325 (commit 259b413f), ok:true,
  9/9 checks SUCCESS; both ephemeral refs deleted by the engine; validation
  digest
  `validation:v1:e709361d883ece1f2cf65d9a71b52955f9b7f355601a4c425915cc8f1fbf328a`
  matched the dispatch at pre-fire and post-verdict.
- `pnpm audit --recursive` == 0 (2026-09-30T20:26Z; baselines 19 advisories at
  18:10Z/19:16Z); frozen-lockfile install clean; repo-wide cacheless eslint
  rc=0 (1m45s) at the settled tree; actionlint (container form) clean.

## Next-cycle candidates (pre-review, from this cycle's evidence)

- rm-484 (SSE `data:` last-wins vs the spec's newline concatenation, priority
  36.0) is the natural next anchor: byte-identical deviation in BOTH parsers,
  rides rm-252's both-parsers discipline; coordinate rm-253's wire-or-fold
  decision first.
- rm-485 (launchRun CSRF-400 refresh-and-retry parity, 32.0) and rm-487 (Inbox
  badge re-arm after cross-tab re-login, 28.0 — decision-shaped:
  re-probe-on-focus vs remount-only with the comment corrected).
- rm-277 remainder: the in-range hono 4.13.12 / @hono/node-server 2.1.3 refresh
  with package.json ranges unchanged, retiring the stale hono@4.13.9
  minimumReleaseAgeExclude entry (rides rm-271's refresh window).
- rm-252 absorb window re-measure (upstream tip f4a1aeb at cycle end; PR #538
  superseded for this fork); rm-271 majors (undici 8 + jsdom 30) sequenced
  after the floor cure by the ledger's own cap-relaxation note.
- Carried to review/landing: Dependabot alerts #29/#30 close only after GitHub
  re-indexes the landed lockfile; audit.yaml's first scheduled fire is Monday
  2026-10-05T03:37Z (a workflow_dispatch run can verify green earlier); the two
  base-doc lint fixes ride this lineage while main's Lint was red on them at
  the 00:38Z push — the next assess should re-check main's Lint state.
