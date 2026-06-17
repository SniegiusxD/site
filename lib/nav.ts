import {
  BarChart3,
  History,
  Layers,
  Settings,
  Wallet,
  type LucideIcon,
} from "lucide-react"

export type SectionKey =
  | "signalai"
  | "aktyvus"
  | "istorija"
  | "analitika"
  | "nustatymai"

export const NAV_ITEMS: {
  key: SectionKey
  label: string
  Icon: LucideIcon
}[] = [
  { key: "signalai", label: "Signalai", Icon: Layers },
  { key: "aktyvus", label: "Aktyvūs", Icon: Wallet },
  { key: "istorija", label: "Istorija", Icon: History },
  { key: "analitika", label: "Analitika", Icon: BarChart3 },
  { key: "nustatymai", label: "Nustatymai", Icon: Settings },
]
