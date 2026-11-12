'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteOrderButton({ orderId }: { orderId: string }) {
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setLoading(true)
    await fetch('/api/admin/delete-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    })
    setLoading(false)
    router.refresh()
  }

  if (confirm) {
    return (
      <div className="flex gap-1">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-sm px-4 min-h-11 rounded-lg font-bold disabled:opacity-50"
          style={{ background: 'var(--danger)', color: 'var(--danger-fg)' }}>
          {loading ? '...' : 'Confirmar'}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="text-sm px-4 min-h-11 rounded-lg font-bold border"
          style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="text-sm px-4 min-h-11 rounded-lg font-bold"
      style={{ color: 'var(--danger)' }}>
      Eliminar
    </button>
  )
}
