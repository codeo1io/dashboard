---
module: 'dashboard'
tags: ['maintenance-cycle', 'jsdom', 'node-26', 'localstorage', 'vitest', 'pnpm-overrides', 'conductor', 'targeted-tests']
problem_type: 'process'
---

# Maintenance-cycle learnings — jsdom 30 + the in-tree localStorage rebind, dormant override selectors, targeted-command escalation (cycle 2, run 845265c83109)

Lessons from the 2026-10-04 repository-maintenance cycle, recorded pre-review
from cycle evidence only (batch: B1 jsdom 29.1.1→30.1.1 + the web test-setup
localStorage env-seam rebind + B2 rm-560 sampled rate-limit denial logging +
B3 429 `Retry-After`; targeted_tests 17 files/735 server impacted + web
31 files/1172 green, full_tests ephemeral PR #375 all 10 checks green).
Companion to `maintenance-cycle-learnings-2026-10-03-sigpipe-superseded-content-reanchor.md`
and the batch record
`docs/prioritization/2026-10-04-repository-maintenance-cycle-2-batch-run-845265c83109.md`.

## 1. Node-26 web red: the durable cure is an in-tree env-seam rebind — not the jsdom bump, and not a runner flag

**Shape.** Four web files / ~100 tests (App, AppShell, Notifications,
InstallPrompt) fail on Node 26 with
`TypeError: Cannot read properties of undefined (reading 'clear')` while the
same suite is green on CI's Node 24.

**The bump alone is NOT the fix — falsified first-hand 2026-10-04.** Bumping
jsdom 29.1.1→30.1.1 changed nothing about the red (byte-identical signature
post-bump, pre-rebind). The blocker is Node ≥26.10's OWN configurable
`globalThis` localStorage getter (it warns and returns `undefined` unless
`--localstorage-file` is set): it pre-empts the vitest jsdom environment's
storage install *regardless of jsdom generation*. jsdom 30 is still required
(Node-floor currency: `'^22.22.2 || ^24.15.0 || >=26.0.0'`), but for
currency, not for this failure.

**Durable cure.** `web/src/test-setup.ts` rebinds `globalThis.localStorage`
to a fresh in-memory Storage per test file — an environment seam, not a
per-test shim. Web suite 31 files / 1172 tests green on Node 26.10.0 with
zero flags; CI Node 24 unaffected either way.

**Fleet split, fold by content at integrate.** Sibling run 86c2dd13's
`docs/solutions/test-issues/operator-runtime-loader-test-seam-and-web-localstorage-2026-10-04.md`
records the `NODE_OPTIONS='--localstorage-file=…'` runner recipe (works, but
per-invocation and external to the tree — and it leaves the suite red for
anyone who forgets the flag); sibling run 2c3b4c64's uncommitted rm-608
carries the same test-setup rebind. One durable seam should land, not three
cures: prefer the in-tree rebind; the ledger rider at rm-133 carries the
same instruction. (The sibling doc path above is sibling-worktree-scoped —
it exists only in run 86c2dd13's tree until its integrate lands; fold by
content, not by path — review 81824cf7 P4.)

## 2. A versioned override selector goes silently DORMANT when its consumer's own range moves

**Shape.** `pnpm-workspace.yaml` pinned `'undici@7': '>=7.30.0 <8.0.0'` —
installed by jsdom 29's dependency. jsdom 30 depends on undici `^8`, so the
lockfile resolved undici 8.11.2 and the override now matches **nothing**. No
install error, no warning: everything stays green while the floor silently
stops applying.

**Prevention.** After any major bump that touches an override's consumer,
grep the lockfile for the selector prefix — `grep 'undici@7' pnpm-lock.yaml`
returning empty means dormant. Pair every versioned override with a dated
re-eval comment (done: `pnpm-workspace.yaml` and the `.github/dependabot.yml`
ignore block both carry 2026-10-04 riders), and prefer unversioned selectors
(`'undici': …`) when the floor must track all majors.

## 3. `package.json` in the changed set escalates conductor targeted-mode to full cloud CI — substitute, don't fire

**Shape.** The engine's targeted runner classifies `package.json` as shared
build/test config (FULL_IMPACT): any batch touching it makes the seeded
`run_repo_impacted_tests.py` command print
`shared build/test configuration changed; fallback=full` and run
`github_ci_validate.py` — force-pushed ephemeral refs, a draft PR, and a
remote Actions wait. In a focused phase that route is both prohibited
(push/pr/ci) and reserved for the full gate.

**Prevention.** Run the seeded command with `--print-only` FIRST to record
the routing decision as evidence, then run the local focused equivalent and
declare exactly that in `validation_evidence`. This cycle's equivalent: the
16 test files importing `src/server.ts` plus the jsdom-env
`test/operator-runtime.test.ts` (17 files / 735 tests), the full web suite
(the jsdom bump's impacted surface), `pnpm check-types`, `pnpm lint` — all
green, zero cloud CI.
