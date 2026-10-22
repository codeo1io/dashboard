/**
 * Where the runtime loader gets the output renderer from.
 *
 * Production loads the Markdown module with a literal-path dynamic import, so Vite keeps it in its own
 * chunk. The loader starts that import alongside the operator modules and never waits on it before
 * initializing, so in a spec the real import and the run index's init settle a fraction of a millisecond
 * apart, in either order, and a module-registry mock cannot reliably hold one back. Specs therefore
 * install a source with `setOutputRendererLoader` (test-setup.ts installs an already-resolved one before
 * every spec): a resolved promise settles before any module import the loader awaits can, and a spec
 * that needs a renderer that is pending, failing or slow passes a promise it controls.
 */

import type {renderOutput} from './markdown-output.ts'

export type OutputRenderer = typeof renderOutput

type RendererLoader = () => Promise<OutputRenderer | undefined>

const defaultLoader: RendererLoader = async () => {
  try {
    return (await import('./markdown-output.ts')).renderOutput
  } catch (error) {
    handleRendererLoadFailure(error)
    return undefined
  }
}

let currentLoader: RendererLoader = defaultLoader

/** Start loading the renderer. Rejects, or resolves to undefined, when there is none. */
export function loadOutputRenderer(): Promise<OutputRenderer | undefined> {
  return currentLoader()
}

/** Set the renderer source; with no argument the source is the Markdown module import. Tests only. */
export function setOutputRendererLoader(loader?: RendererLoader): void {
  currentLoader = loader ?? defaultLoader
}

/**
 * Renderer-load failure recovery (rm-2154). After an autoUpdate deploy the
 * hashed markdown-output chunk a live tab still references 404s, and the
 * settle path kept the renderer undefined for the tab's remaining life. A
 * chunk-load failure now publishes a transient notice and gets exactly ONE
 * guarded page reload keyed on the failing module's identity (its URL
 * carries the content hash in a production build); any other rejection is
 * notice-only, and the same failing module never reloads twice per session.
 */

const RELOAD_GUARD_STORAGE_KEY = 'renderer-chunk-reload-guard'

function isChunkLoadFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('error loading dynamically imported module')
  )
}

function failingChunkIdentity(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.match(/https?:\/\/\S+/)?.[0] ?? 'unknown-chunk'
}

function showTransientNotice(message: string): void {
  if (typeof document === 'undefined') return
  const notice = document.createElement('p')
  notice.setAttribute('role', 'status')
  notice.setAttribute('data-renderer-recovery', '')
  notice.textContent = message
  document.body.append(notice)
  window.setTimeout(() => {
    notice.remove()
  }, 8000)
}

let noticeChannel: ((message: string) => void) | undefined

/** Set the recovery notice channel; with no argument the default inline DOM notice is restored. Tests only. */
export function setRendererLoadNotice(channel?: (message: string) => void): void {
  noticeChannel = channel
}

/** Handle a renderer-load rejection: notice always, one guarded reload for a chunk-load failure. */
export function handleRendererLoadFailure(error: unknown): void {
  const notify = noticeChannel ?? showTransientNotice
  if (!isChunkLoadFailure(error)) {
    notify('Output renderer failed to load.')
    return
  }
  const identity = failingChunkIdentity(error)
  let alreadyRetried = true
  try {
    alreadyRetried = sessionStorage.getItem(RELOAD_GUARD_STORAGE_KEY) === identity
    if (!alreadyRetried) sessionStorage.setItem(RELOAD_GUARD_STORAGE_KEY, identity)
  } catch {
    // Storage unavailable: a blind reload loop is worse than a dead renderer — stay notice-only.
  }
  notify(
    alreadyRetried
      ? 'Output renderer failed to load after a recovery retry.'
      : 'Output renderer failed to load — reloading once to recover.',
  )
  if (!alreadyRetried) window.location.reload()
}
