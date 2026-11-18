import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

import { todayDate } from '@/lib/date'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: lockSetting } = await supabase.from('settings').select('value').eq('key', 'orders_locked').maybeSingle()
  if (lockSetting?.value === 'true') return NextResponse.json({ error: 'Pedidos bloqueados' }, { status: 403 })

  // `orders` no tiene política de borrado para el usuario (con su sesión el delete no borra nada y tampoco da error):
  // se borra con service role, y solo su propio pedido de hoy, después de validar la sesión.
  const today = todayDate()
  const { data, error } = await createAdminClient().from('orders').delete()
    .eq('user_id', user.id).eq('order_date', today).select('id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data || data.length === 0) return NextResponse.json({ error: 'No tienes un pedido de hoy para cancelar' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
