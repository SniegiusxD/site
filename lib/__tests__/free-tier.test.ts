import { describe, expect, it } from 'vitest'
import { FREE_MAX_EDGE, FREE_MAX_ODDS, freeBoard, isFreeSignal } from '@/lib/free-tier'
import type { LiveBoard, LiveSignal } from '@/lib/live-signals'

function signal(id: string, bestEdge: number, bestOdds: number): LiveSignal {
  return {
    id,
    sport: 'basketball',
    startsAt: '2026-09-18T18:00:00.000Z',
    market: 'Taškų suma',
    direction: 'over',
    line: 171.5,
    fairProb: 0.5,
    fairOdds: 2,
    pinnacleOdds: 1.9,
    home: 'VEF Riga',
    away: 'Absheron Lions',
    bestBook: 'Betsson',
    bestOdds,
    bestEdge,
    status: 'open',
    firstSeenAt: '2026-09-18T10:00:00.000Z',
    lastSeenAt: '2026-09-18T10:30:00.000Z',
    closedAt: null,
    eventKey: 'pin-1',
    closingFairProb: null,
    prices: [
      {
        book: 'Betsson',
        odds: bestOdds,
        edge: bestEdge,
        published: true,
        eventName: 'VEF Riga – Absheron Lions',
        selectionLabel: 'Daugiau nei 171,5',
        capturedAt: '2026-09-18T10:30:00.000Z',
      },
    ],
  }
}

describe('isFreeSignal', () => {
  it('keeps small value at short odds', () => {
    expect(isFreeSignal({ bestEdge: FREE_MAX_EDGE, bestOdds: FREE_MAX_ODDS })).toBe(true)
    expect(isFreeSignal({ bestEdge: 0.008, bestOdds: 1.72 })).toBe(true)
  })

  it('locks anything past either line', () => {
    expect(isFreeSignal({ bestEdge: 0.021, bestOdds: 1.9 })).toBe(false)
    expect(isFreeSignal({ bestEdge: 0.01, bestOdds: 2.51 })).toBe(false)
  })
})

describe('freeBoard', () => {
  const board: LiveBoard = {
    signals: [signal('small', 0.012, 1.8), signal('big', 0.061, 2.9), signal('mid', 0.035, 2.2)],
    status: null,
    tier: 'full',
  }

  it('splits the board and marks the tier', () => {
    const limited = freeBoard(board)
    expect(limited.tier).toBe('free')
    expect(limited.signals.map((s) => s.id)).toEqual(['small'])
    expect(limited.locked?.map((s) => s.id)).toEqual(['big', 'mid'])
  })

  it('never sends the match, the market or the book of a locked signal', () => {
    const locked = freeBoard(board).locked![0]
    expect(Object.keys(locked).sort()).toEqual(['bestEdge', 'bestOdds', 'id', 'sport', 'startsAt'])
    expect(JSON.stringify(locked)).not.toContain('VEF')
    expect(JSON.stringify(locked)).not.toContain('Betsson')
  })
})
