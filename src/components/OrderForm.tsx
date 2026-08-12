'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  PROTEIN_PRICES, PROTEIN_LABELS, BASE_LABELS,
  SAUCE_AMOUNTS, SAUCE_AMOUNT_LABELS,
  EXTRA_PRICES, EXTRA_LABELS,
  BEBIDAS, BEBIDA_PRICES, BEBIDA_LABELS,
  calculateTotal,
  type Protein, type Base, type SauceAmount, type Bebida, type OrderInput,
} from '@/lib/pricing'
import type { Order } from '@/types'

const PROTEINS: Protein[] = ['pescado', 'mixto', 'camaron', 'no_por_hoy']
const BASES: Base[] = ['chifles', 'doritos_verdes', 'jalapeños', 'patacones', 'no_gracias']
const SAUCES: { key: keyof Pick<OrderInput, 'sauce_tomate' | 'sauce_limon' | 'sauce_mostaza' | 'sauce_aji'>; label: string }[] = [
  { key: 'sauce_tomate', label: 'Tomate' },
  { key: 'sauce_limon', label: 'Limón' },
  { key: 'sauce_mostaza', label: 'Mostaza' },
  { key: 'sauce_aji', label: 'Ají' },
]

const EXTRAS: { key: string; field: 'extraSalPrieta' | 'extraManiQuebrado' | 'extraCocolon' | 'extraToston' }[] = [
  { key: 'extra_sal_prieta', field: 'extraSalPrieta' },
  { key: 'extra_mani_quebrado', field: 'extraManiQuebrado' },
  { key: 'extra_cocolon', field: 'extraCocolon' },
  { key: 'extra_toston', field: 'extraToston' },
]

interface Props {
  existing: Order | null
  userId: string
  orderDate: string
  adminEdit?: boolean
}

const AMOUNT_COLORS: Record<SauceAmount, string> = {
  no: '',
  poco: 'bg-yellow-400 text-black',
  medio: 'bg-orange-500 text-white',
  mucho: 'bg-red-600 text-white',
}

export default function OrderForm({ existing, userId, orderDate, adminEdit }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(0)
  const [protein, setProtein] = useState<Protein>(existing?.protein ?? 'pescado')
  const [base, setBase] = useState<Base>(existing?.base ?? 'chifles')
  const [extraMani, setExtraMani] = useState(existing?.extra_mani ?? false)
  const [extraGuacamole, setExtraGuacamole] = useState(existing?.extra_guacamole ?? false)
  const [extraSalPrieta, setExtraSalPrieta] = useState(existing?.extra_sal_prieta ?? false)
  const [extraManiQuebrado, setExtraManiQuebrado] = useState(existing?.extra_mani_quebrado ?? false)
  const [extraCocolon, setExtraCocolon] = useState(existing?.extra_cocolon ?? false)
  const [extraToston, setExtraToston] = useState(existing?.extra_toston ?? false)
  const [bebida, setBebida] = useState<Bebida>(existing?.bebida ?? 'ninguna')
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
  const total = calculateTotal({ protein, extra_sal_prieta: extraSalPrieta, extra_mani_quebrado: extraManiQuebrado, extra_cocolon: extraCocolon, extra_toston: extraToston, bebida })

  const extraValues: Record<string, boolean> = {
    extraSalPrieta, extraManiQuebrado, extraCocolon, extraToston,
  }
  const extraSetters: Record<string, (v: boolean) => void> = {
    extraSalPrieta: setExtraSalPrieta,
    extraManiQuebrado: setExtraManiQuebrado,
    extraCocolon: setExtraCocolon,
    extraToston: setExtraToston,
  }

  async function save() {
    setSaving(true)
    setError(null)
    const payload = {
      user_id: userId,
      order_date: orderDate,
      protein,
      base: noFood ? 'no_gracias' as Base : base,
      extra_mani: noFood ? false : extraMani,
      extra_guacamole: noFood ? false : extraGuacamole,
      extra_sal_prieta: noFood ? false : extraSalPrieta,
      extra_mani_quebrado: noFood ? false : extraManiQuebrado,
      extra_cocolon: noFood ? false : extraCocolon,
      extra_toston: noFood ? false : extraToston,
      bebida: noFood ? 'ninguna' : bebida,
      sauce_tomate: (noFood ? 'no' : sauces.sauce_tomate) as SauceAmount,
      sauce_limon: (noFood ? 'no' : sauces.sauce_limon) as SauceAmount,
      sauce_mostaza: (noFood ? 'no' : sauces.sauce_mostaza) as SauceAmount,
      sauce_aji: (noFood ? 'no' : sauces.sauce_aji) as SauceAmount,
      comentarios: noFood ? '' : comentarios,
      total,
    }

    let saveError: string | null = null

    if (adminEdit && existing) {
      const res = await fetch('/api/admin/update-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: existing.id, payload }),
      })
      if (!res.ok) {
        const data = await res.json()
        saveError = data.error ?? 'Error al guardar'
      }
    } else {
      const { error: dbError } = existing
        ? await supabase.from('orders').update(payload).eq('id', existing.id)
        : await supabase.from('orders').insert(payload)
      if (dbError) saveError = dbError.message
    }

    setSaving(false)
    if (saveError) {
      setError(saveError)
      return
    }
    setDone(true)
    const redirect = adminEdit ? '/admin' : '/dashboard'
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
          {PROTEINS.map(p => (
            <button key={p} onClick={() => setProtein(p)}
              className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all font-semibold"
              style={protein === p
                ? { borderColor: 'var(--primary)', background: 'color-mix(in srgb, var(--primary) 8%, transparent)', color: 'var(--primary)' }
                : { borderColor: 'var(--border)', background: 'var(--card)', color: 'var(--text)' }}>
              <span className="text-base">{PROTEIN_LABELS[p]}</span>
              {PROTEIN_PRICES[p] > 0
                ? <span className="text-xl font-black" style={{ color: protein === p ? 'var(--primary)' : 'var(--success)' }}>${PROTEIN_PRICES[p].toFixed(2)}</span>
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
          {BASES.map(b => (
            <button key={b} onClick={() => setBase(b)}
              className="w-full px-5 py-4 rounded-2xl border-2 transition-all font-semibold text-left"
              style={base === b
                ? { borderColor: 'var(--primary)', background: 'color-mix(in srgb, var(--primary) 8%, transparent)', color: 'var(--primary)' }
                : { borderColor: 'var(--border)', background: 'var(--card)', color: 'var(--text)' }}>
              {BASE_LABELS[b]}
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
          <h2 className="text-lg font-bold">¿Extras?</h2>
          {EXTRAS.map(({ key, field }) => {
            const value = extraValues[field]
            const set = extraSetters[field]
            const price = EXTRA_PRICES[key]
            return (
              <button key={key} onClick={() => set(!value)}
                className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all"
                style={value
                  ? { borderColor: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 8%, transparent)' }
                  : { borderColor: 'var(--border)', background: 'var(--card)' }}>
                <span className="font-semibold">{EXTRA_LABELS[key]}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold" style={{ color: 'var(--success)' }}>${price.toFixed(2)}</span>
                  <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors"
                    style={value ? { borderColor: 'var(--accent)', background: 'var(--accent)' } : { borderColor: 'var(--border)' }}>
                    {value && <span className="text-white text-xs font-bold">✓</span>}
                  </div>
                </div>
              </button>
            )
          })}
          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-2xl font-bold border" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>← Atrás</button>
            <button onClick={() => setStep(4)} className="flex-1 py-3 rounded-2xl font-bold" style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>Siguiente →</button>
          </div>
        </div>
      )}

      {/* Step 4: Bebida */}
      {step === 4 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold">¿Bebida?</h2>
          {BEBIDAS.map(b => (
            <button key={b} onClick={() => setBebida(b)}
              className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all font-semibold"
              style={bebida === b
                ? { borderColor: 'var(--primary)', background: 'color-mix(in srgb, var(--primary) 8%, transparent)', color: 'var(--primary)' }
                : { borderColor: 'var(--border)', background: 'var(--card)', color: 'var(--text)' }}>
              <span>{BEBIDA_LABELS[b]}</span>
              {BEBIDA_PRICES[b] > 0
                ? <span className="font-black" style={{ color: bebida === b ? 'var(--primary)' : 'var(--success)' }}>${BEBIDA_PRICES[b].toFixed(2)}</span>
                : <span className="text-sm" style={{ color: 'var(--muted)' }}>—</span>
              }
            </button>
          ))}
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
              <div className="flex justify-between"><span>{PROTEIN_LABELS[protein]}</span><span>${PROTEIN_PRICES[protein].toFixed(2)}</span></div>
              {extraMani && <div className="flex justify-between" style={{ color: 'var(--muted)' }}><span>+ Maní</span><span>gratis</span></div>}
              {extraGuacamole && <div className="flex justify-between" style={{ color: 'var(--muted)' }}><span>+ Guacamole</span><span>gratis</span></div>}
              {extraSalPrieta && <div className="flex justify-between" style={{ color: 'var(--muted)' }}><span>+ Salprieta</span><span>$1.00</span></div>}
              {extraManiQuebrado && <div className="flex justify-between" style={{ color: 'var(--muted)' }}><span>+ Maní Quebrado</span><span>$1.00</span></div>}
              {extraCocolon && <div className="flex justify-between" style={{ color: 'var(--muted)' }}><span>+ Cocolón</span><span>$1.00</span></div>}
              {extraToston && <div className="flex justify-between" style={{ color: 'var(--muted)' }}><span>+ Tostón</span><span>$1.50</span></div>}
              {bebida !== 'ninguna' && <div className="flex justify-between" style={{ color: 'var(--muted)' }}><span>+ {BEBIDA_LABELS[bebida]}</span><span>${BEBIDA_PRICES[bebida].toFixed(2)}</span></div>}
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
