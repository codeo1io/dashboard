---
title: CodeQL js/insufficient-password-hash fires on RFC 7636 PKCE S256 when a test hashes cookie-derived input
date: 2026-09-29
last_updated: 2026-09-29
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: medium
applies_when:
  - 'A change adds or touches PKCE plumbing (`code_verifier` / `code_challenge`) in `src/auth/oauth.ts` or `src/routes/auth.ts`, or their tests'
  - 'CI fails the ephemeral validation with a CodeQL `js/insufficient-password-hash` (HIGH) annotation pointing at the SHA-256 call inside `pkceChallengeFromVerifier`'
  - 'The flagged "password" source is a call to `getSetCookie` or any other cookie/echo reader in a TEST file'
tags:
  - codeql
  - pkce
  - oauth
  - testing
---

## Problem

`pkceChallengeFromVerifier` is a plain SHA-256 (`createHash('sha256')`) — that is exactly
the construction RFC 7636 §4.2 mandates for the S256 challenge, and for a 256-bit random
verifier it is cryptographically correct. CodeQL's `js/insufficient-password-hash` does not
model that intent: it treats any fast hash over an attacker-influenced string as a password
hash. In cycle 18 (run 11121ee89bf3, 2026-09-29) the rule fired HIGH at
`src/routes/auth.ts:37` — but the taint flow lived entirely inside `test/auth.test.ts`: the
round-trip test read the PKCE verifier back out of the `Set-Cookie` header via `getSetCookie`
and fed that cookie-derived string straight into the challenge helper to assert
`S256(cookieVerifier) === issuedChallenge`.

Production code was innocent; the test manufactured the flow.

## Solution

Do not route cookie-derived (or any untrusted-source-modeled) strings into a hash call,
even in tests — the rule cannot tell a test from production, and it should not have to.
Keep the binding property asserted at the seam that already enforces it:

- The fake `GitHubOAuthClient` used by `test/auth.test.ts` computes S256 itself at exchange
  time and rejects any verifier that does not hash back to the challenge it issued. A
  happy-path callback round-trip therefore proves the redirect ↔ exchange binding end to
  end without the test hashing anything.
- Assert observable shape instead: verifier is 43 chars of base64url (RFC 7636 §4.1);
  challenge decodes to 32 bytes and round-trips through base64url padding.

The cycle-18 fix was exactly this restructuring (`test/auth.test.ts`, the old
`S256(cookieVerifier)` assertion replaced by shape checks + a comment naming the fake's
exchange-time enforcement). CodeQL `Analyze` then went green on three successive ephemeral
validation runs.

## Prevention

When writing auth round-trip tests, treat hashing helpers as untouchable sinks: the test
may compare captured strings for equality, but must never itself call the hash function on
captured cookie/header material. If a new assertion seems to require hashing, first check
whether a seam (fake client, contract test) can enforce the same property on the production
side of the boundary.
