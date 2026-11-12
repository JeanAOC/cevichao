'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const inputCls = 'w-full px-4 py-3 rounded-xl text-base outline-none'
const inputStyle = { background: 'var(--bg)', border: '1.5px solid var(--border)', color: 'var(--text)' }

export default function NewEventForm({ today }: { today: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [date, setDate] = useState(today)
  const [iva, setIva] = useState('15')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const res = await fetch('/api/cumple/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'createEvent', name, eventDate: date, ivaRate: iva }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'No se pudo crear'); return }
    router.push(`/cumple/${data.id}`)
  }

  return (
    <form onSubmit={create} className="rounded-2xl border p-5 space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <h2 className="font-black">Nuevo evento</h2>
      <label className="block">
        <span className="text-sm font-semibold block mb-1.5">Nombre</span>
        <input value={name} onChange={e => setName(e.target.value)} maxLength={60} required placeholder="Cumple Andy"
          className={inputCls} style={inputStyle} />
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
      {error && <p className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>{error}</p>}
      <button type="submit" disabled={saving} className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-50"
        style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
        {saving ? 'Creando…' : 'Crear evento'}
      </button>
    </form>
  )
}
