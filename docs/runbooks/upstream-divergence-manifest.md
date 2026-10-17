# Upstream divergence manifest

<!-- rm-1986 (minted 2026-10-18, run c7657b493a33499c97367435101d3d72): the
     executable list of this fork's DELIBERATE divergences from
     fro-bot/dashboard. Every absorb (rm-252) must re-derive each entry
     post-merge and record pass/regression per entry in the cycle doc;
     test/sw-posture-guard.test.ts consumes the [DIV:*] markers below, so the
     manifest and the guard must change together. -->

This repo is a fork of `fro-bot/dashboard` (read-only Fro Bot monitoring
dashboard). Most upstream releases are absorbed wholesale (see rm-252's
window ledger), but a small set of divergences is DELIBERATE — an absorb that
silently reverts one of them is a regression, not a merge. The 2026.10.43
absorb did exactly that to the service worker (took the deliberately-excluded
`sw.ts` pair without a ledger line), which is why this manifest exists
(rm-1985 reconciled the posture; this file keeps it from silently flipping
back).

Each entry below carries a stable `[DIV:<id>]` marker. The guard
(`test/sw-posture-guard.test.ts`) asserts the code state each entry promises;
adding or changing a divergence requires updating both this file and the guard
in the same change.

---

## [DIV:read-only] Read-only by construction (never absorb a write path)

**Divergence:** upstream has adopted an isolated repository-editing (wiki)
capability; this fork keeps the read-only invariant absolute.

**Expected state (re-derive on every absorb):**

- Every GitHub App installation token is minted with an explicit read-only
  `permissions` subset at mint time (`src/github/app-client.ts`).
- No code path writes to GitHub (no content/write permissions requested;
  grep for write-scope permission grants stays empty).
- `AGENTS.md` critical invariant 1 still carries the standing never-absorb
  note (upstream wiki capability, rm-259 disposition).

## [DIV:redaction] Redaction preservation (fail-closed denylist)

**Divergence (hardening on top of upstream):** denylisted repos are excluded
from the installation-enumerated set BEFORE any per-repo GraphQL query, and
the aggregator fails closed on a data-branch read failure.

**Expected state (re-derive on every absorb):**

- `src/github/metadata.ts` exports `redactedNodeIds`; the aggregator excludes
  them before querying (see `src/github/aggregator.ts`).
- Fail-closed behavior on the `.github` `data` branch read is intact
  (`src/github/metadata.ts`): serve stale/empty, never an unfiltered union.

## [DIV:sw-posture] Service worker — full SW, registered, prompt-gated (rm-1985)

**History:** the fork once ran a 65-line kill-switch SW (unregister-only, no
fetch handler; rm-272). The 2026.10.43 absorb silently took upstream's full
`sw.ts` + `sw.test.ts` while leaving the fork's no-op `ReloadPrompt` and
kill-switch docs in place — an unregistered full SW (push dead, three doc
surfaces lying). On 2026-10-18 rm-1985 reconciled by RESTORING registration of
the already-shipped full SW rather than re-asserting the kill-switch, because
the current SW shape is safe against the original rm-272 failure mode.

**Expected state (re-derive on every absorb):**

- `web/src/sw.ts` is the full Workbox SW: `registerRoute`, `precacheAndRoute`,
  a `NavigationRoute`-equivalent document route that is network-always (the
  navigation shell cache is write-only — put on fresh 200s, never served), and
  NetworkOnly API/auth/POST routes.
- `web/src/pwa/ReloadPrompt.tsx` imports `useRegisterSW` from
  `virtual:pwa-register/react` and calls `updateServiceWorker(true)` on
  Refresh — it is the only sender of the `SKIP_WAITING` message that the SW's
  prompt-gated activation (`web/src/sw.ts`) acts on.
- `web/src/shell/AppShell.tsx` still renders `<ReloadPrompt />`.
- The kill-switch shape (self-purge + self-unregister + no fetch handler) must
  NOT reappear without an explicit ledger decision superseding rm-1985.

---

Maintained by the repository-maintenance campaign; changes to this file must
ride the same change-unit as `test/sw-posture-guard.test.ts`.
