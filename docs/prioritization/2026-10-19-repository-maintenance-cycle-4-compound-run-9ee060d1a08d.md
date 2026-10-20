# Repository-maintenance cycle:4 compound run — 9ee060d1a08d (2026-10-19)

Provenance: run 9ee060d1a08d42f58906eef6d52b9947 (repository-maintenance cycle:4), compound attempt 85107b3ed3174828aec351877db1ce3c. Prior compound attempt cd90955468d2412ea769ecff652437b0 died mid-turn of a provider-infrastructure failure: its event log holds progress pings only (two turn starts, session_reaped), its typed artifact was never written, and it left no tree or spool output — only read-only /tmp study copies (guard-test copies, an empty census-expected.ts, pre-edit snapshots). Nothing was adoptable; this phase redid the work from scratch on the recorded cycle evidence.

Composition state: worktree run-9ee060d1a08d at HEAD 5ab50da0 carrying the uncommitted cycle:4 implement delta (16 modified + 1 new file) plus the web/privacy.html lineage mirror applied during full_tests. Origin/main at composition time is 38+ landings ahead of the batch base (it includes the Bun toolchain migration); absorb and post-absorb revalidation are downstream obligations, not compound ones.

## Batch identity (what the cycle built)

Prioritize selected three items from the run's validated roadmap delta; stewardship re-verified every premise at live main before dispatch; implement completed the batch (attempts c5cc713be6, then KTD13 attestation re-file 568d9867 over the same verified tree):

- gzip stale-sidecar cleanup — scripts/gzip-static-sidecars.ts now removes compressed sidecars whose source was renamed, deleted or left the compression set, instead of only skipping unchanged outputs; new red-first guard suite test/gzip-static-sidecars.test.ts (6 tests, fresh/changed/removed/non-produced sources — the sixth case, a base-less non-compressible orphan kept, added at review-fix).
- Host-prefixed operator session cookie — src/routes/auth.ts and src/server.ts rename the session cookie to `__Host-dashboard-session` (HttpOnly, Secure, SameSite=Lax, Path=/, 24h Max-Age, same-Path delete; amended at review-fix from `__Host-session` to stay off the gateway's own cookie slot); README.md documents the contract including the distinct-name rationale; 11 impacted test files carry the renamed assertions.
- agent-pin doc truth — the AGENTS.md Cloned Dependency Source bullet states the workflow pin (verified against the canonical mirror at exact-match HEAD) instead of the stale v0.122.1; re-truthed to v0.123.1 at review-fix (the pin advances with main) and the bullet now carries a re-derive-at-edit-time clause.

## Ledger action at compound (why a re-mint)

The run's roadmap delta (five mints, validated 19/19 guards at the 2026-10-18 base, census 296/0 dups/max 1492) was engine-swept from the delegate spool before any tree applied it, and its band was id-poisoned: the mint at 1488 collided with a def already landed on main, and the 1489-1492 range was double-claimed by an unlanded sibling lineage's committed-but-unlanded roadmap. Per the stewardship directive (first-landed-wins; re-mint at the live all-lineage ceiling) compound re-mints the three implemented items:

- fog rm-1489 -> rm-2096 (stale compressed-sidecar cleanup, track reliability, priority 72.0)
- fog rm-1490 -> rm-2097 (Host-prefixed operator session cookie, track security, priority 92.0)
- fog rm-1492 -> rm-2098 (agent pin truth, track docs, priority 63.0)

The delta's two unselected members died with the swept patch (the original 1488 text and the 1491 premise are unrecoverable from any durable artifact); next-cycle intake re-derives them from the recorded research streams rather than from reconstructed guesses. The swept delta also carried status flips for three pre-existing defs; those are superseded by main's own 38-landing advance and were deliberately NOT re-created here.

Mint basis, re-derived live at composition (basis snapshot: /tmp/compound-85107b3e/census-basis-2026-10-19.txt): origin/main 309 defs, max def id 2005; sibling worktree walls max 2095; delegate-spool patch frontier swept empty; 2096-2098 unoccupied in every scanned surface. Census after this compound's edit: 288 defs / 0 dups / max rm-2098 / next free rm-2099.

## Gate record

### Designated gate: 1

The designated gate for all three re-minted defs is the recorded full Tests-plus-Checks evidence; compound consumed it and executed nothing (phase contract: no test execution at compound).

- targeted_tests (recorded, pre-review): the engine's impacted selector over the three changed testable surfaces expanded to 26 test files; vitest run 26 files / 1051 tests, all green, tree byte-identical before and after (porcelain md5 ca49b283…, numstat md5 69fb15ac…).
- full_tests (recorded, pre-review): the work-order's ephemeral GitHub CI validation command. Run 1 failed on ephemeral PR 1027 — Design Check exit 2 with no step output — root-caused to lineage drift, not the batch: the base's workflow pinned the design tool a major behind main's, and main had already fixed web/privacy.html role-sizes for the newer tool. Reproduced locally with the pinned tool's detect (single flat-type-hierarchy finding on web/privacy.html), cured by mirroring main's fix into the batch tree (verified byte-identical restore and a single +14/-0 role-sizes hunk vs base). Run 2 returned ok:true on ephemeral PR 1030.
- implement gate battery (recorded at the KTD13 re-file over the same tree): vitest 12 impacted files 765/765, pnpm check-types rc0, pnpm lint rc0, pnpm build:web rc0.
- compound: static guard simulation only (census, dups, fog parity, designated-gate tripwire, mint-proof comment, trailing-whitespace and line-length checks). Full guard execution is owed at review/integrate on the post-absorb tree.

## Lessons and prevention rules

1. A validated ledger delta that never reaches a tree can be swept with the spool — and its ids poisoned by parallel lineages in the meantime. Prevention: land ledger content into a tree in the cycle that validates it; when restoring, re-mint at fresh ids derived from LIVE occupancy (main + sibling walls + spool patches), never from the stale validation-time census. First-landed-wins governs collisions.
2. KTD13 fold-attestation: an otherwise-complete, fully green implement was fold-rejected solely for a missing changed-surfaces attestation nested inside phase_result. The cure is a zero-edit re-file with validation_evidence.changed_surfaces — never a redo of verified work. Verify tree-intactness (porcelain/numstat md5s, per-file mtimes inside the prior attempt's certification window) before adopting.
3. Provider-reap forensics: a pings-only event log plus an absent typed artifact means nothing durable happened; attribute real work by mtimes and typed artifacts before redoing. This cycle's reaped compound attempt had touched nothing but /tmp.
4. Design-Check lineage-drift signature: an ephemeral validation PR red on Design Check with no step output, while the batch base pins the design tool a major behind main, is pin-bump/config drift — reproduce locally with the pinned tool's detect before suspecting the batch. The cure in this cycle was mirroring main's web/privacy.html fix; both the tool pin and the fixed file are already on main.
5. Fresh-worktree 404 trap: targeted vitest suites that hit '/' need web/dist built first — documented at docs/solutions/workflow-issues/targeted-vitest-without-pretest-build-webdist-404s-2026-09-24.md and re-hit as missing-build reds in sibling cycles.
6. Cross-lineage id walls move under a run: this run's band was validated at one main and landed against another 38 landings later. Re-probe the wall (main, sibling worktrees, spool patches) at every mint, at stewardship, and again at compound.

## Next-cycle context and candidates

- Absorb obligation: main's advance since the batch base includes the Bun toolchain migration; the batch's green evidence predates it. Full-suite revalidation on a post-absorb tree is mandatory before landing claims are reused, and the expected roadmap def census must be re-derived post-absorb.
- Landing-gate renumber map: fog rm-1489 -> rm-2096 (three comments in scripts/gzip-static-sidecars.ts, plus the header comment and describe title in test/gzip-static-sidecars.test.ts); fog rm-1490 -> rm-2097 (src/routes/auth.ts, src/server.ts, README.md, and the impacted test files); fog rm-1492 -> rm-2098 (no old-id citation exists — AGENTS.md carries none, verified).
- Next-cycle intake: re-derive the swept delta's dead members (the original 1488 text and the 1491 premise) from the recorded research streams; research stream C1 (upstream fro-bot/agent v0.123.0 durable operator sessions with bindings-only repo access, rider material on rm-252) remains an open doc-truth follow-up for the gateway operator surface.
- Fleet frontier: next free id after this compound is rm-2099; sibling lanes are minting actively above 2095 — always re-derive live.

## Compound verification (static, no test execution)

Def census 285 -> 288 with zero duplicates and max rm-2098; every unresolvable rm id in added text carries the fog mark; all three new def statuses cite this doc, which exists and carries the designated gate line above; the mint-proof comment owns the newest-census slot with a /tmp-rooted basis; no trailing whitespace added and all added non-comment lines are under the 4000-char bound; porcelain delta is exactly ROADMAP.md modified plus this new doc.

## Review-fix amendment (2026-10-20)

Independent review f251097342fd4d22828a4c09f42ffd10 returned NEEDS_CHANGES (six findings). The cures landed across two fix attempts: 173d82cb (reaped mid-run after completing the code and ledger edits; its typed result never landed) and 8f98bd29 (verified every one of those edits first-hand, completed the doc-side coherence, cured a markdown lint trap, and re-ran the validation). Dispositions:

1. Agent pin re-truthed LIVE to v0.123.1 — workflow pin + canonical mirror exact-match describe re-derived at fix time and still true when re-probed at fix attempt 8f98bd29; the AGENTS.md bullet carries the re-derive-at-edit-time clause; the rm-2098 rider and acceptance carry the standing landing-gate re-derivation obligation (never a hardcoded tag).
2. Dashboard cookie amended to `__Host-dashboard-session` — same `__Host-` shape guarantees, distinct slot from the gateway's own `__Host-session` operator cookie; mint/delete sites, comments, README and the 11 impacted test files renamed in the same batch; the rm-2097 acceptance now states the amended name.
3. The landing-gate renumber map (this doc and the ROADMAP trailer) is completed with the guard suite's two fog cites (header comment + describe title in test/gzip-static-sidecars.test.ts).
4. The superseded web/privacy.html mirror is DROPPED from the batch — the worktree file is restored to the base variant (byte-identical to the HEAD blob), so the batch's privacy.html delta evaporates and the landing merge takes main's own evolved variant; the Design-Check green evidence stands on main's variant.
5. The orphan unlink is gated on the vanished source's compressible extension, and the guard suite gains the previously missing case (a base-less non-compressible orphan such as a vendored .tar.gz is kept) — six tests.
6. Dated solution docs that still say `session` for the cookie are left as dated records (review disposition: acceptable under the dated-record convention; noted so the landing gate does not mistake them).

Retest at the review-fix scope (attempt 8f98bd29, final tree): the work order's targeted impacted-tests command verbatim — 26 test files / 1051 tests green, script rc 0; gzip guard suite + the four roadmap guards 24/24 green; roadmap census 288 defs / 0 dups / max rm-2098, rc 0; eslint on ROADMAP.md and this doc clean. Lint note for future editors: two bare `__Host-…` tokens on one markdown line pair into a bogus emphasis span (markdown/no-space-in-emphasis) — cookie names in prose are backticked.
