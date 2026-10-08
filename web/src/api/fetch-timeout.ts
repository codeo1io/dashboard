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
 * even against a hung transport, and a timeout and a rejection both read as
 * the same failed outcome, so every caller keeps failing closed.
 *
 * Both fetch and the body read go inside the bound — a response whose stream
 * never ends is the same hang as a request that never settles.
 */
export const GET_SEAM_TIMEOUT_MS = 15_000

export function withGetSeamTimeout<T>(promise: Promise<T>): Promise<T | 'timeout'> {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve('timeout'), GET_SEAM_TIMEOUT_MS)
    promise.then(
      value => {
        clearTimeout(timer)
        resolve(value)
      },
      () => {
        clearTimeout(timer)
        resolve('timeout')
      },
    )
  })
}
