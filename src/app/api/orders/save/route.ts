import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { todayDate } from '@/lib/date'
import { sanitizeOrder } from '@/lib/orders'
import { loadMenu } from '@/lib/menu-server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: lockSetting } = await supabase.from('settings').select('value').eq('key', 'orders_locked').maybeSingle()
  if (lockSetting?.value === 'true') return NextResponse.json({ error: 'Pedidos bloqueados' }, { status: 403 })

  const menu = await loadMenu()
  const order = sanitizeOrder(await req.json().catch(() => null), menu)
  if (!order) return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 })

  // user_id y fecha vienen de la sesión/servidor, nunca del cliente
  const today = todayDate()
  const { data: existing } = await supabase
    .from('orders').select('id').eq('user_id', user.id).eq('order_date', today).maybeSingle()

  const { error } = existing
    ? await supabase.from('orders').update(order).eq('id', existing.id)
    : await supabase.from('orders').insert({ ...order, user_id: user.id, order_date: today })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Si esta persona es quien pagó en el local hoy, su pedido queda como pagado
  const { data: payer } = await supabase.from('settings').select('value').eq('key', 'payer').maybeSingle()
  if (payer?.value === `${today}|${user.id}` && order.protein !== 'no_por_hoy') {
    await createAdminClient().from('orders')
      .update({ paid: true, paid_at: new Date().toISOString() })
      .eq('user_id', user.id).eq('order_date', today)
  }

  return NextResponse.json({ ok: true })
}
