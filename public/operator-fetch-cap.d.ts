/**
 * Type declarations for public/operator-fetch-cap.js.
 *
 * Statelessness is load-bearing (rm-903): operator-stream.js,
 * operator-run-index.js, and operator-launch.js load as separate
 * dynamic-import instances, so this module must carry no module-level
 * mutable state. Directly imported by tests via Node 24 ESM and served at
 * /static/operator-fetch-cap.js by src/server.ts.
 */

/** Byte cap for a single JSON response body on the operator surface (1,000,000 bytes). */
export const MAX_BROWSER_JSON_BYTES: number

/** Typed error thrown when a response body exceeds the cap. */
export class JsonBodyTooLargeError extends Error {
  constructor(capBytes: number)
  readonly name: 'JsonBodyTooLargeError'
  readonly capBytes: number
}

/**
 * Read a JSON response body with a hard byte cap and parse it.
 *
 * Over-cap (declared or measured) throws JsonBodyTooLargeError and cancels the
 * body stream; under-cap behavior is identical to `response.json()`.
 */
export function readJsonWithCap(response: Response, capBytes?: number): Promise<unknown>
