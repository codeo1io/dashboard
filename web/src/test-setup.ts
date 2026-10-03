import '@testing-library/jest-dom'

// Node >= 26 defines an own, configurable `localStorage` getter on globalThis
// (experimental webstorage). Without --localstorage-file it returns undefined,
// and vitest's jsdom environment does not overwrite a key that already exists
// on the global object — probes in the run-2c3b4c641212 implement phase also
// showed `window === globalThis` and `document.defaultView === globalThis`
// there, so the jsdom window's own storage is NOT reachable to re-borrow.
// Meanwhile `sessionStorage` (which Node does not pre-define) propagates fine.
// rm-608: give each test file's environment a fresh, tab-like in-memory
// storage instead — no runner flags, no shared backing file (the
// --localstorage-file axis shares ONE file across concurrent fork workers,
// racing clear/set across the 31-file suite). One benign ExperimentalWarning
// per file remains from the single probe read below.
// (If jsdom 30 fixes the propagation — see rm-271 — the guard's override
// branch stops firing and this seam can be retired in the same bump.)
if (
  typeof window !== 'undefined' &&
  window.localStorage === undefined
) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: createMemoryStorage(),
    configurable: true,
    writable: true,
  })
}

function createMemoryStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: key => store.get(key) ?? null,
    key: index => [...store.keys()][index] ?? null,
    removeItem: key => {
      store.delete(key)
    },
    setItem: (key, value) => {
      store.set(key, String(value))
    },
  }
}
