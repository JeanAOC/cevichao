import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sanitizeOrder } from '@/lib/orders'
import { loadMenu } from '@/lib/menu-server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => null)
  // El admin puede dejar items ocultos del menú (pedidos viejos)
  const order = sanitizeOrder(body?.payload, await loadMenu(), { allowInactive: true })
  if (typeof body?.orderId !== 'string' || !order) {
    return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('orders').update(order).eq('id', body.orderId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
