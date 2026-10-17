---
module: roadmap
tags: ['repository-maintenance', 'cycle-3', 'compound', 'read-only-invariant']
problem_type: workflow-issue
owner: dashboard
run_id: e178a9460f104b049d36d404981b1f15
---

# Cycle-3 compound record — run e178a9460f104b049d36d404981b1f15

## Cycle shape (pre-review evidence only)

Assess (bc752638) → research (67f58fde) → roadmap (4f5fed50, report-only) →
prioritize (37020a1a) → stewardship (e3b2d4fb) → implement (b5739db8, adopting
reaped-attempt 20c46636's real in-tree work) → targeted_tests (c67d7de8) →
full_tests (30f27214) → this compound.

## Batch and outcomes

Selected batch "read-only invariant machine guard + coverage slice":

- **rm-649 (lead) — landed.** `test/read-only-invariant-guard.test.ts`
  mechanically freezes AGENTS.md invariant #1: line-based detector (50+
  write-endpoint method patterns + mutation-route regex) asserting ZERO
  write-capable GitHub API usage across `src/`, `web/src/`, `public/`;
  mint-site permission-object assertions (CORE/OPTIONAL/FULL all `'read'`,
  exact AGENTS-declared key sets); bite-proof synthetic-write and
  no-false-positive cases; scan-scope sanity (≥40 server, ≥30 web files, so a
  moved tree fails loudly instead of scanning nothing). Status flipped to
  `implemented`; full-validation rider appended.
- **rm-022 slice — landed with a corrected claim.**
  `test/app-client.test.ts` + `test/query-registry.test.ts` pin the
  fixture-server contract and registry surface directly, but the modules were
  NOT previously untested (four + one differently-named suites existed). The
  census-method failure is documented as a prevention rule in
  `docs/solutions/workflow-issues/module-coverage-census-content-not-filename-2026-10-17.md`.
- **Five stale-status close-outs** (rm-155, rm-177, rm-228, rm-251, rm-273):
  proven landed at base by first-hand file+test inspection; statuses flipped
  `done` with evidence (useBoundedPoll, query-registry extraction,
  secrets.test.ts acceptance list, monitoring.ts:167-177 401 classification
  pinned at monitoring.test.ts:94-121).

## Validation record (consumed, not re-run here)

- Targeted (c67d7de8): 5 files / 25 tests green; eslint 0 on changed files;
  check-types rc 0; ROADMAP census 248/0 dups.
- Full (30f27214): authoritative `github_ci_validate.py --repo .` → ok=true,
  ephemeral PR #828 (commit 2cf9858f), 9 checks SUCCESS + Fro Bot SKIPPED
  (PAT gate), validated against base c8fe9f4 — i.e. the delta is green on top
  of the *current* main wall, not just the run base. PR auto-closed.
- Digest `validation:v1:4d809bfb…` unchanged through both phases (delta is
  test+docs; no executable surface changed after implement). Review-fix
  2026-10-17 (attempt 16ff6e66): re-proven with a 4-cell matrix — engine
  releases 279feac3 and 70360ce5 × full-40-char/short base forms; the full
  base reproduces 4d809bfb deterministically on both engines, the short base
  yields c884c250 (the base-string notation trap, memory #18922), and the
  review-round counter-value 49f2e849 is not reproducible from this tree on
  any installed release — the declared digest stands.

## Ledger movements this cycle

Adopted the roadmap-phase extension into the tree at compound: rm-252 estate
verdict rider (gateway v0.122.1 deployed 2026-10-15 speaks contract 1.11.0 —
fork twins at 1.9.0 live-broken; absorb window 27 commits), rm-740 correction
(staleness lane reads healthy at HEAD while the real channel is dead; repair
owned by unlanded rm-1465/rm-1468), rm-760 rebase to 2.1.5, rm-1446 gate note,
mints **rm-1478** (Actions outage RECOVERY lane — minted with the outage-over
fact baked in: run creation had revived fleet-wide by 2026-10-16T23:53Z and
PR #828's checks are this run's own first-hand post-outage green, 2026-10-17)
and **rm-1479** (upstream #628 launch-prompt forward-contract watch). Frontier
at mint: origin/main 55086ddc max rm-1453; all-refs max rm-1464; spool
frontier rm-1477 — both mints sit above everything; first-landed-wins.

## Fleet lessons (also in memories)

1. **Content census, not filename census** — see the prevention-rule doc.
2. **`validation_policy` digest functions take `(base_sha, repo_path)` and do
   not validate arg order** — a swapped call silently returns a wrong digest
   (reproduced: 9b8b8bb9 vs correct 4d809bfb). Keyword-call and diff against
   the work order.
3. **`git apply` from inside the delegate spool resolves against the
   `/home/agent/.hermes` repo** — rehearse patches only in a throwaway `git
   init` repo.
4. **Statuses lie more often than trees** — this cycle found five
   stale-in_progress defs already landed; always pin surfaces at the consuming
   phase (stewardship caught the rm-273 misread that prioritize had made).

## Next-cycle leads

- **rm-252 absorb execution** is the urgent lane (live operator breakage
  since 2026-10-15; 27-commit window; guard from this cycle rides along).
- **rm-1478 recovery census**: dead-lane validation-PR inventory + queued-cron
  triage + digest-rule audit across the 2026-10-09→17 window.
- **rm-1479**: check upstream #628 for movement before any fork-side work.
- Staleness repair (rm-1465/rm-1468 owners) and the sibling mints
  rm-1472..rm-1477 remain unlanded; landing gates re-derive first-landed-wins.
