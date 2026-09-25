import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { brand } from '@/lib/brand'

/**
 * The site is being renamed (valuestatymai). Every visible brand name reads
 * from lib/brand.ts, so the rename is a one-file change. Internal ids that
 * must not change with the name (billing metadata, the DDL lock, rate-limit
 * keys) are lowercase and allowed.
 */

const ROOT = join(__dirname, '..', '..')
const DIRS = ['app', 'components', 'lib']

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : files(path)
    return /\.(ts|tsx)$/.test(name) ? [path] : []
  })
}

describe('brand name', () => {
  it('appears only in lib/brand.ts', () => {
    const offenders = DIRS.flatMap((dir) => files(join(ROOT, dir)))
      .filter((path) => !path.endsWith(join('lib', 'brand.ts')))
      .flatMap((path) =>
        readFileSync(path, 'utf8')
          .split('\n')
          // Comments may mention the name (history, examples); code may not.
          .filter((line) => line.includes(brand.name) && !/^\s*(\*|\/\/|\/\*)/.test(line))
          .map((line) => `${relative(ROOT, path)}: ${line.trim()}`),
      )
    expect(offenders).toEqual([])
  })
})
