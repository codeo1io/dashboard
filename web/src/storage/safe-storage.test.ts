import {afterEach, describe, expect, it} from 'vitest'
import {safeStorageGetItem, safeStorageSetItem} from './safe-storage.ts'

function poisonLocalStorage(): () => void {
  const original = Object.getOwnPropertyDescriptor(window, 'localStorage')
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException('localStorage is denied', 'SecurityError')
    },
  })
  return () => {
    if (original) Object.defineProperty(window, 'localStorage', original)
    else Reflect.deleteProperty(window, 'localStorage')
  }
}

afterEach(() => {
  localStorage.clear()
})

describe('safeStorageGetItem (rm-630)', () => {
  it('passes through a stored value when storage is healthy', () => {
    localStorage.setItem('safe-storage-key', 'value-1')
    expect(safeStorageGetItem('safe-storage-key')).toBe('value-1')
  })

  it('returns null for a missing key when storage is healthy', () => {
    expect(safeStorageGetItem('safe-storage-missing')).toBeNull()
  })

  it('returns null instead of throwing when the localStorage access itself throws (storage denied)', () => {
    const restore = poisonLocalStorage()
    try {
      expect(safeStorageGetItem('safe-storage-key')).toBeNull()
    } finally {
      restore()
    }
  })
})

describe('safeStorageSetItem (rm-630)', () => {
  it('writes and reports success when storage is healthy', () => {
    expect(safeStorageSetItem('safe-storage-key', 'value-2')).toBe(true)
    expect(localStorage.getItem('safe-storage-key')).toBe('value-2')
  })

  it('returns false instead of throwing when the localStorage access itself throws (storage denied)', () => {
    const restore = poisonLocalStorage()
    try {
      expect(safeStorageSetItem('safe-storage-key', 'value-3')).toBe(false)
    } finally {
      restore()
    }
  })
})
