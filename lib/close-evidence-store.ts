import type { PoolClient } from 'pg'
import { type CloseEvidence, parseCloseEvidence } from '@/lib/close-evidence'
import { pool } from '@/lib/db'

type Queryable = Pick<PoolClient, 'query'>

export const CLOSE_EVIDENCE_SQL = `SELECT generated_at, close_coverage, close_trust FROM site_evidence_snapshot WHERE id = 1`

/**
 * The scanner's close-evidence snapshot, or null when there is none. The table
 * is written by the scanner and may not exist yet (42P01): that is "no
 * evidence", not an error. Any other failure is logged and also reads as no
 * evidence, so a page never breaks over a label.
 */
export async function loadCloseEvidence(q: Queryable = pool): Promise<CloseEvidence | null> {
  try {
    const { rows } = await q.query(CLOSE_EVIDENCE_SQL)
    return parseCloseEvidence(rows[0])
  } catch (error) {
    if ((error as { code?: string }).code !== '42P01') console.error('[close-evidence]', error)
    return null
  }
}
