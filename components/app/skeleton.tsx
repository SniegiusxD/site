/**
 * A loading placeholder in the shape of what is coming, with one soft light
 * passing across (`kr-shimmer`, transform only). Calm mode stops the light and
 * keeps the shape.
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <span aria-hidden className={`relative block overflow-hidden rounded-xl bg-stand hairline ${className}`}>
      <span className="kr-shimmer absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-chalk/[0.06] to-transparent" />
    </span>
  )
}
