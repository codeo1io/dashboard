---
title: Verify ignore-pattern anchoring semantics before filing coverage findings — unanchored dockerignore patterns already match nested paths, and hand-rolled matchers inherit the same root-anchored misreading
date: 2026-09-25
category: best-practices
module: dashboard
problem_type: best_practice
tags: [dockerignore, gitignore, pattern-semantics, review-methodology, false-positive, guards, testing]
component: build-context
---

# Unanchored ignore patterns match at any level — root-anchored readings produce false-positive findings

## Problem

During the 2026-09-25 cycle (conductor run 7cf68fea, assess attempt 0ac7fa19),
an adversarial review filed a P2 finding against `.dockerignore:15` claiming the
`node_modules` entry was *root-anchored* and therefore missed the nested
`web/node_modules` directory — i.e. that the nested directory still rode the
docker build context to the daemon. The finding was plausible, specific, and
wrong. The `prioritize` phase (attempt f420abfb) disproved it by byte-verifying
the pattern with `cat -A`: line 15 is exactly `node_modules` — no leading slash.
Under dockerignore semantics (same family as gitignore), a pattern with no
leading `/` matches at ANY directory level, so `web/node_modules` was already
excluded.

The same misreading had a second, code-level instance in the same cycle: the
`test/dockerfile-context.test.ts` guard helper matched candidate paths only
against root-anchored interpretations of `.dockerignore` entries. A guard that
is supposed to pin the file's semantics was itself blind to the file's actual
any-level behavior — a guard bug that exactly mirrors the review bug.

## Root cause

Both errors come from one habit: reading ignore patterns as if they were
file-system literals anchored at the repository root. Anchoring in the
dockerignore/gitignore family is *opt-in* (a leading `/`), not default. Without
it, `node_modules` is equivalent to `**/node_modules` — including nested copies.

## Prevention rules

1. **Before filing any "pattern X misses path Y" finding, test the matcher, not
   the eyeball.** The one-liner that settled this cycle:
   `docker build` context inspection aside, the decisive check is textual —
   `sed -n '15p' .dockerignore | cat -A` — does the pattern carry a leading `/`?
   If not, it matches any level and a "nested path uncovered" claim is false.
   (`dockerignore` has no trailing-slash directory marker like gitignore, so
   only the leading anchor matters.)
2. **Guards that pin ignore-file semantics must implement the semantics, not an
   approximation.** The rewritten matcher in `test/dockerfile-context.test.ts`
   (run 7cf68fea implement c3e0acfc) performs any-level matching: an unanchored
   entry `foo` matches `foo`, `a/foo`, and `a/b/foo`; an entry `web/dist` matches
   `web/dist` and `x/web/dist`. If you cannot say which of those your guard
   matches, your guard is not testing the file — it is testing your misreading.
3. **Verify the frame before trusting your own finding.** The false positive
   survived two phases before the `prioritize` phase disproved it — each phase
   re-read the claim instead of re-deriving it. Findings about file contents are
   cheap to re-verify (`git show <sha>:<path> | cat -A`); do it before building
   work on top.

## How this was discovered and corrected

- Disproof: `git show cfe26c4:.dockerignore | sed -n '13,17p' | cat -A` → line
  15 `node_modules$` (unanchored); `git diff --stat cfe26c4 6fd7d04 --
  .dockerignore` → empty (identical at both frames).
- The surviving true half of the finding (artifact paths `test-results/`,
  `playwright-report/`, `.pnpm-store/` genuinely absent) was carried to the
  rm-197 completion rider and implemented; the ROADMAP rm-186 status line
  records the correction in place so the ledger never repeats the claim.
- Guard fix: `test/dockerfile-context.test.ts` now derives its expectations
  through the any-level matcher, so a future root-anchored regression in either
  direction (over- or under-matching) turns the guard red.

## Detection command

```sh
# Anchoring audit for every ignore-file entry (leading '/' = anchored):
sed -n 's|^\([^/#].*\)$|UNANCHORED: \1|p' .dockerignore .gitignore 2>/dev/null
```
