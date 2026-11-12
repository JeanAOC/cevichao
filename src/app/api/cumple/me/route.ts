import { createAdminClient } from '@/lib/supabase/admin'
import { getStaff } from '@/lib/auth'
import { parseAmount } from '@/lib/cumple'
import { sanitizeAccount } from '@/lib/payment'
import { NextResponse } from 'next/server'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const QR_FORMAT = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/
const MAX_QR = 400_000
const err = (message: string, status = 400) => NextResponse.json({ error: message }, { status })
const MISSING = 'Falta crear las tablas de cumpleaños: ejecuta el SQL «cumpleanos» en Supabase.'
const dbError = (e: { code?: string; message: string }) =>
  e.code === '42P01' || e.code === 'PGRST205' ? err(MISSING, 500) : err(e.message, 500)

/**
 * Lo que hace cada persona con SU propio pedido en un evento.
 *  - { action: 'save', eventId, attending, description, amount, extrasAmount }
 *  - { action: 'remove', eventId }
 *  - { action: 'savePayment', eventId, account?, qr? } (solo si esta persona es quien pagó la cuenta)
 */
export async function POST(req: Request) {
  const staff = await getStaff()
  if (!staff) return err('Unauthorized', 401)

  const body = await req.json().catch(() => null)
  if (!body || typeof body.eventId !== 'string' || !UUID.test(body.eventId)) return err('Evento inválido')

  const admin = createAdminClient()
  const { data: event, error } = await admin.from('events').select('id, status, payer_order_id').eq('id', body.eventId).maybeSingle()
  if (error) return dbError(error)
  if (!event) return err('Evento no encontrado', 404)
  // Poner la cuenta de cobro sigue permitido con el evento cerrado (todavía hay que cobrar)
  if (event.status !== 'open' && body.action !== 'savePayment') return err('Este evento ya está cerrado', 403)

  const { data: mine, error: mineError } = await admin
    .from('event_orders').select('id, paid, is_birthday').eq('event_id', event.id).eq('user_id', staff.userId).maybeSingle()
  if (mineError) return dbError(mineError)

  // Datos de cobro: solo quien fue elegido como pagador de la cuenta (el organizador usa /api/cumple/manage)
  if (body.action === 'savePayment') {
    if (!mine || event.payer_order_id !== mine.id) return err('Solo quien pagó la cuenta puede poner los datos de cobro', 403)
    const patch: Record<string, string> = {}
    if ('account' in body) {
      const result = sanitizeAccount(body.account)
      if ('error' in result) return err(result.error)
      patch.payment_info = JSON.stringify(result.account)
    }
    if ('qr' in body) {
      if (body.qr === null) patch.payment_qr = ''
      else if (typeof body.qr === 'string' && body.qr.length <= MAX_QR && QR_FORMAT.test(body.qr)) patch.payment_qr = body.qr
      else return err('El QR debe ser una imagen PNG, JPG o WEBP pequeña')
    }
    if (Object.keys(patch).length === 0) return err('No hay nada que guardar')
    const { error: payError } = await admin.from('events').update(patch).eq('id', event.id)
    if (payError) return dbError(payError)
    return NextResponse.json({ ok: true })
  }

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
