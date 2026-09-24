import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseStored, readStored, serializeStored, stringSet, writeStored } from '@/lib/use-stored-state'

const asNumber = (value: unknown) => (typeof value === 'number' ? value : undefined)

describe('parseStored', () => {
  it('uses the fallback when nothing is stored', () => {
    expect(parseStored(null, asNumber, 7)).toBe(7)
  })

  it('uses the fallback for broken JSON rather than throwing', () => {
    expect(parseStored('{not json', asNumber, 7)).toBe(7)
  })

  it('uses the fallback when the stored shape is wrong', () => {
    expect(parseStored('"text"', asNumber, 7)).toBe(7)
  })

  it('returns the stored value when it parses', () => {
    expect(parseStored('42', asNumber, 7)).toBe(42)
  })
})

describe('stringSet', () => {
  it('reads a list of strings as a set', () => {
    expect(stringSet(['a', 'b', 'a'])).toEqual(new Set(['a', 'b']))
  })

  it('drops anything that is not a string', () => {
    expect(stringSet(['a', 3, null, { id: 'b' }])).toEqual(new Set(['a']))
  })

  it('refuses a value that is not a list', () => {
    expect(stringSet({ a: true })).toBeUndefined()
  })
})

describe('serializeStored', () => {
  it('writes a set as a plain list, so it reads back the same', () => {
    const raw = serializeStored(new Set(['x', 'y']))
    expect(raw).toBe('["x","y"]')
    expect(parseStored(raw, stringSet, new Set())).toEqual(new Set(['x', 'y']))
  })

  it('writes objects as JSON', () => {
    expect(serializeStored({ sort: 'value' })).toBe('{"sort":"value"}')
  })
})

describe('readStored / writeStored', () => {
  let store: Map<string, string>
  let refuse = false

  beforeEach(() => {
    store = new Map()
    refuse = false
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          if (refuse) throw new Error('QuotaExceededError')
          store.set(key, value)
        },
        removeItem: (key: string) => store.delete(key),
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('round-trips through localStorage', () => {
    writeStored('k1', '1')
    expect(store.get('k1')).toBe('1')
    expect(readStored('k1')).toBe('1')
  })

  it('keeps the value for this page load when storage refuses it', () => {
    refuse = true
    writeStored('k2', '"kept"')
    expect(store.has('k2')).toBe(false)
    expect(readStored('k2')).toBe('"kept"')
  })

  it('goes back to storage once a write succeeds again', () => {
    refuse = true
    writeStored('k3', 'a')
    refuse = false
    writeStored('k3', 'b')
    store.set('k3', 'c')
    expect(readStored('k3')).toBe('c')
  })

  it('removes the key when written as null', () => {
    writeStored('k4', 'x')
    writeStored('k4', null)
    expect(readStored('k4')).toBeNull()
  })
})
