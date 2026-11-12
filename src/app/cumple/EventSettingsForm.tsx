'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const inputCls = 'w-full px-4 py-3 rounded-xl text-base outline-none'
const inputStyle = { background: 'var(--bg)', border: '1.5px solid var(--border)', color: 'var(--text)' }

interface Props {
  eventId: string
  name: string
  eventDate: string
  ivaRate: number
}

export default function EventSettingsForm({ eventId, name: initialName, eventDate, ivaRate }: Props) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [date, setDate] = useState(eventDate)
  const [iva, setIva] = useState(String(ivaRate))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    const res = await fetch('/api/cumple/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateEvent', eventId, name, eventDate: date, ivaRate: iva }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setMessage({ ok: false, text: data.error ?? 'No se pudo guardar' })
      return
    }
    setMessage({ ok: true, text: 'Guardado ✓' })
    router.refresh()
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <label className="block">
        <span className="text-sm font-semibold block mb-1.5">Nombre</span>
        <input value={name} onChange={e => setName(e.target.value)} maxLength={60} required className={inputCls} style={inputStyle} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-semibold block mb-1.5">Fecha</span>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} required className={inputCls} style={inputStyle} />
        </label>
        <label className="block">
          <span className="text-sm font-semibold block mb-1.5">IVA %</span>
          <input value={iva} onChange={e => setIva(e.target.value)} inputMode="decimal" className={inputCls} style={inputStyle} />
        </label>
      </div>
      {message && <p className="text-sm font-semibold" style={{ color: message.ok ? 'var(--success)' : 'var(--danger)' }}>{message.text}</p>}
      <button type="submit" disabled={saving} className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-50"
        style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
        {saving ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  )
}
