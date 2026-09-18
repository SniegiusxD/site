export default function AppLoading() {
  return (
    <div className="px-4 pt-6 sm:px-6 lg:pt-8" aria-busy="true" aria-label="Įkeliama">
      <div className="h-10 w-48 animate-pulse rounded-xl bg-stand motion-reduce:animate-none" />
      <div className="mt-3 h-4 w-64 animate-pulse rounded bg-stand motion-reduce:animate-none" />
      <div className="mt-8 space-y-3">
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="h-16 animate-pulse rounded-2xl bg-stand motion-reduce:animate-none" />
        ))}
      </div>
    </div>
  )
}
