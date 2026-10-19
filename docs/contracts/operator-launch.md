---
type: contract
status: active
date: 2026-10-19
consumers: [dashboard operator UI]
producers: [fro-bot/agent gateway]
---

# Operator Launch — behavioral contract (house semantics)

The launch surface is the operator PWA's run-launch flow: the repo picker, the
launch form, and the optimistic pending card that appears the moment the
gateway accepts a run. Its implementation lives in `public/operator-launch.js`
(pure core + DOM shell), with adoption and stream plumbing in
`public/operator-run-index.js`, `web/src/operator/runtime.ts`, and
`web/src/views/Operator.tsx`.

The dashboard is a **client** here. The `POST` target is the gateway's
(`/operator/*`, proxied by the public reverse proxy to `fro-bot/agent`); the
dashboard server deliberately does not mount or proxy these paths — serving
them from the read-only app would make it a credential-forwarding component.
Server-side semantics live with the gateway; this file is the authoritative
record of the **client-side house semantics**, in the same pattern as
`docs/contracts/operator-listener-channel.md`.

**No normative standard applies.** The only candidate,
`draft-ietf-httpapi-idempotency-key-header`, is expired (latest revision
2025-10-15, IESG state Expired — IETF datatracker, checked 2026-10-19), so
house semantics are the contract. That determination is dated here; if a
standard is later adopted, reconcile this file against it in the same change.

Symbol pins below are `function-or-anchor` names with line numbers as of base
`55aedc97` (2026-10-19). Symbols are the durable pin; re-derive lines from the
symbols when reviewing drift.

## Transport summary (client view)

| Path | Method | Auth | Purpose |
| --- | --- | --- | --- |
| `{base}/session/csrf` | `GET` | Session cookie | CSRF token mint |
| `{base}/repos` | `GET` | Session cookie | Repo picker list |
| `{base}/runs` | `POST` | Session cookie + `x-csrf-token` + `idempotency-key` | Launch a run |

- `base` is `/operator` in production; `buildLaunchClient` accepts an
  `endpointBase` override used only by the runtime-loader dev seam
  (`buildLaunchClient`, `public/operator-launch.js:231`).
- Every fetch carries `credentials: 'include'` and `redirect: 'error'` — no
  cross-origin credential forwarding, no redirect following.
- `GET {base}/repos` responses are per-item validated (`validateRepoItem`,
  `public/operator-launch.js:42`): a non-null object with string `owner` and
  `repo`, optional string `channelName`. Anything else is a protocol failure,
  never a partial render. An empty valid list renders exactly
  `No repositories configured.`

### `POST {base}/runs` wire shape

Headers: `content-type: application/json`, `x-csrf-token: <token>`,
`idempotency-key: <key>`. Body: `{repo, prompt}`. The key rides the header
always; it additionally appears in the body **only** in fixture mode (with
`scenario` / `fixtureSessionId`) so the fixture harness can correlate requests
without reading headers — those fields are absent in production.

Success is `200` or `202` with a JSON body containing a non-empty string
`runId`. Anything else on the wire — including a 2xx with a missing or empty
`runId` — is a protocol failure, not a launch.

Client-side preconditions (`launchRun`, `public/operator-launch.js:283-286`):
a blank `csrfToken` or blank `idempotencyKey` fails validation before any
fetch is made.

## Idempotency-key policy

- **One key per submission.** The DOM shell mints at submit time
  (`public/operator-launch.js:609`) and reuses that key for the single retry
  below. A separate submit always mints a fresh key — keys are never reused
  across submissions.
- **Generation.** `mintIdempotencyKey` (`public/operator-launch.js:70`) uses
  `crypto.randomUUID()` when present. It carries a legacy fallback
  (timestamp + `Math.random` base-36, `public/operator-launch.js:78-79`) that
  predates the current key-generation decision.
- **House policy (rm-482 decision evidence, 2026-10-19).** The operator
  surface is served HTTPS-only (`docs/runbooks/gateway-access.md`; localhost
  is itself a secure context), and `crypto.randomUUID` is secure-context-only
  — so the fallback is unreachable in real deployments. The house rule is the
  fail-closed twin at `web/src/push/subscribe.ts:274-281`: when the
  environment cannot mint securely, return null and perform no side effect —
  never fall back to a weaker generator. rm-482 remains open on removing the
  public/ fallback; until it lands, the fallback is documented here as
  non-authoritative and unreachable-in-deployment, not as sanctioned.

## Submission state machine

`submitLaunch` (`public/operator-launch.js:109`) — the key takes an injected
client so the machine is pure and table-tested:

1. `refreshCsrf` — failure → `failure` (generic; no request was sent).
2. `launchRun({repo, prompt, csrfToken, idempotencyKey})`:
   - `200`/`202` `{runId}` → `launched`.
   - `404` → `not-found`. Uniform, no cause, **exactly one attempt**.
   - `429` → `rate-limited`. No retry, **exactly one attempt**.
   - `400` → `refreshCsrf` **once**; if the refresh fails → `failure`.
     Otherwise retry `launchRun` **once** with the fresh token and the
     **same idempotency key**. Retry success → `launched`; retry failure
     (any status) → `failure`. **No third attempt.**
   - any other error (network, protocol, other HTTP status) → `failure`.

The `400` retry exists for CSRF-token expiry: the cure is a fresh token, and
reusing the idempotency key means the retry can never double-launch even if
the first request was lost after acceptance.

Pinned fixtures (`test/operator-launch-core.test.ts`): happy path `:87`,
CSRF retry + same-key + no-third-attempt `:120-176` (including the no-oracle
test `:176` — a `400` outcome is the same generic failure regardless of
underlying cause), no-retry-on-`404`/`429` `:201`, `refreshCsrf` failure
`:258`, mint `:275`, hooks `:292`.

## Error taxonomy and UI copy

All copy is fixed and coarse. No cause is inferred from body, status detail,
or timing; all `400`s collapse to one generic failure.

| Outcome | Copy | Pin |
| --- | --- | --- |
| Empty prompt (pre-flight) | `Please enter a prompt before launching.` | `public/operator-launch.js:572` |
| No repo selected (pre-flight) | `Please select a repository.` | `:592` |
| `not-found` (HTTP 404) | `The selected repository is not available for launch.` | `:801` |
| `rate-limited` (HTTP 429) | `Too many launch requests. Please wait before trying again.` | `:806` |
| `failure` (everything else, incl. retry-exhausted 400, network, protocol) | `Launch failed. Please try again.` | `:618`, `:811` |

Repo-picker load failures (`public/operator-launch.js:493-507`):

| Cause | Copy |
| --- | --- |
| HTTP 401/403 | `Sign in required to load repositories.` |
| HTTP 429 | `Repository list temporarily unavailable. Try again shortly.` |
| Other HTTP / protocol | `Repository list unavailable.` |
| Network | `Repository list unavailable — check your connection.` |

## Optimistic pending card

On `launched`, before any fetch confirms the run, the shell inserts a pending
card at the **head** of the unified run-index list
(`[data-role="run-index-list"]`, `public/operator-launch.js:756`).

Identity and anatomy (`public/operator-launch.js:643-746`):

- `data-testid="run-card"`, `data-run-id="<runId>"`,
  `data-optimistic="true"`, `role="button"`, `tabIndex=0`,
  `aria-label='New run, status: Pending'`.
- Status group: a `run-status` span with class `run-status status-pending`
  and text `Pending`, plus an initially-empty `run-reason` span — the same
  status-group anatomy the run-index renderer emits.
- `run-repo` span: filled **only** from the validated picker value,
  **snapshotted before the await** so a mid-flight picker change cannot
  mislabel the card; `textContent` only, never `innerHTML`; the unvalidated
  form-data fallback is never rendered. If absent, the fetched view fills it
  on adoption.
- `<time>` with `datetime` = the launch instant, marker
  `data-time-source="launch"` (`LAUNCH_TIME_SOURCE`,
  `public/operator-time.js:10`), text = relative time.
- The full hidden substructure in fetched-card slot order:
  `run-checkout-detail`, `run-waiting`, `run-output`,
  `run-output-coalesced`, `run-output-gap`, `run-approvals`,
  `run-questions`, `approval-badge`, `run-cancel` — so the stream renderer
  and cancel control find the same slots as on a fetched card.

The launch module does **not** wire click/keyboard expansion: the run-index
module owns `toggleCardExpansion` and its single-open bookkeeping (the two
public modules load as separate query-keyed instances — see the comment at
`public/operator-launch.js:748-753`).

List cap: `LAUNCH_RUN_INDEX_CAP = 100` (`public/operator-launch.js:33`),
mirroring `RUN_INDEX_CAP` (`public/operator-run-index.js:16`). On overflow
the shell evicts the oldest **terminal** card; never the just-inserted card,
never a stream-attached card (`public/operator-launch.js:761-777`).

Fixture: `web/src/operator/launch-card.test.ts` (anatomy parity with
`renderRunCard`, operable-before-adoption, picker-snapshot semantics).

## Adoption on real delivery

`diffRunIndexList` (`public/operator-run-index.js:681`) reconciles in place —
it never clears the list wholesale. For a card the fetch does not list:

- **Protected** while (a) it is the active-stream card
  (`data-stream-attached="true"`), or (b) it carries
  `data-optimistic="true"` and its `run-status` does not yet show a terminal
  class (`status-succeeded` / `status-failed` / `status-cancelled`).
- **Ghost rule:** once the stream resolves a still-unlisted optimistic card
  to terminal, protection ends and the next diff removes it — a launch card
  is never left as a perpetual ghost.
- **Head rule:** an unlisted optimistic card stays at the head of the list
  (it is the newest run) until a fetch lists it.
- **First listing:** `ensureRunCardAnatomy`
  (`public/operator-run-index.js:1048`) upgrades the card in place with what
  a fetched card has (repo label, time, cancel region, role, expansion
  listeners), `updateCardInPlace` (`:817`) fills the safe fields, then
  `data-optimistic` is deleted. A launch-seeded `<time>` (or its
  `data-time-source` marker) is removed as the list's `updatedAt` takes over
  (`:791`).
- Allowed attribute mutations on a non-active card are a closed set — see the
  contract comment directly above `diffRunIndexList`.

## Stream attachment and the runtime seam

- `streamModuleSpecifier()` returns `/static/operator-stream.js?manual=1`
  (`public/operator-launch.js:202`): the `manual` flag makes the stream
  module skip its auto-bootstrap so launch and runtime never double-own the
  lifecycle.
- When the React runtime supplies `onRunLaunched(runId, card)`
  (`web/src/operator/runtime.ts:873`), the runtime owns attachment: it
  attaches the stream to the card's `run-status` element and the shared
  `stream-status` notice, writes the run hash, and marks the card
  expanded-for-launch — so the operator's first click on it is an expand,
  not a misread "collapse the active stream". The runtime closes any prior
  stream first (centralized active-stream ownership).
- Legacy path (no callback): the shell calls `initOperatorStream` directly
  and stores the handle; `resetLaunchState` closes it.
- `resetLaunchState` (`public/operator-launch.js:830`) is the React cleanup
  seam: it bumps the generation counter (invalidating pending inits), aborts
  the submit listener (ownership-checked so stale cleanup cannot abort a
  newer listener), and closes the launch stream handle. In-flight submit
  mutual exclusion is generation-scoped: a submit abandoned by a torn-down
  mount cannot wedge a fresh mount.

## `launch-success` CustomEvent

Dispatched on the `#launch-form` element after card insertion and form reset
(`public/operator-launch.js:795`):

```js
launchForm.dispatchEvent(new CustomEvent('launch-success', {
  bubbles: true,
  detail: {runId},
}))
```

Consumer (`web/src/views/Operator.tsx:170-192`): closes the launch drawer and,
after a 50 ms timeout, focuses the new top card — **only** if focus was on a
launch affordance (submit button or drawer trigger) when success fired; an
operator who already moved on is never focus-stolen. Fixtures:
`web/src/views/Operator.test.tsx:884` (drawer reacts) and `:893` (focus-steal
guard).

`runId` appears only in the event detail, the `data-run-id` attribute, and
the stream URL — never in logs or rendered text.

## Security posture

- Never log the prompt, CSRF token, idempotency key, or `runId` (the
  `data-run-id` attribute excepted); repo names are not logged either.
- The user-typed prompt goes only in the `POST` body — never in logs, DOM, or
  error copy.
- `credentials: 'include'` + `redirect: 'error'` on every fetch.
- All `400`s collapse to one generic failure; `404` is one uniform
  unavailable state; no cause inference from body or timing.
- Fixture-mode body fields exist only behind the fail-closed fixture harness
  flag (`DASHBOARD_FIXTURE_HARNESS_ENABLED`, exact `'true'`).

## Drift detection at review time

Every claim above names its code anchor; the behavioral fixtures are
`test/operator-launch-core.test.ts` (state machine, taxonomy, mint),
`web/src/operator/launch-card.test.ts` (card anatomy), and
`web/src/views/Operator.test.tsx` + `web/src/operator/runtime.test.ts`
(event and seam consumers). A change to any pinned behavior — the retry
count, the same-key rule, the copy strings, the card anatomy or adoption
rules, the event shape — must update this file in the same change, and a
review of this file against the anchors above detects silent drift.
