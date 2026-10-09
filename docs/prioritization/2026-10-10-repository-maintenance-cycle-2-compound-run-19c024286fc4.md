---
module: dashboard
tags: [repository-maintenance, cycle-2, compound, rm-760, rm-252, rm-648, rm-857, rm-858, rm-859]
problem_type: maintenance-compound
---

# Repository-maintenance cycle 2 — compound record (2026-10-10, run 19c024286fc4)

Pre-review compounding of the whole cycle: assess `953bf967` → research `2ea955d6` →
roadmap extension #38 (`87fa6ee8`: mints rm-857/rm-858/rm-859, eight dated riders,
census 250/0/rm-859, guard pin 859) → prioritize `c65cc606` → stewardship `df79c170` →
implement `f9f29312` → targeted `c4a7010a` → full `b12e1e33` (supervisor-authorized
two-mirror local battery while repo Actions stay run-disabled). Nothing was re-validated
at compound; every outcome below is consumed from the recorded typed results. Authoritative
cumulative deliverable: `delegate/compound-19c024286fc4-b2800b21.patch` — it supersedes
`delegate/implement-19c024286fc4-f9f29312.patch` (byte-stable at supersede time, md5
`163de9f496d0a86f10e5d3be45cf22a7`); apply ONE against pristine `88e423a`.

## Cycle outcome (compounded)

Batch: `dependency currency I + absorb-prep (soak-discharged pair)`, implemented at base
`88e423a` (== origin/main at cycle open; main has since advanced — see integrate
obligations).

- **U1 `rm-760` (partial)** — the soak-discharged pair landed: `vite` 8.3.3→8.3.4 and
  `@hono/node-server` ^2.1.3→^2.1.4 (package.json + pnpm-lock.yaml regen, intended movement
  only — the 204-line lockfile diff confined to the vite/@hono/rolldown/oxc/esbuild/workbox
  peer context). Validation consumed, not re-run: targeted `c4a7010a` (161 green on the
  applied patch — roadmap guards 9 + static-assets 104 + dashboard 48; check-types rc=0;
  lint 0 err / 10 baseline warnings) and full `b12e1e33` (both mirrors of the six-job local
  battery all-green — server 65 files / 2478 tests + web 33 / 1212). @playwright/test 1.64.0
  and @opencode-ai/plugin 1.18.35 stay open on their gates.
- **U2 `rm-252` (partial)** — verified NO-OP: the dcac6cf playbook
  (`docs/solutions/best-practices/consume-gateway-operator-contract-1-8-0-2026-10-07.md`)
  already exists in-tree as a superset of upstream's copy (fork preface present), recorded
  via the rm-252 residue-correction rider. The 2026-10-13 absorb decision rides its own
  lane (pnpm 11.28.5, digest adoption).
- **U3 `rm-859` closure** — landed comment-only: `src/routes/api.ts:69-73` carries the
  two-line rm-107 design pointer; the def-unit carries the closure rider and flips to
  `superseded` at this compound.

## Ledger deltas made at compound

- def-line status flip: `rm-859` `candidate` → `superseded` (U3 reversal; physical
  relocation to the Superseded section rides the landing merge per the rm-152/265/266
  pattern).
- cycle-outcome riders: `rm-760` (validation provenance + sibling b0ad74442796 content
  overlap) and `rm-648` (full-validation deviation record + CI re-run deferral rule).
- content-dedupe riders: `rm-857` and `rm-858` — both content-predated by sibling lane
  9fd8bcad64a8's `rm-757` / `rm-758`; fold-at-integrate, one meaning one id.
- extension comment #39 appended (newest census owner): zero mints, census
  `250 defs / 0 dups / max rm-859` unchanged, guard pin stays 859, no test edits.
- batch-record repair: `2026-10-10-repository-maintenance-cycle-2-batch-run-19c024286fc4.md`
  rode the prior patches EMPTY (see learnings) — authored content restored verbatim (except the publish-date line, corrected 2026-10-10
  at review-fix 588aeb7c) plus a cycle-outcome appendix.

## Cycle learnings (durable, prevention rules)

- **Documented contracts beat fresh findings.** The assess P3 (healthz
  `lastFetch`/`rateLimit` dead fields) contradicted a landed, documented design decision
  (rm-107, README.md:57). The cure was ledger truth — closure rider + status flip + a
  one-line code pointer — not an API-shape change. Next assess: grep the README/docs
  lineage for a design contract BEFORE minting a shape finding; a contradicting mint gets a
  superseded-by closure rider, never code.
- **Rider claims are not patch content.** This cycle's roadmap rider said the vite/hono
  pair was "already staged"; hunk-grepping every unlanded implement patch proved it unbuilt
  (corrected in-patch by the prioritize CONFIRMATION rider). A "staged/landed/built" claim
  must cite a patch hunk, not another rider's text.
- **Hand-composed patches must round-trip a real tree.** The prioritize patch omitted its
  `@@` hunk header; `git apply --check` passed vacuously (a create with zero hunks applies
  as an empty file) and the empty doc (blob e69de29) rode three downstream phases because
  no gate asserts doc content. Emit cumulative patches from a real worktree diff
  (`git add -A` + `git diff --cached`) and verify new-file entries carry content —
  prevention rule:
  `docs/solutions/workflow-issues/patch-new-file-hunk-header-empty-blob-2026-10-10.md`.
- **Never trust suite counts without listing files.** Four phase results cited
  `test/roadmap-prose-residue-guard.test.ts` as run-green; that file does not exist at
  this base — vitest silently ran the two real guard files (9 tests). Cite only files
  proven by `ls`/`git ls-files`; treat any "N-file suite passed" line as unverified
  until the names match the tree.

## Next-cycle candidates (concrete, with owners)

- `rm-252` absorb decision DUE 2026-10-13 — upstream window 27 commits at
  autonomy-upstream tip `1ecbb81` (research `2ea955d6`); dcac6cf playbook already in-tree
  superset.
- `rm-760` leftovers: @playwright/test 1.64.0 (CI-side mcr digest + visual-baseline
  two-green), @opencode-ai/plugin 1.18.35 (publish-date gate).
- `rm-850` operator-contract 1.9.0 adoption — ESCALATION FIRED (corrected 2026-10-10 at
  review-fix 588aeb7c): gateway v0.119.0 (published 2026-10-09T23:07:49Z) pins 1.9.0 and
  its release body requires dashboard support before deployment; the compound-time claim
  `agent main unreleased; v0.118.3 serves 1.8.0` was stale at authorship (~3h14m) —
  correction rider at rm-157, ext #39 item (3) rewritten.
- Action digest staleness (setup-node v7.1.0 / upload-artifact v7.0.2 / codeql v4.38.3):
  BUILT unlanded by 493bbbf2 — adopt-and-verify at integrate, do not rebuild.
- `rm-133` majors re-eval 2026-10-21 (TS 7.0.2, vitest 5.0.3, jsdom 30.1.2, pnpm 12.10.1,
  impeccable 4.5.2 — fold rm-857/858 against 9fd8bcad's rm-757/758 first).

## Review fixes (2026-10-10, attempt 588aeb7c, from independent review 76e09b79)

All five findings cured at ledger/doc level — no mints, no test edits, no rebuild:

- F1 HIGH — rm-157 dated correction rider: gateway v0.119.0 (2026-10-09T23:07:49Z, gh
  api re-probed first-hand at the fix) pins OPERATOR_CONTRACT_VERSION 1.9.0; release
  body requires dashboard support before deployment; rm-850 escalation trigger FIRED;
  ext #39 item (3) rewritten + this record's rm-850 bullet corrected.
- F2/F3 MEDIUM — rm-760 dated correction rider: true npm publish times are
  @hono/node-server 2.1.4 2026-10-08T04:42:19Z and vite 8.3.4 2026-10-08T12:07:04Z
  (re-probed first-hand), so 1440-minute minimumReleaseAge made both eligible from
  2026-10-09; ext #38's `discharged 2026-10-10` summary and the batch doc's publish-date
  line carried the same +1-day misreading — corrected. Conclusion unaffected.
- F4 LOW — rider order fixed: the compound rider was emitted before the implement rider
  it postdates; chronological order restored (research → implement → compound →
  review-fix).
- F5 LOW — phantom test citation documented: the prose-residue guard file named in four
  phase logs does not exist at this base; ext #38's verification summary amended; new
  learning bullet above.

## Integrate obligations (binding)

- origin/main advanced past `88e423a` during the cycle (probed at compound dispatch:
  `1d0f399e6d9326a1fc3a07916da72a02b3a4bf92`) — union by chronological content, keep
  landed records verbatim, re-derive the census claim and guard pin from the unioned tree
  (newest-date last-in-document-order owns the census slot).
- Adopt ONE vite 8.3.4 + @hono/node-server 2.1.4 regen — ours or sibling b0ad74442796's
  rm-842 (which adds pnpm 11.28.5 + plugin 1.18.35); never a fourth build.
- Fold rm-857/rm-858 against 9fd8bcad64a8's rm-757/rm-758 by content (loser renumbers).
- rm-859's physical relocation to the Superseded section rides the landing merge.
- Re-run repo-wide `pnpm lint` and the roadmap guard suites at the landing gate — compound
  authored docs under a no-validation ban (`docs/prioritization` is lint-active;
  `docs/solutions` is lint-ignored).
