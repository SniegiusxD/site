import { SiteFooter } from './site-footer'
import { SiteHeader } from './site-header'

/** Long-form page (rules, privacy): readable measure, same header and footer. */
export function ProsePage({
  title,
  updated,
  notice,
  children,
}: {
  title: string
  updated: string
  notice?: string
  children: React.ReactNode
}) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[44rem] px-5 pt-32 pb-24 sm:px-8 lg:pt-40">
        <h1 className="text-[3rem] sm:text-[4rem]">{title}</h1>
        <p className="mt-4 text-haze">Atnaujinta {updated}</p>
        {notice && (
          <p className="mt-6 rounded-xl bg-floodlight-soft px-4 py-3 text-[0.95rem] text-floodlight">{notice}</p>
        )}
        <div className="mt-12 space-y-10 text-[1.05rem] text-haze [&_h2]:mb-3 [&_h2]:font-display [&_h2]:text-[1.9rem] [&_h2]:text-chalk [&_li]:mt-2 [&_p+p]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
