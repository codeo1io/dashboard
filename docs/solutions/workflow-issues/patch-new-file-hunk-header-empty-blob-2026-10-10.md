---
title: Missing @@ hunk header makes hand-composed new-file patches apply as empty files
date: "2026-10-10"
category: workflow-issues
module: dashboard
tags: [patches, git-apply, spool, empty-blob, e69de29, intent-to-add]
problem_type: patch-construction
---

# Missing @@ hunk header makes hand-composed new-file patches apply as empty files

## Problem

The cycle:2 prioritize phase composed its spool patch (`prioritization-c65cc606.patch`) by
hand. The new-file entry carried the full `diff --git` header, `new file mode`,
`index 0000000..0000001`, `--- /dev/null` and `+++ b/<path>` lines — but NO
`@@ -0,0 +1,N @@` hunk header before the `+` body lines.

`git apply --check` reported CLEAN, and `git apply` exited 0 — both vacuously: a create
with zero parseable hunks is a valid no-op that materializes the path as an EMPTY file
(blob `e69de29bb2d1d6434b8b29ae775ad8c2e48c5391`). Every downstream phase diffed from that
tree state, so the batch decision doc rode the implement patch, targeted tests, and the
full two-mirror battery as a 0-byte stub. Nothing failed because no gate asserts
documentation content; the doc's bytes had never been in any tree that a validation
command read.

A second, related trap produces the same symptom: staging a new file with
`git add -N` (intent-to-add) and then running a plain `git diff` emits a header-only
entry when the worktree file is empty, and a `+++ b/<path>` header WITHOUT
`--- /dev/null` in some git versions — patch round-trips then depend on index state
rather than tree content.

## Detection (cheap, first-hand)

- `grep -c '^@@ ' <patch>` per file entry — every file entry needs at least one hunk
  header (a pure-rename entry is the only exception).
- `grep '^index 0000000..e69de29' <patch>` — the empty-blob pair is a hard fail.
- After applying: `find <changed-doc-paths> -size 0` and `git ls-files -s <path>` —
  blob must not be `e69de29…`.

## Solution

Emit cumulative patches from a REAL tree diff, never by concatenating hand-written
headers:

1. `git apply` the layers onto the pristine base worktree.
2. `git add -A` (fully stage; do not rely on intent-to-add).
3. `git diff --cached > spool.patch` — new files emit `--- /dev/null`, a real hunk
   header, and their true blob hash.
4. Round-trip on a clean checkout: `git apply --check spool.patch`, apply, verify the
   new files are non-empty (`wc -c`), restore, `git status --porcelain` empty.

At compound (`b2800b21`, run `19c024286fc4`) this exact construction was used to repair
the batch record: authored content restored verbatim (byte-identical to the spool
decision doc, verified by `diff`) plus a dated outcome appendix, and the emitted compound
patch was checked to carry a non-`e69de29` blob for every new file.

## Prevention rule

A hand-composed spool patch is not done until it has round-tripped through a real tree.
`git apply --check` passing proves the patch is parseable, not that it carries the
content you think it does — an absent hunk header on a create is silently accepted.
