---
title: gh run list --created with a bare date matches only that day and the open-ended "date.." form returns nothing — recency windows must pass a closed range
date: 2026-10-18
category: workflow-issues
module: dashboard
problem_type: cli_semantics
component: continuous_integration
severity: high
applies_when:
  - A workflow gate dedupes or skips based on "any successful run inside a recency window" via `gh run list --created`
  - A gate computed `since="$(date -u -d 'N days ago' +%Y-%m-%d)"` and passed `--created "$since"` expecting "since or later"
  - `gh run list --created 'YYYY-MM-DD..'` (open-ended) silently returns an empty list instead of an open range
problem: |
  `gh run list --created` accepts a single date or a `start..end` range, but
  neither does what a recency-window gate needs by default:

  - A BARE date (`--created 2026-10-16`) matches runs created ON 2026-10-16
    only (verified live 2026-10-18 on this repo: 20 runs, all that day).
  - An OPEN-ENDED range (`--created '2026-10-16..'`) returns an EMPTY list —
    the CLI does not treat a missing end as "now" (`[]`, verified live).
  - Only the CLOSED range (`--created '2026-10-16..2026-10-18'`) behaves as a
    range (verified live: 20 runs, full page).

  The rm-1961 workflow_run fallback gates (canary.yaml / audit.yaml /
  base-drift.yaml) computed `since` and passed the bare date, so their dedupe
  could only ever suppress on a success EXACTLY 6 days back — the other five
  days of the window counted as "no recent success" and the fallback over-fired
  (observed 8 Main-on-main completions in ~16h at review time). The bug is
  silent: `gh` exits 0, the jq count is plausible, and the gate reads correct.

solution: |
  Always pass a CLOSED range, computing both ends in the gate:

      since="$(date -u -d '6 days ago' +%Y-%m-%d)"
      today="$(date -u +%Y-%m-%d)"
      recent="$(gh run list -R "$GITHUB_REPOSITORY" --workflow canary.yaml \
        --status success --created "${since}..${today}" \
        --json databaseId --jq 'length')"

  Two adjacent traps hit while landing this cure (both verified first-hand):

  - ACTIONLINT PARSES `${{ }}` INSIDE COMMENTS. A YAML comment explaining the
    env mapping must not contain the literal `${{ }}` token — actionlint
    reads it as an empty expression and fails the file (first run red at
    canary/audit/base-drift; reworded to prose, rc=0 after). Write "the
    expression token" in prose, never the literal characters.
  - EVENT-DERIVED VALUES STAY OUT OF THE SHELL STRING. `head_branch` and
    `event_name` are mapped into `env:` and read as quoted shell variables
    (`HEAD_BRANCH`, `EVENT_NAME`), never interpolated inline in `run:` —
    same hardening class as scripts-callee injection.

verification: |
  Live discriminating triple against this repo (review 50b83885, 2026-10-18):
  bare `2026-10-16` → 20 runs all on that day; `2026-10-16..` → []; closed
  `2026-10-16..2026-10-18` → 20 runs (full page). Post-fix gates carry the
  closed range at canary.yaml, audit.yaml, base-drift.yaml (review-fix
  215b214c / af2b0cc4); actionlint 1.7.12 container-form rc=0 on all three.
tags: [gh-cli, gh-run-list, created-flag, date-range, recency-window, dedupe, workflow_run, actionlint, env-mapping]
related_docs:
  - docs/solutions/workflow-issues/actionlint-pipx-missing-container-form-2026-09-19.md
---
