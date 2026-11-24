'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ActionButton from '@/components/ActionButton'
import { money } from '@/lib/menu'

export interface SodaData { id?: string; label: string; price: number; drinkers: string[] }
export interface Person { id: string; name: string }

/**
 * Una gaseosa compartida: nombre, precio y quiénes la toman (solo entre quienes pidieron).
 * El precio se reparte en partes iguales entre los marcados; los demás no pagan nada.
 * `soda` sin id = formulario para agregar una nueva.
 */
export default function SodaEditor({ eventId, soda, people, ivaRate }: {
  eventId: string; soda?: SodaData; people: Person[]; ivaRate: number
}) {
  const router = useRouter()
  const [label, setLabel] = useState(soda?.label ?? '')
  const [price, setPrice] = useState(soda ? soda.price.toFixed(2) : '')
  const [drinkers, setDrinkers] = useState<Set<string>>(new Set(soda?.drinkers ?? []))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const n = people.filter(p => drinkers.has(p.id)).length
  const priceNum = Number(price.replace(',', '.'))
  const each = n > 0 && Number.isFinite(priceNum) && priceNum > 0 ? priceNum / n : 0

  const toggle = (id: string) => setDrinkers(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  async function save() {
    setSaving(true)
    setMessage(null)
    const res = await fetch('/api/cumple/manage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'saveSoda', eventId,
        soda: { id: soda?.id, label, price, drinkers: people.filter(p => drinkers.has(p.id)).map(p => p.id) },
      }),
    })
    setSaving(false)
    if (!res.ok) { setMessage({ ok: false, text: (await res.json().catch(() => ({}))).error ?? 'No se pudo guardar' }); return }
    setMessage({ ok: true, text: 'Guardado ✓' })
    if (!soda?.id) { setLabel(''); setPrice(''); setDrinkers(new Set()) } // formulario de nueva: queda listo para otra
    router.refresh()
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_7rem] gap-2">
        <input value={label} onChange={e => setLabel(e.target.value)} maxLength={40} aria-label="Nombre de la gaseosa"
          placeholder="Ej. Coca-Cola 3 L" className="px-3 min-h-11 rounded-xl text-sm" />
        <input value={price} onChange={e => setPrice(e.target.value)} inputMode="decimal" aria-label="Precio de la gaseosa"
          placeholder="Precio" className="px-3 min-h-11 rounded-xl text-sm" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-sm font-semibold">¿Quiénes toman? <span style={{ color: 'var(--muted)' }}>({n} de {people.length})</span></p>
          <div className="flex gap-2 text-xs font-bold">
            <button type="button" onClick={() => setDrinkers(new Set(people.map(p => p.id)))} className="underline" style={{ color: 'var(--primary)' }}>Todos</button>
            <button type="button" onClick={() => setDrinkers(new Set())} className="underline" style={{ color: 'var(--muted)' }}>Ninguno</button>
          </div>
        </div>
        {people.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Todavía nadie pidió: solo pueden tomar quienes pidieron.</p>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-1.5">
            {people.map(p => (
              <li key={p.id}>
                <label className="flex items-center gap-2.5 min-h-11 px-3 rounded-xl border cursor-pointer"
                  style={drinkers.has(p.id)
                    ? { borderColor: 'var(--primary)', background: 'color-mix(in srgb, var(--primary) 8%, var(--card))' }
                    : { borderColor: 'var(--border)', background: 'var(--card)' }}>
                  <input type="checkbox" checked={drinkers.has(p.id)} onChange={() => toggle(p.id)} className="w-5 h-5 accent-[var(--primary)]" />
                  <span className="text-sm font-semibold truncate">{p.name}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      {each > 0 && (
        <p className="text-sm">
          Cada uno paga <span className="font-black" style={{ color: 'var(--accent)' }}>{money(each * (1 + ivaRate / 100))}</span>
          <span style={{ color: 'var(--muted)' }}> (con IVA {ivaRate}%)</span>
        </p>
      )}
      {message && <p className="text-sm font-semibold" style={{ color: message.ok ? 'var(--success)' : 'var(--danger)' }}>{message.text}</p>}

      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={saving}
          className="flex-1 min-h-11 rounded-xl font-bold text-sm disabled:opacity-50"
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
          {saving ? 'Guardando…' : soda?.id ? 'Guardar cambios' : 'Agregar gaseosa'}
        </button>
        {soda?.id && (
          <ActionButton endpoint="/api/cumple/manage" body={{ action: 'deleteSoda', eventId, sodaId: soda.id }} variant="danger" confirmText="Sí, quitar">
            Quitar
          </ActionButton>
        )}
      </div>
    </div>
  )
}
