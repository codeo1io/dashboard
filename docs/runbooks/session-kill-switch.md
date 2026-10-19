# Session Kill Switch

How to kill a dashboard operator session cookie before its 24-hour expiry —
either one stolen cookie (targeted revocation) or every outstanding session at
once (cookie-key rotation). This runbook covers the dashboard's **own** operator
cookie sessions (the `/auth` Arctic flow). When the dashboard runs in gateway
operator-session mode, dashboard cookie sessions are not used at all — gateway
sessions live in `fro-bot/agent` and are covered by
[docs/runbooks/gateway-access.md](gateway-access.md).

The dashboard is read-only by construction, so revocation is deliberately an
**operator-box CLI, not an HTTP surface** — there is no server-side write path
that revokes a session. All commands below run on the box that serves the
dashboard.

## The two levers

| Lever | Scope | Cost |
| --- | --- | --- |
| Targeted revocation (`scripts/session-revoke.ts <jti>`) | one session id | none — every other session stays valid |
| Cookie-key rotation (new `/data/cookie.key`) | every outstanding session | one-time re-login for the operator |

Prefer targeted revocation for a single stolen/suspect cookie. Rotate the key
when the compromise is broader than one cookie or you cannot identify the
cookie's session id.

## Reading a session id (`jti`) from a cookie

Every signed cookie carries a unique per-signing session id (`jti`, 32 hex
chars) inside its signed payload. In browser devtools (Application → Cookies →
`session`), copy the cookie value — it is `<base64url(payload)>.<base64url(hmac)>`
— and decode the first segment:

```sh
node -e 'console.log(Buffer.from(process.argv[1].split(".")[0], "base64url").toString())' '<cookie value>'
# → {"jti":"6f9c…32 hex chars…","login":"octocat","exp":1792000000}
```

The `jti` is what you revoke. The signature covers it, so a holder of the cookie
cannot change their session id without invalidating the cookie entirely.

## Revoking one session

```sh
node scripts/session-revoke.ts <jti> --login octocat
```

- `--login` is an audit label only (recorded in the revocation record).
- `--expires-at <epoch>` optionally records the cookie's own `exp` so a later
  `--prune` can drop the entry once the cookie would have expired anyway.
- `--file PATH` overrides the record file for this invocation.
- `--json` prints machine-readable output.

The write is atomic (temp file + rename), so the running server never observes a
half-written record, and the server picks the revocation up **without a
restart** — the next request carrying that cookie is treated exactly like an
expired one (redirect to `/auth/login`). Revocation survives server restarts:
the record is re-read at boot. Re-running the command for the same `jti` is a
safe no-op (`already present`, file untouched).

The record file defaults to `/data/session-revocations.json` (sibling of the
cookie key); override with `DASHBOARD_SESSION_REVOCATIONS_FILE` for the server
and pass `--file` to the tool so both read the same file.

## Listing and pruning

```sh
node scripts/session-revoke.ts --list
node scripts/session-revoke.ts --prune
```

`--prune` drops entries whose recorded `expiresAt` has passed (entries with no
recorded expiry are kept — unknown expiry is conservative-keep). Expired entries
are also pruned opportunistically on every revoke write.

## Fail-closed semantics — read this before touching the record file

The server treats the record file as security-critical state:

- **Absent file** — no revocations have ever been recorded; nothing is revoked.
- **Corrupt, unreadable, or wrong-shaped file** — the server **denies every
  session** (fails closed, with one `logger.error` line naming the file) until
  the file is fixed or removed. A broken denylist must never silently re-admit
  the very sessions it was written to kill.
- `session-revoke.ts` refuses to write to a corrupt record (exit 1) rather than
  silently rewriting it. To recover from a poisoned state: delete or repair the
  file, then re-record the revocations (`--list` on a repaired file shows what
  survived).

Exit codes: `0` success (including already-revoked and no-op prune), `1`
corrupt-record refusal, `2` usage error.

## Nuke-all: rotating the cookie key

Rotating the signing key invalidates **every** outstanding cookie regardless of
the denylist — the stronger lever. The key is read by `loadCookieKey()`
(`src/session.ts`) from `DASHBOARD_COOKIE_KEY_FILE`, default `/data/cookie.key`
(≥32 bytes). On the operator box: generate a new key, swap the file (atomically,
same temp+rename discipline), and restart the server — every session, revoked or
not, fails signature verification and the operator signs in once. Key rotation
is also the only lever that kills sessions when the revocation record itself is
the thing you do not trust.

## Deploy note

Cookies minted before the kill-switch landed (payload without `jti`) are
rejected once at deploy — a single re-login. They cannot be revoked by id
because they carry no id; if one is suspect, rotate the key instead.
