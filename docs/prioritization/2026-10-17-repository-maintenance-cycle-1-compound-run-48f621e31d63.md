# Cycle 1 compound — operator-correctness ports + hygiene riders

Date: 2026-10-17 · Campaign: repository-maintenance (run `48f621e31d63`) · Base: `3e3664c` (= origin/main at cycle start)

## What this cycle did

Five roadmap items implemented, all ported from the unabsorbed upstream window
(releases 2026.10.24–2026.10.38) with fork discipline preserved:

- **rm-866 approval-click containment** — the approval-prompt and
  cancel-control roots now stop click propagation, ported byte-identical to
  upstream `5581a49` (#636). Pre-fix proof: 8/9 approval-click tests RED at
  base (clicking Once/Always/Confirm always/Reject or the cancel status text
  collapsed the run card and aborted its stream); all green after, including
  the card-itself-still-collapses control. **Evidence:** `git diff` between the
  upstream fix and this batch's `public/operator-stream.js` hunk is empty;
  `web/src/operator/approval-click.test.ts` (jsdom, real
  runtime+run-index+stream stack).
- **rm-869 sign-in recovery** — landed at the post-#637 END STATE in one step:
  `sign-in-recovery.ts` with the once-per-tab sessionStorage guard existed from
  the first commit; the #633-only intermediate (60s re-arm redirect loop) never
  existed on this fork. Runtime now reports `auth-required` and the Operator
  view renders a Sign in button. 5 RED at base → green.
- **rm-870 UX ports** — restored-hash run cards scroll into view
  (`block: 'start'` + `.run-card` scroll-margin-top, upstream `de2ce7f`) and
  iOS Home Screen install steps in the notifications copy (upstream
  `c295181`). The sw `SKIP_WAITING` half of #634 was deliberately NOT ported
  (the fork's 65-line kill-switch service worker has no waiting clients).
- **rm-871 pin riders** — codeql-action digest `6f2ac81f` (v4.39.0,
  deref-verified through the annotated tag) at all four sites, setup-node
  `949feb24` (v7.1.0) at all five sites, fro-bot/agent `7d273ac6` (v0.122.3),
  Dockerfile NODE_IMAGE digest refreshed against the Hub manifest index,
  `@types/node`/`@opencode-ai/plugin` bumped to the newest versions clearing
  `minimumReleaseAge` 1440 (plugin 1.19.0 — 1.19.1 is sub-24h and rejected by
  design), lockfile regenerated. actionlint (container form) clean on all 10
  workflows.
- **rm-872 doc-truth half** — the stale `disabled_manually` claims in
  `fro-bot.yaml` and `AGENTS.md` corrected to the live truth (workflow ACTIVE,
  no `FRO_BOT_PAT`, Actions suspended GitHub-side since 2026-10-09). The
  enable/disable + PAT decision is a gate-level remote mutation, intentionally
  not a repo edit.

Plus one unplanned-but-necessary rider: the **operator-dark visual baseline**
regeneration (see the lesson doc below).

## Validation trail (pre-review)

- Implement battery (Node v24.21.0): `pnpm check-types` exit 0; `pnpm lint`
  exactly the 50 pre-existing ROADMAP.md problems (47 trailing spaces + 3
  label-refs), zero from touched files; `pnpm test` 59 files/3068 + 37
  files/1269 green.
- Targeted validation (7 changed testable surfaces): frozen install, actionlint
  on all workflows, eslint on touched yaml, the operator-run-index core suite
  (194 tests), the 8 web suites for every touched surface, check-types — all
  RC=0. Digest `validation:v1:8dfbdb40…` identical before and after (no
  executable-surface change in targeted scope).
- Full validation: ephemeral PR #782 all green (Main job: Lint / Check Types /
  Test / Test Scripts Load / Check Workflows / Design Check; CodeQL; Dependency
  Review; visual 3/3 after the baseline rider). Fro Bot job SKIPPED (tolerated
  bucket — the workflow cannot run without `FRO_BOT_PAT`).

## Lesson compounded

`docs/solutions/workflow-issues/visual-baseline-staleness-masked-by-playwright-trio-drift-2026-10-17.md`
— a lane that dies at browser launch (Playwright lockfile/image trio drift)
masks a stale visual baseline; cure = attribute first (pristine-base kill proof
+ pin-only control tree + md5-identical actuals), then regenerate only the
stale PNG inside the pinned image. GOTCHA recorded: baseline PNGs are
executable-classified, so regenerating one moves the validation digest
(`97716cf6…` → `a659ee49…`); the review gate must see the emission-time digest.

## What we are not doing yet (next-cycle candidates)

- **rm-867 subscription-list read** and **rm-868 contract 1.11.0 adoption**
  (both deprioritized @13/@11): deployment-gated — flipping the wire shape or
  the contract pin blind risks the live operator surface against the deployed
  gateway. Prereq: a gateway probe (a `marcusrbrown/infra` checkout with
  repo-root `.env`, or a gateway-side version witness). The absorb window is
  still growing (re-derive at implement; `.38` was the head at research time).
- **#615 push notification text** — rides rm-868's pure-module absorb (dead
  code on this fork until a push host exists).
- **Node 26 LTS window (2026-10-28)** — the rm-139 family owns the engines
  move; v24 is security-only from 2026-10-20 but EOL 2028-04-30.
- **Playwright trio structural fix** — this cycle's minimal cure pins
  `@playwright/test` to exactly `1.63.0` in the lockfile; aligning the caret
  range and the visual.yaml image to a newer minor is dependency maintenance
  (new baseline regen required in the same change).
- **Restore family / PR debris / branch protection fill** — unchanged standing
  items (see the cycle-1 assess artifact for the live evidence pointers).

## How to verify

- `git diff 5581a49^ 5581a49 -- public/operator-stream.js` vs this branch's
  hunk: byte-identical (rm-866 parity).
- `pnpm exec vitest run --config web/vitest.config.ts src/operator/approval-click.test.ts src/operator/sign-in-recovery.test.ts src/operator/runtime-auth-recovery.test.tsx` — the three new/ported suites.
- Full-suite receipt: PR #782 (closed, refs auto-deleted) checks all green;
  visual green run 38963628752; Main run 38963628739.
- Baseline rider: `tests/visual/__screenshots__/…/dashboard-operator-dark-chromium-linux.png`
  md5 `e397a0539cf3fc84cd5129a5675d766a` == the failing actual PNG (control and
  delta byte-identical); sibling baselines untouched (md5 census in the
  full-tests artifacts).

## Follow-ups for next cycle

- Acquire the gateway probe path (or mint a witness item) to unblock
  rm-867/rm-868; re-derive the absorb window at that cycle's research phase.
- Ledger: the Playwright-trio pin rule deserves a standing item (caret range,
  lockfile resolution, and visual image pin must agree; any fixture-content
  growth regenerates baselines in-image in the same change).
- Prior-attempt forensics from this cycle: a fold-rejection for a missing
  attestation (KTD13) costs a full re-attestation round — declare
  changed_surfaces in the same attempt that produces them; a reaped attempt
  with no typed artifact is unadoptable — check the event log before assuming
  work is lost.
