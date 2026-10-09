# Repository maintenance — cycle:2 batch selection (run 19c024286fc4)

**Selected:** 2026-10-10 · **batch name:** 'dependency currency I + absorb-prep (soak-discharged pair)' · **base at selection:** this run worktree at 88e423a (== origin/main, fetch-verified this session) plus the run's roadmap-phase layer (roadmap-87fa6ee8 spool patch, uncommitted by design; census 250 defs / 0 dups / max rm-859, guard pin 859).

**Prior-attempt forensics:** first attempt on this prioritize action. The run's assess (953bf967), research (2ea955d6) and roadmap (87fa6ee8) all succeeded first-attempt; their PhaseResults in the delegate spool are the inputs below.

## Inputs

- assess 953bf967 (base 88e423a): P1 = cve-tripwire resolve-step stale grep (born-broken forensics: trixie re-pin ad8f21e 2026-10-07T23:49Z precedes the tripwire 2a9dd25 2026-10-08T04:20Z); P2 = zero-frame clean-EOF silent close in operator-sse-reader; P3s = listener-store element-shape/console.warn, healthz constant payload, lint-warning baseline.
- research 2ea955d6: upstream 27 commits ahead (tip 1ecbb81; absorb residue narrow); audit 0; soak gates discharged 2026-10-10 for @hono/node-server 2.1.4 + vite 8.3.4; agent main carries unreleased contract 1.9.0 (v0.118.3 still 1.8.0); vite-plugin-pwa 2.0.0 / impeccable 4.5.2 majors exist; action digest drift (setup-node v7.1.0, codeql v4.38.3, upload-artifact v7.0.2).
- roadmap 87fa6ee8: mints rm-857/858/859 + 8 riders; rm-252 absorb decision due 2026-10-13.
- **Lane-ownership map (decisive input, verified this session against every unlanded spool patch + the 1930644a996e/788aa489 extension maps):** tripwire fix = 4+ live unlanded lanes (533ad14f BUILT the derivation fix; d1a0b216, 8521c80a, 89ebbf49, 9fd8bcad claim it); codeql digest = df0dd46d97a1 (selected, acceptance names 24c54180) + 493bbbf2 BUILT it; upload-artifact + setup-node digests = 405e9004 lane + 493bbbf2 BUILT; digest guard/census = ab16a466a77c; vite-plugin-pwa 2.0 eval = 9fd8bcad's rm-757 (predates our rm-857); impeccable majors eval = their rm-758; zero-frame onError = rm-851 (633717c23b19 cycle:3, selected, implement pending); listener-store element-shape + warnings = rm-187 (same lane); symlinked-headless boot = rm-756 (89ebbf49). Standing no-double-claim rule: never rebuild a live unlanded lane's content.

## Selection

**U1 — rm-760 (partial, the soak-discharged pair):** vite 8.3.3 → 8.3.4 and @hono/node-server ^2.1.3 → 2.1.4 (package.json + pnpm-lock.yaml). Both publish-time soak gates discharged well before selection — true npm publish times 2026-10-08T04:42:19Z (@hono/node-server 2.1.4) / 2026-10-08T12:07:04Z (vite 8.3.4), so both were eligible from 2026-10-09 under the 1440-minute minimumReleaseAge (dates corrected 2026-10-10 at review-fix 588aeb7c — this line originally misread the publish dates as 2026-10-10); no unlanded implement patch carries either (grepped every implement-*.patch in the spool — the earlier rm-760 rider's 'already staged' phrasing was wrong and is corrected here); eslint 10.12.0 already at pin; @playwright/test 1.64.0 stays HELD (mcr digest not delegate-verifiable — CI-side gate), @opencode-ai/plugin 1.18.35 publish-date-ineligible. Full battery incl. the pretest web rebuild.

**U2 — rm-252 (partial, absorb down-payment):** absorb the upstream operator-contract consumption playbook (dcac6cf: docs/solutions/best-practices/consume-gateway-operator-contract-1-8-0-2026-10-07.md, +240 lines) behind a fork preface recording our 1.6.0-primary + 1.8.0-window state (src/github/operator-contract/version.ts:20-33) and the fork's read-only invariant. Docs-only; the 2026-10-13 decision itself (pnpm 11.28.5, digest adoption) is NOT pre-empted — the digests stay lane-owned and converge with upstream #589/#580 at integrate.

**U3 — rm-859 closure rider (ledger truth, no code):** README.md:57 documents lastFetch/rateLimit as reserved placeholders BY DESIGN (rm-107: healthz is liveness-only; the data-bearing shape lives at /api/status). Our mint's retire-preference contradicts a landed design decision — at implement, rm-859 gets a superseded-by-rm-107 closure rider instead of code; if anything, an optional comment in src/routes/api.ts pointing at rm-107 (one line, ride-along only).

## Deferrals with attribution (not re-claimed)

- rm-779 tripwire derivation: 533ad14f has the built fix (+14/-4, adopt-and-verify at integrate); the pass-over rider's integrate note (land ONE built fix before the Monday 06:53Z fire) binds INTEGRATE, not this cycle — and the fire is DOA while account-level Actions stay disabled (2026-10-09T01:59Z).
- rm-650 digest refresh: fully built by 493bbbf2 (content == upstream #589/#580); lanes df0dd46d97a1/ab16a466a77c/405e9004 own it.
- rm-857 vite-plugin-pwa / rm-858 impeccable: content-predated by 9fd8bcad's rm-757/rm-758 lanes; fold-at-integrate candidates (id dedupe), no fourth build.
- rm-851 zero-frame onError + rm-187 listener-store family: 633717c23b19 cycle:3 selected lane, implement pending there.
- rm-760 remaining members: playwright 1.64.0 (mcr gate), plugin 1.18.35 (date gate) — next probe.
- rm-108/133 majors: steady/blocked; re-eval 2026-10-21. rm-116 branch protection: live protection-object surgery — not a solo-cycle batch. rm-252 pnpm 11.28.5: rides the 2026-10-13 decision (convergent with the unlanded rider, zero-conflict).

## Batch inventory

package.json, pnpm-lock.yaml, docs/solutions/best-practices/consume-gateway-operator-contract-1-8-0-2026-10-07.md (new, fork-prefaced), + ROADMAP.md riders + selection markers riding the run's cumulative patch (roadmap-87fa6ee8 layer first). Verification plan: frozen install green, check-types, lint, full `pnpm test` (pretest rebuilds web/dist), roadmap guards 9/9, round-trip apply/restore/pristine.

## Integrate obligations

Union with sibling lanes by content (the 1930644a996e rule): if 493bbbf2/533ad14f land first, adopt their hunks verbatim; rm-857/858 vs 757/758 dedupe by content keeping the landed id; re-derive census/guard pin from the unioned tree.

---

## Cycle outcome (pre-review, recorded at compound b2800b21)

- **U1 (rm-760 partial):** implemented pending landing — `vite` 8.3.3→8.3.4 and
  `@hono/node-server` ^2.1.3→^2.1.4 (package.json + pnpm-lock.yaml regen, intended movement
  only — the 204-line lockfile diff confined to the vite/@hono/rolldown/oxc/esbuild/workbox
  peer context). Validation consumed from recorded outcomes, not re-run: targeted c4a7010a
  (roadmap guards 9 + static-assets 104 + dashboard 48 = 161 green on the applied patch;
  check-types rc=0; lint 0 err / 10 baseline warnings) and full_tests b12e1e33
  (supervisor-authorized pristine-tree two-mirror local six-job battery, both mirrors
  all-green — server 65 files / 2478 tests + web 33 / 1212; install, lint, impeccable,
  check-types, test, actionlint, strip all rc=0 — while repo Actions stay run-disabled,
  newest run 37872407109 of 2026-10-09T01:59:31Z). @playwright/test 1.64.0 (mcr digest +
  visual-baseline gates) and @opencode-ai/plugin 1.18.35 (publish-date gate) stay open.
- **U2 (rm-252 partial):** verified NO-OP at implement — the dcac6cf playbook
  (docs/solutions/best-practices/consume-gateway-operator-contract-1-8-0-2026-10-07.md)
  already exists in-tree as a SUPERSET of upstream's copy (fork preface present); recorded
  via the rm-252 residue-correction rider. The 2026-10-13 absorb decision still rides its
  own lane (pnpm 11.28.5, digest adoption).
- **U3 (rm-859 closure):** landed comment-only — src/routes/api.ts:69-73 carries the
  two-line rm-107 design pointer; rm-859's def-unit carries the closure rider and flips to
  superseded at this compound.
- **Batch-record repair at compound:** this file rode the prioritize and implement patches
  EMPTY — the prioritize patch omitted its `@@` hunk header, so `git apply` created a
  0-byte file (blob e69de29) that every downstream diff carried along. The compound layer
  restores the authored selection content verbatim (byte-identical to the spool decision
  doc) plus this outcome appendix; prevention rule:
  docs/solutions/workflow-issues/patch-new-file-hunk-header-empty-blob-2026-10-10.md.
