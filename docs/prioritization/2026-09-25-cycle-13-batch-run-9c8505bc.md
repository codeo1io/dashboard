# Dashboard maintenance — cycle 13 batch, take 2 (2026-09-25)

Implementation record for the cycle-13 batch of run 9c8505bc (assess 98c24175 →
research f289632b → roadmap 04c227c5 → prioritize 5d197a33 → stewardship
54696bfb → implement a8a94dd1), grounded at origin/main 57a182b (worktree
fast-forwarded 7809df6 → 57a182b before any edit; B2's files were identical at
both frames, only the rider's workflow files and ROADMAP.md had moved).

> Naming and id note (review fix 3156d841, 2026-09-25): sibling run f1ae52a3's
> same-day "environmental determinism" batch (open PR #130) adds its own
> docs/prioritization/2026-09-25-cycle-13-batch.md — this doc is renamed
> batch-2 to avoid the add/add conflict and to disambiguate the two engine
> runs sharing the repo-lineage cycle-13 label. This batch's roadmap ids were
> renumbered rm-182..185 → rm-187..190 above the all-lineage union max rm-186
> (PR #113 minted rm-182/183; PR #130 minted rm-184/185/186).

> **Landing record (2026-10-19 integrate graft, conflict case fb22315e59aa4ed58df57303c8d4e3b8,
> resolver round 1 — timed out pre-reply; verified and completed by round-2 case
> ce3f4011b6bf4763bc7cf7248a1b59e7):**
> this batch never landed through its own integrate — the run's worktree was
> checked out to plain main 57a182b at loss time (candidate lineage diverged,
> engine status dead-lineage yield), but the batch survived byte-exact as
> ephemeral PR #134 (head 4e6d898). It is grafted onto main at this integrate
> from that snapshot. This doc is renamed once more, `batch-2.md` →
> `batch-run-9c8505bc.md`, because main's own cycle-13 docs had taken the
> `batch-2` path for run 11d3a522's doc meanwhile. Id arbitration on the
> 2026-10-19 render (first-landed-wins, next-free minting above max rm-1485):
> B1 rm-187 → **rm-1486**, B2 rm-189 → **rm-1487**, rm-190 → **rm-1488**
> (candidate — still open, 13,390-line operator-stream-core.test.ts at the
> graft). rm-188 (GitHub-path timeouts) is dropped as fully superseded: it
> landed on main as rm-197 (request.timeout via the AppClientOptions seam,
> default 30s, src/github/app-client.ts `createBoundedFetch` +
> `AbortSignal.timeout`). The codeql-action digest rider (1c5b6756→2892aa5e)
> is dropped as superseded by main's newer pins (6f2ac81, 2026-10-14). B2's
> `'auth'` reason string was superseded by main's landed rm-273
> `'unauthenticated'` — the graft keeps `'unauthenticated'` and maps 429 to
> `'rate-limited'` (the operator runtime's canonical spelling,
> web/src/operator/state.ts). The four proven-stale status flips
> (rm-154/168/169/172) are moot: the managed render already re-truthed those
> items (all `in_progress` at the graft frame). Original numerals below are
> kept as dated history. One fixture-test hardening rides the graft: the
> checkLedger integration case now asserts whichever truth its checkout can
> prove (stale in a full-history checkout — identical pin to PR #134's green
> CI; checked-and-cleared in a truncated/grafted integration worktree where
> 4362b80 resolves but `merge-base --is-ancestor 4362b80 HEAD` is false) —
> resolve-⇒-ancestor was never the contract, fail-open under infrastructure
> limits is.

**Batch theme: truth the ledger, bound the client waits.** Selected as the
highest-value set with zero file overlap with the two open conductor PRs
(#113 graceful-degradation/lifecycle, #114 token-expiry/fail-closed) — the
deferred rm-188 (GitHub-path timeouts) exists precisely because its 3/3 target
files are those PRs'.

## B1 — Landing-ledger truth check (`rm-187`) — IMPLEMENTED

`scripts/roadmap-ledger-check.ts` (NEW) + `test/roadmap-ledger-check.test.ts`
(NEW). The script parses `- id: ... | status: ...` pairs from ROADMAP.md,
extracts hex landing refs from any status containing `pending landing`, and
flags an item ONLY on proven staleness: the cited ref must resolve in this
repository AND be an ancestor of `--base` (default `origin/main`). Unresolvable
refs (conductor run/attempt ids, upstream shas, docker digests, shallow clones)
are reported as unknown and never flagged — infrastructure limits fail open,
claims fail closed on proof. Read-only (`rev-parse` / `merge-base` only).
Exports the pure parser (`parseRoadmapItems` / `extractLandingRefs` /
`isPendingLanding` / `checkLedger`) for the fixture tests; runs `main()` only
when invoked directly.

Live run against the defect it exists to catch (worktree at 57a182b + this
batch's ROADMAP edits, base origin/main):

```text
ledger: 15 'pending landing' item(s), 4 resolvable ref(s) checked against origin/main
ledger: 9 unresolvable ref(s) left unjudged: 6fe26972, 6e6cde38, ...
ledger: 4 PROVEN-STALE claim(s) — these landings are ancestors of origin/main:
  rm-154 (ROADMAP.md:360) cites 763c1fa -> 763c1fa77af0 already on origin/main
  rm-168 (ROADMAP.md:408) cites 539c632 -> 539c63208be9 already on origin/main
  rm-169 (ROADMAP.md:414) cites 539c632 -> 539c63208be9 already on origin/main
  rm-172 (ROADMAP.md:432) cites 539c632 -> 539c63208be9 already on origin/main
exit=1
```

The 4 flagged are the subset provable from the ledger's own text; the remaining
11 pending-landing items cite run ids rather than shas and stay unjudged (the
assess phase proved them stale via merge-base on the landing commits
themselves — 4362b80/6b6f4e7/c4404af/6b417e2 — which is evidence outside the
ledger text). Landing convention from here: cite the landing sha in the status
you write, and the check can judge every claim.

## B2 — Bound the SPA listener poll/acks; map failure reasons (`rm-189`) — IMPLEMENTED

- `web/src/api/listener.ts`: reason union gains `'auth'` (401) and
  `'rate-limit'` (429); other non-OK stays `'network'` (`reasonForStatus`).
  Abort-class rejection handling now recognizes `TimeoutError` as well as
  `AbortError` (`isAbortClassError`) — `AbortSignal.timeout()` rejects with
  `TimeoutError`, which the old catch silently classed as `'network'`.
  Both acks accept `{abortSignal}` and default to
  `AbortSignal.timeout(LISTENER_CALL_TIMEOUT_MS)` (10s, exported, documented as
  below the 30s web testTimeout).
- `web/src/App.tsx`: the 30s unread poll passes
  `abortSignal: AbortSignal.timeout(LISTENER_CALL_TIMEOUT_MS)`.
- `web/src/views/Listener.tsx`: both ack call sites pass the same bound.
- `web/src/api/listener.test.ts`: pins added — TimeoutError → `'timeout'`,
  401 → `'auth'`, 429 → `'rate-limit'`, 500 → `'network'`, 502 → `'network'`,
  ack default-signal presence, ack caller-signal precedence.

## Rider — codeql-action digest parity (upstream #524) — IMPLEMENTED

Four digest pins `1c5b6756…` → `2892aa5e19bbd11bc0cff5427e3b750a04d9e3c2`
(full sha, same `# v4` style): codeql.yaml:48 (init), :54 (analyze),
release.yaml:328 (upload-sarif), scorecard.yaml:42 (upload-sarif). The only
new actionable in the delta-5 upstream measure; keeps the fork at parity
ahead of the ~2026-10-03 dependabot window.

## ROADMAP + this doc

The two spool patches from the roadmap/prioritize phases were applied to the
worktree ROADMAP.md (66 → 70 items; rm-187..rm-190 minted; rm-187/rm-189
statuses flipped to queued cycle-13 B1/B2; rm-188 carries the PR-conflict
deferral note).

## Verification

- `node scripts/roadmap-ledger-check.ts` → exit 1 with the stale list above
  (the defect, reproduced); fixture suite pins the parser and the
  unjudged-refs path; integration case skips honestly when the fixture ref
  does not resolve (shallow clone).
- Focused tests: `pnpm vitest run test/roadmap-ledger-check.test.ts` and
  `pnpm vitest run --config web/vitest.config.ts src/api/listener.test.ts`.
- `pnpm check-types`, eslint on the changed files, actionlint (container form)
  on the three touched workflows.

## Deferred, with reasons (unchanged from the prioritize phase)

rm-188 (60.5) and rm-118 (42.0) — in-flight PR #113/#114 file conflicts, first
in cycle 14; rm-104 (98.0, external fleet-render producer); rm-105 (80.0,
attestation design decision); rm-119/rm-117 (52/44, security-visibility pair,
API-shape design); rm-127 (56.0, needs live gateway); rm-114/rm-115 (45/30,
capacity); rm-138 (30.0, operator decision); rm-146 (38.0, sequenced on
rm-116); rm-190 (30.5, quiet-cycle mechanical split); rm-139/rm-140
(time-gated 2026-10-28 / changelog review).

## Outcomes (compound dfba0156, 2026-09-25 — pre-review record)

- **B1 rm-187**: implemented (implement a8a94dd1) — `scripts/roadmap-ledger-check.ts`
  + fixture test. Live run at implement time: exit 1, 15 pending items,
  4 proven-stale (rm-154/168/169/172 citing ancestors 763c1fa/539c632),
  9 run-id-citing refs unjudged. Convention adopted for future statuses:
  cite the landing SHA, not the run id, so the check can judge every claim.
- **B2 rm-189**: implemented — 10s bound (`LISTENER_CALL_TIMEOUT_MS`) default
  at the api layer + explicit at the poll and both ack call sites; 401→auth,
  429→rate-limit mapping; latent TimeoutError→'network' misclassification
  fixed with it. Validation exposed one missed pin: the view-level ack
  arity assertion (see the best-practices solution doc); fixed to pin the
  contract shape.
- **Rider**: 4 codeql-action pins bumped 1c5b6756→2892aa5e (full sha).
- **Validation (consumed here, not re-run)**: targeted command verbatim exit 0
  (all 10 checks green at ephemeral PR #123 / snapshot 2307723 after the
  arity-pin fix); full_command verbatim exit 0 (all 10 checks green at
  ephemeral PR #127 / snapshot bc4f442). Frame: HEAD 57a182b, fingerprint
  2571049e91b5a8c3.
- **Next cycle**: rm-188 FIRST after PRs #113/#114 land (re-verified open
  2026-09-25); then rm-190; truth the 11 unjudged pending-landing claims via
  the new ledger script at the next status flip.
