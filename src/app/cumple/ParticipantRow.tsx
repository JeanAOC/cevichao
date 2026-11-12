'use client'

import { useState } from 'react'
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
}

/** Fila del organizador: editar el pedido, marcar cumpleañero o quitar a la persona. */
export default function ParticipantRow({ row, eventId, ivaRate }: { row: RowData; eventId: string; ivaRate: number }) {
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
            {row.attending ? (row.description || 'Sin descripción') : 'Esta vez no'}
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
        <ActionButton endpoint={api} body={{ action: 'deleteOrder', orderId: row.id }} variant="danger" confirmText="Sí, quitar">
          Quitar
        </ActionButton>
      </div>

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
