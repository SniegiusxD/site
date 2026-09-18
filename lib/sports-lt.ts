const SPORT_NAMES: Record<string, string> = {
  basketball: 'Krepšinis',
  tennis: 'Tenisas',
  football: 'Futbolas',
  soccer: 'Futbolas',
  ice_hockey: 'Ledo ritulys',
  handball: 'Rankinis',
  baseball: 'Beisbolas',
  american_football: 'Amerikietiškas futbolas',
  volleyball: 'Tinklinis',
  esports: 'E. sportas',
  rugby: 'Regbis',
  rugby_union: 'Regbis',
  rugby_league: 'Regbio lyga',
  mma: 'MMA',
  boxing: 'Boksas',
  table_tennis: 'Stalo tenisas',
  darts: 'Smiginis',
  cricket: 'Kriketas',
  snooker: 'Snukeris',
  futsal: 'Salės futbolas',
}

export function sportName(sport: string): string {
  return SPORT_NAMES[sport.toLowerCase()] ?? sport.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}
