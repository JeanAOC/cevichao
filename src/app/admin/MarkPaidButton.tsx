'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  orderId: string
  paid: boolean
}

export default function MarkPaidButton({ orderId, paid }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function toggle() {
    setLoading(true)
    await fetch('/api/admin/mark-paid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, paid: !paid }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="px-4 min-h-11 rounded-xl text-sm font-bold transition-all disabled:opacity-60"
      style={paid
        // Ya pagado: aviso suave (no un botón verde sólido repetido en cada fila)
        ? { background: 'var(--ok-bg)', color: 'var(--ok-fg)', border: '1.5px solid var(--ok-bd)' }
        : { border: '2px solid var(--primary)', color: 'var(--primary)' }
      }>
      {loading ? '…' : paid ? '✓ Pagado' : 'Marcar pagado'}
    </button>
  )
}
