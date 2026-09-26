'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { FEEDBACK_KINDS } from '@/lib/feedback-kinds'
import type { FeedbackRow } from '@/lib/owner'
import { brand } from '@/lib/brand'

const kindLabel = (kind: string) => FEEDBACK_KINDS.find((entry) => entry.key === kind)?.label ?? kind

/** The owner's list of help-page notes, newest unhandled first. */
export function FeedbackInbox({ initial }: { initial: FeedbackRow[] }) {
  const [rows, setRows] = useState(initial)
  const [showDone, setShowDone] = useState(false)
  const open = rows.filter((row) => row.status !== 'done')
  const shown = showDone ? rows : open

  async function mark(id: string, status: 'new' | 'done') {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, status } : row)))
    const response = await fetch('/api/owner/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    }).catch(() => null)
    if (!response?.ok) {
      toast.error('Nepavyko pakeisti būsenos.')
      setRows((current) => current.map((row) => (row.id === id ? { ...row, status: status === 'done' ? 'new' : 'done' } : row)))
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-[0.9rem] text-haze">
        <p>{open.length ? `Neperskaitytų: ${open.length}` : 'Viskas sutvarkyta.'}</p>
        {rows.length > open.length && (
          <button type="button" onClick={() => setShowDone((value) => !value)} className="min-h-10 rounded-lg px-3 hover:bg-night/60 hover:text-chalk">
            {showDone ? 'Slėpti atliktas' : `Rodyti atliktas (${rows.length - open.length})`}
          </button>
        )}
      </div>
      <ul className="mt-3 grid gap-3">
        {shown.map((row) => (
          <li key={row.id} className={`rounded-xl bg-night/60 p-4 ${row.status === 'done' ? 'opacity-60' : ''}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[0.85rem] text-haze">
              <span>
                <span className="font-medium text-chalk">{kindLabel(row.kind)}</span>, {row.createdAt.slice(0, 16).replace('T', ' ')}
                {row.page ? `, ${row.page}` : ''}
              </span>
              <span>{row.contactOk ? row.email : 'atsakymo nenori'}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap">{row.message}</p>
            <div className="mt-3 flex gap-2">
              {row.contactOk && (
                <a
                  href={`mailto:${row.email}?subject=${encodeURIComponent(`Dėl tavo žinutės ${brand.name}`)}`}
                  className="inline-flex min-h-10 items-center rounded-lg bg-rail px-3 text-[0.9rem] font-medium hover:bg-rail-strong"
                >
                  Atsakyti el. paštu
                </a>
              )}
              <button
                type="button"
                onClick={() => mark(row.id, row.status === 'done' ? 'new' : 'done')}
                className="min-h-10 rounded-lg px-3 text-[0.9rem] font-medium text-haze hover:bg-stand hover:text-chalk"
              >
                {row.status === 'done' ? 'Grąžinti į naujas' : 'Pažymėti atlikta'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
