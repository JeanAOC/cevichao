'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  current: string | null
  people: { userId: string; name: string }[]
}

/** Elige quién pagó en el local hoy (Cevichocho). Su pedido cuenta como pagado. */
export default function ChochoPayerSelect({ current, people }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function change(value: string) {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/chocho/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setPayer', userId: value === '' ? null : value }),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'No se pudo guardar')
      return
    }
    router.refresh()
  }

  return (
    <div>
      <select value={current ?? ''} disabled={loading} onChange={e => change(e.target.value)} aria-label="¿Quién pagó en el local?"
        className="w-full px-4 min-h-12 rounded-xl text-base font-semibold disabled:opacity-60">
        <option value="">Nadie todavía</option>
        {people.map(p => <option key={p.userId} value={p.userId}>{p.name}</option>)}
      </select>
      {error && <p className="text-sm mt-2" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  )
}
