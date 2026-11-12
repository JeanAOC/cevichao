import { createAdminClient } from '@/lib/supabase/admin'
import { requireCollector } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const auth = await requireCollector()
  if ('error' in auth) return auth.error

  const { orderId, paid } = await req.json().catch(() => ({}))
  if (typeof orderId !== 'string') return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('orders').update({
    paid: !!paid,
    paid_at: paid ? new Date().toISOString() : null,
  }).eq('id', orderId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
