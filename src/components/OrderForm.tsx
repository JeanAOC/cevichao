'use client'

import { useEffect, useState } from 'react'
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

const ON_BG = 'color-mix(in srgb, var(--primary) 10%, var(--card))'

/** Fila con cantidad (− n +), pensada para tocar con el dedo: botones de 44 px. */
function QtyRow({ label, price, qty, max, onChange }: {
  label: string; price: number; qty: number; max: number; onChange: (q: number) => void
}) {
  const on = qty > 0
  return (
    <div className="flex items-center justify-between gap-3 pl-4 pr-3 py-3 rounded-2xl border-2 transition-all"
      style={on
        ? { borderColor: 'var(--primary)', background: ON_BG }
        : { borderColor: 'var(--border)', background: 'var(--card)' }}>
      <div className="min-w-0">
        <p className="font-semibold leading-tight" style={{ color: on ? 'var(--primary)' : 'var(--text)' }}>{label}</p>
        <p className="text-sm font-extrabold" style={{ color: 'var(--accent)' }}>
          ${price.toFixed(2)}
          {qty > 1 && <span className="font-semibold" style={{ color: 'var(--muted)' }}> · ${(price * qty).toFixed(2)}</span>}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button type="button" onClick={() => onChange(qty - 1)} disabled={qty === 0}
          aria-label={`Quitar ${label}`}
          className="w-11 h-11 rounded-xl border-2 text-2xl font-bold leading-none flex items-center justify-center transition-opacity disabled:opacity-30 select-none"
          style={{ borderColor: 'var(--field-bd)', color: 'var(--text)', background: 'var(--card)' }}>
          −
        </button>
        <span className="w-8 text-center text-lg font-black tabular-nums" aria-live="polite" style={{ color: on ? 'var(--primary)' : 'var(--muted)' }}>{qty}</span>
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

/** Opción única (proteína, base): tarjeta grande con marca de selección. */
function ChoiceCard({ label, price, selected, plus, onSelect }: {
  label: string; price: number; selected: boolean; plus?: boolean; onSelect: () => void
}) {
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected}
      className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl border-2 transition-all text-left"
      style={selected
        ? { borderColor: 'var(--primary)', background: ON_BG }
        : { borderColor: 'var(--border)', background: 'var(--card)' }}>
      <span className="w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center text-sm font-black"
        style={selected
          ? { background: 'var(--primary)', borderColor: 'var(--primary)', color: 'var(--primary-fg)' }
          : { borderColor: 'var(--field-bd)', color: 'transparent' }} aria-hidden>
        ✓
      </span>
      <span className="flex-1 text-base font-bold" style={{ color: selected ? 'var(--primary)' : 'var(--text)' }}>{label}</span>
      {price > 0
        ? <span className="text-xl font-extrabold font-display" style={{ color: 'var(--accent)' }}>{plus ? '+' : ''}${price.toFixed(2)}</span>
        : <span className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>incluido</span>}
    </button>
  )
}

interface Props {
  existing: Order | null
  menu: MenuData
  adminEdit?: boolean
}

/** Cada nivel de salsa tiene su color (de menos a más picante), con tokens del tema. */
const SAUCE_ACTIVE: Record<SauceAmount, React.CSSProperties> = {
  no: { background: 'var(--text)', color: 'var(--card)', borderColor: 'var(--text)' },
  poco: { background: 'var(--sun)', color: 'var(--sun-fg)', borderColor: 'var(--sun)' },
  medio: { background: 'var(--accent)', color: 'var(--accent-fg)', borderColor: 'var(--accent)' },
  mucho: { background: 'var(--danger)', color: 'var(--danger-fg)', borderColor: 'var(--danger)' },
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

  // Al cambiar de paso se vuelve arriba (en celular, si no, se queda a media pantalla)
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [step])

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
        <p className="text-2xl font-extrabold">¡Pedido guardado!</p>
        <p className="mt-1" style={{ color: 'var(--muted)' }}>Redirigiendo…</p>
      </div>
    )
  }

  // Pasos: 0=Proteína, 1=Maní/Guac, 2=Base, 3=Extras, 4=Bebida, 5=Salsas+Confirmar
  const steps = noFood
    ? ['Proteína']
    : ['Proteína', 'Maní/Guac', 'Base', 'Extras', 'Bebida', 'Salsas']
  const isLast = step === steps.length - 1

  return (
    <div className="space-y-6">
      {/* Progreso: se puede volver tocando un paso ya visto */}
      <ol className="flex gap-1.5" aria-label="Pasos del pedido">
        {steps.map((s, i) => {
          const reachable = i < step
          return (
            <li key={s} className="flex-1">
              <button type="button" disabled={!reachable} onClick={() => setStep(i)}
                aria-current={i === step ? 'step' : undefined}
                className="w-full flex flex-col items-center gap-1 pt-1 disabled:cursor-default">
                <span className="w-full h-2 rounded-full transition-colors"
                  style={{ background: i <= step ? 'var(--primary)' : 'var(--border)' }} />
                <span className="text-xs font-semibold leading-tight text-center" style={{ color: i === step ? 'var(--primary)' : 'var(--muted)' }}>{s}</span>
              </button>
            </li>
          )
        })}
      </ol>

      {/* Paso 0: Proteína */}
      {step === 0 && (
        <div className="space-y-3">
          <h2 className="text-2xl font-extrabold">¿Qué proteína quieres?</h2>
          {proteinOptions.map(p => (
            <ChoiceCard key={p.key} label={p.label} price={p.price} selected={protein === p.key} onSelect={() => setProtein(p.key)} />
          ))}
        </div>
      )}

      {/* Paso 1: Maní / Guacamole (gratis, los pone la señora) */}
      {step === 1 && (
        <div className="space-y-3">
          <div>
            <h2 className="text-2xl font-extrabold">¿Le pone la señora?</h2>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Sin costo adicional</p>
          </div>
          {([
            { label: 'Maní', value: extraMani, set: setExtraMani },
            { label: 'Guacamole', value: extraGuacamole, set: setExtraGuacamole },
          ] as const).map(({ label, value, set }) => (
            <div key={label} className="rounded-2xl border-2 px-4 py-4"
              style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
              <p className="font-bold mb-3">{label}</p>
              <div className="grid grid-cols-2 gap-3" role="group" aria-label={label}>
                <button type="button" onClick={() => set(true)} aria-pressed={value}
                  className="min-h-12 rounded-xl font-bold border-2 transition-all"
                  style={value
                    ? { borderColor: 'var(--success)', background: 'var(--success)', color: 'var(--success-fg)' }
                    : { borderColor: 'var(--field-bd)', background: 'transparent', color: 'var(--text)' }}>
                  Sí
                </button>
                {/* «No» es una elección normal, no un error: va en neutro */}
                <button type="button" onClick={() => set(false)} aria-pressed={!value}
                  className="min-h-12 rounded-xl font-bold border-2 transition-all"
                  style={!value
                    ? { borderColor: 'var(--muted)', background: 'var(--muted)', color: 'var(--card)' }
                    : { borderColor: 'var(--field-bd)', background: 'transparent', color: 'var(--text)' }}>
                  No
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paso 2: Base */}
      {step === 2 && (
        <div className="space-y-3">
          <h2 className="text-2xl font-extrabold">¿Con qué base?</h2>
          {baseOptions.map(b => (
            <ChoiceCard key={b.key} label={b.label} price={b.price} plus selected={base === b.key} onSelect={() => setBase(b.key)} />
          ))}
        </div>
      )}

      {/* Paso 3: Extras */}
      {step === 3 && (
        <div className="space-y-3">
          <div>
            <h2 className="text-2xl font-extrabold">¿Extras?</h2>
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
              {totalExtras} extra{totalExtras !== 1 ? 's' : ''} · <span style={{ color: 'var(--accent)' }}>${extrasSubtotal.toFixed(2)}</span>
            </p>
          )}
        </div>
      )}

      {/* Paso 4: Bebida */}
      {step === 4 && (
        <div className="space-y-3">
          <div>
            <h2 className="text-2xl font-extrabold">¿Bebidas?</h2>
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
              {totalBebidas} bebida{totalBebidas !== 1 ? 's' : ''} · <span style={{ color: 'var(--accent)' }}>${bebidasSubtotal.toFixed(2)}</span>
            </p>
          )}
        </div>
      )}

      {/* Paso 5: Salsas + resumen */}
      {step === 5 && (
        <div className="space-y-5">
          <h2 className="text-2xl font-extrabold">Salsas <span className="text-base font-normal" style={{ color: 'var(--muted)' }}>(gratis)</span></h2>
          {SAUCES.map(({ key, label }) => (
            <div key={key}>
              <p className="text-sm font-bold mb-2">{label}</p>
              <div className="grid grid-cols-4 gap-2" role="group" aria-label={label}>
                {SAUCE_AMOUNTS.map(amt => {
                  const active = sauces[key] === amt
                  return (
                    <button key={amt} type="button"
                      onClick={() => setSauces(s => ({ ...s, [key]: amt }))}
                      aria-pressed={active}
                      className="min-h-11 rounded-xl text-sm font-bold transition-all border-2"
                      style={active
                        ? SAUCE_ACTIVE[amt]
                        : { borderColor: 'var(--field-bd)', background: 'var(--card)', color: 'var(--text)' }}>
                      {SAUCE_AMOUNT_LABELS[amt]}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          <div>
            <label htmlFor="comentarios" className="text-sm font-bold block mb-2">Comentarios</label>
            <textarea
              id="comentarios"
              value={comentarios}
              onChange={e => setComentarios(e.target.value)}
              placeholder="Sin pepas, extra limón…"
              rows={2}
              className="w-full px-4 py-3 rounded-xl text-sm resize-none"
            />
          </div>

          {/* Resumen: como un ticket */}
          <div className="rounded-2xl p-4 border-2 border-dashed" style={{ background: 'var(--card)', borderColor: 'var(--field-bd)' }}>
            <h3 className="font-bold text-sm mb-2 tracking-wide" style={{ color: 'var(--muted)' }}>TU PEDIDO</h3>
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
              <div className="border-t border-dashed pt-2 mt-2 flex justify-between font-display font-extrabold text-xl" style={{ borderColor: 'var(--field-bd)', color: 'var(--primary)' }}>
                <span>Total</span><span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {error && (
            <div role="alert" className="px-4 py-3 rounded-xl text-sm font-medium" style={{ background: 'color-mix(in srgb, var(--danger) 12%, var(--card))', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
              Error: {error}
            </div>
          )}
        </div>
      )}

      {/* En celular, la barra queda fija arriba de la navegación: el total siempre se ve y «Siguiente» siempre está a mano */}
      <div className="h-28 sm:hidden" aria-hidden />
      <div className={`fixed inset-x-0 z-30 px-3 sm:static sm:px-0 sm:mt-2 bottom-[calc(3.5rem+env(safe-area-inset-bottom))]`}>
        <div className="mx-auto max-w-4xl flex items-center gap-3 rounded-2xl border p-2.5 pl-3 shadow-card"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)} aria-label="Paso anterior"
              className="w-12 h-12 shrink-0 rounded-xl border-2 text-xl font-bold flex items-center justify-center"
              style={{ borderColor: 'var(--field-bd)', color: 'var(--text)' }}>
              ←
            </button>
          )}
          <div className="flex-1 min-w-0 leading-tight">
            <p className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>Tu pedido</p>
            <p className="font-display text-2xl font-extrabold tabular-nums" style={{ color: 'var(--primary)' }}>${total.toFixed(2)}</p>
          </div>
          <button type="button" onClick={isLast ? save : () => setStep(step + 1)} disabled={saving}
            className="min-h-12 px-6 rounded-xl font-bold text-base shrink-0 transition-opacity disabled:opacity-60"
            style={isLast
              ? { background: 'var(--success)', color: 'var(--success-fg)' }
              : { background: 'var(--primary)', color: 'var(--primary-fg)' }}>
            {isLast ? (saving ? 'Guardando…' : existing ? '✓ Actualizar' : '✓ Confirmar') : 'Siguiente →'}
          </button>
        </div>
      </div>
    </div>
  )
}
