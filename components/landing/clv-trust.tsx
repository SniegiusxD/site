import { AlertTriangle, ShieldCheck } from 'lucide-react'
import type { TrustLabel } from '@/lib/close-evidence'

/**
 * Whether the CLV figures beside it can be trusted yet, as the scanner judged
 * it. Rendered from server data, so it is in the first frame and never pushes
 * the figures around after load.
 */
export function ClvTrust({ label, className = '' }: { label: TrustLabel; className?: string }) {
  const Icon = label.trusted ? ShieldCheck : AlertTriangle
  const detail = [...label.reasons, label.coverage ? `${label.coverage}.` : null].filter(Boolean).join(' ')
  return (
    <p className={`flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[0.85rem] ${className}`}>
      <span
        className={`inline-flex shrink-0 items-center gap-1 self-center rounded-full px-2 py-0.5 font-semibold ${
          label.trusted ? 'bg-pitch-soft text-pitch' : 'bg-[rgb(245_165_36/0.12)] text-warning'
        }`}
      >
        <Icon className="size-3.5" aria-hidden />
        {label.title}
      </span>
      {detail && <span className="text-haze">{detail}</span>}
    </p>
  )
}
