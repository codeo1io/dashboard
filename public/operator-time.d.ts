/**
 * Type declarations for public/operator-time.js.
 *
 * rm-2062 twin: the vendored time module is the only operator runtime script
 * that shipped without a declaration sibling (launch / run-index / stream each
 * have one), so `pnpm check-types` could not see its export surface at all —
 * a rename inside the .js failed at runtime, not at the gate. This twin
 * declares the shipped exports; test/operator-time-twin-guard.test.ts fails
 * when either side drifts (single-sourcing pattern of
 * test/operator-contract-allowlist-guard.test.ts). The .js stays the source
 * of truth and is never edited to match the twin.
 */

/** Longest timestamp string accepted, here and by the run index for `createdAt` and `updatedAt`. */
export declare const MAX_TIMESTAMP_LENGTH: number

/** The `data-time-source` value that marks a launch-seeded <time> until the run list adopts it. */
export declare const LAUNCH_TIME_SOURCE: string

/**
 * Format an ISO timestamp as a coarse relative time string.
 * Returns 'just now', 'N minute(s) ago', 'N hour(s) ago', or 'N day(s) ago';
 * '' for empty or unparseable input. Pure: no DOM, no I/O, no module state.
 */
export declare function formatRelativeTime(isoString: string | null | undefined, nowMs?: number): string

/**
 * The canonical ISO string for a timestamp, or undefined when `value` is not a
 * string, is empty after trimming, is longer than MAX_TIMESTAMP_LENGTH
 * characters, or does not parse to a finite time.
 */
export declare function normalizeIsoTimestamp(value: unknown): string | undefined
