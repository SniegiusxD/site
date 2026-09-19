import { describe, expect, it } from 'vitest'
import { limitChanges, limitDirection } from '@/lib/book-limits'

describe('limitChanges', () => {
  it('reports nothing when the same settings are saved again', () => {
    expect(limitChanges({ TopSport: 40 }, { TopSport: 40 })).toEqual([])
  })

  it('separates a new limit, a cut and a removal', () => {
    const changes = limitChanges({ TopSport: 100, Betsson: 50 }, { TopSport: 40, '7BET': 25 })
    expect(changes).toEqual([
      { bookmaker: '7BET', from: null, to: 25 },
      { bookmaker: 'Betsson', from: 50, to: null },
      { bookmaker: 'TopSport', from: 100, to: 40 },
    ])
  })

  it('names the direction of each change', () => {
    expect(limitDirection({ bookmaker: 'TopSport', from: 100, to: 40 })).toBe('cut')
    expect(limitDirection({ bookmaker: 'TopSport', from: 40, to: 100 })).toBe('raised')
    expect(limitDirection({ bookmaker: 'TopSport', from: null, to: 40 })).toBe('set')
    expect(limitDirection({ bookmaker: 'TopSport', from: 40, to: null })).toBe('removed')
  })
})
