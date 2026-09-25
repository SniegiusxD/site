'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check, ClipboardList, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { SPRING } from '@/lib/motion'

export function CopyButton({
  text,
  label,
  className = '',
  icon,
  onCopied,
}: {
  text: string
  /** What is being copied, for screen readers: "Kopijuoti: {label}". */
  label: string
  className?: string
  /**
   * 'full' copies the whole bet and shows no word, to sit beside the plain one.
   * 'plain' is the usual icon without the word, for a dense row.
   */
  icon?: 'full' | 'plain'
  /** Called once the text is on the clipboard. */
  onCopied?: () => void
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
      onCopied?.()
    } catch {
      // Clipboard can be blocked (insecure context, permissions). Selecting
      // the text is the fallback the user can still act on.
      setCopied(false)
    }
  }

  return (
    <motion.button
      type="button"
      onClick={copy}
      whileTap={{ scale: 0.94 }}
      aria-label={copied ? 'Nukopijuota' : `Kopijuoti: ${label}`}
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[0.85rem] font-medium transition-colors ${
        copied ? 'bg-pitch-soft text-pitch' : 'text-haze hover:bg-stand-hover hover:text-chalk'
      } ${className}`}
    >
      {/* The icon turns into a check where the member pressed, not in a toast elsewhere. */}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={copied ? 'done' : 'copy'}
          className="inline-flex"
          initial={{ scale: 0.4, rotate: copied ? -30 : 0, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          exit={{ scale: 0.4, opacity: 0 }}
          transition={SPRING.snappy}
        >
          {copied ? <Check className="size-4" aria-hidden /> : icon === 'full' ? <ClipboardList className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        </motion.span>
      </AnimatePresence>
      {icon ? null : <span>{copied ? 'Nukopijuota' : 'Kopijuoti'}</span>}
    </motion.button>
  )
}
