// Named expected def census for the ROADMAP render-guard census-equality leg (rm-864).
//
// Resolution rule when the guard trips: the failing leg prints the live count — set this
// constant to that number and land it in the SAME commit as the ROADMAP edit that changed
// the census. Never bump it speculatively. The rm-877 floors in test/roadmap-integrity-
// guard.test.ts intentionally coexist: they catch catastrophic collapse; this constant
// catches any drift at all (the silent five-def-drop class of 2026-10-15).
export const EXPECTED_ROADMAP_DEF_CENSUS = 291
