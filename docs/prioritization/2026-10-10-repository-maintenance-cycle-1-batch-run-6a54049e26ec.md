# Repository maintenance — cycle 1 run 6a54049e26ec (2026-10-10, batch selection)

Phases: assess e13eda7c (forensics of dead attempt 8013d18d: heartbeat-only reap,
nothing to adopt) · research 675f378d · roadmap 2718d779 · prioritize d0b01045
(this doc). Status: implement and later phases follow; nothing of this run has
landed.

- **Run / phase**: conductor run `6a54049e26ec4d5da0130b56c893fd22`
  (repository-maintenance `7c82773c266049cbb0165bd2bebaef37`, cycle 1), phase
  **prioritize**, attempt `d0b01045967b427ab2a9ea99783a9942`.
- **Composed at**: base `d2b1acf93dc852eee5160b98c30a212faefd5520` == live
  `origin/main` (verified this attempt; worktree porcelain 0 throughout). The
  roadmap phase's extension is an apply-ready spool patch —
  `delegate/roadmap-2718d779810c4068b97add9cb7b3fe6a.patch` (md5
  `e4e827d8f21c6abc4d8491b372e4430b`, apply-check green on pristine d2b1acf;
  census 261/0/904 with the guard pin 866→904 riding) — so **this selection's
  member definitions rm-902/903/904 live in that patch**: implement applies it
  FIRST (chain order: roadmap patch → this doc's patch → batch source changes),
  or the implement work order carries the defs forward from the spool result.
- **Inputs**: this run's assess `e13eda7c` (six findings F1–F6, all
  first-hand-grepped at base), research `675f378d` (gateway v0.119.0/contract
  1.9.0 evidence, absorb window 29, toolchain re-measures), roadmap `2718d779`
  (4 mints + 5 riders + screened-owner map), and a fresh open-ledger census
  re-derived this attempt (top open items by priority listed below — no
  higher-value unowned locally-verifiable item is starved by this selection).
- **Skill routing disclosure**: no `ce-*` skill package is installed in this
  delegate env (`~/.agents/skills` → agent-reach only; repo `.agents/skills` →
  impeccable only) — same disclosure as the sibling runs recorded in prior batch
  docs; the fleet's house process for this phase is followed directly (five-axis
  scoring over the open ledger, one coherent batch, drop order, dual-build
  avoidance probes).

## Five-axis prioritization of the candidate pool

Candidates = this run's four mints (rm-901..904, the freshest first-hand-evidenced
pool) + the strongest free landed items. Scale 1–5 (higher = more). Every code
claim re-verified at base this attempt (retraction law: no remembered greps).

| Item | Impact | Risk-of-inaction | Effort (inverse) | Dependency-freedom | Strategic | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| rm-902 approval prompt amended re-ask (cx 62.0) | 4 | 4 | 4 | 5 | 3 | **SELECT (headliner)** |
| rm-903 browser fetch byte caps ×9 (sec 52.0) | 4 | 3 | 3 | 5 | 4 | **SELECT** |
| rm-904 SSE accounting truth + hygiene (tool 35.0) | 3 | 3 | 3 | 5 | 3 | **SELECT** |
| pin-tail: codeql digest + upload-artifact v7.0.2 + plugin 1.18.35 | 2 | 2 | 5 | 5 | 3 | **SELECT (ride)** |
| rm-901 v0.119.0 stream lifecycle parity (rel 56.0) | 4 | 3 | 2 | 2 | 4 | **DEFER — dependency**: needs rm-120 clone refresh ≥v0.119.0 for first-hand gateway-source fixture truth (clone at v0.78.0, 41 minors stale) |
| rm-898 1.9.0 consumption (fleet 85.0-equiv) | 5 | 5 | 3 | 0 | 5 | **DEFER — fleet-owned**: c07a6b75's mint; implementation already BUILT UNLANDED by cb6061a358f2 (1251L/22 files) — the unblock is an integrate, not an implement |
| rm-281 CodeQL PKCE false-positive (sec 62.0) | 3 | 3 | 3 | 1 | 3 | **DEFER — CI-gated** verification during the Actions disable |
| rm-249 push SW restore (cx 72.0) | 4 | 3 | 1 | 3 | 4 | **DEFER — next-cycle size** |
| rm-117 security-posture panel (sec 70.0) | 4 | 2 | 1 | 4 | 4 | **DEFER — next-cycle size** |
| rm-116 required checks on main (rel 58.0) | 3 | 4 | 3 | 1 | 4 | **DEFER — CI-gated** (checks cannot be observed in force while disabled) |
| rm-501 web-client timeout discipline (cx 44.0) | 3 | 3 | 2 | 4 | 3 | **DEFER — distinct surface** (web/src React client vs public/ pages); kinship with rm-903 noted for a future shared helper |
| rm-599 healthz no-store (rel 10.0) | 1 | 2 | 5 | 3 | 1 | **DEFER — selection-taken** by fefc4067 B3 (2026-10-04, unlanded); rm-904's healthz touch is body-fields only, orthogonal |

## Selected batch — operator-surface trust closure (assess F-set retirement)

**Theme:** retire this run's assess finding set end-to-end — the one user-visible
browser defect (F1), the browser's missing byte-cap parity with its landed
server twin (F2), the accounting/hygiene truths (F3–F6) — plus the absorb-window
pin tail that closes rm-252's actionable residue ahead of its 2026-10-13 due
date. All members are locally verifiable (no CI dependency), touch a coherent
file set (`public/operator-stream.js` ×3 members, `public/operator-run-index.js`
+ `public/operator-launch.js` via rm-903, `src/gateway/operator-sse-reader.ts` +
`src/listener/store.ts` + `src/routes/api.ts` + `src/gateway/operator-contract/
run-summary.ts` via rm-904, workflow YAMLs + package.json via the pin ride), and
share fixtures across members.

| Member | Why selected | Acceptance shape (from the mint defs) |
| --- | --- | --- |
| rm-902 (headliner, cx 62.0) | `public/operator-stream.js:2755`: the render gate is `if (!renderedPrompts.has(prompt.requestID))` — prompts already in the map are never re-rendered — while the reducer at `:1091` replaces the open-prompts map entry on an amended duplicate-open ("add/replace ... idempotent", model updated). An amended re-ask for a requestID already on screen therefore updates the model but never reaches the DOM: the single operator stares at stale prompt content. (Mechanism corrected this attempt by direct read — the assess's and the mint def's "amendedDecisionId early-return" phrasing is shorthand; no such identifier exists in the file. The def's line citation :2755/:1091 is exact.) Highest-priority unowned implementable item in the ledger | failing reproduction fixture first (open prompt + amended duplicate-open for the same requestID → assert the stale content is replaced), then the gate fix honoring model replacement when already rendered; no first-open or rm-864 label regressions; no MAX_OPEN_APPROVALS cap interplay change |
| rm-903 (sec 52.0) | nine browser-direct JSON fetches parse bodies with no byte bound — `await res.json()` at operator-stream.js:1581,1652,1682,1835,1903 + operator-run-index.js:237 + operator-launch.js:247,263,309 — while every server input path is capped (rm-822's fetchJson cap landed at ba92ac3; MAX_SSE_BUFFER_BYTES readers; listener ingest); a hostile or wedged upstream streams an unbounded body into the operator's tab | one shared browser cap helper (declared Content-Length pre-check + incremental read bail, cancel-on-fence) at MAX_SSE_BUFFER_BYTES parity per the rm-822 best-practice rule, all nine sites; over-cap UX parity with error paths (no silent hang); helper tests + ≥1 site integration test; no behavioral change under the cap |
| rm-904 (tool 35.0) | four truths in one sweep: SSE byte accounting recomputes `encoder.encode(buffer).length` per frame (operator-sse-reader.ts:559, public/operator-stream.js:3052 — quadratic total) while the docstring at `:38-42` claims "maintained incrementally"; `src/listener/store.ts:59` is the only non-test console call in src/ (rm-187 chose per-read console.warn — revise to the structured logger keeping its acceptance green); healthz returns the rm-699/rm-224-era `{lastFetch, rateLimit}` block no consumer reads; run-summary.ts:64,68 accepts empty-string run ids (browser twin included) | either truly incremental accounting or an honest docstring, pinned by a test either way; logger migration keeping rm-187's degrade-to-empty-list test green; healthz body-field trim after a consumer grep (header half stays with rm-599's lane); id rejection/normalization with tests on both surfaces |
| pin-tail ride (rm-252 residue) | the absorb-window decision is due 2026-10-13 and its actionable residue is exactly three mechanical bumps: codeql-action digest 2892aa5(v4.38.2)→24c5418 (codeql.yaml:56,62, from upstream #589), upload-artifact v7.0.1(043fb46d)→v7.0.2 (release.yaml:350, scorecard.yaml:44, visual.yaml:101,109, upstream #580), @opencode-ai/plugin 1.18.34→1.18.35 (95f7ac1) — landing them lets the decision record "residue landed, window closed" instead of carrying it | three bumps + actionlint container-form rc0 + lockfile update for the plugin; everything else in the window is converged (verified first-hand: docker digest identical, undici/fast-uri/source-map-js/brace-expansion in lockfile, toml ahead, #570/#573 in-tree) |

**Drop order if implement budget tightens:** pin-tail first → rm-904's healthz
and runId sub-items (keep the SSE-accounting and logger halves) → rm-903's
site count (helper + two sites, remainder rides next cycle) → rm-902 never
drops.

## Batch discipline

- rm-860 (Actions account-level disable, re-confirmed live this run 2026-10-10:
  dispatch 422, newest run 37872407109 @ 2026-10-09T01:59:31Z): implement is
  worktree-only; validation is the LOCAL battery — `pnpm build:web` first per
  the pretest trap, then check-types, targeted vitest suites (the touched
  files' suites), eslint, actionlint container-form for the YAML ride, and the
  census + roadmap guards after the roadmap patch is applied. No CI budget is
  burned; push-gated residue stays parked (rm-159, rm-778, rm-689).
- Chain order: apply `roadmap-2718d779810c4068b97add9cb7b3fe6a.patch` (or
  re-verify its md5 `e4e827d8…` if re-spooled) BEFORE batch source changes; the
  guard pin rides it. This doc lands as a new file via its own apply-ready
  patch (`delegate/batchdoc-d0b01045967b427ab2a9ea99783a9942.patch`).
- rm-252's agent-pin v0.118.3→v0.119.0 is explicitly NOT ridden: it is gated on
  the 1.9.0 consumption (rm-898's interlock) — pinning the action now would
  advertise a contract the dashboard cannot serve.

## Excluded, with reasons (dual-track first-selection convention)

- rm-898 / contract 1.9.0 consumption — fleet-owned by the c07a6b75 lane; its
  def records the implementation already built unlanded by cb6061a358f2. The
  fleet's deployment blocker is one integrate away; dual-building is forbidden.
- rm-901 — dependency-blocked on the rm-120 clone refresh (≥v0.119.0) for
  first-hand gateway-source fixture truth; read-and-test scope does not co-batch
  with three code fixes. Headliner candidate for the next cycle, ideally with
  the 1.9.0 lane landed first (it supersedes part of the parity surface).
- rm-599 — selection-taken by fefc4067 B3 (2026-10-04, unlanded; header absent
  at base today, re-verified). Orthogonal to rm-904's body-field trim.
- rm-281, rm-116, rm-102/103/104, rm-279 — CI-observation-gated lanes;
  unverifiable end-to-end while Actions is disabled.
- rm-249, rm-106, rm-117 — next-cycle-sized feature lanes; this cycle closes
  the fresh assess set instead of opening a new surface.
- rm-501 — distinct surface (web/src React client timeout discipline); the
  future shared-helper kinship with rm-903 is recorded, nothing dual-built.
- rm-194, rm-220, rm-253's fold decision — better sequenced AFTER this batch
  lands operator-stream.js familiarity; rm-253's wire-or-fold gets this batch's
  reader work as fresh evidence either way.
- rm-196, rm-760, rm-807, rm-271 — owners' soak/re-eval windows (2026-10-21).
- Sibling mints rm-896 (4474e5ab), rm-899/900 (c07a6b75,
  integration-541fec33daf2), rm-867/8 (461586fe), rm-870–872 (dc8e1756/33ede5)
  — their lanes own them.
