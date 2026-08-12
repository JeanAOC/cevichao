import { createClient } from '@/lib/supabase/server'
import OrderForm from '@/components/OrderForm'
import type { Order } from '@/types'

export const revalidate = 0

function todayDate() {
  const now = new Date()
  const ec = new Date(now.getTime() - 5 * 60 * 60 * 1000)
  return ec.toISOString().split('T')[0]
}

export default async function PedirPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const today = todayDate()

  const [{ data: existing }, { data: lockSetting }] = await Promise.all([
    supabase.from('orders').select('*').eq('user_id', user!.id).eq('order_date', today).maybeSingle() as Promise<{ data: Order | null }>,
    supabase.from('settings').select('value').eq('key', 'orders_locked').maybeSingle(),
  ])

  const isLocked = lockSetting?.value === 'true'

  if (isLocked) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-xl font-black mb-2">Pedidos cerrados</h1>
        <p style={{ color: 'var(--muted)' }}>Ya llegaron al local. No se aceptan más cambios.</p>
      </div>
    )
  }

  if (existing) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-xl font-black mb-2">Pedido confirmado</h1>
        <p style={{ color: 'var(--muted)' }}>Ya hiciste tu pedido de hoy, no se puede cambiar.</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-black mb-1">Hacer pedido</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>Elige tu ceviche de hoy.</p>
      <OrderForm existing={null} userId={user!.id} orderDate={today} />
    </div>
  )
}
