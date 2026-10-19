/**
 * Named expected def census for the rm-864 render-guard exact-equality leg.
 *
 * Distinct from scripts/roadmap-census.ts (rm-877), which asserts FLOORS
 * (defs >= 200, max >= 856, zero dups) because parallel mints legitimately
 * drift the live count. This constant is the deliberate coordination point:
 * any managed render, integrate graft, or parallel-mint landing that changes
 * the def count bumps this one line in the same change. Two sibling lanes
 * minting concurrently then both bump it — the merge conflict on this file
 * is the signal that the census moved twice, to be reconciled by hand,
 * never silently resolved. test/roadmap-render-guard.test.ts fails until
 * the constant matches the live census.
 */

export const EXPECTED_ROADMAP_DEF_CENSUS = 293
