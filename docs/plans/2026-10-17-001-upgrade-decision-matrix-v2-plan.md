---
title: "Upgrade decision matrix v2 (rm-1475): one dated row per major"
type: maintenance
status: active
date: 2026-10-17
origin: ROADMAP.md rm-1475 (run 21222e003a45 cycle:4); measurements taken 2026-10-16 by this run's research phase (pnpm outdated + npm view at base 7042635)
---

# Upgrade decision matrix v2 (rm-1475)

## Why this document exists

rm-108 promised a dependency-decision matrix and closed superseded without one ever
materializing, leaving the Node-line def's acceptance deferring to a document that did
not exist (dangling reference re-pointed to this document at the same time it landed).
The rule of this matrix: **no major rides a one-at-a-time dependabot bump — every
major bump lands as one reviewed change with the full gate battery green**, and every
row carries a dated go/no-go so "later" is a date on record, not a shrug.

All versions below were measured 2026-10-16 (research phase of run 21222e003a45,
base 7042635): lockfile state via `pnpm outdated`, availability via `npm view`.

## The matrix

| Major | Locked (2026-10-16) | Available | Decision | Review / trigger | Owning def |
| --- | --- | --- | --- | --- | --- |
| vitest | 4.1.11 | 5.0.5 | NO-GO now | next majors window | rm-1475 |
| typescript | 6.0.3 | 7.0.2 | NO-GO | next majors window | rm-1475 |
| pnpm | 11.28.5 (`packageManager`) | 12.14.0 | NO-GO | any corepack-touching change | rm-140 |
| vite-plugin-pwa | 1.3.0 | 2.0.0 | NO-GO | next vite major window | rm-1475 |
| jsdom | 29.1.1 | 30.1.3 | NO-GO — coupled pair | vitest window | rm-1475 (undici floor rider context) |
| Node runtime | 24 line (`engines >=24`, `node:24-trixie-slim` image) | 26 line; `@types/node` ceiling 26.6.5 | NO-GO until the 26 LTS flip | 2026-10-28 | rm-139 gate |

## Why each row says no (dated)

- **vitest 5.0.5** — the targeted-runner vitest-5 fallback trap recorded in this run's
  research (the `npx`-fallback class when the runner's vitest major no longer matches
  the workspace root) must be cleared first; the bump rides the next majors window as
  one change with the full battery, not as a dependabot singleton.
- **typescript 7.0.2** — the tsgo-era compiler is unproven against the server's
  `erasableSyntaxOnly` strip-only lint and the client workspace's full-TS config; no
  forcing advisory; review at the next majors window.
- **pnpm 12.14.0** — evaluation mechanics are owned by rm-140: `packageManager` pin,
  the Dockerfile corepack surface, and the lockfile format version move together in
  one reviewed change.
- **vite-plugin-pwa 2.0.0** — no forcing advisory; the PWA surface churns between
  majors; review with the next vite major window.
- **jsdom 30.1.3** — pairs with the undici 8 + vitest 5 migration (the undici floor
  rider in `pnpm-workspace.yaml` records that window); riding it separately splits a
  coupled migration in two review surfaces.
- **Node 26** — the 26 line promotes to LTS ~2026-10-28; the v24 line is supported to
  2028-04-30 (rm-139's corrected datum — the 2026-10-20 EOL reading was wrong), so
  there is no pressure at the flip date. The go/no-go is recorded at the gate against
  `engines >=24`, the `node:24-slim` tag choice, the `@types/node` major, and runner
  tool-cache impact, per rm-139's acceptance (re-pointed here from the superseded
  rm-108 matrix).

## Minor drift recorded as data (2026-10-16, no action)

`@hono/node-server` available 2.1.5 (locked 2.1.3; advisory-pair context recorded
at rm-498 and rm-277), react available 19.3.1 (locked 19.3.0), `@types/node`
available 24.19.2 (locked 24.13.3; rides rm-1449's sweep per rm-139's rider),
`@opencode-ai/plugin` available 1.19.0 (locked 1.18.35), fast-check available
4.10.2 (locked 4.9.0), `@playwright/test` available 1.64.1 (locked 1.64.0) —
visual-lane sensitive: bump only inside a change that proves the visual lane green;
the snapshot baselines depend on the pinned browser/runtime pairing staying in sync.

## .nvmrc (landed with this document)

`.nvmrc` pins `24`, matching `engines >=24` and the `node:24-trixie-slim` image line.
Measured need: the delegate gate host itself drifted to node v22.22.0 on 2026-10-17
while the engines floor wants 24 — a bare `nvm use` now restores the intended line
instead of inheriting whatever the host shell carries.

## Maintenance rule

Append rows; never delete them. A row that closes records its close date and the
landing run, so the matrix stays an audit trail of decisions rather than a snapshot
of mood.
