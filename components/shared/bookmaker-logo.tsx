import Image from "next/image"
import type { Bookmaker } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * Visual identity for each bookmaker. 7bet and TopSport use real logo assets;
 * the rest fall back to clean branded initial badges so the book is always
 * instantly recognisable on a card.
 */
const BRAND: Record<
  Bookmaker,
  { kind: "image"; src: string } | { kind: "badge"; bg: string; fg: string; short: string }
> = {
  "7BET": { kind: "image", src: "/bookmakers/7bet.svg" },
  TopSport: { kind: "image", src: "/bookmakers/topsport.ico" },
  Pinnacle: { kind: "badge", bg: "#1f3a5f", fg: "#ffffff", short: "P" },
}

const LABEL: Record<Bookmaker, string> = {
  "7BET": "7bet",
  TopSport: "TopSport",
  Pinnacle: "Pinnacle",
}

export function bookmakerLabel(book: Bookmaker) {
  return LABEL[book]
}

export function BookmakerLogo({
  book,
  size = 28,
  className,
}: {
  book: Bookmaker
  size?: number
  className?: string
}) {
  const brand = BRAND[book]
  const radius = Math.round(size * 0.28)

  if (brand.kind === "image") {
    return (
      <span
        className={cn("inline-flex shrink-0 overflow-hidden", className)}
        style={{ width: size, height: size, borderRadius: radius }}
      >
        <Image
          src={brand.src || "/placeholder.svg"}
          alt={`${LABEL[book]} logotipas`}
          width={size}
          height={size}
          className="size-full object-cover"
        />
      </span>
    )
  }

  return (
    <span
      aria-label={`${LABEL[book]} logotipas`}
      role="img"
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-bold leading-none",
        className,
      )}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: brand.bg,
        color: brand.fg,
        fontSize: Math.round(size * 0.46),
      }}
    >
      {brand.short}
    </span>
  )
}

/** Logo + name lockup, used where the book label should also be visible. */
export function BookmakerTag({
  book,
  size = 24,
  className,
}: {
  book: Bookmaker
  size?: number
  className?: string
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <BookmakerLogo book={book} size={size} />
      <span className="text-xs font-semibold">{LABEL[book]}</span>
    </span>
  )
}
