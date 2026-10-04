# Security Policy

This repository is a read-only monitoring dashboard for Fro Bot's cross-repo
footprint. This file names the code's security boundary and the private
reporting channel (tracked as `rm-620` in `ROADMAP.md`).

## Scope — the security-relevant surface

Three surfaces carry security weight:

1. **Public read-only API classes** — the `/api/*` routes (status, runs,
   monitoring, listener reads) are rate-limited per path class and serve
   derived, redacted data only. The aggregator fails closed on redaction
   data-branch failures (AGENTS.md, invariant 2).
2. **Listener ingest** — the `/listener/ingest` route authenticates
   webhook-shaped events (HMAC with bounded clock skew) and writes to the
   in-memory listener store; it never holds GitHub credentials.
3. **Operator OAuth session** — `/auth` (GitHub OAuth) plus the
   cookie-session-gated operator surface, including the `/operator/*`
   gateway proxy and the browser-direct operator stream endpoints.

Everything GitHub-facing is read-only by construction: App installation
tokens are minted with an explicit read-only permission subset at mint time
(AGENTS.md, invariant 1). A report of a WRITE path reaching GitHub through
this code is in scope and serious.

## Reporting a vulnerability

Use **GitHub private vulnerability reporting** on this repository
(Repository → Security → Advisories → "Report a vulnerability"). Reports go
only to the maintainers.

- Acknowledgement within **7 days**; a triage disposition (accepted /
  declined / needs-more-info) within **30 days**.
- Include reproduction steps and the affected surface from the list above;
  proof-of-concepts are welcome but not required.
- Coordinated disclosure: publication holds until a fix lands or 90 days
  pass, whichever comes first.

## Out of scope

- **The operator gateway itself** (`fro-bot/agent`): this dashboard proxies
  `/operator/*` to the gateway, but operator auth, session management, and
  push evidence live upstream — report those through the upstream
  repository's security channel.
- **Rate-limit exhaustion / availability**: per-path-class rate limiting is
  a published, deliberate posture (see `README.md`), not a vulnerability.
- Missing-hardening items already tracked in `ROADMAP.md` — the ledger is
  public; tracked work is maintenance, not a vulnerability.

## Related

- `docs/runbooks/security-posture.md` — Scorecard sub-score dispositions.
- `README.md` — surface and rate-limit contracts.
