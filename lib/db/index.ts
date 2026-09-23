import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'
import { productionDatabaseUrl } from '@/lib/runtime-config'

export const pool = new Pool({
  connectionString: productionDatabaseUrl(
    process.env.DATABASE_URL,
    process.env.VERCEL_ENV === 'production',
  ),
})

export const db = drizzle(pool, { schema })
