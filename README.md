<div align="center">

<img src="./assets/banner.svg" alt="dashboard Banner" width="100%" />

# @fro-bot/dashboard

> Command center for Fro Bot operations.

[![Build Status](https://img.shields.io/github/actions/workflow/status/codeo1io/dashboard/main.yaml?style=for-the-badge&label=Build&labelColor=0D0216&color=00BCD4)](https://github.com/codeo1io/dashboard/actions) [![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/codeo1io/dashboard/badge?style=for-the-badge&labelColor=0D0216&color=E91E63)](https://securityscorecards.dev/viewer/?uri=github.com/codeo1io/dashboard) [![Node](https://img.shields.io/badge/Node-%3E%3D24-FFC107?style=for-the-badge&labelColor=0D0216&color=FFC107)](https://nodejs.org)

[Overview](#overview) · [Quick Start](#quick-start) · [Usage](#usage) · [Configuration](#configuration) · [Development](#development)

</div>

---

## Overview

Read-only Fro Bot monitoring dashboard. Surfaces live cross-repo status (open PRs + CI state,
failing checks, open issues, security alerts) for Fro Bot's collaborator repos and Agent App
installations, plus an authenticated single-operator control surface. Installs as a PWA.

Security posture: the repo carries its own [OpenSSF Scorecard](https://securityscorecards.dev/viewer/?uri=github.com/codeo1io/dashboard)
and names every by-design deviation in [docs/runbooks/security-posture.md](docs/runbooks/security-posture.md).

### Stack

- **Server** — [Hono](https://hono.dev) + `@hono/node-server` on Node 24 native TypeScript
  (strip-only, no backend build step). Serves the API, GitHub OAuth, and the built client.
- **Client** — [Vite](https://vite.dev) + [React 19](https://react.dev) +
  [Tailwind CSS v4](https://tailwindcss.com), shipped as an installable PWA via
  [vite-plugin-pwa](https://vite-pwa-org.netlify.app). The service worker is a
  kill-switch (`web/src/sw.ts`): it purges caches and unregisters itself — the
  app does no offline caching.
- pnpm, [Vitest](https://vitest.dev).

## Quick Start

```sh
pnpm bootstrap   # install deps
pnpm build:web   # build the client bundle into web/dist
pnpm dev         # start the server with --watch
```

`pnpm dev` serves the prebuilt client from `web/dist`, so run `pnpm build:web` first (or after
client changes). The test suite rebuilds the client automatically via `pretest`.

## Usage

### Endpoints

- `GET /` — operator PWA shell (requires a valid operator session).
- `GET /api/healthz` — public liveness check; `lastFetch` and `rateLimit` are reserved placeholder fields served as `null` (rm-107: healthz is liveness-only by design — the data-bearing shape lives at `/api/status`).
- `GET /api/monitoring` — minimized monitoring snapshot for the client (authenticated).
- `GET /api/status` — full internal snapshot (authenticated).
- `GET /api/listener/messages` — operator listener-channel digest feed (authenticated; mounted only when the ingest store is configured).
- `POST /api/listener/ingest` — gateway-to-dashboard message ingest, HMAC-signed via the listener ingest key (not operator-session auth).
- `POST /api/listener/messages/:id/ack` · `POST /api/listener/ack-all` — digest acknowledgements (authenticated).
- `GET /privacy` — public privacy policy for the push/listener surfaces.
- `GET /auth/login` · `GET /auth/callback` · `POST /auth/logout` — GitHub OAuth session flow.
- `/manifest.webmanifest`, `/sw.js` — PWA manifest and service worker.

## Configuration

Access is single-operator: GitHub OAuth authenticates the request and an exact, case-sensitive
login allowlist gates every non-public route. Sessions are HttpOnly, Secure, SameSite=Lax signed
cookies; logout is CSRF-protected.

The cookie-signing key (`DASHBOARD_COOKIE_KEY`, or a file via
`DASHBOARD_COOKIE_KEY_FILE` defaulting to `/data/cookie.key`) must decode to
at least 32 bytes and be canonically encoded: hex at 2 chars/byte, or padded
base64 at the canonical 4-chars-per-3-bytes length. Shorter keys — and
non-canonical encodings such as base64 with stripped padding, or a raw
passphrase — are rejected at load (fail-closed) instead of being silently
signed with.

The dashboard mints each GitHub App installation token with an explicit read-only permissions
subset (`pull_requests`/`checks`/`issues`/`contents`/`metadata:read`, with
`security_events`/`vulnerability_alerts:read` optional). It is read-only by construction — there
is no write code path.

Redaction is enforced from `metadata/repos.yaml` on the `codeo1io/.github` `data` branch:
denylisted repos are excluded before any per-repo query, and the app fails closed if that read
fails. The App private key and cookie key are never committed (`*.pem`/`*.key` are gitignored
in-repo).

### Monitoring refresh loop

While GitHub App credentials are present, the aggregator refresh loop runs every 60s: it mints
read-only installation tokens and queries GitHub for every fleet repo. Outbound calls are
individually deadline-bounded (15s) and per-repo fetches run with bounded concurrency (4), so a
hung endpoint degrades to stale rows and a stale banner instead of freezing the loop
(rm-222/rm-141).

Set `DASHBOARD_MONITORING_REFRESH=false` (also `0`/`off`/`no`, case-insensitive) to skip the
loop entirely: the dashboard then serves an empty snapshot without minting tokens or querying
GitHub — the same fail-closed behavior as running without credentials (rm-223).

### Environment variables (rm-214)

Every `DASHBOARD_*` / `RATE_LIMIT_*` environment variable actually read from `src/` is listed
here; this table is machine-checked by `test/env-docs-guard.test.ts`, which fails when a variable
is read in `src/` but missing from this table — or documented here but no longer read.

Every variable read through the secret readers additionally supports file indirection via a
`<VAR>_FILE` path (file wins over the environment; the file is read once at boot; a set-but-
missing `_FILE` path silently falls back to the environment variable).

| Variable | Read at | Default | Purpose |
|---|---|---|---|
| `DASHBOARD_COOKIE_KEY` | `src/session.ts` | — (falls through to file) | Cookie-signing key: hex or padded base64 decoding to ≥32 bytes, else load throws (fail-closed). |
| `DASHBOARD_COOKIE_KEY_FILE` | `src/session.ts` | `/data/cookie.key` | File fallback for the cookie key (text-encoded or raw ≥32 bytes). |
| `DASHBOARD_DEV_AUTOLOGIN` | `src/server.ts` | unset (off) | Dev/test-only auth bypass; refused unless `NODE_ENV` is `development`/`test` and the bind host is loopback. |
| `DASHBOARD_FIXTURE_HARNESS_ENABLED` | `src/gateway/operator-fixture-config.ts` | off | Operator fixture-harness flag; only the exact value `true` enables (fail-closed). |
| `DASHBOARD_GATEWAY_OPERATOR_ORIGIN` | `src/gateway/operator-config.ts` | `https://dashboard.fro.bot` | Pinned trusted origin for the `/operator/*` proxy target — never derived from the request Host header. Must be an absolute http(s) origin with no path/query/fragment. |
| `DASHBOARD_GATEWAY_OPERATOR_SESSION_ENABLED` | `src/gateway/operator-config.ts` | off | Gateway-backed operator session forwarding; only the exact value `true` enables (fail-closed). |
| `DASHBOARD_GITHUB_APP_ID` | `src/server.ts` | unset | GitHub App id; together with the key below — when either is unset the GitHub data layer is disabled and an empty snapshot is served with a warning. |
| `DASHBOARD_GITHUB_APP_KEY` | `src/server.ts` | unset | GitHub App private key (multiline PEM). |
| `DASHBOARD_HOST` | `src/server.ts` | `0.0.0.0` | Bind host; must be loopback for `DASHBOARD_DEV_AUTOLOGIN` to be honored. |
| `DASHBOARD_LISTENER_DB` | `src/listener/config.ts` | `/data/listener/messages.db` | SQLite file path for the listener message store. |
| `DASHBOARD_LISTENER_INGEST_KEY` | `src/listener/config.ts` | unset (route unmounted) | HMAC key for `POST /api/listener/ingest`; when unset the ingest route is not mounted at all (fail-closed). |
| `DASHBOARD_MONITORING_REFRESH` | `src/server.ts` | on | Set to `false`/`0`/`off`/`no` (case-insensitive) to skip the aggregator refresh loop entirely — empty snapshot, no token minting, no GitHub queries (rm-223; same fail-closed posture as missing credentials). |
| `DASHBOARD_OAUTH_CLIENT_ID` | `src/server.ts` | `''` | GitHub OAuth app client id. |
| `DASHBOARD_OAUTH_CLIENT_SECRET` | `src/server.ts` | `''` | GitHub OAuth app client secret. |
| `DASHBOARD_OAUTH_REDIRECT_URI` | `src/server.ts` | `http://localhost:3000/auth/callback` | OAuth callback URL. |
| `DASHBOARD_OPERATOR_LOGIN` | `src/server.ts` | unset | The single-operator allowlist login (exact, case-sensitive match); a whitespace-only value throws at construction (fail-closed). |
| `DASHBOARD_OPERATOR_PUSH_ENABLED` | `src/gateway/operator-config.ts` | off | Push-notification delivery flag; only the exact value `true` enables (fail-closed). |
| `DASHBOARD_OPERATOR_UI_ENABLED` | `src/gateway/operator-config.ts` | off | Operator UI mount flag; only the exact value `true` enables (fail-closed). |
| `DASHBOARD_PORT` | `src/server.ts` | `3000` | Bind port; anything but an integer in 1–65535 throws at startup (fail loud). |
| `DASHBOARD_SNAPSHOT_CACHE` | `src/server.ts` | unset (off) | Optional file path enabling the boot-time snapshot bridge (rm-198): the last good snapshot is persisted here and reloaded at restart to bridge the cold-start window (forced stale, original `refreshedAt` preserved); unset/blank keeps in-memory-only behavior, and a missing/corrupt/oversize file fails open to an empty boot. |
| `DASHBOARD_WEB_DIST` | `src/server.ts` | `./web/dist` | Client bundle root served at `/`. |
| `RATE_LIMIT_MAX_PUBLIC` | `src/server.ts` | `60` | Requests per 60s window per client, pre-auth public class (SPA root, `/auth/*`, `/api/healthz`). |
| `RATE_LIMIT_MAX_OPERATOR` | `src/server.ts` | `60` | Same budget, operator class (remaining `/api/*` and `/operator/*`). |
| `RATE_LIMIT_MAX_INGEST` | `src/server.ts` | `60` | Same budget, ingest class (`/api/listener/ingest`; HMAC-gated by the route itself). |
| `RATE_LIMIT_TRUSTED_PROXY` | `src/server.ts` | off | `1`/`true`/`yes` (case-insensitive) opts in to X-Forwarded-For-based client resolution for rate-limit keying behind a trusted reverse proxy. Off (the default) keys budgets on the remote address, so an untrusted direct client cannot spoof its way to multiple budgets. |

The rate-limit window itself is fixed at 60 seconds in code — there is no environment knob for
it. Identifiers you may see in `src/server.ts` such as `RATE_LIMIT_MAX`, `RATE_LIMIT_CLASSES`,
`RATE_LIMIT_MAX_PER_CLASS`, and `RATE_LIMIT_WINDOW_MS` are code constants (the per-class defaults
the three `RATE_LIMIT_MAX_*` variables override), not environment variables.

## Development

```sh
pnpm check-types # type check server + client
pnpm lint        # lint
pnpm test        # build client, then run tests
```

`Dockerfile` builds the client in a builder stage and runs `node src/server.ts` against a
production-only dependency install.

---

<div align="center">

<sub>Part of the <a href="https://github.com/fro-bot">Fro Bot</a> ecosystem</sub>

</div>
