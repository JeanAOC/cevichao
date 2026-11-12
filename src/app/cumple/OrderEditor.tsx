'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { parseAmount, round2 } from '@/lib/cumple'
import { money } from '@/lib/menu'

interface Props {
  /** 'me': la persona edita su propio pedido. 'manage': el organizador edita o agrega el de alguien. */
  mode: 'me' | 'manage'
  eventId: string
  ivaRate: number
  /** manage: editar un pedido que ya existe */
  orderId?: string
  /** manage: agregar a una persona de la app */
  userId?: string
  /** manage: agregar a un invitado sin cuenta */
  name?: string
  initial?: { attending: boolean; description: string; amount: number; extras_amount: number }
  submitLabel?: string
  onDone?: () => void
}

const inputCls = 'w-full px-4 py-3 min-h-12 rounded-xl text-base'
const inputStyle = { color: 'var(--text)' }

function MoneyInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold block mb-1.5">{label}</span>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }}>$</span>
        <input value={value} onChange={e => onChange(e.target.value)} inputMode="decimal" placeholder="0.00"
          className={`${inputCls} pl-8`} style={inputStyle} />
      </div>
    </label>
  )
}

export default function OrderEditor({ mode, eventId, ivaRate, orderId, userId, name, initial, submitLabel, onDone }: Props) {
  const router = useRouter()
  const [attending, setAttending] = useState(initial?.attending ?? true)
  const [description, setDescription] = useState(initial?.description ?? '')
  const [amount, setAmount] = useState(initial && initial.amount > 0 ? initial.amount.toFixed(2) : '')
  const [extras, setExtras] = useState(initial && initial.extras_amount > 0 ? initial.extras_amount.toFixed(2) : '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const a = parseAmount(amount)
  const e = parseAmount(extras)
  const valid = a !== null && e !== null
  const base = valid ? round2(a + e) : 0
  const iva = round2(base * (ivaRate / 100))

  async function save(ev: React.FormEvent) {
    ev.preventDefault()
    setSaving(true)
    setMessage(null)
    const common = { eventId, attending, description, amount, extrasAmount: extras }
    const res = mode === 'me'
      ? await fetch('/api/cumple/me', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save', ...common }),
        })
      : await fetch('/api/cumple/manage', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'saveOrder', orderId, userId, name, ...common }),
        })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setMessage({ ok: false, text: data.error ?? 'No se pudo guardar' })
      return
    }
    setMessage({ ok: true, text: 'Guardado ✓' })
    router.refresh()
    onDone?.()
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {([[true, 'Voy a pedir'], [false, 'Esta vez no']] as const).map(([val, label]) => (
          <button key={label} type="button" onClick={() => setAttending(val)} aria-pressed={attending === val}
            className="min-h-12 rounded-xl font-bold border-2 transition-colors"
            style={attending === val
              ? { borderColor: 'var(--primary)', background: 'color-mix(in srgb, var(--primary) 12%, var(--card))', color: 'var(--primary)' }
              : { borderColor: 'var(--field-bd)', background: 'var(--card)', color: 'var(--text)' }}>
            {label}
          </button>
        ))}
      </div>

      {attending ? (
        <>
          <label className="block">
            <span className="text-sm font-semibold block mb-1.5">¿Qué vas a pedir?</span>
            <textarea value={description} onChange={ev => setDescription(ev.target.value)} rows={2} maxLength={200} required
              placeholder="Ej. Encebollado de pescado + 1 porción de arroz"
              className={`${inputCls} resize-none`} style={inputStyle} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <MoneyInput label="Valor" value={amount} onChange={setAmount} />
            <MoneyInput label="Bebidas y extras" value={extras} onChange={setExtras} />
          </div>

          {/* Cuenta como ticket */}
          <div className="rounded-xl border-2 border-dashed px-4 py-3 text-sm space-y-1" style={{ background: 'var(--card)', borderColor: 'var(--field-bd)' }}>
            <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>Valor + extras</span><span>{money(base)}</span></div>
            <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>IVA {ivaRate}%</span><span>{money(iva)}</span></div>
            <div className="flex justify-between items-baseline font-extrabold border-t border-dashed pt-2 mt-1" style={{ borderColor: 'var(--field-bd)' }}>
              <span>Tu pedido</span><span className="font-display text-xl" style={{ color: 'var(--accent)' }}>{money(round2(base + iva))}</span>
            </div>
          </div>
        </>
      ) : (
        <p className="text-sm rounded-xl px-4 py-3 border" style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
          No pides esta vez, pero igual pagas tu parte del cumpleañero.
        </p>
      )}

      {message && <p className="text-sm font-semibold" style={{ color: message.ok ? 'var(--success)' : 'var(--danger)' }}>{message.text}</p>}

      <button type="submit" disabled={saving || !valid}
        className="w-full min-h-12 rounded-xl font-bold disabled:opacity-50"
        style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
        {saving ? 'Guardando…' : (submitLabel ?? 'Guardar pedido')}
      </button>
    </form>
  )
}
