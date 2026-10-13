/**
 * rm-780: wall-clock bound shared by the app-client GET seams
 * (`fetchMonitoring`, `fetchListenerMessages`).
 *
 * The views bound their own polls through `useBoundedPoll` (rm-251/rm-155),
 * but the seam functions themselves were unbounded — any future caller that
 * skips the poll hook (App's rm-487 focus re-probe calls
 * `fetchListenerMessages` directly) could hang forever on a transport that
 * ignores aborts. This mirrors rm-501's ack-trio bound (`withAckTimeout` in
 * `listener.ts`, the 15s house precedent): the race alone settles the await
 * even against a hung transport. Rejections PROPAGATE — the wrapper owns
 * only the hang case, and the seam catch keeps its landed classification
 * (caller abort → AbortError → 'timeout'; transport failure → 'network').
 * Correction at full_tests 8eddfdcd: the first variant resolved 'timeout'
 * on rejection too, collapsing that taxonomy — the listener/monitoring seam
 * suites assert a transport rejection maps to 'network' and they red on the
 * first full-suite (ephemeral-PR) run; rethrow instead.
 *
 * Both fetch and the body read go inside the bound — a response whose stream
 * never ends is the same hang as a request that never settles.
 */
export const GET_SEAM_TIMEOUT_MS = 15_000

export function withGetSeamTimeout<T>(promise: Promise<T>): Promise<T | 'timeout'> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve('timeout'), GET_SEAM_TIMEOUT_MS)
    promise.then(
      value => {
        clearTimeout(timer)
        resolve(value)
      },
      error => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}
