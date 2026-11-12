'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  SAUCE_AMOUNTS, SAUCE_AMOUNT_LABELS,
  MAX_EXTRA_QTY, MAX_BEBIDA_QTY, extrasOf, bebidasOf,
  calculateTotal,
  type Protein, type Base, type SauceAmount, type BebidaCounts, type ExtraCounts, type OrderInput,
} from '@/lib/pricing'
import { findItem, itemsOf, labelOf, priceOf, type MenuData, type MenuItem, type MenuKind } from '@/lib/menu'
import type { Order } from '@/types'

const SAUCES: { key: keyof Pick<OrderInput, 'sauce_tomate' | 'sauce_limon' | 'sauce_mostaza' | 'sauce_aji'>; label: string }[] = [
  { key: 'sauce_tomate', label: 'Tomate' },
  { key: 'sauce_limon', label: 'Limón' },
  { key: 'sauce_mostaza', label: 'Mostaza' },
  { key: 'sauce_aji', label: 'Ají' },
]

/** Fila con cantidad (− n +), pensada para tocar con el dedo: botones de 44 px. */
function QtyRow({ label, price, qty, max, onChange }: {
  label: string; price: number; qty: number; max: number; onChange: (q: number) => void
}) {
  const on = qty > 0
  return (
    <div className="flex items-center justify-between gap-3 pl-4 pr-3 py-3 rounded-2xl border-2 transition-all"
      style={on
        ? { borderColor: 'var(--primary)', background: 'color-mix(in srgb, var(--primary) 8%, transparent)' }
        : { borderColor: 'var(--border)', background: 'var(--card)' }}>
      <div className="min-w-0">
        <p className="font-semibold leading-tight" style={{ color: on ? 'var(--primary)' : 'var(--text)' }}>{label}</p>
        <p className="text-sm font-black" style={{ color: 'var(--success)' }}>
          ${price.toFixed(2)}
          {qty > 1 && <span className="font-semibold" style={{ color: 'var(--muted)' }}> · ${(price * qty).toFixed(2)}</span>}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button type="button" onClick={() => onChange(qty - 1)} disabled={qty === 0}
          aria-label={`Quitar ${label}`}
          className="w-11 h-11 rounded-xl border-2 text-2xl font-bold leading-none flex items-center justify-center transition-opacity disabled:opacity-30 select-none"
          style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--card)' }}>
          −
        </button>
        <span className="w-8 text-center text-lg font-black tabular-nums" style={{ color: on ? 'var(--primary)' : 'var(--muted)' }}>{qty}</span>
        <button type="button" onClick={() => onChange(qty + 1)} disabled={qty >= max}
          aria-label={`Agregar ${label}`}
          className="w-11 h-11 rounded-xl text-2xl font-bold leading-none flex items-center justify-center transition-opacity disabled:opacity-30 select-none"
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
          +
        </button>
      </div>
    </div>
  )
}

interface Props {
  existing: Order | null
  menu: MenuData
  adminEdit?: boolean
}

const AMOUNT_COLORS: Record<SauceAmount, string> = {
  no: '',
  poco: 'bg-yellow-400 text-black',
  medio: 'bg-orange-500 text-white',
  mucho: 'bg-red-600 text-white',
}

export default function OrderForm({ existing, menu, adminEdit }: Props) {
  const router = useRouter()

  // Los usuarios solo ven items activos del menú; el admin además conserva los ocultos que ya tenga el pedido
  const usable = (kind: MenuKind, key: string) => {
    const it = findItem(menu, kind, key)
    return !!it && (it.active || !!adminEdit)
  }
  const optionsFor = (kind: MenuKind, current: string[]): MenuItem[] => {
    const hidden = current
      .map(k => findItem(menu, kind, k))
      .filter((i): i is MenuItem => !!i && !i.active && !!adminEdit)
    return [...itemsOf(menu, kind), ...hidden]
  }
  const keepUsable = (kind: MenuKind, entries: [string, number][]) =>
    Object.fromEntries(entries.filter(([k]) => usable(kind, k)))

  const [step, setStep] = useState(0)
  const [protein, setProtein] = useState<Protein>(
    existing && existing.protein !== 'no_por_hoy' && usable('protein', existing.protein)
      ? existing.protein : (itemsOf(menu, 'protein')[0]?.key ?? ''))
  const [base, setBase] = useState<Base>(
    existing && existing.base !== 'no_gracias' && usable('base', existing.base)
      ? existing.base : (itemsOf(menu, 'base')[0]?.key ?? ''))
  const [extraMani, setExtraMani] = useState(existing?.extra_mani ?? false)
  const [extraGuacamole, setExtraGuacamole] = useState(existing?.extra_guacamole ?? false)
  const [extras, setExtras] = useState<ExtraCounts>(() => existing ? keepUsable('extra', extrasOf(existing)) : {})
  const [bebidas, setBebidas] = useState<BebidaCounts>(() => existing ? keepUsable('bebida', bebidasOf(existing)) : {})
  const [sauces, setSauces] = useState<Record<string, SauceAmount>>({
    sauce_tomate: existing?.sauce_tomate ?? 'no',
    sauce_limon: existing?.sauce_limon ?? 'no',
    sauce_mostaza: existing?.sauce_mostaza ?? 'no',
    sauce_aji: existing?.sauce_aji ?? 'no',
  })
  const [comentarios, setComentarios] = useState(existing?.comentarios ?? '')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const noFood = protein === 'no_por_hoy'
  const total = calculateTotal(menu, { protein, base, extras, bebidas })

  const proteinOptions = optionsFor('protein', [protein])
  const baseOptions = optionsFor('base', [base])
  const extraOptions = optionsFor('extra', Object.keys(extras))
  const bebidaOptions = optionsFor('bebida', Object.keys(bebidas))

  const sum = (counts: Record<string, number>) => Object.values(counts).reduce((s, n) => s + n, 0)
  const subtotal = (kind: MenuKind, counts: Record<string, number>) =>
    Object.entries(counts).reduce((s, [k, n]) => s + priceOf(menu, kind, k) * n, 0)
  const totalExtras = sum(extras)
  const extrasSubtotal = subtotal('extra', extras)
  const totalBebidas = sum(bebidas)
  const bebidasSubtotal = subtotal('bebida', bebidas)

  function setBebidaQty(b: string, qty: number) {
    const q = Math.max(0, Math.min(MAX_BEBIDA_QTY, qty))
    setBebidas(prev => ({ ...prev, [b]: q }))
  }

  function setExtraQty(k: string, qty: number) {
    const q = Math.max(0, Math.min(MAX_EXTRA_QTY, qty))
    setExtras(prev => ({ ...prev, [k]: q }))
  }

  async function save() {
    setSaving(true)
    setError(null)
    const payload = {
      protein,
      base: noFood ? 'no_gracias' as Base : base,
      extra_mani: noFood ? false : extraMani,
      extra_guacamole: noFood ? false : extraGuacamole,
      extras: noFood ? {} : extras,
      bebidas: noFood ? {} : bebidas,
      sauce_tomate: (noFood ? 'no' : sauces.sauce_tomate) as SauceAmount,
      sauce_limon: (noFood ? 'no' : sauces.sauce_limon) as SauceAmount,
      sauce_mostaza: (noFood ? 'no' : sauces.sauce_mostaza) as SauceAmount,
      sauce_aji: (noFood ? 'no' : sauces.sauce_aji) as SauceAmount,
      comentarios: noFood ? '' : comentarios,
      total,
    }

    let saveError: string | null = null

    // El servidor valida y recalcula el total; user_id y fecha no se envían
    const useAdmin = adminEdit && existing
    const res = await fetch(useAdmin ? '/api/admin/update-order' : '/api/orders/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(useAdmin ? { orderId: existing.id, payload } : payload),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      saveError = data.error ?? 'Error al guardar'
    }

    setSaving(false)
    if (saveError) {
      setError(saveError)
      return
    }
    setDone(true)
    const redirect = adminEdit ? '/admin' : '/mi-pedido'
    setTimeout(() => { router.push(redirect); router.refresh() }, 1200)
  }

  if (done) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">✅</div>
        <p className="text-xl font-black">¡Pedido guardado!</p>
        <p className="mt-1" style={{ color: 'var(--muted)' }}>Redirigiendo…</p>
      </div>
    )
  }

  // Steps: 0=Proteína, 1=Maní/Guac, 2=Base, 3=Extras, 4=Bebida, 5=Salsas+Confirmar
  const steps = noFood
    ? ['Proteína']
    : ['Proteína', 'Maní & Guac', 'Base', 'Extras', 'Bebida', 'Salsas & Confirmar']

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full h-1.5 rounded-full transition-colors"
              style={{ background: i <= step ? 'var(--primary)' : 'var(--border)' }} />
            <span className="text-[10px] font-medium" style={{ color: i === step ? 'var(--primary)' : 'var(--muted)' }}>{s}</span>
          </div>
        ))}
      </div>

      {/* Step 0: Proteína */}
      {step === 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold">¿Qué proteína quieres?</h2>
          {proteinOptions.map(p => (
            <button key={p.key} onClick={() => setProtein(p.key)}
              className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all font-semibold"
              style={protein === p.key
                ? { borderColor: 'var(--primary)', background: 'color-mix(in srgb, var(--primary) 8%, transparent)', color: 'var(--primary)' }
                : { borderColor: 'var(--border)', background: 'var(--card)', color: 'var(--text)' }}>
              <span className="text-base">{p.label}</span>
              {p.price > 0
                ? <span className="text-xl font-black" style={{ color: protein === p.key ? 'var(--primary)' : 'var(--success)' }}>${p.price.toFixed(2)}</span>
                : <span className="text-sm" style={{ color: 'var(--muted)' }}>—</span>
              }
            </button>
          ))}
          <button onClick={() => noFood ? save() : setStep(1)}
            className="w-full py-3.5 rounded-2xl font-bold text-base mt-2 transition-opacity disabled:opacity-60"
            style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
            disabled={saving}>
            {noFood ? (saving ? 'Guardando…' : 'Confirmar') : 'Siguiente →'}
          </button>
        </div>
      )}

      {/* Step 1: Maní / Guacamole (gratis, los pone la señora) */}
      {step === 1 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold">¿Le pone la señora?</h2>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Sin costo adicional</p>
          {([
            { label: 'Maní', value: extraMani, set: setExtraMani },
            { label: 'Guacamole', value: extraGuacamole, set: setExtraGuacamole },
          ] as const).map(({ label, value, set }) => (
            <div key={label} className="rounded-2xl border-2 px-5 py-4 transition-all"
              style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
              <p className="font-semibold mb-3">{label}</p>
              <div className="flex gap-3">
                <button onClick={() => set(true)}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all border-2"
                  style={value
                    ? { borderColor: 'var(--accent)', background: 'var(--accent)', color: 'white' }
                    : { borderColor: 'var(--border)', background: 'transparent', color: 'var(--muted)' }}>
                  Sí
                </button>
                <button onClick={() => set(false)}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all border-2"
                  style={!value
                    ? { borderColor: 'var(--danger)', background: 'var(--danger)', color: 'white' }
                    : { borderColor: 'var(--border)', background: 'transparent', color: 'var(--muted)' }}>
                  No
                </button>
              </div>
            </div>
          ))}
          <div className="flex gap-3">
            <button onClick={() => setStep(0)} className="flex-1 py-3 rounded-2xl font-bold border" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>← Atrás</button>
            <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-2xl font-bold" style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>Siguiente →</button>
          </div>
        </div>
      )}

      {/* Step 2: Base */}
      {step === 2 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold">¿Con qué base?</h2>
          {baseOptions.map(b => (
            <button key={b.key} onClick={() => setBase(b.key)}
              className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all font-semibold text-left"
              style={base === b.key
                ? { borderColor: 'var(--primary)', background: 'color-mix(in srgb, var(--primary) 8%, transparent)', color: 'var(--primary)' }
                : { borderColor: 'var(--border)', background: 'var(--card)', color: 'var(--text)' }}>
              <span>{b.label}</span>
              {b.price > 0 && (
                <span className="font-black" style={{ color: base === b.key ? 'var(--primary)' : 'var(--success)' }}>+${b.price.toFixed(2)}</span>
              )}
            </button>
          ))}
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-2xl font-bold border" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>← Atrás</button>
            <button onClick={() => setStep(3)} className="flex-1 py-3 rounded-2xl font-bold" style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>Siguiente →</button>
          </div>
        </div>
      )}

      {/* Step 3: Extras */}
      {step === 3 && (
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-bold">¿Extras?</h2>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Elige cuántos quieres de cada uno. Si no quieres, sigue.</p>
          </div>
          {extraOptions.length === 0 && (
            <p className="text-sm py-4 text-center" style={{ color: 'var(--muted)' }}>Hoy no hay extras disponibles.</p>
          )}
          {extraOptions.map(x => (
            <QtyRow key={x.key} label={x.label} price={x.price}
              qty={extras[x.key] ?? 0} max={MAX_EXTRA_QTY} onChange={q => setExtraQty(x.key, q)} />
          ))}
          {totalExtras > 0 && (
            <p className="text-right text-sm font-bold" style={{ color: 'var(--muted)' }}>
              {totalExtras} extra{totalExtras !== 1 ? 's' : ''} · <span style={{ color: 'var(--success)' }}>${extrasSubtotal.toFixed(2)}</span>
            </p>
          )}
          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-2xl font-bold border" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>← Atrás</button>
            <button onClick={() => setStep(4)} className="flex-1 py-3 rounded-2xl font-bold" style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>Siguiente →</button>
          </div>
        </div>
      )}

      {/* Step 4: Bebida */}
      {step === 4 && (
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-bold">¿Bebidas?</h2>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Puedes elegir varias. Si no quieres, sigue.</p>
          </div>
          {bebidaOptions.length === 0 && (
            <p className="text-sm py-4 text-center" style={{ color: 'var(--muted)' }}>Hoy no hay bebidas disponibles.</p>
          )}
          {bebidaOptions.map(b => (
            <QtyRow key={b.key} label={b.label} price={b.price}
              qty={bebidas[b.key] ?? 0} max={MAX_BEBIDA_QTY} onChange={q => setBebidaQty(b.key, q)} />
          ))}
          {totalBebidas > 0 && (
            <p className="text-right text-sm font-bold" style={{ color: 'var(--muted)' }}>
              {totalBebidas} bebida{totalBebidas !== 1 ? 's' : ''} · <span style={{ color: 'var(--success)' }}>${bebidasSubtotal.toFixed(2)}</span>
            </p>
          )}
          <div className="flex gap-3">
            <button onClick={() => setStep(3)} className="flex-1 py-3 rounded-2xl font-bold border" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>← Atrás</button>
            <button onClick={() => setStep(5)} className="flex-1 py-3 rounded-2xl font-bold" style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>Siguiente →</button>
          </div>
        </div>
      )}

      {/* Step 5: Salsas + Confirmar */}
      {step === 5 && (
        <div className="space-y-5">
          <h2 className="text-lg font-bold">Salsas <span className="text-sm font-normal" style={{ color: 'var(--muted)' }}>(gratis)</span></h2>
          {SAUCES.map(({ key, label }) => (
            <div key={key}>
              <p className="text-sm font-semibold mb-2">{label}</p>
              <div className="flex gap-2">
                {SAUCE_AMOUNTS.map(amt => {
                  const active = sauces[key] === amt
                  const colorCls = active && amt !== 'no' ? AMOUNT_COLORS[amt] : ''
                  return (
                    <button key={amt}
                      onClick={() => setSauces(s => ({ ...s, [key]: amt }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all border-2 ${colorCls}`}
                      style={active
                        ? amt === 'no'
                          ? { borderColor: 'transparent', background: 'var(--border)', color: 'var(--muted)' }
                          : { borderColor: 'transparent' }
                        : { borderColor: 'var(--border)', background: 'var(--card)', color: 'var(--muted)' }
                      }>
                      {SAUCE_AMOUNT_LABELS[amt]}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          <div>
            <label className="text-sm font-semibold block mb-2">Comentarios</label>
            <textarea
              value={comentarios}
              onChange={e => setComentarios(e.target.value)}
              placeholder="Sin pepas, extra limón…"
              rows={2}
              className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          </div>

          {/* Resumen */}
          <div className="rounded-2xl p-4 border" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
            <h3 className="font-bold text-sm mb-2" style={{ color: 'var(--muted)' }}>RESUMEN</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>{labelOf(menu, 'protein', protein)}</span><span>${priceOf(menu, 'protein', protein).toFixed(2)}</span></div>
              {priceOf(menu, 'base', base) > 0 && <div className="flex justify-between" style={{ color: 'var(--muted)' }}><span>+ {labelOf(menu, 'base', base)}</span><span>${priceOf(menu, 'base', base).toFixed(2)}</span></div>}
              {extraMani && <div className="flex justify-between" style={{ color: 'var(--muted)' }}><span>+ Maní</span><span>gratis</span></div>}
              {extraGuacamole && <div className="flex justify-between" style={{ color: 'var(--muted)' }}><span>+ Guacamole</span><span>gratis</span></div>}
              {Object.entries(extras).filter(([, n]) => n > 0).map(([k, n]) => (
                <div key={k} className="flex justify-between" style={{ color: 'var(--muted)' }}>
                  <span>+ {n} × {labelOf(menu, 'extra', k)}</span><span>${(priceOf(menu, 'extra', k) * n).toFixed(2)}</span>
                </div>
              ))}
              {Object.entries(bebidas).filter(([, n]) => n > 0).map(([k, n]) => (
                <div key={k} className="flex justify-between" style={{ color: 'var(--muted)' }}>
                  <span>+ {n} × {labelOf(menu, 'bebida', k)}</span><span>${(priceOf(menu, 'bebida', k) * n).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 flex justify-between font-black text-lg" style={{ borderColor: 'var(--border)', color: 'var(--success)' }}>
                <span>Total</span><span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl text-sm font-medium" style={{ background: 'color-mix(in srgb, var(--danger) 12%, transparent)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
              Error: {error}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(4)} className="flex-1 py-3 rounded-2xl font-bold border" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>← Atrás</button>
            <button onClick={save} disabled={saving}
              className="flex-1 py-3 rounded-2xl font-bold transition-opacity disabled:opacity-60"
              style={{ background: 'var(--success)', color: 'white' }}>
              {saving ? 'Guardando…' : existing ? '✓ Actualizar' : '✓ Confirmar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
