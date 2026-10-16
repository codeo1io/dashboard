---
module: roadmap
tags: ['prioritization', 'cycle-1', 'upstream-wave', 'cherry-pick', 'operator-experience']
problem_type: workflow-issue
owner: dashboard
run_id: b32edf886e18451fb5e309b6448c56af
---

# Implement batch — rm-1465 'contract-neutral upstream wave cherry-picks'

Base 7042635 (== origin/main at cycle start) + the cycle's uncommitted
ROADMAP extension (roadmap f105a8b5: rm-1465/rm-1466 mints + 8 riders).
Implement attempt 2294f78fbd6b4e95926edd8c8a4c1eec. Selection artifact:
prioritize 6a7ad1b0 `batch-selection-2026-10-16.md`; stewardship 76fe4886.

Selection recap (why this batch): 20 upstream PRs merged past rm-252's #620
horizon (2026-10-14T23:27Z → 2026-10-16T05:23Z, newest #643 at 896a004c) with
zero fork ledger presence. rm-1465 deliberately carries NO operator-contract
dependency, so it stays implementable while rm-252's gateway-estate verdict is
pending.

## Per-PR dispositions (the B3 applicability diffs, resolved)

| Upstream | SHA | Disposition |
| --- | --- | --- |
| #634 scroll-into-view run cards | de2ce7fd | **PORTED (B1)** |
| #641 release-version footer | 3b2f774e | **PORTED (B2)** |
| #636 approval-prompt click containment | 5581a49c | **PORTED (B3 code + tests)** |
| #643 run-index finished-run cache + reopen | 896a004c | **NOT PORTED — blocked** |
| #637 sign-in-recovery visibility fix | bcdcb467 | **NOT PORTED — no fork target** |
| #629 iOS install steps / #631 subscription read | — | proven fork-native at research; no port |

### PR #634 → B1 port (upstream de2ce7fd: runtime.ts +70/-1, runtime.test.ts +212/-1, index.css +1)

Ported `scrollRunCardIntoView` into `web/src/operator/runtime.ts` at the
fork's restore seam. Fork mapping: upstream's jump target ≡ the fork's
hash-restore path (`onRestoreRun`; the fork has no `requestRunJump` machinery
— jumps arrived upstream with the estate-gated #619/#623 wave). Mechanism
verbatim: immediate `scrollIntoView({block: 'start', behavior})` with
`prefers-reduced-motion` → `'auto'`; MutationObserver
(`attributeFilter: ['hidden', 'data-expanded']`, subtree) watching for a
question/approval region reveal; double-rAF re-scroll; cancellation on
wheel/touchmove/pointerdown, scroll-intent keys (input-target keys exempt),
another card's selection, card collapse, runtime cleanup; 10 s expiry.
Launch (`onRunLaunched`) deliberately does NOT scroll (launch is not a jump —
pinned by test). `web/src/index.css` `.run-card` gains
`scroll-margin-top: calc(var(--space-12) + var(--space-4))` (sticky header
clearance). 14 new tests in `web/src/operator/runtime.test.ts` (71/71 file
total) incl. reduced-motion, late reveal, every cancellation path, expiry
(fake timers installed BEFORE the jump, matching upstream), collapsed-before-
paint, input-key exemption, cleanup cancel.

### PR #641 → B2 port (upstream 3b2f774e: AppShell.tsx +29/-8, AppShell.test.tsx +32, release.yaml +22/-30, Dockerfile +2, no-tracking +5/-7)

- `web/src/shell/AppShell.tsx`: footer version element after the rm-596
  Restore-notifications button. `import.meta.env.VITE_DASHBOARD_VERSION || 'dev'`;
  calver-shaped (`/^\d{4}\.\d{2}\.\d+$/`) versions link to
  `github.com/codeo1io/dashboard/releases/tag/<version>` (fork-adapted URL —
  upstream points at fro-bot), `noopener noreferrer`; anything else renders
  plain text. Build-time constant only — no gateway or contract reads.
- `.github/workflows/release.yaml`: `🔧 Set up Node.js` (node-version 24) +
  `🏷️ Compute release version` (`id: version`, fetch tags, compute-release-tag)
  inserted BEFORE the image build; build step passes
  `build-args: DASHBOARD_VERSION=${{ steps.version.outputs.tag }}`; the old
  post-scan setup-node step removed; the `🏷️ Create release tag` retry loop
  replaced by a one-shot create of the precomputed tag (footer version ≡ minted
  tag by construction).
- `Dockerfile`: `ARG DASHBOARD_VERSION=dev` + `ENV VITE_DASHBOARD_VERSION=…`
  immediately before `RUN pnpm build:web` (local fallback 'dev').
- `web/src/privacy/build-output-no-tracking.test.ts`: ALLOWED origins gain
  `https://github.com` — proven load-bearing: `pnpm build:web` rebuilt, bundle
  `web/dist/assets/index-De5OsidE.js` contains
  `codeo1io/dashboard/releases`, suite 11/11.
- 3 new tests in `AppShell.test.tsx` (37/37): dev + undefined → plain text;
  calver '2026.10.25' → link with href/target/rel; non-calver 'v1.2.3' → no
  link. `vi.unstubAllEnvs()` added to afterEach.

### PR #636 → port (upstream 5581a49c: operator-stream.js +2, approval-click.test.ts new)

`public/operator-stream.js`: container-level `click` listener calling
`stopPropagation()` on the approval prompt (`aria-label: Approval prompt`) and
the cancel control (`aria-label: Cancel run`). Fork gap was real: buttons
carried per-control stopPropagation but prompt text / status / padding clicks
bubbled to the card's activate listener → collapse + stream close + lost
decision. New real-stack suite `web/src/operator/approval-click.test.ts`
(9 tests): only `fetch` is stubbed; real runtime loader + real run index +
real stream + real browser approval client. Fork adaptations: run-list fixture
status `running` (fork summary projector rejects stream-only statuses);
decision/CSRF/approvals arms match fork operator paths; decision POST asserted
with `x-csrf-token`. Pins: Once/Always+Confirm/Reject send exactly one
decision and never collapse the card; Always→Cancel returns to the three
buttons with nothing sent; cancel-control arm/dismiss/status-area clicks never
collapse; keyboard activation (Enter/Space) never collapses; card click
outside the prompt still collapses + aborts the stream.

### PR #643 → NOT PORTED (blocked, no code change)

Upstream's finished-run cache + reopen (`onListApplied`, openRunCard on
reopen, 17 files) destructures #623's waiting-card surfaces (`timeEl`,
`waitingEl`) and builds on the #619 notification-jump machinery — neither
exists in this fork (estate-gated contract-1.11.0 family, rm-252). Porting
would pull contract-carrying surfaces into a deliberately contract-neutral
batch. Deferred to ride the rm-252 absorb wave.

### PR #637 → NOT PORTED (no fork target)

Patches `web/src/operator/sign-in-recovery.ts`, which does not exist in this
fork (module arrived with unabsorbed upstream #633). Nothing to fix; recorded
for the future absorb of #633.

## Contract-neutrality proof

`PINNED_CONTRACT_VERSION` untouched (`public/operator-stream.js:33` =
`'1.9.0'`, twin `src/gateway/operator-contract/version.ts:15` untouched); no
`operator-contract/` file touched; the batch adds zero gateway reads (footer
version is a build-time constant; scroll is pure DOM).

## Gates (focused/impacted only, per phase budget)

- `pnpm check-types` → EXIT 0 (server + web + .opencode)
- `pnpm lint` (full, cached) → EXIT 0
- actionlint 1.7.12 (container) on `.github/workflows/release.yaml` → EXIT 0
- `vitest run --config web/vitest.config.ts`:
  runtime.test.ts + approval-click.test.ts → 80/80;
  AppShell.test.tsx → 37/37; build-output-no-tracking.test.ts → 11/11
  (after `pnpm build:web`, green)
- `pnpm build:web` → green (dist regenerated; precache 3 entries)

Full-repo validation (`pnpm test` incl. suites hitting `/`, twin-parity
suites) and landing are reserved for the full_tests / merge-release gates.

## Verify

1. `git -C <worktree> status --porcelain` → the changed files below (plus the
   cycle's pre-existing ` M ROADMAP.md` extension, now also carrying the B4
   status flip).
2. `pnpm check-types && pnpm lint`
3. `pnpm build:web && pnpm exec vitest run --config web/vitest.config.ts
   web/src/operator/runtime.test.ts web/src/operator/approval-click.test.ts
   web/src/shell/AppShell.test.tsx web/src/privacy/build-output-no-tracking.test.ts`
4. `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.12 -no-color
   .github/workflows/release.yaml`
5. Contract pin: `grep -n "PINNED_CONTRACT_VERSION" public/operator-stream.js
   | head -1` → still `'1.9.0'`.

## Changed files

- `web/src/operator/runtime.ts` (+~104: scroll helpers, 4 wiring points)
- `web/src/operator/runtime.test.ts` (+14 tests, new describe block)
- `web/src/operator/approval-click.test.ts` (new, 9 tests)
- `web/src/shell/AppShell.tsx` (+version computation + footer element)
- `web/src/shell/AppShell.test.tsx` (+3 tests, afterEach unstubAllEnvs)
- `web/src/index.css` (+1 declaration)
- `web/src/privacy/build-output-no-tracking.test.ts` (ALLOWED + comment)
- `public/operator-stream.js` (+2 containment listeners)
- `.github/workflows/release.yaml` (version step, build-arg, step removal, one-shot tag)
- `Dockerfile` (ARG/ENV version)
- `ROADMAP.md` (rm-1465 status flip + evidence, on top of the cycle's extension)
