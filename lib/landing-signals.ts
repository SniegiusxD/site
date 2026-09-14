/**
 * Real published signals from our own scan, cycle 2026-09-14 10:36:14 UTC,
 * joined to every book's price for the same selection in that cycle's
 * residual file (same Pinnacle event, same fair probability, same line).
 * Source copy: aggregator/local_data/site_examples_20260914/.
 *
 * `event` and `selection` are spelled exactly as each book wrote them, because
 * that is what the visitor pastes into that book's search. Kickoffs are
 * Vilnius time. Replace with live data once the VM publishes to the database.
 */
export const BOOKS = ['7BET', 'TopSport', 'Betsson'] as const
export type BookName = (typeof BOOKS)[number]

export type BookPrice = {
  book: BookName
  odds: number
  event: string
  selection: string
}

export type LandingSignal = {
  id: string
  sport: string
  kickoffLabel: string
  market: string
  /** Pinnacle's offered price, margin included. */
  pinnacleOdds: number
  /** 1 / Pinnacle fair probability. */
  fairOdds: number
  /** The book that published the signal. */
  valueBook: BookName
  prices: BookPrice[]
}

export const SIGNALS_CAPTURED_LABEL = '2026 m. rugsėjo 14 d., 13:36'

export const landingSignals: LandingSignal[] = [
  {
    id: 'parks-bejlek-games-hcp',
    sport: 'Tenisas',
    kickoffLabel: 'rugs. 15 d. 19:00',
    market: 'Geimų handikapas',
    pinnacleOdds: 1.6329,
    fairOdds: 1.683,
    valueBook: '7BET',
    prices: [
      { book: '7BET', odds: 1.8, event: 'Alycia Parks – Sara Bejlek', selection: 'Alycia Parks +5,5' },
      {
        book: 'TopSport',
        odds: 1.62,
        event: 'Parks Alycia (USA) – Bejlek Sara (CZE)',
        selection: 'Parks Alycia (USA) +5,5',
      },
    ],
  },
  {
    id: 'vef-absheron-total-171',
    sport: 'Krepšinis',
    kickoffLabel: 'rugs. 14 d. 14:15',
    market: 'Taškų suma',
    pinnacleOdds: 1.7353,
    fairOdds: 1.845,
    valueBook: 'Betsson',
    prices: [
      { book: 'Betsson', odds: 1.95, event: 'VEF Riga – Absheron Lions', selection: 'Daugiau nei 171,5' },
      { book: '7BET', odds: 1.7693, event: 'VEF Riga – Absheron BC', selection: 'Daugiau nei 171,5' },
    ],
  },
  {
    id: 'uchida-noguchi-games-hcp',
    sport: 'Tenisas',
    kickoffLabel: 'rugs. 14 d. 14:00',
    market: 'Geimų handikapas',
    pinnacleOdds: 1.7407,
    fairOdds: 1.806,
    valueBook: 'TopSport',
    prices: [
      {
        book: 'TopSport',
        odds: 1.87,
        event: 'Uchida Kaichi (JPN) – Noguchi Rio (JPN)',
        selection: 'Uchida Kaichi (JPN) +5,5',
      },
      { book: '7BET', odds: 1.6667, event: 'Kaichi Uchida – Rio Noguchi', selection: 'Kaichi Uchida +5,5' },
    ],
  },
  {
    id: 'vef-absheron-hcp-14',
    sport: 'Krepšinis',
    kickoffLabel: 'rugs. 14 d. 14:15',
    market: 'Handikapas',
    pinnacleOdds: 1.7937,
    fairOdds: 1.915,
    valueBook: '7BET',
    prices: [
      { book: '7BET', odds: 1.9524, event: 'VEF Riga – Absheron BC', selection: 'VEF Riga −14,5' },
      { book: 'Betsson', odds: 1.85, event: 'VEF Riga – Absheron Lions', selection: 'VEF Riga −14,5' },
    ],
  },
  {
    id: 'breogan-rilski-total-171',
    sport: 'Krepšinis',
    kickoffLabel: 'rugs. 14 d. 18:45',
    market: 'Taškų suma',
    pinnacleOdds: 1.6173,
    fairOdds: 1.709,
    valueBook: '7BET',
    prices: [
      {
        book: '7BET',
        odds: 1.7408,
        event: 'Leche Rio Breogan – Rilski Sportist',
        selection: 'Daugiau nei 171,5',
      },
      { book: 'Betsson', odds: 1.7, event: 'Breogan Lugo – Rilski Sportist', selection: 'Daugiau nei 171,5' },
      { book: 'TopSport', odds: 1.69, event: 'Rio Breogan – Rilski Sportist', selection: 'Daugiau nei 171,5' },
    ],
  },
  {
    id: 'breogan-rilski-hcp-away',
    sport: 'Krepšinis',
    kickoffLabel: 'rugs. 14 d. 18:45',
    market: 'Handikapas',
    pinnacleOdds: 1.5917,
    fairOdds: 1.687,
    valueBook: '7BET',
    prices: [
      {
        book: '7BET',
        odds: 1.7143,
        event: 'Leche Rio Breogan – Rilski Sportist',
        selection: 'Rilski Sportist +16,5',
      },
      { book: 'Betsson', odds: 1.67, event: 'Breogan Lugo – Rilski Sportist', selection: 'Rilski Sportist +16,5' },
      { book: 'TopSport', odds: 1.5, event: 'Rio Breogan – Rilski Sportist', selection: 'Rilski Sportist +16,5' },
    ],
  },
  {
    id: 'breogan-rilski-hcp-home',
    sport: 'Krepšinis',
    kickoffLabel: 'rugs. 14 d. 18:45',
    market: 'Handikapas',
    pinnacleOdds: 2.22,
    fairOdds: 2.455,
    valueBook: 'TopSport',
    prices: [
      { book: 'TopSport', odds: 2.49, event: 'Rio Breogan – Rilski Sportist', selection: 'Rio Breogan −16,5' },
      { book: 'Betsson', odds: 2.1, event: 'Breogan Lugo – Rilski Sportist', selection: 'Breogan Lugo −16,5' },
      {
        book: '7BET',
        odds: 2.0,
        event: 'Leche Rio Breogan – Rilski Sportist',
        selection: 'Leche Rio Breogan −16,5',
      },
    ],
  },
]
