import {
  Crosshair,
  Goal,
  Target,
  Volleyball,
  type LucideIcon,
} from "lucide-react"
import type { Sport } from "@/lib/types"

const MAP: Record<Sport, { Icon: LucideIcon; label: string; tone: string }> = {
  TENNIS: { Icon: Crosshair, label: "Tenisas", tone: "text-chart-3 bg-chart-3/10" },
  BASKETBALL: { Icon: Volleyball, label: "Krepšinis", tone: "text-chart-4 bg-chart-4/10" },
  NBA: { Icon: Volleyball, label: "NBA", tone: "text-primary bg-primary/10" },
  MLB: { Icon: Target, label: "MLB", tone: "text-success bg-success/10" },
  BASEBALL: { Icon: Target, label: "Beisbolas", tone: "text-success bg-success/10" },
  SOCCER: { Icon: Goal, label: "Futbolas", tone: "text-chart-2 bg-chart-2/10" },
}

export function SportIcon({
  sport,
  className,
}: {
  sport: Sport
  className?: string
}) {
  const { Icon, label, tone } = MAP[sport]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${tone} ${className ?? ""}`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  )
}
