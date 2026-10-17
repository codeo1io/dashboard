---
module: roadmap
tags: ['repository-maintenance', 'cycle-2', 'compound', 'residue-restore']
problem_type: workflow-issue
owner: dashboard
run_id: 1a261b63dce7411ba7c6fc239d388954
---

# Cycle-2 compound record — run 1a261b63dce7411ba7c6fc239d388954

Repository-maintenance `6d1dd8145a38434bbd1a94edc4198c19:cycle:2` at base
3e3664c (== origin/main across the whole cycle; porcelain clean at dispatch).
This record compounds the cycle's learnings into the roadmap using pre-review
evidence only (assess → research → roadmap → prioritize → stewardship →
implement → targeted_tests → full_tests). Review and shipping outcomes are
deliberately NOT folded here — the next cycle's assessment carries them.

## Selected batch (prioritize 8abcae82)

**rm-887 — dropped-content residue restore** (this run's mint, p87.0): the
unclaimed remainder of the 60-file 3e3664c integrate-drop, chosen because it
was the highest-value locally-completable batch with zero file overlap against
all seven in-flight sibling claims (collision map in the batch-selection
artifact).

## Cycle outcome (evidence-annotated onto rm-887)

All six units implemented (bd313244) and validated: ErrorBoundary wired at
`web/src/main.tsx`; canonical invariant guard merged with the alternate
spelling's permission-scope detector; server-entry-point + robots-wellknown
tests restored AND their regressed subjects cured in `src/server.ts`
(symlink-aware `isMainEntryPoint` — the naive shape failed 3 symlink tests
first, the RED proof — and the rm-713 `/robots.txt` route); operator-contract
window re-derived to live 1.9.0/ReadonlySet truth; lockfile-guard.yaml
restored actionlint-clean; docs pair restored; NEW presence-guard rider pins
every restored path plus single-spelling. Downstream couplings fixed en route:
README `GET /robots.txt` line (endpoint-parity rm-556), prose-residue
EXCLUDED_FILES convention line (guard machinery names its own terms).

Validation: targeted 831/831 + web no-server-imports 1/1 (5a37c360); full
six-job Main mirror 6/6 (55f42bd8) — 4314 tests green (64 files/3098 root +
35/1216 web), check-types 0, design-check empty-array, actionlint 0,
scripts-load 0; digest `validation:v1:cb6c1956…` stable before/after the
docs-only delta. The mirror's lint job also CURED the standing ROADMAP.md
lint-red in-delta (47 trailing-ws + 3 label-ref lines from 5d5f9be/3e3664c;
eslint rc=0 after) — so the batch lands with lint fully green.

Status: rm-887 minted `in_progress` with the full evidence trail; closes on
review + landing.

## Roadmap changes this compound

- MINTED rm-884 (p98.0, CI run-creation silence umbrella — the top
  next-cycle candidate; escalation evidence recorded: dispatch POST 422
  "Actions has been disabled" while GET reports active, four fresh validation
  PRs #758-#761 all "no checks reported", run frontier frozen 7.5 days),
  rm-886 (p93.0, ledger ghost closure — four flips already evidenced; note
  rm-100's lint leg is now cured in-delta and can close with this batch),
  rm-885 (p34.0, clonedeps v0.78.0 → v0.122.x refresh).
- EVIDENCE-APPENDED (no re-mints): rm-191, rm-648, rm-109, rm-271, rm-689,
  rm-139, rm-128, rm-138 (research/assess 2026-10-16 updates) + rm-100
  (cycle-2 gates-green outcome).
- Census 237 → 241 defs, 0 duplicates, priority sort preserved; static
  hygiene (no test execution this phase): zero trailing-ws delta, no bare
  bracket characters in added lines, all lines < 4000 chars, no `<` chars.

## Reusable lessons (durable doc)

`docs/solutions/workflow-issues/integrate-merge-file-drop-restoration-2026-10-16.md`
— the six-step restoration pattern: restore from git objects; re-derive
against live truth; a restored test failing means the SUBJECT regressed
(restore it too, complete shape); guard machinery names its own terms
(EXCLUDED_FILES convention); restores resurrect coupled prose (endpoint
parity); canonicalize duplicate spellings + presence-guard rider as the
anti-recurrence.

## Next-cycle context (pre-review, for the next assessment)

1. rm-884 remains the top escalation item but its premise ENDED mid-cycle
   (review e16a6ee3 correction): Actions resumed 2026-10-16T17:18Z — first
   validating Monday sweep is 2026-10-19; remaining legs are the dark-week
   root cause (org settings/billing window), the four 2026-10-05 scheduled
   failures, a dispatch sentinel, and pruning the checkless PRs #758-#761
   (minted during the dark window, superseded by resumption).
2. rm-886 ghost closure is cheap and now half-unblocked (rm-100 closes with
   this batch; four flips evidenced on-file).
3. Operator-contract catch-up (sibling bb09bc7bfe05, in-flight) should extend
   `test/operator-contract-window.test.ts` with the window assertions — note
   is in that file's header.
4. The presence-guard rider's file list is cycle-2-shaped; extend it if the
   fenced siblings land their restores (census, cve-tripwire, darkness-watch).
5. Digest discipline: docs-only compound deltas do not move the validation
   digest (proven twice this campaign) — but re-derive before declaring.
