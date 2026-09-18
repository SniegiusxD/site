/**
 * Re-mounts on every navigation inside the app, so each page arrives with a
 * short fade. CSS only: visible at once without JavaScript and no hydration risk.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-[page-in_220ms_ease-out] motion-reduce:animate-none">{children}</div>
}
