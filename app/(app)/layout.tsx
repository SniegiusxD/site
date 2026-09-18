import { redirect } from 'next/navigation'
import { Toaster } from 'sonner'
import { AccountProvider } from '@/components/app/account-provider'
import { AppShell } from '@/components/app/app-shell'
import { loadAccount } from '@/lib/account-store'
import { getSessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/prisijungti')
  const account = await loadAccount(user.id)
  if (!account.onboarded) redirect('/pradzia')

  return (
    <AccountProvider initial={account} email={user.email} memberSince={user.createdAt ? new Date(user.createdAt).toISOString() : null}>
      <AppShell>{children}</AppShell>
      {/* Phones: clear the bottom navigation and the sticky "Pastačiau" bar. */}
      <Toaster
        position="bottom-right"
        offset={24}
        mobileOffset={{ bottom: 104 }}
        toastOptions={{
          unstyled: true,
          classNames: {
            toast:
              'flex w-full items-center gap-3 rounded-2xl bg-chalk px-4 py-3.5 text-night shadow-[0_18px_40px_-12px_rgb(0_0_0/0.7)]',
            title: 'font-semibold',
            description: 'mt-0.5 text-[0.9rem] text-night/70',
            icon: 'text-[#0d7a4c]',
            actionButton:
              'ml-auto shrink-0 rounded-lg bg-night px-3 py-1.5 text-[0.9rem] font-semibold text-chalk hover:bg-stand',
          },
        }}
      />
    </AccountProvider>
  )
}
