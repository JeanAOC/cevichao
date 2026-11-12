import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import OrderForm from '@/components/OrderForm'
import { loadMenu } from '@/lib/menu-server'
import type { Order } from '@/types'

export const revalidate = 0

export default async function AdminEditPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/')

  const admin = createAdminClient()
  const { data: order } = await admin.from('orders').select('*').eq('id', orderId).single() as { data: Order | null }
  if (!order) redirect('/admin')

  const { data: orderProfile } = await admin.from('profiles').select('display_name').eq('id', order.user_id).single() as { data: { display_name: string } | null }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-bold tracking-wide mb-1" style={{ color: 'var(--muted)' }}>EDITANDO PEDIDO DE</p>
        <h1 className="text-3xl font-extrabold">{orderProfile?.display_name ?? 'Usuario'}</h1>
      </div>
      <OrderForm existing={order} menu={await loadMenu()} adminEdit />
    </div>
  )
}
