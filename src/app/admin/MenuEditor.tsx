'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { MenuItem } from '@/lib/menu'

interface Props {
  kind: string
  singular: string
  items: MenuItem[]
}

const inputCls = 'px-3 py-2.5 rounded-xl text-base outline-none'
const inputStyle = { background: 'var(--bg)', border: '1.5px solid var(--border)', color: 'var(--text)' }

export default function MenuEditor({ kind, singular, items }: Props) {
  const router = useRouter()
  const [drafts, setDrafts] = useState<Record<string, { label: string; price: string }>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newLabel, setNewLabel] = useState('')
  const [newPrice, setNewPrice] = useState('')

  const draftOf = (it: MenuItem) => drafts[it.id] ?? { label: it.label, price: it.price.toFixed(2) }
  const setDraft = (it: MenuItem, patch: Partial<{ label: string; price: string }>) =>
    setDrafts(d => ({ ...d, [it.id]: { ...draftOf(it), ...patch } }))
  const isDirty = (it: MenuItem) => {
    const d = draftOf(it)
    return d.label.trim() !== it.label || Number(d.price.replace(',', '.')) !== it.price
  }

  async function send(id: string, body: Record<string, unknown>): Promise<boolean> {
    setBusy(id)
    setError(null)
    const res = await fetch('/api/admin/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setBusy(null)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'No se pudo guardar')
      return false
    }
    router.refresh()
    return true
  }

  async function save(it: MenuItem) {
    const d = draftOf(it)
    const ok = await send(it.id, { action: 'update', id: it.id, label: d.label, price: d.price })
    if (ok) setDrafts(all => { const { [it.id]: _removed, ...rest } = all; void _removed; return rest })
  }

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const ok = await send('new', { action: 'create', kind, label: newLabel, price: newPrice || '0' })
    if (ok) { setNewLabel(''); setNewPrice('') }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-xl px-4 py-3 text-sm font-semibold"
          style={{ background: 'color-mix(in srgb, var(--danger) 12%, var(--card))', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
          {error}
        </p>
      )}

      {/* Añadir */}
      <form onSubmit={add} className="rounded-2xl border p-4 space-y-3" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <p className="font-black">Añadir {singular}</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input value={newLabel} onChange={e => setNewLabel(e.target.value)} maxLength={40} required
            placeholder="Nombre" aria-label={`Nombre de la ${singular} nueva`}
            className={`${inputCls} flex-1 min-w-0`} style={inputStyle} />
          <div className="flex gap-2">
            <div className="relative w-28 shrink-0">
              <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }}>$</span>
              <input value={newPrice} onChange={e => setNewPrice(e.target.value)} inputMode="decimal"
                placeholder="0.00" aria-label="Precio" className={`${inputCls} w-full pl-7`} style={inputStyle} />
            </div>
            <button type="submit" disabled={busy === 'new'}
              className="px-5 rounded-xl font-bold text-sm disabled:opacity-50"
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
              {busy === 'new' ? '…' : 'Añadir'}
            </button>
          </div>
        </div>
      </form>

      {/* Lista */}
      {items.length === 0 ? (
        <p className="text-center py-8" style={{ color: 'var(--muted)' }}>Todavía no hay nada aquí.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((it, idx) => {
            const d = draftOf(it)
            const dirty = isDirty(it)
            const working = busy === it.id
            return (
              <li key={it.id} className="rounded-2xl border p-4 space-y-3"
                style={{ background: 'var(--card)', borderColor: 'var(--border)', opacity: it.active ? 1 : 0.7 }}>
                <div className="flex items-center gap-2">
                  <input value={d.label} onChange={e => setDraft(it, { label: e.target.value })} maxLength={40}
                    aria-label={`Nombre de ${it.label}`} className={`${inputCls} flex-1 min-w-0 font-semibold`} style={inputStyle} />
                  {!it.active && <span className="chip chip-neutral shrink-0">Oculto</span>}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-28">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }}>$</span>
                    <input value={d.price} onChange={e => setDraft(it, { price: e.target.value })} inputMode="decimal"
                      aria-label={`Precio de ${it.label}`} className={`${inputCls} w-full pl-7 font-bold`} style={inputStyle} />
                  </div>

                  <button onClick={() => save(it)} disabled={!dirty || working}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
                    style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
                    {working ? '…' : 'Guardar'}
                  </button>

                  <div className="flex items-center gap-1 ml-auto">
                    <button onClick={() => send(it.id, { action: 'move', id: it.id, direction: 'up' })}
                      disabled={idx === 0 || !!busy} aria-label={`Subir ${it.label}`}
                      className="w-10 h-10 rounded-xl border text-lg disabled:opacity-30"
                      style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>↑</button>
                    <button onClick={() => send(it.id, { action: 'move', id: it.id, direction: 'down' })}
                      disabled={idx === items.length - 1 || !!busy} aria-label={`Bajar ${it.label}`}
                      className="w-10 h-10 rounded-xl border text-lg disabled:opacity-30"
                      style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>↓</button>
                    <button onClick={() => send(it.id, { action: 'update', id: it.id, active: !it.active })}
                      disabled={!!busy}
                      className="px-3 h-10 rounded-xl border text-sm font-bold disabled:opacity-50"
                      style={it.active
                        ? { borderColor: 'var(--danger)', color: 'var(--danger)' }
                        : { borderColor: 'var(--success)', color: 'var(--success)' }}>
                      {it.active ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
