export function productionDatabaseUrl(value: string | undefined, production: boolean) {
  if (!value || !production) return value

  const url = new URL(value)
  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    throw new Error('DATABASE_URL must use PostgreSQL')
  }
  url.searchParams.set('sslmode', 'verify-full')
  return url.toString()
}
