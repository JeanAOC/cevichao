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
      className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-60"
      style={paid
        ? { background: 'var(--success)', color: 'white' }
        : { border: '2px solid var(--border)', color: 'var(--muted)' }
      }>
      {loading ? '…' : paid ? '✓ Pagado' : 'Marcar pagado'}
    </button>
  )
}
