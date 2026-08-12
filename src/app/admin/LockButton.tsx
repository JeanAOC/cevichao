'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LockButton({ locked }: { locked: boolean }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function toggle() {
    setLoading(true)
    await fetch('/api/admin/lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locked: !locked }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
      style={locked
        ? { background: 'color-mix(in srgb, var(--danger) 15%, var(--card))', color: 'var(--danger)', border: '1.5px solid color-mix(in srgb, var(--danger) 30%, transparent)' }
        : { background: 'color-mix(in srgb, var(--success) 15%, var(--card))', color: 'var(--success)', border: '1.5px solid color-mix(in srgb, var(--success) 30%, transparent)' }
      }>
      {loading ? '...' : locked ? '🔒 Desbloquear pedidos' : '🔓 Bloquear pedidos'}
    </button>
  )
}
