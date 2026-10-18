---
module: roadmap
tags: ['repository-maintenance', 'cycle-1', 'batch', 'rm-138', 'supersession', 'pwa']
problem_type: maintenance-batch
owner: dashboard
run_id: 0c6f62d5295047178893326f2c52b07b
---

# Repository maintenance — cycle 1 batch record (2026-10-18, run 0c6f62d5295047178893326f2c52b07b)

Base: debde800 (== origin/main at fix time, re-fetched this turn). Worktree:
`/home/agent/.hermes/conductor-worktrees/dashboard-864ca327c8/run-0c6f62d52950-0c6f62d5`.

This document is the cycle's batch record AND its decision record. It supersedes the
run's original 2026-09-25 stewardship batch ('PWA posture truth' — a PWA strip: stop
vite-plugin-pwa's default auto-registration, empty the precache glob, and ship a
constant-false push capability gate). That batch was reviewed CHANGES_REQUESTED, its
fix attempt was void (evidence integrity failure — see the escalation below), and its
PREMISE has since been resolved by main in the opposite direction. The correct fix for
every actionable finding is therefore NOT to land the batch but to record the
supersession: this document plus the rm-138 resolution line in ROADMAP.md are that
record. Re-landing the strip would revert a working, guarded feature and re-introduce
exactly the truth-debt the run set out to cure.

## What happened to the original batch (recovered history, first-hand)

- The batch was implemented 2026-09-25 against base e407953 (16 files, +366/−46:
  `web/vite.config.ts` injectRegister false + empty globPatterns, a constant-false
  `isPushClientSupported()` in `web/src/push/capability.ts`, an `unavailable`
  notifications-copy state with a sweep short-circuit in
  `web/src/views/Notifications.tsx`, a strip-contract `web/src/sw.test.ts`, a
  rm-228 regression describe in `test/static-assets.test.ts`, visual-spec SW-stub
  removal, an availability note in `web/privacy.html` + `web/src/privacy/claims.ts`,
  a comment rewrite in `src/server.ts`, ROADMAP edits, and a batch doc).
- It validated green twice (ephemeral validation PRs #214 and #215, both closed;
  PR #215 head d859b112 is the only surviving byte-exact copy of the batch tree —
  recovered this turn from the local object store, `git diff d7e3be2 d859b112`).
- Independent review round 1: CHANGES_REQUESTED — F1 (high) AppShell logout teardown
  awaits `navigator.serviceWorker.ready` unbounded and the strip makes that wait
  never settle; F2 (medium) the new `unavailable` copy lacked the footer mirror the
  supported states carry; F3 (low) doc-truth (the 'flips true automatically' claim
  vs a hardcoded false).
- The first fix attempt (2026-09-25 19:12Z) is VOID: its result artifact was dropped
  mid-write, every physical claim it made is contradicted by repository state (files
  it claims to have edited are untouched; the PR head sha it cites does not exist),
  and the escalated review documented the forensics. It landed nothing.
- The escalated review additionally found main had moved e407953 → 65830f14, minting
  colliding ROADMAP ids and overlapping ROADMAP.md + `src/server.ts` edits — the
  stale-frame class. It prescribed re-anchoring and renumbering before any re-land.

## Why the batch is superseded, not fixed (the disposition)

Between the review and today, main advanced ~266 commits (debde800) and took the
OTHER arm of rm-138's decision. First-hand verification this turn, at debde800:

- `web/src/sw.ts` is no longer the kill-switch. It is a deny-by-default precache
  router: NetworkOnly for `/auth/` and `/api/`, a NavigationRoute denylist, prompt
  gated activation, purge-on-auth-change, notification click handling, and an
  OPERATOR DATA POLICY docstring. `web/src/sw.test.ts` GUARDs assert the router
  shape and document that emptying the precache manifest breaks
  `createHandlerBoundToURL('/')` — i.e. the strip's empty-globPatterns is now a
  known-broken shape against live tests.
- A fresh `pnpm build:web` prints `precache 3 entries (347.70 KiB)`, emits
  `registerSW.js` with the loader tag in the built index.html, and the built `sw.js`
  carries a real manifest with no self-unregister. The auto-registration the batch
  wanted to kill is now the registration of a full offline shell — not of a
  self-destructing kill-switch.
- Push is real end-to-end: `web/src/push/subscribe.ts` reaches
  `registration.pushManager.subscribe` with a VAPID flow; the reconcile sweep and
  logout teardown bound every `navigator.serviceWorker.ready` read behind timeouts
  (rm-272), so the F1 hang cannot occur on main even when no registration exists.
- `web/src/views/notifications-copy.ts` gained rm-272's `sw-unavailable` state
  (truthful no-registration copy) — the honest version of the batch's `unavailable`
  state, landed by a different route.

Against that frame, each finding's disposition:

- F1 (high, teardown hang): the finding targeted the batch's strip consequence. The
  strip is superseded, and main independently bounds the teardown read
  (`web/src/push/subscribe.ts`, unsubscribeOptOut: withTimeout collapses a
  never-settling ready into 'no local subscription', with the comment 'logout
  cleanup must not hang on it'). Moot and verified cured on main.
- F2 (medium, unavailable-copy footer): the state the finding was about never
  landed and must not land; rm-272's `sw-unavailable` covers the honest case. Moot.
- F3 (low, doc truth): the docs carrying the untruth never landed. Moot.
- Stale frame / id collision (the escalation's blocker): cured by this disposition —
  the run mints no new ROADMAP id (nothing survives to mint), main's own rm-228
  (secrets coverage, unrelated) is untouched, and this turn's delta is authored on
  live main, not on e407953.
- Evidence integrity (blocker (a)): cured by doing everything first-hand this turn
  and recording the recovery chain above (batch bytes recovered from d859b112;
  nothing re-derived from the void attempt's claims).

## The rm-138 decision record (acceptance leg)

rm-138 required 'a recorded decision — strip … or implement: a true offline shell
with an explicit cache-policy note reconciled against the privacy claims; either way
the decision and its privacy reasoning land in the cycle batch doc'. The record:

- DECISION: implement. Main's landed tree is the true offline shell (precache router
  above). ROADMAP.md rm-138 is flipped to done with a dated resolution signal
  pointing here.
- PRIVACY REASONING: only the static shell and hashed build assets are precached;
  operator data routes are NetworkOnly/no-store; runtime caches are purged on
  logout, auth change, and version change (the OPERATOR DATA POLICY note in
  `web/src/sw.ts`). `web/privacy.html` and `web/src/privacy/claims.ts` make no
  caching claims that this contradicts, and no user- or operator-attributable data
  enters the precache — the push-notification payload path the shell enables is the
  one the existing claims already govern (titles and run identities, no sensitive
  keys or payloads). The rejected strip arm's privacy rationale (kill-switch
  self-unregistration makes any cached posture claim unstable) died with the
  kill-switch: a prompt-gated, explicitly-purged router is a STABLE posture worth
  claiming.

## What this turn changed (2 files, tree uncommitted)

1. `ROADMAP.md` — rm-138 status in_progress → done + the dated resolution signal
   (decision, first-hand build evidence, cache-policy reconciliation, supersession
   of this run's strip candidate with the finding dispositions).
2. This document — the batch/decision record.

No executable surface changed. The strip batch stays unrecovered-by-choice: its
bytes live at d859b112 for archaeology, but nothing from it is applied to this tree.

## Validation

Scope per the work-order block (targeted; the runner's sanctioned full fallback via
the ephemeral GitHub-hosted CI validation PR, because package.json is in the
surface list): run_repo_impacted_tests verbatim with the 30 listed surfaces →
'impacted-tests: shared build/test configuration changed; falling back to
authoritative full validation' → github_ci_validate → ephemeral PR #906
(head e0d5b6cf, validation base ee7c8464 whose parent is debde800 == origin/main,
re-verified), ok: true — Check Types, Dependency Review, Lint, Design Check, Test,
Check Workflows, Test Scripts Load all SUCCESS (Fro Bot SKIPPED; CodeQL/Analyze/
visual path-filtered out by the docs-only delta); PR-head-minus-base diff is exactly
the 2-file delta of this turn. Local gates before it, all green: the ROADMAP guard
trio (`test/roadmap-integrity-guard.test.ts`, `test/roadmap-length-guard.test.ts`,
`test/roadmap-render-guard.test.ts`), the prose-residue / fork-exclusion /
query-shape / env-docs guards (7 files, 44 tests), and `pnpm lint`.
