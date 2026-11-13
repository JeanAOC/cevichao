import { getStaff } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { todayDate } from '@/lib/date'
import { CHOCHO_KEYS } from '@/lib/chocho'
import { sanitizeAccount } from '@/lib/payment'
import { NextResponse } from 'next/server'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const QR_FORMAT = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/
const MAX_QR = 400_000

const err = (message: string, status = 400) => NextResponse.json({ error: message }, { status })
const MISSING = 'Falta crear las tablas de Cevichocho: ejecuta el SQL «cevichocho» en Supabase.'
const dbError = (e: { code?: string; message: string }) =>
  e.code === '42P01' || e.code === 'PGRST205' ? err(MISSING, 500) : err(e.message, 500)
const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v)

/** Precio válido (0 a 999.99) con hasta 2 decimales, o null. */
function parsePrice(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v)
  if (!Number.isFinite(n) || n < 0 || n > 999.99) return null
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/**
 * Acciones de Cevichocho para cobradores y admins:
 *  cobrador/admin: setPaid, markAllPaid, setLock, setPayer, savePayment, deleteOrder
 *  solo admin:     saveItem, addItem
 */
export async function POST(req: Request) {
  const staff = await getStaff()
  if (!staff) return err('Unauthorized', 401)
  if (!staff.canCollect) return err('Forbidden', 403)

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return err('Datos inválidos')

  const admin = createAdminClient()
  const ok = NextResponse.json({ ok: true })
  const today = todayDate()

  switch (body.action) {
    case 'setPaid': {
      if (!isUuid(body.orderId)) return err('Pedido inválido')
      const paid = body.paid === true
      const { error } = await admin.from('chocho_orders')
        .update({ paid, paid_at: paid ? new Date().toISOString() : null }).eq('id', body.orderId)
      if (error) return dbError(error)
      return ok
    }

    case 'markAllPaid': {
      const { error } = await admin.from('chocho_orders')
        .update({ paid: true, paid_at: new Date().toISOString() }).eq('order_date', today).eq('paid', false)
      if (error) return dbError(error)
      return ok
    }

    case 'deleteOrder': {
      if (!isUuid(body.orderId)) return err('Pedido inválido')
      const { error } = await admin.from('chocho_orders').delete().eq('id', body.orderId)
      if (error) return dbError(error)
      return ok
    }

    case 'setLock': {
      const { error } = await admin.from('settings').upsert({ key: CHOCHO_KEYS.locked, value: body.locked === true ? 'true' : 'false' })
      if (error) return err(error.message, 500)
      return ok
    }

    // Quién pagó en el local hoy: su pedido queda como pagado
    case 'setPayer': {
      if (body.userId !== null && !isUuid(body.userId)) return err('Persona inválida')
      const { error } = await admin.from('settings').upsert({ key: CHOCHO_KEYS.payer, value: body.userId ? `${today}|${body.userId}` : '' })
      if (error) return err(error.message, 500)
      if (body.userId) {
        const { error: payError } = await admin.from('chocho_orders')
          .update({ paid: true, paid_at: new Date().toISOString() }).eq('user_id', body.userId).eq('order_date', today)
        if (payError) return dbError(payError)
      }
      return ok
    }

    case 'savePayment': {
      const rows: { key: string; value: string }[] = []
      if ('account' in body) {
        const result = sanitizeAccount(body.account)
        if ('error' in result) return err(result.error)
        rows.push({ key: CHOCHO_KEYS.info, value: JSON.stringify(result.account) })
      }
      if ('qr' in body) {
        if (body.qr === null) rows.push({ key: CHOCHO_KEYS.qr, value: '' })
        else if (typeof body.qr === 'string' && body.qr.length <= MAX_QR && QR_FORMAT.test(body.qr)) rows.push({ key: CHOCHO_KEYS.qr, value: body.qr })
        else return err('El QR debe ser una imagen PNG, JPG o WEBP pequeña')
      }
      if (rows.length === 0) return err('No hay nada que guardar')
      const { error } = await admin.from('settings').upsert(rows)
      if (error) return err(error.message, 500)
      return ok
    }

    // ── Menú: solo admins ──
    case 'saveItem': {
      if (!staff.isAdmin) return err('Forbidden', 403)
      if (!isUuid(body.id)) return err('Plato inválido')
      const patch: Record<string, unknown> = {}
      if ('label' in body) {
        const label = typeof body.label === 'string' ? body.label.trim().replace(/\s+/g, ' ').slice(0, 80) : ''
        if (!label) return err('Escribe el nombre del plato')
        patch.label = label
      }
      if ('price' in body) {
        const price = parsePrice(body.price)
        if (price === null) return err('El precio debe ser un número (por ejemplo 3.50)')
        patch.price = price
      }
      if ('active' in body) patch.active = body.active === true
      if (Object.keys(patch).length === 0) return err('No hay nada que guardar')
      const { error } = await admin.from('chocho_menu').update(patch).eq('id', body.id)
      if (error) return dbError(error)
      return ok
    }

    case 'addItem': {
      if (!staff.isAdmin) return err('Forbidden', 403)
      const label = typeof body.label === 'string' ? body.label.trim().replace(/\s+/g, ' ').slice(0, 80) : ''
      const price = parsePrice(body.price)
      if (!label) return err('Escribe el nombre del plato')
      if (price === null) return err('El precio debe ser un número (por ejemplo 3.50)')
      const key = label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'plato'
      const { data: last } = await admin.from('chocho_menu').select('sort').order('sort', { ascending: false }).limit(1).maybeSingle()
      const { error } = await admin.from('chocho_menu')
        .insert({ key: `${key}_${Date.now().toString(36)}`, label, price, active: true, sort: (last?.sort ?? 0) + 1 })
      if (error) return dbError(error)
      return ok
    }

    default:
      return err('Acción inválida')
  }
}
