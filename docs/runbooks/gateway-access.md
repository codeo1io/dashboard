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

This drops everything the gateway holds in memory: the OAuth state store — and with it a
saturated OAuth attempt cap; sometimes that is the point, where otherwise it waits out a
10-minute TTL.

Operator browser sessions survive the restart at gateway **v0.123.x and later**: sessions became
durable (object-store persisted, HMAC-signed, with the expiry FIXED at sign-in — 7 days, extended
by neither idling nor any request; re-login rotates the cookie). Before v0.123.x the restart
dropped in-memory sessions and forced every operator to sign in again. Re-check this paragraph
whenever the gateway pin in `.github/workflows/fro-bot.yaml` moves (fro-bot/agent #1855;
truth-up tracked as rm-2048).

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

### Verifying the dashboard's own limiter buckets through the proxy (rm-183)

The gateway section above governs `GATEWAY_OPERATOR_TRUSTED_PROXIES` on the
**gateway** deployment. The **dashboard** server has its own per-path-class
limiter with its own proxy decision (`RATE_LIMIT_TRUSTED_PROXY`, default OFF —
see README's rate-limit rows). Since 2026-10-09 the default topology carries a
log-once collapse detector: the first time it observes two **different**
`X-Forwarded-For` values arriving at the **same** direct connection address,
it emits one `Rate limiter client collapse` warning and goes silent for the
process lifetime. That warning is the fastest two-source check available:

1. From **two different client sources** (two machines, or one machine plus a
   phone on mobile data — the sources must differ in public IP), note each
   source's public address and issue one request each through the proxy:

   ```sh
   curl -s https://api.ipify.org   # this source's public IP, for step 3
   curl -sS -o /dev/null -w '%{http_code}\n' https://<dashboard-host>/api/healthz
   ```

2. Check the dashboard server's logs for the detector's output:

   ```sh
   docker logs <dashboard-container> 2>&1 | grep 'Rate limiter client collapse' | tail -1
   ```

   The warning carries `directAddress` (the proxy's address), `firstXff` and
   `secondXff` (the two observed forwarded values), and the `pathClass`.
3. **Interpret it** — the warning means all proxied clients currently share
   ONE per-class bucket:
   - If the proxy **overwrites** `X-Forwarded-For` with the real client (verify
     with step 1: the two curls' forwarded values must equal the two sources'
     addresses), set `RATE_LIMIT_TRUSTED_PROXY=1` on the dashboard deployment
     — first-hop keying is then correct per-client keying.
   - If the proxy **appends** (`firstXff` can name an address neither curl
     came from — the chain format is `client, proxy, …`), do NOT enable the
     flag: first-hop keying would be client-spoofable. Fix the proxy to
     overwrite, or accept the shared budget for the single-operator traffic
     pattern this deployment runs.

Two-source discipline matters: a single source can never produce two distinct
forwarded values, so one client alone cannot fire (or verify) the detector —
which is also why a false positive requires two genuinely distinct forwarded
values, not one client retrying. Full background — the shared-key failure mode
behind the gateway variant of this trap — in
`docs/solutions/security-issues/gateway-operator-oauth-rate-limit-shared-key-behind-caddy-2026-09-21.md`.

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
