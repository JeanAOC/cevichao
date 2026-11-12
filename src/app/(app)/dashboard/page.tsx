import Link from 'next/link'
import Menu from '@/components/Menu'
import { loadMenu } from '@/lib/menu-server'

export const revalidate = 0

export default async function HomePage() {
  const menu = await loadMenu()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black">Menú</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>Lo que se puede pedir y cuánto cuesta.</p>
      </div>

      <Menu menu={menu} />

      <Link href="/pedir" className="block text-center py-3.5 rounded-2xl font-bold"
        style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
        Hacer pedido 🐟
      </Link>
    </div>
  )
}
