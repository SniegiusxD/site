import { redirect } from 'next/navigation'
import { AccountProvider } from '@/components/app/account-provider'
import { AppShell } from '@/components/app/app-shell'
import { Paywall } from '@/components/app/paywall'
import { loadAccount } from '@/lib/account-store'
import { getSessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/prisijungti')
  const account = await loadAccount(user.id)
  if (!account.onboarded) redirect('/pradzia')

  return (
    <AccountProvider initial={account} email={user.email}>
      <AppShell>{account.access.hasAccess ? children : <Paywall access={account.access} />}</AppShell>
    </AccountProvider>
  )
}
