'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function CancelOrderButton() {
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleCancel() {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/orders/cancel', { method: 'POST' }).catch(() => null)
    setLoading(false)
    if (!res || !res.ok) {
      setError(res ? (await res.json().catch(() => ({}))).error ?? 'No se pudo cancelar' : 'Sin conexión')
      return
    }
    setConfirm(false)
    router.refresh()
  }

  if (confirm) {
    return (
      <div className="space-y-2">
      <div className="flex gap-2">
        <button onClick={handleCancel} disabled={loading}
          className="flex-1 min-h-11 rounded-xl font-bold text-sm disabled:opacity-50"
          style={{ background: 'var(--danger)', color: 'var(--danger-fg)' }}>
          {loading ? 'Cancelando…' : 'Sí, cancelar'}
        </button>
        <button onClick={() => setConfirm(false)}
          className="flex-1 min-h-11 rounded-xl font-bold text-sm border"
          style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
          No
        </button>
      </div>
      {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>
    )
  }

  return (
    <div className="flex gap-2 pt-1">
      <Link href="/pedir"
        className="flex-1 min-h-11 inline-flex items-center justify-center rounded-xl font-bold text-sm text-center border transition-colors"
        style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>
        Editar pedido
      </Link>
      <button onClick={() => setConfirm(true)}
        className="flex-1 min-h-11 rounded-xl font-bold text-sm border"
        style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
        Cancelar pedido
      </button>
    </div>
  )
}
