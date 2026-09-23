---
title: Tracked .conductor engine state survived a landing merge and reddened main's own guard
date: 2026-09-24
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: high
applies_when:
  - Landing an autonomy/agent batch into a repository with an engine-state exclusion convention
  - Any integrate or landing merge whose OURS side already contains engine-internal files
  - Staging landing commits with git add -A or git add .
---

# Problem

The dashboard repository keeps conductor engine state (`.conductor/progress/*.ndjson`
breadcrumbs) **untracked by convention only** — the repo deliberately does not
gitignore it. On 2026-09-23, conductor-landing commit `61fad97` (run 732706238ca8)
staged `.conductor/progress/70f231743fbd4e3a82afb82232a13c4d.ndjson` — an
engine-internal breadcrumb — and landed it TRACKED on `origin/main`.

Two properties made this worse than a one-off:

1. **The guard existed and reddened main for days.** `test/fork-exclusion-guard.test.ts`
   ("no `.conductor/` engine state is tracked in git", rm-131) failed the Main Test
   job at every subsequent tip (`763c1fa` run 35883003173), so the branch was RED
   while every other signal looked fine.
2. **The file re-introduces itself on every later merge.** Because the residue sat
   on the OURS side of future integrate merges and the THEIRS side did not touch it,
   auto-merge kept it alive silently — deleting it once does not protect the next
   landing; each merge re-adds it as an ours-side survivor.

# Root cause

- Staging by directory (`git add -A` / `git add .`) instead of an explicit file
  list sweeps untracked-but-not-ignored paths into the commit. `.conductor/` is not
  gitignored (convention-only exclusion), so it is exactly such a path.
- Merge resolution treated the file as "ours-added, theirs-untouched", which
  auto-merge resolves by keeping it — no conflict is ever surfaced.

# Solution

**Stage landing commits by explicit file list — never `git add -A` / `git add .`.**
Conductor engine state stays untracked; only modified tracked files plus intended
new artifacts are staged, each named.

**After ANY integrate/landing merge, sweep the index before handing off:**

```bash
git ls-files .conductor          # must print NOTHING
# if it prints anything:
git rm --cached .conductor/progress/<file>.ndjson   # stages the deletion,
                                                    # file stays on disk untracked
```

The deletion rides the landing commit itself, so the pushed tip satisfies the
fork-exclusion guard (`git ls-files .conductor` empty) and CI goes green.

# Verification

- `git ls-files .conductor` → empty (the guard test asserts exactly this).
- `git ls-tree -r origin/main .conductor/` → empty after the recovery lands.
- Main Test job green at the recovered tip.

# References

- Roadmap items rm-131 (the guard) and rm-149 (the 2026-09-24 recovery batch,
  docs/prioritization/2026-09-24-cycle-8-batch.md B1).
- Reproduction of the ours-side survivor: merge any branch into a tree where the
  file is tracked on ours and absent on theirs — no conflict, file survives.
