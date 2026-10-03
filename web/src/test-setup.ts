import '@testing-library/jest-dom'

// rm-548 — Node ≥ 25 localStorage test-environment shim (INTERIM, trivially
// removable).
//
// Node ≥ 25 defines an experimental `localStorage` own-property on globalThis
// whose access always resolves to `undefined` unless the process started with
// `--localstorage-file`. vitest's jsdom environment populates the DOM globals
// from the jsdom window's keys but skips keys Node already defines
// (vitest-dev/vitest#10867 — "localStorage / sessionStorage dropped by
// getWindowKeys on Node 25+"), so `window.localStorage` resolves to Node's
// always-undefined getter and every access throws: the wholesale ~100/1171
// web-suite failure observed on the fleet's Node v26.10.0 sandbox, whose
// first site was App.test.tsx's beforeEach `window.localStorage.clear()`
// (25/25 red there). CI's pinned Node 24 is unaffected. The real jsdom Storage
// instance is unreachable from the populated global — `window` and
// `document.defaultView` are the populated global itself — so the interim cure
// is a spec-shaped in-memory Storage.
//
// The guard fires ONLY when the key is actually broken: on Node 24, and under
// vitest ≥ 5 (the durable fix, tracked for rm-271's vitest-5/jsdom-30/undici-8
// majors window), globalThis.localStorage is a functional storage and this
// whole block is inert. Delete the block at that window; nothing else depends
// on it. Tripwire coverage: web/src/test-env-localstorage.test.ts.
if (globalThis.localStorage === undefined) {
  const entries = new Map<string, string>()
  const inMemoryStorage = {
    get length(): number {
      return entries.size
    },
    clear(): void {
      entries.clear()
    },
    getItem(key: string): string | null {
      return entries.get(key) ?? null
    },
    key(index: number): string | null {
      if (index < 0 || index >= entries.size) return null
      return Array.from(entries.keys())[index] ?? null
    },
    removeItem(key: string): void {
      entries.delete(key)
    },
    setItem(key: string, value: string): void {
      entries.set(key, String(value))
    },
  } as Storage
  delete (globalThis as {localStorage?: Storage}).localStorage
  globalThis.localStorage = inMemoryStorage
}
