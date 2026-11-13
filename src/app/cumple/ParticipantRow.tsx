'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ActionButton from '@/components/ActionButton'
import OrderEditor from './OrderEditor'
import { money } from '@/lib/menu'

export interface RowData {
  id: string
  name: string
  attending: boolean
  description: string
  amount: number
  extras_amount: number
  is_birthday: boolean
  subtotal: number
  isPayer: boolean
  /** false = invitado sin cuenta */
  hasAccount: boolean
}

/** Une un invitado sin cuenta con la cuenta real de esa persona (por si se registró con otro nombre). */
function LinkAccount({ orderId, accounts }: { orderId: string; accounts: { id: string; name: string }[] }) {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function link() {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/cumple/manage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'linkAccount', orderId, userId }),
    })
    setLoading(false)
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error ?? 'No se pudo vincular'); return }
    router.refresh()
  }

  if (accounts.length === 0) return null
  return (
    <div className="rounded-xl border p-3 space-y-2" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
      <p className="text-sm font-semibold">Sin cuenta · ¿ya se registró?</p>
      <div className="flex flex-wrap gap-2">
        <select value={userId} onChange={e => setUserId(e.target.value)} aria-label="Cuenta de esta persona"
          className="flex-1 min-w-40 px-3 min-h-11 rounded-xl text-sm">
          <option value="">Elige su cuenta…</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <button onClick={link} disabled={!userId || loading}
          className="px-4 min-h-11 rounded-lg text-sm font-bold disabled:opacity-40"
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
          {loading ? '…' : 'Vincular'}
        </button>
      </div>
      {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  )
}

/** Fila del organizador: editar el pedido, marcar cumpleañero, vincular una cuenta o quitar a la persona. */
export default function ParticipantRow({ row, eventId, ivaRate, accounts = [] }: {
  row: RowData; eventId: string; ivaRate: number
  /** Cuentas de la app (para vincular a un invitado sin cuenta). */
  accounts?: { id: string; name: string }[]
}) {
  const [editing, setEditing] = useState(false)
  const api = '/api/cumple/manage'

  return (
    <li className="py-3 border-t first:border-t-0 space-y-2" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold leading-tight flex flex-wrap items-center gap-1.5">
            {row.name}
            {row.is_birthday && <span className="chip chip-warn chip-sm">🎂 Cumpleañero</span>}
            {row.isPayer && <span className="chip chip-info chip-sm">💳 Pagó la cuenta</span>}
          </p>
          <p className="text-sm truncate" style={{ color: 'var(--muted)' }}>
            {row.attending ? (row.description || 'Sin descripción') : 'Sin pedido'}
          </p>
        </div>
        <span className="font-extrabold font-display shrink-0" style={{ color: 'var(--accent)' }}>{money(row.subtotal)}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setEditing(v => !v)}
          className="text-sm px-4 min-h-11 rounded-lg font-bold border"
          style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>
          {editing ? 'Cerrar' : 'Editar'}
        </button>
        <ActionButton endpoint={api} body={{ action: 'setBirthday', orderId: row.id, isBirthday: !row.is_birthday }}
          variant={row.is_birthday ? 'primary' : 'ghost'}>
          {row.is_birthday ? '🎂 Quitar cumpleañero' : '🎂 Es el cumpleañero'}
        </ActionButton>
        {/* Las cuentas no se quitan: todos pagan por defecto (volverían a entrar solas). Solo se quitan invitados sin cuenta. */}
        {!row.hasAccount && (
          <ActionButton endpoint={api} body={{ action: 'deleteOrder', orderId: row.id }} variant="danger" confirmText="Sí, quitar">
            Quitar
          </ActionButton>
        )}
      </div>

      {!row.hasAccount && <LinkAccount orderId={row.id} accounts={accounts} />}

      {editing && (
        <div className="rounded-xl border p-4 mt-2" style={{ background: 'color-mix(in srgb, var(--primary) 5%, var(--card))', borderColor: 'var(--border)' }}>
          <OrderEditor mode="manage" eventId={eventId} ivaRate={ivaRate} orderId={row.id}
            initial={{ attending: row.attending, description: row.description, amount: row.amount, extras_amount: row.extras_amount }}
            submitLabel="Guardar cambios" onDone={() => setEditing(false)} />
        </div>
      )}
    </li>
  )
}
