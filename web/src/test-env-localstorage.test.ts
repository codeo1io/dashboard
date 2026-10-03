import {describe, expect, it} from 'vitest'

/**
 * rm-548: the web test environment must expose a functional localStorage on
 * every Node the fleet runs. Node ≥ 25's experimental global combined with
 * vitest-dev/vitest#10867 made `window.localStorage` resolve to an
 * always-undefined getter (the wholesale ~100/1171 web-suite failure whose
 * first site was App.test.tsx's beforeEach). The guarded in-memory shim in
 * src/test-setup.ts is the interim cure and this suite is its tripwire: it
 * goes red the moment a Node bump outruns the shim (CI's move to Node 26
 * rides rm-139's window) and stays quietly green under vitest ≥ 5, where the
 * real jsdom Storage is visible again and the shim is inert.
 */
describe('web test environment — localStorage (rm-548)', () => {
  it('window.localStorage is functional across the Storage interface', () => {
    expect(typeof window.localStorage.getItem).toBe('function')
    expect(typeof window.localStorage.setItem).toBe('function')
    expect(typeof window.localStorage.removeItem).toBe('function')
    expect(typeof window.localStorage.clear).toBe('function')
    window.localStorage.setItem('rm-548-probe', 'first')
    window.localStorage.setItem('rm-548-probe-2', 'second')
    expect(window.localStorage.length).toBeGreaterThanOrEqual(2)
    expect(window.localStorage.key(0)).toBe('rm-548-probe')
    expect(window.localStorage.getItem('rm-548-probe')).toBe('first')
    window.localStorage.setItem('rm-548-probe', 'overwritten')
    expect(window.localStorage.getItem('rm-548-probe')).toBe('overwritten')
    expect(window.localStorage.length).toBeGreaterThanOrEqual(2)
    window.localStorage.removeItem('rm-548-probe')
    expect(window.localStorage.getItem('rm-548-probe')).toBeNull()
    window.localStorage.clear()
    expect(window.localStorage.length).toBe(0)
    expect(window.localStorage.getItem('rm-548-probe-2')).toBeNull()
    expect(window.localStorage.key(0)).toBeNull()
    expect(window.localStorage.key(-1)).toBeNull()
  })

  it('globalThis.localStorage and window.localStorage are one storage', () => {
    globalThis.localStorage.setItem('rm-548-alias', 'via-global')
    expect(window.localStorage.getItem('rm-548-alias')).toBe('via-global')
    window.localStorage.removeItem('rm-548-alias')
    expect(globalThis.localStorage.getItem('rm-548-alias')).toBeNull()
  })
})
