'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  eventId: string
  current: string | null
  people: { orderId: string; name: string }[]
}

/** Elige quién pagó la cuenta en el local. Su pedido cuenta como pagado. */
export default function EventPayerSelect({ eventId, current, people }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function change(value: string) {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/cumple/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setPayer', eventId, orderId: value === '' ? null : value }),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'No se pudo guardar')
      return
    }
    router.refresh()
  }

  if (people.length === 0) {
    return (
      <div className="rounded-xl border px-4 py-4 text-sm space-y-2" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
        <p className="font-semibold">Todavía no hay nadie en este evento.</p>
        <p style={{ color: 'var(--muted)' }}>
          Aquí aparecen las personas que ya pusieron su pedido. Agrega a quien pagó la cuenta, o pídele que ponga su pedido.
        </p>
        <Link href={`/cumple/${eventId}?tab=organizar`} className="inline-block text-xs px-3 py-2 rounded-lg font-bold border"
          style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>
          Agregar personas →
        </Link>
      </div>
    )
  }

  return (
    <div>
      <select value={current ?? ''} disabled={loading} onChange={e => change(e.target.value)}
        className="w-full px-4 py-3 rounded-xl text-base font-semibold outline-none disabled:opacity-60"
        style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', color: 'var(--text)' }}>
        <option value="">Nadie todavía</option>
        {people.map(p => <option key={p.orderId} value={p.orderId}>{p.name}</option>)}
      </select>
      {error && <p className="text-sm mt-2" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  )
}
