# Dashboard maintenance — repository-maintenance cycle 1 batch (2026-10-04, run 80e8409255b9)

module: dashboard
tags: `[security, docs, batch-record]`
problem_type: batch-record

Frame: base `227375247` (== origin/main, re-probed live at implement time —
`git fetch origin main`, `rev-list --left-right --count HEAD...origin/main` = `0 0`;
no mid-phase parallel landing since the prioritize phase's identical measurement).
Run `80e8409255b94d3782ec2a9b7f871fe0`, repository-maintenance cycle:1. Phases:
assess `b1177ab84c1847faa20349bd43a508b0` (web-client end-to-end differentiation),
research `9b153b7c41ab4beea73f5513cbd4c16e` (live header/rate-limit probe, GitHub
census, ecosystem re-probe), roadmap `e283697a316148f7a550620d972123b1` (extension
number 12 — mints rm-612/rm-613 + 7 dated riders, +25/-0), prioritize `d04554b5aa764b58b14af07349a06fce`
(spool batch doc `d04554b5…-scratch/batch-2026-10-04.md`; this document is its
in-tree landing), stewardship `7de3ba1cb8af48d3852b342a68471117` (structured
request, no Git topology chosen), implement `7e0b78cb76bd4ad280f6828fb3ab02bc`
(this document).

## The cycle's mandate

One theme: **land the run's own roadmap deliverable as guarded code — three
first-hand-verified truth/posture corrections, each shipping a pin so it cannot
silently regress.** All three members were minted or ridden by this run's roadmap
phase at the same base, zero sibling content collision (161-worktree sweep via
per-worktree `git diff HEAD`), zero external dependencies, zero time gates, zero
live-repo mutations.

## B1 — rm-612: copilot-guidance architecture truth + recurrence guard

`.github/copilot-instructions.md` still described the repo as "a single Hono + JSX
SSR Node 24 process, no build step" — stale since the PWA rebuild (db74679,
2026-06-24). Every Copilot suggestion was steered by it, away from the documented
pretest `web/dist`-404 trap and the two-part build model.

- Architecture paragraph rewritten to mirror `AGENTS.md`: strip-only Hono server
  (`src/`) + Vite/React 19/Tailwind v4 PWA client (`web/`, built via
  `pnpm build:web` → `web/dist`, served at `/`).
- Conventions bullet updated the same way (server is strip-only; `web/` is a
  full-TS workspace excluded from the strip-only lint).
- Recurrence guard `test/copilot-instructions-guard.test.ts`: the file must
  mention `` `web/` `` and `pnpm build:web`, and must not regress to the
  single-SSR-process claim (`JSX SSR` / `no build step`).

## B2 — rm-613: HSTS 1-year ramp + preload disposition + emitted-value pin

Live-probed posture (research 9b153b7c): the strict transport header ships hono's
default `max-age=15552000; includeSubDomains`. Domain has served HSTS
continuously since the middleware landed, so the ramp-up rationale has expired
(OWASP/MDN posture for long-lived deployments is 1 year).

- `src/server.ts` secureHeaders site: `strictTransportSecurity:
  'max-age=31536000; includeSubDomains'` (hono 4.13.11 full-string override —
  `SecureHeadersOptions.strictTransportSecurity?: boolean | string`, verified
  against the installed package).
- **Preload explicitly DECLINED, in code, with rationale** — reverse-proxy
  deployment; preload submission is a deployment-owner decision, not a repo
  change. The comment forbids adding the `preload` token here.
- Pins in `test/server.test.ts` (booted-app `/api/healthz` pattern, the CSP-pin
  precedent): emitted value `toBe('max-age=31536000; includeSubDomains')` and a
  negative pin — no `preload` token. Zero existing pins elsewhere; purely
  additive.

## B3 — rm-482 rider disposition: delete dead `mintRuntimeIdempotencyKey`

`web/src/operator/runtime.ts:145-158` exported a `crypto.randomUUID()`-with-
`Math.random`-fallback idempotency-key minter with ZERO production callers (grep
census: definition + its own tests only; real launch keys are minted inside the
public `operator-launch.js` bundle). A `Math.random` fallback idempotency key is
the exact anti-pattern rm-482's landed fail-closed contract removed from the
server; deleting the dead web twin (not merely documenting it) is the cheapest
disposition. Deleted: the function + doc comment + both test blocks
(`web/src/operator/runtime.test.ts`, `test/operator-runtime.test.ts`).
The two public-bundle sites (`operator-launch.js`, `operator-stream.js`) remain
the open remainder of that class (tracked by the rm-482 ledger history).

## Deliberately not in this batch (prioritize-phase rationale)

- **rm-501 web ack/logout timeout discipline** (operator-experience 44.0, the
  highest OPEN priority): alone consumes the cycle budget and converges with the
  unlanded rm-449/rm-276 claims on ONE handleLogout refactor — next-cycle lead.
- **detailsUrl https-gate**: the pool's top security value but sibling-owned
  (rm-450 lineage 84d43fc7/5bf98ac3 with a live diff on the exact chain files +
  63b5848a's same-content mint) — one-owner rule.
- **rm-548 web-test red cure** (proven zero-edit via `NODE_OPTIONS
  --localstorage-file`): sibling-owned rm-608 (2c3b4c64) + rm-108 rider (9114bc6c);
  escalate next cycle if that lineage dies unlanded. This batch must NOT change
  the red count either way (none of B1–B3 touches the web test matrix).
- **rm-116 branch-protection fill** (stewardship-gated sequence), **rm-139 Node 26
  swap** (window 2026-10-28), **TS7/vitest-5/jsdom-30 majors** (dated windows),
  **429 Retry-After** (sibling rm-589).

## Verification (implement phase, focused per the validation budget)

- `pnpm check-types` rc=0 (server + `web/` — B3 removes a `web/` export).
- Targeted eslint on every changed TS file + `ROADMAP.md` rc=0.
- Focused vitest: `test/copilot-instructions-guard.test.ts`,
  `test/server.test.ts` (new HSTS pins), `test/operator-runtime.test.ts`,
  `web/src/operator/runtime.test.ts` (post-deletion suites) — all green.
- ROADMAP guards re-run (`roadmap-length-guard`, `prose-residue-guard`) after the
  status flips: green.
- Live curl probe: booted server dump pinned at
  `7e0b78cb…-scratch/hsts-live-probe.txt` (`strict-transport-security:
  max-age=31536000; includeSubDomains`, no preload token).
- Full `pnpm test` (expected: only the known rm-548 web red) is reserved for the
  later full_tests gate per the validation budget.
