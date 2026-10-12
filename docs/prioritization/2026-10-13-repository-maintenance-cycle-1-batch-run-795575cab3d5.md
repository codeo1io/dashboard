# Repository maintenance batch — cycle:1, run 795575cab3d54b11821e14cd729fba64

- **Run:** `795575cab3d54b11821e14cd729fba64` (repository-maintenance cycle:1)
- **Base:** `6acea88c93cf2c6ff7c4c3dca96f563e5ae071f2` == live `origin/main` (verified via
  `git ls-remote` during assess; upstream `fro-bot/dashboard` window 0).
- **Phases:** assess `01b60c26b2b24c498344a03c95935e79` → research
  `172ca5ac59ad4e36a1b3bccc3050135b` → roadmap ext#46 `8bc71e04dc304061a4020908f0ecc207`
  → prioritize `733c8c76c7624e50aa84892937ea583c` → stewardship
  `f3ebda07de5240a8b2e464f9f86521a8` → implement `6d00046a35714eb3ba131da47f156021` (this).

## Why this batch (selection rationale)

All four gates are RED at main tip (proven first-hand in assess at exactly this
base): `pnpm check-types` exit 2, `pnpm lint` exit 1, `pnpm build:web` exit 1, and
`pnpm test` unreachable (pretest IS build:web). Server-core suites are green
(265/265 first-hand), so the breakage is concentrated on the client/operator
surface. Every other item's verification path runs through the dead gates, so
green-restoration is the batch head (rm-100). Two workflow-truth items ride it
because they are the same class of "deterministically wrong signal once Actions
recovers": the base-drift weekly check queries the wrong tag literal (rm-856),
and six action pins are stale/incoherent (rm-191 rider-in-batch).

## Chosen

1. **Gate triad (rm-100)** — bound by content from lane
   `run-783256c77772-783256c7` attempt `2f86e1b9` (exact hunks verified against
   this run's base blob: 1 / 2 / 16 diff-lines; the lane's own `git diff` mixes
   old-base reconcile drift and was NOT copied whole):
   - `web/src/index.css:792` — delete the stray unclosed selector
     `[data-role="run-output-coalesced"] {` (tailwind `CssSyntaxError: Missing
     closing }` killed `build:web` → `pretest` → all of `pnpm test`).
   - `web/src/operator/runtime.ts:378` — add `gapEl` to the
     `discoverCardStreamTargets` destructure (cures `:392` TS18004; the function
     returns it and `runtime.test.ts:447` destructures it — the `96bfbb0`
     lane-union dropped the binding).
   - `public/operator-stream.js` — move `export const APPROVAL_FETCH_TIMEOUT_MS
     = 10_000` from `:2160` to just above its first use `:2018` (cures 4 lint
     `no-use-before-define`; pure 16-line two-hunk move).
2. **base-drift ARG-derivation (rm-856)** — `.github/workflows/base-drift.yaml`
   now derives `BASE_TAG` from `Dockerfile`'s `ARG NODE_IMAGE`
   (`node:24-trixie-slim@sha256:173f1258…`) and inspects THAT tag, instead of the
   literal `node:24-slim` (a different tag with a different live digest, making
   the gate deterministically red the moment Actions recovers; the pin equals
   the live trixie digest — probed during assess). The digest readback technique
   is preserved verbatim (`docker buildx imagetools inspect` + awk + registry
   HEAD fallback + empty-digest guard) —
   `test/base-drift-digest-readback.test.ts` pins technique, not the literal
   (grep-verified: no `24-slim` in the test), so no test change.
3. **Action-pin unification (rm-191)** — six one-line bumps, SHAs verified via
   `git ls-remote … 'refs/tags/vX^{}'` / `gh api …/git/ref/tags`:
   setup-node `82076278…# v7.0.0` → `949feb2413d6458794dcd2491c4babbbce0c15c1 #
   v7.1.0` (audit.yaml:65, release.yaml:57, release.yaml:389, visual.yaml:79);
   upload-artifact `043fb46d… # v7.0.1` (the stale second pin) →
   `cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2` (visual.yaml:101,
   visual.yaml:109 — matching the repo's dominant pin already used by
   scorecard.yaml:44 and release.yaml:350).
4. **Ledger rides the batch** — ROADMAP.md ext#46 applied (spool patch, 20 dated
   rider lines + extension comment; zero mints, zero status flips, zero def-text
   edits; census 235 defs / 0 dups / max rm-856 / next free rm-1016).

## Rejected this cycle (triggers recorded on their ledger riders)

- rm-157/rm-693 contract 1.10.0 adoption (same files touched later; verification
  unreachable until gates green; drop-everything if infra bumps the gateway ≥
  v0.120.0). rm-139 node:26-trixie-slim (CI-blind image-bump no-go until Actions
  recovers). rm-196 lockfile refresh (multi-lane conflict amplifier). rm-252
  upstream #604 absorb (still open upstream). rm-517 stub-PR sweep (pr-gate
  disposition).

## Verification

- `TMPDIR=/tmp pnpm check-types` → exit 0 (was exit 2).
- `TMPDIR=/tmp pnpm lint` → exit 0 (was exit 1).
- `TMPDIR=/tmp pnpm build:web` → exit 0 (was exit 1; unblocks `pretest`).
- Focused (impacted-only, per phase budget): `TMPDIR=/tmp npx vitest run
  test/base-drift-digest-readback.test.ts test/operator-stream-core.test.ts`
  and the web operator-runtime suite; `pnpm test` reserved for the validation
  gate (first full-suite verdict at this lineage).
- actionlint (container form) on the four touched workflows.
- Provenance: `git diff` shows exactly the hunks above; the three gate-repair
  hunks are byte-identical to lane `2f86e1b9`'s tree files vs this base.

## Tail handling

All findings/riders landed in ROADMAP.md (ext#46) before the code edits, so the
batch carries its ledger. Nothing in this batch requires secret rotation or
workflow re-enablement; the `Fro Bot` workflow stays `disabled_manually` (no
`FRO_BOT_PAT` secret provisioned — do not flip it on).

If this work order is superseded mid-flight, the next attempt should re-verify
base == `6acea88…` (origin/main may move again — the 2026-10-12 wave landed
while lanes were in flight) and re-apply the same spool-side artifacts:
`roadmap-ext-46.patch` + the three lane hunks; the workflow edits are
re-derivable from this doc.
