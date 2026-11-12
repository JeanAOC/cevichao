import Link from 'next/link'
import Menu from '@/components/Menu'

export default function HomePage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black">Menú</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>Lo que se puede pedir y cuánto cuesta.</p>
      </div>

      <Menu />

      <Link href="/pedir" className="block text-center py-3.5 rounded-2xl font-bold"
        style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
        Hacer pedido 🐟
      </Link>
    </div>
  )
}
