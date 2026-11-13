import { getStaff } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { todayDate } from '@/lib/date'
import { CHOCHO_KEYS, sanitizeChochoOrder } from '@/lib/chocho'
import { loadChochoMenu, loadChochoSettings } from '@/lib/chocho-server'
import { NextResponse } from 'next/server'

const err = (message: string, status = 400) => NextResponse.json({ error: message }, { status })
const MISSING = 'Falta crear las tablas de Cevichocho: ejecuta el SQL «cevichocho» en Supabase.'
const dbError = (e: { code?: string; message: string }) =>
  e.code === '42P01' || e.code === 'PGRST205' ? err(MISSING, 500) : err(e.message, 500)

/**
 * Mi pedido de hoy en Cevichocho.
 *  - { action: 'save', items: { clave: cantidad }, comentarios }
 *  - { action: 'cancel' }
 * user_id, fecha y total los decide el servidor, nunca el cliente.
 */
export async function POST(req: Request) {
  const staff = await getStaff()
  if (!staff) return err('Unauthorized', 401)

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return err('Datos inválidos')

  const settings = await loadChochoSettings()
  if (settings[CHOCHO_KEYS.locked] === 'true') return err('Los pedidos de Cevichocho están cerrados', 403)

  const admin = createAdminClient()
  const today = todayDate()
  const { data: existing, error: findError } = await admin
    .from('chocho_orders').select('id, paid').eq('user_id', staff.userId).eq('order_date', today).maybeSingle()
  if (findError) return dbError(findError)

  if (body.action === 'cancel') {
    if (!existing) return NextResponse.json({ ok: true })
    if (existing.paid) return err('Ya está marcado como pagado; pídele al cobrador que lo cambie', 403)
    const { error } = await admin.from('chocho_orders').delete().eq('id', existing.id)
    if (error) return dbError(error)
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'save') {
    const { menu, missing } = await loadChochoMenu()
    if (missing) return err(MISSING, 500)
    const order = sanitizeChochoOrder(body, menu)
    if (!order) return err('Pedido inválido: elige al menos un plato')

    // Si esta persona es quien pagó en el local hoy, su pedido queda como pagado
    const isPayer = settings[CHOCHO_KEYS.payer] === `${today}|${staff.userId}`
    const fields = { ...order, ...(isPayer ? { paid: true, paid_at: new Date().toISOString() } : {}) }

    const { error } = existing
      ? await admin.from('chocho_orders').update(fields).eq('id', existing.id)
      : await admin.from('chocho_orders').insert({ ...fields, user_id: staff.userId, order_date: today })
    if (error) return dbError(error)
    return NextResponse.json({ ok: true })
  }

  return err('Acción inválida')
}
