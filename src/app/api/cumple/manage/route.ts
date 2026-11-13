import { createAdminClient } from '@/lib/supabase/admin'
import { requireOrganizer } from '@/lib/auth'
import { parseAmount } from '@/lib/cumple'
import { sanitizeAccount } from '@/lib/payment'
import { ensureEveryoneInEvent } from '@/lib/cumple-server'
import { NextResponse } from 'next/server'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE = /^\d{4}-\d{2}-\d{2}$/
const QR_FORMAT = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/
const MAX_QR = 400_000

const err = (message: string, status = 400) => NextResponse.json({ error: message }, { status })
const MISSING = 'Falta crear las tablas de cumpleaños: ejecuta el SQL «cumpleanos» en Supabase.'
const dbError = (e: { code?: string; message: string }) =>
  e.code === '42P01' || e.code === 'PGRST205' ? err(MISSING, 500) : err(e.message, 500)

const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v)
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '')
const validDate = (v: unknown): v is string => typeof v === 'string' && DATE.test(v) && !Number.isNaN(Date.parse(v))

/**
 * Acciones del organizador sobre eventos de cumpleaños (solo organizadores y admins):
 *  createEvent, updateEvent, deleteEvent, saveOrder, deleteOrder, setBirthday,
 *  setPayer, setPaid, markAllPaid, savePayment, linkAccount
 */
export async function POST(req: Request) {
  const auth = await requireOrganizer()
  if ('error' in auth) return auth.error

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return err('Datos inválidos')

  const admin = createAdminClient()
  const ok = NextResponse.json({ ok: true })

  switch (body.action) {
    case 'createEvent': {
      const name = text(body.name, 60)
      const iva = body.ivaRate === undefined ? 15 : parseAmount(body.ivaRate)
      if (!name) return err('Escribe el nombre del evento (por ejemplo «Cumple Andy»)')
      if (!validDate(body.eventDate)) return err('Elige la fecha')
      if (iva === null || iva > 100) return err('El IVA debe ser un porcentaje entre 0 y 100')
      const { data, error } = await admin.from('events')
        .insert({ name, event_date: body.eventDate, iva_rate: iva, created_by: auth.staff.userId })
        .select('id').single()
      if (error) return dbError(error)
      // Todos los del equipo quedan en el evento desde el inicio: aunque no pidan nada, pagan la parte del cumpleañero.
      await ensureEveryoneInEvent(data.id)
      return NextResponse.json({ ok: true, id: data.id })
    }

    // Une un invitado (sin cuenta) con la cuenta real de esa persona, para que no quede duplicada
    case 'linkAccount': {
      if (!isUuid(body.orderId) || !isUuid(body.userId)) return err('Datos inválidos')
      const { data: guest } = await admin.from('event_orders').select('id, event_id, user_id').eq('id', body.orderId).maybeSingle()
      if (!guest) return err('Esa persona no está en el evento', 404)
      if (guest.user_id) return err('Esa persona ya tiene cuenta vinculada')
      const { data: profile } = await admin.from('profiles').select('display_name').eq('id', body.userId).maybeSingle()
      if (!profile) return err('Esa cuenta no existe')

      // Si la cuenta ya tiene una fila automática vacía, se descarta; si ya tiene su propio pedido, no se mezcla
      const { data: existing } = await admin.from('event_orders')
        .select('id, attending, description, amount, extras_amount, paid, is_birthday')
        .eq('event_id', guest.event_id).eq('user_id', body.userId).maybeSingle()
      if (existing) {
        const empty = !existing.attending && !existing.description && !Number(existing.amount) && !Number(existing.extras_amount) && !existing.paid && !existing.is_birthday
        if (!empty) return err(`${profile.display_name} ya puso su propio pedido: quita el invitado repetido en lugar de unirlos`)
        const { error: delError } = await admin.from('event_orders').delete().eq('id', existing.id)
        if (delError) return dbError(delError)
      }
      const { error } = await admin.from('event_orders').update({ user_id: body.userId, name: profile.display_name }).eq('id', guest.id)
      if (error) return dbError(error)
      return ok
    }

    case 'updateEvent': {
      if (!isUuid(body.eventId)) return err('Evento inválido')
      const patch: Record<string, unknown> = {}
      if ('name' in body) {
        const name = text(body.name, 60)
        if (!name) return err('Escribe el nombre del evento')
        patch.name = name
      }
      if ('eventDate' in body) {
        if (!validDate(body.eventDate)) return err('Fecha inválida')
        patch.event_date = body.eventDate
      }
      if ('ivaRate' in body) {
        const iva = parseAmount(body.ivaRate)
        if (iva === null || iva > 100) return err('El IVA debe ser un porcentaje entre 0 y 100')
        patch.iva_rate = iva
      }
      if ('status' in body) {
        if (body.status !== 'open' && body.status !== 'closed') return err('Estado inválido')
        patch.status = body.status
      }
      if (Object.keys(patch).length === 0) return err('No hay nada que guardar')
      const { error } = await admin.from('events').update(patch).eq('id', body.eventId)
      if (error) return dbError(error)
      return ok
    }

    case 'deleteEvent': {
      if (!isUuid(body.eventId)) return err('Evento inválido')
      const { error } = await admin.from('events').delete().eq('id', body.eventId)
      if (error) return dbError(error)
      return ok
    }

    // Crea el pedido de alguien (invitado sin cuenta o persona de la app) o edita uno existente
    case 'saveOrder': {
      if (!isUuid(body.eventId)) return err('Evento inválido')
      const attending = body.attending !== false
      const amount = attending ? parseAmount(body.amount) : 0
      const extras = attending ? parseAmount(body.extrasAmount) : 0
      if (amount === null || extras === null) return err('Los montos deben ser números (por ejemplo 5.17)')
      const description = attending ? text(body.description, 200) : ''
      const fields = { attending, description, amount, extras_amount: extras }

      if (isUuid(body.orderId)) {
        const { error } = await admin.from('event_orders').update(fields).eq('id', body.orderId).eq('event_id', body.eventId)
        if (error) return dbError(error)
        return ok
      }

      // Nuevo: o es una persona de la app (userId) o un invitado sin cuenta (name)
      let name = text(body.name, 60)
      let userId: string | null = null
      if (isUuid(body.userId)) {
        const { data: profile } = await admin.from('profiles').select('display_name').eq('id', body.userId).maybeSingle()
        if (!profile) return err('Esa persona no existe')
        userId = body.userId
        name = profile.display_name
      }
      if (!name) return err('Escribe el nombre de la persona')
      const { error } = await admin.from('event_orders').insert({ ...fields, event_id: body.eventId, user_id: userId, name })
      if (error) {
        return error.code === '23505' ? err('Esa persona ya está en el evento') : dbError(error)
      }
      return ok
    }

    case 'deleteOrder': {
      if (!isUuid(body.orderId)) return err('Pedido inválido')
      const { error } = await admin.from('event_orders').delete().eq('id', body.orderId)
      if (error) return dbError(error)
      return ok
    }

    case 'setBirthday': {
      if (!isUuid(body.orderId)) return err('Pedido inválido')
      const { error } = await admin.from('event_orders').update({ is_birthday: body.isBirthday === true }).eq('id', body.orderId)
      if (error) return dbError(error)
      return ok
    }

    // Quién pagó la cuenta en el local. Su pedido cuenta como pagado.
    case 'setPayer': {
      if (!isUuid(body.eventId)) return err('Evento inválido')
      if (body.orderId !== null && !isUuid(body.orderId)) return err('Pedido inválido')
      const { error } = await admin.from('events').update({ payer_order_id: body.orderId }).eq('id', body.eventId)
      if (error) return dbError(error)
      return ok
    }

    case 'setPaid': {
      if (!isUuid(body.orderId)) return err('Pedido inválido')
      const paid = body.paid === true
      const { error } = await admin.from('event_orders')
        .update({ paid, paid_at: paid ? new Date().toISOString() : null }).eq('id', body.orderId)
      if (error) return dbError(error)
      return ok
    }

    case 'markAllPaid': {
      if (!isUuid(body.eventId)) return err('Evento inválido')
      const { error } = await admin.from('event_orders')
        .update({ paid: true, paid_at: new Date().toISOString() })
        .eq('event_id', body.eventId).eq('is_birthday', false).eq('paid', false)
      if (error) return dbError(error)
      return ok
    }

    // Datos de cobro del pagador: cuenta y/o QR (mismas reglas que en Pagos de Cevichao)
    case 'savePayment': {
      if (!isUuid(body.eventId)) return err('Evento inválido')
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
      const { error } = await admin.from('events').update(patch).eq('id', body.eventId)
      if (error) return dbError(error)
      return ok
    }

    default:
      return err('Acción inválida')
  }
}
