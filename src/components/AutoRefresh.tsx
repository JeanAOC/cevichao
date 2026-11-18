'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Mantiene la pantalla al día sin F5: vuelve a pedir los datos del servidor al volver a la pestaña
 * y cada 30 s mientras está visible (por ejemplo, cuando cambian la cuenta de cobro o el cierre).
 * Conserva lo que la persona esté escribiendo (solo recarga los datos del servidor).
 */
export default function AutoRefresh({ everyMs = 30_000 }: { everyMs?: number }) {
  const router = useRouter()

  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') router.refresh() }
    const timer = setInterval(refresh, everyMs)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [router, everyMs])

  return null
}
