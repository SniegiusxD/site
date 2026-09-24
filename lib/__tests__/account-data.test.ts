import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { MEMBER_TABLES } from '@/lib/account-data'

/**
 * Every table that stores a "userId" must be exported and deleted with the
 * account. This reads the schema sources, so adding a member table without
 * adding it to lib/account-data.ts fails here instead of silently surviving a
 * deletion the privacy policy promises.
 */
const SOURCES = ['lib/db/ensure-app-schema.ts', 'lib/db/ensure-bets-schema.ts', 'lib/db/schema.ts']

function tablesWithUserId(): Set<string> {
  const found = new Set<string>()
  for (const file of SOURCES) {
    const text = readFileSync(file, 'utf8')
    // SQL: CREATE TABLE IF NOT EXISTS name ( ... "userId" ... );
    for (const match of text.matchAll(/CREATE TABLE IF NOT EXISTS\s+"?(\w+)"?\s*\(([\s\S]*?)\);/g)) {
      if (match[2].includes('"userId"')) found.add(match[1])
    }
    // Drizzle: pgTable('name', { ... userId: text('userId') ... })
    for (const match of text.matchAll(/pgTable\(\s*'(\w+)'\s*,\s*\{([\s\S]*?)\n\}\)/g)) {
      if (/\buserId\b/.test(match[2])) found.add(match[1])
    }
  }
  return found
}

describe('account data coverage', () => {
  it('covers every table that stores a member id', () => {
    const covered = new Set<string>([...MEMBER_TABLES, 'session', 'account'])
    const missing = [...tablesWithUserId()].filter((table) => !covered.has(table))
    expect(missing).toEqual([])
  })

  it('finds the tables it is meant to guard', () => {
    // A parser that finds nothing would pass the check above for the wrong reason.
    const found = tablesWithUserId()
    for (const table of ['user_bet', 'bet_edit', 'book_limit_event', 'telegram_preset', 'billing_event']) {
      expect(found.has(table), table).toBe(true)
    }
  })

  it('exports owner actions and anonymises their target instead of deleting the audit', () => {
    const source = readFileSync('lib/account-data.ts', 'utf8')
    expect(source).toContain(`FROM admin_action WHERE "targetUserId" = $1`)
    expect(source).toContain(`UPDATE admin_action SET "targetUserId" = 'deleted'`)
    expect(MEMBER_TABLES).not.toContain('admin_action' as never)
  })
})
