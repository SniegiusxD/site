import type { ActiveBet, Bookmaker, HistoryBet, Sport } from "./types"

export const STARTING_BANKROLL = 1000

const SPORT_LABEL: Record<Sport, string> = {
  NBA: "NBA",
  MLB: "MLB",
  TENNIS: "Tenisas",
  BASKETBALL: "Krepšinis",
  BASEBALL: "Beisbolas",
  SOCCER: "Futbolas",
  FOOTBALL: "Futbolas",
  ICE_HOCKEY: "Ledo ritulys",
  HANDBALL: "Rankinis",
  VOLLEYBALL: "Tinklinis",
  RUGBY_LEAGUE: "Regbis",
  RUGBY: "Regbis",
  BOXING: "Boksas",
  MMA: "MMA",
  CRICKET: "Kriketas",
  AMERICAN_FOOTBALL: "Amer. futbolas",
  TABLE_TENNIS: "Stalo tenisas",
  OTHER: "Sportas",
}

/** A settled wager — the common shape used for all analytics math. */
export interface SettledBet {
  date: string
  sport: Sport
  bookmaker: Bookmaker
  odds: number
  stake: number
  status: "laimeta" | "pralaimeta" | "grazinta"
  profit: number
}

/** Normalise settled ActiveBets into the shared SettledBet shape. */
export function settledFromActive(active: ActiveBet[]): SettledBet[] {
  return active
    .filter((b) => b.status !== "laukia" && b.profit !== null)
    .map((b) => ({
      date: "2026-06-16",
      sport: b.sport,
      bookmaker: b.bookmaker,
      odds: b.odds,
      stake: b.stake,
      // #40: "neisspresta" (unresolved >24h) is void like a push — never a loss.
      status: (b.status === "neisspresta"
        ? "grazinta"
        : b.status) as SettledBet["status"],
      profit: b.profit ?? 0,
    }))
}

export function historyAsSettled(history: HistoryBet[]): SettledBet[] {
  return history.map((h) => ({
    date: h.date,
    sport: h.sport,
    bookmaker: h.bookmaker,
    odds: h.odds,
    stake: h.stake,
    status: h.status,
    profit: h.profit,
  }))
}

export interface Analytics {
  totalBets: number
  wins: number
  losses: number
  pushes: number
  winRate: number
  totalStaked: number
  netPnl: number
  roi: number
  avgOdds: number
  currentBankroll: number
  equityCurve: { day: string; value: number }[]
  winRateBySport: { sport: string; winRate: number; total: number }[]
  distribution: { sport: string; bets: number }[]
  pnlByBookmaker: { book: Bookmaker; net: number; bets: number }[]
}

/** Compute every analytics figure from real settled bets. */
export function computeAnalytics(
  bets: SettledBet[],
  startingBankroll = STARTING_BANKROLL,
): Analytics {
  const decided = bets.filter((b) => b.status !== "grazinta")
  const wins = bets.filter((b) => b.status === "laimeta").length
  const losses = bets.filter((b) => b.status === "pralaimeta").length
  const pushes = bets.filter((b) => b.status === "grazinta").length

  const totalStaked = bets.reduce((a, b) => a + b.stake, 0)
  const netPnl = bets.reduce((a, b) => a + b.profit, 0)
  const roi = totalStaked > 0 ? (netPnl / totalStaked) * 100 : 0
  const winRate = decided.length > 0 ? (wins / decided.length) * 100 : 0
  const avgOdds = bets.length > 0
    ? bets.reduce((a, b) => a + b.odds, 0) / bets.length
    : 0

  // Equity curve: accumulate profit per chronological date.
  const byDate = new Map<string, number>()
  for (const b of [...bets].sort((a, z) => a.date.localeCompare(z.date))) {
    byDate.set(b.date, (byDate.get(b.date) ?? 0) + b.profit)
  }
  let running = startingBankroll
  const equityCurve = [{ day: "Pradžia", value: startingBankroll }]
  for (const [date, delta] of byDate) {
    running += delta
    equityCurve.push({ day: date.slice(5), value: Math.round(running) })
  }

  // Win rate + distribution per sport.
  const sports = new Map<Sport, { wins: number; total: number; bets: number }>()
  for (const b of bets) {
    const cur = sports.get(b.sport) ?? { wins: 0, total: 0, bets: 0 }
    cur.bets += 1
    if (b.status !== "grazinta") {
      cur.total += 1
      if (b.status === "laimeta") cur.wins += 1
    }
    sports.set(b.sport, cur)
  }
  const winRateBySport = [...sports.entries()]
    .map(([sport, s]) => ({
      sport: SPORT_LABEL[sport],
      winRate: s.total > 0 ? Math.round((s.wins / s.total) * 100) : 0,
      total: s.total,
    }))
    .sort((a, z) => z.winRate - a.winRate)
  const distribution = [...sports.entries()]
    .map(([sport, s]) => ({ sport: SPORT_LABEL[sport], bets: s.bets }))
    .sort((a, z) => z.bets - a.bets)

  // P/N per bookmaker.
  const books = new Map<Bookmaker, { net: number; bets: number }>()
  for (const b of bets) {
    const cur = books.get(b.bookmaker) ?? { net: 0, bets: 0 }
    cur.net += b.profit
    cur.bets += 1
    books.set(b.bookmaker, cur)
  }
  const pnlByBookmaker = [...books.entries()]
    .map(([book, v]) => ({ book, net: +v.net.toFixed(2), bets: v.bets }))
    .sort((a, z) => z.net - a.net)

  return {
    totalBets: bets.length,
    wins,
    losses,
    pushes,
    winRate: Math.round(winRate),
    totalStaked: +totalStaked.toFixed(2),
    netPnl: +netPnl.toFixed(2),
    roi: +roi.toFixed(1),
    avgOdds: +avgOdds.toFixed(2),
    currentBankroll: Math.round(running),
    equityCurve,
    winRateBySport,
    distribution,
    pnlByBookmaker,
  }
}
