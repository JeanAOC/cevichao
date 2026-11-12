'use client'

import { useState } from 'react'
import OrderEditor from './OrderEditor'

const GUEST = '__guest'
const inputCls = 'w-full px-4 py-3 rounded-xl text-base outline-none'
const inputStyle = { background: 'var(--bg)', border: '1.5px solid var(--border)', color: 'var(--text)' }

interface Props {
  eventId: string
  ivaRate: number
  /** Personas de la app que todavía no están en este evento */
  people: { id: string; name: string }[]
}

/** El organizador agrega a alguien que no respondió, o a un invitado que no tiene cuenta. */
export default function AddPerson({ eventId, ivaRate, people }: Props) {
  const [who, setWho] = useState('')
  const [guestName, setGuestName] = useState('')

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-sm font-semibold block mb-1.5">Persona</span>
        <select value={who} onChange={e => setWho(e.target.value)} className={inputCls} style={inputStyle}>
          <option value="">Elige…</option>
          {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          <option value={GUEST}>Invitado sin cuenta (escribir nombre)</option>
        </select>
      </label>

      {who === GUEST && (
        <label className="block">
          <span className="text-sm font-semibold block mb-1.5">Nombre del invitado</span>
          <input value={guestName} onChange={e => setGuestName(e.target.value)} maxLength={60}
            placeholder="Nombre" className={inputCls} style={inputStyle} />
        </label>
      )}

      {who && (who !== GUEST || guestName.trim()) && (
        <OrderEditor key={`${who}-${guestName}`} mode="manage" eventId={eventId} ivaRate={ivaRate}
          userId={who === GUEST ? undefined : who} name={who === GUEST ? guestName : undefined}
          submitLabel="Agregar al evento" onDone={() => { setWho(''); setGuestName('') }} />
      )}
    </div>
  )
}
