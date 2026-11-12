'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  current: string | null
  people: { userId: string; name: string }[]
}

export default function PayerSelect({ current, people }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function change(value: string) {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/pagos/payer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: value === '' ? null : value }),
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
      <select
        value={current ?? ''}
        disabled={loading}
        onChange={e => change(e.target.value)}
        className="w-full px-4 py-3 rounded-xl text-base font-semibold outline-none disabled:opacity-60"
        style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', color: 'var(--text)' }}>
        <option value="">Nadie todavía</option>
        {people.map(p => <option key={p.userId} value={p.userId}>{p.name}</option>)}
      </select>
      {error && <p className="text-sm mt-2" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  )
}
