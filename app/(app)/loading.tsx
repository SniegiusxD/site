export default function AppLoading() {
  return (
    <div className="px-4 pt-6 sm:px-6 lg:pt-8" aria-busy="true" aria-label="Įkeliama">
      <div className="h-10 w-48 kr-skeleton rounded-xl" />
      <div className="mt-3 h-4 w-64 kr-skeleton rounded" />
      <div className="mt-8 space-y-3">
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="h-16 kr-skeleton rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
