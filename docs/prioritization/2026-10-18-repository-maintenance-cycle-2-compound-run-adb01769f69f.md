# Dashboard repository-maintenance cycle 2 compound record (2026-10-18, run adb01769f69f43cb98e6fcf032f7af77)

module: dashboard
tags: `[repository-maintenance, compound, pin-parity, lint-root-cause, absorb-window]`
problem_type: compound-cycle-record

campaign: repository-maintenance ccf5235e4932449f9864dc2f937bd209 cycle: 2
status: cycle_compounded_pre_review (pre-review cycle evidence only)
base: 5ab50da0 (run base == origin/main at dispatch)
attempts: compound eeaa2597c6374fd78d1026cbf2de1aaf (this doc; provider-reaped
mid-turn before its result envelope was written) — adopted and verified by
fold-retry a0289ac8905b470e8e0bddd8772c7dd0

Scope: pre-review cycle evidence only (assess/research/roadmap/prioritize/
stewardship/implement/targeted_tests/full_tests). Review and shipping outcomes
are the next cycle's assessment inputs. No test execution at compound.

## Phase chain

assess 013bf205 (fresh adversarial review, tree pristine at 5ab50da0; 3 P3s,
one feared coverage regression disproven) -> research 59d696d0 (upstream tip
a3286b16 unchanged; agent v0.123.0 internals; registry/Actions truth) ->
roadmap a5027e9e (minted rm-1983 + 6 riders) -> prioritize a567eca1
(selected the operator-currency batch) -> stewardship 363770c3 (10 surfaces,
6 separation pairs) -> implement 56941aa1/b911eb65 (9-file pin batch;
first attempt rejected for a missing attestation only) -> targeted_tests
b818999e (engine fallback battery green, PR #995; lint root-caused) ->
full_tests ab301241 (verbatim full battery green, PR #1001) -> compound
(this doc).

## Batch composition

Selected: rm-1983 operator-currency clauses #652/#654/#647 + rm-191's
behind-major delta. Final 9-file delta at base 5ab50da0 (uncommitted,
awaiting review/landing): fro-bot.yaml (:292 checkout -> 3d3c42e # v7.0.1,
:313 agent -> 1529cc2e # v0.123.0), codeql.yaml:27 (checkout -> 3d3c42e),
release.yaml:194 (setup-qemu -> 9901266 # v4.4.0), main.yaml:82
(impeccable@3.2.1 -> 3.6.1), package.json (:49/:50 react family -> 19.3.1;
@types stay 19.3.0 — upstream #647 kept them, 19.3.1 unpublished),
pnpm-lock.yaml (react-family only, 16+/16-), AGENTS.md:105 (clonedeps tag
text -> v0.123.0), .slim/clonedeps.json (gateway ref v0.78.0 -> v0.123.0),
ROADMAP.md (mint + riders + truth-cure riding the batch).

## Validation journey

Two independent authoritative cloud batteries, both all-green 9/9 buckets
(Lint, Design Check with impeccable@3.6.1 live, Test, Check Types,
Check Workflows, visual, Dependency Review, Test Scripts Load; Fro Bot
skipping): targeted_tests fallback ephemeral PR #995 (head e4204f05,
validation base c3137d50) and full_tests ephemeral PR #1001 (head abd3829f,
validation base 9be23348). origin/main advanced twice intra-run; the newer
base also green retires base-drift risk for this delta. Local focused battery
earlier: actionlint clean, check-types rc0, scoped eslint rc0, build:web +
175/175 (static-assets + roadmap guards). Both ephemeral PRs self-closed by
the validator; no conductor/ci-* refs left behind by this run.

## Learnings banked this cycle

1. Local-only lint red root cause (the cycle's main detective arc): repo-wide
   `pnpm lint` dies walking the untracked `.slim` clonedeps mirror — root
   ignores lack `.slim/**` and flat-config eslint applies the mirror's OWN
   config (its `eslint.config.ts:52` vitest rule, plugin unresolvable in the
   shallow clone). Two traps closed: the stash test false positive (stash
   keeps untracked state) and the fold-retry overcorrection (grepping the
   root config is not re-running lint). Prevention doc:
   `docs/solutions/workflow-issues/eslint-flat-config-walks-clonedeps-mirror-lint-red-2026-10-18.md`;
   cure minted as rm-1984. Rule of thumb: single-file `--print-config` rc0
   + CI green + repo-walk red = suspect an untracked tree the walk reaches.
2. Validation-scope mechanics reconfirmed: package.json counts as a shared
   build/test config, so the impacted-tests runner cannot-derive and falls
   back to the authoritative full battery (memory #19282 pattern, now seen
   from the delegate side).
3. Pin-batch hygiene that paid off: resolve every SHA before implement
   (v0.123.0=1529cc2e, checkout v7.0.1=3d3c42e = the SHA already at 17
   sites, setup-qemu v4.4.0=9901266); keep the lockfile diff provably atomic
   (16+/16- react-only, peer-suffix lines verified by content); mirror
   upstream's exact dependency shape (upstream #647 kept @types at 19.3.0 —
   mirroring the bump set, not "current latest", avoided a phantom surface).
4. Mint discipline held under fog: rm-1983 minted above the contested
   sibling frontier after verifying BOTH walls (worktree base and live
   main); all 8 riders landed on verified owner defs, no duplicate mints.

## Handoff to the next cycle

- Landing this batch: 9-file delta + riding ROADMAP riders; re-derive the
  validation digest at the gate; main has kept advancing (9be23348 at
  full_tests) — rebase-check the workflow hunks before merge.
- Top open candidates: rm-1984 (.slim eslint ignore cure, minted this
  phase, tiny); rm-1983 remainder — #646 markdown absorb as a DEDICATED
  cycle (33-file port, html:false inert posture, public/ twins, visual
  baselines) and #650 gated on rm-875; rm-886 Trivy digest re-derive
  (environment-gated); rm-602 Vary/symlink residuals; rm-1463 janitor
  stdout split; status hygiene on rm-864/rm-888.
- Standing context: Node 26 gate 2026-10-28 (rm-139); upstream window
  2026.10.43..a3286b16 partition per rm-252 riders; agent v0.123.0 contract
  1.11.0 verified at tag (exact-match pin safe through the bump).
