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

## Gateway upgrades — v0.116.0+ coupling facts (rm-254)

Three facts from `fro-bot/agent` v0.116.0 (released 2026-09-26) change how a
gateway upgrade behaves. Working this runbook through one without them sends
you hunting 401s and partial-image states in the wrong places:

- **Gateway and workspace images upgrade or roll back TOGETHER.** The two
  images are coupled: a gateway past v0.114.1 paired with an older workspace
  image (or the reverse) is a partial-image state. `bunx
  @marcusrbrown/infra gateway deploy` moves the gateway, so confirm the
  workspace image pin moves in the same deploy (check `/opt/gateway/deploy`'s
  compose file on the droplet) — or roll both back together.
- **The gateway bearer token is required on every control route except
  `/healthz` and `/readyz`.** A request to a control route without it is a
  401 — not an auth-cookie problem, not a proxy problem. Check the token
  before debugging operator auth itself.
- **Since v0.116.0 a 401 means operator-actionable workspace-unavailable, not
  auth-required.** On the run-status surface this arrives as the
  `workspace-unavailable` failure kind and renders as the non-retriable
  `Workspace unavailable — not retriable` label — deliberately distinct from
  transient `workspace-unreachable` (`Workspace unreachable — retry may
  succeed`; rm-864). Note the split of surfaces in this dashboard: persistent
  400/401/403 on the approval/control mutations still surfaces the
  session-expired reload affordance; the workspace-unavailable classification
  rides the run-status frames. A 401 during an upgrade window is expected
  mid-deploy, not evidence of credential loss.

### Pre-upgrade checklist

1. **Contract support first.** The dashboard's accepted contract versions
   (`SUPPORTED_OPERATOR_CONTRACT_VERSIONS` in `src/gateway/operator-contract/version.ts`)
   must include the target gateway's contract version BEFORE the infra pin
   moves — the SSE reader fail-closes on any version outside the window, so a
   gateway serving an unsupported version darkens `/operator/*` for this
   dashboard until the window grows (the rm-252 absorb discipline).
2. Move gateway + workspace images in the same deploy (see coupling above).
3. Re-verify with `bunx @marcusrbrown/infra gateway status`, then exercise
   operator sign-in and check the `auth.start` → `auth.callback.success`
   pairing from *Reading logs effectively* below.

### Pin-parity table (as of 2026-10-10)

| Surface | Where | Value | Re-verify |
| --- | --- | --- | --- |
| Deployed gateway | `marcusrbrown/infra` deploy | v0.118.2 (infra `faf71414`, 2026-10-07T20:11:52Z, PR #1484) — serves operator contract 1.8.0 | `bunx @marcusrbrown/infra gateway status`, or the infra repo's gateway-bump commits |
| Fork workflow pin | `.github/workflows/fro-bot.yaml` (`Run Fro Bot` step) | `fro-bot/agent` v0.118.3 @ `d88c245f` (rm-252, 2026-10-09; the workflow itself is `disabled_manually` on this fork, so the pin records intent until re-enabled) | `grep -n 'fro-bot/agent@' .github/workflows/fro-bot.yaml` |
| Mirror contract window | `src/gateway/operator-contract/version.ts` | primary `1.8.0`, window `{'1.8.0'}` only — `1.6.0` retired at the rm-252/rm-157 flip (run 28cd8f6c, landed 2026-10-10; this row trued up at the 769b507 integrate: the run authored it against the pre-flip `{1.6.0, 1.8.0}` window) | `grep -n "1.8.0" src/gateway/operator-contract/version.ts` |

Keep the table current whenever any of the three pins moves: a skew between
the deployed gateway's contract version and the mirror window is exactly the
dark-operator-surface failure mode the checklist prevents.

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
