import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Deja en el evento a TODAS las cuentas de la app como «sin pedido» (pagan solo la parte del cumpleañero).
 * Se llama al crear el evento y cada vez que se abre un evento abierto, así quien se registra después también entra solo.
 * Devuelve cuántas agregó, o null si falló.
 */
export async function ensureEveryoneInEvent(eventId: string): Promise<number | null> {
  const admin = createAdminClient()
  const [{ data: profiles }, { data: inEvent }] = await Promise.all([
    admin.from('profiles').select('id, display_name'),
    admin.from('event_orders').select('user_id').eq('event_id', eventId).not('user_id', 'is', null),
  ])
  const have = new Set((inEvent ?? []).map(r => r.user_id))
  const rows = (profiles ?? []).filter(p => !have.has(p.id))
    .map(p => ({ event_id: eventId, user_id: p.id, name: p.display_name, attending: false, description: '', amount: 0, extras_amount: 0 }))
  if (rows.length === 0) return 0
  // Si dos personas abren el evento a la vez, el índice único evita duplicados: ese error se ignora
  const { error } = await admin.from('event_orders').insert(rows)
  return error && error.code !== '23505' ? null : rows.length
}
