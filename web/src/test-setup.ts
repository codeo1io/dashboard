import '@testing-library/jest-dom'

// Node ≥ 26 pre-defines `localStorage` on globalThis as an OWN configurable
// getter that warns ("--localstorage-file was not provided") and returns
// undefined. That pre-empts the vitest jsdom environment's own storage
// install, so `localStorage.clear()` in a test throws TypeError and the web
// suite goes red on Node 26 (4 files / 100 tests — the unlanded rm-548
// family). jsdom 29→30 does NOT change this: the blocker lives on the Node
// side of globalThis (re-verified 2026-10-04, run 845265c83109 cycle:2 —
// after the jsdom 30.1.1 bump the red set was byte-identical).
// Rebind to a fresh in-memory Storage literal per test FILE (setupFiles run
// once per file): no shared backing store (a --localstorage-file would be
// ONE file across all concurrent fork workers → clear/set races), no
// cross-file leakage, and jsdom's own storage instance is unreachable in
// this env (window === globalThis), so there is nothing to re-borrow — a
// literal is the only sound seam.
class InMemoryLocalStorage implements Storage {
  readonly #store = new Map<string, string>()

  get length(): number {
    return this.#store.size
  }

  clear(): void {
    this.#store.clear()
  }

  getItem(key: string): string | null {
    return this.#store.get(key) ?? null
  }

  key(index: number): string | null {
    return [...this.#store.keys()][index] ?? null
  }

  removeItem(key: string): void {
    this.#store.delete(key)
  }

  setItem(key: string, value: string): void {
    this.#store.set(key, String(value))
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  writable: true,
  value: new InMemoryLocalStorage(),
})
