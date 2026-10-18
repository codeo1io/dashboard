# 2026-10-18 · repository-maintenance 7be908393fca4aedb7cfc1f8f6d64d0b cycle:1 — batch `dead-man watch + actions drift closure` (run eaf76a21a55c40d5b438baa63fed1819)

Selected by prioritize 406c9b0f (decision record in the delegate spool); scoped by stewardship
848ccafb/693227ee; implemented at base 5ab50da0 (origin/main tip at cycle start).

## rm-1984 (LEAD, scoped): monitor-fleet dead-man watch

- NEW `scripts/monitor-fleet-heartbeat.ts` — conductor-side heartbeat judging the six weekly
  monitor workflows (audit 03:37, base-drift 04:13, upstream-drift 05:17, canary 05:23, cve-tripwire 06:53,
  release-channel 07:23 Mon UTC) against their cron windows; 2-consecutive-miss
  verdict; signed dead-man POST through the EXISTING listener ingest contract
  (`src/routes/listener.ts` + `src/listener/ingest-auth.ts` — `x-listener-timestamp`
  seconds + `x-listener-signature` HMAC-sha256 over `timestamp.body`). No server/web changes:
  the ingest event type is a free-form string, so the new `monitor-heartbeat` kind rides the
  current contract unchanged.
- NEW `test/monitor-fleet-heartbeat.test.ts` — 16 tests: cron parsing, Monday-window math
  (oldest-first, fire-instant boundary ±1ms), 0/1/2-miss verdicts, week-later run coverage,
  grace-window pending state, never-ran monitor, message shape (critical/infra/https/dedupeKey),
  HMAC golden vs `ingest-auth.ts` derivation, request headers, `parseIngestBody` contract
  satisfaction, and an app-boundary test through `buildListenerRouter` (signed plan → 202
  `{id, receivedAt}`; tampered body → 401).
- EXTENDED `docs/runbooks/actions-darkness-watch.md` — new "Monitor-fleet heartbeat" section:
  invocation, env (`MONITOR_HEARTBEAT_TOKEN/REPO/NOW`, `LISTENER_INGEST_URL/KEY`), exit ladder,
  and the boundary vs the 48h run-creation watch (separate questions, separate scripts).
- Selection-time scope corrections honored: the six monitor workflows ALREADY carry
  `workflow_dispatch` (no trigger edits made); heartbeat is conductor-side (Actions-outage-proof);
  "sentinels fire within one cycle" stays deferred behind rm-1437's above-repo outage escalation.

## rm-1451 (remainder): actions pin/comment uniformity

| Workflow | Line | Change |
|---|---|---|
| `release.yaml` | 194 | `docker/setup-qemu-action` v3.7.0 `c7c5346…` → v4.4.0 `9901266…` (the fleet's only major-behind action) |
| `codeql.yaml` | 27 | `actions/checkout` v6.1.0 `d23441a…` → v7.0.1 `3d3c42e…` (repo-standard digest) |
| `fro-bot.yaml` | 292 | same checkout unification |
| `release-channel.yaml` | 55 | `actions/setup-node` v7.0.0 `8207627…` → v7.1.0 `949feb2…` (repo-standard digest) |
| `codeql.yaml` 32/38 + `scorecard.yaml` 42 | `# v4` → `# v4.39.0` comment tags (digest `6f2ac81…` unchanged) |

The six minor action drifts named in rm-1451 were already cured on the wall (2026-10-18 research
rider) and are NOT re-implemented (fold map).

## Verification (focused budget)

- `pnpm exec vitest run test/monitor-fleet-heartbeat.test.ts` → 16/16 green.
- `pnpm check-types`, `pnpm lint` → green (new script + test + runbook under the strip-only rules).
- actionlint container form over the five touched workflows → clean.
- `git status --porcelain` = batch files + `ROADMAP.md` (campaign bookkeeping: ext #46, cycle:1
  selection, rm-1984/rm-1451 flips) — all uncommitted per delegation policy.

## Roadmap companions

`ROADMAP.md` (same run, earlier phases): rm-1984/rm-1451 minted + flipped `open (selected …)`,
riders recording the scope corrections; selection comment at the ledger tail.
