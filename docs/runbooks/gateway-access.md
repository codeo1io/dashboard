# Gateway Access

The dashboard's operator surface is not served by this app. `https://dashboard.fro.bot/operator/*`
is proxied by Caddy to a gateway running `fro-bot/agent`, and that gateway owns operator auth,
sessions, and push. When operator login or push misbehaves, the evidence is in the gateway's logs,
not this repository's — and no test here can reach it.

This runbook covers getting to that evidence. Every trap below cost real time during a production
outage, so read them before improvising a command.

## Same-origin proxy acknowledgement (`DASHBOARD_GATEWAY_PROXY_ACK`, rm-127)

The dashboard's gateway login redirect (`/operator/auth/github/start?return_to=/operator`) is a
RELATIVE path that this app does not serve — it only terminates on the gateway because Caddy maps
`/operator/*` on `dashboard.fro.bot` to it. Gateway operator-session mode
(`DASHBOARD_GATEWAY_OPERATOR_SESSION_ENABLED=true`) therefore REFUSES to start unless
`DASHBOARD_GATEWAY_PROXY_ACK=same-origin` is also set: without that acknowledgement a standalone
dashboard mis-set into gateway mode would redirect unauthenticated browsers into a silent loop.
If the container crash-loops at startup with the acknowledgement error, either set the env (you
are behind the Caddy topology) or turn gateway mode off. A related request-time guard: if a
request for `/operator/auth/*` ever reaches the dashboard itself (proxy misroute), it answers
`502` with a pointer here instead of redirecting.

---

## Prerequisites

- A local checkout of `marcusrbrown/infra` with its repo-root `.env` (holds `GATEWAY_HOST`). The
  CLI below is that repo's, and commands run from its root so Bun loads `.env` automatically.
- An SSH key in your agent that the droplet accepts. In local mode the CLI passes no `-i` flag and
  relies on `SSH_AUTH_SOCK`.

Without the infra checkout you cannot read gateway logs. That is the honest boundary: debugging an
operator-auth or push problem from this repository alone is not possible past the proxy.

---

## Prefer the CLI

```sh
bunx @marcusrbrown/infra gateway status              # docker compose ps, service states
bunx @marcusrbrown/infra gateway logs gateway --tail 200
bunx @marcusrbrown/infra gateway deploy              # triggers the Deploy Gateway workflow
```

`gateway logs <service>` takes `gateway`, `caddy`, `mitmproxy`, or `workspace`.

**There is no `gateway restart` subcommand.** The full list is `status`, `deploy`, `logs`,
`backup`, `restore`. Restarting one service requires SSH.

`gateway deploy` runs in CI with the real credentials and stops at the `gateway` environment
approval gate, which only the owner can approve.

---

## Direct SSH

```sh
GATEWAY_HOST=$(grep -m1 '^GATEWAY_HOST=' .env | cut -d= -f2-)
ssh -o BatchMode=yes -o ConnectTimeout=10 root@"$GATEWAY_HOST" \
  "cd /opt/gateway/deploy && docker compose ps"
```

Two details do all the work, and both are easy to get wrong:

- **The remote user is `root`**, not your local username (`DEFAULT_REMOTE_USER`,
  `apps/gateway/src/deploy.ts:192` in `marcusrbrown/infra`).
- **Compose lives in `/opt/gateway/deploy`**, not `/opt/gateway` (`DEPLOY_DIR`,
  `apps/gateway/src/deploy.ts:187`). `/opt/gateway` is the repo checkout.

---

## Restart a single service

```sh
ssh root@"$GATEWAY_HOST" "cd /opt/gateway/deploy && docker compose restart gateway"
bunx @marcusrbrown/infra gateway status
```

This drops everything the gateway holds in memory: operator browser sessions and the OAuth state
store. Sometimes that is the point — a saturated OAuth attempt cap clears instantly, where
otherwise it waits out a 10-minute TTL. It also forces every operator to sign in again.

Never restart in place to rotate the mitmproxy CA — workspaces lose trust in the egress proxy.
Restore from backup instead.

---

## Trusted proxies — `GATEWAY_OPERATOR_TRUSTED_PROXIES`

Since `fro-bot/agent` v0.114.1 (PR #1651), the gateway's operator surfaces
behind a reverse proxy **require** the `GATEWAY_OPERATOR_TRUSTED_PROXIES`
environment variable to be set. Operator sign-in and rate limits are keyed on
the resolved client address; when the request arrives through the proxy, the
gateway must be told the proxy is trusted before it will use the forwarded
client address (`X-Forwarded-For`) instead of the proxy's own address.

- **Without it** every proxied operator shares the proxy's address: rate-limit
  buckets and OAuth attempt caps collide across operators, and sign-in can
  fail in ways that look like credential problems.
- **Symptom signature**: operator auth `start` events with neither a success
  nor a failure following (see *Reading logs effectively* below), or rate-limit
  rejections keyed on a single address during normal single-operator traffic.
- **Set it on the droplet** — the gateway runs from `/opt/gateway/deploy` via
  docker compose; the variable belongs in that deployment's environment, not
  in this dashboard repo. List the proxy address/CIDR explicitly (never
  `0.0.0.0/0` — that re-opens address spoofing).
- **Scope**: this dashboard proxies its `/operator/*` surface to the gateway,
  so the requirement applies whenever the dashboard (or any other reverse
  proxy) sits in front of it. Direct (non-proxied) access is unaffected.
- **Verify** after a change: `docker compose restart gateway` (see above), then
  exercise operator sign-in and confirm the audit log's `auth.callback.success`
  events follow their `auth.start` events, and that two different clients get
  separate rate-limit buckets (check the resolved address in the log line, not
  the proxy's).

---

## Upgrading the gateway past v0.116.0 (rm-254)

The commands above assume the deployed topology as it is today. `fro-bot/agent`
v0.116.0 changes three behaviors an operator must know **before** upgrading, and
none of them show up in this runbook's earlier sections:

- **Gateway and workspace images move together.** The workspace agent now runs
  as its own unprivileged `10001:10001` account, separate from the root-owned
  service that holds credentials and controls clones. Deployments must upgrade
  **or roll back** the gateway and workspace images as a pair — a mixed pair is
  a partially-initialized state, not a degraded-but-working one. Existing
  root-owned checkouts are migrated at startup with restart tracking, so expect
  restart churn on first boot after the upgrade.
- **The control API requires the gateway's bearer token on every route except
  `/healthz` and `/readyz`.** Requests without the correct token are rejected
  before their bodies are read. The token is shared with the OpenCode proxy;
  readiness stays public for container health checks.
- **A control-API `401` is an operator-actionable workspace-unavailable error**,
  not an operator-credential failure. When reading logs after an upgrade, a
  burst of `401`s on workspace routes means the workspace image/token side of
  the pair is wrong — do not chase operator auth.

v0.117.0 adds two more log-reading changes: gateway runs bring each checkout up
  to date with the remote default branch before a session (with a
  permission-checked Discord recovery flow for checkouts that cannot safely
  advance), and startup failures now exit with status 1 and **generic** stderr —
do not expect exception details in gateway logs at v0.117.0+.

### Pre-upgrade checklist

1. **Contract support before the pin.** This dashboard mirrors the gateway's
   operator contract at `src/gateway/operator-contract/version.ts`; the target
   gateway version's contract must be at or below that mirror (tracked by
   rm-252) before any pin moves. Upstream contract floors by tag:
   v0.116.0 → 1.7.0, v0.117.0+ → 1.8.0.
2. **Deploy the pair via the infra CLI** (`bunx @marcusrbrown/infra gateway
   deploy`) so both images land in one deployment, and expect the workspace
   restart churn from checkout migration.
3. **Post-deploy**: `gateway status`, then exercise operator sign-in and confirm
   `auth.callback.success` audit events follow their `auth.start` events (see
   *Reading logs effectively*), and that a workspace run starts without `401`s.
4. **Rollback is the same rule in reverse**: both images, together — never roll
   back the gateway alone to "keep auth working" while the workspace stays new.

### Pin parity (verified 2026-10-04)

| Surface | Version | Where |
| --- | --- | --- |
| Deployed gateway | v0.114.1 (trusted-proxies floor, PR #1651) | droplet `/opt/gateway/deploy` |
| Dashboard operator-contract mirror | 1.6.0 | `src/gateway/operator-contract/version.ts` |
| `fro-bot.yaml` action pin | v0.115.1 @ `930ffc9` | `.github/workflows/fro-bot.yaml:340` (workflow `disabled_manually` fork-side) |
| Upstream tip | v0.117.1 (2026-09-30), contract 1.8.0 | `fro-bot/agent` releases |

The dashboard mirror (1.6.0) does **not** yet support the v0.116.0 contract
floor (1.7.0) — that gap, not this runbook, is what currently gates any gateway
upgrade past v0.115.x.

---

## Traps

**Wrong remote user.** `ssh "$GATEWAY_HOST"` uses your local username. With several keys in your
agent this reports `Received disconnect … Too many authentication failures`, not
`Permission denied` — the server cuts off before reaching a usable key. The message sends you
hunting for the right key when the username is wrong. Always specify `root@`.

**Stop after two failed auth attempts.** Repeated failures risk tripping fail2ban and locking
everyone out, which is worse than whatever you were debugging.

**Never `source` the infra repo's `.env`.** It contains multiline SSH keys; `set -a; . ./.env`
throws parse errors and corrupts the environment. Extract single values with `grep`/`cut`.

**`GATEWAY_SSH_KEY` will not authenticate you interactively.** It is materialized to a temp file
and used with `-i` only under `CI=true`.

**Wrong compose directory** gives `no configuration file provided: not found`, which reads like a
missing file rather than a wrong path.

**`GATEWAY_OPERATOR_TRUSTED_PROXIES` must list the proxy chain (gateway v0.114.1+).** Since
fro-bot/agent v0.114.1 the gateway refuses proxied operator sign-ins until this env names the
proxies it may trust for `X-Forwarded-For`; it rejects malformed or ambiguous forwarding rather
than guess the client address. Behind the Caddy topology above, a missing or stale list surfaces
as operator-auth failures at the gateway while everything else looks healthy — inspect the
gateway service's env (`docker compose config`) before debugging auth itself. The dashboard itself
never proxies raw HTTP: its server-side operator client carries the operator session cookie, so
this env gates the Caddy→gateway hop, not the dashboard. Topology background in
`docs/solutions/security-issues/gateway-operator-oauth-rate-limit-shared-key-behind-caddy-2026-09-21.md`.

**Logs are sensitive.** The CLI prints a warning for a reason — output can carry Discord tokens,
S3 credentials, and user data. Never paste it into an issue, PR, or commit message. Extract the
fields you need and delete the capture.

---

## Reading logs effectively

Lines are JSON with a `msg` field. Counting message shapes beats reading sequentially:

```sh
bunx @marcusrbrown/infra gateway logs gateway --tail 300 > /tmp/gw.log
grep -oE '"msg":"[^"]{0,80}"' /tmp/gw.log | sort | uniq -c | sort -rn | head -20
```

Audit events appear as `audit: <kind>` — `auth.start`, `auth.callback.success`,
`auth.callback.failure`, `push.subscribed`, `push.unsubscribed`, `push.dispatch`, `push.disabled`.

**The discriminator worth memorizing:** a `start` event with **neither** a success nor a failure
following it means the handler never ran — look upstream at proxying, rate limits, or redirects. A
`start` followed by a failure means it ran and rejected — look inside it. That distinction is what
identified the outage recorded in
`docs/solutions/security-issues/gateway-operator-oauth-rate-limit-shared-key-behind-caddy-2026-09-21.md`.

Delete the capture when done; it is sensitive.
