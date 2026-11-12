import { createAdminClient } from '@/lib/supabase/admin'
import { requireCollector } from '@/lib/auth'
import { todayDate } from '@/lib/date'
import { NextResponse } from 'next/server'

/** Marca como pagados todos los pedidos de hoy que sigan pendientes. */
export async function POST() {
  const auth = await requireCollector()
  if ('error' in auth) return auth.error

  const admin = createAdminClient()
  const { error } = await admin.from('orders')
    .update({ paid: true, paid_at: new Date().toISOString() })
    .eq('order_date', todayDate())
    .neq('protein', 'no_por_hoy')
    .eq('paid', false)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
