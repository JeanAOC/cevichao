'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function CancelOrderButton() {
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleCancel() {
    setLoading(true)
    await fetch('/api/orders/cancel', { method: 'POST' })
    setLoading(false)
    router.refresh()
  }

  if (confirm) {
    return (
      <div className="flex gap-2">
        <button onClick={handleCancel} disabled={loading}
          className="flex-1 py-2 rounded-xl font-bold text-sm disabled:opacity-50"
          style={{ background: 'var(--danger)', color: 'white' }}>
          {loading ? 'Cancelando…' : 'Sí, cancelar'}
        </button>
        <button onClick={() => setConfirm(false)}
          className="flex-1 py-2 rounded-xl font-bold text-sm border"
          style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
          No
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-2 pt-1">
      <Link href="/pedir"
        className="flex-1 py-2 rounded-xl font-bold text-sm text-center border transition-colors"
        style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>
        Editar pedido
      </Link>
      <button onClick={() => setConfirm(true)}
        className="flex-1 py-2 rounded-xl font-bold text-sm border"
        style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
        Cancelar pedido
      </button>
    </div>
  )
}
