'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { chochoTotal, MAX_COMMENT, MAX_QTY, type ChochoItem } from '@/lib/chocho'
import { money } from '@/lib/menu'

interface Props {
  /** Platos activos (los que se pueden pedir). */
  menu: ChochoItem[]
  /** Todos los platos (para calcular con los precios de siempre). */
  initial?: { items: Record<string, number>; comentarios: string }
  editing: boolean
}

/** Elegir platos con cantidad y un comentario. El total se recalcula en el servidor al guardar. */
export default function ChochoOrderForm({ menu, initial, editing }: Props) {
  const router = useRouter()
  const [items, setItems] = useState<Record<string, number>>(initial?.items ?? {})
  const [comentarios, setComentarios] = useState(initial?.comentarios ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = chochoTotal(menu, items)
  const count = Object.values(items).reduce((n, q) => n + q, 0)

  function setQty(key: string, qty: number) {
    setItems(prev => {
      const next = { ...prev }
      if (qty <= 0) delete next[key]
      else next[key] = Math.min(qty, MAX_QTY)
      return next
    })
  }

  async function save() {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/chocho/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save', items, comentarios }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'No se pudo guardar el pedido')
      setLoading(false)
      return
    }
    router.push('/cevichocho/mi-pedido')
    router.refresh()
  }

  const btn = 'w-11 h-11 rounded-xl text-xl font-black border disabled:opacity-40'

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border p-2 sm:p-4 shadow-card" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <ul>
          {menu.map(i => {
            const qty = items[i.key] ?? 0
            return (
              <li key={i.key} className="flex items-center gap-3 py-2.5 px-2 border-t first:border-t-0" style={{ borderColor: 'var(--border)' }}>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold leading-snug">{i.label}</p>
                  <p className="menu-price !text-base">{money(i.price)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {qty > 0 && (
                    <>
                      <button type="button" onClick={() => setQty(i.key, qty - 1)} aria-label={`Quitar uno de ${i.label}`}
                        className={btn} style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}>−</button>
                      <span className="w-6 text-center font-black text-lg" aria-live="polite">{qty}</span>
                    </>
                  )}
                  <button type="button" onClick={() => setQty(i.key, qty + 1)} disabled={qty >= MAX_QTY} aria-label={`Agregar ${i.label}`}
                    className={btn}
                    style={qty > 0
                      ? { background: 'var(--primary)', borderColor: 'var(--primary)', color: 'var(--primary-fg)' }
                      : { background: 'var(--card)', borderColor: 'var(--primary)', color: 'var(--primary)' }}>+</button>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="rounded-2xl border p-5 shadow-card" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <label htmlFor="comentarios" className="block font-bold mb-2">Comentarios <span className="font-normal text-sm" style={{ color: 'var(--muted)' }}>(opcional)</span></label>
        <textarea id="comentarios" rows={2} maxLength={MAX_COMMENT} value={comentarios} onChange={e => setComentarios(e.target.value)}
          placeholder="Ej. sin ají, extra limón…" className="w-full px-4 py-3 rounded-xl text-sm" />
      </section>

      {error && (
        <p role="alert" className="text-sm font-medium rounded-lg px-3 py-2"
          style={{ background: 'color-mix(in srgb, var(--danger) 12%, var(--card))', color: 'var(--danger)', border: '1px solid color-mix(in srgb, var(--danger) 40%, transparent)' }}>
          {error}
        </p>
      )}

      {/* Barra con el total: fija sobre la barra inferior en celular */}
      <div className="h-20 sm:hidden" aria-hidden />
      <div className="fixed left-0 right-0 z-30 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] sm:static border-t sm:border sm:rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>{count} plato{count !== 1 ? 's' : ''}</p>
          <p className="font-display text-2xl font-extrabold leading-none" style={{ color: 'var(--accent)' }}>{money(total)}</p>
        </div>
        <button type="button" onClick={save} disabled={loading || count === 0}
          className="press min-h-12 px-6 rounded-xl font-bold disabled:opacity-50"
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
          {loading ? 'Guardando…' : editing ? 'Actualizar pedido' : 'Confirmar pedido'}
        </button>
      </div>
    </div>
  )
}
