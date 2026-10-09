# Dashboard roadmap prioritization — 2026-10-08, repository-maintenance cycle:2 batch (conductor run e328be89cd89456fb8421e8241324798)

Base b658cb60 (origin/main triple-verified at stewardship; worktree ff'd clean from 5aab7c7 before edits; three integrates landed between the prioritize base e8d220c and this fold — 9aceea8, 6037d8f, b658cb60 — none touching web/ or public/). This run's assess 3f460c85 + research c8bc8497 + roadmap e30e92fa (ext#29) + prioritize d962474b + stewardship 8630092f precede this implementation. Ledger state at implement start: 236 defs, 0 duplicate ids, max rm-744 (all-lineage ceiling including unlanded sibling claims is rm-754; next free rm-755). This document records the cycle:2 batch implementation; ledger def lines carry the status flips and evidence riders.

## Batch implemented this cycle — "Operator run-card truth: expiry, detach, and time"

One operator run-card state-machine unit closing the three highest-impact open upstream issues (fro-bot/dashboard #583/#584/#585, all authored 2026-10-06/07, all open at mint). Display/truth-layer only; the read-only invariant is untouched by construction (no server capability added, no write code path). All work in public/operator-stream.js + its d.ts twin, web/src/operator/runtime.ts, web/src/index.css, test/operator-stream-core.test.ts, ROADMAP.md.

### U1 — rm-715 expired-run-snapshot recovery (#583, priority 58)

The defect: a run whose gateway snapshot was released (expiry) leaves a dead card — the stream resets with reason `no-snapshot` forever, the shell retries until exhaustion, then renders a generic failed connection.

Implemented browser-side classification at retry exhaustion in public/operator-stream.js: when a `no-snapshot` reset arrives for a non-terminal run entry and `retryCount >= RETRY_MAX_COUNT`, the entry is marked `expired`, the connection goes `closed` with `shouldReconnect: false`; below budget the pinned transient semantics hold exactly (reconnect, no expiry mark). Render: the closed-branch renders fixed notice copy ("Run snapshot expired — output is no longer available.") plus a gateway link (`GATEWAY_RUN_LINK_PREFIX + encodeURIComponent(runId)`, class `operator-expired-link`) and clears the output element; the status label reads Expired via the `STATUS_LABELS['expired']` entry. `toSafeRunView` passes `expired` through, and the .d.ts twin mirrors the field.

Adjudication (research c8bc8497 R1): NO server-side classification was minted — the gateway owns the wire and the dashboard proxies `/operator/*` pass-through edge (no-dashboard-proxy invariant), so the fork classifies expiry where the retry budget lives. Upstream's own cure is the same clear-card-and-link shape; the fork adds the bounded-retry-then-expiry distinction upstream lacks.

### U2 — rm-716 stale cancel on detach (#584, priority 42)

The defect: the cancel affordance survives stream close/detach, leaving a clickable cancel that throws "runtime error: local stream not found".

Two layers: (1) public/operator-stream.js `close()` now disposes the cancel control and clears `cancelEl` contents at teardown; (2) web/src/operator/runtime.ts's detach path clears the same element on the detached card (belt-and-braces — covers collapse/switch paths that skip the shell's close). The operator-launch.js:703-706 affordance is covered by these layers; no launch.js edit was needed.

### U3 — rm-717 run-card timestamps + waiting state (#585, priority 34)

The defect: run cards render no lifecycle time and a pre-run card shows nothing while waiting.

public/operator-stream.js renders timestamps into a new `timestampsEl` (started, finished, total — each rendered once per card via a `renderedStartedAt`/`renderedFinishedAtMs` memo so repeat status frames do not duplicate lines; `formatRunTime` helper formats ISO instants), and shows a "Waiting to start…" notice while a live run's status is queued/blocked, cleared on running/terminal — the standing "notice hidden while running" pin is preserved. web/src/operator/runtime.ts discovers/creates the element (`ensureRunTimesElement`, placed after the card's existing time element) and threads it through InitOptions; web/src/index.css styles `.run-times`. Web-side copy.ts intentionally unchanged: the stream shell owns all live notice copy.

### U4 — F7 snapshot byte-cap truth fix (XS, NO mint — cured upstream of this batch)

Assess finding F7 (UTF-16 code units vs BYTES-named cap in src/github/snapshot-store.ts) was CURED on main between prioritize and implement by sibling run 5b333105's rm-701 landing (f4ecf86 → 9aceea8 → b658cb60): `utf8ByteLength()` via `Buffer.byteLength(value,'utf8')` with byte-true caps at :37-38/:106/:132 plus test/snapshot-store.test.ts. This batch verified the cure (multi-byte over-cap coverage present) and wrote the dated rider on rm-198's lineage crediting rm-701 — no code change, landed files untouched. Landed meanings own ids.

### U0 — ext#29 ledger fold (mandatory integration)

ext#29 (5 mints rm-715..rm-719 + 5 dated riders) folded by content-union at b658cb60: landed records kept verbatim, mints appended at the Open-items tail with status flips rm-715/716/717 → implemented (red-first evidence riders), rm-718/719 stay candidate; riders inserted at their anchors (pnpm 12.10.1, dependabot 0-open, gateway v0.118.2 window, TS/vitest no-movement, qemu v4.44.0); the rm-198 U4 rider; ext#29 comment verbatim + an implement-fold comment owning the newest census claim and superseding ext#29's stale "next free rm-720" (true at compose base 5aab7c7) with the fresh all-lineage re-probe (committed ceiling rm-744, all-lineage rm-754, next free rm-755). Census after fold: 241 defs / 0 dups / max rm-744; guard pin stays `expect(live.max).toBe(744)`.

## Verification (focused/impacted suites only, per the phase budget)

- test/operator-stream-core.test.ts — 375 passed (368 pre-existing incl. the transient no-snapshot and terminal pins + 7 new: expiry reducer at exhaustion, transient-reconnect re-pin, expired-card DOM render with gateway link + cleared output, cancel-hide on close, timestamps render once, waiting notice for queued, plus wireFetchResponse keepOpen seam).
- test/operator-run-index-core.test.js (twin-parity gate) — passed (no FailureKind/label changes made; gate run as a guard per the parity trap).
- test/operator-runtime.test.ts + test/operator-launch-core.test.ts — passed (runtime seam changes and detach layer verified).
- test/operator-ui.test.ts — 85 passed after `pnpm build:web` (documented pretest trap: direct vitest bypasses pretest and needs a fresh web/dist; the build also compiles runtime.ts/index.css through the Vite pipeline).
- test/roadmap-integrity-guard.test.ts — 8/8 (census 241/0/744 == newest-claim comment; guard pin 744).
- `pnpm check-types` — clean (server + web + .opencode), including the runtime.ts InitOptions threading.
- `eslint` on ROADMAP.md — rc=0 (markdown traps avoided); eslint on changed JS/TS/CSS files — rc=0. (Fold-gate re-verification attempt 1f897402 found the first pass had read `rc=0` through a `| tail` pipe — the true rc was 1 on one `unicorn/escape-case` error, `\u00b7` → `\u00B7` at public/operator-stream.js:2336; fixed, and rc re-confirmed 0 with `set -o pipefail`. All suites above re-run green post-fix.)
- Red-first evidence: each unit's new tests were written and run against the un-edited module first (expired-classification/ cancel-hide/ timestamps+waiting all red), then green after the edits; recorded per-def in the ledger riders.

## Considered and deferred (unchanged from prioritize; re-adjudicated at implement)

- rm-718 sanitized-markdown (#586) — own cycle: net-new DOMPurify-class dependency + sanitizer red-proofs; deliberately not this batch's zero-dependency lane.
- rm-719 infra-only App dispatch (#112) — decision-blocked on rm-714's surface decision.
- rm-157/rm-252 contract-1.8.0 catch-up — deploy-gated, decision due 2026-10-13.
- rm-116 branch-protection fill — landing-pipeline precondition check (PR-based pipeline, no sibling validation in flight) still owed at its own phase.
- Canonical-checkout ff (assess F5, 33 behind) — landing-hygiene lane, not this batch.
