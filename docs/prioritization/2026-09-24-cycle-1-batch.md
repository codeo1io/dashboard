# Dashboard maintenance — cycle 1 batch (2026-09-24, run 6cbc2a1d)

> Selected by the prioritize phase (attempt b365970385424615a043de49983bcfc5) of conductor run
> 6cbc2a1d63e04fe0af36dcf1fa5c932c, requirement repository-maintenance:66296b08…:cycle:1.
> Sources: this run's assess (b4479de5), research (b0ed6580), roadmap extension (60538510 —
> rm-155..rm-162 added this session; base ROADMAP carries rm-100..rm-133, origin/main carries
> rm-134..rm-148). Worktree base 7809df6; origin/main tip 763c1fa (14 commits / 37 files ahead).

## Method

Every open item was scored on impact (live incident or invariant risk), risk (blow-up surface +
conflict risk with origin/main's 14-commit drift), effort (code + test + gates), dependencies
(external prerequisites, sequencing), and strategic value (unblocks landing pipeline, ecosystem
currency). One constraint dominates this cycle: **the landing pipeline is currently broken in
production state** — origin/main's Test job has failed on four consecutive pushes
(b185335 → 763c1fa, 2026-09-23) because conductor-landing 61fad97 tracked an engine-internal
breadcrumb, and the validated fix (PR #23, 0334a4eb — deletes exactly that file, PR-run Main
green at 18:39Z) sat unmerged ~18h. The batch therefore privileges: (a) de-risking the landing
itself, (b) small independent in-repo changes with near-zero merge-conflict surface, (c) zero
external prerequisites. Probe-verified this session: the planned touch set overlaps origin/main's
37-file diff ONLY in package.json/pnpm-lock.yaml (Dockerfile, test/fork-exclusion-guard.test.ts,
src/server.ts, src/routes/* carry no main-side drift — `git diff --name-only HEAD origin/main`).

## Selected batch (B0–B4, implement phase order)

### B0 — Landing hygiene gate: un-track the engine breadcrumb, protect the merge (no new code)
- Rationale: the run's CRITICAL assess finding. The merge base (d73fbe7) does NOT carry
  `.conductor/progress/70f231743fbd4e3a82afb82232a13c4d.ndjson`, but origin/main tip does (added
  theirs-side by 61fad97) — an ours-side branch can never delete a file it never had, so the
  deletion must happen AT landing: after the integrate/landing merge resolves, `git ls-files
  .conductor` MUST end empty (`git rm --cached` any hit; the file stays on disk untracked). This
  is the established protocol (memory of conflict case 8b326228; rm-131 guard reds otherwise).
- Also encode: reconcile with PR #23 before pushing (if #23 merged first, the deletion is already
  in; never re-land the file), and the pushed-sha rule — CI counts only against the exact pushed
  sha (memory ea24c5b case), never a stale tip.
- Acceptance: landing commit has empty `git ls-files .conductor`; Main green at the pushed sha.
- Effort: procedural (landing-phase checklist), zero runtime code.

### B1 — Absorb upstream f35e281 content: pnpm 11.27.1 pin move (rm-103 rider)
- Rationale: origin/main is exactly 1 commit behind upstream (f35e281, #520 — pnpm 11.27.1). The
  fork pins 11.27.0 in five sites; content-converging now (the rm-111 discipline: direct edit,
  not history merge) keeps future absorbs low-residue and takes a known-good patch release.
- Change: Dockerfile:4,24 corepack pins, package.json packageManager, and BOTH assertions in
  test/fork-exclusion-guard.test.ts:56-62 move 11.27.0 → 11.27.1 in one change (lockstep or the
  guard reds Main — the exact failure mode rm-103's refresh names). Fresh `pnpm install` to
  regenerate pnpm-lock.yaml.
- Acceptance: all five sites at 11.27.1; guard green; `pnpm lint`, `pnpm check-types`, `pnpm test`
  green; lockfile diff lockstep-only.
- Effort: ~30 min. Risk: low (patch bump; upstream shipped it behind #520).

### B2 — Publish /.well-known/security.txt (rm-161)
- Rationale: standards compliance for a public internet-facing auth surface, verified absent at
  base AND origin/main (git grep origin-main). The /privacy route already landed at base
  (src/server.ts:565-570) — the exact pattern (unconditional public route, no prefix matching)
  exists to copy.
- Change: serve `/.well-known/security.txt` (text/plain; Contact + Expires, canonical fields) via
  the same route pattern; route + schema test (fields pinned); Expires refresh recorded as a
  cycle checklist item, not calendar memory.
- Acceptance: curl shows the file at a running server; test pins route + fields; lint/types/tests
  green.
- Effort: ~45 min. Risk: minimal (new route, no main-side conflict — server.ts untouched by the
  14-commit drift).

### B3 — Close the dev-audit advisory: toml override to ≥4.2.0 (assess LOW finding)
- Rationale: `pnpm audit` full reports 1 HIGH (GHSA-82x6-q7mm-w9cf, uncontrolled recursion,
  toml@4.1.2 <4.2.0) via `.>@opencode-ai/plugin>effect>toml` — probe-verified devDep-only chain
  (`--prod` audit clean); present at BOTH base and origin/main lockfiles (line 3701). An override
  REMOVES the advisory instead of masking it (auditConfig ignore would hide future real hits);
  toml 4.2.0 is a patch-level bump for a dev-only consumer.
- Change: add `pnpm.overrides` toml → `>=4.2.0` (first override in the repo; note the convention
  in the batch's solution doc), regenerate lockfile, `pnpm audit` full → clean; tests green.
- Acceptance: `pnpm audit` (full) exits clean; `pnpm audit --prod` still clean; gates green.
- Effort: ~20 min. Risk: low (dev-only; effect's own range accepts 4.x).

### B4 — CSRF tokens for listener ack mutations (rm-115)
- Rationale: `router.post('/messages/:id/ack')` (src/routes/listener.ts:121) and `/ack-all`
  (:130) are session-authenticated mutations protected only by SameSite=Lax, while logout already
  implements the double-submit token dance (GET /auth/logout-csrf → {csrfToken},
  src/routes/auth.ts:174-176 + :193) — the asymmetry is the item's own signal. Small, fully
  in-repo, no dependencies.
- Change: ack mutations require the csrf token (same pattern as logout; the web client fetches
  the token per session); tests for token-missing rejection and the unchanged operator flow.
- Acceptance: cross-origin/no-token POST rejected; operator client flow unchanged end-to-end;
  gates green.
- Effort: ~1–2 h. Risk: moderate-low (touches the operator UI interaction; covered by tests +
  manual dev-server recipe from docs/solutions/workflow-issues/dev-server-hang…2026-06-25.md).

## Deliberately deferred (with reasons)

- rm-155 fleet self-inclusion (79.0, highest new value): requires out-of-worktree operator
  actions — repos.yaml lives on the codeo1io/.github data branch and the App install is a
  GitHub-side setting; not completable end-to-end in this cycle's tree. Queue next cycle AFTER
  the operator prerequisites land; the incident evidence stays fresh.
- rm-156 trends + rm-157 history persistence: sequencing (persistence first, both medium-large);
  next cycle's core.
- rm-158 posture audit / rm-160 attestations: depend on rm-107/rm-119 status surface and rm-105
  respectively — none landed at base.
- rm-162 alias batching: dormant by design at fleet = 1.
- rm-129 trusted-proxy rate limiter: addresses the assumed gateway-proxy topology (rm-127's open
  prerequisite) — not yet the confirmed deployment.
- rm-116 branch protection / rm-146 dependabot auto-merge: GitHub-side settings (operator
  action), and auto-merge is UNSAFE until protection exists — sequence protection first, then
  auto-merge.
- rm-147 license: blocked-external (upstream owner decision).
- rm-144 property-based tests: effort-sized for a full cycle.
- PR-pile triage (#23 merge, close #14/#15, reconcile #10/#13, close ci-validation PRs #18–#27):
  merge/close ACTIONS are landing-phase operations, not implement-phase code — encoded into the
  B0 landing checklist instead.

## Batch coherence

All five items are small-to-medium, independent, zero-external-prerequisite, and converge on one
theme: **make the next landing safe and green while taking cheap currency/hardening wins.** The
touch set (Dockerfile, package.json, pnpm-lock.yaml, test/fork-exclusion-guard.test.ts,
src/server.ts, src/routes/listener.ts, web ack-flow, new tests) overlaps origin/main's drift only
in package.json/pnpm-lock.yaml — the landing merge's known ROADMAP.md conflict remains the single
substantial merge operation.

## Verification recipe (implement phase)

1. B1: `grep -c '11.27.1' Dockerfile package.json test/fork-exclusion-guard.test.ts` = 5 sites;
   `pnpm install --frozen-lockfile` fails-before/pass-after pattern; gates.
2. B2: dev-server curl `/.well-known/security.txt`; vitest route test.
3. B3: `pnpm audit` → "No known vulnerabilities found"; `pnpm audit --prod` unchanged clean.
4. B4: vitest rejection tests; manual operator ack round-trip.
5. B0: at landing — `git ls-files .conductor` empty; Main run green at the EXACT pushed sha;
   PR #23 state checked before push.
