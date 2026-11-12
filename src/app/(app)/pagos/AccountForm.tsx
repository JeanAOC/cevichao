'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ACCOUNT_TYPES, EC_BANKS, OTHER_BANK, emptyAccount, type PaymentAccount } from '@/lib/payment'

const inputStyle = { background: 'var(--bg)', border: '1.5px solid var(--border)', color: 'var(--text)' }
const inputCls = 'w-full px-4 py-3 rounded-xl text-base outline-none'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold block mb-1.5">{label}</span>
      {children}
      {hint && <span className="text-xs block mt-1" style={{ color: 'var(--muted)' }}>{hint}</span>}
    </label>
  )
}

interface Props {
  initial: PaymentAccount | null
  /** Dónde se guarda. Por defecto, los datos de cobro de Cevichao. */
  endpoint?: string
  /** Campos extra para el cuerpo de la petición (por ejemplo { action: 'savePayment', eventId }). */
  extra?: Record<string, unknown>
}

export default function AccountForm({ initial, endpoint = '/api/pagos/payment-info', extra }: Props) {
  const router = useRouter()
  const start = initial ?? emptyAccount()
  const knownBank = (EC_BANKS as readonly string[]).includes(start.bank)

  const [bankSelect, setBankSelect] = useState(knownBank ? start.bank : start.bank ? OTHER_BANK : '')
  const [bankOther, setBankOther] = useState(knownBank ? '' : start.bank)
  const [accountType, setAccountType] = useState(start.accountType)
  const [holder, setHolder] = useState(start.holder)
  const [accountNumber, setAccountNumber] = useState(start.accountNumber)
  const [idNumber, setIdNumber] = useState(start.idNumber)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    const bank = bankSelect === OTHER_BANK ? bankOther.trim() : bankSelect
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...extra, account: { bank, accountType, holder, accountNumber, idNumber } }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setMessage({ ok: false, text: data.error ?? 'No se pudo guardar' })
      return
    }
    setMessage({ ok: true, text: 'Guardado ✓' })
    router.refresh()
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Field label="Banco">
        <select value={bankSelect} onChange={e => setBankSelect(e.target.value)} required
          className={inputCls} style={inputStyle}>
          <option value="" disabled>Elige un banco…</option>
          {EC_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
          <option value={OTHER_BANK}>Otro…</option>
        </select>
      </Field>

      {bankSelect === OTHER_BANK && (
        <Field label="Nombre del banco">
          <input value={bankOther} onChange={e => setBankOther(e.target.value)} maxLength={60} required
            placeholder="Ej. Cooperativa …" className={inputCls} style={inputStyle} />
        </Field>
      )}

      <Field label="Tipo de cuenta">
        <div className="grid grid-cols-2 gap-2">
          {ACCOUNT_TYPES.map(t => (
            <button key={t} type="button" onClick={() => setAccountType(t)}
              className="py-3 rounded-xl font-bold text-sm border-2 transition-colors"
              style={accountType === t
                ? { borderColor: 'var(--primary)', background: 'color-mix(in srgb, var(--primary) 10%, transparent)', color: 'var(--primary)' }
                : { borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--muted)' }}>
              {t}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Nombre del titular">
        <input value={holder} onChange={e => setHolder(e.target.value)} maxLength={80} required
          autoComplete="off" placeholder="Nombre y apellido" className={inputCls} style={inputStyle} />
      </Field>

      <Field label="Número de cuenta" hint="Solo números.">
        <input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} required
          inputMode="numeric" autoComplete="off" maxLength={30} placeholder="2200000000"
          className={inputCls} style={inputStyle} />
      </Field>

      <Field label="Cédula o RUC (opcional)" hint="10 dígitos de cédula, o 13 si es RUC.">
        <input value={idNumber} onChange={e => setIdNumber(e.target.value)}
          inputMode="numeric" autoComplete="off" maxLength={20} placeholder="1700000000"
          className={inputCls} style={inputStyle} />
      </Field>

      {message && (
        <p className="text-sm font-semibold" style={{ color: message.ok ? 'var(--success)' : 'var(--danger)' }}>{message.text}</p>
      )}

      <button type="submit" disabled={saving}
        className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-50"
        style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
        {saving ? 'Guardando…' : 'Guardar cuenta'}
      </button>
    </form>
  )
}
