'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function MarkAllButton({ pending }: { pending: number }) {
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function markAll() {
    setLoading(true)
    await fetch('/api/pagos/mark-all', { method: 'POST' })
    setLoading(false)
    setConfirm(false)
    router.refresh()
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <button onClick={markAll} disabled={loading}
          className="text-xs px-3 py-2 rounded-lg font-bold disabled:opacity-50"
          style={{ background: 'var(--success)', color: 'white' }}>
          {loading ? '…' : `Sí, ${pending} pagaron`}
        </button>
        <button onClick={() => setConfirm(false)} disabled={loading}
          className="text-xs px-3 py-2 rounded-lg font-bold border"
          style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
          No
        </button>
      </div>
    )
  }

  return (
    <button onClick={() => setConfirm(true)}
      className="text-xs px-3 py-2 rounded-lg font-bold"
      style={{ background: 'color-mix(in srgb, var(--success) 15%, var(--card))', color: 'var(--success)', border: '1.5px solid color-mix(in srgb, var(--success) 35%, transparent)' }}>
      ✓ Marcar todos pagados
    </button>
  )
}
