import { parseAccount } from '@/lib/payment'
import CopyButton from '@/components/CopyButton'

/** Muestra la cuenta de cobro de forma ordenada, con botón para copiar el número. */
export default function PaymentAccountView({ raw }: { raw?: string | null }) {
  const a = parseAccount(raw)
  if (!a) return null

  if (a.legacy) {
    return (
      <p className="whitespace-pre-line text-sm rounded-xl px-4 py-3 border" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
        {a.legacy}
      </p>
    )
  }

  const idLabel = a.idNumber.length === 13 ? 'RUC' : 'Cédula'
  return (
    <div className="rounded-xl border divide-y text-sm" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
      <Row label="Banco" value={`${a.bank} · ${a.accountType}`} />
      <Row label="Titular" value={a.holder} />
      <Row label="N° de cuenta" value={a.accountNumber} mono copy />
      {a.idNumber && <Row label={idLabel} value={a.idNumber} mono copy />}
    </div>
  )
}

function Row({ label, value, mono, copy }: { label: string; value: string; mono?: boolean; copy?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5" style={{ borderColor: 'var(--border)' }}>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>{label}</p>
        <p className={`font-semibold break-words ${mono ? 'tabular-nums tracking-wide' : ''}`}>{value}</p>
      </div>
      {copy && <CopyButton text={value} />}
    </div>
  )
}
