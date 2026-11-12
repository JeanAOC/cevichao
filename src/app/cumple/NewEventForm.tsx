'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const inputCls = 'w-full px-4 min-h-12 rounded-xl text-base'

/** Crear evento: queda plegado para que la lista de eventos (lo que más se usa) vaya primero. */
export default function NewEventForm({ today, defaultOpen = false }: { today: string; defaultOpen?: boolean }) {
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
    <details open={defaultOpen} className="group rounded-2xl border-2 border-dashed" style={{ borderColor: 'var(--field-bd)', background: 'var(--card)' }}>
      <summary className="flex items-center justify-between gap-3 min-h-14 px-5 cursor-pointer list-none font-extrabold font-display text-lg [&::-webkit-details-marker]:hidden">
        <span>＋ Nuevo evento</span>
        <span className="text-sm font-semibold transition-transform group-open:rotate-180" style={{ color: 'var(--muted)' }} aria-hidden>▾</span>
      </summary>
      <form onSubmit={create} className="px-5 pb-5 space-y-4">
        <label className="block">
          <span className="text-sm font-semibold block mb-1.5">Nombre</span>
          <input value={name} onChange={e => setName(e.target.value)} maxLength={60} required placeholder="Cumple Andy"
            className={inputCls} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-semibold block mb-1.5">Fecha</span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required className={inputCls} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold block mb-1.5">IVA %</span>
            <input value={iva} onChange={e => setIva(e.target.value)} inputMode="decimal" className={inputCls} />
          </label>
        </div>
        {error && <p role="alert" className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>{error}</p>}
        <button type="submit" disabled={saving} className="w-full min-h-12 rounded-xl font-bold disabled:opacity-50"
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
          {saving ? 'Creando…' : 'Crear evento'}
        </button>
      </form>
    </details>
  )
}
