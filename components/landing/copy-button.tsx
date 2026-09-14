'use client'

import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'

export function CopyButton({
  text,
  label,
  className = '',
}: {
  text: string
  /** What is being copied, for screen readers: "Kopijuoti: {label}". */
  label: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(timer)
  }, [copied])

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      // Clipboard can be blocked (insecure context, permissions). Selecting
      // the text is the fallback the user can still act on.
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? 'Nukopijuota' : `Kopijuoti: ${label}`}
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[0.85rem] font-medium transition-colors ${
        copied ? 'bg-pitch-soft text-pitch' : 'text-haze hover:bg-stand-hover hover:text-chalk'
      } ${className}`}
    >
      {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      <span>{copied ? 'Nukopijuota' : 'Kopijuoti'}</span>
    </button>
  )
}
