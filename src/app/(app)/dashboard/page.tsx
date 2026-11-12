import Link from 'next/link'
import Menu from '@/components/Menu'
import { loadMenu } from '@/lib/menu-server'

export const revalidate = 0

export default async function HomePage() {
  const menu = await loadMenu()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold">La carta</h1>
          <p className="mt-1" style={{ color: 'var(--muted)' }}>Lo que se puede pedir y cuánto cuesta.</p>
        </div>
        {/* La acción principal va arriba: no hay que recorrer toda la carta para pedir */}
        <Link href="/pedir" className="press inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-xl font-bold shadow-card"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
          Hacer pedido <span aria-hidden>🐟</span>
        </Link>
      </div>

      <Menu menu={menu} />
    </div>
  )
}
