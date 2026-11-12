import { createAdminClient } from '@/lib/supabase/admin'
import { getStaff } from '@/lib/auth'
import { parseAmount } from '@/lib/cumple'
import { NextResponse } from 'next/server'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const err = (message: string, status = 400) => NextResponse.json({ error: message }, { status })
const MISSING = 'Falta crear las tablas de cumpleaños: ejecuta el SQL «cumpleanos» en Supabase.'
const dbError = (e: { code?: string; message: string }) =>
  e.code === '42P01' || e.code === 'PGRST205' ? err(MISSING, 500) : err(e.message, 500)

/**
 * Lo que hace cada persona con SU propio pedido en un evento.
 *  - { action: 'save', eventId, attending, description, amount, extrasAmount }
 *  - { action: 'remove', eventId }
 */
export async function POST(req: Request) {
  const staff = await getStaff()
  if (!staff) return err('Unauthorized', 401)

  const body = await req.json().catch(() => null)
  if (!body || typeof body.eventId !== 'string' || !UUID.test(body.eventId)) return err('Evento inválido')

  const admin = createAdminClient()
  const { data: event, error } = await admin.from('events').select('id, status').eq('id', body.eventId).maybeSingle()
  if (error) return dbError(error)
  if (!event) return err('Evento no encontrado', 404)
  if (event.status !== 'open') return err('Este evento ya está cerrado', 403)

  const { data: mine, error: mineError } = await admin
    .from('event_orders').select('id, paid, is_birthday').eq('event_id', event.id).eq('user_id', staff.userId).maybeSingle()
  if (mineError) return dbError(mineError)

  if (body.action === 'remove') {
    if (!mine) return NextResponse.json({ ok: true })
    if (mine.paid) return err('Ya está marcado como pagado; pídele al organizador que lo cambie', 403)
    const { error: delError } = await admin.from('event_orders').delete().eq('id', mine.id)
    if (delError) return dbError(delError)
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'save') {
    const attending = body.attending !== false
    const amount = attending ? parseAmount(body.amount) : 0
    const extras = attending ? parseAmount(body.extrasAmount) : 0
    if (amount === null || extras === null) return err('Los montos deben ser números (por ejemplo 5.17)')
    const description = attending && typeof body.description === 'string' ? body.description.trim().slice(0, 200) : ''
    if (attending && !description) return err('Escribe qué vas a pedir')

    const fields = { attending, description, amount, extras_amount: extras }
    const { error: saveError } = mine
      ? await admin.from('event_orders').update(fields).eq('id', mine.id)
      : await admin.from('event_orders').insert({ ...fields, event_id: event.id, user_id: staff.userId, name: staff.displayName })
    if (saveError) return dbError(saveError)
    return NextResponse.json({ ok: true })
  }

  return err('Acción inválida')
}
