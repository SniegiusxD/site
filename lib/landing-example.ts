/**
 * A real price snapshot from our own scan, used as the landing page example.
 * Source: aggregator residual cycle 20260914_020614 (2026-09-14 02:06 UTC),
 * Pinnacle fair price 1/0.5495 = 1.82 for the same line and side.
 * Replace with live data once the VM writes signals to the database.
 */
export const landingExample = {
  capturedAt: '2026-09-14T02:06:14Z',
  capturedLabel: '2026 m. rugsėjo 14 d., 05:06',
  competition: 'NFL',
  match: 'NY Jets – GB Packers',
  kickoffLabel: 'rugsėjo 20 d., 20:00',
  market: 'Taškų suma: daugiau nei 43,5',
  fairOdds: 1.82,
  prices: [
    { book: '7BET', odds: 1.909 },
    { book: 'TopSport', odds: 1.73 },
    { book: 'Betsson', odds: 1.72 },
  ],
} as const
