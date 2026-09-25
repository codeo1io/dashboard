# Superseded Batch-PR Disposition

Landing batches out of order is normal: cycle-N+1 can land while cycle-N's PR
is still open, and main can absorb a cycle-N PR's payload through a different
merge. When that happens the open PR is **superseded** — its diff no longer
represents work main needs, and leaving it open pollutes the queue every later
cycle has to re-triage (oldest-first review, stale-base noise, phantom
conflicts).

This runbook is the disposition path for that state. It is the non-draft
sibling of the drafts-only sweep tracked as `rm-181`: this covers **open,
non-draft PRs whose payload has already landed (or become moot) elsewhere**;
`rm-181` covers drafts. Do not conflate them — a superseded non-draft PR is
closed with rationale, a draft is deleted or landed on its own merits.

The concrete case that minted this runbook (rm-198): PR #10, "land stranded
cycle-4 truth batch", open since 2026-09-21 while eight younger PRs merged —
its `base-drift.yaml` payload had already reached main through another
landing, so every day it stayed open it cost the next cycle a re-triage.

---

## When a PR is superseded (the two tests)

Run both before closing anything. "Old" is not a reason; "payload already on
main" is.

**Test 1 — payload identity.** Does the PR's diff still change main?

```sh
gh pr view <N> --json title,createdAt,baseRefName --jq '.title + " | " + .createdAt'
gh pr diff <N> --name-only                 # files it touches
# Fetch the PR's head into a local ref (reviews 2026-09-25: diffing the local
# HEAD is a no-op in a clean checkout at main — it can never distinguish
# superseded from unique)
git fetch origin main 'refs/pull/N/head:pr-N'
# Per-file verdict: byte-compare the PR's blob against origin/main's. An
# empty diff on a payload file == superseded; any difference == unique hunk.
while read -r f; do
  if git diff --quiet origin/main pr-N -- "$f"; then
    echo "superseded: $f"
  else
    echo "UNIQUE HUNKS: $f"
  fi
done < <(gh pr diff <N> --name-only)
# Whole-payload alternative (one verdict for the entire PR):
gh pr diff <N> | git apply --check --reverse 2>/dev/null && echo 'fully on main' || echo 'carries unique hunks'
```

The mechanical check that matters: for each file the PR touches, compare the
PR's blob against `origin/main`'s — the per-file loop above prints a verdict
line for every payload file (`while read -r` survives paths with spaces),
never a silent no-op. If every payload file's content (not just its path)
already exists on main — typically because a later cycle rebased the same fix
and landed it — the PR is superseded. A PR that still carries a unique hunk is
NOT superseded, however old it is; it needs a rebase decision, not a close.

**Test 2 — mooting context.** Did a later landed item track the same problem?
Check the ROADMAP lineage of the PR's stated purpose:

```sh
gh pr view <N> --json body --jq '.body' | grep -oE 'rm-[0-9]+' | sort -u
grep -n '<those rm-ids>' ROADMAP.md | head
```

If the ROADMAP marks the item implemented/landed by a different PR, the open
PR is superseded even where byte-level payloads differ (its intent shipped).

---

## Disposition

Exactly one action per PR, and it is a **close-with-comment, never a merge and
never a force-push**:

```sh
gh pr close <N> --comment "<rationale>"
```

Comment template (fill every bracket — the comment is the audit trail):

```text
Closing as superseded (rm-198 disposition).

This batch's payload has already reached main: [WHAT landed, WHERE —
PR #X / commit Y carries <file:change>].

Lineage: [rm-ids this PR intended to land] are tracked as landed in
ROADMAP.md via [the other PR/commit].

If any of this is wrong, reopen with the specific hunk that main still
needs — happy to rebase instead.
```

Rules:

- **Never delete the branch before closing** — the diff must stay reviewable
  after close for the audit trail above to be checkable.
- **Do not stack dispositions onto code commits.** A close-with-comment is a
  repo operation, not a change; it never rides a batch PR (see the batch doc's
  separation hints).
- **One proven closure per cycle.** Disposition sweeps are exactly-in-time:
  close the PRs you can prove superseded this cycle with the two tests above.
  Do not bulk-close by age — that is how live work gets dropped.

---

## Keeping the queue honest afterwards

- Record the closure in the cycle's `docs/prioritization/<date>-cycle-N-batch.md`
  under a "landing-queue hygiene" note: PR number, close date, the evidence
  line from Test 1 or Test 2.
- If the same payload keeps reappearing in open PRs across cycles, that is a
  landing-order problem upstream of this runbook — file it as a roadmap item,
  do not keep closing clones.
