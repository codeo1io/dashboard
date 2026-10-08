---
title: 'Maintenance-cycle learnings 2026-10-07 (run 23edabab) — the validation gate is the arbiter, reaped attempts need forensics not redo, and a collision-prone sweep belongs to one lineage'
date: '2026-10-07'
category: 'workflow-issues'
module: 'dashboard'
problem_type: 'workflow_issue'
component: 'development_workflow'
severity: 'medium'
applies_when:
  - 'A maintenance cycle declares its implement phase done on local gate claims, then CI validation disagrees'
  - 'A delegate/agent attempt dies of a transport/provider reap and you must decide adopt-vs-redo from the durable trail'
  - 'Prioritizing a batch in a fleet where sibling concurrent runs are building overlapping surfaces'
  - 'Landing a batch whose ledger mint raises a guard-pinned id ceiling'
---

# Maintenance-cycle learnings — run 23edabab (repository-maintenance cycle:3)

Batch: "machine-checked security posture" — rm-649 (read-only invariant
guard test), rm-648 (weekly CVE tripwire workflow), rm-205 docs-half
(zlib1g standing-critical triage doc), plus roadmap extension #18
(rm-689 + 19 riders). Validation-proven pre-review; this doc compounds the
reusable lessons. Full chain with attempt ids is in ROADMAP.md's cycle-3
compound comment.

## Lesson 1 — the validation gate is the arbiter, not a remembered local pass

The implement phase recorded `eslint <changed files>` → "0 problems". The
first authoritative validation round (ephemeral PR #423) came back RED on
two `@typescript-eslint/strict-boolean-expressions` errors ("Unexpected
nullable string value in conditional") **in the batch's own new test file**
(`test/readonly-invariant-guard.test.ts:100:9` and `:126:17`).

The decisive detail: the validation digest (`validation:v1:5d3e8c3f…`,
reproduced via `hermes_conductor.validation_policy`) was **identical**
across implement, targeted_tests (both rounds), and full_tests — yet the
tree DID change in between: the round-1→round-2 fix edited the test file
itself. The digest stayed put because it binds only EXECUTABLE surfaces
(`classify_surface`: this batch's sole executable change is the
CVE-tripwire workflow; a test or doc file is non-executable and therefore
digest-silent). So digest equality never proves "the tree never changed"
— only that its executable half didn't. The implement-phase green claim
was unbound exactly where it mattered: a lint pass that predates the last
edit of a non-executable file is not evidence about the shipped file.

**Prevention rules:**

- Run the **CI-exact form** (`pnpm lint`, `pnpm run check-types`) after the
  LAST source edit, never a remembered or partial per-file invocation.
- Record the validation digest alongside any "gates green" claim — but
  read it as binding EXECUTABLE surfaces only. The round-1 red is the
  counterexample: the digest was quiesced straight through the test-file
  edit that caused it, because `classify_surface` marks test files
  non-executable. For test/doc claims there is no digest shortcut: re-run
  the CI-exact command after the last edit of those files too.
- A round-1 validation red is cheap: fix, re-validate (round 2: PR #424,
  10/10 green), and record both rounds — the red round is the proof the
  gate was real.

## Lesson 2 — a reaped attempt needs forensics, not a redo reflex

This cycle's research phase (attempt 6368a8fe) wrote its scratch artifact at
22:31:04Z and its typed PhaseResult JSON at 22:32:09Z, then the session was
transport-reaped at 22:33:44Z — **the work predated the reap**. The engine's
`completed failed` event was a transport artifact, and the correct handling
was adoption after verification (done by attempt 93f14d5959), not a redo.

The opposite case also occurred, five times over, on this run's compound
phase: attempts 49615571 (34s), 0d464735 (64s), 237bd702 (42s), deceffe84
(33s), and 8e1f0543 (**18 minutes of progress heartbeats**) all died to
`session_reaped` leaving zero durable output — no typed result, no scratch
directory, no tree changes. An 18-minute heartbeat trail is not work
evidence.

**Prevention rules:**

- Before redoing any phase, compare artifact mtimes against the event-log
  timestamps: typed-result present + mtime earlier than the reap ⇒ verify
  its identity legs (run/action/attempt lineage, tree census, cleanliness)
  and adopt; typed-result absent + no scratch ⇒ redo.
- Heartbeat/progress events prove liveness only. Durable output is the only
  work evidence.

## Lesson 3 — a collision-prone sweep belongs to exactly one lineage

Research measured the pre-Monday digest/tool-pin sweep (Dockerfile digest,
agent pin, action pins, in-range npm refresh) as the highest-value item —
and the prioritize phase found **two sibling runs already on it**: run
09e5b4d619fe had it built (uncommitted tree) and run 894a024019d9 had it
queued. A third build would have been pure merge-conflict surface — the
proven #415/#416 hazard with zero marginal value.

Instead the cycle minted the *values* into one collision-free carrier
(ROADMAP rm-689: exact digest, exact pin targets, exact refresh set, gates)
and spent its implementation budget on surfaces verified absent from main
AND every sibling tree (rm-648/rm-649).

**Prevention rules:**

- At prioritize, build a live collision map (sibling typed results + their
  worktree `git status` scans) before scoring; a surface another lineage
  has built is closed, however high it scores.
- When the collision is on a *value*, record the value in the ledger as a
  carrier item instead of building it — the next cycle consumes it after
  the sibling landing, with the pre-merge re-probe discipline attached.

## Lesson 4 — carry the landing obligations forward explicitly

The batch will land onto a main that has moved throughout the run's
phases (base ac61ff3; observed live tips 25d32beb → a9576e3 →
5aab7c7 → f66e547, 19 landings above base; frame refreshed again at
the second review fix). Four obligations are pinned in the cycle-3
compound comment so the integrate cannot miss them:

1. **Guard census reconciliation, NOT a pin bump**: main (f66e547 at
   second-review-fix time) pins `live.max === 744` (`:60`) and
   interlocks the newest census claim
   (`test/roadmap-integrity-guard.test.ts:103-108`, same-date claims
   resolved by document order); this batch's rm-689 lands BELOW that
   ceiling, so the pin needs no bump — the compound-time "bump 682→689"
   wording was written against a9576e3 and is obsolete (executing it
   literally would undershoot live 744 and go red). The real
   obligation: the def-set union (ours-exclusive id = rm-689 exactly,
   re-derived first-hand) takes live from 233 to a forecast 234 defs,
   ceiling stays rm-744 absent further sibling landings, while main's
   newest claiming comment still says 233 — the integrate must
   rewrite/extend that claim to the post-union census before Main
   fires, and re-derive the live pin and census at integrate (renumber
   rm-689 per the d00d095 convention only if the id itself collided;
   rm-689 is not on main as of this fix).
2. **rm-649 same-item collision — adjudicated, not defaulted**: main
   flipped the same rm-649 def-line this batch flipped (run 3ff5a80c,
   via its own `test/read-only-invariant-guard.test.ts` at main
   :1805), and our base ac61ff3 is an ancestor of live, so the def
   line is a guaranteed textual 3-way conflict — union the two
   parentheticals crediting both lineages. The two guard files are
   name-adjacent but complementary (ours alone asserts the mint-time
   permission sets in `src/github/installations.ts:32-47`; theirs
   alone covers graphql mutations and the `request()` wrapper shape)
   and both are green on the union tree: default keep-both as layered
   guards; a fold must re-point the rm-649 rider to the surviving file
   and preserve the permission-detector credit.
3. **Post-landing acceptance halves**: alert-#67 annotation (rm-205,
   remote gh-api action) and the first cve-tripwire scheduled fire
   (rm-648, Mondays 06:53Z from 2026-10-12).
4. **Re-derive anchors at integrate**: statuses stay `implemented` until
   landing verification; census numbers recorded mid-run are tree-local and
   mint-time.

## History

- 2026-10-06 21:12Z assess (15a8bf74) · 22:04Z research (6368a8fe, reaped
  post-result) · 23:18Z dead research (9232baebe, zero work)
- 2026-10-07 00:24Z research adoption (93f14d5959) · 01:19Z roadmap ext #18
  (b1a28581) · 02:55Z prioritize (9fb8218c) · 04:11Z stewardship (c695a65f)
  · 05:11Z implement (37cb6a4f) · 08:17Z targeted_tests (0853fc3c: PR #423
  red → fix → PR #424 green) · 09:22Z full_tests (782e437f: PR #425 green)
- 2026-10-07/08 compound: five provider-reaped attempts, then this compound
  (d527d342) — forensics in Lesson 2.
- 2026-10-08 review chain: NEEDS_CHANGES (ab181e84) → fix (1d05619c) →
  NEEDS_CHANGES again (4b1ea797 — obligations frame stale vs f66e547, and
  the rm-649 collision with main's landed guard unadjudicated) → this
  second fix (f437a39a) refreshed Lesson 4 and added the adjudication.
