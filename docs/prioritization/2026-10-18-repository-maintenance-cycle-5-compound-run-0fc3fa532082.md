---
module: roadmap
tags: ['repository-maintenance', 'cycle-5', 'compound', 'absorb-window']
problem_type: workflow-issue
owner: dashboard
run_id: 0fc3fa5320824010b8ae251a7ffdc1d3
---

# Cycle-5 compound record — run 0fc3fa5320824010b8ae251a7ffdc1d3

Repository-maintenance `9b6b6fc9770a412fa388e6dbed9b8388:cycle:5` at base
f521ec783cab (worktree HEAD; origin/main 55086dd at dispatch, advanced to
64cd2f6a MID-RUN via an adoption batch — see the implement row). This record
compounds the cycle's pre-review evidence into durable context for the next
cycle; review/shipping outcomes are out of scope here by design, and no test
was executed at the compound layer.

## Phase ledger

| phase | attempt | durable outcome |
| --- | --- | --- |
| assess | 68361944 | adversarial whole-repo pass at f521ec7 cross-checked vs origin/main 55086dd + live probes 2026-10-17; gates green first-hand (lint 0 / check-types 0 / vitest 3160 root + 1221 web RC=0 / `pnpm audit --recursive` 0 / graphql-canary LIVE RC=0); headline: base-drift compares trixie pins against 24-slim's live digest — guaranteed false red at a current pin |
| research | 92b92404 | 13 ranked survivors + 5 rejected-with-reason; upstream 27-commit window with five PR diffs read in full (#636/#637/#638/#639/#643); live npm registry + GitHub releases API for all 9 pinned action families |
| roadmap | 337e6652 | extension #33 — mints rm-1499 (absorb-window content-coverage map) + rm-1500 (push inactiveReason closed set) above the all-lineage frontier rm-1498; 10 dated in-render riders + 5 orphan riders; 40 insertions, zero deletions |
| prioritize | 5bbf4760 | ownership census across ALL 20 lineage worktrees; batch = S1 approval-click containment + S2 rm-1499; base-drift ARG-derivation (0f5694c6 + 475b46bc) and inactiveReason allowlists (a103fa90 + e4d61c80) declared sibling-owned pass-overs |
| stewardship | c2995de2 | two change units, theme 'make the operator's signals true'; no Git topology decisions |
| implement | 58c7d856 | repair fold of b8738a91 (rejected solely for a missing KTD13 changed-surfaces attestation): S1 PASS-OVER — main moved first (window 27 -> 1 by explicit refname; #636 containment landed at operator-stream.js:2785/:3067 with a byte-identical upstream test); S2 implemented — absorb-window per-SHA coverage map with quorum + code-marker probes, 18/18 focused green, live `--no-fetch` window archived |
| targeted_tests | e865f7c0 | engine impacted-mapping resolved the changed executable surface to exactly one suite — 18 pass; tsc 0 / eslint 0; digest recompute == dispatch digest verbatim (`validation:v1:a1b3a6ad…`) |
| full_tests | 8727743c | run 1 (verbatim command, ephemeral-PR route) exposed a REAL regression: the classifier's vocabulary tripped the rm-164 tree-wide prose guard (Main run 39072723177, 5 residue lines); cured with neutral vocabulary; run 2 FULL PASS — PR #894 commit 5656af0b, 8 checks green (Fro Bot skipped by design), Main run 39073223671; emission-time digest `validation:v1:8bb3dc6a…` |
| compound | 13756192 | this layer — corrected rm-164 note + rm-1499 cycle-close rider + close-out comment #34 + this record + the solutions doc (adopted from a dead sibling attempt, verified, corrected, completed) |

Dead attempts (provider-infrastructure, forensics recorded in each phase's
evidence): aa6ea86a (roadmap, 29s, zero edits — redone), 77762368
(implement, ~72s, zero edits — redone), 9b5cd1a7 (targeted_tests, ~58s,
zero edits — redone), 8caf372ed (compound, ~8 min, PARTIAL real work — the
solutions doc + one dangling ROADMAP note line — adopted after verification
and completed here). b8738a91 (implement) is the distinct non-infra case: it
COMPLETED the batch but was rejected for the missing attestation; its tree
work was proven byte-stable and adopted by 58c7d856. Four of nine phases hit
provider deaths this run — the event-log + tree-census forensics protocol
held every time (distinguish zero-edit deaths from partial-work deaths
before redoing).

## Batch identity (for review / final_validation)

The worktree dirty set at compound close IS the batch (no patch archives
this run; the fold is engine-managed from this worktree):

- `M ROADMAP.md` — extension #33 + implement riders + compound layer
  (numstat vs base: 45+1+1+3 insertion-class lines over the four layers;
  zero deletions anywhere).
- `A scripts/absorb-window.ts` (+676 vs base; main's 334-line tool
  materialized from 64cd2f6a then extended additively; post-full_tests
  vocabulary state `write-capability` / `['src/wiki/']`).
- `A test/absorb-window.test.ts` (+591; 12 pre-existing + 6 new tests;
  fixture vocabulary neutralized at full_tests).
- `?? docs/solutions/workflow-issues/prose-residue-guard-vocabulary-targeted-tests-blindspot-2026-10-18.md`
  (new, this phase).
- `?? docs/prioritization/2026-10-18-repository-maintenance-cycle-5-compound-run-0fc3fa532082.md`
  (this record).

rm-1499 stays `implemented … pending landing`; rm-1500 stays `candidate`.
Statuses move only after landing verification on origin/main.

## Learnings compounded

- **Tree-wide prose guards are invisible to per-surface impacted-test
  mapping** — `docs/solutions/workflow-issues/prose-residue-guard-vocabulary-targeted-tests-blindspot-2026-10-18.md`
  (new): the rm-164 guard sweeps every file but imports nothing, so it
  appears in no changed surface's impacted set; targeted green does not
  imply tree-guard green. Cure convention: neutral vocabulary for ACTIVE
  rule/fixture data (never era-qualified allowlisting), plus a cheap
  close-time guard-suite run + grep when a delta touches capability
  vocabulary.
- **Validation closure** — rm-1499 cycle-close rider records both full-suite
  rounds, the regression, the cure, the PR/digest bookends, and the
  no-status-flip rule.
- **Verify prior-phase INFO findings before ledger entry** — full_tests
  finding 2 ("dead pointers guard-history.md / guard-map.json") was
  disproven by one tree-wide grep at compound; the real defect was a
  wrong-path citation in the guard header (doc lives under
  `docs/solutions/best-practices/binding-doc-…`). Both artifacts that had
  propagated the claim were corrected in place.
- **Prior-attempt forensics discriminates partial work** — a reaped session
  with no result artifact can still have shipped real edits; read the event
  log AND the tree before declaring a redo (8caf372ed's doc was adoptable;
  its dangling ROADMAP reference is exactly the seam a blind redo would
  have duplicated or orphaned).

## Next-cycle context (candidates and probes)

1. **Landing verification** for the batch (post-review phases first);
   rm-1499 flips to Completed only after origin/main verification. S1 needs
   no landing action — it was passed-over because main's 64cd2f6a already
   carries #636.
2. **rm-1500 is the minted-unimplemented prime candidate** — push
   inactiveReason closed-set validation at
   `src/gateway/operator-contract/push.ts:144-147`; siblings a103fa90 /
   e4d61c80 hold unlanded allowlist implementations (reconcile by content,
   do not rebuild blind).
3. **base-drift false-red, time-boxed**: first weekly fire is Monday
   2026-10-19; it compares the trixie pin against 24-slim's live digest and
   goes red even at a perfectly current pin. Siblings 0f5694c6 (ARG sed
   derivation) and 475b46bc (LIVE_TAG derivation) both wrote cures unlanded
   — the pass-over/integrate decision is owed BEFORE the fire.
4. **Absorb window collapsed 27 -> 1** (main's mid-run adoption batch;
   measure with EXPLICIT refnames — the bare `autonomy-upstream/main`
   refname is shadowed by a stale local branch and reports 0). Lone
   survivor #646 (markdown-render) classifies absorb-pending 3/24 markers
   below quorum — rm-252's wire-or-fold decision.
5. **Node 26 LTS gate 2026-10-28** — rm-139's go/no-go matrix; sibling
   rm-1475 owns the record artifacts (dated matrix + .nvmrc) and rm-1495
   the host-default fidelity problem; run the decision, do not re-mint.
6. **rm-164 follow-ups**: fix the wrong-path citation in the guard header;
   engine-level candidate — always include tree-wide guard suites in the
   impacted-tests mapping for any changed file.

## Verifying this layer

- Census: `grep -oE '^- id: .rm-[0-9]+' ROADMAP.md` piped through
  `sort | uniq -d` yields 0 dups and through `wc -l` yields 251 defs
  (max rm-1500); managed-render marker still the final line.
- Digest neutrality: recompute the whole-tree digest with the engine module
  (`hermes_conductor.validation_policy.validation_digest('f521ec783cab…', '.')`)
  — equals the full_tests emission-time `validation:v1:8bb3dc6a…`, proving
  the compound layer touched no executable surface.
- Porcelain: the five-path dirty set above, nothing else; no repo-root
  scratch; no commit, no push (prohibited at this phase).
