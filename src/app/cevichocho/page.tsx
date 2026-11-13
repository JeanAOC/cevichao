import Link from 'next/link'
import { loadChochoMenu } from '@/lib/chocho-server'
import { money } from '@/lib/menu'

export const revalidate = 0

export default async function CevichochoMenuPage() {
  const { menu, missing } = await loadChochoMenu()
  const items = menu.filter(i => i.active)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold">La carta</h1>
          <p className="mt-1" style={{ color: 'var(--muted)' }}>Lo que se puede pedir en Cevichocho y cuánto cuesta.</p>
        </div>
        <Link href="/cevichocho/pedir" className="press inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-xl font-bold shadow-card"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
          Hacer pedido <span aria-hidden>🥣</span>
        </Link>
      </div>

      {missing && (
        <div className="rounded-2xl border p-5 space-y-1" style={{ background: 'color-mix(in srgb, var(--accent) 10%, var(--card))', borderColor: 'var(--accent)' }}>
          <p className="font-black">Falta activar Cevichocho</p>
          <p className="text-sm">
            Ejecuta una vez <code className="font-bold">migrations/2026-11-15-cevichocho.sql</code> en Supabase → SQL Editor y recarga.
          </p>
        </div>
      )}

      <section className="rounded-2xl border p-5 shadow-card" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <ul>
          {items.map((i, idx) => (
            <li key={i.key} className="menu-row border-t first:border-t-0" style={{ borderColor: 'var(--border)' }}>
              <span className="text-xs font-black w-6 h-6 rounded-full inline-flex items-center justify-center shrink-0 self-center"
                style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>{idx + 1}</span>
              <span className="font-semibold">{i.label}</span>
              <span className="leader" aria-hidden />
              <span className="menu-price">{money(i.price)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
