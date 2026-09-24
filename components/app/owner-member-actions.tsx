'use client'

import { useState } from 'react'
import type { OwnerMember } from '@/lib/admin-actions'

type Action = 'grant' | 'extend-trial' | 'revoke'

const stateName: Record<string, string> = {
  free: 'Nemokama', trial: 'Bandymas', active: 'Pilna', ending: 'Baigiasi', expired: 'Pasibaigė',
}

/** Member search plus deliberately explicit, audited owner access controls. */
export function OwnerMemberActions({ initial }: { initial: OwnerMember[] }) {
  const [members, setMembers] = useState(initial)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [choice, setChoice] = useState<{ member: OwnerMember; action: Action } | null>(null)
  const [reason, setReason] = useState('')
  const [until, setUntil] = useState('')
  const [days, setDays] = useState(7)
  const [message, setMessage] = useState('')

  async function search() {
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch(`/api/owner/users?q=${encodeURIComponent(query)}`)
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Nepavyko ieškoti.')
      setMembers(body.members)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Nepavyko ieškoti.')
    } finally {
      setBusy(false)
    }
  }

  function open(member: OwnerMember, action: Action) {
    setChoice({ member, action })
    setReason('')
    // No implicit date: the owner must deliberately choose the end of a grant.
    setUntil('')
    setDays(7)
    setMessage('')
  }

  async function apply() {
    if (!choice) return
    setBusy(true)
    setMessage('')
    try {
      const payload = choice.action === 'grant'
        ? { reason, until: new Date(`${until}T23:59:59Z`).toISOString() }
        : choice.action === 'extend-trial' ? { reason, days } : { reason }
      const response = await fetch(`/api/owner/users/${encodeURIComponent(choice.member.id)}/${choice.action}`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Nepavyko pakeisti prieigos.')
      setMembers((current) => current.map((member) => member.id === choice.member.id
        ? { ...member, access: body.access, adminAccessUntil: choice.action === 'revoke' ? null : member.adminAccessUntil }
        : member))
      setChoice(null)
      setMessage(`Atlikta. Audito įrašas: ${body.auditId}`)
      await search()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Nepavyko pakeisti prieigos.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void search() }}>
        <label className="sr-only" htmlFor="owner-member-search">Ieškoti pagal el. paštą</label>
        <input id="owner-member-search" value={query} onChange={(event) => setQuery(event.target.value)}
          placeholder="El. paštas" className="min-w-0 flex-1 rounded-xl bg-night px-3 py-2 hairline" />
        <button disabled={busy} className="rounded-xl bg-floodlight px-4 py-2 font-semibold text-night disabled:opacity-50">Ieškoti</button>
      </form>
      {message && <p className="mt-3 text-sm text-haze" role="status">{message}</p>}

      <div className="mt-4 space-y-2">
        {members.map((member) => (
          <article key={member.id} className="rounded-xl bg-night/60 p-4 hairline">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{member.email}</p>
                <p className="text-sm text-haze">{member.name} · {stateName[member.access.state]}{member.access.endsAt ? ` iki ${member.access.endsAt.slice(0, 10)}` : ''}</p>
                {member.providerCustomerId && <p className="text-xs text-haze-dim">Stripe: {member.providerCustomerId}</p>}
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <button onClick={() => open(member, 'grant')} className="rounded-lg px-3 py-1.5 hairline">Suteikti</button>
                <button onClick={() => open(member, 'extend-trial')} className="rounded-lg px-3 py-1.5 hairline">Pratęsti bandymą</button>
                <button onClick={() => open(member, 'revoke')} className="rounded-lg px-3 py-1.5 text-coral hairline">Atšaukti grantą</button>
              </div>
            </div>
          </article>
        ))}
        {!members.length && <p className="text-haze">Narių nerasta.</p>}
      </div>

      {choice && (
        <div className="mt-4 rounded-xl border border-floodlight/40 bg-night p-4" role="dialog" aria-modal="true" aria-labelledby="owner-confirm-title">
          <h3 id="owner-confirm-title" className="text-lg font-semibold">Patvirtinti prieigos pakeitimą</h3>
          <p className="mt-2 text-sm text-haze">Prieš: {stateName[choice.member.access.state]}{choice.member.access.endsAt ? ` iki ${choice.member.access.endsAt.slice(0, 10)}` : ''}</p>
          <p className="text-sm text-chalk">Po: {choice.action === 'grant' ? `pilna prieiga iki ${until || '—'}` : choice.action === 'extend-trial' ? `bandymas +${days} d.` : 'pašalintas tik rankinis grantas; Stripe ir bandymas neliečiami'}</p>
          {choice.action === 'grant' && <input aria-label="Galioja iki" type="date" value={until} onChange={(event) => setUntil(event.target.value)} className="mt-3 rounded-lg bg-stand px-3 py-2 hairline" />}
          {choice.action === 'extend-trial' && <input aria-label="Dienos" type="number" min={1} max={365} value={days} onChange={(event) => setDays(Number(event.target.value))} className="mt-3 w-28 rounded-lg bg-stand px-3 py-2 hairline" />}
          <textarea aria-label="Priežastis" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500}
            placeholder="Privaloma priežastis" className="mt-3 block min-h-20 w-full rounded-lg bg-stand px-3 py-2 hairline" />
          <div className="mt-3 flex gap-2">
            <button disabled={busy || reason.trim().length < 3 || (choice.action === 'grant' && !until)} onClick={() => void apply()}
              className="rounded-lg bg-floodlight px-4 py-2 font-semibold text-night disabled:opacity-50">Patvirtinti</button>
            <button disabled={busy} onClick={() => setChoice(null)} className="rounded-lg px-4 py-2 hairline">Atšaukti</button>
          </div>
        </div>
      )}
    </div>
  )
}
