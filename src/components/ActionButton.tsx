'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Variant = 'primary' | 'success' | 'danger' | 'ghost'

const STYLES: Record<Variant, React.CSSProperties> = {
  primary: { background: 'var(--primary)', color: 'var(--primary-fg)', border: '1.5px solid var(--primary)' },
  success: { background: 'var(--ok-bg)', color: 'var(--ok-fg)', border: '1.5px solid var(--ok-bd)' },
  danger: { background: 'transparent', color: 'var(--danger)', border: '1.5px solid var(--danger)' },
  ghost: { background: 'transparent', color: 'var(--muted)', border: '1.5px solid var(--border)' },
}

interface Props {
  endpoint: string
  /** Lo que se envía en el cuerpo (JSON). */
  body: Record<string, unknown>
  children: React.ReactNode
  variant?: Variant
  /** Si se indica, pide confirmación antes de enviar. */
  confirmText?: string
  /** Pantalla a la que ir después (por ejemplo, tras borrar un evento). Por defecto solo recarga. */
  redirectTo?: string
  className?: string
}

/** Botón que envía una acción al servidor y recarga la página. Con confirmación opcional en dos pasos. */
export default function ActionButton({ endpoint, body, children, variant = 'ghost', confirmText, redirectTo, className = '' }: Props) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setLoading(true)
    setError(null)
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'No se pudo completar')
      setConfirming(false)
      return
    }
    setConfirming(false)
    if (redirectTo) router.push(redirectTo)
    router.refresh()
  }

  const base = `text-sm px-4 min-h-11 rounded-lg font-bold disabled:opacity-50 ${className}`

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <button onClick={run} disabled={loading} className={base} style={STYLES.danger}>
          {loading ? '…' : confirmText}
        </button>
        <button onClick={() => setConfirming(false)} disabled={loading} className={base} style={STYLES.ghost}>No</button>
      </span>
    )
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button onClick={() => (confirmText ? setConfirming(true) : run())} disabled={loading} className={base} style={STYLES[variant]}>
        {loading ? '…' : children}
      </button>
      {error && <span className="text-xs" style={{ color: 'var(--danger)' }}>{error}</span>}
    </span>
  )
}
