import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import OrderForm from '@/components/OrderForm'
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
    <div className="max-w-4xl mx-auto px-6 py-6">
      <div className="mb-6">
        <p className="text-xs font-bold mb-1" style={{ color: 'var(--muted)' }}>EDITANDO PEDIDO DE</p>
        <h1 className="text-2xl font-black">{orderProfile?.display_name ?? 'Usuario'}</h1>
      </div>
      <OrderForm existing={order} userId={order.user_id} orderDate={order.order_date} adminEdit />
    </div>
  )
}
