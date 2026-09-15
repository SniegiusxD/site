import type { Period } from '@/lib/bet-value'

// SQL for "Topas", kept free of database imports so it can be checked on its own.

const SETTLED = `ub.status IN ('laimeta', 'pralaimeta', 'grazinta') AND ub.profit IS NOT NULL`
// Same clock as the Statymai page: kickoff when known, otherwise when the bet was marked.
const BET_TIME = `COALESCE(ub."startsAt", ub."placedAt")`

/** Period filter; for a month, `$2` is "YYYY-MM" in Vilnius time. */
function periodFilter(period: Period): string {
  if (period === 'week') return `AND ${BET_TIME} > NOW() - INTERVAL '7 days'`
  if (period === 'month') {
    return `AND (${BET_TIME} AT TIME ZONE 'Europe/Vilnius') >= ($2::text || '-01')::timestamp
   AND (${BET_TIME} AT TIME ZONE 'Europe/Vilnius') < ($2::text || '-01')::timestamp + INTERVAL '1 month'`
  }
  return ''
}

/** Members who joined, plus the viewer ($1), who always sees their own line. */
export const BOARD_SQL = (period: Period) => `
SELECT us."userId",
       us."topName" AS name,
       (us."topOptIn" AND us."topName" IS NOT NULL) AS "optedIn",
       COUNT(*)::int AS bets,
       (COUNT(*) FILTER (WHERE ub.status = 'laimeta'))::int AS won,
       (COUNT(*) FILTER (WHERE ub.status = 'pralaimeta'))::int AS lost,
       (COUNT(*) FILTER (WHERE ub.status = 'grazinta'))::int AS pushed,
       SUM(ub.profit)::float8 AS profit,
       SUM(ub.stake)::float8 AS staked,
       (AVG(ub.odds * ub."closingFairProb" - 1) FILTER (WHERE ub."closingFairProb" IS NOT NULL))::float8 AS clv,
       COUNT(ub."closingFairProb")::int AS "clvBets"
  FROM user_settings us
  JOIN user_bet ub ON ub."userId" = us."userId"
 WHERE ((us."topOptIn" AND us."topName" IS NOT NULL) OR us."userId" = $1)
   AND ${SETTLED}
   ${periodFilter(period)}
 GROUP BY us."userId", us."topName", us."topOptIn"`

/** Settled profits in time order for the given members ($1), for the leaders' curves. */
export const SERIES_SQL = (period: Period) => `
SELECT ub."userId", ub.profit::float8 AS profit
  FROM user_bet ub
 WHERE ub."userId" = ANY($1::text[])
   AND ${SETTLED}
   ${periodFilter(period)}
 ORDER BY ${BET_TIME}, ub.id`
