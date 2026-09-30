# Gateway Access

The dashboard's operator surface is not served by this app. `https://dashboard.fro.bot/operator/*`
is proxied by Caddy to a gateway running `fro-bot/agent`, and that gateway owns operator auth,
sessions, and push. When operator login or push misbehaves, the evidence is in the gateway's logs,
not this repository's — and no test here can reach it.

This runbook covers getting to that evidence. Every trap below cost real time during a production
outage, so read them before improvising a command.

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

## Gateway failure semantics (v0.116/v0.117)

The Fro Bot workflow pin at `fro-bot/agent v0.117.0` adopts two operator-visible behavior
changes; know them before reading a dead gateway as a crash:

- **A failed gateway start is a generic stderr line and exit 1** (v0.117.0, #1677). Startup
  failures no longer log exception details, so a bare exit-1 with no stack in the container logs
  is the *expected* failure signature, not evidence of a corrupted install. Debug through the
  journal and provenance records below, not through a stack trace you no longer have.
- **`401` from the workspace control API is operator-actionable** (v0.116.0, #1661/#1665). Every
  control route except `/healthz` and `/readyz` requires the gateway's bearer token; requests
  without it are rejected before their bodies are read, and the gateway treats the `401` as a
  workspace-unavailable condition — not a credentials bug to chase in the dashboard.
- **Checkouts auto-advance before each session** (v0.117.0, #1675). The gateway brings each
  repository checkout up to the remote default branch before starting a run. A checkout that
  cannot be safely advanced stops the run **without discarding its contents** and reports why;
  prior checkouts remain available as capped backups, update and recovery operations are
  journaled, and provenance records whether the checkout advanced — read those records before
  replacing anything.

The v0.116.0 workspace-user split also means gateway and workspace images must be upgraded or
rolled back **together**; a mixed pair fails at startup with exactly the generic signature above.

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
