# 2026-10-17 · repository-maintenance cycle:2 · selected batch — run b9c4278cf53b

**Batch name:** `verification truth on the post-absorb base`
**Selected by:** prioritize attempt 7bd45550dcf648e0808d22bb037e6c26 (2026-10-17), composing on roadmap ext #47 (attempt fdff451d, band rm-1501..rm-1506 against f157cb8b:ROADMAP blob c0b4d45e). Stewardship ed8459c4. All selection probes were LIVE against origin/main **64cd2f6a** (the 2026.10.43 absorb) — post-composition state, not the composition base.
**Implement convention:** land this document as `docs/prioritization/2026-10-17-repository-maintenance-cycle-2-batch-run-b9c4278cf53b.md`.

## Members

| # | id | role | file set | effort | verification |
|---|----|------|----------|--------|--------------|
| 1 | rm-1501 (ours) | LEAD — kill the `vi.waitFor` implicit-1000ms flake family | 6 web test files + new guard `test/web-waitfor-explicit-timeout-guard.test.ts` | M | 105 call sites (106 grep hits − 1 prose comment) codemodded to explicit `{ timeout: 5_000 }` via TypeScript-parser insertion; AST verifier: 0 calls without explicit budget; guard green + negative-verified (one regressed site → precise `file:line` failure); focused web suite 6 files / 330 tests green on TWO consecutive runs on the contended host |
| 2 | rm-1505 (ours) | migrate the CI Design Check to impeccable v4 | `.github/workflows/main.yaml`, `web/privacy.html`, `AGENTS.md` | S/M | gate command verbatim at `impeccable@4.6.0` → `[]` rc=0; `ignoreValues` honored proven by negative control (non-ignored bounce curve flags, the ignored `--ease-spring` token does not); privacy.html declares explicit role sizes mirroring the Tailwind scale at every breakpoint; `.opencode/impeccable/plugin.test.ts` 33/33 green; actionlint rc=0; `pnpm build:web` rc=0 with the `<style>` block surviving minification |

## Key implement-time discoveries (this phase, first-hand)

1. **vitest here is 4.1.11, not 5.0.5** (the selection's assumption; vitest 5 is date-gated 2026-10-21). `WaitForOptions` in the installed types carries `interval` (default 50ms) and `timeout` (default 1000ms), per-call only — **no config-level knob exists**, so per-site explicit budgets are the only mechanism; the guard carries the invariant. (The selection's "prefer config if one exists" branch is therefore closed, as it instructed.)
2. **The 106th grep hit is a prose comment** (`runtime.test.ts:1216`, "Poll on real timers. vi.waitFor would advance the fake clock…"), not a call — the true call census is **105 sites**, and one of them (`runtime.test.ts:3527`, the `waitFast` helper) already carried `{ interval: 1 }` with no timeout; the codemod injected `timeout: 5_000, ` as a member instead of appending a second options object.
3. **Tailwind utilities are opaque to the detector, and unlayered CSS beats Tailwind's layered utilities** — the privacy.html cure is a `<style>` block whose values mirror `text-4xl sm:text-5xl` / `text-2xl sm:text-3xl` at base and ≥640px exactly, so rendering is pixel-identical while `flat-type-hierarchy` sees the real 16→24→36px hierarchy (steps 1.5×). Inline-style variants were rejected: inline beats the `sm:` media-step classes and would freeze the h1 at 36px.
4. Root eslint ignores `web/**` entirely; the lintable changed surfaces are the guard test, `main.yaml`, and `AGENTS.md` (all rc=0 after one `--fix` indentation).

## Rationale

Both legs harden the fleet's verification SIGNAL on the freshly absorbed base — no spurious reds from `waitFor` defaults, no stale-major design gate. No product code, no lockfile, no visual baselines, no workflow-security surface (sibling 5723bb0a owns that P0 lane), no upstream patch application. Each leg is independently green and independently landable. Full selection rationale, fleet scan, and deferral table: `delegate/7bd45550dcf648e0808d22bb037e6c26-scratch/batch-selection.md`.

## Fold map (never double-implement)

- **Unlanded 15xx-band id collision** (5723bb0a's mint band rm-1501..rm-1505 = markdown absorb / sink-ban / tombstone-stance / node:sqlite / logger-ladder vs our ext#47 band) — **different content under the same ids**; landing reconciles BY CONTENT, first-landed-wins renumbers (ext#44 precedent). Always refer to defs by title.
- **rm-1502** (markdown #646 port) — deferred next-cycle lead; HIGH effort, sequencing behind the #643 stance settlement.
- **rm-1503** (finished-run re-show React port) — vanilla twin already absorbed (`clearFinishedRuns`); ledger reconciliation is 5723bb0a Leg 5.
- **rm-1504** (#628 launch prompt) — LOW value per own research, contested `Operator.tsx`; defer.
- **rm-1506 residue** (npm minors) — contested lockfile churn; fold into the next currency batch.
- Assess F2 (platformStatus validation) — implemented-unlanded by 43cf6bc3. Assess F3 (`AGENTS.md:105` v0.122.1→v0.122.3) — claimed by d495512f.

## Fleet collision scan at implement time (re-run this phase)

`run-5723bb0a` holds only `test/operator-*` server-side files (7 claims, none in `web/src/operator`), `run-6f9b600f` / `run-b1949a6a` hold `AppShell.test.tsx` additive lanes; `main.yaml` (comment/pin) and `web/privacy.html` are uncontested in the fleet. origin/main re-probed at implement start: **64cd2f6a, unchanged since selection**; the worktree fast-forwarded edf948de → 64cd2f6a (0 ahead, pure ff, no commit created) before any edit.

## Implementation record (implement attempt 8abf9099)

- Base: 64cd2f6a (fast-forward from dispatch-base edf948de, porcelain-clean before and after edits except the batch's own 10 files).
- Leg 1: TS-compiler-API codemod (scratch at `/tmp/impl-b9c4278c/codemod-waitfor.mjs`, never inside the repo) — 105/105 sites explicit; 105 insertions / 105 deletions, zero line-count change; includes the proven-flaky shared `ready()` helper (`runtime.test.ts:840`).
- Leg 2: `main.yaml:82` pin `3.2.1`→`4.6.0` with re-anchored comment; `AGENTS.md` pin paragraph rewritten for v4 (the "bump in both places" pair); `web/privacy.html` `<style>` role-size block with lockstep comment.
- Validation (focused, per phase budget): root vitest guard + plugin test 33/33; web focused suite (the 6 impacted files) 330/330 twice; `pnpm check-types` rc=0 (3 projects); eslint on lintable changed files rc=0; actionlint on `main.yaml` rc=0; `pnpm build:web` rc=0; impeccable 4.6.0 gate command `[]` rc=0.
- Full-repo validation (both suites twice, `pnpm audit`) reserved for the later gate per the phase budget.
