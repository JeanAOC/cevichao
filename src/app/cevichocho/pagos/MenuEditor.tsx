'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ChochoItem } from '@/lib/chocho'

const ENDPOINT = '/api/chocho/admin'

async function send(body: Record<string, unknown>): Promise<string | null> {
  const res = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (res.ok) return null
  const data = await res.json().catch(() => ({}))
  return data.error ?? 'No se pudo guardar'
}

function Row({ item }: { item: ChochoItem }) {
  const router = useRouter()
  const [label, setLabel] = useState(item.label)
  const [price, setPrice] = useState(item.price.toFixed(2))
  const [active, setActive] = useState(item.active)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dirty = label !== item.label || price !== item.price.toFixed(2) || active !== item.active

  async function save() {
    setLoading(true)
    setError(null)
    const err = await send({ action: 'saveItem', id: item.id, label, price, active })
    setLoading(false)
    if (err) { setError(err); return }
    router.refresh()
  }

  return (
    <li className="py-3 border-t first:border-t-0 space-y-2" style={{ borderColor: 'var(--border)', opacity: active ? 1 : 0.7 }}>
      <input value={label} onChange={e => setLabel(e.target.value)} aria-label="Nombre del plato" maxLength={80}
        className="w-full px-3 min-h-11 rounded-xl text-sm font-semibold" />
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-28">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--muted)' }}>$</span>
          <input value={price} onChange={e => setPrice(e.target.value)} inputMode="decimal" aria-label="Precio"
            className="w-full pl-6 pr-2 min-h-11 rounded-xl text-sm font-bold" />
        </div>
        <label className="inline-flex items-center gap-2 min-h-11 px-2 text-sm font-semibold cursor-pointer">
          <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="w-5 h-5" />
          En el menú
        </label>
        <button onClick={save} disabled={!dirty || loading}
          className="ml-auto min-h-11 px-4 rounded-lg text-sm font-bold disabled:opacity-40"
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
          {loading ? '…' : 'Guardar'}
        </button>
      </div>
      {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
    </li>
  )
}

/** Editar nombres, precios y disponibilidad de los platos, y agregar uno nuevo. Solo admins. */
export default function ChochoMenuEditor({ items }: { items: ChochoItem[] }) {
  const router = useRouter()
  const [label, setLabel] = useState('')
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function add() {
    setLoading(true)
    setError(null)
    const err = await send({ action: 'addItem', label, price })
    setLoading(false)
    if (err) { setError(err); return }
    setLabel('')
    setPrice('')
    router.refresh()
  }

  return (
    <div className="space-y-5">
      <ul>{items.map(i => <Row key={`${i.key}:${i.label}:${i.price}:${i.active}`} item={i} />)}</ul>

      <div className="border-t-2 border-dashed pt-4 space-y-2" style={{ borderColor: 'var(--border)' }}>
        <p className="font-bold">Agregar plato</p>
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Nombre del plato" aria-label="Nombre del nuevo plato" maxLength={80}
          className="w-full px-3 min-h-11 rounded-xl text-sm" />
        <div className="flex gap-2">
          <input value={price} onChange={e => setPrice(e.target.value)} placeholder="Precio" inputMode="decimal" aria-label="Precio del nuevo plato"
            className="w-28 px-3 min-h-11 rounded-xl text-sm" />
          <button onClick={add} disabled={loading || !label.trim() || !price.trim()}
            className="min-h-11 px-4 rounded-lg text-sm font-bold disabled:opacity-40"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
            {loading ? '…' : '＋ Agregar'}
          </button>
        </div>
        {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>
    </div>
  )
}
