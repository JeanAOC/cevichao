'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Aviso para quien quedó como pagador de la cuenta y todavía no puso dónde quiere que le depositen.
 * El botón lleva directo al lugar donde se pone la cuenta. «Ahora no» lo cierra hasta que se recargue la página.
 * `hideOnPath`: no se muestra en esa ruta (por ejemplo, donde ya está el formulario).
 */
export default function PayerAccountModal({ href, hideOnPath, title = 'Tú pagaste la cuenta 💳', text }: {
  href: string
  hideOnPath?: string
  title?: string
  text: string
}) {
  const pathname = usePathname()
  const [dismissed, setDismissed] = useState(false)
  const open = !dismissed && pathname !== hideOnPath

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDismissed(true) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgb(0 0 0 / 0.5)' }} onClick={() => setDismissed(true)}>
      <div role="dialog" aria-modal="true" aria-labelledby="payer-modal-title"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border p-6 shadow-card space-y-4"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <h2 id="payer-modal-title" className="font-display text-2xl font-extrabold">{title}</h2>
        <p style={{ color: 'var(--muted)' }}>{text}</p>
        <div className="flex flex-col gap-2">
          <Link href={href} onClick={() => setDismissed(true)}
            className="min-h-12 inline-flex items-center justify-center rounded-xl font-bold px-4"
            style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
            Poner mi cuenta →
          </Link>
          <button type="button" onClick={() => setDismissed(true)}
            className="min-h-11 rounded-xl font-bold text-sm border"
            style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
            Ahora no
          </button>
        </div>
      </div>
    </div>
  )
}
