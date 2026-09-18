'use client'

import { Plus } from 'lucide-react'
import { useId, useState } from 'react'
import { Reveal } from './motion-primitives'

/** Accessible disclosures whose answers open with a height and fade animation. */
export function FaqList({ items }: { items: Array<{ q: string; a: React.ReactNode }> }) {
  const [open, setOpen] = useState<Set<number>>(() => new Set())
  const baseId = useId()

  return (
    <div>
      {items.map((item, index) => {
        const expanded = open.has(index)
        const panelId = `${baseId}-${index}`
        return (
          <Reveal key={item.q} delay={Math.min(index, 6) * 30} className="border-b border-rail">
            <h3 className="font-sans text-[1.0625rem] leading-[1.4] font-semibold tracking-normal">
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() =>
                  setOpen((current) => {
                    const next = new Set(current)
                    if (next.has(index)) next.delete(index)
                    else next.add(index)
                    return next
                  })
                }
                className="flex min-h-11 w-full items-center justify-between gap-4 px-0.5 py-5 text-left transition-colors hover:text-white"
              >
                <span>{item.q}</span>
                <Plus
                  aria-hidden
                  className={`size-6 shrink-0 text-floodlight transition-transform duration-[280ms] ease-[cubic-bezier(.22,1,.36,1)] ${expanded ? 'rotate-45' : ''}`}
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              // inert, not aria-hidden: the answers contain links, and a hidden link must
              // not stay in the tab order.
              inert={!expanded}
              className="grid transition-[grid-template-rows,opacity] duration-[280ms] ease-[cubic-bezier(.22,1,.36,1)]"
              style={{ gridTemplateRows: expanded ? '1fr' : '0fr', opacity: expanded ? 1 : 0 }}
            >
              <div className="overflow-hidden">
                <p className="mb-[22px] max-w-[70ch] text-haze">{item.a}</p>
              </div>
            </div>
          </Reveal>
        )
      })}
    </div>
  )
}
