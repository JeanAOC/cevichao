import { createAdminClient } from '@/lib/supabase/admin'
import { requireCollector } from '@/lib/auth'
import { todayDate } from '@/lib/date'
import { NextResponse } from 'next/server'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Define quién pagó la cuenta en el local (o lo quita con userId = null).
 * Su pedido se marca como pagado: no se cobra a sí mismo.
 * Si había otro pagador antes, su pedido vuelve a pendiente.
 */
export async function POST(req: Request) {
  const auth = await requireCollector()
  if ('error' in auth) return auth.error

  const { userId } = await req.json().catch(() => ({}))
  if (userId !== null && !(typeof userId === 'string' && UUID.test(userId))) {
    return NextResponse.json({ error: 'Usuario inválido' }, { status: 400 })
  }

  const admin = createAdminClient()
  const today = todayDate()

  const { data: current } = await admin.from('settings').select('value').eq('key', 'payer').maybeSingle()
  const [prevDate, prevId] = String(current?.value ?? '').split('|')
  if (prevDate === today && prevId && prevId !== userId) {
    await admin.from('orders').update({ paid: false, paid_at: null })
      .eq('user_id', prevId).eq('order_date', today)
  }

  const { error } = await admin.from('settings').upsert({ key: 'payer', value: userId ? `${today}|${userId}` : '' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (userId) {
    await admin.from('orders').update({ paid: true, paid_at: new Date().toISOString() })
      .eq('user_id', userId).eq('order_date', today)
  }

  return NextResponse.json({ ok: true })
}
