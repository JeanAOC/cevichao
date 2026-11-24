import { createAdminClient } from '@/lib/supabase/admin'
import type { Soda } from '@/lib/cumple'

/** Las gaseosas compartidas de un evento viven en `settings` (clave `cumple_soda:<eventId>`): no hace falta migración. */
export const sodaKey = (eventId: string) => `cumple_soda:${eventId}`

export async function loadSodas(eventId: string): Promise<Soda[]> {
  const { data } = await createAdminClient().from('settings').select('value').eq('key', sodaKey(eventId)).maybeSingle()
  try {
    const list = JSON.parse(String(data?.value ?? '[]'))
    if (!Array.isArray(list)) return []
    return list
      .filter(s => s && typeof s.id === 'string' && typeof s.label === 'string' && Number.isFinite(Number(s.price)))
      .map(s => ({ id: s.id, label: s.label, price: Number(s.price), drinkers: Array.isArray(s.drinkers) ? s.drinkers.filter((d: unknown) => typeof d === 'string') : [] }))
  } catch {
    return []
  }
}

/** Devuelve un mensaje de error, o null si salió bien. */
export async function saveSodas(eventId: string, sodas: Soda[]): Promise<string | null> {
  const { error } = await createAdminClient().from('settings').upsert({ key: sodaKey(eventId), value: JSON.stringify(sodas) })
  return error ? error.message : null
}

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
