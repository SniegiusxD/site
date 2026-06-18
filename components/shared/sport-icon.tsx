import {
  Crosshair,
  Dumbbell,
  Goal,
  Snowflake,
  Swords,
  Target,
  Trophy,
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
  FOOTBALL: { Icon: Goal, label: "Futbolas", tone: "text-chart-2 bg-chart-2/10" },
  ICE_HOCKEY: { Icon: Snowflake, label: "Ledo ritulys", tone: "text-chart-1 bg-chart-1/10" },
  HANDBALL: { Icon: Target, label: "Rankinis", tone: "text-chart-4 bg-chart-4/10" },
  VOLLEYBALL: { Icon: Volleyball, label: "Tinklinis", tone: "text-chart-3 bg-chart-3/10" },
  RUGBY_LEAGUE: { Icon: Trophy, label: "Regbis", tone: "text-chart-2 bg-chart-2/10" },
  RUGBY: { Icon: Trophy, label: "Regbis", tone: "text-chart-2 bg-chart-2/10" },
  BOXING: { Icon: Swords, label: "Boksas", tone: "text-danger bg-danger/10" },
  MMA: { Icon: Swords, label: "MMA", tone: "text-danger bg-danger/10" },
  CRICKET: { Icon: Target, label: "Kriketas", tone: "text-success bg-success/10" },
  AMERICAN_FOOTBALL: { Icon: Trophy, label: "Amer. futbolas", tone: "text-primary bg-primary/10" },
  TABLE_TENNIS: { Icon: Crosshair, label: "Stalo tenisas", tone: "text-chart-3 bg-chart-3/10" },
  OTHER: { Icon: Dumbbell, label: "Sportas", tone: "text-muted-foreground bg-muted" },
}

const FALLBACK = MAP.OTHER

export function SportIcon({
  sport,
  className,
}: {
  sport: Sport
  className?: string
}) {
  const { Icon, label, tone } = MAP[sport] ?? FALLBACK
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${tone} ${className ?? ""}`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  )
}
