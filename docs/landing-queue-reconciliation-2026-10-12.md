# Landing-Queue Reconciliation

Verified first-hand 2026-10-13 (engine dating; container clock probe 2026-10-12T20:25Z) in
conductor worktree `run-092c3e735e39` at base `6ec2328`, against `origin/main` = `6acea88`
(moved 2026-10-12 from `f85fb7d` via PR #612 `d42b978` — agent pin bump to v0.121.0 — plus the
one-file upstream merge `6acea88`). Method: live `gh pr list` / `gh pr diff` / GitHub compare API
(`compare/<main>...<head>`) for every open PR, `git show origin/main:<path>` presence probes for
supersession, spool + worktree census for the unlanded lane map. No PR operations were performed
by this batch (close/merge/rebase decisions land at the commit gate, per runbook rm-246).

## Why this exists

CI has been dark on this repository since 2026-10-09T01:59:31Z (newest run, re-probed this
attempt; workflow execution never starts while events, permissions, and 12/12 workflows report
healthy — root cause owned by the CI-darkness lane). Every PR below is therefore check-less, and
every maintenance landing since Oct 9 is CI-blind. On top of that queue, the conductor fleet is
holding **ten unlanded implement lineages** for this repository. This map is the de-confliction
asset: per-PR verdicts with evidence, the lane map, and the recommended landing order.

## Open PR verdict table (9 PRs)

| PR | head | payload | delta vs `origin/main` | verdict |
|---|---|---|---|---|
| #622 | — | **empty diff** (0 files) | nothing | close — noise, no content to lose |
| #521 | — | **empty diff** (0 files) | nothing | close — noise |
| #618 | `728410fb` | setup-action + workflow digest pins, lockfile-guard.yaml, workflow-pins doc | pins **superseded**: main's `.github/actions/setup/action.yaml` already at node 24.8.1 / pnpm 10.20.0; surviving content = `lockfile-guard.yaml` (ABSENT on main) + doc | ride (cherry) or close if the gate prefers re-minting the guard; duplicate of #621 |
| #621 | `f6c3126d` | same batch as #618 minus lockfile-guard | fully superseded (pins on main; doc-only remainder) | close as duplicate/superseded-by-content |
| #620 | `e9a6f41a` | `/api/v1/monitoring` endpoints (`+91` src/server.ts), read()-mounted tests (`+56` static-assets.test.ts), gateway-access runbook arms, dep rows, full-tests-disable doc | server/tests arms **unsuperseded** (`api/v1/monitoring` count on main = 0); runbook/doc arms need re-diff at gate | rebase + adjudicate arms; keep monitoring feature |
| #533 | `59baf8bb` | web fetch-timeout/listener-cleanup/Monitoring view, roadmap-integrity-guard test | fetch-timeout ABSENT on main (unsuperseded); base 72 behind | rebase or re-mint; content still wanted |
| #518 | `06396b47` | log-fidelity + docs-hygiene (snapshot-store, frontmatter guard, roadmap-integrity-guard test) | snapshot-store PRESENT on main (arm superseded); guard test unsuperseded; base 74 behind | rebase + arm-by-arm adjudication; overlap with #533's guard arm — one wins |
| #509 | `cb80b6ac` | dep + action-digest refresh (codeql 88764e3→8d528ce, release/scorecard/visual pins) | codeql re-pin **unsuperseded** (main at 88764e3; re-probe latest digest at gate); base 74 behind | rebase + refresh digests fresh; overlap with #618/#621 pin family |
| #508 | `04c66e83` | two-key rehydrate scrub (aggregator), codeql re-pin, workspace floor | not on main (probe: family unsuperseded); base 72 behind | rebase + adjudicate |

Evidence commands (rerunnable): `gh pr list -R codeo1io/dashboard --state open`,
`gh api repos/codeo1io/dashboard/compare/6acea88...<head> --jq '.files[].filename'`,
`git show origin/main:.github/actions/setup/action.yaml`, `git show origin/main:src/server.ts | grep -c api/v1/monitoring`.

## Unlanded implement lane map (10 lineages, all with uncommitted worktree deltas)

| run | batch (one-line) | worktree base |
|---|---|---|
| e7607100 | gate-debt zero + buildability restore | 6ec2328 |
| 6bcd547b | green gates, honest drift, docker truth | 6ec2328 |
| d782c536 | green-lineage + version-truth + recovery-contract | 6ec2328 |
| 783256c7 | batch B1 (reconciled to main 6acea88 mid-run) | 2d67bd5 |
| 3083e1af | post-landing truthfulness & de-trap (CI runbook, shadow-ref) | 6ec2328 |
| e2fab01c | drift guardrails | 6ec2328 |
| 153834df | cycle-1 batch (adopted dead attempt's tree) | 6ec2328 |
| 281822ab | selected batch on f85fb7d base (adopted main via broken-union cure) | f85fb7d |
| af3fc728 | sentinel-timeout child reaping (rm-990 lead + ext #44) | 6ec2328 |
| **092c3e73 (this run)** | landing-gate truthfulness + landing-queue map (this doc + ext #43) | 6ec2328 |

Sources: conductor delegate spool result JSONs (implement phase, status succeeded, per-run);
worktree walls swept `/home/agent/.hermes/conductor-worktrees/*/run-*/ROADMAP.md`.

## Unlanded mint fog and the binding rule

Dashboard roadmap numerals rm-965..rm-1015 are now minted across unlanded lane deltas and spool
postimages (current frontier: max def rm-1014 on a worktree wall, rm-1015 in a spool postimage;
next free **rm-1016**). Several numerals are double-minted with different content by different
lanes (e.g. rm-1012 appears in-tree and in a spool postimage with different subjects). Rule at
integrate: **bind by CONTENT (title), not numeral** — the landed set wins its numerals; every
other lane's equivalent item merges into it by title; extension ordinals (#39..#45+) reconcile by
run id. Each lane's delta footer carries its mint-time census; trust `git hash-object` round-trips,
not ordinal counts.

## Recommended landing order (commit gate)

1. Gate-green lineages first (e7607100 / 6bcd547b / d782c536 family) — they unblock every
   check-dependent batch and carry the Dockerfile digest + version-truth cures.
2. 783256c7's B1 (already reconciled to main 6acea88) — closest to tip.
3. 281822ab (f85fb7d-based, main-adopted) — adoption/drift family.
4. Guardrail/truth batches (e2fab01c, 3083e1af, 153834df, af3fc728, this run).
5. PR queue per the verdict table above — closes (#622, #521, #621) are cheap; the rebase set
   (#620, #533, #518, #509, #508) is adjudicated arm-by-arm against whatever the implement
   landings leave standing, citing superseding shas (rm-246 runbook shape).

## Explicit no-ops

This batch performed no push, PR, merge, close, or CI dispatch. All evidence above is read-only
probing. Verdicts become actions at the commit gate.
