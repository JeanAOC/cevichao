import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

import { todayDate } from '@/lib/date'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: lockSetting } = await supabase.from('settings').select('value').eq('key', 'orders_locked').maybeSingle()
  if (lockSetting?.value === 'true') return NextResponse.json({ error: 'Pedidos bloqueados' }, { status: 403 })

  const today = todayDate()
  const { error } = await supabase.from('orders').delete().eq('user_id', user.id).eq('order_date', today)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
