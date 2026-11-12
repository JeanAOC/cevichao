import { createAdminClient } from '@/lib/supabase/admin'
import { requireCollector } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const auth = await requireCollector()
  if ('error' in auth) return auth.error

  const { locked } = await req.json().catch(() => ({}))
  const admin = createAdminClient()
  const { error } = await admin.from('settings').upsert({ key: 'orders_locked', value: locked ? 'true' : 'false' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
