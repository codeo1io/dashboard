# Repository maintenance cycle 2 — compound (run f3a4bbb55911439b98f920be8ed25246)

Date: 2026-10-18 · Definition: repository-maintenance:ce3b3b9c0e43449fb1f9a7fbc964190f:cycle:2 ·
Base lineage: dispatched at edf948de, ff-advanced on a clean tree to 64cd2f6a (then-current origin/main) before the roadmap mint, per house mint-base discipline.
Scope of this document: pre-review cycle evidence only (assess → research → roadmap → prioritize → stewardship → implement → targeted_tests → full_tests). Review and shipping outcomes are out of scope here; the next cycle's assessment carries them forward.

## Batch outcome (implemented, validated)

Unit A — `rm-1512` snapshot-cache platformStatus validation (reliability 38.0), status implemented.
- Implemented by adoption: the verified substantive validation leg from sibling lane 43cf6bc3's uncommitted work (`src/github/snapshot-store.ts` `isValidPlatformStatusShape` with `PLATFORM_COMPONENT_STATUSES` vocabulary check, fail-closed; `src/github/platform-status.ts` export promotion; +114-line 7-case suite in `test/snapshot-store.test.ts`), applied via `git apply` of the sibling's exact diff with lane credit in the ROADMAP rider; the sibling's unrelated dirty-tree concerns were excluded per the stewardship boundary, and its pre-landing `rm-1500` refs re-pointed to the landed `rm-1512`.
- Semantics adopted: stricter than the mint's acceptance wording — a malformed cached `platformStatus` rejects the whole snapshot (fail-closed) rather than loading with null; acceptance reconciled by rider.

Unit B — `rm-274` SW/PWA truth-at-head (architecture 30.0), status implemented.
- Path (a) residue removal: `web/src/pwa/cache-names.ts` deleted (nothing ever wrote `OPERATOR_RUNTIME_CACHE` — zero cache-writer sites repo-wide; rm-249's forward-wiring owner was superseded when push landed in the main SW), purge reduced to the owned legacy `monitoring-v1` sweep in `web/src/sw.ts`, `web/src/pwa/logout-purge.ts` + tests shrunk and re-pinned, with an inverted GUARD test asserting no operator-runtime reference remains.
- False docs trued with fresh evidence: `web/src/pwa/ReloadPrompt.tsx` and `test/static-assets.test.ts` registerSW claims (registerSW.js IS emitted and auto-injected — verified in built `web/dist/index.html`); NavigationRoute deny-by-default comments verified true in source and retained.

Validation records (pre-review, per phase artifacts):
- targeted (attempt 8d9958260e9d4b10848887b8873c1f3f): work-order targeted_command verbatim — 38 test files, 3040/3040, RC=0, zero tree drift.
- full (attempt d31a2ae37f1147c7a5752de236244f8c): work-order full_command verbatim — ephemeral GitHub CI validation, PR #970, all checks green (`ok: true`, base 560d002c, head 5b00b4f0). That phase absorbed two byte-exact cures from then-current origin/main, both engine-base artifacts rather than delta defects: `tests/visual/dashboard.spec.ts` + its dashboard-operator-dark baseline PNG (3294→3410 tall) and the one-entry corpus growth in `scripts/release-paths.ts` (`scripts/gzip-static-sidecars.ts` accounting for the validator's injected release.yaml path filter). Both are content-identical to main and therefore first-landed-wins no-ops at fold.

## Reusable lessons / prevention rules (from this cycle's evidence only)

1. ff-advance mid-run widens the engine's derived delta. The run dispatched at edf948de; the roadmap phase ff-advanced the worktree to then-current main (64cd2f6a) on a clean tree for mint-base parity. Consequence: `changed_testable_surfaces` (derived against the dispatch base) then included the upstream-adoption window's gateway/workflow surfaces — targeted scope legitimately ran gateway suites alongside the batch's own surfaces. Expect and read this shape, do not "fix" it.
2. Old-base ephemeral-PR validation traps have a standing cure: byte-exact absorption of the cure slice from origin/main. Two instances this cycle, both cured without hand-editing: the visual baseline's wall-clock age (expected 1280×3294, received 1280×3410) and the release-paths corpus entry behind the should-release parity guard. Because the absorbed bytes equal main's, they are no-ops at fold (first-landed-wins). Prefer `git checkout origin/main -- <cure slice>` over creative local edits; size the slice first (`git diff --stat <base>..origin/main -- <paths>`) and never absorb a whole feature landing (the gzip-sidecars corpus commit was 845 lines across 9 files — only its +6-line corpus entry was needed).
3. Sibling dirty trees mix concerns; adoption boundaries are per-hunk. The adopted lane's dirty state carried this batch's validation fix AND two other lanes' riders plus a foreign solutions doc. Adopt named hunks only, credit the lane in the ledger, and re-point the sibling's pre-landing def refs to the landed ids so dangling-census guards stay green.
4. Mint only after a live all-lineage frontier census, and clear both disk maxima AND recorded same-day claims (this cycle minted rm-1512..rm-1515 above a disk max of rm-1505 and recorded claims through rm-1511; extension record #49 carries the proof).
5. Environment between phases is not durable: node_modules and /tmp scratch were reaped during inter-phase gaps twice this cycle. Reinstall (`pnpm install --frozen-lockfile`) and re-create scratch before any validation; a hollow `typescript-eslint` transitive after reinstall can fail check-types at a clean base — a full `rm -rf node_modules` reinstall cures it.

## Next-cycle leads (concrete candidates/context)

- `rm-1513` absorb upstream 2026.10.44 (#646 markdown run-output): re-probe the window first — origin/main has advanced ~700 commits past this run's base since the research phase; the markdown surfaces may since be landed (check `web/src/operator/markdown-output.ts` on main) and the fog rm-1502 sibling lane's outcome should be read from main's ledger before re-basing the def.
- `rm-1514` public/ lint scope: still sequenced after rm-1513 (the absorb grows `public/operator-stream.js` ~500 lines; lint the widened file once).
- `rm-1515` @types/node re-sync: check main first — later adoptions (2026.10.44+) may have carried the dropped 24.19.2 bump past this run's base.
- Node-26 gate opens 2026-10-28 (rm-139 lineage): v24 support ends 2026-10-20 — the promotion window is the next cycle's natural driver for the toolchain batch.
- FRO_BOT_PAT provisioning (rm-1437 lineage) remains the gate before any fro-bot workflow re-enablement; the workflow stays disabled until the secret exists.
- Vitest-5 window (rm-271/rm-1449 lineage): main's vitest adoption decisions should be re-read before any local pin movement.

## Cohort tripwire (rm-877)

Every path this document claims as delivered exists in this tree at compound time: `src/github/snapshot-store.ts`, `src/github/platform-status.ts`, `test/snapshot-store.test.ts`, `web/src/sw.ts`, `web/src/pwa/logout-purge.ts`, `web/src/pwa/ReloadPrompt.tsx`, `web/src/pwa/ReloadPrompt.test.tsx`, `web/src/pwa/logout-purge.test.ts`, `web/src/shell/AppShell.tsx` (purge-poster wiring), `test/static-assets.test.ts`, `tests/visual/dashboard.spec.ts`, `tests/visual/__screenshots__/dashboard.spec.ts-snapshots/dashboard-operator-dark-chromium-linux.png`, `scripts/release-paths.ts`, `ROADMAP.md`. Deleted-by-design: `web/src/pwa/cache-names.ts` (intentionally absent — residue removal, do not expect it at HEAD).
